# Lista vigente — conclusão local da V1

Esta lista substitui o backlog histórico da seção 9 de `CONTINUIDADE.md`.
Escopo confirmado em 18/11/2026: administrativo local, serviços Docker e pagamentos mock. Deploy/implantação em produção não faz parte da lista de tarefas desta entrega.

## Concluído no código

- [x] Autenticação administrativa com senha, TOTP e recuperação, sem cadastro público.
- [x] Campanhas e cliente leve reutilizável, cadastro inline e observações; sem contratos ativos.
- [x] Seção Clientes com listagem/busca, cadastro/edição e campanhas vinculadas; guards servidor e integração Chromium focal aprovada.
- [x] Estúdio privado, referências independentes, cores, múltiplas artes/stickers, ordenação e remoção.
- [x] Prévia estática isolada e exportação local, sem upload de foto/composição nem telemetria; editor/estilos únicos para público local e prévia em `packages/editor`. Paridade Chromium local validada; público antigo não migrado (ver `editor-runtime.md`).
- [x] Proteção do rascunho em links, unload e dados base.
- [x] Aprovação visual e prévia histórica removidas do frontend/backend por decisão de 19/11/2026; tabela legada preservada somente para retenção.
- [x] Checkout mock com link opaco, nome/valor congelados e tentativas persistidas.
- [x] Confirmação financeira síncrona, recuperação de criação incerta e consulta manual no mock.
- [x] Copiar link e mensagem de cobrança sem API WhatsApp; feedback de sucesso/falha.
- [x] Resumo financeiro por campanha e CSV protegido, sem dados do pagador.
- [x] Mensagens seguras para upload rejeitado, sem alterar política de PNG.
- [x] Validação desta entrega: typecheck, lint, 43 testes, migrations em banco descartável e build isolado.
- [x] Regressão integral Chromium histórica: uploads, cobrança emitida na UI, cópia, financeiro, dirty, galerias, exportação e clientes. Ainda não repetida após remoção da aprovação visual.

## Pendências locais de cobertura / confiabilidade

- [ ] Conferir visualmente o admin mais compacto em desktop/celular; textos e densidade ajustados, validação automatizada aprovada, sem novo teste de navegador nesta revisão.

- [ ] Cobrir por cliques reais os botões administrativos de consulta de pagamento e recuperação de criação incerta. A lógica tem integração mock; emissão e cópia já têm cobertura UI.
- [ ] Investigar a intermitência do runner de referência/galeria: nesta sessão uma execução integral falhou e a seguinte passou. Não considerar repetição como correção.
- [ ] Ampliar fixtures para proporções variadas e PNGs de ferramentas comuns; atuais cenários browser usam imagens quadradas sintéticas.
- [ ] Ampliar testes dos caminhos de navegação dirty (links/unload/voltar), além do submit já exercitado.

## Dependem de autorização, material ou decisão — não declarar concluídos

- Diagnóstico do 422 com material real: investigação explicitamente adiada anteriormente. Melhor mensagem não é diagnóstico.
- Validação de gestos em celular físico e com materiais autorizados do fundador.
- [x] Plano A: seleção local, upload ao salvar em até três requisições, recuperação IndexedDB após refresh, exclusão após save dos removidos e varredura manual com retenção de históricos e janela de 24h. Sem rotina automática. Ver `campaign-editor.md`.
- Política operacional de backups/retenção de longo prazo permanece pendente; recuperação local não é backup.
- Reemissão/revogação de links, CNPJ e regras de cancelamento/reembolso: não impor decisões comerciais nem inventar operações do gateway.
- Oferta/preço, condições jurídicas/DePix e processo fiscal: decisões externas ao desenvolvimento local.

## Fora do escopo ativo

Deploy, provisionamento e implantação em produção foram retirados da lista de tarefas a pedido do fundador. Não houve publicação, push, serviços pagos nem chamada PixGo real.

Publicação local sem exigir pagamento foi autorizada em20/11/2026 e implementada no novo aplicativo: snapshot, entrega de PNGs versionados/event.json no storage, host público independente do Next/DB e encerramento no runtime compartilhado (ver publication.md). Atualizações versionadas e suspensão/reativação independentes estão implementadas localmente: publicar alterações preserva a suspensão; reativar libera a última versão publicada. Migração/deploy do público antigo e métricas/relatório de participantes continuam pendentes. O financeiro atual não substitui métricas de participantes. Para retomar essa jornada, confirmar arquitetura e autorização de publicação em pedido específico.

**Status honesto:** o núcleo administrativo local está implementado, mas ainda há cobertura/confiabilidade e validações acima. Não equivale a “100% da jornada pública” nem a aceite de produção.
