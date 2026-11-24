# Mapa de código e validação

Use como índice, não como descrição completa da implementação. Decisões/exceções em [memory.md](memory.md), intenção em [product.md](product.md), UI por escopo em [design/admin.md](design/admin.md) e [design/public.md](design/public.md). Código e migrations são a fonte da implementação. Comandos abaixo são referências operacionais, não resultados de validação desta consolidação.

## Aplicação e roteamento

Uma aplicação Next na raiz, sem npm workspaces: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `src/`, `public/`, `drizzle.config.ts` e `drizzle/`. Não há build/deploy separado de gateway público ou runtime.

`src/proxy.ts` e `src/lib/host-routing.ts` separam hosts por autoridade exata, sem confiar em forwarded-host. Local: público `http://localhost:3000`, administrativo `http://admin.localhost:3000`. Produção pretendida: `https://namarca.com` e `https://admin.namarca.com`, no mesmo deploy; configurar `PUBLIC_SITE_URL` e `BETTER_AUTH_URL` como origens distintas. Configuração inválida falha fechada.

No host administrativo, `/` reescreve para `/admin`; `/login`, `/seguranca`, `/campanhas`, `/clientes` e `/financeiro` reescrevem para destinos internos `/admin/*`. `/admin/*` externo é bloqueado em ambos os hosts. A raiz pública serve o institucional; slug público abre a página Next com editor client-only; checkout e webhook PixGo ficam no host público. O proxy não substitui `requireAdmin`, Origin/CSRF ou TOTP.

## Pontos de entrada

| Domínio | Onde consultar |
|---|---|
| Rotas administrativas | `src/app/admin/(workspace)/`: lista em `page.tsx`, `campanhas/{nova,[id]}`, `clientes/*`, `financeiro`. Route groups não entram na URL externa. |
| Auth | `src/app/admin/(auth)/{login,seguranca}`, `src/app/api/auth`, `src/lib/{auth,auth-client,admin}.ts`, `src/db/auth-schema.ts`, `src/components/auth-panel.tsx`, `scripts/{create-admin,reset-admin,test-auth}.ts`. |
| Campanhas/clientes | `src/lib/{campaign-input,campaign-client,client-input,campaign-slug}.ts`; actions em `src/app/admin/(workspace)/campanhas/` e `clientes/`. |
| UI ativa | `src/components/admin-workspace/`, primitives em `src/components/ui/`, tokens `src/app/ui.css`. Conferir imports: componentes antigos podem não participar das rotas ativas. |
| Rascunhos/painéis | `src/components/admin-workspace/{campaign-sections,workspace-tabs,campaign-recovery,form-draft,studio-workspace}.tsx`, `src/lib/{studio-draft,studio-discard}.ts`. |
| Editor único | `src/editor/`: composição, gestos, histórico, exportação e UI. Contrato/parser/tema em `src/lib/campaigns/`, importados via `@/lib/campaigns/campaigns`; não criar outro editor para o público. |
| Editor público/prévia | `src/app/[slug]/page.tsx`, `src/editor/{PublicCampaignEditor,CampaignEditorClient,CampaignPreview}.tsx`. `PhotoEditor` único carregado sob demanda com SSR desabilitado; prévia por props React, sem iframe/postMessage. Estilos escopados em `src/editor/isolated.css`; validação de materiais/blobs em `preview-config.ts`. |
| Institucional | Landing nativa Next em `src/app/page.tsx`, componentes e módulos de interação em `src/components/site/`, assets próprios em `public/landing/`. Sem rewrite para HTML, cópia de estudos ou dependência de `site/`/`experiments/` no build. Pastas históricas removidas por autorização; não recriar laboratório separado. |
| Demonstração | Campanha normal criada/autenticada no admin e publicada explicitamente. Hero aponta por padrão a `/exemplo`; `EXAMPLE_CAMPAIGN_SLUG` substitui o slug e valor vazio oculta o CTA. Fixture em `tests/fixtures/exemplo-clube-sol/` serve só testes/preparo local; não copiada para `public/`. |
| Assets privados | `src/lib/{campaign-editor,asset-upload,asset-cleanup,asset-cleanup-policy,storage}.ts`; `src/app/api/campaigns/[id]/{editor,assets}/`. |
| Upload direto | `src/lib/direct-upload{,-client,-storage}.ts`, `api/campaigns/[id]/assets/uploads/route.ts` e `[uploadId]/complete/route.ts`; `docs/uploads.md`, migration0016. |
| Publicação | `src/lib/{campaign-publication,publication-state,publication-artifacts,publication-access,publication-access-delivery,publication-restore,publication-diff,campaign-availability,public-site}.ts`; actions administrativas em `campanhas/[id]/publication-actions.ts`. |
| Leitura pública | `src/lib/{published-campaign,publication-cache}.ts`, `src/app/campaigns/[slug]/campaign.json/route.ts` e `[kind]/[file]/route.ts`. |
| Checkout/webhook | `src/lib/{checkout,billing-input,currency-input,pixgo,pix-countdown}.ts`, actions administrativas de cobrança, `src/app/checkout/[token]/`, `src/app/api/webhooks/pixgo/route.ts`, `services/pixgo-mock/`. |
| Financeiro | `src/lib/{financial-report,global-financial-report,financial-filters}.ts`, páginas administrativas e `src/app/api/financial-report/route.ts`; relatório por campanha também em `api/campaigns/[id]/financial-report`. |
| Banco | `src/db/{index,schema,auth-schema}.ts`, `drizzle/` e `drizzle.config.ts` na raiz. Preservar toda a cadeia de migrations; tabelas legadas podem ser retentoras. |
| Validação | `tests/`, `e2e/`, `scripts/`. `tests/support/public-site-gateway.mjs` atende somente fixtures de testes históricos: não é servidor Compose nem caminho de produção. |

