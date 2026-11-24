# Design administrativo — Namarca

Diretriz vigente para o administrativo e shell do estúdio. Leia também [revolut.design.md](revolut.design.md), referência integral fornecida pelo fundador: direção visual administrativa, não especificação de funcionalidades da Revolut nem referência automática para o público.

Login/TOTP e checkout preservam provisoriamente o tratamento existente descrito aqui; sua associação visual definitiva deve ser confirmada antes de redesenhar essas jornadas. Ser rota pública não define por si só a linguagem visual do checkout.

Para site institucional, campanha e conteúdo da prévia React, consultar [public.md](public.md). O dispositivo/controles externos da prévia seguem este documento; seu conteúdo reproduz a experiência da campanha. Componentes/tokens locais prevalecem sobre marketing em densidade, acessibilidade e operação.

## Fontes de implementação

- Tokens/tema: `src/app/ui.css`; estilos globais legados não são a fonte para novas paletas.
- Composições: `src/components/admin-workspace/{workspace,studio}.css` e primitives compartilhados.
- Campos/portais: `admin-workspace/form-controls.tsx`, componentes locais shadcn/Radix e `components/ui/alert-dialog.tsx`.
- Checkout: `src/app/checkout/[token]/checkout.css`, separado do shell administrativo.
- Editor: `src/editor`; prévia privada em `src/editor/CampaignPreview.tsx`. Não impor tema administrativo à campanha.

Código é a fonte de medidas detalhadas. Este arquivo guarda intenção, exceções e invariantes; não duplicar aqui cada seletor CSS.

## Linguagem visual

- Branco/preto estruturais, superfícies tonais, cobalto de marca/seleção. Primários preto no claro e branco no escuro. Sem paletas locais divergentes, gradientes ou sombras decorativas.
- Texto de marca usa `--brand-text`, distinto da superfície `--brand`: cobalto de superfície não garante contraste de texto pequeno no dark. Texto sobre destaque financeiro é branco sólido.
- Botões pill; campos12px, painéis/modais20px, dispositivo28px. Densidade operacional, sem títulos gigantes/heros/seções de tela inteira no administrativo.
- Campos editáveis comuns usam `--control-surface`; grupos usam superfície tonal. Nome inline de material é exceção transparente. Secundários não devem parecer campos editáveis.
- Alvos principais de toque >=44px; ações workspace48px desktop. Campos admin40px, auth56px. Exceções desktop com pointer:fine: emissão de cobrança40px e ações de tabela32px; toque mantém alvos maiores.
- Fonte local/sistema. Aeonik Pro não foi licenciada: não baixar nem prometer métricas idênticas à referência.
- Hover/press discretos, foco visível, contraste e reduced-motion. Informação/estado sempre textual, não só cor. Cobalto não significa pagamento, publicação, saldo ou autorização.

## Tema e portais

- Header e canvas acompanham claro/escuro; menu centralizado, marca à esquerda, ações à direita. Até600px, menu na segunda linha.
- Preferência `namarca-admin-theme` aplicada ao html antes da primeira pintura, sem depender da hidratação; valor inválido/storage indisponível mantém claro. Não reintroduzir flash light no refresh dark.
- Portais precisam receber escopo/tema e `min-height:0` explicitamente. Backdrop modal fora de ThemeScope é autossuficiente: preto72% + blur4px; não depender de custom property herdada ausente.
- QR auth/Pix permanece preto/branco; quadriculado é ferramenta de transparência; cores configuráveis de campanha são conteúdo do usuário, não desvios da paleta administrativa.
- Não fazer substituição global de cores em CSS legado sem verificar as rotas/imports ativos. Skip link precisa contraste/foco mesmo fora do ThemeScope.

## Workbench e formulários

- Campanha: voltar/nome/situação agrupados à esquerda, sem versão no header. Secundário somente Envio pendente ou Alterações não publicadas, quando aplicável. Não repetir dados de Detalhes num resumo permanente.
- Abas laterais acima1100px, horizontais abaixo, acessíveis por setas/Home/End e com orientação ARIA correta. Uma instância persistente de cada painel/editor React. URL `aba` restaura seleção sem salvar/remontar.
- Pendência local: ponto discreto na aba com descrição acessível; estado junto a Salvar, sem banner. Sucesso breve só após confirmação real. Salvamento e descarte são por seção.
- Recuperação inicial é uma decisão única para os rascunhos de todas as abas; descartar pede confirmação. Não perder arquivos/alterações de outra seção ao salvar ou descartar uma aba.
- Criação rápida em modal: nome, endereço sugerido/editável e encerramento. Edição manual do endereço interrompe sugestões. Cliente/notas ficam para edição posterior. Cancelar/Escape sem salvar, fora não fecha, pending protege campos/fechamento; reabrir vazio.
- Selects/datas usam wrappers compartilhados shadcn/Radix; nomes/FormData/GET preservados, datas locais YYYY-MM-DD, calendário ptBR. Servidor continua autoridade.
- Dialogs operacionais usam AlertDialog compartilhado, não confirm/alert nativos. Cancelar recebe foco inicial, Escape cancela e foco retorna ao acionador. Preservar guards de saída existentes fora desse escopo.

