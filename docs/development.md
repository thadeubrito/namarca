# Desenvolvimento local

## Infraestrutura

Compose executa Next.js, PostgreSQL 17.6, SeaweedFS 4.48 (API S3 privada), e simulador PixGo. Node 24.11.1. Sem serviços SaaS obrigatórios e sem Inngest. Consulte o README para bootstrap, migrations e criação do administrador.

Todas as portas são vinculadas somente a `127.0.0.1`. Banco, S3 e pagamentos simulados possuem volumes persistentes; `node_modules` e `.next` também ficam em volumes. O app executa `npm ci` no início. O gerador `.env.local` não substitui arquivo existente, gera secrets aleatórios e usa permissão 0600. Não regenerar a senha PostgreSQL mantendo volume previamente inicializado.

Next e SeaweedFS têm telemetria desabilitada. Dependências/imagens precisam de rede para instalação inicial, mas os fluxos funcionais são locais. Não configure chaves de produção para desenvolvimento.

## Arquivos

`S3_ENDPOINT=http://s3:9000`, bucket `namarca-local`, path-style. SeaweedFS inicializa o bucket, exige assinatura S3 e verifica 403 para acesso anônimo. Não há console MinIO. URLs internas não são acessíveis no browser: qualquer futura URL pré-assinada precisa usar endpoint público antes de assinar, nunca substituir hostname após assinatura. Não enviar fotos/composições dos participantes ao armazenamento.

## Gateway simulado

`PIXGO_MODE=mock`, `PIXGO_BASE_URL=http://pixgo-mock:4010/api/v1`. Chaves comerciais e token de desenvolvimento são distintos e nunca chegam ao browser.

O simulador usa `X-API-Key`, cria cobranças fictícias e retorna `FAKE-PIX-SEM-VALOR`. Não produz Pix bancário. `external_id` pode se repetir. CPF de teste é aceito conforme validações do simulador, não utilizar dados pessoais reais.

Operações de simulação em `/__dev/payments/:id/complete`, `/expire` e `/refund` exigem `X-Dev-Token`. Callback é limitado a `http://app:3000/api/webhooks/pixgo`, com HMAC SHA256 de `timestamp.rawBody`. Não permite URL arbitrária ou redirecionamentos. API comercial aceita prefixo `/api/v1`; contratos e testes estão no código em `services/pixgo-mock/`.

Não há botão de checkout/simulação na UI desta base. Exercícios de integração devem criar a tentativa correspondente no banco e usar dados fictícios. O simulador persiste estado antes do callback; em falha, repetir a ação reenvia o evento, permitindo verificar idempotência. Mudar estado do mock sozinho não comprova a atualização do sistema.

## Confirmação de pagamentos

O webhook consulta o gateway e atualiza a situação financeira na própria requisição, em transação com o registro idempotente do evento. Não há worker, cron ou `/api/tasks`. Erros temporários retornam 503, permitindo nova entrega do provedor; esta base não garante que o provedor reenvie notificações perdidas. Consulta manual no painel disponível no mock. Falha/inconclusivo permite nova tentativa explícita do cliente no mesmo checkout, sem consultas automáticas ou liberação administrativa. Histórico e callbacks anteriores são preservados; risco de duplicidade após resposta perdida aceito na simplificação solicitada. Não cancela Pix anterior no provedor. Nenhuma publicação de pacote real foi implementada.

## Validações

```sh
docker compose config --quiet
docker compose exec app npm run db:migrate
docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm test
```

Autenticação possui instruções próprias em `docs/auth.md`. Testes de integração devem ser executados somente em banco local dedicado, com limpeza de suas próprias fixtures. Não apagar contas existentes ou volumes para tornar testes verdes.

Para parar sem apagar dados: `docker compose down`. Restaurar os dados, backup de produção, verificação de limites do gateway e testes com dinheiro real ficam fora do bootstrap local e exigem autorização específica.
