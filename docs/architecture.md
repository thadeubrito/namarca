# Backend NaMarca V1

## Escopo

Next.js Node.js + Better Auth + Drizzle/PostgreSQL + S3 privado. V1 permite campanhas drafts e confirmação financeira síncrona pelo webhook, sem worker ou agendamento. **Checkout somente mock local; sem checkout live completo ou publicação real.** O estúdio de campanha e a prévia do editor estão descritos em campaign-editor.md. Pagar nunca marca campanha published. Sem organizations/multi-tenancy nesta base.

## Modelo e exports

`src/db/index.ts`: `db`, `pool`; `src/db/schema.ts` reexporta auth-schema e:

- `campaigns`: UUID, name, slug unique validado, endsAt timestamptz obrigatório, preparationStatus draft/validated/approved, publicationStatus unpublished/pending/published/failed/ended, priceCents nullable com CHECK positivo, createdAt/updatedAt. Defaults draft/unpublished. updatedAt deve ser atualizado explicitamente.
- `payments`: tentativa com campaignId FK, externalId unique, paymentId unique, amountCents inteiro positivo, status pending/paid/expired/cancelled/**refunded**, paidAt, timestamps. Refund preserva paidAt histórico. Não persiste CPF, identidade do pagador ou payload bruto.
- `webhookReceipts`: eventId unique, paymentId FK, receivedAt e dispatchedAt. O nome legado dispatchedAt marca processamento síncrono concluído. Colunas attempts/nextAttemptAt são preservadas por compatibilidade, mas não são usadas; não há fila ativa.
- `publicationTasks`: estrutura legada preservada sem consumidor nem novas inserções. Não representa uma publicação implementada. Mantida para não remover registros existentes nesta alteração.
- `campaignEditor`: manifesto privado JSONB por campaignId, revisão otimista e updatedAt; identidade base vem sempre da campanha.
- `campaignAssets`: IDs, vínculo à campanha, chave privada, tipo de material e dimensões reais; arquivos PNG são servidos somente após autorização.

Banco já existente precisa migração para adicionar refunded ao enum payment_status antes de receber refunds. Usar migrações revisadas em produção, não db:push.

## Dados comerciais simples

`clients` guarda nome e contato opcional; `campaigns.clientId` é FK opcional restrita, permitindo reutilizar cliente em várias campanhas. Cadastro inline e salvamento da campanha são transacionais; cliente existente é verificado no servidor. `campaigns.notes` segue na campanha, assim como o único valor operacional `campaigns.priceCents`; editar campanha não altera `payments.amountCents`. Migration `0005_sloppy_silk_fever.sql` migra os antigos organizer/contact para clientes (apenas pares exatos compartilhados), preservando campos legados e preço. Por decisão do fundador, a contratação versionada foi retirada da UI e suas actions removidas. Tabelas `campaign_contracts`/`contract_approvals` e migration 0003 permanecem somente para preservar registros, sem uso no fluxo ativo ou checkout. Aprovação visual tem snapshots privados versionados (ver seção de pacotes); publicação ainda pendente. Detalhes em [contracts.md](contracts.md).

## Pacotes visuais aprovados

`campaign_packages` guarda snapshots privados versionados da configuração validada e a declaração externa de aprovação (responsável/canal/dia e registrador admin). Rascunho continua editável e não herda aprovação; preparationStatus não representa aprovação do rascunho mutável. Actions usam requireAdmin, lock, revisão/identidade esperadas e inspeção dos objetos PNG privados. Prévia histórica usa somente snapshot, sem bridge de atualização. Ver [campaign-packages.md](campaign-packages.md). Sem publicação ou liberação financeira automática.

## Checkout mock — fatia inicial

`checkout_links` congela nome/valor por campanha com token opaco. `checkout_attempts` registra criação antes do gateway e bloqueia duplicação em resultado incerto; `payments.checkoutId`, `qrCode`, `expiresAt` ligam resposta confirmada. `src/lib/checkout.ts` contém transações, reconciliação e guard estrito mock local. Callback antecipado pode registrar uma tentativa conhecida após consulta e comparação de IDs/valor. Painel agora oferece consulta manual e recuperação via listagem **somente no mock**. Não há checkout live ou publicação. Contratos e limites em [checkout.md](checkout.md); esta seção substitui afirmações históricas abaixo de ausência de consulta manual.

## Configuração

`getEnv()` valida sob demanda. DATABASE_URL; S3_ENDPOINT=http://storage:9000, S3_REGION=us-east-1, S3_BUCKET=namarca-private, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY. PIXGO_MODE=mock; PIXGO_BASE_URL=http://pixgo-mock:4010/api/v1; PIXGO_API_KEY; PIXGO_WEBHOOK_SECRET (mínimo 16 caracteres); PIXGO_WEBHOOK_URL=http://app:3000/api/webhooks/pixgo. Live exige PIXGO_MODE=live, PIXGO_LIVE_AUTHORIZED=true e URL HTTPS. Nunca há fallback automático para live.

Nenhum segredo deve receber prefixo NEXT_PUBLIC.

## PixGo: contrato documentado

Referência consultada: https://pixgo.org/api/v1/docs. O contrato anterior camelCase/Bearer era incorreto e foi substituído. Integração live ainda exige homologação/autorização operacional.

`src/lib/pixgo.ts` exporta `createPixgoClient`, `createPaymentSchema`, `paymentResponseSchema`, `webhookSchema`, `GatewayPayment`, `centsToDecimal`, `decimalToCents`, `numberAmountToCents`, `isValidCpf`, `verifyWebhookSignature`, `verifyKnownPayment`, `nextPaymentStatus`.

- `createPayment({ externalId, amountCents, payerCpf })`: CPF com dígitos verificadores, externalId até 50 caracteres, mínimo 1000 e máximo 600000 centavos (R$10–6000; provedor pode impor limite menor por conta). Esta interface aceita CPF, não CNPJ. CPF é transmitido apenas ao gateway, nunca ao banco/logs. Erros expostos pelo adapter são genéricos, sem eco de input/payload.
- POST `/payment/create`, header `X-API-Key`, JSON `{ amount: 10.50, receiver_cpf, external_id, webhook_url }`. `amount` é número decimal exigido pelo provedor, gerado de centavos inteiros.
- **Sem garantia de idempotência na criação:** docs permitem external_id repetido e não documentam Idempotency-Key. Não re-tentar POST automaticamente após timeout; consultar/buscar external_id e reconciliar antes de nova tentativa. A futura action de checkout deverá modelar essa recuperação e a corrida com callback antes de persistir paymentId.
- GET `/payment/{id}/status` com X-API-Key. 200 e terminal 410 suportados; envelope validado `{ success, data: { payment_id, external_id, amount: number, status, qr_code?, expires_at? } }`. success:false só é aceito para 410 terminal validado. Redirects bloqueados, timeout 4s, no-store.
- Normalização para `GatewayPayment`: id/externalId, amount como string decimal exata, status completed→paid, canceled→cancelled, refunded explícito; qrCode/expiresAt opcionais. Payer/customer e campos desconhecidos são descartados. Números com fração de centavo, NaN, zero, negativos e overflow são rejeitados, sem arredondamento silencioso.

## Webhook síncrono

POST `/api/webhooks/pixgo`, corpo máximo 16 KiB lido em streaming. Headers `X-Webhook-Timestamp` Unix segundos e `X-Webhook-Signature` hex64 HMAC-SHA256 de `${timestamp}.${rawBody}`; comparação timing-safe com checagem prévia de tamanho/hex e janela ±5min. X-Webhook-Event opcional deve coincidir com body.

Payload: `{ event: "payment.completed"|"payment.expired"|"payment.refunded"|"payment.cancelled"|"payment.canceled", timestamp: ISO8601, data: { payment_id, external_id, status, amount: number, ... } }`. Status deve corresponder ao evento. Campos customer/payer/CPF extras são descartados imediatamente; corpo bruto não é persistido nem logado. Timestamp do body é metadado; replay é verificado pelo header assinado.

Não há delivery ID nas docs: dedupe SHA256(payment_id + ':' + event), independente do timestamp de reenvio. Assume um ciclo de pagamento sem múltiplos refunds parciais; refund parcial não está modelado. Persistir alterações de estado via consulta gateway, nunca confiar só no evento:

1. Verificar HMAC/schema e localizar pagamento conhecido.
2. Comparar externalId, paymentId e amount do evento com o banco.
3. GET status server-to-server; conferir mesmos identificadores/valor. Status atual do gateway prevalece sobre evento atrasado (ex.: completed entregue depois de refunded).
4. Em transação com row lock do pagamento, inserir receipt com unique eventId e atualizar status. Duplicata não reaplica efeitos. paid só avança para refunded; refunded nunca regride.
5. Inserir dispatchedAt junto com a receipt e efetivar a atualização financeira na mesma transação. Receipts legadas ainda não processadas podem ser concluídas ao receber novamente o evento.
6. Retornar 200 somente após commit. Não cria tarefas nem publica campanhas.

Falha antes do commit retorna 503; o provedor pode re-tentar, mas não presumir política garantida de reenvio. Duplicatas são idempotentes. Não há recuperação automática de notificações perdidas. Consulta manual no painel existe exclusivamente para o mock (ver checkout.md); recuperação live segue pendente.

Respostas: 200 aceita/duplicada, 400 payload, 401 assinatura, 413 tamanho, 422 pagamento desconhecido/divergente, 409 conflito, 503 dependência. Nenhuma inclui stack traces/segredos. A consulta gateway tem timeout 4s; requisições lentas podem ultrapassar os 5s do provedor. Reenvio não duplica efeitos. Não iniciar trabalho não rastreado após responder.

## Storage e readiness

S3 privado, path-style, sem ACL pública. Helpers devem ser chamados somente após autorização pela camada de aplicação. Manifesto público é allow-list estrita de version, slug, name, endsAt, assets; nunca serializar linhas comerciais. Não existe publicador de manifest nesta V1.

GET `/api/health` público: somente `{status,checks:{database,storage}}`, SELECT 1 + HeadBucket; 200/503, no-store. Sem URLs, versões, bucket, credenciais ou erros internos. O gateway precisa monitoramento separado.

## Testes e limitações

Ferramentas executadas em Docker Node24 com volume namarca_node_modules, não npm host. Testes puros cobrem conversão, CPF, HMAC/replay, schemas, normalização, refunded, matching e manifest. Teste adapter sobe servidor mock HTTP real em porta efêmera dentro do container e exercita criação/status/completed/refunded/expired e assinaturas. O teste adicional scripts/test-webhook.ts verifica o webhook com banco e mock locais, sem processamento em segundo plano.

Mock local suporta a rota oficial de status e timestamp ISO no webhook; CPF obrigatório no request, mas não persistido. Dados históricos do volume de mock anteriores à correção podem conter receiver_cpf: limpar/recriar volume de desenvolvimento sob autorização caso necessário.
