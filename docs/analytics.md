# Analytics público — PostHog

Integração explícita e desativada por padrão. Não usa SDK, autocapture, session replay, cookies, armazenamento persistente, identificação de usuários nem perfis de pessoas. Administrativo, prévia, autenticação e checkout não são instrumentados.

## Ativação (não realizada)

Definir no ambiente de build Next, somente após aprovar consentimento/base legal, aviso de privacidade, retenção e configuração do projeto PostHog:

```dotenv
NEXT_PUBLIC_POSTHOG_ENABLED=false
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_POSTHOG_PUBLIC_ORIGIN=https://namarca.vercel.app
```

- `ENABLED` deve ser exatamente `true` para emitir; manter `false` enquanto a definição de privacidade estiver pendente. Há aviso informativo em `/legal/privacidade`, com links no rodapé institucional e na ajuda pública do editor (nova aba para preservar composição). O texto descreve a coleta desativada e deve ser atualizado antes de habilitar. Não há banner nem mecanismo de consentimento implementado. Se a decisão exigir consentimento individual, implementar esse gate antes de ativar; a variável não substitui consentimento.
- A chave é a **Project API key pública**, nunca chave pessoal, de administração ou acesso ao MCP.
- Hosts permitidos: `https://eu.i.posthog.com` e `https://us.i.posthog.com`; usar a região do projeto, sem barra final. Não há suporte a hosts arbitrários/self-hosted nesta etapa.
- Origem pública deve ser exata, sem caminho/barra final, distinta do administrativo. As variáveis `NEXT_PUBLIC_*` ficam embutidas no bundle: mudar exige novo build.
- Desenvolvimento/testes não exigem serviço externo. Não configurar coleta real nos testes.
- Do Not Track (`1`) e Global Privacy Control desabilitam o envio.

## Eventos e semântica

| Evento | Momento |
|---|---|
| `landing_viewed` | Montagem do institucional |
| `example_clicked` | Clique explícito em “Ver um exemplo” |
| `contact_clicked` | Clique explícito nos CTAs de WhatsApp, sem destino ou contato no payload |
| `campaign_opened` | Manifesto carregado e prazo ainda aberto |
| `editor_started` | Primeira foto lida com sucesso, sticker adicionado ou gesto sobre composição editável |
| `photo_selected` | Foto lida localmente com sucesso; não é upload |
| `export_generated` | Arquivo PNG gerado; não comprova salvamento nem postagem |
| `export_failed` | Falha na geração do PNG; não inclui cancelamento do compartilhamento |
| `campaign_load_failed` | Falha técnica ao carregar manifesto, excluindo inexistência/suspensão |
| `artwork_load_failed` | Falha no carregamento inicial ou troca pública de arte |
| `sticker_load_failed` | Falha ao adicionar sticker |

Eventos de campanha carregam somente `campaign_slug`; eventos institucionais não. Não há ID interno nem versão publicada: o contrato atual do editor não os expõe. Não enviar nome/contato, foto, composição, nome de arquivo, erro bruto, token, URL, query string ou referrer.

O transporte usa `POST /capture/` diretamente para o PostHog, sem credenciais e sem referrer, com propriedades allow-listed e `$process_person_profile: false`/`$geoip_disable: true`. O provedor ainda recebe o IP da conexão e cabeçalhos normais do navegador: desabilitar GeoIP não anonimiza a rede nem elimina obrigações de privacidade. Revisar retenção e enriquecimento no projeto antes de ativar.

## Limites de interpretação e operação

- ID aleatório apenas em memória, compartilhado pelos eventos da mesma página. Recarregar gera outro ID; não representa pessoa única nem atribuição persistente entre landing e campanha.
- Não há garantia de entrega, fila, retry ou persistência; bloqueadores, navegação e rede podem perder eventos. Falhas são silenciosas e não bloqueiam o produto.
- Strict Mode de desenvolvimento e remontagens podem duplicar aberturas. Não usar contagem como relatório contratual/financeiro.
- `export_generated` é emitido na geração de arquivo, não em cada tentativa de reutilizar um arquivo já gerado. No compartilhamento nativo, emissão ocorre após a chamada de share para preservar ativação do Safari; cancelamento ainda pode ter um arquivo gerado.
- Não há dashboard/funil provisionado, ativação em produção, validação de ingestão real ou publicação de campanhas incluídos nesta implementação.
- Antes de ativar, homologar no navegador com projeto apropriado: payloads, CORS, bloqueios de privacidade, CTA e exportação real, verificando ausência de requisições em prévia/admin/auth/checkout. Testes locais com transporte simulado não comprovam ingestão PostHog.
