# Namarca — continuidade de implementação da V1

> Documento de passagem de contexto para novas sessões de IA. Atualizado em 18/11/2026 ao final da sessão inicial. Descreve decisões do fundador, implementação existente, pendências e evidências; NÃO constitui aceite comercial ou declaração de prontidão de produção. O código e os serviços podem ter mudado depois: conferir antes de agir.

## Formulário — resumo removido (19/11/2026)

Decisão final do fundador: remover totalmente o resumo, inclusive Revisar resumo no rodapé. Removidos markup, estado reativo exclusivo e CSS do resumo. Restam Cancelar/Salvar; campos/validações mantidos. Typecheck/lint aprovados após remoção. Autorizado commit local do conjunto de alterações UI; push/publicação não autorizados.

## Formulário — resumo recolhido (19/11/2026)

Removido card lateral Resumo do rascunho por ocupar muito espaço. Formulário usa largura disponível, Evento/Prazo lado a lado em desktop e Cliente/observações abaixo. Resumo virou details nativo Revisar resumo no rodapé, fechado por padrão, junto de Cancelar/Salvar; valores reativos mantidos. Sem duplicar nome/slug em card persistente. Typecheck/lint/48 testes/build aprovados; sem nova execução browser nesta alteração. Sem auth/schema/backend/publicação.

## Estúdio — carregamento sob demanda (19/11/2026)

Corrigida página exibindo carregamento no lugar do botão. `studio.tsx` agora lançador leve com dynamic import ssr:false de `studio-workspace.tsx`: bundle/GET editor/iframe montam somente no primeiro clique. Botão disponível imediatamente; loading/erro/retry ficam dentro do espaço aberto, com Voltar disponível. Após primeira abertura mantém workspace montado oculto para preservar rascunho/foto. Runner verifica ausência de root/iframe antes do clique e regressão integral passou (inclui modal cliente e retenção runtime). Typecheck/lint/48 testes/migrations descartáveis/build aprovados. Sem auth/schema/backend novo; fixtures verificadas vazias e recursos teste encerrados. Sem commit/push/deploy.

## Cliente — cadastro por modal (19/11/2026)

Novo cliente na listagem abre Dialog Radix com nome/contato, Escape, contenção/restauração de foco, scroll lock e tema do admin no portal. Fechar descarta campos; clique fora não fecha acidentalmente. Submit usa saveClient existente, requireAdmin e validação servidor preservados; sucesso redireciona à ficha salva. Rota /novo mantida como fallback. Typecheck/lint/48 testes e build aprovados; cenário Chromium CLIENT_DIRECTORY_ONLY passou incluindo abrir/Escape/foco/cadastro real/edição/busca/vínculo/mobile. Sem regressão integral nova, auth/schema/backend inalterados. Fixtures verificadas vazias; recursos teste encerrados. Sem commit/push/deploy.

## Ações de criação dentro das páginas (19/11/2026)

Criar campanha e Novo cliente removidos do header global por pedido do fundador. Agora são ações primárias no PageIntro das respectivas listagens `/admin` e `/admin/clientes`; não aparecem nos detalhes ou formulários. Links e servidor inalterados. Typecheck/lint/48 testes e build isolado aprovados. Sem nova execução browser nesta alteração pontual; sem auth/schema/backend ou publicação.

## Campanha — topo minimalista (19/11/2026)

Pedido de reduzir espaço/informação no topo. Removidos breadcrumb editorial, slug e faixa de metadados repetidos (cliente/valor/prazo/estado). Agora uma linha com voltar por ícone nomeado, título menor e Abrir estúdio; abas imediatamente abaixo, gaps 12px e altura reduzida. CSS restrito `.ws-campaign-detail`, sem mudar outras páginas/header ou conteúdo funcional. Typecheck/lint/48 testes, build e migrations descartáveis aprovados; runner integral Chromium com auditoria passou. Captura dados desktop observada `/tmp/namarca-compact-audit/data-light-1440.png`, conteúdo começa aproximadamente y266 em vez de y499. Sem auth/schema/backend novo. Fixtures verificadas vazias; recursos teste encerrados. Sem commit/push/deploy.

## Estúdio — ação independente, sem aba redundante (19/11/2026)

Removida aba Estúdio dos detalhes por pedido do fundador. Dados da campanha é inicial; Abrir estúdio agora é ação no cabeçalho, independente das abas Dados/Aprovação/Cobrança. Editor fica montado em wrapper hidden enquanto fechado, mantendo rascunho, iframe e foto; fechar retorna ao contexto/aba anterior. Testes atualizados para abrir/fechar explicitamente antes de interagir com campanha; reload requer reabertura. Regressão integral Chromium com auditoria passou, typecheck/lint/48 testes/build aprovados. Captura dados desktop observada em `/tmp/namarca-entry-final`. Tentativas intermediárias corrigiram sincronização dos helpers após reload e asserts de conteúdo inacessível quando fechado; uma tentativa financeira atingiu falso positivo da regex CPF no HTML bruto, repetição passou sem alteração domínio. Sem auth/schema, publicação ou projeto antigo alterados. Fixtures verificadas vazias; app/DB descartáveis encerrados. Sem commit/push.

## Estúdio — modo dedicado de tela inteira (19/11/2026)

Fundador aprovou recuperar espaço de trabalho fullscreen após consulta somente leitura ao projeto antigo. `admin-workspace/studio.tsx` agora oferece Abrir estúdio: header próprio com voltar/nome/estado/salvar, biblioteca lateral, referência central e prévia recolhível. Ocupa 100dvh e esconde shell/resumo/footer sem navegar nem mover componentes de árvore/portal. Mobile alterna Materiais/Área da foto/Prévia mantendo todos montados. Foco vai para Voltar e retorna ao lançador; irmãos externos ficam inert e scroll do body bloqueado/restaurado. Não é modal nem API fullscreen do navegador. Voltar ao contexto da campanha não descarta rascunho. Dirty guards existentes continuam valendo ao abandonar campanha; histórico/popstate continua limite conhecido. Projeto antigo intocado.

Runner runtime ampliado verifica mesmo nó iframe, foto local retida ao entrar/sair/recolher e alternar áreas mobile, foco e retenção de campos locais do formulário. Regressão integral Chromium passou; typecheck/lint, 48 testes, migrations descartáveis, build e 6 E2E aprovados. Auditoria captura mais 8 frames fullscreen em 1440/1024/768/390 claro/escuro, aguardando animações; desktop claro e mobile dark observados em `/tmp/namarca-fullscreen-settled`. Não valida toque físico ou materiais reais. Sem auth/schema/backend/publicação novos. Fixtures verificadas vazias; app/DB de teste encerrados, principais preservados. Sem commit/push/deploy.

## Reconstrução — conteúdo administrativo PaceUI do zero (18/11/2026)

Fundador pediu refatoração completa de conteúdo Campanhas/Clientes, sem reaproveitar componentes/layout anteriores, com PaceUI e animações. Header existente preservado. Novo sistema independente `src/components/admin-workspace/` (primitives, CSS, diretórios, formulários, aprovação, cobrança, estúdio). Conteúdo ativo dessas páginas não importa componentes UI/admin antigos. Backend/actions/guards e contratos API mantidos; ReferenceCanvas/clampReference e runtime iframe preservados como core funcional. Arquivos antigos de conteúdo continuam no repositório sem uso nessas rotas, não apagados para não destruir mudanças anteriores não commitadas.

Pace registry público consultado: app-project-3 (cartões de campanha), motion-tabs (indicador compartilhado), motion-empty, motion-alert, motion-spring-button e form-input; adaptações locais para server actions/Radix já existente, sem Base UI/TanStack nem dependências novas. Não é declaração de instalação literal de template completo. Campanhas agora cartões com busca local e filtros; clientes diretório de contatos com ficha e cartões vinculados; formulário campanha numerado com resumo lateral e campos visíveis (abas internas antigas removidas); estúdio biblioteca horizontal com referência independente e painel de prévia contrastante; novos formulários aprovação/compartilhamento cobrança e relatório financeiro com resumo lateral. Abas persistentes preservam dirty/form/iframe; Motion usa reduced-motion, sem animação de scroll. Seletores do runner atualizados para formulário sem abas.

Validação em containers: typecheck/lint, 48 testes, migrations DB descartável, build produção isolado e 6 E2E aprovados. Regressão integral Chromium passou após correções de nomes acessíveis/status e semântica do resumo financeiro; cobre clientes/dirty/cobrança/CSV/galerias/referências por ponteiro/export/runtime/aprovação v1-v2. Auditoria ampliada: 8 views x 2 temas x 4 larguras (1440/1024/768/390), 64 capturas, aguarda fim de animação, exige zero overflow e testa menu conta e busca/filtros campanhas. Evidências `/tmp/namarca-workspace-verified`; listagem cliente desktop, nova campanha desktop, campanhas mobile e dados dark tablet observados. Não valida celular físico, materiais reais/422, performance ou aceite visual. Tentativas anteriores E2E falharam apenas por destino read-only de capturas; comando final usa tmpfs /app/test-results e output /tmp. Sem auth/schema/backend alterados, sem push/commit/publicação/PixGo real. Fixtures verificadas vazias; recursos descartáveis encerrados, principais preservados.

