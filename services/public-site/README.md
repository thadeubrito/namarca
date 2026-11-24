# Gateway público local

Servidor Node 24 independente do Next, PostgreSQL e financeiro. É um **gateway de storage local**, substituível por hospedagem estática/CDN + R2 na produção; não é deploy nem migração do site anterior.

Após preparar as dependências no volume `namarca_node_modules` e gerar `apps/campaign/dist` com `npm run build:campaign` em container:

```sh
docker compose up -d public-site
```

Acesso: http://localhost:3001 (bind somente loopback no host). Depende apenas de S3 saudável. Não executa `npm ci` nem inicia app/banco. Serviço, runtime, página e dependências montados somente leitura.

- `/`: página mínima `apps/site/index.html`, sem Next ou marketing adicional.
- `/<slug>`: HTML compartilhado do editor, sem consultar bucket; manifesto ausente é tratado pelo runtime. Slug canônico de 2–80 caracteres, rotas internas reservadas.
- `/campaign-runtime/*`: arquivos conhecidos por MIME, sem listagem, arquivos ocultos, traversal ou escapes por symlink.
- `/campaigns/<slug>/campaign.json`: GET S3 assinado da chave `public/campaigns/<slug>/campaign.json`, `no-store`.
- `/campaigns/<slug>/releases/<sha256>/<uuid>.png`: GET assinado da chave equivalente sob `public/campaigns/`, cache imutável.

Somente GET; nenhuma listagem ou escrita S3 e nenhuma leitura `private/`. Bucket permanece privado. Este host não interpreta manifesto, publicação ou prazo: expõe somente o prefixo público canônico previamente produzido; encerramento no runtime e retenção/publicação cabem ao produtor. Entradas estáveis do runtime usam no-store; somente chunks com hash e PNGs de releases usam cache imutável. HTML e erros não são armazenados. CSP permite canvas com imagens locais/blob/data e exportação blob, sem scripts inline ou conexões externas. Sem logs de requisição, payload ou erros internos.

`env_file: .env.local` reaproveita configuração local; o servidor seleciona apenas `S3_ENDPOINT`, `S3_REGION` (padrão `us-east-1`), `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` e `PORT` (3001). Credenciais explícitas para o SDK, sem descoberta de credenciais AWS. O arquivo compartilhado ainda é injetado pelo Compose; não equivale a isolamento de secrets por container. Credenciais locais existentes podem ter permissões mais amplas no S3; a interface deste processo só usa GetObject restrito. Produção requer política read-only no prefixo público e configuração própria.

Testes Node puros, sem SDK instalado/serviços externos (HTTP real e S3 injetado), executados em container:

```sh
docker run --rm --read-only --tmpfs /tmp \
  -v "$PWD/services/public-site:/app/services/public-site:ro" -w /app \
  node:24.11.1-bookworm-slim node --test services/public-site/server.test.mjs
```

O mesmo teste pode rodar com `node --test services/public-site/server.test.mjs` onde Node estiver disponível; não instalar dependências no host. Fixtures temporárias precisam de `/tmp` gravável, não disponível no serviço Compose read-only por padrão.
