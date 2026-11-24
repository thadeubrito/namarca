# Mapa de código e validação

Use como índice, não como descrição completa da implementação. Decisões/exceções em [memory.md](memory.md), intenção em [product.md](product.md), UI por escopo em [design/admin.md](design/admin.md) e [design/public.md](design/public.md). Conferir código e gates do runner antes de executar. Comandos abaixo são referências operacionais, não resultados de validação desta consolidação.

## Pontos de entrada

Todos os caminhos `src/` abaixo estão em `apps/admin/`, salvo indicação contrária.

| Domínio | Onde consultar |
|---|---|
| Workspaces/build | `package.json`, `apps/*/package.json`, `packages/editor/package.json`, `tsconfig.base.json`, `apps/admin/next.config.ts`. Lock único na raiz. |
| Rotas administrativas | `src/app/(workspace)`: `/` campanhas, `/campanhas/nova`, `/campanhas/[id]`, `/clientes/*`, `/financeiro`. Route group não entra na URL; `/admin/*` não tem compatibilidade. |
| Auth | `src/lib/{auth,auth-client,admin}.ts`, `src/db/auth-schema.ts`, `src/components/auth-panel.tsx`, `src/app/{login,seguranca,api/auth}`, `scripts/{create-admin,reset-admin,test-auth}.ts`. `getEnrollmentSession` só permite setup; `AdminAuthorizationError` precisa tratamento no handler. |
| Campanhas/clientes | `src/lib/{campaign-input,campaign-client,client-input,campaign-slug}.ts`; actions de `(workspace)/campanhas/{nova,[id]}` e `clientes/actions.ts`. |
| UI ativa | `src/components/admin-workspace/`, primitives em `src/components/ui/`, tokens `src/app/ui.css`. Conferir encadeamento de imports: componentes antigos podem não participar das rotas ativas. |
| Rascunhos/painéis | `admin-workspace/{campaign-sections,workspace-tabs,campaign-recovery,form-draft,studio-workspace}.tsx`, `src/lib/{studio-draft,studio-discard}.ts`. |
| Editor e assets privados | `src/lib/{campaign-editor,asset-upload,asset-cleanup,asset-cleanup-policy,storage}.ts`; `src/app/api/campaigns/[id]/{editor,assets,assets/[assetId],assets/cleanup}/route.ts`. |
| Core compartilhado | `packages/editor/src/`: `editor/` composição/gestos/histórico/exportação, `events/events.ts` contrato/parser/tema, `styles.css`, `analytics.ts` no-op. Exports `@namarca/editor/{events,photo-editor,styles.css}`. |
| Runtime/prévia | `apps/campaign/src/{main,preview}.tsx`, esbuild; artefato `apps/campaign/dist/`. `apps/admin/scripts/copy-preview.mjs` copia para `apps/admin/public/campaign-runtime/` no predev/prebuild. Não editar gerados como fonte. |
| Entrega pública | `apps/site/`, `services/public-site/`: gateway GET independente do admin/DB, allow-list de JSON/PNG; `PUBLIC_SITE_URL` aponta origem pública. |
| Estudos públicos isolados | `apps/site/estudos/`, URL local `http://localhost:3001/estudos/`: comparação Stack/Circular Gallery, preservada junto à entrada institucional Lima. Adaptações vanilla de React Bits; geometria DOM equivalente com wave=0, não renderer WebGL. Fontes fixadas/licença MIT + Commons Clause em `NOTICE.txt`; allow-list exata no gateway. Estudo dedicado `/estudos/molduras/`: foto placeholder fixa 4:5, três molduras vazadas na mesma geometria circular, snap e wrap; não é editor nem direção pública definitiva. Browser focal: `scripts/test-site-studies.mjs` e `scripts/test-site-frames.mjs` em Playwright container; o segundo verifica geometria da foto durante swipe, transparência, snap e alternativas de interação. Estudo independente `/estudos/perspectiva/`: canvas Stories 9:16, três materiais SVG vazados com geometria compartilhada com a foto adaptativa independente e figurinhas pop-out/pop-in; mecanismo vanilla próprio com translate3d/rotateY/scale e profundidade contínua, sem arco/rotateZ. Seleção fica congelada durante arraste e confirma na aproximação final do snap (0,32 slot); comparação por links entre estudos. Browser focal `scripts/test-site-perspective.mjs` cobre trajetória e quadros intermediários em `/tmp`, gestos, snap, wrap e reduced-motion. O motor `apps/site/estudos/perspectiva/perspectiva.js` inicializa por `[data-perspective]` e também serve o hero demonstrativo de `/`, com CSS scoped inline e sem controles de reprodução na landing (controles opcionais preservados no estudo). Mantém runner da raiz separado (`scripts/test-site-wireframe.mjs`, `tests/site-wireframe.test.ts`). Institucional lima/Poppins em `/` e `/estudos/lima/` (HTTP 200, mesmo HTML via mapeamento exato do gateway, sem redirect/iframe); fonte única em `apps/site/estudos/lima/`, testes focais `scripts/test-site-lima.mjs` e `tests/site-lima.test.ts`; fontes locais/OFL/NOTICE e `lima.js` (scroll reveals locais) em allow-list exata. Substitui o skeleton na raiz; o antigo `apps/site/index.html` não é servido. Estudos anteriores permanecem acessíveis. |
| Laboratório Astro isolado | `apps/site-lab/`: Astro static + ilha React/TypeScript, Tailwind v4 e alias `@/components/ui` local. POC Warp Carousel fornecido pelo usuário, licença não confirmada; não migra institucional/campanha nem editor. Variante atual usa quatro artes completas 480×853 do hero público (Órbita 26, Clube Sol, Lívia e Tomás, Luma 2026) copiadas para `public/images/`, sem corrida/festival; props em `src/components/campaign-cards.ts`, procedência/limites no NOTICE local. Canvas/WebGL em proporção vertical original, autoplay step=1, galeria HTML sem JS e carregamento local; direitos para produção pendentes. Build em `apps/site-lab/dist/`; `compose.site-lab.yaml` independente serve somente arquivos em `http://localhost:3002/`, sem `.env`, SSR ou dependências de backend. Setup/Cloudflare Pages (instruções, sem deploy) em `apps/site-lab/README.md`; volume de dependências exclusivo `namarca_site_lab_deps`, lock único. Contratos `tests/site-lab.test.ts`, browser `scripts/test-site-lab.mjs`; comandos/deps em containers. |
| Publicação | `src/lib/{campaign-publication,publication-state,publication-artifacts,publication-access,publication-access-delivery,publication-restore,publication-diff,campaign-availability,public-site}.ts`; `(workspace)/campanhas/[id]/publication-actions.ts`. |
| Checkout/webhook | `src/lib/{checkout,billing-input,currency-input,pixgo,pix-countdown}.ts`, `(workspace)/campanhas/[id]/billing-actions.ts`, `src/app/checkout/[token]/`, `src/app/api/webhooks/pixgo/route.ts`, `services/pixgo-mock/`. |
| Financeiro | `src/lib/{financial-report,global-financial-report,financial-filters}.ts`, `(workspace)/financeiro/page.tsx`, `src/app/api/financial-report/route.ts`; relatório por campanha também em `(workspace)/campanhas/[id]/financeiro` e `api/campaigns/[id]/financial-report`. |
| Banco | `src/db/{index,schema,auth-schema}.ts`, `apps/admin/drizzle/` e `drizzle.config.ts`. Tabelas legadas de contratos/packages/eventos são retenção; conferir usos antes de remover. |
| Validação | `tests/` unitários/contratos, `e2e/` Playwright, `scripts/` integrações/CLI e fixtures. |

