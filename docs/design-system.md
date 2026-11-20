# UI Namarca — referência Revolut

Referência visual de toda a aplicação: [`revolut.design.md`](revolut.design.md) (alpha, 12/05/2026), copiada integralmente do arquivo fornecido pelo fundador. Este documento registra a adaptação à Namarca, não uma reprodução da marca Revolut.

## Como usar o guia

1. Leia a referência original e este contrato antes de criar ou alterar telas, componentes e estados.
2. Use a referência para cores, tipografia, formas, contraste e hierarquia; use os tokens/componentes compartilhados da aplicação para implementá-los de modo consistente.
3. A referência descreve marketing e não especifica um app administrativo completo. As adaptações operacionais documentadas aqui prevalecem nesses casos: densidade, navegação, formulários, acessibilidade e persistência de estado.
4. Novas exceções devem ter motivo funcional e ser registradas aqui; não inventar uma identidade independente por tela.
5. A direção vale para toda a aplicação, mas não autoriza sobrescrever as cores escolhidas para campanhas, comprometer QR/transparência, alterar regras de negócio ou migrar/publicar o editor público anterior. A implementação existente foi aplicada ao administrativo, autenticação e checkout; outras superfícies devem ser avaliadas explicitamente ao serem trabalhadas.

A cópia de referência permanece integral; decisões específicas da Namarca ficam neste documento.

## Sistema

- Canvas claro `#ffffff`; canvas escuro `#000000`; superfície escura `#16181a`.
- Header preto nos dois temas, com texto branco; menu centralizado entre colunas laterais iguais, marca à esquerda e ações à direita. Até600px, menu centralizado na segunda linha. Área operacional respeita a preferência claro/escuro existente. A alternância preto/branco é estrutural, não um gradiente.
- Texto claro `#191c1f`, secundário `#505a63`, borda `#e2e2e7`; no escuro texto branco, secundário branco a 72%, borda branca a 12%.
- Texto de marca usa `--brand-text`: #494fdf no claro, #a4a8ff no escuro; superfície cobalto e texto branco continuam distintos. Auditoria e exceções: `docs/color-audit.md`.
- Cobalto `#494fdf` identifica seleção ativa (tabs, filtros, material), símbolos de campanha e um destaque financeiro para tentativas pagas. Não representa publicação, saldo ou autorização. CTAs principais continuam preto/branco. Erros mantêm cor semântica legível e mensagem textual.
- Primário preto no claro e branco no escuro. Botões em pílula (`9999px`), campos `12px`, painéis/modais `20px`, dispositivo da prévia `28px`. Campos inline de nome e controles do canvas preservam geometria específica.
- Sem sombras decorativas. Profundidade por superfície, borda e overlay modal; seleção da arte tem contorno cobalto explícito. Cartões de campanha usam superfície suave; monogramas de clientes são circulares; campos e ações secundárias usam superfície tonal.
- Escala operacional: título de diretório 40px/500 (32px mobile), seção 20px/500; título compacto da campanha preservado. Não usar títulos de marketing de 80–136px em formulários/tabelas.
- Ações do workspace 48px no desktop e pelo menos 44px no mobile; filtros compactos preservados. Campos administrativos 40px, autenticação 56px, checkout com CTA 48px. Emitir link de cobrança usa40px acima760px com pointer:fine para alinhar aos campos adjacentes; toque mantém alvo maior. Ações dentro das tabelas de Cobranças/Tentativas usam32px, fonte12px e padding compacto apenas acima760px com pointer:fine; mobile/toque preservam os alvos maiores. Exceções de geometria não devem atingir os controles da foto.
- Aeonik Pro não foi licenciada nem incluída. Stack Inter/Inter Display quando disponível localmente, seguida por fontes de sistema; não há download de fontes ou garantia de métricas idênticas à referência.
- Hover discreto de cor/borda, feedback de pressão existente, foco visível e `prefers-reduced-motion` preservados. Sem animações automáticas de marketing ou seções de uma tela inteira.

## Composição operacional