## Revisão — referência Shadcn Studio header-13 (18/11/2026)

Fundador rejeitou UI/UX anterior e pediu usar https://shadcnstudio.com/preview/blocks/base/dashboard-and-application/dashboard-header/dashboard-header-13 com componentes shadcn padrão e animações. Preview público observado em Chromium a 1440/768/390; implementação local autoral, sem copiar bundle/pacote premium. Header agora tem masthead preto de 68px e linha de navegação de 52px, conteúdo central de 1280px com margens alinhadas. Marca, tema/conta na primeira linha; Campanhas/Clientes e ação contextual de criação na segunda. Sem busca/notificações fictícias nem sidebar. Mobile mantém as duas opções diretamente visíveis em vez do drawer da referência. Não é clone pixel-perfect: fonte do projeto, marca e conteúdo próprios.

Reduzidas sobrescritas de geometria de botões, campos, cards, grid e tabelas para prevalecerem utilities dos primitives shadcn; tokens neutros claros/escuros. Abas com estilo de tabs, transição curta ao trocar painel sem desmontar formulário/editor, navegação por teclado revela aba ativa. Hover/press e menu Radix animado, reduced-motion respeitado. Transitions.dev consultado como referência, sem nova dependência. Ajustados breadcrumb (lista sem numeração herdada), portal da conta e contraste do avatar. Caminho `components/templates/free-dashboard/layouts` preservado por compatibilidade de imports, mas shell/header não são mais descritos como template Pace original.

Validação em containers: typecheck/lint, 48 testes, migrations em DB descartável, build isolado e 6 E2E aprovados. Runner integral Chromium aprovado após header novo; auditoria gera 24 capturas (6 telas x 2 temas x 1440/390), exige zero overflow e testa abrir menu da conta/Escape/restauração de foco. Capturas em `/tmp/namarca-header13-verified`, listagem desktop e estúdio dark mobile observados. Pequeno ajuste final de cor explícita do avatar após última captura. Sem comparação final a 768/1024 nem auditoria perf/gate de landing page: regras hero/uma seção por tela não se aplicam ao admin. Aceite visual do fundador pendente. Sem alteração auth/schema/backend, checkout/editor público, dependências novas, commit/push/deploy. Fixtures verificadas vazias pelo runner; app/DB descartáveis encerrados, serviços e dados principais preservados.

## Instalação — template Pace completo, integração sem sidebar (18/11/2026)

Fundador autorizou executar `npx shadcn@latest add @paceui/free-dashboard-template`, sem sidebar. Executado em container; componentes existentes preservados respondendo não ao overwrite. Registry trouxe exemplos, sidebar e APIs `render` incompatíveis com Radix instalado. Mantidos e adaptados arquivos reais `components/templates/free-dashboard/layouts/{index,topbar,footer,page-title}.tsx`, agora consumidos pelo admin e listagens, com Next Link/sem TanStack. Estrutura p-4/sm:p-5, topbar sticky com navegação horizontal e footer Pace. Guards no layout Next e operações preservados. Removidos SOMENTE arquivos recém-instalados de demos hospital/vendas/logs, gráficos, widgets fictícios e sidebar/provider, e dependências demo TanStack/recharts/cn; mantido breadcrumb shadcn com utilitário local. Não existe sidebar no bundle administrativo.

Mudança visual incremental em relação à revisão anterior: o template usa os mesmos primitives e composições já adaptados, não foi importado dashboard fake. Typecheck/lint, 48 testes, migrations descartáveis, runner integral Chromium com auditoria de 24 capturas, build isolado e 6 E2E aprovados. Captura listagem desktop observada. Fixtures limpas/verificadas e recursos descartáveis encerrados; sem auth/schema novo, PixGo real, deploy/push/commit.

## Correção — conflitos de CSS detectados na auditoria visual (18/11/2026)

Após fundador apontar UI quebrada, auditoria confirmou editor CSS sem layer vencendo redesign, `.grid` global impondo duas colunas aos headers shadcn, selects sem borda e composição de cobrança/aprovação inconsistente. `campaign-editor.css` colocado em layer legacy, ordem de layers explícita, grid-base/headers neutralizados no escopo administrativo, selects com geometria e bordas coerentes. Galeria e textos do estúdio agora seguem tokens inclusive dark; cards não ficam com fundo claro antigo. Cobrança e histórico separados em Cards; aprovação sem panel externo redundante. Toggle desabilitado até hidratação para não ignorar clique inicial. Prévia teste agora aguarda bitmap antes de escolher foto; não altera runtime público.

Adicionado `scripts/admin-visual-audit.ts` acionado por ADMIN_VISUAL_AUDIT=1 no runner isolado: 6 telas × 2 larguras × 2 temas, somente fixtures sintéticas; capturas em `/tmp/namarca-visual-audit`. Auditoria verifica tema após navegação antes da captura (capturas anteriores podiam registrar light com nome dark por hidratação). Regressão integral passou após correções principais; nova execução de confirmação travou no ambiente após financeiro e precisou interromper container de teste. App principal reiniciado sem remover volumes; startup reinstala dependências. Após reinstalação concluída e limpeza apenas das fixtures interrompidas (8 objetos S3 pelas chaves exatas do DB descartável), validação final aprovada: typecheck/lint, 48 testes, build isolado, 6 E2E e runner integral com ADMIN_VISUAL_AUDIT=1. Capturas finais aguardam hidratação/tema e bitmap: estúdio dark mobile e cobrança desktop observados, contraste e galeria corrigidos; 24 capturas geradas. App principal voltou ativo, fixtures verificadas vazias; DB/container/volume descartáveis encerrados. Não altera schema/auth nem checkout/editor público. Sem commit/push; aceite visual do fundador pendente.

## Revisão visual — composição dos blocos Pace UI (18/11/2026)

Fundador rejeitou a primeira estética (CSS próprio com pouco Pace) e pediu posicionamentos/blocos/templates reais do catálogo. Consultados via MCP `free-dashboard-template`, `marketing-topbar-1`, `dashboard-table-3` e seus arquivos públicos do registry. Composições adaptadas para Next/rotas e dados reais, sem importar gráficos fictícios, TanStack Router ou sidebar: topbar com navegação central, listagens em Card com header/action/tabela agrupada, indicadores reais, formulários em cards com conteúdo e rodapé separados e grupos de campos em grid. Estúdio com galeria em cards e prévia separada. Login agora card central, sem painel editorial anterior; não há bloco auth retornado pelo catálogo consultado, portanto composição adaptada com primitives shadcn, não declarar template auth oficial. Tema neutro claro/escuro, CSS anterior substituído e reset restrito ao escopo administrativo para preservar checkout. Ajustada layer das abas para não sobrepor componentes.

Typecheck/lint, 48 testes, migrations descartáveis e build aprovados. Runner integral Chromium passou com galerias, runtime, aprovação e clientes; após ajustes finais de CSS/abas, focal cobrança/login/TOTP/clientes/dirty e capturas claro/escuro 1440/390 passou novamente. Capturas login/dados observadas; não equivale auditoria visual de todas telas. Aceite visual do fundador pendente, sem commit/push/publicação. Sem mudanças backend/schema/auth; integração auth aprovada na etapa imediatamente anterior, não repetida nesta revisão de composição.

## Refatoração — UI administrativa com shadcn e Pace UI (18/11/2026)

Fundador aprovou tema claro com toggle escuro, navegação horizontal sem sidebar e inclusão de login/TOTP/recuperação. Instalados Tailwind 4 (sem preflight global), componentes shadcn locais em `src/components/ui`, registry Pace em `components.json` e bloco `dashboard-stat-1` usado nos indicadores reais (sem tendências inventadas). MCP Pace conectado via endpoint `/api/mcp`; `.mcp.json` sem chave. Não contratados recursos premium.

`src/app/ui.css` concentra tokens e UI sob `.ui-scope`, aplicado ao admin e AuthPanel. Preferência de tema local `namarca-admin-theme`, claro por padrão; não armazena dados de autenticação. Navegação Campanhas/Clientes no topo, conta por dropdown, abas com scroll horizontal no celular. Formulários, tabelas, ações e estúdio administrativo migrados para componentes, mantendo selects nativos e abas montadas para preservar FormData/dirty. Checkout público e `packages/editor`/`apps/event` não alterados; CSS legado em layer para coexistir com utilities sem reset global.

Validação: typecheck/lint e 48 testes aprovados; migrations em bancos descartáveis, integração auth e build produção isolado aprovados. 6 E2E públicos aprovados. Runner integral Chromium aprovado: login/setup TOTP, clientes, dirty, cobrança/cópia, financeiro/CSV, galerias, referência por alças reais, export local, runtime e aprovações v1/v2. Testes antigos procuravam textos e inputs numéricos já removidos; atualizados para interface vigente. Novo helper usa ponteiro real, sem force/dispatchEvent; corrigida geometria das alças afetada por estilos de botões. Capturas sintéticas claro/escuro 1440/390px observadas e persistência do tema/contraste dos inputs verificados. Não constitui auditoria visual de todas as telas nem celular físico; flakiness histórica não declarada resolvida. Nenhuma mudança de schema ou regras auth/financeiras. Sem commit/push/publicação.