## Detalhes técnicos para investigar com segurança

- Auth: `ADMIN_EMAIL` normalizado + TOTP habilitado + `session.twoFactorVerified`, lidos no DB. `BETTER_AUTH_SECRET` cifra fatores/códigos: não trocar para “corrigir login”. `admin:create` recusa conta existente; `admin:reset` revoga sessões/fatores, requer pedido explícito e procedimento com aplicação parada. Senha somente interativa, nunca argumento/pipe/env/arquivo. Dev origins Next e trusted origins Better Auth são controles distintos.
- Upload direto ativo: `src/lib/direct-upload{,-client,-storage}.ts`, `api/campaigns/[id]/assets/uploads/route.ts` e `[uploadId]/complete/route.ts`; tabela `campaign_asset_uploads`, migration0016. JSON autenticado autoriza staging privado por hash/tamanho/vínculo; PUT assinado 5min, finalização até1h valida PNG e grava bytes definitivos. `S3_UPLOAD_ENDPOINT` é endpoint acessível pelo navegador antes de assinar (Compose localhost9000), separado do interno. CORS local explícito: `scripts/configure-local-upload-cors.ts`. Setup/limites/retenção em `apps/admin/UPLOADS.md`; integração descartável `sh scripts/run-direct-upload-test.sh` (handlers/auth/TOTP/S3/DB reais, sem HTTP Next/browser). Lifecycle aprovado de 1 dia somente para `private/uploads/`, ainda não configurado; sem worker/cron ou limpeza automática implementada pela aplicação. A rota raw permanece compatível, mas não é transporte do estúdio nem suporta 25MiB na Vercel.
- Assets legado: POST PNG raw `image/png`, `X-Asset-Name` codificado, `X-Upload-Id` UUID idempotente com mesmos bytes/tipo/vínculo. Validação CRC/alpha0 e255/dimensões, 25MiB/40milhões pixels. `PUT /editor` aceita scope `artworks|stickers|theme`; sem scope conserva compatibilidade full save; revisão global/409. Privados: `private/campaigns/<UUID>/assets/<UUID>.png`, leitura autenticada/no-store. Não trocar hostname depois de assinar URL S3.
- Cleanup: confirmação manual por até100 IDs canônicos, preservando referências atuais/históricas/packages legados e objetos <24h ou data desconhecida. Pós-commit revalida sob lock; falha não desfaz save. Nunca deletar prefixo amplo.
- Bridge privado aceita parent/origem/campanha/manifesto válidos e mapa separado de blob URLs same-origin. Entrada pública não recebe bridge. `/campaign-runtime/index.html` sozinho não é URL válida de campanha.
- Publicação: `public/campaigns/<slug>/artworks|stickers/<UUID>.png`, `versions/vN.json`, depois pointer `campaign.json`. Snapshot atual e `campaign_publication_history` são retentores. Conferir locks/updatedAt/revisão/deliveredAt e compatibilidade de releases legadas, não apenas status.
- Checkout: token opaco é credencial; no-store/noindex/no-referrer. Gate de checkout é estritamente mock; suporte live no adapter não autoriza remover gate. Creating recente bloqueia concorrência; abandonado permite retry após15s, mantendo risco de resposta perdida. `external_id` não é unicidade garantida pelo provedor.
- Webhook: body streaming <=16KiB, HMAC SHA256 de `timestamp.rawBody`, ±5min/timing-safe, IDs/centavos conferidos por consulta server-to-server. Dedupe SHA256(payment_id+':'+event), receipt+estado transacionais; 200 após commit, transitório503. Refund preserva paidAt; não modela parcial. Nunca logar body bruto.
- Financeiro: filtros createdAt com dias completos São Paulo UTC−3, mesmo recorte de totais/lista/CSV. Inválidos não consultam; CSV400. Export UTF-8/BOM/`;`, BRL exato/UTC, allow-list e neutralização de fórmulas; sem cliente/documento/token/QR. Sem paginação/reconciliação em lote.