Landing e assets possuem procedência em `public/landing/{NOTICE.txt,OFL.txt}`; contratos automatizados da landing em `tests/site-*.test.ts` e `tests/landing-next.test.ts`. Runners manuais antigos não integrados foram removidos, não migrados para uma suíte equivalente. Não há rotas de estudos nem laboratório Astro.

## Contratos técnicos para investigar com segurança

- Auth: `ADMIN_EMAIL` normalizado + TOTP habilitado + `session.twoFactorVerified`, lidos no DB. `getEnrollmentSession` só permite setup; tratar `AdminAuthorizationError` no handler. `BETTER_AUTH_SECRET` cifra fatores/códigos: não trocar para corrigir login. `admin:create` recusa conta existente; `admin:reset` revoga sessões/fatores, requer pedido explícito e aplicação parada. Senha somente interativa, nunca argumento/pipe/env/arquivo. Dev origins Next e trusted origins Better Auth são controles distintos.
- Upload direto: JSON autenticado autoriza staging privado por hash/tamanho/vínculo; PUT assinado5min, finalização até1h valida PNG e grava definitivos. `S3_UPLOAD_ENDPOINT` é origem acessível pelo navegador antes de assinar, distinta da interna; não reescrever hostname assinado. CORS local: `scripts/configure-local-upload-cors.ts`. Setup/limites em `docs/uploads.md`; pendências de homologação/retenção em memory.
- Assets legado: POST PNG raw `image/png`, `X-Asset-Name` codificado, `X-Upload-Id` UUID idempotente com mesmos bytes/tipo/vínculo. CRC/alpha0 e255/dimensões, 25MiB/40milhões pixels. Rota raw compatível, não transporte do estúdio nem solução de25MiB na Vercel. `PUT /editor` aceita scope `artworks|stickers|theme`, sem scope mantém compatibilidade full save; revisão global/409. Definitivos únicos em `private/campaigns/<UUID>/assets/<UUID>.png` (prefixo histórico); API administrativa autenticada/no-store e entrega pública por vínculo slug/ID/tipo, inclusive antes de publicar para quem conhece a URL.
- Cleanup: confirmação manual por até100 IDs canônicos, protegendo referências atuais/históricas/packages legados e objetos <24h ou data desconhecida. Pós-commit revalida sob lock; falha não desfaz save. Nunca excluir prefixo amplo.
- Prévia privada recebe somente configuração e materiais por props, valida UUID/manifesto/seleção e mapa allow-list de blobs same-origin. APIs continuam com `requireAdmin`; a composição local não integra rascunho/upload. Mudança de campanha remonta a sessão; mudança de aba/configuração mantém o editor. Runtime HTML e bridge aposentados; `/campaign-runtime/*` bloqueado.
- Publicação: versão e histórico no PostgreSQL referenciam os mesmos definitivos imutáveis do rascunho, servidos por URLs virtuais `/campaigns/<slug>/<artworks|stickers>/<UUID>.png`. Checar disponibilidade antes do commit, sem cópia/PUT de PNG ou JSON no bucket. Sem fallback de entrega para cópias públicas antigas. Reader reconstrói allow-list de snapshots entregues, nunca draft; pending legado usa histórico entregue mais recente. Endpoint `/campaigns/<slug>/campaign.json` é projeção do DB. Cache interno Next por slug com TTL30s/tag; actions invalidam após commit, resposta do manifesto no-store. Proxy Next de imagens é compatibilidade até definição da origem pública do bucket; hoje carrega bytes em memória. Se o definitivo canônico estiver ausente, a imagem retorna 404; erro de acesso/transitório retorna 503.
- Checkout: token opaco é credencial; no-store/noindex/no-referrer. Gate estritamente mock; suporte live no adapter não autoriza removê-lo. Creating recente bloqueia concorrência; abandonado permite retry após15s, mantendo risco de resposta perdida. `external_id` não é unicidade garantida pelo provedor.
- Webhook: streaming <=16KiB, HMAC SHA256 de `timestamp.rawBody`, ±5min/timing-safe, IDs/centavos conferidos server-to-server. Dedupe SHA256(payment_id+':'+event), receipt+estado transacionais; 200 após commit, transitório503. Refund preserva paidAt, sem parcial. Nunca logar body bruto.
- Financeiro: createdAt com dias completos São Paulo UTC−3, mesmo recorte de totais/lista/CSV. Inválidos não consultam; CSV400. UTF-8/BOM/`;`, BRL exato/UTC, allow-list e neutralização de fórmulas; sem cliente/documento/token/QR. Sem paginação/reconciliação em lote.