## Ajuste — administrativo mais enxuto (18/11/2026)

Textos introdutórios e explicações repetidas reduzidos nas campanhas, estúdio, formulários, aprovação e cobrança. Preservados avisos essenciais de perda de edição, privacidade, pagamento e publicação indisponível. Estilos de densidade limitados a `.admin-shell`: títulos menores, menos espaçamento, tabelas/painéis mais compactos e controles com alvos de toque preservados. Login, checkout e runtime do participante sem alteração visual desta tarefa. Identificadores funcionais usados pelo runner preservados.

Typecheck, lint e 48 testes aprovados em container. Build isolado aprovado com `NODE_ENV=production`, URL HTTPS fictícia e `.next` separado do dev. Duas tentativas anteriores usaram ambiente inadequado (URL HTTP e depois NODE_ENV development) e falharam; comando final aprovado não altera configuração persistente. Sem nova validação visual/browser, migrations ou auth; schema não alterado. Aceite visual desktop/celular pendente; sem publicação/push.

## Correção — campos numéricos da área da foto removidos (18/11/2026)

Removido o bloco `ce-numbers` de `src/components/campaign-editor.tsx`, no checkout correto `/Users/thadeubrito/workspace/namarca`. Ajuste da referência continua por desenho, arraste e alças; dados x/y/width/height continuam no modelo, sem inputs na interface. Typecheck, lint e 48 testes aprovados no container app. Sem nova execução de browser, build ou migrations nesta correção pontual; schema/auth não alterados. Cards e renomeação por modal pedidos pelo usuário ainda precisam ser aplicados neste checkout; mudanças anteriores feitas por engano no projeto antigo não constituem implementação aqui. Nenhuma nova alteração no projeto antigo nesta correção.

## Entrega — editor compartilhado e prévia estática isolada (18/11/2026)

Fundador aprovou preservar frontend público estático lendo bucket e pediu implementação da solução compartilhada. `packages/editor/src` agora é a fonte única de UI/CSS/core/contrato para `apps/event/src/main.tsx` (fetch público) e `preview.tsx` (rascunho por bridge). Esbuild compila HTML/JS/CSS em `public/event-runtime`, automaticamente em predev/prebuild; `build:event` e `dev:event` disponíveis. Sem reorganização cosmética do Next nem dependência de Vite. Iframe não carrega globals/layout Next. Seleção administrativa sincroniza arte na prévia; ampliar/recolher preserva foto. Rascunho inválido preserva último válido com aviso. Snapshot histórico usa endpoint autenticado próprio (requireAdmin + vínculo campanha/pacote + no-store), sem listener do bridge. Foto/composição continuam locais; analytics no-op em ambas entradas novas.

48 testes, lint/typecheck, migrations em DB descartável e build Next isolado aprovados; Chromium integral aprovado incluindo comparação de estilos dos controles, ausência de recursos Next no iframe, entrada pública com manifesto/PNGs sintéticos, export local em ambas, seleção sincronizada, ampliar/recolher, overflow 390px, mensagens rejeitadas, manifesto encerrado e snapshot histórico imutável/protegido. Capturas sintéticas observadas. Cenário novo inicialmente falhou por Private Network Access na interceptação do HTML e tentativa de escolher foto antes do bitmap; fixtures corrigidas e runner integral final passou. Não declarar flakiness histórica solucionada. Sem schema/auth alterados; guards do endpoint novo exercitados. Fixtures verificadas vazias. Ver `docs/editor-runtime.md`.

**Limite:** público antigo em `/Users/thadeubrito/workspace/personal/namarca` permanece intacto, ainda não usa esta fonte compartilhada. Não houve deploy/push/publicação nem PixGo real. Encerramento novo é somente no frontend estático local; não muda site antigo. Diagnóstico 422 e celular físico não realizados.

## Ajuste — campanha com uma seção por vez (18/11/2026)

Pedido do fundador: não empilhar todas as seções da criação/edição. Detalhes agora têm abas Estúdio, Dados da campanha, Aprovação visual e Cobrança. Estúdio separa Artes e área da foto, Stickers e Cores, mantendo prévia ao lado/abaixo. Formulário de criação/dados separa Evento e valor de Cliente e observações. Painéis ficam montados/ocultos: trocar de seção não salva, não descarta rascunho nem foto da prévia. Abas têm semântica ARIA, setas/Home/End e revelam campos obrigatórios inválidos ao submeter. Guards dirty existentes preservados mesmo fora do estúdio. Sem mudança de auth/schema/backend financeiro/publicação. Validação: 45 testes, typecheck/lint, migrations em DB descartável e build isolado aprovados. `CAMPAIGN_SECTIONS_ONLY=1` passou em Chromium: campo obrigatório oculto revela aba, exclusividade dos painéis, teclado, retenção de nome/observações/arte dirty sem PUT e sem overflow a 390/1440px. Capturas sintéticas observadas (prévia ainda compilava na captura desktop; não usar como evidência de render final do editor). `DIRTY_GUARD_ONLY=1` e runner integral passaram, incluindo galerias, export local, guard aprovação dirty, aprovação v1/v2 e clientes. Histórico de flakiness permanece. Fixtures verificadas vazias; ambiente descartável encerrado, principal preservado. Sem teste de celular físico ou publicação.

## Entrega — seção Clientes (18/11/2026)

Fundador autorizou listagem/busca/cadastro/edição e campanhas vinculadas. Menu **Clientes**, rotas `/admin/clientes`, `/admin/clientes/novo`, `/admin/clientes/[id]`. Nome e contato apenas, sem exclusão/CRM/login de cliente. Edição é compartilhada nas campanhas, não modifica cobranças/snapshots; formulário informa isso. Busca literal parametrizada por nome/contato. requireAdmin em cada página e action, além do layout. Nenhum schema/auth alterado. Edições concorrentes: último salvamento, sem histórico.

45 testes, typecheck/lint, migrations em DB descartável e build isolado aprovados. `CLIENT_DIRECTORY_ONLY=1` passou em Chromium: guards anônimo/sessão sem TOTP, cadastro/edição/SQL/reload, busca nome/contato/sem resultado, vínculo de campanha e acesso inverso, sem overflow a 390px. Não comprova celular físico ou auditoria visual completa. Regressão integral tentou duas vezes e parou na galeria preexistente (na segunda, Nome da arte 2 não apareceu); novas funcionalidades, dirty e financeiro passaram antes. Não declarar regressão integral desta sessão aprovada. Dados sintéticos removidos/verificados; ambiente principal preservado. Ver `docs/contracts.md`. Sem deploy/push/PixGo real.

## Entrega — fechamento de lacunas locais e lista vigente (18/11/2026)

Novo pedido: continuar o restante, excluindo deploy/implantação em produção da lista. Escopo interpretado explicitamente como implantação, não remoção do desenvolvimento. **Lista vigente: `docs/TODO.md`**; a seção 9 abaixo passa a ser histórico, não fonte de tarefas atuais. Publicação pública e diagnóstico com materiais reais continuam adiados conforme decisões anteriores; não presumir autorização nem declarar jornada 100% concluída.

Estúdio passa a exibir motivos seguros de rejeição por allow-list: transparência/opacidade, PNG inválido, sessão, tamanho e estados da campanha; fallback nunca ecoa respostas arbitrárias/HTML/erros internos. Limite de 25 MiB antecipado na UI, servidor continua autoridade. Nenhuma flexibilização de PNG nem diagnóstico do 422 real. Cobrança ganhou mensagem copiável além do link, sem prometer liberação ou repetir valor mutável; sucesso anterior é limpo ao falhar cópia. Sem auth/schema alterados.

43 testes, typecheck/lint, migrations completas em DB descartável e build isolado passaram. Chromium focal de upload rejeitado e de emissão/cópia de cobrança passaram. Teste usa submit real de emissão e SQL do snapshot; clipboard simulado na fronteira do navegador HTTP (sucesso/permissão negada), não comprova clipboard do SO. Runner integral final passou: financeiro, dirty, galerias, exportação, aprovações e clientes. Uma execução integral anterior falhou em fill na galeria; repetição passou sem mudança funcional, portanto flakiness permanece pendente. Ajustes do cenário novo: timeout de compilação inicial, serialização de função page.evaluate e seletor de alert específico; não eram defeitos do app. Consulta/recuperação administrativas ainda sem nova cobertura UI. Fixtures verificadas vazias; nenhum dado principal alterado. Não publicar, fazer push ou habilitar gateway live.

## Entrega — regressão de múltiplas artes e stickers (18/11/2026)

