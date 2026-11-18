# Clientes e dados comerciais — V1 leve

## Fluxo atual

No formulário de criação/edição da campanha:

- Nome, endereço e encerramento já existentes.
- **Valor da campanha**: único valor editável, opcional enquanto não definido.
- **Cliente**: vínculo opcional a um cliente existente, ou opção **+ Cadastrar novo cliente** no próprio formulário.
- Novo cliente exige apenas **nome** (organização ou pessoa, 2–160 caracteres); contato opcional (e-mail ou WhatsApp em texto livre, até 254).
- **Observações do combinado**: opcionais, até 3000 caracteres, pertencem à campanha.

Cliente não tem conta, login, CPF/CNPJ, endereço, contrato ou responsáveis múltiplos. Pode ser reutilizado por várias campanhas. Nome e contato são dados do cliente; valor, prazo e observações são da campanha. Nesta entrega não há tela separada de gestão/edição/exclusão de clientes. Para desvincular, selecionar **Sem cliente vinculado**; isso não apaga o cliente nem afeta outras campanhas.

Cadastro inline só é persistido ao salvar a campanha, na mesma transação. Falhas de validação, conflito de slug e campanha bloqueada não deixam cliente parcialmente criado. Cliente existente é consultado no banco; IDs inexistentes são rejeitados. Actions exigem requireAdmin, inclusive no servidor. Dados internos nunca devem integrar o manifesto público; não inserir CPF, credenciais ou dados de participantes.

Salvar não gera cobrança. Cobranças existentes mantêm seu próprio `amountCents`: editar campanha não altera pagamentos. Futura emissão deve congelar valor na tentativa, sem depender de contratos legados. Aprovação das artes/pacote permanece pendente, separada do cliente.

## Preservação

- Migration 0004 adicionou textos simples e preservou contratos anteriores.
- Migration `0005_sloppy_silk_fever.sql` cria `clients` e FK opcional `campaigns.clientId`. Migra nomes/contatos antigos, compartilhando apenas pares nome+contato idênticos após trim. Contato sem nome recebe nome explícito `Cliente migrado (revisar nome)`.
- Campos antigos `campaigns.organizer/contact` permanecem preservados, sem uso no formulário; não sincronizam mais com clientes.
- Tabelas `campaign_contracts`/`contract_approvals` continuam somente para preservação histórica, sem UI/actions. Não reintroduzir contratos/versionamento comercial como condição para cobrar.
- Não há deduplicação automática por nome: homônimos podem ser clientes distintos. A escolha do cliente existente evita duplicação durante operação normal.

## Validação

28 testes, typecheck, lint, migrations e build aprovados. Runner isolado `scripts/test-campaign-editor.ts` valida criação da campanha sem cliente, cadastro inline, reload do vínculo, reuso na segunda campanha, desvinculação sem apagar cliente, preço único e estado draft/unpublished; inclui regressão do editor/exportação e autenticação real em base descartável. Primeira execução teve timeout no trecho da referência do estúdio; repetição passou integralmente. O 422 com materiais reais permanece não investigado.
