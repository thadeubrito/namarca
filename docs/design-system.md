# UI Namarca — referência Revolut

Referência fornecida pelo fundador: `~/Desktop/revolut.design.md` (alpha, 12/05/2026). Aplicação ao administrativo, autenticação e checkout; não é uma reprodução da marca Revolut nem uma migração do editor público.

## Sistema

- Canvas claro `#ffffff`; canvas escuro `#000000`; superfície escura `#16181a`.
- Header preto nos dois temas, com texto branco; área operacional respeita a preferência claro/escuro existente. A alternância preto/branco é estrutural, não um gradiente.
- Texto claro `#191c1f`, secundário `#505a63`, borda `#e2e2e7`; no escuro texto branco, secundário branco a 72%, borda branca a 12%.
- Cobalto `#494fdf` identifica seleção ativa (tabs, filtros, material), símbolos de campanha e um destaque financeiro para tentativas pagas. Não representa publicação, saldo ou autorização. CTAs principais continuam preto/branco. Erros mantêm cor semântica legível e mensagem textual.
- Primário preto no claro e branco no escuro. Botões em pílula (`9999px`), campos `12px`, painéis/modais `20px`, dispositivo da prévia `28px`. Campos inline de nome e controles do canvas preservam geometria específica.
- Sem sombras decorativas. Profundidade por superfície, borda e overlay modal; seleção da arte tem contorno cobalto explícito. Cartões de campanha usam superfície suave; monogramas de clientes são circulares; campos e ações secundárias usam superfície tonal.
- Escala operacional: título de diretório 40px/500 (32px mobile), seção 20px/500; título compacto da campanha preservado. Não usar títulos de marketing de 80–136px em formulários/tabelas.
- Ações do workspace 48px no desktop e pelo menos 44px no mobile; filtros compactos preservados. Campos administrativos 40px, autenticação 56px, checkout com CTA 48px. Exceções de geometria não devem atingir os controles da foto.
- Aeonik Pro não foi licenciada nem incluída. Stack Inter/Inter Display quando disponível localmente, seguida por fontes de sistema; não há download de fontes ou garantia de métricas idênticas à referência.
- Hover discreto de cor/borda, feedback de pressão existente, foco visível e `prefers-reduced-motion` preservados. Sem animações automáticas de marketing ou seções de uma tela inteira.

## Composição operacional

- Navegação da campanha em trilho segmentado pill com ícones, indicador preenchido cobalto e pendência textual. ARIA, setas/Home/End e montagem persistente são preservados; telas estreitas rolam o trilho, não a página. Não são underline tabs shadcn.
- Filtros do diretório são grupo segmentado com `aria-pressed`, não tabs fictícias. Cards têm símbolo de campanha, situação, nome dominante e ação circular de abertura.
- Clientes: busca independente da lista, aviso de privacidade preservado; linha toda navegável com monograma circular e contagem.
- Financeiro: pagas vêm primeiro em superfície cobalto e coluna ampliada no desktop; outras situações permanecem separadas e neutras. Ordem do DOM corresponde à leitura visual. Não altera valores, filtros ou exportação.
- Escopo desta revisão de componentes é administrativo. Login e checkout mantêm o tratamento da rodada anterior; não afirmar reconstrução completa dessas jornadas.

## Limites de implementação

Fonte dos tokens: `src/app/ui.css`; composições operacionais em `src/components/admin-workspace/workspace.css` e `studio.css`. Checkout mantém CSS próprio em `src/app/checkout/[token]/checkout.css`: canvas preto e card branco, sem herdar navegação/admin/auth.

Não alterar a preferência de tema das campanhas, quadriculado de transparência, iframe ou `packages/editor` para impor o tema administrativo. Não usar layout/cores como controle de autorização. Fluxos, labels e avisos financeiros permanecem funcionais, sem adicionar promessas de publicação.

`tests/revolut-ui.test.ts` cobre contratos de código-fonte, não aparência nem acessibilidade completa no navegador. As evidências de browser e limites de cada rodada constam em `docs/CONTINUIDADE.md`.
