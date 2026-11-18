# Namarca — continuidade de implementação da V1

> Documento de passagem de contexto para novas sessões de IA. Atualizado em 18/11/2026 ao final da sessão inicial. Descreve decisões do fundador, implementação existente, pendências e evidências; NÃO constitui aceite comercial ou declaração de prontidão de produção. O código e os serviços podem ter mudado depois: conferir antes de agir.

## Entrega — aprovação visual versionada (18/11/2026)

Checkout e UX anterior commitados com autorização: `d93edc0`. Continuação: `campaign_packages` preserva configuração visual validada, revisão, responsável/canal/dia da aprovação externa e administrador registrador. Formulário exige autorização de uso. Migration `0007_nervous_korath.sql` aditiva revisada/aplicada local. Não reintroduz contratação nem contas de cliente.

Pacote tem ao menos uma arte, encerramento futuro, ownership/dimensões/referências válidas e PNGs privados presentes/revalidados. Lock de campanha/editor e comparação de revisão/identidade rejeitam aba desatualizada. Rascunho permanece editável e draft; edição não muda snapshot e não herda aprovação. Comparação canônica trata reordenação de chaves JSONB, preservando ordem de arrays. Prévia histórica autenticada `/admin/campanhas/[id]/pacotes/[packageId]` usa snapshot, sem aceitar bridge do estúdio. Nenhuma publicação/pagamento real. Sem revogação ou armazenamento WORM; limpeza futura precisa preservar assets de todos os snapshots. Ver `docs/campaign-packages.md`.

Validação inicial: 37 testes, typecheck/lint, migrations/build aprovados. Revisão estática identificou filtro S3 case-sensitive em IDs de materiais; corrigido por normalização e checagem de cardinalidade. Primeiro submit browser revelou metadados React $ACTION_* rejeitados pelo schema strict; corrigido por seleção explícita dos campos de domínio. Runner isolado aprovado integralmente em Chromium: senha/TOTP descartáveis, regressão editor/export local e clientes, aprovação v1, duplicata rejeitada, edição preserva v1, aba com revisão obsoleta rejeitada, aprovação explícita v2, preview v1 fixa com foto sintética e mensagem bridge v2 ignorada, acesso anônimo bloqueado, draft/unpublished sem tarefas. Cleanup confirmou ausência de contas/campanhas/assets/pacotes no DB descartável; app/DB/volume isolados removidos. Timeouts intermitentes no trecho preexistente de referência/salvamento do editor e ajustes de sincronização do runner ocorreram antes do PASS final; não declarar estabilidade irrestrita. Não valida materiais reais/422, carga, mobile físico ou produção.

## Ajuste vigente — experiência de pagamento sem rótulos técnicos (18/11/2026)

Fundador pediu telas como no fluxo real, sem indicar simulador a cada etapa. Checkout/admin agora usam linguagem de cobrança/Pix/confirmado/reembolsado, resumo do valor, instruções de QR e copia/cola, aviso/ciência DePix e suporte para estados incertos. Removidos textos mock/simulador dos botões e mensagens da UI. Infra permanece mock local, guard inalterado, QR continua fake sem valor. Não habilitar PixGo real nem gerar BR Code bancário pagável para tornar demonstração realista. Desenvolvimento usa CPF sintético; não enviar dado real ao mock. Aviso/checkbox DePix não equivale a termos jurídicos versionados definitivos. Validação desta revisão: 30 testes, typecheck/lint, migrations e build aprovados. Runner isolado passou novamente com submit anônimo real em Chromium a 390px, QR/pending e confirmação; asserts sem overflow horizontal em 390/1440px nos estados formulário/pendente/pago. Screenshots sintéticas sem CPF preenchido observadas, sem cortes de conteúdo. App/mock/DB/rede descartáveis encerrados. UI administrativa/clipboard/celular físico e todos os estados de erro não foram exercitados por browser nesta revisão.

## Entrega — checkout exclusivamente mock (18/11/2026)

Autorizado pelo fundador continuar com a fatia de cobrança mock. Implementados emissão/reutilização de link opaco por campanha, snapshot de nome/valor, checkout sem conta com CPF sintético e QR/código sem valor, persistência prévia de tentativas, bloqueio de resultado incerto, recuperação via listagem exclusiva do mock e consulta manual de pagamentos. Callback antecipado pode registrar tentativa conhecida após consulta de IDs/valor. Pagamento não aprova nem publica. Guard exige modo mock e host pixgo-mock; não habilitar live removendo guard.

Migration `0006_careful_bruce_banner.sql` revisada/aplicada sem remover dados. Detalhes e limites em `docs/checkout.md`. Não há reemissão para novo valor/revogação do link, CNPJ, termos jurídicos finais, reconciliação pública automática nem homologação real. O link congela nome/valor na primeira emissão e é reutilizado mesmo após editar campanha. Nova tentativa só após confirmação expired/cancelled; criação incerta sem resultado único permanece bloqueada (não assumir que falhou). Nenhuma mudança de auth, publicação ou investigação do 422.