## Ambiente e comandos básicos

`compose.yaml`: app3000, postgres5432, S3/SeaweedFS9000, pixgo-mock4010, portas em127.0.0.1; sem serviço public-site. S3 não tem console MinIO. App startup roda `npm ci`: aguardar e não instalar concorrentemente no mesmo volume. Dependências e ferramentas somente em containers.

Com ambiente novo provisionado conforme [README](../../README.md), da raiz:

```sh
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm test
```

`dev`/`build` executam somente Next na raiz, incluindo o editor compartilhado; sem etapa esbuild ou cópia de runtime. Alterou schema: `npm run db:generate` em container, revisar SQL/metadados e aplicar `npm run db:migrate` primeiro em DB descartável, validando cadeia completa. `db:push` não substitui migration. Não usar banco principal como teste inofensivo.

Parar preservando dados: `docker compose down`, nunca `down -v`. Não trocar senha PostgreSQL em volume inicializado, limpar bucket ou recriar conta/sessões para tornar teste verde. Mock Node não tem hot reload: reiniciar somente o serviço alterado, preservando dados.

## Build isolado do desenvolvimento

Não usar `.next` do app dev. Build em cópia tmpfs, dependências existentes, fonte read-only, sem rede/`.env*`, valores exclusivamente sintéticos:

