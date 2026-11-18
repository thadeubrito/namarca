# Autenticação administrativa

Implementação para Better Auth **1.7.25**, PostgreSQL + Drizzle, Next.js (runtime Node). Sem signup público, OAuth, recuperação por email ou senha padrão. A identidade administrativa é o único email normalizado em `ADMIN_EMAIL`, provisionado manualmente; não há role editável pelo cliente.

## Contrato com banco e aplicação

- `src/db/index.ts` deve exportar `db` (Drizzle PostgreSQL, com transações).
- `src/db/schema.ts` deve reexportar `user`, `session`, `account`, `verification`, `twoFactor` de `./auth-schema` para geração das migrations. `authSchema` também está disponível, mas não precisa ser incluído no agregado das migrations.
- Aplicar migrations antes dos comandos/admin ou de iniciar o servidor. Não usar o CLI de migração do Better Auth em paralelo ao Drizzle.
- Variáveis usadas: `DATABASE_URL`, `ADMIN_EMAIL`, `BETTER_AUTH_SECRET` (aleatório, mínimo 32 caracteres), `BETTER_AUTH_URL` e `NODE_ENV`. Produção exige HTTPS. Nenhuma variável `NEXT_PUBLIC_*` é necessária.
- A configuração falha se secret/URL/email estiverem ausentes. Fornecer também no ambiente de build do Next se as rotas forem importadas durante build.

## Guards: obrigatório nas operações, não só no layout

```ts
import { getAdminSession, requireAdmin, getEnrollmentSession } from "@/lib/admin";

const admin = await getAdminSession(); // null sem sessão, email não permitido ou TOTP incompleto
await requireAdmin();                // lança AdminAuthorizationError (status 403)
const enrollment = await getEnrollmentSession(); // senha + email permitido; NÃO autoriza domínio
```

Todos aceitam `Headers` opcional para route handlers; sem argumento usam `await headers()`. Guards não redirecionam. A UI decide o redirect. `requireEnrollmentSession()` é a versão que lança para telas de setup. Capturar `AdminAuthorizationError` nos handlers e responder 403. Não transformar falhas de autorização em 500 nem usar guards apenas em páginas/layouts: toda server action e rota de dados administrativa deve chamar `requireAdmin()`.

## Contrato da UI

Cliente exportado em `@/lib/auth-client`: `authClient`.

1. `await authClient.signIn.email({ email, password })`. Inspecionar `error`; se `data?.twoFactorRedirect`, mostrar desafio TOTP. A sessão ainda não existe nesse caso.
2. Primeiro login (sem TOTP): sessão de senha serve apenas para setup. `getAdminSession()` continua null.
3. Setup: `await authClient.twoFactor.enable({ password })`. A resposta contém `totpURI` e `backupCodes`. Gerar QR localmente com `qrcode`, nunca enviar URI/secret a serviço externo. Não registrar a resposta, armazenar em analytics, URLs, localStorage ou logs. Não expor cadastro público. O secret ainda não está confirmado.
4. Confirmar setup OU responder desafio de login: `await authClient.twoFactor.verifyTotp({ code, trustDevice: false })`. Inspecionar `error`. Após sucesso, navegar com hard navigation (`window.location.assign`) ou refresh server-side: sessão/cookie podem ter sido rotacionados.
5. Logout: `authClient.signOut()`; limpar estado temporário da UI.

Mostrar os `backupCodes` uma única vez durante setup e orientar armazenamento offline seguro. Recuperação: `await authClient.twoFactor.verifyBackupCode({ code, disableSession: false })`, após login por senha retornar desafio. Cada código é de uso único; sucesso satisfaz o segundo fator e autoriza a sessão. O usuário deve ter concluído enrollment TOTP anteriormente. `disableSession: true`, dispositivos lembrados e desabilitar TOTP são bloqueados no servidor, não apenas escondidos na interface. Sem códigos disponíveis, usar o reset manual pelo operador. Não configurar SMTP/OTP como alternativa. Não chamar APIs internas do Better Auth para criar sessões em código de domínio.

## Por que existe `twoFactorVerified`

O código publicado do plugin 1.7.25 (`dist/plugins/two-factor/index.mjs`, `totp/index.mjs`, `verify-two-factor.mjs`) foi inspecionado. O plugin adiciona `user.twoFactorEnabled`, **não** um campo nativo de sessão chamado `twoFactorVerified`. Em login com TOTP habilitado ele apaga a sessão de senha e cria uma sessão só após o desafio; no enrollment ele rotaciona a sessão ao confirmar o código.

