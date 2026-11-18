# Validação da base inicial

Executada em containers locais em 2026-11-18. Nenhuma chamada ao PixGo real nem deploy externo.

- Compose: PostgreSQL, SeaweedFS S3, mock PixGo e app. Worker removido a pedido; não há cron ou processo de tarefas.
- Migrations `0000` e `0001` aplicadas; `db:generate` não detecta divergência.
- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado. Navegação com recarga completa em mudanças de auth é intencional para descartar cache de sessão.
- Após remover o worker: `npm test` 18/18 aprovados, incluindo mock, HMAC, valores, contratos normalizados e separação de dados públicos. Testes do scheduler foram removidos junto com a funcionalidade.
- `npm run test:e2e`: 4/4 aprovados em Chromium Playwright1.56.1, login 1440/390px sem overflow, redirecionamento sem sessão, signup bloqueado e webhook não assinado rejeitado. Screenshots locais em `test-results/login-*.png`, não versionadas.
- `scripts/test-auth.ts`: agente implementador executou com handler Better Auth real em PostgreSQL descartável terminado em `_auth_test`. Principal revisou os guards e código do teste. Cobriu login, enrollment, guard pré/pós TOTP, códigos recuperação e revogação. Não cobre fluxo completo de navegador autenticado.
- Build otimizado Next16.4.6 aprovado em container isolado com `.next` separado e URL HTTPS de teste; presença BUILD_ID conferida. Nenhum segredo real utilizado.
- S3 healthcheck valida 403 anônimo e listagem assinada.

- Remoção do worker: container parado/removido, script, rota de cron, testes de scheduler e secrets removidos. Nenhum volume ou dado de usuário apagado.
- `npm run test:webhook`: aprovado ponta a ponta com callback HTTP do mock → Next → consulta ao mock → PostgreSQL, sem worker. Confirma paid/refunded imediatos, idempotência, assinatura inválida/valor divergente rejeitados e campanha não publicada. Corrigida fila do mock para liberar consultas durante o callback. Fixtures do banco removidas; o mock conserva registros sintéticos locais (sem CPF), pois não oferece DELETE.
- Schema/migrations preservados: campos legados de retry e tabela de tarefas permanecem inativos para não apagar registros existentes.

Limites: não houve teste de dinheiro real, publicação de pacote, checkout comercial completo, reset interativo, concorrência de auth ou auditoria externa. O editor foi migrado posteriormente, conforme validação abaixo. Dependências de tooling têm alertas conhecidos descritos em security.md; revisar antes de produção. Nenhum administrador foi criado na base principal.

## Correção de submit do login

Reproduzida falha de hidratação com HMR bloqueado por origem no desenvolvimento. Configurado allowedDevOrigins restrito a localhost/127.0.0.1/app e Webpack em desenvolvimento. Formulários de auth usam POST com fallback que não lê nem registra credenciais; botão só habilita após hidratação. Teste de navegador agora submete credenciais sintéticas inválidas, verifica POST e URL sem query; sem JavaScript o botão fica bloqueado. 6/6 E2E, 20/20 testes, lint e typecheck aprovados. Credenciais anteriormente expostas em URL devem ser trocadas e entradas de histórico removidas; logs antigos não foram apagados automaticamente.

## Estúdio completo de campanha

Migration 0002 aplicada sem alterar dados existentes. 27/27 testes, lint, typecheck e build otimizado aprovados. E2E público 6/6 aprovado. Runner scripts/test-campaign-editor.ts executado em app e banco descartáveis, com senha e TOTP reais: criação via UI, PNGs de arte/sticker, referência numérica, save/reload, CSRF, escopo privado e revisão concorrente409. Prévia usou foto local e sticker; PNG baixado400x400 com pixels verificados para arte/foto/sticker. Nenhum POST/PUT/PATCH durante composição/export. Campanha continuou draft/unpublished. Conta/banco/container/volume de teste removidos; alguns objetos privados órfãos de execução interrompida podem permanecer no S3 local, sem limpeza ampla dos dados compartilhados. Teste inicial de export tinha problema de scroll no viewport externo do iframe; corrigido no runner, sem alterar exportação para mascarar falha. Ver docs/editor-testing.md.