Validação: 30 testes unitários/contratos, typecheck, lint, migrations, build e regressão webhook mock aprovados. `scripts/test-checkout.ts` passou duas vezes em banco/rede/app/mock isolados: snapshot e emissão concorrente, seis gerações simultâneas com uma cobrança, recuperação unknown idempotente e divergência rejeitada, consulta pending/paid/refunded preservando paidAt, callback anterior ao registro e resposta atrasada sem regressão. Chromium anônimo realizou submit real com CPF sintético/consentimento, viu QR, reload sem nova geração e confirmação após callback. Campanhas draft/unpublished sem publication tasks. Corrida reproduzida deterministicamente, não por timing aleatório. UI administrativa dos novos botões não foi validada por browser; guards presentes no servidor. Revisão estática independente sem achados no escopo mock não constitui auditoria/aceite de produção.

Fixtures isoladas limpas/verificadas; app/mock/DB/rede descartáveis encerrados. Conta/sessões reais não alteradas. Teste webhook removeu somente próprias fixtures; mock principal preserva pagamento sintético por não ter DELETE. Um build iniciado brevemente por engano no app dev foi interrompido; build final aprovado em volume separado e login principal voltou HTTP200. Upload 422 não investigado. Próximo escopo sugerido: aprovação visual versionada antes de publicação; checkout live e políticas de reemissão ainda exigem decisão/homologação.

## Decisão vigente — cliente leve reutilizável (18/11/2026)

Após simplificar contratação, o fundador aprovou **cliente separado e vinculado à campanha**, sem reintroduzir contrato. Cliente só tem nome obrigatório e contato opcional. No formulário de campanha: selecionar existente, cadastrar novo inline ou deixar sem vínculo. Não exige sair da tela. Cliente não tem login/conta/CPF/CNPJ/endereço. Não há tela separada para editar/excluir clientes nesta fatia.

`clients` + FK opcional `campaigns.clientId`, migration `0005_sloppy_silk_fever.sql` gerada/revisada/aplicada no local. Migra organizer/contact antigos para clientes, agrupando apenas pares exatos após trim. Contato sem nome ganha marcador explícito para revisão. Campos legados e registros comerciais anteriores preservados. Valor, prazo e notes continuam na campanha. Não consultar contratos legados para cobrança.

`resolveCampaignClient` valida cliente existente ou insere novo dentro da mesma transação de criação/edição. requireAdmin nas actions. Cliente novo só persiste ao salvar campanha; desvincular não apaga cliente. Form recebe opções consultadas após guard administrativo. Não reintroduzir responsabilidades/termos/versionamento comercial.

Validação: 28 testes, typecheck, lint, migrations e build aprovados. Chromium com login/TOTP em DB isolado: criar sem cliente, cadastro inline e reload, segunda campanha reutiliza mesmo ID, desvincular primeira preserva cliente; regressão do editor/export. Primeira execução teve timeout no trecho referência do editor; repetição passou completa. Dados reais preservados e ambiente isolado encerrado. 422 real segue sem investigação. Próximo escopo possível: checkout mock com valor congelado; manutenção leve de clientes se necessária.

## Histórico — simplificação inicial dos dados comerciais (18/11/2026)

**Esta decisão substitui a entrega de contratação descrita abaixo e as recomendações antigas do backlog B.** O fundador achou o preenchimento massante e o valor duplicado desnecessário. Aprovou retirar entidade/fluxo ativo de contratação e aprovação comercial.

Agora existe apenas o formulário da campanha: nome/slug/encerramento, **Valor da campanha** único e três campos opcionais: **Organizador/cliente**, **Contato** (e-mail ou WhatsApp em um texto), **Observações do combinado**. Não exigir responsabilidades, revisões, cancelamento, período comercial nem condições de liberação em campos separados. Não reintroduzir contratos, versões comerciais ou CRM sem novo pedido.

UI `CampaignContract`, actions comerciais e validações/testes exclusivos foram removidos. Schema mantém tabelas antigas somente por preservação de dados. Migration `0004_broken_shaman.sql` adiciona organizer/contact/notes e migra organização/contato da versão legada mais recente, sem alterar valor da campanha, termos antigos ou aprovações. Termos antigos continuam no banco sem UI. Não interpretar dados legados como pré-condição para cobrança.

Criação e edição salvam opcionais via campaignInput/requireAdmin. Única fonte de valor editável é campaigns.priceCents. Payments já têm valor próprio; futuras cobranças devem congelar valor na emissão, não seguir alterações posteriores da campanha. Checkout ainda não implementado. Aprovação visual de pacote continua pendente e não é aprovação comercial.

Validação desta simplificação: 28 testes aprovados, typecheck/lint/migrations/build. Chromium isolado: criação sem contato, um campo de preço, ausência da seção Contratação, salvar/recarregar/limpar opcionais; regressão de estúdio e exportação local. Primeira execução com timeout no trecho referência/salvamento do editor; repetição passou integralmente. Não afirmar ausência de flakiness. Conta/sessões reais preservadas; ambiente descartável encerrado. Upload 422 real segue não investigado. Próxima entrega sugerida: emissão de cobrança mock com valor congelado, sem entidade contratação intermediária.

## Histórico — entrega de cliente/contratação, depois substituída (18/11/2026)