## Diretórios e financeiro

- Campanhas e clientes são diretórios de linhas, não dashboards fictícios. Dados longos devem quebrar sem ocultar informação relevante.
- Campanhas: disponibilidade Rascunho/Ativa/Suspensa/Encerrada, não preparação/aprovação legada. Filtro Publicadas inclui suspensas/encerradas que tiveram entrega. Pendência de envio precede diferença não publicada. Não exibir preço legado como total.
- Vazios de diretórios/bibliotecas: composição centralizada, título/descrição/ação, largura máxima420px, respiro40px, sem tracejado/ícone/altura mínima decorativa. Evitar CTA de criação duplicado.
- Cobrança: emissão no topo, registros abaixo; desktop permite scroll interno da tabela, mobile usa blocos rotulados sem overflow da página. Copiar link + mais opções compacto; cópia/consulta bem-sucedidas confirmadas no botão e para tecnologia assistiva, erros visíveis.
- Financeiro: totais por situação antes dos filtros/histórico; pagas primeiro. Não chamar saldo/lucro/receita líquida. Filtro inválido não apresenta zero como resultado válido. CSV mantém o mesmo recorte.
- Checkout: canvas preto/card branco, sem menu administrativo. Código Pix visível/readOnly, timer junto da situação. Timer zerado não altera financeiro nem cria pagamento. Conteúdo maior pode rolar; não esconder para fingir uma tela única.

## Publicação — apresentação vigente

- Sempre **Versão N** na interface, nunca vN (arquivos técnicos continuam `vN.json`).
- Visão geral separa **Publicada atualmente** e **Próxima publicação**; atual é a efetivamente entregue, não necessariamente maior número. Primeira não sugere versão já no ar; pending identifica conteúdo congelado e preserva contexto da versão ainda pública.
- Um CTA de conteúdo: Publicar campanha / Publicar alterações / Concluir envio. Primeira publicação confirma disponibilização pública sem checkbox financeiro. Dirty orienta salvar nas abas editadas, sem avisos duplicados.
- **Sem menu Opções.** Suspender/Reativar junto da publicação atual; **Restaurar versão publicada** ghost junto da próxima publicação quando houver diferença salva. Confirmar cada ação e restaurar foco ao acionador específico.
- Comparar alterações fica após overview; histórico **Versões publicadas** em details recolhido. Selecionar versão não modifica nada. Publicar esta versão altera público; Restaurar no rascunho altera somente draft. Dirty de qualquer aba bloqueia restaurações/histórico para proteger reload; suspensão não descarta rascunho.
- Comparador usa linhas compactas comuns para dados/cores/materiais, thumbs32 e swatches16; junta alterações/reordenação do mesmo material. Sem tabela larga, cartões aninhados ou verde/vermelho decorativo. Mobile faz wrap/empilha.
- Não repetir botão Abrir campanha pública nesta aba. Não confundir disponibilizar no host local com deploy em produção.

## Editor, materiais e carregamento

- O tema editado é conteúdo da campanha, não tema administrativo. Defaults e contratos do editor compartilhado estão em [public.md](public.md); não vinculá-los ao toggle administrativo.
- Cards tonais: miniatura160px/contain/quadriculado, nome secundário editável no rodapé e ações44px. Arte selecionada tem borda cobalto única; figurinhas não inventam seleção. Ordenação dnd-kit por alça; overlay usa mesmo renderer/geometria do original, inert/aria-hidden, sem controles duplicados. Teclado Espaço/setas/Espaço, Escape cancela; reduced-motion remove inclinação/transições.
- Modal da referência preserva proporções/coordenadas da arte e área quadrada; altura pelo conteúdo e viewport, sem mínimo100dvh herdado de ui-scope. Não resolver com corte de canvas ou conteúdo inacessível.
- Envio sequencial ao salvar: feedback no rodapé com nome/situação atual, falhas e contagem/barra por arquivos processados, não bytes ou sucesso. Sem brilho, cartão de etapas ou progresso fictício na seleção local. Retry preserva sucessos.
- Sem arte, prévia privada mantém editor real e quadriculado neutro só na composição; foto/exportação/figurinhas desabilitadas sem composição. Props React fornecem apenas adminTheme enum para neutros; shell continua com cores da campanha. Não remontar ao adicionar/remover primeira/última arte.
- A prévia preserva os contratos de carregamento do editor descritos em [public.md](public.md); não introduzir uma tela intermediária administrativa na prévia React.
- Skeletons acompanham a seção ativa e geometria real, status único/aria-busy, decoração aria-hidden, sem controles focáveis e sem animação em reduced-motion. Não introduzir skeleton/atraso em abas já carregadas ou em saves.

## Validação

Testes estruturais protegem contratos, mas não comprovam aparência, navegação por teclado ou contraste renderizado. Mudança visual exige inspeção no navegador conforme o escopo, claro/escuro e responsividade; explicitar fixtures e limites. Não manter aqui relatos de capturas ou PASS históricos.
