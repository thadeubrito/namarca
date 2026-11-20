# Checkout V1 — primeira fatia, exclusivamente simulada

Uma campanha pode ter várias cobranças independentes. Na aba Cobrança, o administrador informa descrição pública (1–120 caracteres) e valor (R$ 10–6.000) e emite um link próprio. Exemplo: campanha inicial R$300 paga e adicional R$100 pendente, sem alterar o histórico anterior. Cada link congela `campaignName`, `description` e `amountCents`; pagamentos/tentativas continuam ligados àquele link, não a um valor mutável da campanha. Não há edição/revogação de cobrança emitida.

O formulário gera um UUID por intenção de emissão, usado como ID da cobrança. Reenvios com o mesmo UUID retornam a mesma cobrança somente se campanha/descrição/valor coincidirem; divergência é rejeitada. Após sucesso o formulário limpa os campos e gera nova intenção. Nova intenção cria outro link mesmo com descrição/valor iguais. Lock da campanha serializa emissões. `campaigns.priceCents` permanece legado inicial: preenchido somente se nulo, nunca sobrescrito por adicionais; financeiro soma pagamentos, não esse campo. Criação/edição de Detalhes continua sem receber preço. Nome e descrição são públicos para quem possui o link; não incluir dados pessoais.

O token aleatório tem 256 bits e funciona como credencial de consulta: não compartilhar publicamente. Página sem conta, no-store, noindex e no-referrer; não expõe cliente, contato, observações, CPF ou IDs do gateway. Não existe envio WhatsApp automático. O painel permite copiar o link.

## Limite operacional

**Somente `PIXGO_MODE=mock` com host `pixgo-mock`.** Nenhuma cobrança real habilitada. Por pedido do fundador, a interface usa os textos e estados previstos para o fluxo real (sem rótulos de simulador), mas a infraestrutura continua exclusivamente mock e o QR/código permanece sem valor. Em desenvolvimento, usar somente CPF sintético; Documento vai somente ao adapter, não ao banco/logs. Campo aceita CPF e CNPJ numérico/alfanumérico, com normalização e validação dos dígitos no servidor e adapter. O Pix deve sair de conta vinculada ao documento informado. Compatibilidade operacional de CNPJ com PixGo real continua sem homologação; campo interno `payerCpf`/`receiver_cpf` preservado no contrato mock. Por pedido do fundador, checkout sem checkbox de ciência e sem marca do processador nos textos. Informação sobre conversão/DePix permanece no rodapé expansível Sobre o pagamento; não há aceite jurídico versionado. Revisão jurídica/privacidade e requisitos do provedor continuam obrigatórios antes de live. A aparência realista não significa homologação real.

## Tentativas e recuperação

**Decisão vigente:** geração sem confirmação mostra falha e permite nova tentativa explícita pelo cliente no mesmo link. Sem consultas automáticas e sem liberação administrativa. Estado unknown é preservado para callbacks tardios; não prova que o Pix não existe. Há risco residual de duplicidade após resposta perdida, assumido na simplificação solicitada. POSTs concorrentes continuam bloqueados enquanto creating tem menos de15s e pagamentos ativos/pagos impedem nova geração. Creating abandonado pode ser repetido após15s. Migration0009 e eventos existentes permanecem somente por retenção histórica; funções/ações de consulta de tentativa e liberação removidas.

### Fluxo anterior — substituído pela decisão acima