Implementada uma fatia de B, **não toda a etapa**: seção Contratação nos detalhes da campanha, organização/contato por snapshot, resumo/responsabilidades/revisões/cancelamento/condições livres, valor e período versionados. Aprovação comercial externa com responsável/canal/data, administrador registrador e histórico. Nova versão não herda aprovação. Não há conta de cliente, tabela de preços ou condição de pagamento imposta.

Arquivos: `src/lib/contract-input.ts`, `src/components/campaign-contract.tsx`, `src/app/admin/campanhas/[id]/contract-actions.ts`; schema e migration `0003_yellow_agent_zero.sql` gerada/revisada/aplicada no local. Documentação: `docs/contracts.md`.

Segurança: requireAdmin em cada action, lock da campanha, comparação de versão esperada, aprovação só da versão atual e ainda não aprovada. Sem alterações de auth. Histórico preservado por inserts nas actions (não WORM). Contato pode conter dados pessoais; não logar nem incluir em manifesto público.

**Limite importante:** é aprovação comercial, NÃO aprovação do pacote/editor. Não muda preparationStatus, não congela artes, não publica e não gera cobrança. Valor indicativo da campanha foi renomeado na UI e não altera contratos; período comercial não altera encerramento público. Futuro checkout deve vincular explicitamente a versão comercial; snapshot aprovado das artes continua pendente em D.

Validação: 30 testes unitários/contratos, lint, typecheck, migration e build aprovados. Integração Chromium em DB descartável: login/TOTP, regressão upload sintético/save/reload/foto local/export sem mutações; contratação pela UI, aprovação v1, v2 sem aprovação, rejeição de aba desatualizada e SQL comprovando valores/aprovação históricos, campanha draft/unpublished. O runner precisou nome acessível explícito no select de canal, corrigido na UI. Houve uma execução com timeout na referência do editor que não se repetiu nas seguintes; não declarar estabilidade irrestrita. O 422 dos materiais reais continua sem investigação.

Pendências B: aprovação do pacote visual versionado (separada), histórico de outras ações, condição comercial padrão/oferta definitivas e eventual UX de revogação/cancelamento. Próxima fatia pode ser cobrança mock versionada ou aprovação do pacote antes de publicação, conforme decisão do fundador.

## 1. Pedido e objetivo do fundador

Transformar a Namarca de operação técnica/manual em um produto vendável com contratação e entrega automatizadas. **Foco exclusivo atual: V1 operada pelo administrador.** Somente ele cadastra/prepara campanhas e envia cobrança. Cliente paga sem conta. Participante usa o editor sem cadastro. Na V2, futuramente, cada cliente poderá ter conta e preparar suas próprias campanhas; NÃO antecipar essa complexidade.

Jornada alvo da V1:

**Administrador cadastra cliente/campanha → prepara materiais → registra aprovação → envia checkout → cliente paga → sistema confirma → libera versão aprovada → organizador divulga link/QR → participante compõe/exporta → ativação encerra → administrador entrega relatório.**

O fundador espera um administrativo realmente operacional, não apenas scaffold. Durante a sessão encontrou telas sem ação e cobrou a migração do editor completo. Ser explícito sobre o que existe, implementar jornadas verticais e não chamar integração parcial de produto terminado.

### Posicionamento obrigatório

Namarca é uma **ativação digital para antes, durante e depois de eventos**, principalmente pré-evento por orientação do fundador, não uma predominância comprovada por métricas. Público usa sua foto com identidade oficial e stickers para expectativa, anúncio de participação, compartilhamento do momento e celebração da experiência. Não descrever como lembrança, recordação ou souvenir. Corridas são foco inicial, não limite do produto. Não prometer alcance, inscrições ou publicação social.

Organizador contrata; participante usa gratuitamente. Cobrança por evento/campanha é a direção atual, não assinatura mensal nem cobrança por exportação. Valor negociável pelo administrador; tabela definitiva ainda precisa ser reconciliada.

## 2. Diretórios e limites de atuação

- **Projeto novo, onde implementar:** `/Users/thadeubrito/workspace/namarca`.
- **Projeto original, fonte de referência:** `/Users/thadeubrito/workspace/personal/namarca`.
- Não alterar o original sem pedido específico. Ele tem alterações não commitadas de outras tarefas; não limpar/resetar/copiar por cima.
- Original contém `AGENTS.md`, `docs/mvp.md`, `docs/roadmap.md`, `docs/backlog.md`, `docs/commercial/` e o estúdio local em `web/backoffice/`.
- Repositório Git local inicializado por pedido do fundador após a entrega de clientes leves. Primeiro commit reúne a base existente e as entregas até essa etapa. Nenhum remoto configurado, push ou deploy realizado.
- Nunca ler/imprimir `.env.local`, secrets, senhas, URI TOTP, códigos de recuperação ou CPF em respostas/logs. Pode alterar configuração por script sem imprimir valores.

## 3. Decisões técnicas aprovadas — não reabrir sem motivo

