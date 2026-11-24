# Namarca — visão do produto

## Propósito e posicionamento

Namarca é uma ativação digital para campanhas de marketing, apresentada institucionalmente como **boca a boca digital**: “Sua campanha. As pessoas ajudam a divulgar.” Participação e pertencimento motivam a pessoa; a divulgação voluntária é o valor para quem contrata. Com a própria foto, molduras e figurinhas, cada pessoa cria uma imagem, salva no dispositivo e, se quiser, compartilha nas redes sociais. Não se trata de recomendação ou endosso, nem de uma comunidade com cadastro ou coleta de fotos.

O institucional fala com o contratante: a equipe configura a campanha de forma assistida, o cliente compartilha o link e o participante compõe e exporta no navegador, sem cadastro nem aplicativo. Eventos são um contexto de uso antes, durante e depois; nesse contexto, a prioridade comercial continua sendo o pré-evento, por orientação do fundador — não por evidência de uso já medida.

Não posicionar como souvenir, lembrança ou recordação. Não prometer alcance, inscrições, vendas ou postagem em redes sociais. Exportar uma imagem não comprova compartilhamento nem pessoa única.

Corridas são um foco inicial de uso, não um limite técnico, definitivo ou da comunicação institucional. **Campanha** é o nome da entidade; evento é um possível contexto.

## Públicos e responsabilidades

- **Organizador/cliente:** contrata a ativação e divulga o endereço/QR da campanha. Não tem conta no produto na V1.
- **Administrador:** cadastra clientes e campanhas, prepara materiais, define prazo e cores, emite cobranças e decide explicitamente quando publicar ou suspender.
- **Participante:** acessa sem cadastro, escolhe arte, compõe sua foto com figurinhas e exporta no próprio navegador. Não há postagem automática.

A proposta é transformar uma operação técnica/manual em uma entrega repetível, sem transformar o organizador em operador de um editor administrativo.

## Jornada pretendida da V1

1. Administrador cria a campanha e, se necessário, vincula um cliente leve.
2. Prepara artes, figurinhas, área da foto, cores e encerramento; confere a prévia.
3. Emite cobranças conforme o combinado e acompanha o financeiro.
4. Publica explicitamente uma versão salva, disponibilizando o endereço para divulgação.
5. Participantes compõem e exportam localmente durante o prazo de acesso.
6. Administrador acompanha e entrega resultados quando houver medição implementada.

Cobrança e publicação são jornadas independentes: pagamento não publica e publicação não exige pagamento. A ordem comercial pode variar; não recriar uma etapa de aprovação como requisito.

## Escopo e princípios

- V1 operada pelo administrador; não antecipar autosserviço/multiusuário de clientes ou SaaS completo.
- Cliente é nome e contato opcional, reutilizável entre campanhas; não é CRM, contrato ou identidade de pagador.
- Foto e composição do participante ficam no navegador. Materiais da campanha podem ser enviados e publicados pelo administrador.
- Salvar altera o rascunho; publicar altera a versão pública. O organizador deve poder continuar editando sem mudar o conteúdo já divulgado.
- Publicação, suspensão e encerramento são conceitos distintos. Suspensão não pausa prazo nem apaga arquivos já divulgados.
- Cobranças têm descrição e valores próprios congelados; adicionais não alteram pagamentos anteriores. Não há tabela comercial definitiva a ser inferida do código legado.
- Aprovação visual/comercial e contratação estruturada foram retiradas do fluxo ativo. Tabelas legadas não autorizam reintroduzir essas etapas.
- Desenvolvimento local reproduzível, sem serviços pagos obrigatórios; confirmação financeira síncrona, sem worker/cron.

## Direção futura e decisões abertas

- Produção pretendida: uma aplicação Next na Vercel para institucional, campanhas, administrativo e checkout, com PostgreSQL gerenciado, R2 para imagens e PixGo. Separação de hosts não implica deploys separados. É direção, não autorização de provisionamento/deploy nem homologação financeira.
- Autosserviço de clientes pode ser uma evolução posterior; não faz parte da V1 atual.
- Métricas de participantes e relatório de ativação ainda precisam de implementação/escopo. Financeiro não substitui resultados de participação.
- Oferta, preço, condições comerciais, regras de cancelamento/reembolso, termos/privacidade e comunicação jurídica/fiscal do recebimento DePix precisam de decisão externa ao código.
- Migração do público antigo em produção depende de autorização e preparação explícitas.

Este arquivo descreve intenção e limites do produto. Estado implementado e problemas abertos ficam em [memory.md](memory.md); localização técnica em [code-map.md](code-map.md). Não transformar direção futura em tarefa autorizada.
