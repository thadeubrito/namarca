# Resumo financeiro administrativo

Disponível em detalhes da campanha → **Ver resumo financeiro e exportar CSV**. Página `/admin/campanhas/[id]/financeiro` e download `GET /api/campaigns/[id]/financial-report` exigem `requireAdmin` independentemente do layout.

Mostra quantidade e valor nominal separado para pending, paid, expired, cancelled e refunded. Reembolso não entra no total atualmente pago; tentativas não representam novas vendas. Não há total denominado saldo, lucro ou receita líquida: taxas, conversão e liquidação DePix não são modeladas. Datas da tela em São Paulo; CSV UTC explícito. `paidAt` é confirmação registrada localmente, não liquidação bancária.

O relatório é leitura do banco, não consulta implícita ao gateway. Estado pode estar desatualizado se callback se perder: usar consulta na PixGo na campanha e recarregar. Não chama serviços externos adicionais. Nenhuma migration necessária.

CSV UTF-8 com BOM, separador ponto e vírgula e valor decimal exato em BRL. Allow-list: referência externa, situação, valor e datas de criação/confirmação/atualização. Não exporta cliente, contato, CPF, configuração visual, foto, token de checkout ou payload do gateway. Fórmulas de planilha neutralizadas e delimitadores escapados. Resposta attachment/no-store e nome de arquivo com UUID validado.

Sem métricas de participantes: editor público não migrado e prévia privada não é telemetria de participantes. Este relatório é para conferência interna, não relatório de alcance/ativação entregue como se tivesse dados de uso. Escopo atual local; dados financeiros são os registros do gateway configurado (mock por padrão). Sem filtro por período, agregação geral ou reconciliação em lote nesta etapa.

## Validação

40 testes unitários/contratos, typecheck/lint, migrations e build aprovados. Runner `scripts/test-campaign-editor.ts` com `FINANCIAL_REPORT_ONLY=1`, na mesma infraestrutura descartável de `docs/editor-testing.md`, valida login/TOTP real isolado, guards anônimo/pré-TOTP, resumo vazio e pagamentos sintéticos pending/paid/refunded, download browser CSV/headers/BOM/UTC, ausência de dados privados e fórmula neutralizada. Execução focal passou; regressão integral do editor ficou bloqueada no trecho referência após upload. Não usar conta/banco principal para rodar.