1. Transação bloqueia o link e grava `checkout_attempts` antes de chamar o gateway. Valor sempre vem do snapshot.
2. Uma tentativa em criação/incerta não liberada bloqueia novo POST no mesmo link. Pagamento pendente/pago/reembolsado também bloqueia nesse link; nova tentativa apenas após status confirmado expired/cancelled. Outros links da campanha são independentes; não emitir outro link para contornar uma criação incerta da mesma solicitação.
3. Resultado confirmado grava `payments` com checkoutId, QR e expiração retornada pelo gateway. Não há prazo fixo no app.
4. Timeout/erro permanece incerto, sem retry automático do POST. Na própria requisição de geração são feitas até3 consultas por externalId com750ms entre elas (timeout individual4s); resultado único com valor correto recupera o Pix. Consultas não criam pagamento remoto. Zero/múltiplos/divergência/rede permanecem inconclusivos e não desbloqueiam automaticamente. Após isso o cliente deve falar com o responsável. Administrador pode continuar consultando; contagem/horário e eventos query são persistidos, sem documentos/payloads.
5. **Liberar nova tentativa** exige administrador e confirmação explícita do risco: o Pix anterior pode existir, e liberar não o cancela no provedor. Operação sob lock exige tentativa com ao menos30s e5s desde última consulta, bloqueia se já registrada ou houver pagamento ativo, grava retryReleasedAt/By e evento append-only. Tentativa anterior permanece unknown/creating com marca de autorização; cliente usa mesmo link e informa documento novamente. Webhook tardio continua reconhecido e bloqueia novas gerações quando houver pagamento ativo; dois pagamentos possíveis permanecem registros distintos, sem refund automático. Liberação repetida é idempotente. Limites de tempo são proteção contra operação em andamento, não prova de inexistência.
6. Callback antecipado localiza tentativa pelo externalId, consulta gateway, compara IDs/valor e registra antes de processar receipt. Lock e unique evitam duplicação.
7. **Consultar na PixGo mock** reconcilia pagamentos conhecidos sob demanda com comparação de IDs/valor, row lock e transições monotônicas. Sem worker/cron. Checkout público apenas atualiza estado local ao recarregar; não dispara consulta ao gateway.

Pago nunca publica campanha ou altera pacote. Reembolso preserva histórico financeiro; não há ação de refund no app. A expiração visual vem do provedor; se webhook se perder, administrador precisa consultar antes de liberar nova tentativa.

## Persistência

Migration `0006_careful_bruce_banner.sql` cria links/tentativas e adiciona campos nullable a payments. Não altera dados históricos nem entidades comerciais legadas. Link não inclui observações comerciais (podem ser privadas). Migration `0009_silly_solo.sql` acrescenta contador/horários/liberação administrativa e eventos de consulta/liberação, preservando todos os vínculos e tentativas. Migration `0008_huge_thanos.sql` acrescenta descrição pública não nula com default Campanha para links antigos, preservando IDs/tokens/valores/pagamentos e vínculos existentes. Sem novas condições contratuais.

## Teste dedicado

`scripts/test-checkout.ts` exige banco `namarca_checkout_test`, `CHECKOUT_TEST_ISOLATED=1`, host PostgreSQL `postgres` e aliases `app`/`pixgo-mock` em rede descartável própria. Não executar apontando o mock para o app principal: callbacks precisam atingir o mesmo DB isolado. O runner exige banco sem campanhas/usuários e usa Chromium do container Playwright; não provisiona conta administrativa. Credenciais de infra são herdadas sem impressão. Não apagar volumes principais ao encerrar o ambiente isolado.

### Provisionamento reproduzível

Executar da raiz, com infraestrutura local e imagem `namarca-app` já disponíveis e dependências existentes no volume `namarca_node_modules`. Não roda `npm ci`, não instala no host, não publica portas. Os nomes são exclusivos: se já existirem, investigar antes de continuar; não sobrescrever banco anterior. A rede interna separa o mock/app de teste dos serviços principais. O PostgreSQL existente recebe somente um alias nessa rede e um banco novo.

