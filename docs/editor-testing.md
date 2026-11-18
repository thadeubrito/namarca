# Integração browser do editor

Runner: `scripts/test-campaign-editor.ts`. Executar apenas em containers, banco descartável terminado em `_editor_test`, conta `editor-test@namarca.test`, origin `http://namarca-editor-test:3000`. O runner rejeita outro banco/origin/admin e banco com contas existentes. Não usa conta, cookies ou sessão do admin real. Não grava screenshots/traces, senhas, URI TOTP ou códigos de recuperação.

## Provisionamento local isolado

Com os serviços locais existentes ativos, sem instalar dependências e sem alterar `.env.local`:

```sh
# Cria um banco novo; se existir, investigar, não sobrescrever.
docker compose exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" namarca_editor_test'

# Preserva credenciais locais sem imprimi-las, troca apenas o nome do banco.
docker compose run --rm --no-deps app sh -c 'export DATABASE_URL="$(node -e '\''const u=new URL(process.env.DATABASE_URL);u.pathname="/namarca_editor_test";process.stdout.write(u.href)'\'')"; npm run db:migrate'

docker compose run -d --no-deps --name namarca-editor-test \
  -e BETTER_AUTH_URL=http://namarca-editor-test:3000 \
  -e ADMIN_EMAIL=editor-test@namarca.test \
  -v namarca_editor_test_next:/app/.next \
  app sh -c 'export DATABASE_URL="$(node -e '\''const u=new URL(process.env.DATABASE_URL);u.pathname="/namarca_editor_test";process.stdout.write(u.href)'\'')"; exec npm run dev -- --port 3000'

docker run --rm --network namarca_default --env-file .env.local \
  -e BETTER_AUTH_URL=http://namarca-editor-test:3000 \
  -e ADMIN_EMAIL=editor-test@namarca.test \
  -v "$PWD:/app:ro" -v namarca_node_modules:/app/node_modules -w /app \
  mcr.microsoft.com/playwright:v1.56.1-noble sh -c \
  'export DATABASE_URL="$(node -e '\''const u=new URL(process.env.DATABASE_URL);u.pathname="/namarca_editor_test";process.stdout.write(u.href)'\'')"; exec node_modules/.bin/tsx scripts/test-campaign-editor.ts'
```

Não usar `--service-ports`: o browser usa DNS interno e porta 3000; nenhuma porta do host é publicada. O app tem `.next` próprio e **não** roda `npm ci` (dependências compartilhadas). `next.config.ts` deve permitir `namarca-editor-test` como dev origin; auth e validação de origin usam o BETTER_AUTH_URL acima. CSP da prévia precisa permitir iframe same-origin.

O runner cria conta com senha aleatória e hash Better Auth no DB isolado, faz login real via UI, configura TOTP via URI da opção manual, calcula código com HMAC e confirma o checkbox de recuperação. Cria campanha pela UI, envia PNGs sintéticos (moldura 400×400 com centro transparente, sticker 128×128 com transparência), ajusta referência numérica, salva e recarrega. Verifica API sem autenticação, CSRF, kind inválido e revisão obsoleta 409. Foto sintética 600×600 fica no browser; teste exige zero POST/PUT/PATCH durante foto/export e PNG exportado 400×400. A campanha deve permanecer draft.

`finally` remove somente objetos S3 apontados pelos assets da campanha criada, campanha e usuário fixture. Em encerramento abrupto, inspecionar **somente** o banco descartável e suas chaves privadas para limpeza; nunca fazer delete por prefixo amplo em storage compartilhado.

## Resultado observado em 2026-11-18

**PASS completo em Chromium real, imagem Playwright 1.56.1.** Login senha + setup TOTP, criação UI, uploads, referência, save/reload e guards API aprovados. Foto local + adição de sticker pela prévia + download PNG 400×400 aprovados, incluindo pixels conhecidos da moldura, foto e sticker; nenhuma requisição POST/PUT/PATCH durante a composição/export. Campanha permanece draft/unpublished. Typecheck aprovado.

O timeout de export inicialmente observado era um defeito no enquadramento do teste, não em `ExportPanel`: `locator.click` ficava tentando scroll do botão dentro do iframe sticky e nunca enviava pointerdown/click porque o botão estava fora do **viewport externo**. Diagnóstico temporário contou zero clicks, zero chamadas toBlob, zero anchors e nenhum erro; `navigator.share`/`canShare` eram undefined no origin HTTP não seguro (download era o ramo correto). O botão estava dentro do viewport interno, mas o iframe sticky podia ultrapassar o externo. Correção: viewport externo de 1440×1400 e posicionamento explícito do iframe inteiro antes das interações. Não foi usado force-click, dispatchEvent, mock de export, override de navigator ou alteração no core para mascarar erro. O download é capturado no Page que contém o iframe, normalmente. Também corrigido assert SQL do runner para os nomes reais preparation_status/publication_status, em vez de status inexistente. Instrumentação temporária removida; nenhum dado sensível foi coletado. Implementação do editor permaneceu intacta, pois não havia falha de export comprovada.

## Ampliação: dados comerciais simples

O runner cria campanha sem cliente obrigatório e exige um campo de preço e ausência da seção Contratação. Cadastra cliente inline com nome/contato, salva e recarrega; cria segunda campanha selecionando o mesmo cliente e confere via SQL a reutilização. Desvincula da primeira sem apagar cliente nem vínculo da segunda. Confere preço e estado draft/unpublished. Execução aprovada em 18/11/2026. O antigo cenário de contratação versionada foi retirado junto com a funcionalidade, por decisão do fundador. Ver `docs/contracts.md`.

## Encerramento

```sh
docker rm -f namarca-editor-test
docker compose exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" namarca_editor_test'
# Opcional: remover exclusivamente o volume de build descartável.
docker volume rm namarca_editor_test_next
```

Nunca usar `compose down -v`: volumes e sessões reais devem permanecer intactos.
