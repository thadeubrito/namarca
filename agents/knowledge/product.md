# Namarca — visão do produto

## Propósito e posicionamento

Namarca é uma ativação digital para antes, durante e depois de eventos. A prioridade comercial é o pré-evento, por orientação do fundador — não por evidência de uso já medida. O participante combina sua foto com identidade oficial e figurinhas para anunciar participação, criar expectativa e compartilhar sua experiência.

Não posicionar como souvenir, lembrança ou recordação. Não prometer alcance, inscrições, vendas ou postagem em redes sociais. Exportar uma imagem não comprova compartilhamento nem pessoa única.

Corridas são o foco inicial, não um limite técnico ou definitivo do produto. **Campanha** é o nome da entidade; evento é seu contexto.

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

- Produção pretendida: administrativo Next na Vercel, PostgreSQL gerenciado, R2 e PixGo, com entrega pública estática independente. É direção, não autorização de provisionamento/deploy nem homologação financeira.
- Autosserviço de clientes pode ser uma evolução posterior; não faz parte da V1 atual.
- Métricas de participantes e relatório de ativação ainda precisam de implementação/escopo. Financeiro não substitui resultados de participação.
- Oferta, preço, condições comerciais, regras de cancelamento/reembolso, termos/privacidade e comunicação jurídica/fiscal do recebimento DePix precisam de decisão externa ao código.
- Migração do público antigo em produção depende de autorização e preparação explícitas.

Este arquivo descreve intenção e limites do produto. Estado implementado e problemas abertos ficam em [memory.md](memory.md); localização técnica em [code-map.md](code-map.md). Não transformar direção futura em tarefa autorizada.