Continuação sem publicação nem investigação do 422. Conferido que seleção/nomes/ordenação/remoção já existiam; adicionada cobertura browser em `scripts/editor-gallery-scenario.ts`, integrada ao runner principal. Três artes e três stickers sintéticos: referências independentes, seleção, mover acima/abaixo com limites, ordem/nome/referências na API e reload, troca de arte na prévia, ordem de stickers, remoção da arte selecionada com fallback, persistência dos restantes, PNGs removidos da galeria ainda privados/acessíveis ao admin e remoção total com rascunho vazio salvo/recarregado. Não houve alteração funcional de produção, auth ou schema. `GALLERY_ONLY=1` encerra após esta fatia (inclui dirty/financeiro anteriores). Ver `docs/editor-testing.md`.

Typecheck/lint, 40 testes, migrations em DB descartável e build em volume separado aprovados. Chromium focal e integral passaram, incluindo export local, aprovação v1/v2, clientes, financeiro e dirty. Primeira tentativa corrigiu apenas assert do texto de botão de arte (inclui dimensões), não um defeito do editor. Fixtures verificadas vazias; recursos isolados encerrados, principal preservado. Limites: só PNGs sintéticos quadrados em desktop, sem materiais reais/proporções variadas/toque/mobile físico. Não há troca de arquivo in-place. Flakiness histórica não é descartada; publicação continua adiada e 422 não investigado.

## Entrega — proteção do rascunho ao submeter formulários (18/11/2026)

Continuação sem publicação: estúdio dirty agora intercepta submit de dados base da campanha, pedindo confirmação antes de continuar; cancelar preserva alterações locais e impede submissão. Aprovação visual com alterações locais não salvas é bloqueada e orienta salvar/recarregar, para não registrar snapshot antigo enquanto a prévia mostra mudanças. Guard de links/beforeunload existente mantido. Nenhuma alteração de auth/schema/gateway; proteção UX complementa validações servidor, não as substitui. Typecheck/lint, 40 testes, migrations/build aprovados. Integração focal DIRTY_GUARD_ONLY=1 aprovada em Chromium: dismiss bloqueia submit/requisição e mantém nome/preço DB e rascunho; accept permite salvar dados base sem salvar estúdio incidentalmente. Runner integral também passou nesta execução, incluindo guard de aprovação dirty com alert/zero pacote, financeiro/CSV, v1/v2, clientes e editor/export local. Não extrapolar para ausência da flakiness histórica de referência. Cleanup verificou fixtures vazias e encerrou app/DB/volumes descartáveis, preservando principal. Navegação/links preexistentes não receberam novo cenário específico; voltar/programática/encerramento abrupto não cobertos.

## Entrega — resumo financeiro; publicação adiada (18/11/2026)

Fundador pediu pular publicação e seguir para o próximo item. Publicação NÃO está autorizada nesta etapa. Implementado resumo financeiro administrativo por campanha com quantidades/valores separados por situação e exportação CSV protegida por requireAdmin no endpoint. Leitura dos valores congelados em payments, sem taxas/liquidação; não chamar saldo/lucro/receita líquida. Sem métricas de participantes (público não integrado), sem telemetria na prévia. CSV allow-list com neutralização de fórmulas, sem CPF/cliente/token. Ver `docs/financial-report.md`. Nenhuma migration nova. Validação: 40 testes, typecheck/lint, migrations e build aprovados. Integração financeira focal em Chromium/DB descartável passou: anônimo e sessão sem TOTP recebem403, admin vê vazio e pending/paid/refunded sintéticos, download real CSV com headers/BOM/UTC/valores/fórmula neutralizada, ausência de CPF/token/QR/ID privado. Runner `scripts/test-campaign-editor.ts` aceita FINANCIAL_REPORT_ONLY=1 para esta fatia. Execução integral tentou regressão editor mas ficou bloqueada no trecho referência após upload; não declarar regressão completa aprovada nesta sessão. Cleanup confirmou contas/campanhas/pagamentos/links vazios e removeu app/DB/volume isolados; ambiente principal preservado. Publicação segue adiada, 422 real não investigado.

## Entrega — aprovação visual versionada (18/11/2026)

Checkout e UX anterior commitados com autorização: `d93edc0`. Continuação: `campaign_packages` preserva configuração visual validada, revisão, responsável/canal/dia da aprovação externa e administrador registrador. Formulário exige autorização de uso. Migration `0007_nervous_korath.sql` aditiva revisada/aplicada local. Não reintroduz contratação nem contas de cliente.

Pacote tem ao menos uma arte, encerramento futuro, ownership/dimensões/referências válidas e PNGs privados presentes/revalidados. Lock de campanha/editor e comparação de revisão/identidade rejeitam aba desatualizada. Rascunho permanece editável e draft; edição não muda snapshot e não herda aprovação. Comparação canônica trata reordenação de chaves JSONB, preservando ordem de arrays. Prévia histórica autenticada `/admin/campanhas/[id]/pacotes/[packageId]` usa snapshot, sem aceitar bridge do estúdio. Nenhuma publicação/pagamento real. Sem revogação ou armazenamento WORM; limpeza futura precisa preservar assets de todos os snapshots. Ver `docs/campaign-packages.md`.

Validação inicial: 37 testes, typecheck/lint, migrations/build aprovados. Revisão estática identificou filtro S3 case-sensitive em IDs de materiais; corrigido por normalização e checagem de cardinalidade. Primeiro submit browser revelou metadados React $ACTION_* rejeitados pelo schema strict; corrigido por seleção explícita dos campos de domínio. Runner isolado aprovado integralmente em Chromium: senha/TOTP descartáveis, regressão editor/export local e clientes, aprovação v1, duplicata rejeitada, edição preserva v1, aba com revisão obsoleta rejeitada, aprovação explícita v2, preview v1 fixa com foto sintética e mensagem bridge v2 ignorada, acesso anônimo bloqueado, draft/unpublished sem tarefas. Cleanup confirmou ausência de contas/campanhas/assets/pacotes no DB descartável; app/DB/volume isolados removidos. Timeouts intermitentes no trecho preexistente de referência/salvamento do editor e ajustes de sincronização do runner ocorreram antes do PASS final; não declarar estabilidade irrestrita. Não valida materiais reais/422, carga, mobile físico ou produção.

## Ajuste vigente — experiência de pagamento sem rótulos técnicos (18/11/2026)

Fundador pediu telas como no fluxo real, sem indicar simulador a cada etapa. Checkout/admin agora usam linguagem de cobrança/Pix/confirmado/reembolsado, resumo do valor, instruções de QR e copia/cola, aviso/ciência DePix e suporte para estados incertos. Removidos textos mock/simulador dos botões e mensagens da UI. Infra permanece mock local, guard inalterado, QR continua fake sem valor. Não habilitar PixGo real nem gerar BR Code bancário pagável para tornar demonstração realista. Desenvolvimento usa CPF sintético; não enviar dado real ao mock. Aviso/checkbox DePix não equivale a termos jurídicos versionados definitivos. Validação desta revisão: 30 testes, typecheck/lint, migrations e build aprovados. Runner isolado passou novamente com submit anônimo real em Chromium a 390px, QR/pending e confirmação; asserts sem overflow horizontal em 390/1440px nos estados formulário/pendente/pago. Screenshots sintéticas sem CPF preenchido observadas, sem cortes de conteúdo. App/mock/DB/rede descartáveis encerrados. UI administrativa/clipboard/celular físico e todos os estados de erro não foram exercitados por browser nesta revisão.

## Entrega — checkout exclusivamente mock (18/11/2026)

Autorizado pelo fundador continuar com a fatia de cobrança mock. Implementados emissão/reutilização de link opaco por campanha, snapshot de nome/valor, checkout sem conta com CPF sintético e QR/código sem valor, persistência prévia de tentativas, bloqueio de resultado incerto, recuperação via listagem exclusiva do mock e consulta manual de pagamentos. Callback antecipado pode registrar tentativa conhecida após consulta de IDs/valor. Pagamento não aprova nem publica. Guard exige modo mock e host pixgo-mock; não habilitar live removendo guard.

Migration `0006_careful_bruce_banner.sql` revisada/aplicada sem remover dados. Detalhes e limites em `docs/checkout.md`. Não há reemissão para novo valor/revogação do link, CNPJ, termos jurídicos finais, reconciliação pública automática nem homologação real. O link congela nome/valor na primeira emissão e é reutilizado mesmo após editar campanha. Nova tentativa só após confirmação expired/cancelled; criação incerta sem resultado único permanece bloqueada (não assumir que falhou). Nenhuma mudança de auth, publicação ou investigação do 422.

Validação: 30 testes unitários/contratos, typecheck, lint, migrations, build e regressão webhook mock aprovados. `scripts/test-checkout.ts` passou duas vezes em banco/rede/app/mock isolados: snapshot e emissão concorrente, seis gerações simultâneas com uma cobrança, recuperação unknown idempotente e divergência rejeitada, consulta pending/paid/refunded preservando paidAt, callback anterior ao registro e resposta atrasada sem regressão. Chromium anônimo realizou submit real com CPF sintético/consentimento, viu QR, reload sem nova geração e confirmação após callback. Campanhas draft/unpublished sem publication tasks. Corrida reproduzida deterministicamente, não por timing aleatório. UI administrativa dos novos botões não foi validada por browser; guards presentes no servidor. Revisão estática independente sem achados no escopo mock não constitui auditoria/aceite de produção.