```sh
docker run --rm --network none \
  -v "$PWD:/source:ro" --tmpfs /app:rw,size=3g \
  -v namarca_node_modules:/app/node_modules:ro -w /app \
  -e NODE_ENV=production -e NEXT_TELEMETRY_DISABLED=1 \
  -e BETTER_AUTH_URL=https://admin.namarca.test \
  -e PUBLIC_SITE_URL=https://namarca.test \
  -e ADMIN_EMAIL=build@namarca.test \
  -e BETTER_AUTH_SECRET=synthetic-build-only-not-a-production-secret \
  -e DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
  node:24.11.1-bookworm-slim sh -c \
  'node -e '\''const fs=require("node:fs");fs.cpSync("/source","/app",{recursive:true,filter:p=>!p.slice(8).split("/").some(n=>["node_modules",".git",".next","dist","campaign-runtime"].includes(n)||n.startsWith(".env"))})'\''; npm run build'
```

Não usar symlink de deps fora da raiz. Configuração adicional deve ser sintética; não carregar secrets nem liberar rede como atalho. Eventual configuração Vercel usa raiz do repositório; não é autorização de deploy.

## Integrações e isolamento

Provisionar recursos exclusivos sem portas públicas, migrations completas, ambiente sintético e DB/conta vazios; preferir PostgreSQL/S3 tmpfs e redes internas próprias. App teste precisa cópia/`.next` próprios, sem `npm ci` concorrente. Conferir nomes livres e gates antes de importar domínio. Cleanup somente fixtures/chaves exatas e recursos criados na execução, também após falha; não imprimir conexão, setup/TOTP ou documentos.

| Comando no container preparado | Pré-condições e alcance |
|---|---|
| `npm run test:auth` | Obrigatório em auth. Handler real + DB migrado `*_auth_test`, sem conta para ADMIN_EMAIL, credenciais efêmeras. Não é browser/reset CLI/rate limit distribuído. |
| `sh scripts/run-direct-upload-test.sh` | Isolamento descartável com handlers/auth/TOTP/S3/DB reais; sem HTTP Next/browser. |
| `sh scripts/run-publication-db-test.sh` | PostgreSQL/S3 descartáveis, migrations completas, domínio real; sem HTTP/auth/browser. Conferir gates no runner. |
| `npm run test:checkout` | DB exato `namarca_checkout_test`, host postgres, NODE_ENV development, PIXGO_MODE mock, `CHECKOUT_TEST_ISOLATED=1`; app/mock exclusivos, DB sem campanhas/usuários; Chromium. Conferir callback/hosts do runner contra separação atual. |
| `npm run test:webhook` | Gate local/mock/host postgres não exige nome descartável de DB. Isolar DB/app/mock/callback manualmente; não rodar no app principal. |
| `npm run test:e2e -- --output=/tmp/namarca-e2e` | Playwright compatível com lockfile, deps existentes, `E2E_BASE_URL` do host escolhido. Config não provisiona servidor/DB; saída gravável fora da fonte read-only. |

Os cenários manuais antigos do editor foram removidos por não integrarem as suítes atuais. Isso não equivale a homologação HTTP/browser do estúdio; permanece necessária validação autenticada dos fluxos. Capturas opt-in em `/tmp` próprio e só dados sintéticos; nunca setup/QR TOTP/documentos. Sem force-click/dispatchEvent para esconder erro: a ação de exportação precisa estar visível e operável. Browser focal/HTML estático/actions mockadas não equivalem a auth/persistência/submit Next reais. Typecheck, lint, testes, migrations e build são verificações distintas.

`scripts/` conserva apenas operação de contas/ambiente/CORS/MCP e integrações atuais de auth, checkout, webhook, upload e publicação. Dados auxiliares de fixtures ficam em `tests/support/`; procedência das fotos em `public/landing/sharing-real-sources.json`.