A aplicação adiciona seu próprio boolean `session.twoFactorVerified`, `input: false`, default false. Um hook `after` marca **somente** a sessão retornada por `/two-factor/verify-totp` ou `/two-factor/verify-backup-code` bem-sucedido, com usuário allowlisted, `twoFactorEnabled` e registro TOTP `verified`. O endpoint de backup code em 1.7.25 chama o mesmo `valid(ctx)` que TOTP e retorna `{ token, user }` quando `disableSession` é falso/omitido. O plugin consome o código antes disso, com compare-and-swap atômico sobre os códigos cifrados: concorrência não permite consumir o mesmo código duas vezes. Código já usado ou inválido não gera prova de sessão; enrollment incompleto também não autoriza via backup code. Falha do hook é fail-closed. Cookie cache está desativado e os guards leem a sessão autoritativa. Sessões pré-enrollment ou meramente autenticadas por senha nunca autorizam operações. Não assumir que `twoFactorEnabled` sozinho prova TOTP na sessão atual.

## Provisionamento e recuperação

Executar em terminal confiável, interativo; com Docker usar `-it`, ambiente já carregado e rede do PostgreSQL configurada:

```sh
npm run admin:create
npm run admin:reset
```

Nenhum comando aceita argumentos. Senhas são lidas via stdin com terminal em modo raw, sem echo, confirmação obrigatória, tamanho 8–128. Não usar senha em argumentos, pipes, `docker exec -e PASSWORD`, env, arquivos ou histórico. Criação usa `hashPassword` de `better-auth/crypto` e inserts `user`/`account` numa única transação (`providerId: credential`, `accountId: user.id`). Conta existente provoca rollback; nunca atualiza silenciosamente.

Reset solicita confirmação `RESET`, nova senha, bloqueia a linha do usuário e, numa transação, revoga sessões, remove fatores/desafios/trust records, substitui o hash e exige enrollment novo. Executar recuperação com a aplicação parada para evitar corridas com login/validação em andamento. Alterar `ADMIN_EMAIL` revoga autorização pelo allowlist, mas não renomeia conta: fazer provisionamento/migração deliberada. Reset não cria usuário inexistente.

## Segurança operacional e testes

- HTTPS/reverse proxy confiável, segredo forte, backup cifrado do PostgreSQL e controle de acesso aos comandos são requisitos. TOTP secrets/backup codes são criptografados pelo Better Auth com `BETTER_AUTH_SECRET`; não trocar esse segredo sem plano de recuperação.
- Rate limiting do Better Auth está ativo, com limites próprios no plugin. Armazenamento de rate limit padrão é por processo: em produção com múltiplas réplicas adicionar proteção no proxy, sem confiar apenas nesse limite. Códigos TOTP seguem a janela/replay behavior da biblioteca, não implementamos antirreplay adicional.
- `server-only` impede importar auth/guards em clientes. Scripts importam apenas db/schema/crypto, não o módulo server-only.
- Foi adicionado `scripts/test-auth.ts`, integração com o handler real do Better Auth, Drizzle e PostgreSQL, sem servidor HTTP externo. Exige banco descartável com nome terminado em `_auth_test`, schema já migrado, nenhuma conta existente para `ADMIN_EMAIL`, e as variáveis usuais. Executar `npx tsx scripts/test-auth.ts` com Node 24 e dependências de desenvolvimento. O script usa um resolve hook local ao processo para o marcador `server-only` fora do Next, sem alterar os módulos de produção. O teste gera senha/códigos efêmeros sem logs, cria e apaga seu usuário, cobre signup, senha inválida, restrição pré-enrollment, confirmação TOTP, recuperação válida/uso único, flags proibidas e revogação. Executado com sucesso no Docker, em `namarca_auth_test` criada com cópia apenas do schema; `tsc --noEmit` também passou. O script respeita a janela do rate limiter, confirma respostas 401 (não apenas qualquer erro) para códigos inválidos/reutilizados e testa tentativa de injetar `twoFactorVerified` no login. Não cobre navegador/UI, CSRF, reset CLI interativo, concorrência nem rate limit distribuído. Não usa credenciais reais nem serviços externos. Antes de produção verificar numa base descartável: migrations; create duplicado sem alterações; signup recusado; senha errada; senha correta sem TOTP => guard null; setup/código inválido; confirmação => guard autorizado; logout/login => desafio sem sessão; código válido => autorização; trustDevice/disable/disableSession bloqueados; recovery code válido autoriza uma única vez e código reutilizado falha; reset => cookies anteriores inválidos e enrollment novamente obrigatório; allowlist alterado => 403; CSRF/origin estrangeiro recusado; limites de tentativas.