```sh
set -e
docker network create --internal namarca_checkout_test
docker network connect --alias postgres namarca_checkout_test namarca-postgres-1
docker compose exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" namarca_checkout_test'

# A URL é transformada dentro do container, nunca impressa.
docker run --rm --network namarca_checkout_test --env-file .env.local \
  -e NODE_ENV=development -v "$PWD:/app:ro" \
  -v namarca_node_modules:/app/node_modules -w /app namarca-app sh -c \
  'export DATABASE_URL="$(node -e '\''const u=new URL(process.env.DATABASE_URL);u.pathname="/namarca_checkout_test";process.stdout.write(u.href)'\'')"; npm run db:migrate'

docker run -d --name namarca-checkout-mock --network namarca_checkout_test \
  --network-alias pixgo-mock --env-file .env.local \
  -e PIXGO_MOCK_DATA=/tmp/checkout-payments.json \
  -v "$PWD/services/pixgo-mock:/app/services/pixgo-mock:ro" -w /app \
  node:24.11.1-bookworm-slim node services/pixgo-mock/server.mjs

# Cópia descartável em tmpfs: Next precisa escrever next-env.d.ts e .next.
# Não montar .next principal nem executar build no app principal.
docker run -d --name namarca-checkout-app --network namarca_checkout_test \
  --network-alias app --env-file .env.local -e NODE_ENV=development \
  -e NEXT_TELEMETRY_DISABLED=1 -e BETTER_AUTH_URL=http://app:3000 \
  -v "$PWD:/source:ro" --tmpfs /app:rw,size=2g \
  -v namarca_node_modules:/app/node_modules -w /app namarca-app sh -c \
  'node -e '\''const fs=require("node:fs");fs.cpSync("/source","/app",{recursive:true,filter:p=>!/^\/source\/(node_modules|\.next|\.git)(\/|$)/.test(p)})'\''; export DATABASE_URL="$(node -e '\''const u=new URL(process.env.DATABASE_URL);u.pathname="/namarca_checkout_test";process.stdout.write(u.href)'\'')"; exec npm run dev -- --port 3000'

# Aguarda readiness sem imprimir resposta/configuração.
docker exec namarca-checkout-app node -e 'const end=Date.now()+120000;(async()=>{while(Date.now()<end){try{const r=await fetch("http://127.0.0.1:3000/api/webhooks/pixgo",{method:"POST",body:"{}"});if(r.status===401)return}catch{}await new Promise(r=>setTimeout(r,1000))}process.exit(1)})()'

docker run --rm --network namarca_checkout_test --env-file .env.local \
  -e NODE_ENV=development -e PIXGO_MODE=mock \
  -e BETTER_AUTH_URL=http://app:3000 -e CHECKOUT_TEST_ISOLATED=1 \
  -v "$PWD:/app:ro" -v namarca_node_modules:/app/node_modules -w /app \
  mcr.microsoft.com/playwright:v1.56.1-noble sh -c \
  'export DATABASE_URL="$(node -e '\''const u=new URL(process.env.DATABASE_URL);u.pathname="/namarca_checkout_test";process.stdout.write(u.href)'\'')"; exec npm run test:checkout'
```

Executar encerramento mesmo após falha, apenas para recursos criados nesta execução:

```sh
docker rm -f namarca-checkout-app namarca-checkout-mock
docker compose exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" namarca_checkout_test'
docker network disconnect namarca_checkout_test namarca-postgres-1
docker network rm namarca_checkout_test
```

### Cobertura e evidência

A ampliação para múltiplas cobranças atualiza o runner dedicado: reenvio concorrente do mesmo UUID gera somente um link; divergência é rejeitada; nova intenção da mesma campanha gera outro link, inclusive com pagamento inicial já pago. Cenário inicialR$300 + adicionalR$100 confere checkout público, descrição, tentativa independente e preservação integral do pagamento anterior. Execução completa aprovada em Chromium com PostgreSQL próprio em tmpfs, app/mock/rede exclusivos e migrations até0008. Cenário R$300 pago + R$100 pendente aprovado com preservação integral do anterior e bloqueio de duplicação por link após reload. Fixtures verificadas vazias e recursos próprios encerrados sem apagar volumes principais. As evidências abaixo são históricas complementares.

Execução completa aprovada em container Playwright 1.56.1: snapshot de nome/valor e emissão repetida concorrente, seis `startCheckout` simultâneos com uma única tentativa/cobrança, recuperação de estado unknown via `findMockPayment`/registro idempotente, divergência rejeitada, reconciliação pending/paid/refunded e preservação de paidAt. O mock sempre entrega callback: para provar a consulta financeira, o runner restaura **apenas a linha sintética** para estado local desatualizado antes de reconciliar.

Callback antes do registro local é reproduzido deterministicamente criando tentativa e cobrança remota sem registrar payment: callback auto-registra paid; a resposta pending atrasada não regride estado; duplicata mantém um receipt. Não é um teste probabilístico de timing da rede.

Chromium anônimo faz submit real do checkout público (CPF gerado sinteticamente e consentimento), vê QR/pending, recarrega sem permitir novo Pix e vê paid após callback/atualizar situação. Todas as campanhas continuam draft/unpublished, sem publication tasks. Runner limpa fixtures e verifica tabelas de domínio vazias; remover mock descartável elimina os pagamentos simulados restantes. Não cobre autenticação/admin UI, PixGo real ou publicação.

## Antes de live

CNPJ/contrato real do gateway, recuperação documentada de criação incerta, política comercial de reemissão/cancelamento, termos/consentimentos e privacidade, rate limiting distribuído, homologação autorizada e aprovação visual/publicação continuam pendentes. Não remover guard mock para usar este checkout em produção.