| Área | Decisão |
|---|---|
| Administrativo/checkout | Next.js + TypeScript; produção pretendida na Vercel |
| Autenticação | **Biblioteca open source Better Auth**, não SaaS |
| Login | E-mail + senha **mínimo 8, máximo 128 caracteres** + TOTP obrigatório |
| Contas | Admin provisionado por comando; sem signup público; sem Google/OAuth externo; sem serviço de e-mail obrigatório |
| Recuperação | Backup codes de uso único + comando operacional de reset com revogação de sessões |
| Banco | PostgreSQL + Drizzle, gerenciado em produção (Neon como escolha inicial) |
| Materiais | Cloudflare R2; desenvolvimento com API S3 privada local |
| Pagamentos | **PixGo**, escolha expressamente confirmada pelo fundador, mesmo conhecendo DePix |
| Tarefas | **SEM Inngest, SEM worker e SEM cron**. Usuário questionou e mandou remover. Webhook processa situação financeira síncrona. Reconciliação sob demanda no painel é pendência |
| Desenvolvimento | Docker Compose; sem dependências instaladas no host ou SaaS necessário para rodar |
| Coolify | Possível migração futura de app/banco; NÃO é a hospedagem atual aprovada |
| Editor público anterior | Continua no projeto/hospedagem original; não houve migração de produção. Seu core foi copiado para a prévia privada do novo app |

Versões exatas estão em `package.json`/`package-lock.json`. Base instalada: Next16.4.6, React19, BetterAuth1.7.25, Node24, Drizzle, pg, Zod, AWS S3 SDK, Konva/react-konva, motion, Tabler, pngjs. Não atualizar tudo indiscriminadamente.

## 4. Estado real implementado

### 4.1 Autenticação

Arquivos:
- `src/lib/auth.ts`, `auth-client.ts`, `admin.ts`.
- `src/db/auth-schema.ts`.
- `src/app/api/auth/[...all]/route.ts`.
- `src/components/auth-panel.tsx`, `sign-out.tsx`.
- `src/app/login/`, `/login/verificar`, `/seguranca`.
- `scripts/create-admin.ts`, `reset-admin.ts`, `test-auth.ts`.

Better Auth email/password, TOTP, backup codes. `ADMIN_EMAIL` define email permitido. Guards consultam estado no DB, sem cookie cache; sessão administrativa exige email correto + `user.twoFactorEnabled` + campo próprio `session.twoFactorVerified`. Hook concede essa prova após TOTP OU backup code válido. Better Auth plugin não oferece sozinho esse campo; não remover o controle.

`requireAdmin()` em CADA operação server-side privilegiada; layout sozinho não basta. `getEnrollmentSession` serve somente enrollment, não operações de domínio. Signup, desativação TOTP, remembered device e remoção de conta bloqueados. Recovery code válido pode abrir sessão, reutilização falha. Reset operacional revoga sessões e requer novo enrollment; revisar script antes de executar pois é sensível.

**Login local informado ao usuário: `admin@namarca.test`**, salvo se alterou ADMIN_EMAIL. Nenhuma senha padrão. Usuário criou/tentou criar conta e pode já ter configurado TOTP: NÃO recriar nem apagar conta/sessões existentes para testes.

### 4.2 Campanhas

- `/admin`: listagem, contadores e link no nome da campanha.
- `/admin/campanhas/nova`: cria rascunho e redireciona aos detalhes.
- `/admin/campanhas/[id]`: estúdio, dados base editáveis e cobranças existentes.
- Campos: name, slug único, endsAt, priceCents opcional; data de encerramento do form básico é 23h59 em São Paulo.
- Edição básica somente draft/unpublished; action transacional com lock.
- Não há organização/contato/contratação completos nem histórico de ações de negócio.

### 4.3 Estúdio da campanha — migrado após cobrança do usuário

- `src/components/campaign-editor.tsx` e `.css`.
- `src/editor/reference-canvas.tsx`: desenho/movimento/redimensionamento por alças e campos numéricos.
- `src/editor/shared/events/events.ts`: modelo/parse derivados do original.
- `src/editor/shared/editor/*`: core real de composição, framing, gestures, histórico, Konva, exportação.
- `src/editor/shared/analytics.ts`: no-op, SEM telemetria na prévia.
- `src/components/campaign-preview.tsx`.
- `/admin/campanhas/[id]/previa`: iframe privado/autenticado com editor real, sem chrome administrativo.

Funciona: upload arte/sticker, nomes, remoção da galeria, ordenação, seleção, referência retangular visual/numérica, oito cores do tema + cor da campanha, salvar/recarregar, revisão otimista, aviso dirty em unload e links. Prévia recebe configuração via postMessage com conferência de origem/janela/campanha e validação do manifesto. Foto, composição e exportação permanecem no navegador. Não recebe foto pelo bridge.

Upload NÃO salva automaticamente a configuração; UI adiciona ao rascunho, depois botão **Salvar configuração**. Remover material da galeria NÃO apaga o objeto S3. Arquivos não associados e órfãos podem permanecer privados; política de limpeza é futura.

**Não confundir prévia privada com publicação pública.** Não implementada publicação/ativação nem migração do domínio público original.

### 4.4 Backend de materiais