Fixtures isoladas limpas/verificadas; app/mock/DB/rede descartáveis encerrados. Conta/sessões reais não alteradas. Teste webhook removeu somente próprias fixtures; mock principal preserva pagamento sintético por não ter DELETE. Um build iniciado brevemente por engano no app dev foi interrompido; build final aprovado em volume separado e login principal voltou HTTP200. Upload 422 não investigado. Próximo escopo sugerido: aprovação visual versionada antes de publicação; checkout live e políticas de reemissão ainda exigem decisão/homologação.

## Decisão vigente — cliente leve reutilizável (18/11/2026)

Após simplificar contratação, o fundador aprovou **cliente separado e vinculado à campanha**, sem reintroduzir contrato. Cliente só tem nome obrigatório e contato opcional. No formulário de campanha: selecionar existente, cadastrar novo inline ou deixar sem vínculo. Não exige sair da tela. Cliente não tem login/conta/CPF/CNPJ/endereço. Não há tela separada para editar/excluir clientes nesta fatia.

`clients` + FK opcional `campaigns.clientId`, migration `0005_sloppy_silk_fever.sql` gerada/revisada/aplicada no local. Migra organizer/contact antigos para clientes, agrupando apenas pares exatos após trim. Contato sem nome ganha marcador explícito para revisão. Campos legados e registros comerciais anteriores preservados. Valor, prazo e notes continuam na campanha. Não consultar contratos legados para cobrança.

`resolveCampaignClient` valida cliente existente ou insere novo dentro da mesma transação de criação/edição. requireAdmin nas actions. Cliente novo só persiste ao salvar campanha; desvincular não apaga cliente. Form recebe opções consultadas após guard administrativo. Não reintroduzir responsabilidades/termos/versionamento comercial.

Validação: 28 testes, typecheck, lint, migrations e build aprovados. Chromium com login/TOTP em DB isolado: criar sem cliente, cadastro inline e reload, segunda campanha reutiliza mesmo ID, desvincular primeira preserva cliente; regressão do editor/export. Primeira execução teve timeout no trecho referência do editor; repetição passou completa. Dados reais preservados e ambiente isolado encerrado. 422 real segue sem investigação. Próximo escopo possível: checkout mock com valor congelado; manutenção leve de clientes se necessária.

## Histórico — simplificação inicial dos dados comerciais (18/11/2026)

**Esta decisão substitui a entrega de contratação descrita abaixo e as recomendações antigas do backlog B.** O fundador achou o preenchimento massante e o valor duplicado desnecessário. Aprovou retirar entidade/fluxo ativo de contratação e aprovação comercial.

Agora existe apenas o formulário da campanha: nome/slug/encerramento, **Valor da campanha** único e três campos opcionais: **Organizador/cliente**, **Contato** (e-mail ou WhatsApp em um texto), **Observações do combinado**. Não exigir responsabilidades, revisões, cancelamento, período comercial nem condições de liberação em campos separados. Não reintroduzir contratos, versões comerciais ou CRM sem novo pedido.

UI `CampaignContract`, actions comerciais e validações/testes exclusivos foram removidos. Schema mantém tabelas antigas somente por preservação de dados. Migration `0004_broken_shaman.sql` adiciona organizer/contact/notes e migra organização/contato da versão legada mais recente, sem alterar valor da campanha, termos antigos ou aprovações. Termos antigos continuam no banco sem UI. Não interpretar dados legados como pré-condição para cobrança.

Criação e edição salvam opcionais via campaignInput/requireAdmin. Única fonte de valor editável é campaigns.priceCents. Payments já têm valor próprio; futuras cobranças devem congelar valor na emissão, não seguir alterações posteriores da campanha. Checkout ainda não implementado. Aprovação visual de pacote continua pendente e não é aprovação comercial.

Validação desta simplificação: 28 testes aprovados, typecheck/lint/migrations/build. Chromium isolado: criação sem contato, um campo de preço, ausência da seção Contratação, salvar/recarregar/limpar opcionais; regressão de estúdio e exportação local. Primeira execução com timeout no trecho referência/salvamento do editor; repetição passou integralmente. Não afirmar ausência de flakiness. Conta/sessões reais preservadas; ambiente descartável encerrado. Upload 422 real segue não investigado. Próxima entrega sugerida: emissão de cobrança mock com valor congelado, sem entidade contratação intermediária.

## Histórico — entrega de cliente/contratação, depois substituída (18/11/2026)

Implementada uma fatia de B, **não toda a etapa**: seção Contratação nos detalhes da campanha, organização/contato por snapshot, resumo/responsabilidades/revisões/cancelamento/condições livres, valor e período versionados. Aprovação comercial externa com responsável/canal/data, administrador registrador e histórico. Nova versão não herda aprovação. Não há conta de cliente, tabela de preços ou condição de pagamento imposta.

Arquivos: `src/lib/contract-input.ts`, `src/components/campaign-contract.tsx`, `src/app/admin/campanhas/[id]/contract-actions.ts`; schema e migration `0003_yellow_agent_zero.sql` gerada/revisada/aplicada no local. Documentação: `docs/contracts.md`.

Segurança: requireAdmin em cada action, lock da campanha, comparação de versão esperada, aprovação só da versão atual e ainda não aprovada. Sem alterações de auth. Histórico preservado por inserts nas actions (não WORM). Contato pode conter dados pessoais; não logar nem incluir em manifesto público.

**Limite importante:** é aprovação comercial, NÃO aprovação do pacote/editor. Não muda preparationStatus, não congela artes, não publica e não gera cobrança. Valor indicativo da campanha foi renomeado na UI e não altera contratos; período comercial não altera encerramento público. Futuro checkout deve vincular explicitamente a versão comercial; snapshot aprovado das artes continua pendente em D.

Validação: 30 testes unitários/contratos, lint, typecheck, migration e build aprovados. Integração Chromium em DB descartável: login/TOTP, regressão upload sintético/save/reload/foto local/export sem mutações; contratação pela UI, aprovação v1, v2 sem aprovação, rejeição de aba desatualizada e SQL comprovando valores/aprovação históricos, campanha draft/unpublished. O runner precisou nome acessível explícito no select de canal, corrigido na UI. Houve uma execução com timeout na referência do editor que não se repetiu nas seguintes; não declarar estabilidade irrestrita. O 422 dos materiais reais continua sem investigação.

Pendências B: aprovação do pacote visual versionado (separada), histórico de outras ações, condição comercial padrão/oferta definitivas e eventual UX de revogação/cancelamento. Próxima fatia pode ser cobrança mock versionada ou aprovação do pacote antes de publicação, conforme decisão do fundador.

## 1. Pedido e objetivo do fundador

Transformar a Namarca de operação técnica/manual em um produto vendável com contratação e entrega automatizadas. **Foco exclusivo atual: V1 operada pelo administrador.** Somente ele cadastra/prepara campanhas e envia cobrança. Cliente paga sem conta. Participante usa o editor sem cadastro. Na V2, futuramente, cada cliente poderá ter conta e preparar suas próprias campanhas; NÃO antecipar essa complexidade.

Jornada alvo da V1:

**Administrador cadastra cliente/campanha → prepara materiais → registra aprovação → envia checkout → cliente paga → sistema confirma → libera versão aprovada → organizador divulga link/QR → participante compõe/exporta → ativação encerra → administrador entrega relatório.**

O fundador espera um administrativo realmente operacional, não apenas scaffold. Durante a sessão encontrou telas sem ação e cobrou a migração do editor completo. Ser explícito sobre o que existe, implementar jornadas verticais e não chamar integração parcial de produto terminado.

### Posicionamento obrigatório

Namarca é uma **ativação digital para antes, durante e depois de eventos**, principalmente pré-evento por orientação do fundador, não uma predominância comprovada por métricas. Público usa sua foto com identidade oficial e stickers para expectativa, anúncio de participação, compartilhamento do momento e celebração da experiência. Não descrever como lembrança, recordação ou souvenir. Corridas são foco inicial, não limite do produto. Não prometer alcance, inscrições ou publicação social.

Organizador contrata; participante usa gratuitamente. Cobrança por evento/campanha é a direção atual, não assinatura mensal nem cobrança por exportação. Valor negociável pelo administrador; tabela definitiva ainda precisa ser reconciliada.

## 2. Diretórios e limites de atuação