## Ambiente e comandos básicos

`compose.yaml`: app3000, public-site3001, postgres5432, S3/SeaweedFS9000, pixgo-mock4010, portas em127.0.0.1. S3 não tem console MinIO. App startup roda `npm ci`: aguardar antes de testes e não executar instalações concorrentes no mesmo volume. Rede para bootstrap não significa exigir SaaS em desenvolvimento.

Com app/dependências prontos, da raiz:

```sh
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm test
docker compose exec app npm run build:campaign
# Recompila runtime e atualiza cópia da prévia administrativa:
docker compose exec app npm run build:preview --workspace @namarca/admin
# Watch sem HMR: reload perde foto local.
docker compose exec app npm run dev:campaign
```

`build`/`dev` delegam ao admin; prebuild/predev inclui runtime e cópia. Alterou schema: gerar em container com `npm run db:generate`, revisar SQL/metadados e aplicar `npm run db:migrate` primeiro em DB descartável, validando cadeia completa. Não tratar migration no banco principal como teste inofensivo; `db:push` não substitui migration.

Parar preservando dados: `docker compose down`, nunca `down -v`. Não trocar senha PostgreSQL em volume inicializado, limpar bucket ou recriar conta/sessões para tornar teste verde. Gateway/mock Node não têm hot reload: restart restrito ao serviço alterado quando necessário.

## Build isolado do desenvolvimento

Não usar o `.next` do app dev. No monorepo, montar `/app/.next` não isola `/app/apps/admin/.next`. Modelo de build em cópia tmpfs, dependências já instaladas, fonte read-only, sem rede/`.env*`, valores exclusivamente sintéticos:

```sh
docker run --rm --network none \
  -v "$PWD:/source:ro" --tmpfs /app:rw,size=3g \
  -v namarca_node_modules:/app/node_modules:ro -w /app \
  -e NODE_ENV=production -e NEXT_TELEMETRY_DISABLED=1 \
  -e BETTER_AUTH_URL=https://app.namarca.test \
  -e ADMIN_EMAIL=build@namarca.test \
  -e BETTER_AUTH_SECRET=synthetic-build-only-not-a-production-secret \
  -e DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
  node:24.11.1-bookworm-slim sh -c \
  'node -e '\''const fs=require("node:fs");fs.cpSync("/source","/app",{recursive:true,filter:p=>!p.slice(8).split("/").some(n=>["node_modules",".git",".next","dist","campaign-runtime"].includes(n)||n.startsWith(".env"))})'\''; npm run build'
```

