# Aprovação visual de pacotes

Aprovação visual é separada de cobrança e de aprovação comercial. Em detalhes da campanha, o administrador registra quem aprovou, canal e data, além de confirmar autorização de uso dos materiais. Não há login do cliente nem automação de aprovação externa.

## O que é preservado

`campaign_packages` guarda versão sequencial por campanha, revisão do editor, configuração completa derivada da identidade vigente, responsável/canal/data e ID do administrador registrador. A submissão exige confirmação de autorização de uso; o registro atesta essa confirmação, mas não armazena documentos de direitos. Configuração inclui nome/slug/encerramento, tema, ordem, artes, stickers e referências. Não inclui dados comerciais nem fotos de participantes.

Somente inserts pelo fluxo ativo; não há edição/exclusão de aprovação pela UI. Isso não é armazenamento WORM nem impede alteração por operador do banco. Migration `0007_nervous_korath.sql` aditiva, FK restrict preserva vínculo à campanha.

## Regras

- `requireAdmin` no servidor para registrar e abrir a prévia histórica.
- Campanha draft/unpublished, encerramento futuro, configuração salva com ao menos uma arte e sem modo demo.
- Validação estrutural e de ownership do editor; objetos referenciados lidos do storage privado e PNG/dimensões revalidados.
- Formulário informa revisão e identidade esperadas. Servidor bloqueia campanha/editor, compara ambos e rejeita aba desatualizada. Depois de salvar estúdio, recarregar detalhes antes de registrar.
- Data informada é dia civil em São Paulo, armazenada ao meio-dia local, não instante exato da aprovação externa. `createdAt` é instante do registro.
- Última versão idêntica não gera duplicata. Versão nova não muda snapshots anteriores.
- Rascunho continua editável. Não mudar preparationStatus para approved: aprovação se refere ao snapshot, não ao rascunho mutável. UI compara configuração salva com último snapshot e sinaliza divergência.
- Pagamento não publica; aprovação também não publica. Ainda não há gate de publicação implementado.

## Prévia histórica

Link **Revisar pacote vN** abre composição privada usando apenas configuração do snapshot; não aceita atualizações por postMessage do estúdio. Assets privados são os mesmos objetos imutáveis associados à campanha. Remover da galeria não apaga objeto; futuras políticas de limpeza precisam preservar objetos de todas as versões aprovadas. Não há cópia pública dos objetos. Foto e exportação continuam somente no navegador, sem telemetria.

## Limitações

Aprovação é declaração operacional do admin sobre aprovação recebida externamente, não assinatura eletrônica. Não há revogação nesta fatia. Verificações S3/PNG síncronas podem levar tempo com muitos materiais; antes de prometer produção, avaliar limites Vercel e orçamento da transação. Não adicionar worker sem decisão do fundador. Previews históricas exigem autenticação e não são links de cliente.