- `src/lib/campaign-editor.ts`.
- `GET /api/campaigns/:id/editor` → `{event, revision}`; default vazio revisão0.
- `PUT /api/campaigns/:id/editor` body `{event, revision}` → revisão+1; 409 concorrência. Nome/slug/endsAt são sempre derivados de campaigns.
- `POST /api/campaigns/:id/assets?kind=artwork|sticker`: PNG raw, Content-Type image/png, X-Asset-Name encodeURIComponent(nome) →201 `{material,url}`. Não modifica manifesto automaticamente.
- `GET /api/campaigns/:id/assets/:assetId`: PNG autenticado, vínculo à campanha, no-store.
- Todas exigem admin; mutações verificam Origin e estado draft/unpublished.
- DB campaign_editor JSONB/revision e campaign_assets metadados/ownership.
- Objetos `private/campaigns/<campaignUUID>/assets/<assetUUID>.png`.
- IDs/arquivos pertencentes à campanha, dimensões reais, tipos e referências validados. Sem chave arbitrária do cliente, sem bucket público.

### 4.5 Requisitos atuais dos materiais

PNG apenas, artes e stickers. Servidor exige pixels alpha0 e alpha255, CRC e dimensões válidas; até25MiB e40milhões de pixels. Sem quantidade comercial/técnica arbitrária de artes/stickers; tamanho do body ainda limita configurações. Referência é retângulo real ocupado pela foto, independente do formato do alpha.

Artes definem proporção/resolução exportada (exemplos recomendados1080x1920/1350/1080, não obrigatórios). Stickers sem dimensão fixa; aconselhamento512–1024px não é validação do sistema.

**Pendência conhecida, prioridade alta:** usuário reportou upload retornando **422** ao escolher arquivo. Ele explicitamente disse que **não quer investigar a causa nesta etapa**, pediu primeiro listar o restante e depois salvar este contexto. Não afirmar que sabe qual arquivo/regra causou erro, não chamar upload estabilizado. Futuro diagnóstico deve reproduzir com material autorizado, melhorar erro UI e preservar privacidade. Não relaxar requisito sem decisão consciente.

**Vercel:** limite25MiB local NÃO funciona pelo proxy de upload na Vercel (~4,5MB por requisição, verificar plano/documentação vigente). Implementar upload direto assinado R2 e validação/finalização no servidor antes de prometer suporte em produção. Ainda não existe esse fluxo.

### 4.6 Pagamentos implementados parcialmente

- `src/lib/pixgo.ts`: adapter createPayment/getPayment, HMAC, schemas, status e centavos.
- `src/app/api/webhooks/pixgo/route.ts`.
- Webhook valida rawbody/timestamp/HMAC/schema, encontra cobrança já registrada, consulta gateway, confere IDs/valor, lock + transação atualiza status e receipt, retorna200. Duplicata não reaplica efeitos.
- Sem trabalho background; erro temporário503. Política real de retries da PixGo não foi comprovada.
- Sem recuperação automática de notificação perdida; botão de consulta/reconciliação manual AINDA NÃO existe.
- Adapter existe, mas NÃO existe ação de criação pelo painel, checkout, link de pagamento do cliente ou envio de cobrança.
- Nenhum dinheiro real movimentado; PixGo real não foi homologada nesta sessão.

### 4.7 Schema e migrations

`src/db/schema.ts`, `auth-schema.ts`, `src/db/index.ts`, `drizzle.config.ts`.

Tabelas: campaigns, payments, webhookReceipts, publicationTasks (legada inativa), campaignEditor, campaignAssets e auth_user/auth_session/auth_account/auth_two_factor/auth_verification.

- preparationStatus: draft/validated/approved.
- publicationStatus: unpublished/pending/published/failed/ended.
- paymentStatus: pending/paid/expired/cancelled/refunded.
- paidAt preservado historicamente em refund. Não tratar paid como published.
- webhookReceipts eventId unique e dispatchedAt (nome legado: processamento síncrono). Colunas attempts/nextAttemptAt ficaram por compatibilidade, sem consumidor.
- publicationTasks ficou sem uso para não apagar registros existentes. NÃO reintroduzir worker porque encontrou a tabela.

Migrations versionadas/aplicadas no local:
- `drizzle/0000_eager_naoko.sql`.
- `0001_plain_pride.sql` (refunded e campos retry legados).
- `0002_chief_doctor_strange.sql` (estúdio/assets).

## 5. Correções e incidentes importantes desta sessão

1. **Senha mínima14 →8** por pedido explícito. Manter coerência BetterAuth + create/reset + testes/docs. Erros de entrada do CLI agora explicam tamanho/confirm sem imprimir valor.
2. **Credenciais na URL:** auth form sem method fazia GET quando JS não hidratava. Corrigido methodPOST + fallback `/api/auth/form-unavailable` que não lê/loga body + submit bloqueado até hidratação. Não regredir. Senha usada naquela URL foi recomendada trocar; não confirmar que usuário trocou.
3. **Hydration/HMR:** bloqueio dev-origin deixou formulário inerte. Next dev agora usa `--webpack`; `allowedDevOrigins` localhost/127.0.0.1/app/namarca-editor-test. Auth trustedOrigins produção só baseURL; desenvolvimento aceita localhost3000 e1273000 além baseURL. Não usar wildcard nem desativar CSRF.
4. **INVALID_ORIGIN:** corrigido localhost vs127 no BetterAuth; origin externa rejeitada com403 nos testes. Acesso por IP da LAN/outra porta não está aprovado automaticamente.
5. **Campanha não clicava:** link e detalhes/edição foram adicionados; criar agora abre detalhes.
6. **Inngest/worker removidos:** decisão repetida do usuário. Não ressuscitar arquitetura.
7. **Mock bloqueava callback:** fila aguardava webhook e impedia consulta de status feita pelo app. Corrigido liberar fila após persistência antes de entregar callback; execução continua rastreada pela requisição. Teste webhook ponta a ponta passou sem replay manual.
8. **Teste exportação inicialmente falhou:** causa era scroll do Playwright em iframe sticky, botão fora viewport externo; corrigido runner para clique real com viewport correto. Core export não alterado para mascarar falha.

