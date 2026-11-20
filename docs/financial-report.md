# Resumo financeiro administrativo

Disponível no menu principal → **Financeiro**, em `/admin/financeiro`. Visão global com nome/link da campanha e filtros por campanha, situação e intervalo de criação da tentativa. O CSV global em `GET /api/financial-report` recebe os mesmos filtros. Página e endpoint exigem `requireAdmin` independentemente do layout. O link contextual foi removido da aba Cobrança, que mantém emissão, compartilhamento e consulta de pagamentos.

Filtros vazios significam todas as campanhas/situações/datas. Período inclui dias inicial e final em São Paulo (UTC−3), usando `createdAt`, não `paidAt`; situação é atual, não reconstrução histórica. Datas, UUID, status e intervalo são validados; filtros inválidos não executam consulta e o CSV retorna 400. Totais e CSV refletem exatamente o mesmo recorte. Lista sem paginação nesta primeira versão.

Rotas antigas `/admin/campanhas/[id]/financeiro` e `GET /api/campaigns/[id]/financial-report` preservadas para compatibilidade, ambas protegidas e restritas à campanha; não aparecem mais como entrada na aba Cobrança.

Mostra quantidade e valor nominal separado para pending, paid, expired, cancelled e refunded. Reembolso não entra no total atualmente pago; tentativas não representam novas vendas. Não há total denominado saldo, lucro ou receita líquida: taxas, conversão e liquidação DePix não são modeladas. Datas da tela em São Paulo; CSV UTC explícito. `paidAt` é confirmação registrada localmente, não liquidação bancária.

O relatório é leitura do banco, não consulta implícita ao gateway. Estado pode estar desatualizado se callback se perder: usar consulta na PixGo na campanha e recarregar. Não chama serviços externos adicionais. Nenhuma migration necessária.

CSV UTF-8 com BOM, separador ponto e vírgula e valor decimal exato em BRL. Allow-list: nome da campanha (no global), referência externa, situação, valor e datas de criação/confirmação/atualização. Não exporta cliente, contato, CPF, configuração visual, foto, token de checkout ou payload do gateway. Fórmulas de planilha neutralizadas e delimitadores escapados. Resposta attachment/no-store, arquivo `financeiro.csv` no global e nome com UUID validado no relatório legado por campanha.

Sem métricas de participantes: editor público não migrado e prévia privada não é telemetria de participantes. Este relatório é para conferência interna, não relatório de alcance/ativação entregue como se tivesse dados de uso. Escopo atual local; dados financeiros são os registros do gateway configurado (mock por padrão). Há filtros por período e agregação global; não há reconciliação em lote.

## Validação

Ampliação global: typecheck/lint/71 testes e build isolado aprovados em containers. Testes novos cobrem filtros, intervalo completo de São Paulo e CSV global com neutralização de fórmula no nome da campanha. Focal global temporário independente aprovado duas vezes em Chromium: guards anônimo/pré-TOTP, login/TOTP, vazio, duas campanhas/seis pagamentos, filtros individuais/combinados e limites São Paulo, inválidos/repetidos400, download CSV global e legado isolado, navegação e ausência de overflow em320/390/600/768/1440 claro/escuro. Capturas em `/tmp/namarca-financial-review`; desktop claro/mobile escuro observados. Fixtures limpas, container isolado encerrado e serviços principais preservados. Runner `/tmp/namarca-financial-focal.ts` não incorporado à suíte; sem regressão integral/celular físico/gateway real. A evidência abaixo refere-se à versão anterior por campanha.

40 testes unitários/contratos, typecheck/lint, migrations e build aprovados. Runner `scripts/test-campaign-editor.ts` com `FINANCIAL_REPORT_ONLY=1`, na mesma infraestrutura descartável de `docs/editor-testing.md`, valida login/TOTP real isolado, guards anônimo/pré-TOTP, resumo vazio e pagamentos sintéticos pending/paid/refunded, download browser CSV/headers/BOM/UTC, ausência de dados privados e fórmula neutralizada. Execução focal passou; regressão integral do editor ficou bloqueada no trecho referência após upload. Não usar conta/banco principal para rodar.