- Campanha é um workbench: cabeçalho enxuto apenas com voltar, nome e situação. Cliente, encerramento e endereço ficam em Detalhes, sem resumo duplicado ou aviso permanente de publicação no topo. Não há cartão de resumo separado. Navegação lateral no desktop acima de1100px; no celular/tablet, trilho horizontal antes do painel. Mesmos botões/painéis, sem duplicação de estúdio. Ícones, seleção cobalto, pendência com ponto discreto e descrição acessível, ARIA com orientação responsiva e setas/Home/End. Setas cima/baixo também navegam; painéis persistentes preservam rascunhos e iframe.
- Campanhas são diretório operacional de linhas, não grade de cards. Busca primeiro, filtros com `aria-pressed`, nome/cliente/slug agrupados, preparação e publicação explicitamente separados, encerramento e abertura44px. Mobile empilha sem tabela larga. Valor legado de campanha não aparece: não equivale ao total das cobranças.
- Clientes: busca independente da lista, aviso de privacidade preservado; linha toda navegável com monograma circular e contagem.
- Detalhes da campanha separa Evento e Cliente/observações em grupos de superfície independentes. Rodapé mantém salvamento próprio; não há salvar tudo.
- Cobrança: emissão horizontal no topo e registros abaixo, usando toda a largura do painel. Descrição flexível, valor e CTA ao lado quando couber; empilhamento por largura disponível. Tentativas agrupam descrição/referência na primeira coluna, sem coluna técnica concorrente. Desktop usa colunas de largura automática e tabela mínima980px com rolagem interna quando necessário, preservando valores/datas/situações/ações em uma linha; descrições e referências longas podem quebrar. Em celular (até760px) tabelas têm apresentação em blocos rotulados, sem largura mínima ou rolagem horizontal. Compartilhamento compacto oferece Copiar link e botão de mais opções na mesma linha; menu Radix em portal para abrir checkout/copiar mensagem sem expandir a linha ou ser cortado pelo scroll. Sucesso da consulta aparece no próprio botão e em região acessível, sem faixa adicional; erros permanecem visíveis. Badges não quebram; no mobile a situação ocupa a largura inteira do bloco.
- Financeiro: resumo do recorte antes dos filtros/histórico; pagas primeiro em superfície cobalto e coluna ampliada no desktop. Filtros GET num details, recolhido sem filtros e aberto quando ativos/inválidos. Inválidos não mostram totais0 como resultado válido. Ordem do DOM corresponde à leitura visual; consultas/CSV/valores inalterados.
- Escopo desta revisão de componentes é administrativo. Login e checkout mantêm o tratamento da rodada anterior; não afirmar reconstrução completa dessas jornadas.

## Pendência de salvamento

Abas indicam pendência com ponto6px em currentColor e aria-describedby “Alterações não salvas”, sem selo textual largo. No painel, Detalhes/Artes/Figurinhas/Cores exibem estado junto de Salvar: Alterações não salvas / Salvando… / check+Salvo por3,5s após confirmação real do servidor. Área textual reservada evita mudança de altura; estado limpo não repete mensagem. Cada seção limpa somente sua pendência; navegação, recuperação, guard de saída e erros existentes permanecem. Cobrança sinaliza rascunho na aba, mas continua tendo emissão explícita em vez de botão fictício de salvar.

## Aba Cores

Painel de ajustes em linhas, não mosaico de grandes cartões coloridos. Cabeçalho20px/500 com descrição curta e Restaurar padrão secundário pill. Superfície tonal única20px, linhas separadas por hairline: amostra circular48px (44mobile), nome/uso e HEX em campo12px. Mobile HEX abaixo da descrição, sem comprimir nome/amostra. Cor configurável aparece apenas na amostra e na prévia; textos/controles usam tokens administrativos e não dependem do contraste da cor selecionada. Seletor nativo e HEX mantêm teclado/foco/disabled/aria-invalid, entrada incompleta reverte ao blur; restaurar exige confirmação e salvar continua explícito no rodapé.

## Tema inicial das campanhas

Defaults compartilhados do editor: Fundo #ffffff, Painéis #dedede, Destaque #494fdf, Texto #191c1f, alinhados à identidade Namarca. Valem para nova configuração, tema ausente e Restaurar padrão; temas explícitos já salvos não são migrados nem sobrescritos. Preferência claro/escuro administrativa não troca automaticamente as cores da campanha.

