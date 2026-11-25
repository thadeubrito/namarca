# Namarca

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

Uma aplicação Next.js na raiz, sem npm workspaces, serve institucional, campanhas, administrativo e checkout no mesmo deploy. O editor é único e compartilhado com a prévia privada. PostgreSQL guarda a versão publicada; o bucket guarda imagens. A landing é uma página Next/React em `src/app/page.tsx`, com componentes em `src/components/site/` e assets próprios em `public/landing/`. As antigas pastas de estudos `site/` e `experiments/` foram removidas.

O [mapa do código](agents/knowledge/code-map.md) concentra caminhos, roteamento por host, geração dos arquivos públicos e comandos de validação. Instalar dependências somente na raiz, em containers, com o `package-lock.json`.

Documentação do fluxo de materiais, configuração e limites: [uploads](docs/uploads.md).

Deploy na Vercel aplica migrations pendentes automaticamente **somente em produção**, antes do build. Configuração da conexão direta Neon, proteção de concorrência e limites de rollback: [migrations no deploy](docs/deploy-migrations.md).

Primeiro acesso pelo navegador: [provisionamento seguro do administrador](docs/admin-provisioning.md). Configurar `ADMIN_BOOTSTRAP_KEY` no servidor (base64url aleatória, recomendados 256 bits, mínimo 43 caracteres), aplicar migrations e abrir `/login/primeiro-acesso`. A criação não inicia sessão: login normal e TOTP continuam obrigatórios. Nunca enviar chave pela URL nem executar provisionamento no build.

## Começar localmente

Requisitos: Docker com Compose. Não instalar dependências Node no host. Em ambiente **novo**, sem sobrescrever configuração/contas existentes:

```sh
# Secrets locais aleatórios; não sobrescreve arquivo existente.
docker run --rm -v "$PWD:/app" -w /app node:24.11.1-bookworm-slim node scripts/dev-env.mjs
docker compose up -d postgres s3 pixgo-mock
docker compose run --rm app npm run db:migrate
docker compose up --build -d
# Provisionar somente sua conta nova; solicita senha sem exibi-la.
# Com ADMIN_BOOTSTRAP_KEY configurada no servidor, abrir:
# http://admin.localhost:3000/login/primeiro-acesso
```

Admin em http://admin.localhost:3000, público local em http://localhost:3000. Identificador inicial `admin@namarca.test`, configurável antes do provisionamento; sem senha padrão, TOTP obrigatório. PostgreSQL5432, S3/SeaweedFS9000 e mock4010 ligados a localhost. Não apagar volumes para resolver problemas de ambiente.

Operação detalhada e validação: [code-map.md](agents/knowledge/code-map.md). Produção, PixGo real, migração do site antigo e provisionamento exigem pedido específico. Publicação local não equivale a deploy nem homologação comercial.

### Campanha de exemplo da landing

Crie a campanha pelo admin, prepare os materiais e publique explicitamente. O botão “Ver um exemplo” aponta por padrão para `/exemplo`; use esse slug na campanha. `EXAMPLE_CAMPAIGN_SLUG` permite substituir o destino; valor vazio oculta o botão. Não há campanha estática embutida no build; fixtures de teste não são publicações.

O editor também é nativo do Next: página pública `src/app/[slug]/page.tsx` e prévia `CampaignPreview` usam o mesmo `PhotoEditor`, carregado somente no cliente. Não há runtime HTML, iframe ou build esbuild separado. Fotos e composições permanecem no navegador.

Materiais usam um único objeto definitivo imutável no bucket para rascunho e publicação. Publicar grava referências, sem duplicar PNGs. A URL de um material pode ser acessada antes da publicação; o bucket não precisa estar aberto. A entrega não possui fallback para cópias públicas antigas; objetos antigos não foram apagados.