## 6. PixGo — condições conhecidas e contrato

Usuário decidiu usar PixGo mesmo. Fontes consultadas: https://pixgo.org/api/v1/docs, /faq, /termos, /checkout-pix. Revalidar documentação antes de live.

- Cliente paga Pix; recebimento é **DePix em carteira Liquid D+1**, não BRL em conta bancária.
- Termos cláusula1.5 exigem avisar cliente da natureza da conversão/compra de stablecoins; integrar aviso e validar jurídico/contábil.
- Aprovação API pode exigir KYB/validação; carteira precisa validação.
- MínimoR$10; limite inicial citadoR$300/QR, progressão atéR$6000; validar limite real da conta. Não dividir artificiosamente cobranças para contornar regra.
- CPF/CNPJ de quem paga é vinculado ao Pix; terceiros podem ter pagamento recusado. Adapter atual aceita CPF válido, NÃO CNPJ; suporte empresa/CNPJ é pendência de checkout.
- Sem sandbox oficial separado. Mock local não representa homologação; transação real exige autorização e valor controlado.
- Taxas publicadas:2% >=R$50;2%+R$1 abaixo;R$0,50 por envio carteira; revalidar sem hardcodear promessa comercial.

Contrato adapter:
- X-API-Key (NÃO Bearer).
- POST baseURL `/payment/create`, JSON amount numérico decimal, receiver_cpf, external_id, webhook_url.
- GET `/payment/{id}/status`; envelope success/data payment_id/external_id/amount/status.
- external_id NÃO é único no provedor; não retry automático create após timeout. Consultar/buscar cobrança e reconciliar antes de nova tentativa. Corrida callback antes de gravar paymentId precisa ser modelada.
- completed→paid, refunded explícito. IDs e valor comparados com DB. Inteiros em centavos para domínio.
- HMAC SHA256 de timestamp + '.' + raw body; headers X-Webhook-Timestamp e X-Webhook-Signature, timing-safe, janela5min, limite body16KiB.
- Sem deliveryID oficial: dedupe SHA256(payment_id+':'+event). Sem refunds parciais modelados.
- Mode mock padrão; live requer configuração/autorização explícita, HTTPS. Nunca fallback para gateway real.

## 7. Ambiente local e comandos

Diretório raiz novo. Docker/Compose no host; ferramentas JS somente containers.

```sh
cd /Users/thadeubrito/workspace/namarca
# Somente em ambiente novo; não sobrescreve .env.local existente.
docker run --rm -v "$PWD:/app" -w /app node:24.11.1-bookworm-slim node scripts/dev-env.mjs
docker compose up -d postgres s3 pixgo-mock
docker compose run --rm app npm run db:migrate
docker compose up --build -d
```

- app http://localhost:3000.
- PostgreSQL localhost5432, serviço interno postgres.
- SeaweedFS S3 localhost9000, serviço s3, bucket privado namarca-local; não existe console MinIO.
- PixGo mock localhost4010, serviço pixgo-mock; sem UI bancária/valor real.
- Somente4 serviços: app/postgres/s3/pixgo-mock. Sem8288/Inngest/worker.
- Portas apenas127.0.0.1. Dados volumes persistentes.
- `npm ci --no-audit --no-fund` no startup pode levar tempo; NÃO rodar testes enquanto node_modules está sendo reinstalado (binários temporariamente faltam). Não iniciar dois npm ci concorrentes sobre mesmo volume.
- node_modules e.next em volumes; build deve usar.next separado para não quebrar dev. AllowedDevOrigins não é a mesma coisa que trustedOrigins de auth.

```sh
docker compose exec app npm run admin:create
# Só sob pedido de reset: revoga acesso existente.
docker compose exec app npm run admin:reset

docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm test
docker compose exec app npm run db:generate
docker compose exec app npm run db:migrate
docker compose exec app npm run test:webhook

docker run --rm --network namarca_default -e E2E_BASE_URL=http://app:3000 \
  -v "$PWD:/app" -v namarca_node_modules:/app/node_modules -w /app \
  mcr.microsoft.com/playwright:v1.56.1-noble npm run test:e2e

# Build sem perturbar dev, com URL HTTPS fictícia, sem credenciais reais.
docker compose run --rm --no-deps -e NODE_ENV=production \
  -e BETTER_AUTH_URL=https://app.namarca.test \
  -v namarca_build_next:/app/.next app npm run build
```

Não usar down-v, limpar bucket amplo, deletar dados/sessões ou reconfigurar senha do PostgreSQL com volume existente. `docker compose down` para serviços preservando volumes.

## 8. Evidências e testes (não generalizar)

