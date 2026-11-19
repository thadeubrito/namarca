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

## Ampliação: aprovação visual versionada

Runner registra v1 pela UI, rejeita duplicata a partir de aba previamente aberta, modifica/salva arte e confere que v1 permanece intacta, rejeita revisão obsoleta e registra explicitamente v2. Confere responsável/canal/data/registrador e snapshots por SQL. Prévia histórica v1 bloqueia anônimo, carrega material original e ignora postMessage de configuração v2. Foto sintética continua local. Campanha permanece draft/unpublished sem tarefas. Cleanup remove packages antes de campaign pela FK restrita.

Execução completa aprovada após corrigir extração dos campos de formulário (metadados React não entram no schema strict) e sincronização do runner. Houve tentativas anteriores com timeout no trecho referência/salvamento; não generalizar estabilidade. 37 testes unitários/contratos, typecheck/lint, migrations e build aprovados. Nenhuma conta/sessão real alterada. Ver `docs/campaign-packages.md`.

## Ampliação: financeiro e proteção de rascunho

`FINANCIAL_REPORT_ONLY=1` executa somente relatório protegido com dados sintéticos, guards e CSV. `DIRTY_GUARD_ONLY=1` executa confirmação de submit de dados base com estúdio dirty: cancelar bloqueia requisição e mantém DB/rascunho; aceitar salva dados base sem salvar configuração. Runner integral também verifica bloquear aprovação visual dirty (alert, sem pacote criado), além dos fluxos anteriores. Execução focal e integral aprovadas nesta etapa; não elimina flakiness histórica do editor. Não usar ambos os modos focais ao mesmo tempo. Cleanup remove payments/checkout links/packages antes de campaigns.

## Ampliação: múltiplos materiais na galeria

`scripts/editor-gallery-scenario.ts`, chamado pelo runner integral, usa três artes e três stickers sintéticos. Exercita uploads/nomes, referências independentes por arte, seleção, movimentos para cima/baixo e limites das listas, ordem na API e após reload, troca de arte na prévia e catálogo de stickers. Remove a arte selecionada e verifica fallback da área da foto; confirma persistência dos itens restantes e que PNGs retirados continuam acessíveis ao admin. Por fim remove todos, salva/recarrega o rascunho vazio e verifica a mensagem na prévia. O fluxo integral continua depois com novos uploads, exportação local, aprovações e clientes.

`GALLERY_ONLY=1` encerra após essa fatia (ainda executa login/TOTP e os cenários anteriores de dirty/financeiro). Não combinar com outros modos focais. Execução focal e integral aprovadas em Chromium desktop em 18/11/2026. A primeira tentativa falhou apenas no assert de texto dos botões de arte, que também inclui dimensões; corrigido para conferir o nome acessível completo. Nenhuma mudança no editor de produção foi necessária. Não cobre materiais reais, proporções variadas, toque/mobile físico ou substituição de arquivo in-place (não existe essa ação). Não resolve o 422 reportado.

## Ampliação: feedback de upload e cobrança administrativa

`UPLOAD_FEEDBACK_ONLY=1` encerra após escolher dois PNGs sintéticos inválidos na UI: um opaco e outro com bytes inválidos, verificando mensagens úteis e zero assets persistidos. Não diagnostica materiais reais. `BILLING_UI_ONLY=1` inclui isso e dirty, emite cobrança com submit real, confere snapshot SQL e testa copiar link/mensagem, além de falha de permissão sem manter sucesso antigo. Clipboard é simulado no limite da API do browser porque o origin HTTP interno não oferece clipboard do SO; não declarar validação de cópia nativa. Os dois cenários também integram o runner completo. Não combinar modos focais.

Nesta etapa: 43 testes, lint/typecheck, migrations descartáveis e build isolado aprovados. Execuções focais e integral final passaram. Uma execução integral anterior falhou em fill da galeria, sem reproduzir na seguinte; flakiness permanece. Consulta/recuperação administrativas ainda não foram clicadas neste cenário.

## Ampliação: seção Clientes

`CLIENT_DIRECTORY_ONLY=1` executa guard de acesso anônimo e sessão sem TOTP, cadastro independente com nome/contato, busca por contato, edição e reload, busca por nome e vazio, vinculação na campanha via submit e link da campanha na página de cliente. Verifica overflow a 390px e encerra após retornar à campanha. Conta/dados isolados removidos pelo finally. Integra o runner principal; não combinar flags focais. Execução focal aprovada, 45 testes/typecheck/lint/migrations/build aprovados. Regressão integral desta sessão bloqueada na galeria preexistente (não declarar PASS integral).

## Ampliação: navegação por abas da campanha

`CAMPAIGN_SECTIONS_ONLY=1` verifica criação com campo obrigatório em painel oculto (revela a aba correta), exclusividade dos painéis principais, teclado com setas/Home/End, retenção de nome/observações e arte dirty ao navegar sem PUT/salvamento, banco inalterado e ausência de overflow a 390/1440px. Capturas exclusivamente sintéticas em `/tmp/namarca-sections-desktop.png` e `mobile.png`; o container precisa montar `/tmp` para inspecioná-las no host. Não combinar flags. Testes anteriores foram adaptados para clicar nas abas antes de interagir. Focal, dirty e integral aprovados nesta etapa; não elimina flakiness histórica nem comprova toque/celular físico.

## Ampliação: runtime estático compartilhado

O runner agora chama `scripts/editor-runtime-scenario.ts` após o export local. `EDITOR_RUNTIME_ONLY=1` encerra depois dele. Confere estilos dos controles público/prévia, ausência de Next no iframe, fotos/PNGs locais, mensagens não autorizadas rejeitadas, ampliar/recolher preservando composição, viewport 390px sem overflow e manifesto encerrado. Público usa interceptação de manifesto/assets sintéticos, não bucket publicado. Histórico aprovado foi adaptado ao iframe estático e inclui endpoint anônimo 403 e vínculo inválido 404. `EDITOR_RUNTIME_SHOTS=1` grava capturas sintéticas em `/tmp`; montar `/tmp` no container para vê-las no host. Prévia tem sticker, público não: não são capturas da mesma composição. Ver limites e detalhes em [editor-runtime.md](editor-runtime.md). Runner integral final aprovado, sem declarar resolvida a flakiness histórica.

## Refatoração UI shadcn / temas

Runner atualizado para aba `Artes`, textos atuais e área da foto ajustada com ponteiro real nas alças (`scripts/editor-reference-helper.ts`), sem inputs numéricos removidos. Seletores de Clientes limitados à navegação principal. `ADMIN_UI_SHOTS=1` produz capturas sintéticas de login e dados da campanha em claro/escuro, 1440/390px, verifica overflow, contraste dos inputs e persistência após reload. Não captura setup/QR/códigos. Montar `/tmp` para inspecionar imagens. `scripts/run-admin-ui-test.mjs` é launcher de container que aponta somente para o DB/origin descartáveis documentados acima, sem imprimir credenciais. Runner integral aprovado após migração, sem prometer ausência de flakiness histórica.

## Encerramento

```sh
docker rm -f namarca-editor-test
docker compose exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" namarca_editor_test'
# Opcional: remover exclusivamente o volume de build descartável.
docker volume rm namarca_editor_test_next
```

Nunca usar `compose down -v`: volumes e sessões reais devem permanecer intactos.