- **Projeto novo, onde implementar:** `/Users/thadeubrito/workspace/namarca`.
- **Projeto original, fonte de referência:** `/Users/thadeubrito/workspace/personal/namarca`.
- Não alterar o original sem pedido específico. Ele tem alterações não commitadas de outras tarefas; não limpar/resetar/copiar por cima.
- Original contém `AGENTS.md`, `docs/mvp.md`, `docs/roadmap.md`, `docs/backlog.md`, `docs/commercial/` e o estúdio local em `web/backoffice/`.
- Repositório Git local inicializado por pedido do fundador após a entrega de clientes leves. Primeiro commit reúne a base existente e as entregas até essa etapa. Nenhum remoto configurado, push ou deploy realizado.
- Nunca ler/imprimir `.env.local`, secrets, senhas, URI TOTP, códigos de recuperação ou CPF em respostas/logs. Pode alterar configuração por script sem imprimir valores.

## 3. Decisões técnicas aprovadas — não reabrir sem motivo

| Área | Decisão |
|---|---|
| Administrativo/checkout | Next.js + TypeScript; produção pretendida na Vercel |
| Autenticação | **Biblioteca open source Better Auth**, não SaaS |
| Login | E-mail + senha **mínimo 8, máximo 128 caracteres** + TOTP obrigatório |
| Contas | Admin provisionado por comando; sem signup público; sem Google/OAuth externo; sem serviço de e-mail obrigatório |
| Recuperação | Backup codes de uso único + comando operacional de reset com revogação de sessões |
| Banco | PostgreSQL + Drizzle, gerenciado em produção (Neon como escolha inicial) |
| Materiais | Cloudflare R2; desenvolvimento com API S3 privada local |
| Pagamentos | **PixGo**, escolha expressamente confirmada pelo fundador, mesmo conhecendo DePix |
| Tarefas | **SEM Inngest, SEM worker e SEM cron**. Usuário questionou e mandou remover. Webhook processa situação financeira síncrona. Reconciliação sob demanda no painel é pendência |
| Desenvolvimento | Docker Compose; sem dependências instaladas no host ou SaaS necessário para rodar |
| Coolify | Possível migração futura de app/banco; NÃO é a hospedagem atual aprovada |
| Editor público anterior | Continua no projeto/hospedagem original; não houve migração de produção. Seu core foi copiado para a prévia privada do novo app |

Versões exatas estão em `package.json`/`package-lock.json`. Base instalada: Next16.4.6, React19, BetterAuth1.7.25, Node24, Drizzle, pg, Zod, AWS S3 SDK, Konva/react-konva, motion, Tabler, pngjs. Não atualizar tudo indiscriminadamente.

## 4. Estado real implementado

### 4.1 Autenticação

Arquivos:
- `src/lib/auth.ts`, `auth-client.ts`, `admin.ts`.
- `src/db/auth-schema.ts`.
- `src/app/api/auth/[...all]/route.ts`.
- `src/components/auth-panel.tsx`, `sign-out.tsx`.
- `src/app/login/`, `/login/verificar`, `/seguranca`.
- `scripts/create-admin.ts`, `reset-admin.ts`, `test-auth.ts`.

Better Auth email/password, TOTP, backup codes. `ADMIN_EMAIL` define email permitido. Guards consultam estado no DB, sem cookie cache; sessão administrativa exige email correto + `user.twoFactorEnabled` + campo próprio `session.twoFactorVerified`. Hook concede essa prova após TOTP OU backup code válido. Better Auth plugin não oferece sozinho esse campo; não remover o controle.

`requireAdmin()` em CADA operação server-side privilegiada; layout sozinho não basta. `getEnrollmentSession` serve somente enrollment, não operações de domínio. Signup, desativação TOTP, remembered device e remoção de conta bloqueados. Recovery code válido pode abrir sessão, reutilização falha. Reset operacional revoga sessões e requer novo enrollment; revisar script antes de executar pois é sensível.

**Login local informado ao usuário: `admin@namarca.test`**, salvo se alterou ADMIN_EMAIL. Nenhuma senha padrão. Usuário criou/tentou criar conta e pode já ter configurado TOTP: NÃO recriar nem apagar conta/sessões existentes para testes.

### 4.2 Campanhas

- `/admin`: listagem, contadores e link no nome da campanha.
- `/admin/campanhas/nova`: cria rascunho e redireciona aos detalhes.
- `/admin/campanhas/[id]`: estúdio, dados base editáveis e cobranças existentes.
- Campos: name, slug único, endsAt, priceCents opcional; data de encerramento do form básico é 23h59 em São Paulo.
- Edição básica somente draft/unpublished; action transacional com lock.
- Não há organização/contato/contratação completos nem histórico de ações de negócio.

### 4.3 Estúdio da campanha — migrado após cobrança do usuário

- `src/components/campaign-editor.tsx` e `.css`.
- `src/editor/reference-canvas.tsx`: desenho/movimento/redimensionamento por alças e campos numéricos.
- `src/editor/shared/events/events.ts`: modelo/parse derivados do original.
- `src/editor/shared/editor/*`: core real de composição, framing, gestures, histórico, Konva, exportação.
- `src/editor/shared/analytics.ts`: no-op, SEM telemetria na prévia.
- `src/components/campaign-preview.tsx`.
- `/admin/campanhas/[id]/previa`: iframe privado/autenticado com editor real, sem chrome administrativo.

Funciona: upload arte/sticker, nomes, remoção da galeria, ordenação, seleção, referência retangular visual/numérica, oito cores do tema + cor da campanha, salvar/recarregar, revisão otimista, aviso dirty em unload e links. Prévia recebe configuração via postMessage com conferência de origem/janela/campanha e validação do manifesto. Foto, composição e exportação permanecem no navegador. Não recebe foto pelo bridge.

Upload NÃO salva automaticamente a configuração; UI adiciona ao rascunho, depois botão **Salvar configuração**. Remover material da galeria NÃO apaga o objeto S3. Arquivos não associados e órfãos podem permanecer privados; política de limpeza é futura.

**Não confundir prévia privada com publicação pública.** Não implementada publicação/ativação nem migração do domínio público original.

### 4.4 Backend de materiais

- `src/lib/campaign-editor.ts`.
- `GET /api/campaigns/:id/editor` → `{event, revision}`; default vazio revisão0.
- `PUT /api/campaigns/:id/editor` body `{event, revision}` → revisão+1; 409 concorrência. Nome/slug/endsAt são sempre derivados de campaigns.
- `POST /api/campaigns/:id/assets?kind=artwork|sticker`: PNG raw, Content-Type image/png, X-Asset-Name encodeURIComponent(nome) →201 `{material,url}`. Não modifica manifesto automaticamente.
- `GET /api/campaigns/:id/assets/:assetId`: PNG autenticado, vínculo à campanha, no-store.
- Todas exigem admin; mutações verificam Origin e estado draft/unpublished.
- DB campaign_editor JSONB/revision e campaign_assets metadados/ownership.
- Objetos `private/campaigns/<campaignUUID>/assets/<assetUUID>.png`.
- IDs/arquivos pertencentes à campanha, dimensões reais, tipos e referências validados. Sem chave arbitrária do cliente, sem bucket público.

### 4.5 Requisitos atuais dos materiais

PNG apenas, artes e stickers. Servidor exige pixels alpha0 e alpha255, CRC e dimensões válidas; até25MiB e40milhões de pixels. Sem quantidade comercial/técnica arbitrária de artes/stickers; tamanho do body ainda limita configurações. Referência é retângulo real ocupado pela foto, independente do formato do alpha.

Artes definem proporção/resolução exportada (exemplos recomendados1080x1920/1350/1080, não obrigatórios). Stickers sem dimensão fixa; aconselhamento512–1024px não é validação do sistema.

**Pendência conhecida, prioridade alta:** usuário reportou upload retornando **422** ao escolher arquivo. Ele explicitamente disse que **não quer investigar a causa nesta etapa**, pediu primeiro listar o restante e depois salvar este contexto. Não afirmar que sabe qual arquivo/regra causou erro, não chamar upload estabilizado. Futuro diagnóstico deve reproduzir com material autorizado, melhorar erro UI e preservar privacidade. Não relaxar requisito sem decisão consciente.

**Vercel:** limite25MiB local NÃO funciona pelo proxy de upload na Vercel (~4,5MB por requisição, verificar plano/documentação vigente). Implementar upload direto assinado R2 e validação/finalização no servidor antes de prometer suporte em produção. Ainda não existe esse fluxo.

### 4.6 Pagamentos implementados parcialmente

- `src/lib/pixgo.ts`: adapter createPayment/getPayment, HMAC, schemas, status e centavos.
- `src/app/api/webhooks/pixgo/route.ts`.
- Webhook valida rawbody/timestamp/HMAC/schema, encontra cobrança já registrada, consulta gateway, confere IDs/valor, lock + transação atualiza status e receipt, retorna200. Duplicata não reaplica efeitos.
- Sem trabalho background; erro temporário503. Política real de retries da PixGo não foi comprovada.
- Sem recuperação automática de notificação perdida; botão de consulta/reconciliação manual AINDA NÃO existe.
- Adapter existe, mas NÃO existe ação de criação pelo painel, checkout, link de pagamento do cliente ou envio de cobrança.
- Nenhum dinheiro real movimentado; PixGo real não foi homologada nesta sessão.