Não usar symlink de deps fora da raiz (Turbopack/tracing). Se imports novos exigirem configuração adicional, fornecer sintética, nunca carregar secrets reais ou liberar rede como atalho. Futuro Vercel: root `apps/admin`, acesso fora da raiz e build workspace com prévia; não é autorização de deploy.

## Integrações e isolamento

Provisionar recursos exclusivos sem portas públicas, migrations completas, ambiente sintético e DB/conta vazios; preferir PostgreSQL/S3 tmpfs e redes internas próprias. App teste precisa cópia/`.next` próprios, sem `npm ci` concorrente. Conferir nomes livres e gates antes de importar domínio. Cleanup somente fixtures/chaves exatas e recursos criados na execução, também após falha; não imprimir conexão, setup/TOTP ou documentos.

| Comando no container preparado | Pré-condições e alcance |
|---|---|
| `npm run test:auth` | Obrigatório em auth. Handler real + DB migrado `*_auth_test`, sem conta para ADMIN_EMAIL, credenciais efêmeras. Não é browser/reset CLI/rate limit distribuído. |
| `node_modules/.bin/tsx scripts/test-campaign-editor.ts` | DB `*_editor_test` sem contas, ADMIN_EMAIL `editor-test@namarca.test`, BETTER_AUTH_URL `http://namarca-editor-test:3000`, browser/app/S3 fixture na rede própria. `run-admin-ui-test.mjs` transforma DB/origin/email, **não provisiona isolamento**. |
| `node_modules/.bin/tsx scripts/test-asset-cleanup.ts` | DB `*_editor_test`, chaves sintéticas próprias. |
| `npm run test:checkout` | DB exato `namarca_checkout_test`, host postgres, NODE_ENV development, PIXGO_MODE mock, `CHECKOUT_TEST_ISOLATED=1`; aliases app/pixgo-mock **exclusivos** e callback `http://app:3000/api/webhooks/pixgo`. DB sem campanhas/usuários; Chromium. |
| `npm run test:webhook` | Gate local/mock/host postgres **não exige nome descartável de DB**. Isolar DB/app/mock/callback manualmente; não rodar direto no app principal. |
| `node_modules/.bin/tsx scripts/test-publication.ts` | Container, DB `*_publication_test` em publication-test-db, `PUBLICATION_TEST_DISPOSABLE=true`, mock, S3 publication-test-s3/bucket publication-test, `PUBLICATION_TEST_PUBLIC_URL` host publication-test-public. Público em rede storage-only sem DB/admin. |
| `npm run test:e2e -- --output=/tmp/namarca-e2e` | Playwright compatível com lockfile (imagem referenciada `mcr.microsoft.com/playwright:v1.56.1-noble`), deps existentes, `E2E_BASE_URL` do app escolhido. Config não provisiona servidor/DB; saída gravável fora da fonte read-only. |

Runner editor possui flags `SECTION_SAVE_ONLY`, `UNIFIED_TABS_ONLY`, `PLAN_A_ONLY`, `GALLERY_ONLY`, `EDITOR_RUNTIME_ONLY`, `CLIENT_DIRECTORY_ONLY`, `UPLOAD_FEEDBACK_ONLY`, `BILLING_UI_ONLY`, `FINANCIAL_REPORT_ONLY`, `DIRTY_GUARD_ONLY`, `CAMPAIGN_SECTIONS_ONLY`: uma por vez, valor1. Algumas incluem cenários anteriores; não presumir isolamento. Conferir seletores/contratos antigos contra UI atual, sem relaxar regras para mascarar fixture obsoleta.

Capturas opt-in: `ADMIN_UI_SHOTS`, `ADMIN_VISUAL_AUDIT`, `EDITOR_RUNTIME_SHOTS`, `PLAN_A_SHOTS`, `SECTION_SAVE_SHOTS`, em `/tmp` próprio e só dados sintéticos. Nunca capturar setup/QR TOTP/documentos. Sem force-click/dispatchEvent para esconder erro: export no iframe precisa estar no viewport **externo**. Browser focal/HTML estático/actions mockadas não equivalem a auth/persistência/submit Next reais. Typecheck, lint, testes, migrations e build são verificações distintas.