Última validação após integrar estúdio:
- 27 testes unitários/contratos passaram.
- Lint e typecheck passaram.
- Build otimizado Next passou.
- 6 testes E2E públicos passaram (inclui submitPOST, sem credencial naURL e sem JS failclosed).
- `scripts/test-auth.ts`: handler real BetterAuth + DB descartável terminado_auth_test; enrollment, login, proof guard, backupcode usoúnico, flags proibidas, revogação. Sem conta real alterada.
- `scripts/test-webhook.ts`: mock→callbackNext→consultaMock→DB paid/refunded, duplicatas, divergência/assinatura inválida; sem worker. Fixtures DB limpas; mock mantém pagamentos sintéticos por não terDELETE.
- `scripts/test-campaign-editor.ts`: app namarca-editor-test + DB namarca_editor_test separados, senha/TOTP reais, UI create/upload/save/reload, reference, acesso sem auth, CSRF, kind inválido, revisão409. Prévia foto local+sticker, PNG real400x400 pixels conferidos; zeroPOST/PUT/PATCH durante composição/export; campanha draft/unpublished.

Runner editor exigiu viewport externo maior para iframe e clique real; NÃO usar force/synthetic click para esconder regressão.

**Não comprovado:** arquivos reais do usuário (há422 reportado), compatibilidade completa mobile, publicação/checkout real, integração financeira live, carga, auditoria de segurança. Não chamar tudo pronto por passar fixture sintética.

Infra isolada editor foi encerrada: container/banco/volume descartáveis removidos. Alguns objetos privados órfãos de execução interrompida podem permanecer no S3 local; não limpar todo bucket. Preservadas conta/sessões e campanhas reais locais.

Testes auth/editor não usam banco principal: consultar instruções de `docs/auth.md` e `docs/editor-testing.md`. Nunca criar admin fictício na base real para testar. Teste auth tem nome de DB guardado; editor runner exige email/origin próprios.

## 9. O que falta para concluir — backlog executável

### A. Estúdio estável e UX (primeira prioridade)
- [ ] Reproduzir422 de upload com arquivos do usuário quando ele autorizar retomar investigação.
- [ ] Mensagens úteis de upload: retornar/exibir validação real segura em vez de erro genérico.
- [ ] Testar artes reais/proporções variadas, PNGs de ferramentas comuns, limites e alpha; decidir se política alpha0/255 atual é adequada sem mudar silenciosamente.
- [ ] Testar desenho/mover/resize referência e gestos de composição em celular real.
- [ ] Garantir aviso dirty cobre troca de dados base e navegação; evitar perda de edição.
- [ ] Validar troca/remoção/ordenação múltiplas artes e stickers, salvar/recarregar e preview.
- [ ] Preparar upload direto assinado aoR2 para Vercel, com vínculo/limites/finalização servidor e rejeição de objetos inválidos; não expor secrets.
- [ ] Definir limpeza de uploads órfãos/backups sem apagar arquivos referenciados.

### B. Cliente e contratação
- [ ] Organização/contato necessários, vínculo com campanha; evitarCRM completo.
- [ ] Resumo contratado, responsabilidades, valor, período, revisões e política de cancelamento.
- [ ] Aprovação registrada pelo administrador (canal externo WhatsApp/email pode continuar), quem/quando/versão.
- [ ] Histórico mínimo de ações, sem dados excessivos.
- [ ] Definir condição padrão de liberação (pagamento integral antes de ativar foi RECOMENDAÇÃO, não política comercial final formalizada). Condições originais eram negociáveis; não bloquear acordos sem decisão.
- [ ] Reconciliar oferta: original playbook referênciaR$990; apresentação245/395/645/sobproposta por vagas. Não fixar tabela no sistema sem confirmar. Kit criação/adaptação/divulgação incluídos divergiam.

### C. Cobrança e checkout PixGo
- [ ] Admin cria solicitação vinculada, preço e condição fixados no pedido/versionados; editar campanha não pode mudar valor de cobrança emitida.
- [ ] Link permanente aleatório opaco sem conta cliente, sem enumeração porUUID previsível nem exposição dados pessoais.
- [ ] Página resumo/valor/condições + aviso DePix exigido + dados reais pagador, CPF/CNPJ e consentimentos adequados.
- [ ] GerarQR/copiaecola, expiração pelo expires_at do provedor (não hardcode), nova tentativa após vencer, status de pagamento.
- [ ] Botão copiar link/mensagem WhatsApp; NÃO precisaAPIWhatsApp nem e-mail automático V1.
- [ ] Persistir tentativa segura, resolver timeout create e corrida callback antes de paymentId; external_id não é idempotency garantida.
- [ ] Painel financeiro tentativas/status + **Consultar na PixGo** para recuperação sobdemanda; sem worker/cron.
- [ ] Reembolso/cancelamento: tratar eventos já suportados, regras de negócio/admin e efeito sobreliberação; API de executarrefund não foi validada/documentada, não inventar.
- [ ] Teste real controlado da conta, limites, carteira e eventos após autorização.

