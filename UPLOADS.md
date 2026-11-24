# Upload direto de materiais

Somente artes/figurinhas administrativas usam este fluxo. Fotos e composições de participantes não são enviadas.

## Contrato

1. Ao salvar a seção, cliente calcula SHA-256 e solicita `POST /api/campaigns/:id/assets/uploads` com `{id,name,kind,byteLength,sha256}` (JSON até 4 KiB).
2. Servidor exige `requireAdmin` (senha + TOTP), Origin e campanha editável. Registra autorização com ID idempotente, administrador, campanha, tipo, tamanho, hash e prazo. URL PUT dura 5 minutos para iniciar o envio; a finalização é permitida por 1 hora para acomodar conexões lentas. A assinatura inclui `Content-Type: image/png` e tamanho.
3. Navegador faz PUT direto para `private/uploads/<campaignId>/<uploadId>.png`, sem cookies administrativos. URL é credencial temporária: não registrar/copiar para telemetria ou logs.
4. `POST /api/campaigns/:id/assets/uploads/:uploadId/complete` verifica novamente administrador/Origin/vínculo/campanha e prazo, lê o objeto com limite streaming de 25 MiB, compara bytes/hash e valida PNG/CRC/transparência/dimensões (40 milhões de pixels).
5. Grava exatamente os bytes validados na chave definitiva imutável `private/campaigns/<id>/assets/<id>.png`, registra asset e conclusão. Não usa CopyObject: a URL temporária pode continuar sendo reutilizada até expirar. Nenhuma URL de escrita é emitida para o definitivo.

Tentativa repetida mantém ID/hash/tamanho/campanha/tipo/administrador. Autorização pode ser renovada para os mesmos bytes; finalização repetida retorna o material já concluído. Se cleanup manual removeu um asset, o mesmo arquivo pode ser reenviado. Falha de commit depois de PUT definitivo é recuperada comparando bytes no retry. Seleção continua local; envio sequencial somente ao salvar. Save e publicação permanecem independentes.

A rota antiga `POST /api/campaigns/:id/assets?kind=...` continua para compatibilidade local/testes; o estúdio ativo não a utiliza para transportar PNG. Na Vercel essa rota não comporta arquivos grandes.

## Preparação local

Dependências e comandos em containers. Aplicar migrations versionadas com o procedimento normal e autorização para o banco escolhido; a integração abaixo aplica a cadeia somente em DB descartável.

`S3_ENDPOINT` é o endpoint interno. `S3_UPLOAD_ENDPOINT` é a origem do storage acessível pelo navegador **antes de assinar**; Compose define `http://localhost:9000` como padrão. Nunca trocar hostname de URL já assinada. Para usar `127.0.0.1` no storage, configurar explicitamente a origem correspondente.

CORS local (altera somente configuração do bucket local; não apaga objetos):

```sh
docker compose exec -T app node_modules/.bin/tsx scripts/configure-local-upload-cors.ts
```

Permite PUT e headers necessários somente para `http://localhost:3000` e `http://127.0.0.1:3000`. Alterações de environment do Compose exigem recriar o serviço app; não apenas restart. Não reiniciar/alterar DB, contas ou volumes para isso.

Integração descartável (Docker; rede interna, PostgreSQL/S3 em tmpfs, dependências existentes read-only, sem `.env` real):

```sh
sh scripts/run-direct-upload-test.sh
```

Esse teste chama handlers reais com auth/TOTP e storage reais, mas não é um browser nem uma requisição HTTP ao Next em produção.

## Antes de produção

- R2 privado, endpoint S3 HTTPS e credenciais server-only. Nunca publicar todo o bucket nem usar endpoint CDN público para assinar PUT S3.
- CORS com origens administrativas HTTPS exatas, PUT e headers necessários; sem wildcard de origem. CORS não substitui assinatura/autorização.
- URLs assinadas não devem entrar em logs, analytics/session replay ou relatórios de erro. Não instrumentar o corpo da autorização.
- Homologar assinatura/headers, CORS, PNG de 25 MiB, imagens de 40 milhões de pixels, memória/tempo e concorrência na Vercel/R2 reais. Finalização declara `maxDuration=60`, não prova capacidade do plano.
- Finalização é síncrona e mantém lock da campanha durante leitura/validação/persistência, como o caminho legado. Arquivos pequenos não demonstram capacidade do pior caso.
- Política aprovada: expiração pelo lifecycle do próprio storage após **1 dia**, restrita exatamente ao prefixo `private/uploads/`, incluindo temporários concluídos, abandonados e inválidos. Não aplicar a `private/campaigns/`, `public/` ou ao prefixo amplo `private/`. Sem worker/cron da aplicação. Expiração não garante exclusão em horário exato; conferir semântica do R2 e margem em relação à finalização de 1 hora durante a homologação.
- A regra está aprovada, mas **ainda não foi configurada** no storage local ou no R2. Até configurá-la, temporários permanecem privados. Cleanup manual atual de assets não percorre staging. Configurar a regra de forma restrita e verificar que não substitui outras regras de retenção do bucket.
- Registros de autorização permanecem para idempotência; lifecycle de objetos não remove registros do banco.

Este documento não autoriza provisionamento, R2 real, push ou deploy.

## Um objeto definitivo por material

Rascunho e publicação compartilham o objeto `private/campaigns/<id>/assets/<id>.png`; o prefixo histórico não implica sigilo. A entrega pública `/campaigns/<slug>/{artworks|stickers}/<UUID>.png` resolve o vínculo no banco e pode ser acessada antes da publicação por quem tiver a URL. Não exige abrir o bucket. Publicar valida a disponibilidade e grava referências no PostgreSQL, sem PUT/CopyObject de PNG. Temporários continuam separados e validados.

Não há fallback de leitura para cópias públicas ou releases antigos. Objetos antigos não são apagados/movidos por esta mudança. Cleanup protege rascunho, publicação e histórico; a remoção explícita de materiais sem referências pode invalidar URLs de materiais nunca publicados. URLs não são mecanismo de revogação nem garantia de retenção eterna. Não enviar fotos/composições de participantes.