## Prévia vazia

Sem arte, a prévia privada mantém PhotoEditor/EditorWorkspace reais: menu, ajuda, histórico (desabilitado), Artes e Stickers visíveis. Apenas a área da composição mostra quadriculado12px neutro, sem instrução textual; Foto/Salvar e adicionar sticker ficam desabilitados sem composição. Cores do shell continuam da campanha. Bridge envia adminTheme como enum light/dark para o quadriculado usar os neutros das thumbs (#e2e2e7/#fff ou branco12%/#16181a); não aceita CSS arbitrário. Ao remover última arte, limpa composição/histórico e invalida leitura pendente; ao adicionar a primeira, carrega normalmente sem remontar iframe/PhotoEditor. CSS do vazio é exclusivo da entrada privada; contrato público continua exigindo arte.

## Bibliotecas vazias

Artes/Figurinhas vazias usam bloco centralizado, com título/descrição/ação centralizados, largura máxima420px e respiro vertical40px, sem caixa tracejada, Inbox ou altura mínima decorativa. Cabeçalho permanece à esquerda e salvamento no rodapé. Artes convida à primeira arte; Figurinhas informa que é opcional. PNG/transparência/25MiB/envio ao salvar permanecem explícitos. Uma única ação de adicionar no vazio; após primeiro material, ação volta ao cabeçalho. Mesmo input múltiplo/disabled/foco/fluxo local existente; não sugere drag-and-drop.

## Feedback de envio de materiais

Artes e Figurinhas usam feedback integrado ao rodapé, sem cartão aninhado, brilho, percentual por arquivo ou trilho de etapas. Preparação e confirmação final mostram um status textual; durante upload, contagem real de arquivos processados e barra fina (não representa bytes nem sucesso). Envio sequencial (um arquivo por vez), com nome e situação do arquivo atual sempre visíveis, sem details/expansão. Falhas também permanecem visíveis enquanto a fila continua. Nomes longos truncados com title, rolagem interna focável. Falhas preservam detalhes e envios concluídos; Tentar novamente usa o salvamento existente, sem reenviar sucessos confirmados. Erros específicos e conflitos permanecem visíveis. Sucesso remove o progresso e usa apenas SaveStatus junto ao botão após confirmação do servidor. Seleção local não mostra progresso de upload. Movimento reduzido desativa spinner/transições; tokens compartilhados nos dois temas.

## Selects e datas

- Formulários ativos do administrativo usam Select shadcn/Radix e DatePicker composto de Calendar+Popover shadcn, com calendário em português. Campos legados não usados nas rotas ativas não fazem parte da migração.
- Wrappers compartilhados em `admin-workspace/form-controls.tsx` mantêm names/FormData, datas locais YYYY-MM-DD (sem conversão UTC) e eventos change para observar rascunhos. Campanha controla data/cliente para recuperar rascunhos e aplicar valores salvos; filtros financeiros preservam GET e permitem limpar datas.
- Portais recebem ui-scope/dark explicitamente, tokens compartilhados e min-height0. CSS do calendário neutraliza tabela/botões globais legados. Campo de data obrigatório mantém validação HTML em controle auxiliar e abre calendário quando inválido; servidor continua autoridade.

## Limites de implementação

Fonte dos tokens: `src/app/ui.css`; composições operacionais em `src/components/admin-workspace/workspace.css` e `studio.css`. Checkout mantém CSS próprio em `src/app/checkout/[token]/checkout.css`: canvas preto e card branco, sem herdar navegação/admin/auth.

Não alterar a preferência de tema das campanhas, quadriculado de transparência, iframe ou `packages/editor` para impor o tema administrativo. Não usar layout/cores como controle de autorização. Fluxos, labels e avisos financeiros permanecem funcionais, sem adicionar promessas de publicação.

`tests/revolut-ui.test.ts` cobre contratos de código-fonte, não aparência nem acessibilidade completa no navegador. As evidências de browser e limites de cada rodada constam em `docs/CONTINUIDADE.md`.