### 4.7 Schema e migrations

`src/db/schema.ts`, `auth-schema.ts`, `src/db/index.ts`, `drizzle.config.ts`.

Tabelas: campaigns, payments, webhookReceipts, publicationTasks (legada inativa), campaignEditor, campaignAssets e auth_user/auth_session/auth_account/auth_two_factor/auth_verification.

- preparationStatus: draft/validated/approved.
- publicationStatus: unpublished/pending/published/failed/ended.
- paymentStatus: pending/paid/expired/cancelled/refunded.
- paidAt preservado historicamente em refund. Não tratar paid como published.
- webhookReceipts eventId unique e dispatchedAt (nome legado: processamento síncrono). Colunas attempts/nextAttemptAt ficaram por compatibilidade, sem consumidor.
- publicationTasks ficou sem uso para não apagar registros existentes. NÃO reintroduzir worker porque encontrou a tabela.

Migrations versionadas/aplicadas no local:
- `drizzle/0000_eager_naoko.sql`.
- `0001_plain_pride.sql` (refunded e campos retry legados).
- `0002_chief_doctor_strange.sql` (estúdio/assets).

## 5. Correções e incidentes importantes desta sessão

1. **Senha mínima14 →8** por pedido explícito. Manter coerência BetterAuth + create/reset + testes/docs. Erros de entrada do CLI agora explicam tamanho/confirm sem imprimir valor.
2. **Credenciais na URL:** auth form sem method fazia GET quando JS não hidratava. Corrigido methodPOST + fallback `/api/auth/form-unavailable` que não lê/loga body + submit bloqueado até hidratação. Não regredir. Senha usada naquela URL foi recomendada trocar; não confirmar que usuário trocou.
3. **Hydration/HMR:** bloqueio dev-origin deixou formulário inerte. Next dev agora usa `--webpack`; `allowedDevOrigins` localhost/127.0.0.1/app/namarca-editor-test. Auth trustedOrigins produção só baseURL; desenvolvimento aceita localhost3000 e1273000 além baseURL. Não usar wildcard nem desativar CSRF.
4. **INVALID_ORIGIN:** corrigido localhost vs127 no BetterAuth; origin externa rejeitada com403 nos testes. Acesso por IP da LAN/outra porta não está aprovado automaticamente.
5. **Campanha não clicava:** link e detalhes/edição foram adicionados; criar agora abre detalhes.
6. **Inngest/worker removidos:** decisão repetida do usuário. Não ressuscitar arquitetura.
7. **Mock bloqueava callback:** fila aguardava webhook e impedia consulta de status feita pelo app. Corrigido liberar fila após persistência antes de entregar callback; execução continua rastreada pela requisição. Teste webhook ponta a ponta passou sem replay manual.
8. **Teste exportação inicialmente falhou:** causa era scroll do Playwright em iframe sticky, botão fora viewport externo; corrigido runner para clique real com viewport correto. Core export não alterado para mascarar falha.

## 6. PixGo — condições conhecidas e contrato

Usuário decidiu usar PixGo mesmo. Fontes consultadas: https://pixgo.org/api/v1/docs, /faq, /termos, /checkout-pix. Revalidar documentação antes de live.

- Cliente paga Pix; recebimento é **DePix em carteira Liquid D+1**, não BRL em conta bancária.
- Termos cláusula1.5 exigem avisar cliente da natureza da conversão/compra de stablecoins; integrar aviso e validar jurídico/contábil.
- Aprovação API pode exigir KYB/validação; carteira precisa validação.
- MínimoR$10; limite inicial citadoR$300/QR, progressão atéR$6000; validar limite real da conta. Não dividir artificiosamente cobranças para contornar regra.
- CPF/CNPJ de quem paga é vinculado ao Pix; terceiros podem ter pagamento recusado. Adapter atual aceita CPF válido, NÃO CNPJ; suporte empresa/CNPJ é pendência de checkout.
- Sem sandbox oficial separado. Mock local não representa homologação; transação real exige autorização e valor controlado.
- Taxas publicadas:2% >=R$50;2%+R$1 abaixo;R$0,50 por envio carteira; revalidar sem hardcodear promessa comercial.

Contrato adapter:
- X-API-Key (NÃO Bearer).
- POST baseURL `/payment/create`, JSON amount numérico decimal, receiver_cpf, external_id, webhook_url.
- GET `/payment/{id}/status`; envelope success/data payment_id/external_id/amount/status.
- external_id NÃO é único no provedor; não retry automático create após timeout. Consultar/buscar cobrança e reconciliar antes de nova tentativa. Corrida callback antes de gravar paymentId precisa ser modelada.
- completed→paid, refunded explícito. IDs e valor comparados com DB. Inteiros em centavos para domínio.
- HMAC SHA256 de timestamp + '.' + raw body; headers X-Webhook-Timestamp e X-Webhook-Signature, timing-safe, janela5min, limite body16KiB.
- Sem deliveryID oficial: dedupe SHA256(payment_id+':'+event). Sem refunds parciais modelados.
- Mode mock padrão; live requer configuração/autorização explícita, HTTPS. Nunca fallback para gateway real.

## 7. Ambiente local e comandos

Diretório raiz novo. Docker/Compose no host; ferramentas JS somente containers.

```sh
cd /Users/thadeubrito/workspace/namarca
# Somente em ambiente novo; não sobrescreve .env.local existente.
docker run --rm -v "$PWD:/app" -w /app node:24.11.1-bookworm-slim node scripts/dev-env.mjs
docker compose up -d postgres s3 pixgo-mock
docker compose run --rm app npm run db:migrate
docker compose up --build -d
```

- app http://localhost:3000.
- PostgreSQL localhost5432, serviço interno postgres.
- SeaweedFS S3 localhost9000, serviço s3, bucket privado namarca-local; não existe console MinIO.
- PixGo mock localhost4010, serviço pixgo-mock; sem UI bancária/valor real.
- Somente4 serviços: app/postgres/s3/pixgo-mock. Sem8288/Inngest/worker.
- Portas apenas127.0.0.1. Dados volumes persistentes.
- `npm ci --no-audit --no-fund` no startup pode levar tempo; NÃO rodar testes enquanto node_modules está sendo reinstalado (binários temporariamente faltam). Não iniciar dois npm ci concorrentes sobre mesmo volume.
- node_modules e.next em volumes; build deve usar.next separado para não quebrar dev. AllowedDevOrigins não é a mesma coisa que trustedOrigins de auth.

```sh
docker compose exec app npm run admin:create
# Só sob pedido de reset: revoga acesso existente.
docker compose exec app npm run admin:reset

docker compose exec app npm run typecheck
docker compose exec app npm run lint
docker compose exec app npm test
docker compose exec app npm run db:generate
docker compose exec app npm run db:migrate
docker compose exec app npm run test:webhook

docker run --rm --network namarca_default -e E2E_BASE_URL=http://app:3000 \
  -v "$PWD:/app" -v namarca_node_modules:/app/node_modules -w /app \
  mcr.microsoft.com/playwright:v1.56.1-noble npm run test:e2e

# Build sem perturbar dev, com URL HTTPS fictícia, sem credenciais reais.
docker compose run --rm --no-deps -e NODE_ENV=production \
  -e BETTER_AUTH_URL=https://app.namarca.test \
  -v namarca_build_next:/app/.next app npm run build
```

Não usar down-v, limpar bucket amplo, deletar dados/sessões ou reconfigurar senha do PostgreSQL com volume existente. `docker compose down` para serviços preservando volumes.

## 8. Evidências e testes (não generalizar)

Última validação após integrar estúdio:
- 27 testes unitários/contratos passaram.
- Lint e typecheck passaram.
- Build otimizado Next passou.
- 6 testes E2E públicos passaram (inclui submitPOST, sem credencial naURL e sem JS failclosed).
- `scripts/test-auth.ts`: handler real BetterAuth + DB descartável terminado_auth_test; enrollment, login, proof guard, backupcode usoúnico, flags proibidas, revogação. Sem conta real alterada.
- `scripts/test-webhook.ts`: mock→callbackNext→consultaMock→DB paid/refunded, duplicatas, divergência/assinatura inválida; sem worker. Fixtures DB limpas; mock mantém pagamentos sintéticos por não terDELETE.
- `scripts/test-campaign-editor.ts`: app namarca-editor-test + DB namarca_editor_test separados, senha/TOTP reais, UI create/upload/save/reload, reference, acesso sem auth, CSRF, kind inválido, revisão409. Prévia foto local+sticker, PNG real400x400 pixels conferidos; zeroPOST/PUT/PATCH durante composição/export; campanha draft/unpublished.

Runner editor exigiu viewport externo maior para iframe e clique real; NÃO usar force/synthetic click para esconder regressão.

**Não comprovado:** arquivos reais do usuário (há422 reportado), compatibilidade completa mobile, publicação/checkout real, integração financeira live, carga, auditoria de segurança. Não chamar tudo pronto por passar fixture sintética.

