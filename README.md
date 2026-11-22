# Namarca — monorepo

Administrativo/checkout, campanha pública local, site institucional e editor compartilhado. O público antigo em produção permanece separado. Desenvolvimento com Docker Compose e PixGo mock; nenhum serviço pago é necessário para operar localmente.

## Contexto para agentes

A entrada é [AGENTS.md](AGENTS.md). A base é seletiva, sem diário de implementação:

- [Visão do produto](agents/knowledge/product.md): públicos, proposta, jornada, escopo e princípios.
- [Memória](agents/knowledge/memory.md): decisões, fronteiras, problemas conhecidos e pendências.
- [Mapa do código e validação](agents/knowledge/code-map.md): pontos de entrada, ambiente e testes seguros.
- [Design administrativo](agents/knowledge/design/admin.md) e sua [referência Revolut integral](agents/knowledge/design/revolut.design.md).
- [Design público](agents/knowledge/design/public.md): escopo e contratos preservados; direção visual ainda a definir.

## Especialistas

Instruções portáveis em `agents/roles/`, adaptadores consultivos para Pi em `.pi/agents/`:

| Papel | Quando usar |
|---|---|
| [copywriter](agents/roles/copywriter.md) | Copy comercial, microcopy, mensagens e revisão de linguagem. |
| [product-experience](agents/roles/product-experience.md) | Jornadas, recorte de escopo, ambiguidades e critérios de aceite. |
| [quality-security](agents/roles/quality-security.md) | Revisão independente de código, riscos e evidências. |
| [interface-designer](agents/roles/interface-designer.md) | Composição, interação, acessibilidade e direção visual por escopo. |

No Pi, delegar pelo nome (por exemplo, “use copywriter para revisar os textos desta tela”). A descoberta depende do suporte a agentes locais do cliente; recarregar a sessão se necessário. Em outras ferramentas, pedir para assumir o papel lendo o arquivo correspondente; isso não garante contexto de subagente separado. Não há adaptadores Claude/Codex instalados.

Os adaptadores leem o papel a cada execução e herdam o modelo da sessão. Editar o papel não exige sincronizar cópias. São consultivos e não executam implementação/testes: o agente principal segue responsável por síntese, alterações e validação. Não há workflow automático.

## Organização

- `apps/admin`: Next.js, administrativo, checkout, APIs, Drizzle/migrations.
- `apps/campaign`: runtime público e entrada estática da prévia privada.
- `apps/site`: institucional estático mínimo.
- `packages/editor`: `@namarca/editor`, core/UI/contrato compartilhados.
- `services`: host público independente e simulador PixGo.
- `scripts`, `tests`, `e2e`: operação e validação entre aplicações.

npm workspaces, um `package-lock.json`; instalar na raiz em containers. `npm run build` compila admin e prepara prévia; `npm run build:campaign` gera `apps/campaign/dist`, consumido pelo host público. Contratos técnicos `/events`, `/event-runtime` e `event.json` permanecem.

## Começar localmente

Requisitos: Docker com Compose. Não instalar dependências Node no host. Em ambiente **novo**, sem sobrescrever configuração/contas existentes:

```sh
# Secrets locais aleatórios; não sobrescreve arquivo existente.
docker run --rm -v "$PWD:/app" -w /app node:24.11.1-bookworm-slim node scripts/dev-env.mjs
docker compose up -d postgres s3 pixgo-mock
docker compose run --rm app npm run db:migrate
docker compose up --build -d
# Provisionar somente sua conta nova; solicita senha sem exibi-la.
docker compose exec app npm run admin:create
```

Admin em http://localhost:3000, público local em http://localhost:3001. Identificador inicial `admin@namarca.test`, configurável antes do provisionamento; sem senha padrão, TOTP obrigatório. PostgreSQL5432, S3/SeaweedFS9000 e mock4010 ligados a localhost. Não apagar volumes para resolver problemas de ambiente.

Operação detalhada e validação: [code-map.md](agents/knowledge/code-map.md). Produção, PixGo real, migração do site antigo e provisionamento exigem pedido específico. Publicação local não equivale a deploy nem homologação comercial.
