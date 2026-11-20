# UI Namarca — referência Revolut

Referência fornecida pelo fundador: `~/Desktop/revolut.design.md` (alpha, 12/05/2026). Aplicação ao administrativo, autenticação e checkout; não é uma reprodução da marca Revolut nem uma migração do editor público.

## Sistema

- Canvas claro `#ffffff`; canvas escuro `#000000`; superfície escura `#16181a`.
- Header preto nos dois temas, com texto branco; menu centralizado entre colunas laterais iguais, marca à esquerda e ações à direita. Até600px, menu centralizado na segunda linha. Área operacional respeita a preferência claro/escuro existente. A alternância preto/branco é estrutural, não um gradiente.
- Texto claro `#191c1f`, secundário `#505a63`, borda `#e2e2e7`; no escuro texto branco, secundário branco a 72%, borda branca a 12%.
- Texto de marca usa `--brand-text`: #494fdf no claro, #a4a8ff no escuro; superfície cobalto e texto branco continuam distintos. Auditoria e exceções: `docs/color-audit.md`.
- Cobalto `#494fdf` identifica seleção ativa (tabs, filtros, material), símbolos de campanha e um destaque financeiro para tentativas pagas. Não representa publicação, saldo ou autorização. CTAs principais continuam preto/branco. Erros mantêm cor semântica legível e mensagem textual.
- Primário preto no claro e branco no escuro. Botões em pílula (`9999px`), campos `12px`, painéis/modais `20px`, dispositivo da prévia `28px`. Campos inline de nome e controles do canvas preservam geometria específica.
- Sem sombras decorativas. Profundidade por superfície, borda e overlay modal; seleção da arte tem contorno cobalto explícito. Cartões de campanha usam superfície suave; monogramas de clientes são circulares; campos e ações secundárias usam superfície tonal.
- Escala operacional: título de diretório 40px/500 (32px mobile), seção 20px/500; título compacto da campanha preservado. Não usar títulos de marketing de 80–136px em formulários/tabelas.
- Ações do workspace 48px no desktop e pelo menos 44px no mobile; filtros compactos preservados. Campos administrativos 40px, autenticação 56px, checkout com CTA 48px. Exceções de geometria não devem atingir os controles da foto.
- Aeonik Pro não foi licenciada nem incluída. Stack Inter/Inter Display quando disponível localmente, seguida por fontes de sistema; não há download de fontes ou garantia de métricas idênticas à referência.
- Hover discreto de cor/borda, feedback de pressão existente, foco visível e `prefers-reduced-motion` preservados. Sem animações automáticas de marketing ou seções de uma tela inteira.

## Composição operacional

- Campanha é um workbench: contexto integrado ao cabeçalho, com nome/situação, cliente e encerramento alinhados, slug reservado visível também no celular e aviso de publicação secundário. Não há cartão de resumo separado. Navegação lateral no desktop acima de1100px; no celular/tablet, trilho horizontal antes do painel. Mesmos botões/painéis, sem duplicação de estúdio. Ícones, seleção cobalto, pendência textual, ARIA com orientação responsiva e setas/Home/End. Setas cima/baixo também navegam; painéis persistentes preservam rascunhos e iframe.
- Campanhas são diretório operacional de linhas, não grade de cards. Busca primeiro, filtros com `aria-pressed`, nome/cliente/slug agrupados, preparação e publicação explicitamente separados, encerramento e abertura44px. Mobile empilha sem tabela larga. Valor legado de campanha não aparece: não equivale ao total das cobranças.
- Clientes: busca independente da lista, aviso de privacidade preservado; linha toda navegável com monograma circular e contagem.
- Detalhes da campanha separa Evento e Cliente/observações em grupos de superfície independentes. Rodapé mantém salvamento próprio; não há salvar tudo.
- Cobrança: emissão horizontal no topo e registros abaixo, usando toda a largura do painel. Descrição flexível, valor e CTA ao lado quando couber; empilhamento por largura disponível. Tentativas agrupam descrição/referência na primeira coluna, sem coluna técnica concorrente. Em celular (até760px) tabelas têm apresentação em blocos rotulados, sem rolagem horizontal. Compartilhamento compacto oferece Copiar link imediatamente e Mais opções expansível para abrir checkout/copiar mensagem, mantendo sucesso/erro acessível e sem menus que cortem no scroll da tabela.
- Financeiro: resumo do recorte antes dos filtros/histórico; pagas primeiro em superfície cobalto e coluna ampliada no desktop. Filtros GET num details, recolhido sem filtros e aberto quando ativos/inválidos. Inválidos não mostram totais0 como resultado válido. Ordem do DOM corresponde à leitura visual; consultas/CSV/valores inalterados.
- Escopo desta revisão de componentes é administrativo. Login e checkout mantêm o tratamento da rodada anterior; não afirmar reconstrução completa dessas jornadas.

## Limites de implementação

Fonte dos tokens: `src/app/ui.css`; composições operacionais em `src/components/admin-workspace/workspace.css` e `studio.css`. Checkout mantém CSS próprio em `src/app/checkout/[token]/checkout.css`: canvas preto e card branco, sem herdar navegação/admin/auth.

Não alterar a preferência de tema das campanhas, quadriculado de transparência, iframe ou `packages/editor` para impor o tema administrativo. Não usar layout/cores como controle de autorização. Fluxos, labels e avisos financeiros permanecem funcionais, sem adicionar promessas de publicação.

`tests/revolut-ui.test.ts` cobre contratos de código-fonte, não aparência nem acessibilidade completa no navegador. As evidências de browser e limites de cada rodada constam em `docs/CONTINUIDADE.md`.