Infra isolada editor foi encerrada: container/banco/volume descartáveis removidos. Alguns objetos privados órfãos de execução interrompida podem permanecer no S3 local; não limpar todo bucket. Preservadas conta/sessões e campanhas reais locais.

Testes auth/editor não usam banco principal: consultar instruções de `docs/auth.md` e `docs/editor-testing.md`. Nunca criar admin fictício na base real para testar. Teste auth tem nome de DB guardado; editor runner exige email/origin próprios.

## 9. Backlog histórico — substituído por `docs/TODO.md`

Não executar esta checklist como lista vigente: mistura entregas já concluídas, decisões substituídas e produção fora do escopo atual. Preservada somente como contexto histórico.

### A. Estúdio estável e UX (primeira prioridade)
- [ ] Reproduzir422 de upload com arquivos do usuário quando ele autorizar retomar investigação.
- [ ] Mensagens úteis de upload: retornar/exibir validação real segura em vez de erro genérico.
- [ ] Testar artes reais/proporções variadas, PNGs de ferramentas comuns, limites e alpha; decidir se política alpha0/255 atual é adequada sem mudar silenciosamente.
- [ ] Testar desenho/mover/resize referência e gestos de composição em celular real.
- [ ] Garantir aviso dirty cobre troca de dados base e navegação; evitar perda de edição.
- [ ] Validar troca/remoção/ordenação múltiplas artes e stickers, salvar/recarregar e preview.
- [ ] Preparar upload direto assinado aoR2 para Vercel, com vínculo/limites/finalização servidor e rejeição de objetos inválidos; não expor secrets.
- [ ] Definir limpeza de uploads órfãos/backups sem apagar arquivos referenciados.

### B. Cliente e contratação
- [ ] Organização/contato necessários, vínculo com campanha; evitarCRM completo.
- [ ] Resumo contratado, responsabilidades, valor, período, revisões e política de cancelamento.
- [ ] Aprovação registrada pelo administrador (canal externo WhatsApp/email pode continuar), quem/quando/versão.
- [ ] Histórico mínimo de ações, sem dados excessivos.
- [ ] Definir condição padrão de liberação (pagamento integral antes de ativar foi RECOMENDAÇÃO, não política comercial final formalizada). Condições originais eram negociáveis; não bloquear acordos sem decisão.
- [ ] Reconciliar oferta: original playbook referênciaR$990; apresentação245/395/645/sobproposta por vagas. Não fixar tabela no sistema sem confirmar. Kit criação/adaptação/divulgação incluídos divergiam.

### C. Cobrança e checkout PixGo
- [ ] Admin cria solicitação vinculada, preço e condição fixados no pedido/versionados; editar campanha não pode mudar valor de cobrança emitida.
- [ ] Link permanente aleatório opaco sem conta cliente, sem enumeração porUUID previsível nem exposição dados pessoais.
- [ ] Página resumo/valor/condições + aviso DePix exigido + dados reais pagador, CPF/CNPJ e consentimentos adequados.
- [ ] GerarQR/copiaecola, expiração pelo expires_at do provedor (não hardcode), nova tentativa após vencer, status de pagamento.
- [ ] Botão copiar link/mensagem WhatsApp; NÃO precisaAPIWhatsApp nem e-mail automático V1.
- [ ] Persistir tentativa segura, resolver timeout create e corrida callback antes de paymentId; external_id não é idempotency garantida.
- [ ] Painel financeiro tentativas/status + **Consultar na PixGo** para recuperação sobdemanda; sem worker/cron.
- [ ] Reembolso/cancelamento: tratar eventos já suportados, regras de negócio/admin e efeito sobreliberação; API de executarrefund não foi validada/documentada, não inventar.
- [ ] Teste real controlado da conta, limites, carteira e eventos após autorização.

### D. Publicação e acesso público (maior lacuna)
- [ ] Validação de pacote completo pronto, ao menos1arte, assets existentes, referência/dimensões, direitos/aprovação operacionais.
- [ ] Congelar/identificar versão aprovada. Pagamento não publica rascunho alterado/incompleto.
- [ ] Publicar versão consistente em endereço estável; decisão arquitetura entre atual domínio/editorCloudflare ou rota pública nova não implementada. Preferir reaproveitar público existente, evitar duasfontes de verdade.
- [ ] Separar materiais privados de conteúdo público e não expor dados comerciais/cliente no manifesto.
- [ ] Gate aprovação+pagamentoexigido+periodoválido. Pagamento e publicação são estados separados; falha publicação não desfaz pagamento nem cobra de novo.
- [ ] Processo síncrono compatível com limites daVercel; se demorado, discutir alternativa com usuário em vez de reintroduzir worker sem aprovação. Retry explícito pelo painel é caminho V1.
- [ ] Atualização/reversão sem quebrar material cacheado ou sessão antiga; assets imutáveis/versão e manifesto porúltimo.
- [ ] Link público +QRdivulgação (distinto doQRpagamento) para organizador.
- [ ] Suspensão administrativa com registro.
- [ ] Encerramento automático pelo endsAt na leitura pública/abertura editor (não precisa cron para checar data), URL permanece com mensagemencerrada. Definir sessõesjáabertas, não prometer antes de implementar.

### E. Métricas e relatório básico
- [ ] Visitas, ediçãoiniciada, PNGgerado, arte/stickers usados porcampanha.
- [ ] Reutilizar contrato PostHog original se apropriado; preview interna não contam como participante.
- [ ] Proibir fotos/composições em eventos, autocapture/sessionreplay de canvas.
- [ ] Relatório simples paraadmin entregar aoorganizador, não dashboard sofisticado.
- [ ] Exportação não é pessoaúnica nem post/reach; sem promessa alcance.

### F. Produção e prontidão
- [ ] Configurar Vercel, DBgerenciado, R2, DNS/HTTPS somente com autorização para provisionar/custos.
- [ ] Secrets próprios, rotas/origins corretos, check integração PixGo live.
- [ ] Backups +restauração PostgreSQL/R2 e retenção, logs seguros, alertas operacionais webhook/publicação.
- [ ] Revisar dependências/tooling e rate limiting distribuído; auth em memória não resolve brute force multiinstância.
- [ ] Termos/privacidade/contratação/avisosDePix e processo fiscal; jurídica/contábil não implementada pelogateway.
- [ ] Fluxo completo produção controlado: preparar→aprovar→pagar→publicar→compor/exportar→encerrar→relatório.
- [ ] Piloto pago e medição esforço/margem/suporte/recompra. Demo/piloto não comprovam preço e aquisição.

## 10. Ordem sugerida e critérios de conclusão

1. Estúdio confiável com materiais reais.
2. Cliente/contratação/aprovação.
3. Checkout e painel de cobrança real (mock primeiro).
4. Publicação e encerramento de versão aprovada.
5. Relatório básico e operaçãoprodução.
6. Venda real pontaaponta com autorização.

Entregar por fatias utilizáveis, com testes que clicam/submetem a ação real. Teste que só vêformulário não validasubmit. Não inserir botões sem ação, links semdestino ou mensagens que indiquem pronto quando nãoestá.

**V1 pronta:** fundador consegue realizar toda jornada da seção1 sem terminal para configurar cadaevento e sem conferirPixmanualmente nofluxopadrão, com alternativa deconsulta/retry emfalhas. Não exige conta cliente, assinatura, automaçãoWhatsApp, IA/criação dekit, galeria departicipantes, importaçãofotógrafos oudashboardavançado.

## 11. Arquivos de apoio

- `AGENTS.md`: regras obrigatórias.
- `README.md`: bootstrap/escopoatual.
- `docs/architecture.md`: contratosbackend.
- `docs/auth.md`: segurançalogin e testes.
- `docs/development.md`: infra/mocks.
- `docs/campaign-editor.md`: estúdio/upload/referência.
- `docs/editor-testing.md`: runner isolado.
- `docs/validation.md`: evidências históricas; ler datas/etapas e não presumir tudoatual.
- `docs/security.md`: limites/tooling/produção.

Alertas `npm audit` apareceram no tooling (drizzle-kit→esbuild e eslint-config-next→picomatch), além peer ESLint10. Não fazer auditfixforce: sugestões incluíam downgradesincompatíveis. Revalidar e tratar antesdeprodução; não declarar exploração emruntime semevidência.

## 12. Prompt para iniciar nova sessão

```text
Continue o projeto /Users/thadeubrito/workspace/namarca.
Leia AGENTS.md e docs/CONTINUIDADE.md completos, depois os arquivos específicos da entrega.
Não altere o projeto original /Users/thadeubrito/workspace/personal/namarca.
Preserve contas, sessões, campanhas, volumes e secrets existentes.
Use somente ferramentas em containers, sem serviços externos reais.
V1 é administrativa, sem contas de clientes, sem worker/cron/Inngest.
Antes de implementar, confirme o estado do código e diferencie funcionalidade existente de pendência.
Próxima entrega desejada: [indicar uma das etapas do backlog].
Ao terminar, valide o fluxo de verdade, documente limitações e atualize a continuidade.
```
