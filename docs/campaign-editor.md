# Estúdio da campanha

Disponível em `/admin/campanhas/<UUID>` para campanhas em rascunho e não publicadas. O modelo, a matemática da composição e o editor de foto foram reaproveitados do projeto anterior; não há dependência do Vite nem de diretórios de pacotes locais.

## Operação

1. Abra a campanha pelo nome na listagem.
2. Envie artes PNG com transparência e conteúdo opaco. Envie stickers PNG separadamente.
3. Renomeie e ordene os materiais conforme a galeria desejada. Remover da galeria não apaga fisicamente o arquivo.
4. Selecione uma arte e desenhe, mova ou redimensione o retângulo da área da foto. Os campos numéricos usam pixels da imagem original.
5. Ajuste as cores da experiência.
6. Confira a prévia privada com uma foto do dispositivo, stickers, enquadramento e exportação.
7. Salve a configuração. Upload concluído não equivale a configuração salva; o painel informa alterações pendentes.

A referência limita e recorta a foto. Alpha da arte e retângulo têm responsabilidades distintas; não é inferência automática de área transparente. Logos podem ser cobertos por stickers conforme o comportamento do editor original.

## Dados e segurança

- Metadados em `campaign_editor` (JSONB + revisão) e `campaign_assets` no PostgreSQL.
- PNGs oficiais em `private/campaigns/<UUID>/assets/<UUID>.png` no S3/R2 privado.
- Endpoints `/api/campaigns/<UUID>/editor` e `/assets` exigem administrador com segundo fator. Mutações verificam origem e estado de edição.
- Arquivos servidos por ID e vínculo com a campanha; nenhuma chave S3 arbitrária é aceita do navegador.
- Revisão otimista retorna 409 em salvamentos concorrentes; rascunho em memória não é descartado automaticamente.
- Fotos e composições são exclusivamente locais ao navegador; prévia sem telemetria.
- Prévia em iframe de mesma origem; embedding externo bloqueado por frame-ancestors self. Não é publicação de campanha.

## Limites

PNG até 25 MiB e 40 milhões de pixels no ambiente Node local, validado no servidor (assinatura, CRC, dimensões, pixels transparentes e opacos). A Vercel impõe limites próprios ao corpo da requisição: uploads grandes precisarão de envio direto assinado ao R2 antes de produção. Não prometer suporte a 25 MiB na Vercel com o proxy atual.

Não há publicação, aprovação comercial, criação de cobrança, biblioteca de modelos nem importação automática de materiais do projeto antigo. O editor de composição foi migrado, mas a ferramenta não promete edição acessível por teclado equivalente aos gestos do original. Rascunho sem arte pode ser salvo, mas não abre a composição.

Arquivos retirados da galeria e uploads que não entraram numa configuração podem permanecer privados. Coleta de lixo/backups precisam de política operacional; não apagar materiais automaticamente enquanto houver referências.
