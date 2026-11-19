# Namarca — administrativo

Base do novo administrativo e checkout, separada do editor público existente. Next.js 16, React 19, TypeScript, PostgreSQL/Drizzle, Better Auth e S3 compatível com R2. Pagamentos PixGo simulados por padrão. Sem Inngest.

## Começar localmente

Requisitos: Docker com Compose. Nenhuma dependência Node precisa ser instalada no computador.

```sh
cd /Users/thadeubrito/workspace/namarca
# Cria secrets locais aleatórios; não sobrescreve arquivo existente.
docker run --rm -v "$PWD:/app" -w /app node:24.11.1-bookworm-slim node scripts/dev-env.mjs
# Banco, arquivos e gateway simulados.
docker compose up -d postgres s3 pixgo-mock
docker compose run --rm app npm run db:migrate
# Aplicação.
docker compose up --build -d
# Provisiona SUA conta, solicitando senha sem exibir no terminal.
docker compose exec app npm run admin:create
```

Acesse **http://localhost:3000**. O identificador local inicial é `admin@namarca.test`, configurável em `.env.local` antes do provisionamento. Não existe senha padrão. No primeiro login, configure TOTP e guarde os códigos de recuperação; só depois o administrativo é liberado.

## Serviços locais

| Serviço | Acesso |
|---|---|
| App | http://localhost:3000 |
| PostgreSQL | localhost:5432; credenciais em `.env.local` |
| S3 privado / SeaweedFS | http://localhost:9000; sem console web |
| Simulador PixGo | http://localhost:4010; API protegida, sem dinheiro real |

Downloads de imagens/pacotes exigem rede no bootstrap. A operação de desenvolvimento não exige Vercel, Neon, R2, Google ou conta PixGo. Dados persistem em volumes. `docker compose down` para os serviços sem apagar dados. Não use `down -v` se quiser preservá-los.

## Comandos

```sh
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm test
docker compose exec app npm run db:generate
docker compose exec app npm run db:migrate
docker compose exec app npm run admin:reset
docker compose logs -f app
```

Migrations em `drizzle/` são versionadas. `db:push` existe somente para exploração local, não substitui migrations. Build deve ser verificado com configuração HTTPS e secrets próprios de teste; nunca usar credenciais reais apenas para compilar.

## Escopo desta base

- Login administrativo com senha, TOTP, códigos de recuperação e cadastro público bloqueado.
- Cadastro, listagem, detalhes e edição de campanhas em rascunho, com encerramento; consulta de cobranças já registradas.
- Estúdio: seleção local de artes/figurinhas PNG com recuperação de rascunho após refresh, upload privado ao salvar (até três envios simultâneos), nomes/ordenação, retângulo visual da foto, cores, limpeza manual de materiais não usados e prévia estática isolada com composição/exportação no navegador. Editor e estilos únicos em `packages/editor`, consumidos pelas entradas privada e pública local de `apps/event`; público antigo não migrado. [Arquitetura do editor](docs/editor-runtime.md).
- Cliente leve reutilizável entre campanhas, seleção/cadastro inline com nome e contato opcional; seção Clientes com busca, cadastro, edição e campanhas vinculadas. Observações na campanha, sem contratos. Valor definido na aba Cobrança ao emitir o link.
- Cobrança exclusivamente mock: link opaco com nome/valor congelados, checkout sem conta, QR simulado, recuperação de tentativa incerta e consulta manual no painel. [Limites do checkout](docs/checkout.md).
- Resumo financeiro por campanha com totais por situação e CSV administrativo protegido, sem dados de pagador ou tokens. [Relatório financeiro](docs/financial-report.md).
- Banco transacional, S3 privado, adapter PixGo e recebimento de webhooks.
- Confirmação financeira e registro idempotente do evento na própria requisição do webhook, sem worker ou cron.
- Infra reproduzível e testes.

**Ainda não é o SaaS comercial completo.** O estúdio e a prévia foram integrados, há checkout local, mas não há checkout real homologado nem publicação pública. Uma confirmação de pagamento não publica a campanha. Registro de data não implementa sozinho o encerramento do editor antigo.

## Lista vigente e limites

Veja [docs/TODO.md](docs/TODO.md) para concluídos, pendências locais e decisões externas. Deploy/implantação em produção está fora do escopo ativo por pedido do fundador; o histórico abaixo não é uma lista de tarefas autorizadas.

## Produção (referência futura, fora do escopo)

Direção aprovada: Next.js na Vercel, PostgreSQL gerenciado, R2 e PixGo real. A autenticação é biblioteca Better Auth, não SaaS. O webhook atualiza o pagamento diretamente, sem agendamento. Notificações perdidas não possuem recuperação automática nesta base. Nenhum recurso remoto foi provisionado. Migração futura para Coolify é possível, com revisão operacional, backups e secrets.

- [Desenvolvimento](docs/development.md)
- [Autenticação](docs/auth.md)
- [Arquitetura](docs/architecture.md)
- [Estúdio da campanha](docs/campaign-editor.md)
- [Clientes e dados comerciais](docs/contracts.md)