### D. Publicação e acesso público (maior lacuna)
- [ ] Validação de pacote completo pronto, ao menos1arte, assets existentes, referência/dimensões, direitos/aprovação operacionais.
- [ ] Congelar/identificar versão aprovada. Pagamento não publica rascunho alterado/incompleto.
- [ ] Publicar versão consistente em endereço estável; decisão arquitetura entre atual domínio/editorCloudflare ou rota pública nova não implementada. Preferir reaproveitar público existente, evitar duasfontes de verdade.
- [ ] Separar materiais privados de conteúdo público e não expor dados comerciais/cliente no manifesto.
- [ ] Gate aprovação+pagamentoexigido+periodoválido. Pagamento e publicação são estados separados; falha publicação não desfaz pagamento nem cobra de novo.
- [ ] Processo síncrono compatível com limites daVercel; se demorado, discutir alternativa com usuário em vez de reintroduzir worker sem aprovação. Retry explícito pelo painel é caminho V1.
- [ ] Atualização/reversão sem quebrar material cacheado ou sessão antiga; assets imutáveis/versão e manifesto porúltimo.
- [ ] Link público +QRdivulgação (distinto doQRpagamento) para organizador.
- [ ] Suspensão administrativa com registro.
- [ ] Encerramento automático pelo endsAt na leitura pública/abertura editor (não precisa cron para checar data), URL permanece com mensagemencerrada. Definir sessõesjáabertas, não prometer antes de implementar.

### E. Métricas e relatório básico
- [ ] Visitas, ediçãoiniciada, PNGgerado, arte/stickers usados porcampanha.
- [ ] Reutilizar contrato PostHog original se apropriado; preview interna não contam como participante.
- [ ] Proibir fotos/composições em eventos, autocapture/sessionreplay de canvas.
- [ ] Relatório simples paraadmin entregar aoorganizador, não dashboard sofisticado.
- [ ] Exportação não é pessoaúnica nem post/reach; sem promessa alcance.

### F. Produção e prontidão
- [ ] Configurar Vercel, DBgerenciado, R2, DNS/HTTPS somente com autorização para provisionar/custos.
- [ ] Secrets próprios, rotas/origins corretos, check integração PixGo live.
- [ ] Backups +restauração PostgreSQL/R2 e retenção, logs seguros, alertas operacionais webhook/publicação.
- [ ] Revisar dependências/tooling e rate limiting distribuído; auth em memória não resolve brute force multiinstância.
- [ ] Termos/privacidade/contratação/avisosDePix e processo fiscal; jurídica/contábil não implementada pelogateway.
- [ ] Fluxo completo produção controlado: preparar→aprovar→pagar→publicar→compor/exportar→encerrar→relatório.
- [ ] Piloto pago e medição esforço/margem/suporte/recompra. Demo/piloto não comprovam preço e aquisição.

## 10. Ordem sugerida e critérios de conclusão

1. Estúdio confiável com materiais reais.
2. Cliente/contratação/aprovação.
3. Checkout e painel de cobrança real (mock primeiro).
4. Publicação e encerramento de versão aprovada.
5. Relatório básico e operaçãoprodução.
6. Venda real pontaaponta com autorização.

Entregar por fatias utilizáveis, com testes que clicam/submetem a ação real. Teste que só vêformulário não validasubmit. Não inserir botões sem ação, links semdestino ou mensagens que indiquem pronto quando nãoestá.

**V1 pronta:** fundador consegue realizar toda jornada da seção1 sem terminal para configurar cadaevento e sem conferirPixmanualmente nofluxopadrão, com alternativa deconsulta/retry emfalhas. Não exige conta cliente, assinatura, automaçãoWhatsApp, IA/criação dekit, galeria departicipantes, importaçãofotógrafos oudashboardavançado.

## 11. Arquivos de apoio

- `AGENTS.md`: regras obrigatórias.
- `README.md`: bootstrap/escopoatual.
- `docs/architecture.md`: contratosbackend.
- `docs/auth.md`: segurançalogin e testes.
- `docs/development.md`: infra/mocks.
- `docs/campaign-editor.md`: estúdio/upload/referência.
- `docs/editor-testing.md`: runner isolado.
- `docs/validation.md`: evidências históricas; ler datas/etapas e não presumir tudoatual.
- `docs/security.md`: limites/tooling/produção.

Alertas `npm audit` apareceram no tooling (drizzle-kit→esbuild e eslint-config-next→picomatch), além peer ESLint10. Não fazer auditfixforce: sugestões incluíam downgradesincompatíveis. Revalidar e tratar antesdeprodução; não declarar exploração emruntime semevidência.

## 12. Prompt para iniciar nova sessão

```text
Continue o projeto /Users/thadeubrito/workspace/namarca.
Leia AGENTS.md e docs/CONTINUIDADE.md completos, depois os arquivos específicos da entrega.
Não altere o projeto original /Users/thadeubrito/workspace/personal/namarca.
Preserve contas, sessões, campanhas, volumes e secrets existentes.
Use somente ferramentas em containers, sem serviços externos reais.
V1 é administrativa, sem contas de clientes, sem worker/cron/Inngest.
Antes de implementar, confirme o estado do código e diferencie funcionalidade existente de pendência.
Próxima entrega desejada: [indicar uma das etapas do backlog].
Ao terminar, valide o fluxo de verdade, documente limitações e atualize a continuidade.
```
