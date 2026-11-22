# Namarca — continuidade de implementação da V1

## Header — acompanha tema claro/escuro (21/11/2026)

Fundador aprovou substituir header preto fixo por branco no light/preto no dark. Removidos overrides locais de tokens/cor; header herda background/foreground/line/foco/hover do ThemeScope, mantendo grid/menu/ações/seleção. Canvas html/body com admin-shell agora branco padrão e preto somente dark (atributo pré-paint ou classe), evitando faixa preta no scroll elástico light. Substitui decisão anterior de header sempre preto; referência marketing não impõe contraste fixo no administrativo. Sem auth/actions/schema novos.

Typecheck/lint/130testes+1skip/buildproduçãoisolado/diffcheck aprovados containers. Browser focal markup representativo+ui.css real Chromium8cenários1440/768/390/320claroescuro: backgroundheader/canvas iguais esperado/indicadorforeground/zerooverflowhorizontal. Capturas /tmp/namarca-campaign-skeleton-review/header-*.png; principal observou390light. Fixture inicial concatenava CSScompilado antigo com tokens/cascade layers duplicados e texto branco; removida duplicação e8reexecutadosPASS, sempatchproduto para fixture. Limites sem DOM Reactauth/hydration/teclado/scrollSafari real; fixture nãoE2E. Sem migrations (schema inalterado), commit/push/deploy/serviçosreais/dadosvolumes alterados.


## Tema — dark antes da hidratação (21/11/2026)

Fundador reportou flash light no refresh com dark salvo. Causa: ThemeScope SSR/useSyncExternalStore inicia claro, preferência só após hidratação. Script fixo no head lê somente namarca-admin-theme e aplica data-admin-theme ao html antes de pintar; exceção storage/valor inválido mantém claro. CSS aplica tokens dark às ui-scope pelo atributo, sem depender da classe pós-hidratação. suppressHydrationWarning restrito ao html pelo atributo pré-paint. Toggle e eventos storage/custom mantêm atributo sincronizado; classes/portais/useDarkTheme existentes preservados. Sem cookie/auth/backend/schema novos.

Typecheck/lint/130testes+1skip/buildproduçãoisolado/diffcheck aprovados containers. Chromium login real com bundles JS bloqueados confirma background preto/color-scheme dark antes hidratação para preferência dark, branco/light para light; com JS normal toggle dark→light+reload persiste light. Runner /tmp/namarca-campaign-skeleton-review/theme-check.cjs. Primeira asserção reload falhou porque addInitScript da fixture sobrescrevia preferência em toda navegação; corrigido fixture para inicializar somente ausente e PASS. Sem login/submits/contas reais, sem authintegração (lógica inalterada)/migrations/browser autenticado; verifica tokens pré-hidratação, não gravação quadroaquadro de FCP. Sem commit/push/deploy/PixGo real/dadosvolumesalterados.


## Campanha — skeletons por seção e carregamento da página (21/11/2026)

Pedido fundador: atualizar página e abas. Nova fronteira loading.tsx usa aba da URL e CampaignPageSkeleton (cabeçalho/nav desktop lateral e mobile horizontal), com CampaignTabSkeleton próprio Detalhes/Cobrança/Publicação e visual compartilhado. StudioSkeleton substitui tabs internas/índices/ações antigas por cartões160px+rodapé duas ações Artes/uma Figurinhas ou quatro linhas Cores, preview28px. Contexto leve no launcher entrega activeSection ao fallback dynamic sem remontar workspace; GET também usa seção atual. CSS legado dos skeletons removido, tokens compartilhados/aria-busy/status único/decoração ariahidden/zero controles/reducedmotion. Sem alterar fetch/actions/auth/recovery/instânciaiframe ou introduzir loading artificial nas trocas já carregadas.

Typecheck/lint/128testes+1skip/buildproduçãoisolado/diffcheck aprovados containers. Browser focal renderToStaticMarkup dos componentes+CSS reais (inclui CSS base compilado), Chromium rede none:60cenários seisabas×1440/1024/768/390/320×claroescuro, zerooverflowhorizontal,1status/zerocontroles, reducedmotionnone. Evidências36capturas/results em /tmp/namarca-campaign-skeleton-review; principal observou Artes1440claro/Publicação320claro/Cores390escuro. Inspeção detectou toolbarrecortada mobile: flexwrap corrigido e60reexecutadosPASS. Tentativa fixture compilada sem CSSbase deixava sr-only visível; corrigida fixture; wrapperfixture sem minwidth/boxsizing causou overflow próprio, corrigido semmascararCSSproduto. Limites:fixtureSSR estática sem Nextstreaming/hydration/auth/rede lenta real; nãoE2E. Build aprovado antes do ajuste final flexwrapCSS; typecheck/lint/testes/browser finais após. Schema inalterado/migrations não reexecutadas, sem commit/push/deploy/PixGo real/dadosvolumesalterados.


## Campanha — aba persistida na URL (21/11/2026)

Pedido fundador: atualizar Publicação não deve voltar a Detalhes. CampaignSections deriva seleção de useSearchParams `aba`, com allow-list das seções disponíveis e fallback dados. Troca via history.pushState integrado ao Next evita navegação servidor/remontagem/alterações nos rascunhos e permite Voltar/Avançar entre abas; preserva parâmetros e fragmento. WorkspaceTabs inicia visited pela seleção resolvida. Sem mudanças visuais, auth/backend/schema/migrations novas. Testes helpers cobrem seis abas, valores inválidos/indisponíveis e preservação da URL; teste estrutural antigo atualizado para initialId dinâmico.

Typecheck/lint/build produção isolado e 127 testes+1skip aprovados em containers; diffcheck aprovado. Primeira suíte falhou somente na expectativa estrutural initialId=dados, adaptada ao novo contrato; build inicial tentou flag --tmpfs não suportada por compose run, execução final com volume .next anônimo aprovada. Sem novo browser autenticado/reload real: testes não equivalem E2E de navegação/rascunhos. Schema inalterado, migrations não reexecutadas. Sem commit/push/deploy/PixGo real ou alterações de contas/campanhas/volumes existentes.


## Edição — descartar pendências somente da aba (21/11/2026)

Fundador aprovou Descartar edições junto Salvar em Detalhes/Artes/Figurinhas/Cores e renomear operação pública. Detalhes expõe discardEdits distinto recuperação: baseline último save confirmado, sincroniza cliente/data controlados+inputs, limpa só sessionStorage dados/pending, semsubmit/rede. Estúdio helperpuro discardStudioScope restaura só scope salvo (tema+colorlegado), preserva outroscampos/blobs/revisão, changeMaterials revogaURLs removidos, seleçãofallback/referência reiniciada sóartes; IDB viafila existente preserva residual e apaga somente todolimpo. Tokens/feedback só scope. Botões ghost sódirty, confirmaçãoAlertDialog Cancelarfocoinicial/Escape/cancelpreserva; aceite retornaSalvar (studioaria-disabled focável/guardsemrequest), cancel retornaacionador. Busy/recovery/conflictprotegem. Publicação agora Restaurar versão publicada em botão/dialog, distingue restauração do draftsalvo de descarte local. Sem backend/schema/migration novos ou remoção de objetos servidor.

Typecheck/lint/125testes+1skip/buildproduçãoisolado/diffcheck aprovados containers. BrowserDetalhesSSRhydratehook/formCSSreais6cenários1440/390/320claroescuro: nome/notes/cliente/data/newclient/cancelEscape/trap/foco/baselinenormalizadopóssave/limpasóchavedados/zerosubmitoumutação;36capturas /tmp/namarca-local-discard-details-review. Studio clientrenderedcomponentehelperIDBBlobURLsreais6percursos mesma matriz: trêsscopesdirty/descarteisolado/URLs/revisão7/residualIDBreloadrecover/limpezafinal/SalvarlimpoEntersemrequest/zeroPUTPOSTPATCHDELETE/pageerror/overflow;24capturas /tmp/namarca-local-discard-studio-review. Inspeção principal encontroubotõesmodalcolados; corrigidoheader/footerpadrão,6percursosreexecutadosPASS; principal observou320dark-dialog final e320dark-details-dialogEscape. Consoleestúdio temwarningiframepreexistenteUnrecognizedfeatureweb-share; Detalhesconsolelimpo. Limites auth/backend/actions/status/recoveryglobalmockados conformefixture, semruntimecomposiçãoreal/Chromiumonly/nãoE2E; IDB/recoveryestúdioreais. Sem commit/push/deploy/PixGoreal/siteantigo/dadosvolumes alterados.

## Publicação — manutenção junto do contexto, sem Opções (21/11/2026)

Fundador aprovou remover menu Opções. Suspender/Reativar agora Action secundário no rodapé Publicada atualmente; Descartar alterações Action ghost junto CTA primário Próxima publicação, desktopwrap/mobileempilhado. Removidos importsRadix/ícones/theme e CSSmenu exclusivos. Confirmações/forms/guards mantidos, foco retorna botão específico publish/discard/access. Descarte continua delivered+diff/bloqueadodirtyany, acesso mantém disponibilidade/pending/regras existentes. Nenhuma alteração backend/schema/migration.

Typecheck/lint/120testes+1skip/buildproduçãoisolado/diffcheck aprovadoscontainers. Browser focalSSRhydrate componentesCSSreais66cenários/570verificações1440/390/320claroescuro aprovado: semmenu/açõesnosblocos/dirtyvisualbilling/pending/first/endedsuspended/busy/confirmaçõescancelEscape/trap/foco/payloads; descarte typebutton semsubmitpublicação, acceptúnico.60trocasrerender mantêm1diff/1histórico. Zerooverflow/pageerror/consolewarnings. Evidências384capturas/RESULTADO /tmp/namarca-publication-inline-actions-review; principal observou390dark-current1-overview. Limites actions/router/contextosmockados/nãoE2Eauthpersistência/Chromiumonly. Sem commit/push/deploy/PixGo real/siteantigo/volumesdados alterados.

## Publicação — próxima publicação concisa (21/11/2026)

Fundador pediu melhorar bloco Rascunho do administrativo, especialmente repetição dirty/versão/CTA. Rótulo Próxima publicação, Versão N destacada, contexto único dirty Salve as alterações nas abas editadas para continuar (role status), sem Notice duplicado/parágrafo condicional. Pronto explica substituição da versão pública; botão Publicar alterações sem repetirN. Sem alterações/pending/primeira/suspensão/guards/actions/backend preservados. Typecheck/lint/120testes+1skip/diffcheck aprovadoscontainers; sem novo browser/build/schema/migrations/commit/push/deploy nesta mudança textual.

## Correção — comparador duplicado ao trocar versão pública (21/11/2026)

Fundador reportou novo Comparar alterações a cada Publicar esta versão. Causa comprovada: PublicationDiff e PublicationVersions irmãos com mesma key revision:updatedAt:version; React reconciliava incorretamente e acumulava DOM. Prefixadas keys diff: e versions:, mantendo reset por snapshot e aparência/ações/backend inalterados. Teste estrutural protege identidades distintas.

Typecheck/lint/120testes+1skip/buildproduçãoisolado/diffcheck aprovadoscontainers. Browser focalSSRhydrate mesma root/componentesCSSreais1440/390claroescuro: versão antiga reproduziu11comparadores após10cliques reais de publicação mock/refresh controlado (31/32warningskeys porcaso); corrigida manteve1comparador+1histórico em todos passos, zeroconsolewarnings/pageerror/overflow. Seletores/diff/histórico funcionais após10trocas. Evidências12capturas/results/RESULTADO em /tmp/namarca-publication-key-review. Limites actions/router/contextosmockados/semE2Eauthpersistênciareal/Chromiumonly. Sem schema/migrationsnovas/commit/push/deploy/dadosvolumes alterados. DOM duplicado já existente pode exigir recarregar a página uma vez para limpar resíduos anteriores ao hotreload.

## Publicação — visão geral atual/rascunho e histórico recolhido (21/11/2026)

Fundador considerou toda a aba confusa exceto Comparar alterações e pediu mudança significativa. Nova overview separa Publicada atualmente (número real, acesso ativo/suspenso/prazoencerrado e última entrega) de Rascunho do administrativo (próximo N com frase Ao publicar será criada… no lugar de…, CTA dedicado, ou Sem alterações semCTA). Desktop duas colunas divididas/superfície tonal; <=900 empilha. Primeira deixa claro Ainda não publicada; pending separado com número congelado e aviso edições posteriores não incluídas; dirty orienta salvar antes e condiciona novoN à diferença real. Comparador preservado após overview. Histórico abaixo em details Versões publicadas recolhido/contagem; ao abrir seletor+duas linhas explicativas distintas: alterar publicação atual sem novoN/draft e recuperar conteúdo para editar semmudarpúblico. Confirmações/forms/guards/servidor/negócio intactos, sem schema/migration nova.

Typecheck/lint/120testes+1skip/buildproduçãoisolado/diffcheck aprovados containers. Browser focalSSRhydrate componentesCSSreais100cenários/630verificações1440/1024/768/390/320claroescuro aprovado: current1/hist2/próxima3, atualidêntica, primeira/pendingfirst/history/suspensa/encerrada/dirtyvisualbilling/busy, histórico fechado/seleçãosemmutação, açõeshistóricas/cancelEscape/foco/trap/payloads/descarte/acesso;240actionsmock, zerooverflow/pageerror/consolewarnings. Comparador10/10 DOM/computedstyles iguais artefatosanteriores normalizandoIDsReact/seleção. Evidências560capturas /tmp/namarca-publication-clarity-review/{RESULTADO.md,results.json}; principal observou390dark-current1-overview e1440light-current1-overview. Limites contexts/actions/routermockados/sem authpersistênciareloadreal/fixturesemmateriais/Chromiumonly, nãoE2E. Gate marketing da skill não aplicado ao workbench autenticado (contrato operacional local prevalece). Sem commit/push/deploy/PixGo real/siteantigo/dadosvolumes alterados.

## Publicação — título identifica versão no ar após retorno (21/11/2026)

Fundador confundiu próxima Versão3 em destaque com versão criada ao voltar2→1. Corrigida apresentação: título sempre versão efetivamente pública/contexto Publicada atualmente; próximo número somente CTA Publicar rascunho como Versão N. Pending mantém versão ainda pública no título e identifica número reservado no contexto; primeira publicação mantém Versão1/Ainda não publicada. Botão permite quebra responsiva para não gerar overflow com texto maior. Nenhuma mudança backend/numeração/storage: publicar versão histórica continua mesmo número, só publicação do rascunho cria max+1. Testes estruturais atualizados; typecheck/120testes+1skip aprovados containers. Sem novo browser, migrations/schema/auth/push/commit/deploy.

## Publicação — publicar versão histórica e restaurar somente rascunho (21/11/2026)

Fundador aprovou separar duas ações: Publicar esta versão muda somente público, mesmo número; Restaurar no rascunho substitui somente nome/prazo/artes/figurinhas/cores editáveis. Seção Versões com SelectField compartilhado, indicação da atual/data/responsável, dois secundários e AlertDialogs distintos; seleção não executa ação, atual não republicável pelo botão. Dirty de qualquer aba inclusive Cobrança bloqueia ambas, pending oculta seção, busy trava workbench; restore recarrega painéis persistentes. Comparador inicia na versão efetivamente pública, não maior N; cabeçalho distingue atual e próxima (max histórico+1). Descartar alterações existente preservado.

Nova action requireAdmin/campos únicos/confirm/inteiros seguros/timestampcanônico. Serviço histórico lock campanha→editor valida stale/pending/alvo escopado/ownership/slug/prazo futuro (mesmo suspensa); materializa legado com helper seguro e grava ponteiro antes troca DB. Current arquivado/history alvo transferido para current sem perder conteúdo; draft/editor/identidade/financeiro/suspensão intactos (somente updatedAt monotônico para stale). Restaurar aceita versão histórica, mantém público/storage/history e metadata. Próxima publicação max(current,history)+1 com overflowguard. Autoria/autorização originais preservadas; deliveredAt é última entrega efetiva, monotônica sobre current/history, fallback pending por deliveredAt no detalhe/diretório. Sem schema/migration nova. Histórico é conjunto de snapshots, não log de alternâncias nem auditoria específica do ator do rollback. S3/DB sem atomicidade: commit falho após PUT pode divergir até retry explícito. Sessões públicas abertas não trocam composição automaticamente; novo conteúdo após recarga.

Typecheck/lint/120testes+1skip/buildproduçãoisolado/diffcheck aprovados containers. Build tentativas iniciais falharam por symlink deps fora root Turbopack e env auth sintético incompleto; final cópia tmpfs sem.env/networknone/configsintética aprovado. Integração DB/S3/HTTP isolada aprovada: público2→1 draft intacto, restauração histórica público intacto, próxima3, pending apósrollback identifica1, stale/pending/unknown/escopo/ownership/prazo/falhaS3; migrations históricas integrais DBtmpfs, fixtures/bucket vazios e recursos próprios removidos, principais preservados. Evidências /tmp/namarca-pubrestore-1795264481-65393. Browser focalSSR+hydrate componentes/CSSreais36cenários1440/390/320claroescuro aprovado: seleção semsubmit/atualdisabled/cancelEscapezero/retornofoco/36submitsnativos=36actionsmock/payloads/dirtyinclusivebilling/busy/pending/zerooverflow/pageerror/consolewarnings. Evidências /tmp/namarca-historical-versions-review; principal observou390dark-current2-selected e320light-current1-restore-dialog. Limites actions/router/contextosmockados, semsubmitNext autenticado/reloadpersistênciareal/Chromiumonly; nãoE2E/authintegral. Sem commit/push/deploy/PixGo real/site antigo/volumes alterados.

## Primeira publicação — confirmação sem checkbox financeiro (21/11/2026)

Fundador confirmou financeiro independente/webhook não publica e aprovou simplificação. UI Versão1/Ainda não publicada, CTA Publicar campanha, sem checkbox/texto sempagamento. Primeiro submit abre AlertDialog com materiais da Versão N disponíveis no linkpúblico; confirmar envia hiddenconfirmyes mantendo exigência servidor, cancelar não publica. Dirty mostra Salve as alterações para publicar somente quando real; CTA bloqueado dirty/revision0. Updates/pending submitdireto sem repetir confirmação. Ref origem garante foco voltaPublicar ou Opções conforme operação. Nenhuma mudança webhook/financeiro/regra publicação manual.

Typecheck/lint/118testes+1skip/buildproduçãoisolado/diffcheck aprovadoscontainers. BrowserfocalSSRhydrateCSS/theme reais30cenários5estados×1440/390/320claroescuro: focoCancelar/Tabtrap/Escape/cancelretornoPublicar/zerosubmitcancel/acceptúnico payloadconfirmrevisionupdatedAt/semloop/dirtyrevision0disabled/pendingupdate semdialog/semcheckboxfinanceiro/zerooverflow/pageerror/consolewarnings/diálogosnativos. Evidências66capturas/results/RESULTADO /tmp/namarca-first-publication-review; principal observou320dark-first-clean-dialog. Limites mockactionscontextorouter/semauthpersistência/Chromiumonly. Semschema/migration nova/commit/push/deploy.

## Publicação — confirmações AlertDialog em vez de browser (21/11/2026)

Fundador prefere shadcn a alertas nativos. Criado components/ui/alert-dialog.tsx composição local padrão shadcn sobre Radix, com backdrop/tokens/classes existentes ws-recovery-dialog e temaportal. Publicação usa confirmação controlada para descarte/suspensão/reativação, Cancelar focoinicial, Escape/cancel semsubmit/focoretornaOpções; açãoexplícita arma flagconsumível e requestSubmit no formhidden existente, guardsdirty/busy preservados. Removido window.confirm desta aba; outros guardsnativos do app fora escopo. Sem backend/schema novo.

Typecheck/lint/118testes+1skip/buildproduçãoisolado/diffcheck aprovadoscontainers. Browser focal36cenários1440/390/320claroescuro operações+dirty/pending e6extrasaltura480/reducedmotion aprovados: focoCancelar/Tabtrap/ShiftTab/Escape/cancel/retornoOpções/cliqueforasemconfirmar/zerodiálogosnativos/72submitnativos=72chamadasmock/payloadcorreto/erroforaformsmodal/zeroJSconsolewarnings/modalviewport/scrolllock/busy. Evidências /tmp/namarca-publication-dialog-review/{RESULTADO-DIALOG.md,results-new.json,extra-results.json,new-*.png}; principal observou320dark-dirty-billing-access-dialog. Tentativasiniciais fixtureomitiaCSS corrigidas sempatchproduto; final36+6PASS. Limites Chromium/actionscontextoroutermockados/semauthbackendpersistênciareloadreal/nãoE2E. Sem migration nova/commit/push/deploy.

## Publicação — menu identificável (21/11/2026)

Fundador só percebeu CTApublicar. Trigger menu passou de íconeghost isolado para Opções+reticências em superfície secundária tonal/alvo44, mantém buttonnativo/Radix/posição no título. Typecheck/testefocal/diffcheck aprovadoscontainers; sem novo browser/build/schema/commit/push/deploy.

## Publicação — uma ação principal e manutenção no menu (21/11/2026)

Fundador rejeitou pilha de3botões e pediu referênciaRevolut. Mantido somente CTAconteúdo; descarte e suspensão/reativação migrados ao menu Mais opções de publicação (ghost44 canto superior junto título). Radixportal/tema/superfície/itens44 compartilhados com menu cobrança, separador entre descarte/acesso, ícones neutros. Forms hidden com requestSubmit preservam actions/confirm/stale/revision; erro/sucesso/progresso fora forms ocultos, dirty impede descarte e working bloqueia trigger/submits. Sem mudança backend/schema. Browser encontrou Enter falhando ao compor ActionMotion com TriggerRadix: substituído por buttonnativo com mesmas classes, evitando doubletoggle.

Typecheck/lint/118testes+1skip/buildproduçãoisolado/diffcheck aprovadoscontainers. Browser focalSSR+hydratecomponentesCSSThemeScopereais66cenários11estados×1440/390/320claroescuro aprovado: CTAúnico/menuvisibilidade/dark/trigger44/dirtyinclusivebilling/162submitsnativos=108mock+54cancelamentos/semduplicaçãocamposerrados/erroforahidden/zerooverflow/pageerror/consolewarnings. Enter/Space/ArrowDown42cenárioscada126sequências+Escape/focorestauradoaté500ms aprovadosapóscorreção; sem fallbackclick. Evidências174capturas/results/RESULTADO /tmp/namarca-publication-menu-review; principal observou390dark-suspended-changes-open. Limites mocksactions/contexto/router semauth/backend/submitNext/reloadrestored; Chromiumonlysemtoquefísico/leitor. Sem schema/migration nova/commit/push/deploy.

## Publicação — descartar alterações não publicadas (21/11/2026)

Fundador aprovou restaurar rascunho à última versão publicada. Ação ghost Descartar alterações somente delivered+diff, confirmação com Versão N e campos preservados. Qualquer dirty local (inclusive Cobrança) bloqueia para proteger reload completo pós-sucesso que sincroniza Detalhes/Estúdio persistentes. Pending não oferece e servidor rejeita. Nova action requireAdmin+campos únicos/confirm/revision/updatedAt/version; serviço lockcampaign→editor restaura nome/prazo/configvalidada com arquivosUUID.png e incrementa revisão/timestamps monotônicos. Mantém slug/cliente/notes/preço/suspensão/status/publicação/history/storage/financeiro. Prazo passado permitido; stale/version/ownership/overflow rejeitados. Sem cleanup automático: arquivos órfãos do draft seguem limpeza manual segura. Sem schema/migration nova.

Typecheck/lint/118testes+1skip/buildproduçãoisolado/diffcheck aprovadoscontainers. Browser focalSSR+hydrateCSS/componentesreais48cenários1440/390/320claroescuro: visibilidade/dirty inclusivebilling/cancelzerochamadasmock/acceptcamposesperados/errovisível/zerooverflow/pageerror/consolewarnings. Evidências /tmp/namarca-publication-discard-review, principal observou320dark-suspended-changes com erro sintético. Mocks de action/contexto; não prova reload/persistência/submitNext/auth real. Integração DB/S3/HTTP própria aprovada: restaura nome/prazo/config/referênciasprivadas, revisão8/monotonicidade/stale/pending/metadata/financeiro/publicação/history/bytespreservados; regressõespublicação/acesso/hostindependente aprovadas. Migrations completas DBtmpfs própria; fixturesDB/bucket vazios, quatrocontainers/duasredes próprios removidos, principais preservados. Evidências /tmp/namarca-pubrestore-1795260903-63019. Sem regressãoauthintegral/commit/push/deploy/PixGo real/site antigo.

## Cabeçalho — situação à esquerda, sem versão (21/11/2026)

Fundador rejeitou selo centralizado e versão no header. Nome+situação agrupados à esquerda, sem space-between; versão exclusiva aba Publicação. Linha secundária abaixo do nome somente Alterações não publicadas ou Envio pendente; removido Atualizada redundante. Comparador/backend/persistência intactos. Typecheck/3testes focais/diffcheck aprovadoscontainers; sem novo browser/build/schema/migration/commit/push/deploy.

## Regra de nomenclatura — Versão N (21/11/2026)

Fundador determinou usar sempre Versão N, nunca vN na interface. Ajustados também resumo do cabeçalho da campanha e frase do comparador; seletores já usavam Versão. Regra registrada no design-system; arquivos/rotas técnicos vN.json intactos. Typecheck/2testes focais/diffcheck aprovadoscontainers; sem browser/build/schema/commit/push/deploy.

## Publicação — nomenclatura de versão consistente (21/11/2026)

Fundador apontou mistura Versão3/v2. Cabeçalho agora Versão3 / Versão2 publicada atualmente; pending e confirmação de reativação também usam versão por extenso, sem prefixo v repetido. Typecheck/teste focal/diffcheck aprovados containers antes das duas substituições textuais finais pending/confirmação; sem novo browser/build/schema/commit/push/deploy.

## Publicação — versão protagonista, sem diagrama (21/11/2026)

Fundador aprovou aplicar proposta mais alinhada Revolut: removida linha dl/seta/cobalto, título da seção agora Versão N (32px500desktop/28mobile foreground) e contexto13pxmuted Publicada atualmente:vN. Atualizada usa número atual/Publicação atualizada; primeira Versão1/Primeira publicação; pending usa número reservado/contexto envio pendente e versão anterior, sem incremento indevido. Substitui título operacional anterior, sem empilhar informação extra. Botões/guards/backend intactos. Typecheck/lint/114testes+1skip/buildproduçãoisolado/diffcheck aprovadoscontainers. Browser focalSSR+hydrate/componentesCSSreais36cenários seisestados×1440/390/320×claroescuro aprovado, fonte/peso/cor/textos/zerooverflow/pageerror/consolewarnings. Evidências /tmp/namarca-publication-heading-review, principal observou1440light-published-changes. Limites fixtureprops semshell/auth/actions/transições reais/diffrecolhido/Chromiumonly. Sem schema/migration nova/commit/push/deploy.

## Publicação — indicador atual → próxima versão (21/11/2026)

Fundador pediu mostrar versão atual/destino com elegância sem alongar ações. Substituída legenda por dl compacta Publicada vN → Ao publicar vN+1, rótulos12pxmuted/valores24px500(22mobile), seta18neutra/destino brand-text, sem card extra. Rascunho → v1; atualizada mostra só atual; pending usa versão reservada sem incrementar (com history ou primeira entrega). Backend/schema intactos. Typecheck/lint/114testes+1skip/buildproduçãoisolado/diffcheck aprovadoscontainers. Browser focalSSR+hidratação/CSSreais aprovado36cenários seisestados×1440/390/320×claroescuro; paresdtdd/números/pending/sempróximaatualizada/zerooverflow/pageerror/consolewarnings. Evidências /tmp/namarca-publication-version-review/{RESULTADO.md,results.json,capturas}; principal observou320dark-pending-history. Limites fixture props sem shell/auth/actions/transições, diffrecolhido/Chromiumonly/semleitor ou celularfísico. Sem migration nova/commit/push/deploy.

## Publicação — textos e ações concisos (21/11/2026)

Fundador considerou aba verbosa/label quebrando. Label fixa Publicação, sem sufixos; removidas props exclusivas hasPublished/unpublishedChanges/deliveryPending de CampaignSections (estado no header/painel preservado). Botões Publicar/Publicar alterações/Concluir envio e Suspender/Reativar, sem versão/campanha repetidas. Removidos parágrafos genéricos e título Disponibilidade; detalhes de efeitos/versão/rascunho continuam na confirmação nativa. Avisos essenciais suspensão/pending/prazo/dirty e checkbox inicial sempagamento preservados. Typecheck/lint/114testes+1skip/diffcheck aprovados containers; sem novo browser/build/schema/migration/commit/push/deploy nesta rodada textual.

## Público — processo antigo rejeitava versões (21/11/2026)

Após materialização legada, fundador continuou vendo Evento não encontrado. Diagnóstico real somente leitura confirmou ponteiro200{version:2}, versão válida existente S3HEAD200/parser aceito/PNGs200, mas HTTPgatewaylongrunning404 na rota versions/v2.json. Listener efêmero com módulo atual no mesmo container retornou200: processo Node sem hotreload iniciado antes da alteração da allowlist de versões. Runtime servido idêntico aos arquivos atuais; loader compilado reproduziu MissingEventError por404gateway. Reiniciado SOMENTE public-site via Compose, sem alterar DB/storage/campanhas/contas/volumes: shell/ponteiro/versionsv2HTTP200 depois. Primeira chamada imediata ao restart encontrou conexão fechada; verificação seguinte200. Não precisou suspender/reativar/republicar. Sem código novo/testes/build/migration/commit/push/deploy nesta correção operacional; browser participante após restart ainda não executado.

## Correção — acesso de publicações legadas (20/11/2026)

Investigação de Evento não encontrado após reativar encontrou bug determinístico: migration0014 numera DB sem materializar bucket; setCampaignSuspended escrevia pointer vN mesmo para snapshot entregue como manifesto completo/releases. event.json200JSON→versions/vN.json404text/plain→MissingEventError. Gateway aceita corretamente versão/release; não é erro de parse nem404 do HTML da campanha. Correção mínima: acesso faz HEAD da versão e, somente se404, grava snapshot público congelado preservando caminhos releases antes do pointer; nunca deriva do draft/copiaPNG/sobrescreve versão existente. HEAD403/503 e falhaPUT bloqueiam pointer/commit. Repetição explícita pode reparar pointerórfão; nenhuma campanha real foi consultada ou alterada.

Container rede none:2testes novos com gatewayHTTP+loadEvent reais/mapa storage sintético reproduzem legado ativo→pointerórfão→suspender→reativar e verificam404/status/contenttype, referênciasPNGlegadas200, ordemPUT/imutabilidade/falhas. Typecheck com.nexttmpfs, lintfocal, suíte114aprovados+1browseropt-inignorado e buildprodução em cópia efêmera sem.env aprovados. Typecheck inicial bloqueado por.next obsoleto/admin; nenhum cache host apagado. Sem DB/S3reais/browser/auth/migrationsnovas(schema inalterado)/deploy/push/commit. Não confirma identidade da campanha reportada: serviços estavam parados; causa comprovada na implementação e fixture, não por inspeção do registro real. Nenhum segredo/.env lido ou impresso.

## Publicação — remover Abrir campanha (20/11/2026)

Fundador pediu retirar botão Abrir campanha pública da aba Publicação; possível alternativa fixa no header será avaliada depois, não implementada. Removidos link, prop publicUrl e import exclusivo da página. Publicação/suspensão/backend preservados. Typecheck/3testes focais/diffcheck aprovados containers; sem novo browser/build/schema/migrations/commit/push/deploy.

## Publicação — sem aviso destacado de suspensão (20/11/2026)

Fundador rejeitou a div “Acesso público suspenso. Publicar alterações não reativa a campanha.” Removido Notice separado; orientação curta integrada à descrição existente quando há alterações: “Publicar alterações mantém a campanha suspensa.” Situação/ações/confirmação/backend preservados. Typecheck/teste focal/diffcheck aprovados containers; sem novo browser/build/migrations (sem schema novo). Sem commit/push/deploy.

## Publicação e disponibilidade independentes (20/11/2026)

Fundador aprovou vocabulário Rascunho/Ativa/Suspensa/Encerrada e ações Publicar campanha/Publicar alterações/Suspender campanha/Reativar campanha. Migration0015_third_sinister_six adiciona suspendedAt/suspendedBy nullable em campaigns, gerada/revisada/aplicada sem apagar dados; publicationStatus permanece published ao suspender. Serviço sob lock compartilhado/updatedAt esperado grava ponteiro {version:N,suspended:true} antes do commit de acesso; publicar nova versão preserva suspensão, reativar libera última versão entregue sem rascunho. Pending bloqueia alteração de acesso; prazo não pausa e reativação expirada é rejeitada. Ator de última alteração em suspendedBy, data de suspensão atual em suspendedAt; não é histórico completo de acessos. UI com confirmação explícita, aviso de suspensão, feedback acessível e disponibilidade separada também no diretório usando prazo da versão entregue (fallback history), não prazo do rascunho.

Runtime lê suspensão antes de buscar versão e verifica ponteiro no-store a cada15s/foco/visibilidade respeitando intervalo mínimo/sem overlap. Detecção desmonta composição; reativação exige retry explícito. Checks ativos não remontam editor nem substituem composição; falha de rede é desconhecida, não reativação. PNGs/versões anteriores continuam públicos/cacheáveis; não é revogação instantânea, não apaga exportações e offline/abas congeladas/clientes antigos/CDN podem atrasar reconhecimento. S3/DB sem transação distribuída: PUT concluído+commit falho pode divergir até retry explícito; falha de commit não foi injetada.

Typecheck/lint/112testes aprovados+1browseropt-in ignorado na suíte padrão, buildproduçãoisolado e diffcheck aprovados containers. Host público teste HTTP aprovado. SQL correlacionado do diretório validado read-only sem imprimir dados. Integração DB/S3/HTTP isolada aprovada: falhas storage suspend/reativar preservam estado, stale rejeitado, suspendv1→publishv2suspensa→reativarmesma v2, retry repara ponteiro, pending bloqueado, expirada rejeitada mesmo com draft futuro, histórico/bytesimutáveis/financeiro preservados. Migrations completas DBtmpfs próprio; fixtures/bucket vazios e quatrocontainers/duasredes próprios removidos. Browser runtime focal Chromium opt-in aprovado com App/loader reais e PhotoEditor substituído por input local: identidade/composição preservada em checks ativos/offline, limite foco/visibilidade, desmontagem ao suspender, sem polling suspensa e retry explícito offline/ativo. Não valida canvas/exportação real. Browser administrativo focal SSR+hidratação componente/CSS reais aprovado30cenários1440/390/320claroescuro (primeira/ativa com mudanças/suspensa com mudanças/suspensa atualizada/encerrada ativa): rótulos, checkbox inicial, ações separadas, cancelar confirmação zerochamadasmock, aceitar yes/no, focos2px/alvos48desktop44mobile/zerooverflow/pageerror/consolewarnings. Capturas/results/RESULTADO em /tmp/namarca-publication-access-review; principal observou320dark-suspended-changes. Actions/navegação/contexto simulados; combinação encerrada+suspensa não coberta no browser, selects40px; sem toque físico/leitor tela. Não equivale submit administrativo autenticado ou regressão auth integral. Sem mudanças lógica auth/financeiro/PixGo real/deploy/site antigo/commit/push.

## Diff — linhas compactas consistentes (20/11/2026)

Fundador gostou expansível/fechado mas pediu conteúdo mais compacto/consistente. Summary preservado; Detalhes/Cores/Artes/Figurinhas agora mesmas linhas título/valor12pxpadding/divisória, pares anterior→novo inline sem rótulos visuais repetidos, thumbs32 vs64, semcards materiais. Modificação e reordenação agrupadas por ID numa só linha, contagem continua campos+materiais únicos. Cores amostras16; referência e nomes com wrap, mobile título→valor. Helper/backend/auth/schema intactos. Typecheck/lint/106testes/buildisolado/diffcheck aprovadoscontainers; browser focal Chromium SSR+hydrateCSSreal aprovado1440/390/320claroescuro: summaryfechado alturaidêntica/teclado/selects/foco/contagem7/8/6/mesmaversão/mergeporID/thumb32, zerooverflowhorizontalvisível/pageerror/consolewarnings. Compactaçãofixturedefault v2→draft36%desktop/20%390/30%320;24capturas/results/height/RESULTADO em /tmp/namarca-publication-diff-review, principal observou390dark. Limites semshell/auth/submit/autorizaçãoassetsreal/toquefísico, Chromiumonly. Sem deploy/push/commit.

## Diff — apresentação operacional Revolut (20/11/2026)

Fundador pediu melhorar UI conforme referência. Redesenhado PublicationDiff sem alterar helper/backend: details com ícone circular/cobalto+chevron+subtítulo, seletor de versões em superfície tonal20px/audit compacto12px, resumo numérico20px500. Removida tabela com scrollhorizontal; linhas semânticasdl Antes/Depois, swatchescirculares e cards materiais tonais20px com thumb64px/status textual, pares por campo para referência/nome/dimensão e ordem discreta. Mobile empilha seletores e pares complexos, sem paleta local/sombras/vermelhoverde decorativo. SelectField/foco/reducedmotion/miniaturas privadas preservados. Contrato docs/design-system atualizado.

Typecheck/lint/106testes/buildproduçãoisolado/diffcheck aprovados containers. Browser focal Chromium SSR+hidratação SelectField/CSS reais rede none aprovado1440/390/320claroescuro: zero tabelas/overflowhorizontal página e interno/pageerror/consolewarnings, teclado details/selects versão→draft/version/same/retorno, contagemcampos+materiaisúnicos7/8/6, refs/cores/audit/thumbs sintéticas, foco2px/restauração/reducedmotion.24capturas/RESULTADO.md/results.json em /tmp/namarca-publication-diff-review; principal observou390-dark-draft.png. Limites fixture sem shell/auth/submit/guardassets, Chromium apenas sem leitor tela/toque físico; viewportmobile não comprova pointercoarse, selects40px. Sem schema/migrations novas/auth/financeiro/deploy/push/commit, helpercomparação inalterado.

## Versões numeradas e diff administrativo (20/11/2026)

Fundador aprovou event.json ponteiro+vN e comparação de versões. Migration0014_marvelous_captain_flint.sql adiciona version em current/history com backfill determinístico e índice único history(campaign,version), sem reescrever bucket. Publicador reserva nova versão sob lock, retry mantém N; PNGs artworks/UUID.png e stickers/UUID.png→versions/vN.json completo→event.json{version:N} porúltimo. Objetos versões/assets immutable, pointer no-store. Runtime/host resolvem ponteiro e mantêm leitura de manifesto completo/releases legados; sem migração automática dos objetos existentes/site antigo. Migration gerada/revisada/aplicada localmente.

UI remove faixa permanente; estado compacto Alterações não publicadas/Atualizada/envio junto da situação e na tab. Aba mostra versão pública e CTA Publicar vN. Comparar alterações (details+SelectField compartilhado) permite versão→rascunho salvo e versão→versão, campos antes/depois, cores/swatch, materiais added/removed/name/dimensions/reference/order com thumbs autenticadas, data/responsável de entrega. Somente contrato público, ignora caminhos/ordemJSONB/cliente/notas/financeiro. Estado semântico compartilha comparador. Props revision/updatedAt invalidam diff após save e servidor rejeita stale; local não salvo não entra. Checkbox exclusivo primeira publicação mantido.

Typecheck/lint/105testes/buildproduçãoisolado/diffcheck aprovados containers; testehostHTTP focal aprovado. Integração bucket/retry/HTTP independente aprovada DB/S3tmpfs exclusivos: v1→v2, pointerúltimo, versions anteriores bytes intactos, falha ponteirov3 mantémv2/retryv3congelado, seispublicações concorrentes geram sóv2 e historyv1, financeiro/legado preservados; fixturesDB/bucket vazios, quatrocontainers/duasredes próprios removidos. Browser focal Chromium fixture SSR+hidratação PublicationDiff/SelectField/CSS reais rede none1440/390 claro/escuro aprovado: selects origem/destino/draft/sameversion, details teclado, audit/campos/materiais/refs, thumbs sintéticas interceptadas, zeropageerror/overflowpágina; mobile tabela scrollinterno conferido. Evidências /tmp/namarca-publication-diff-review, principal observou390-dark-draft.png. Limites sem campanha autenticada/submit/autorização real assets/runtime participante novo, sem E2E/aceite integral. Sem authlógica/deploy/push/commit/site antigo alterados.

## Publicação — distinguir rascunho e versão pública (20/11/2026)

Fundador pediu sinalizar mudanças não publicadas e remover confirmação repetida sempagamento. Workbench informa alterações em andamento / salvas não publicadas / publicação atualizada / envio pendente; tab Publicação identifica alterações sem reutilizar ponto de Não salvo. Comparação semântica normaliza filenames versionados, ordem JSONB e contrato público: nome/prazo/materiais/cores contam; notas/cliente/cobrança não entram. Pendência local financeira não bloqueia publicação. Checkbox aparece/exige apenas primeira publicação; servidor verifica existência do registro em vez de confiar em hidden. Atualizações não repetem texto sempagamento, versão atual sem mudanças não oferece botão redundante. Pending mantém Concluir publicação. Typecheck/lint/99testes/build isolado aprovados containers; sem schema/migrations novas, browser autenticado ou nova integração financeira/auth. Testes puros/estruturais não comprovam aparência. Sem deploy/push/commit.

## Edição após publicar e atualização de versão (20/11/2026)

Fundador pediu remover bloqueio indevido. draft+published agora editável em Details/editor/upload/cleanup, sem mexer público ao salvar. Aba Publicação mantém Abrir campanha e oferece Atualizar publicação com confirmação; falha refresh mostra Concluir publicação da versão congelada. Novas cobranças continuam independentes/publicação não altera financeiro. Endereço publicado readOnly e guard servidor preservam links, nome/prazo/artes/figurinhas/cores editáveis. Status cabeçalho usa prazo da última versão entregue, não rascunho.

Publicador congela snapshot em fase1 e entrega sob mesmo lock da campanha em fase2 (PNG→JSONúltimo), impedindo entrega antiga sobrescrever nova. Falha conserva manifesto público anterior e pending pode ser concluído mesmo após novas edições privadas; publicar versão nova exige concluir pending antes. Histórico campaign_publication_history migration0012 retém configs/revisão/ator/dataentrega; migration0013 acrescenta authorizedAt com backfill deliveredAt para linhas históricas sem informação, novas guardam createdAt original. Cleanup protege current+histórico e releases públicas antigas não são removidas. Sem revogação/suspensão.

Typecheck/lint/97testes/buildproduçãoisolado/diffcheck aprovados containers; migrations0012/13 geradas/revisadas/aplicadas sem apagar dados. Integração publicação/HTTP isolado passou v1→saveprivadov2 mantendo públicov1→updatev2→falhav3 mantendo v2→retryv3congelado, assetsantigos/histórico/financeiro preservados. FixturesDB/bucket próprios vazios, quatrocontainers/duasredes removidos, principal preservado. Revalidação authorizedAt aprovada com todasmigrations até0013 e igualdade ao createdAt de v1/v2; sem browser/submit autenticado novo, auth lógica inalterada, sem deploy/push/commit.

## Administrativo sem prefixo /admin (20/11/2026)

Fundador confirmou remoção do prefixo por ser aplicação exclusivamente administrativa em host separado. Movidas telas/layout para src/app/(workspace), route group que não entra na URL; removido redirect da raiz para /admin. Agora / lista campanhas, /campanhas/nova e /campanhas/<id>, /clientes e /financeiro. Login/TOTP/setup redirecionam à raiz após autenticação. Links/imports/actions/revalidatePath atualizados, preservando requireAdmin individual e layout protegido por senha+TOTP. Rotas/API existentes e site público localhost3001 intactos. URLs antigas /admin não mantidas nesta migração.

Typecheck/lint/build produção isolado aprovados em containers; build confirma / dinâmico e nenhuma rota /admin. 97testes aprovados após atualizar caminhos/regex dos runners. Integraçãoauth handler real aprovada em DBtmpfs/redeinternal próprios com12migrations: senha/TOTP/recuperação/revogação. HTTP anônimo Next real /,/clientes,/financeiro307→/login, /login200, /admin404 semredirect, /campanhas404 esperado (listagem em/). Evidências /tmp/namarca-root-auth-1795223032-10933; fixture authusers/sessions/accounts/twofactor vazias, duasverification sintéticas eliminadas comDBtmpfs, recursos próprios removidos/principal preservado. Limites sem browser autenticado/destino pós-loginUI/regressão integral. Sem schema/migration novos nesta mudança, deploy/push/commit ou contas/volumes apagados.

## Correção — público independente do administrativo (20/11/2026)

Fundador esclareceu que namarca.com e /<slug> não devem depender do administrativo. Substituída entrega via handlers Next por artefatos no storage: PNGs public/events/<slug>/releases/<SHA256canônico>/<UUID>.png, event.json escrito por último. Snapshot/auditoria DB permanece congelado antes do manifesto; migration0011_clear_obadiah_stane.sql adiciona deliveredAt nullable e permite diferenciar entrega concluída de commit apenas local. Retry Concluir publicação usa mesmo snapshot, não rascunho. Falha pode deixar PNGs públicos órfãos acessíveis por URL completa; manifesto último não é transação distribuída nem autorização do hash, explicitado docs/publication.md. Clique confirma disponibilização pública.

Novo serviço public-site localhost3001 somente GET, depende só S3; root estática mínima apps/site, /slug shell compartilhado, runtime e proxy restrito public/events. Sem Next/DB/financeiro/session; rotas públicas Next removidas. PUBLIC_SITE_URL aponta link do admin ao host separado. Bucket privado inalterado, gateway local com leitura assinada (não habilita bucket inteiro); produção pode usar CDN/R2 estático com mesmo contrato, sem provisionamento/DNS/deploy/site antigo. PNGs públicos permanecem acessíveis/cacheáveis após prazo; encerramento é no runtime, não revogação. Entries runtime no-store, chunks hash/PNGs release immutable. Sem migração automática de campanhas existentes.

Migration gerada/revisada/aplicada localmente; build produção isolado e97 testes aprovados em containers; typecheck/lint aprovados após regenerar tipos dev que ainda referenciavam rotas removidas. Host testes HTTP e smoke raiz3001 aprovados. Revisão estática corrigiu slug private reservado divergente e documentou exposição parcial. Integração scripts/test-publication.ts aprovada com DB/S3 tmpfs exclusivos:97testes, PUTs PNG antes do manifesto, falha503 no manifesto preserva snapshot commitado/deliveredAtnull e retry mantém ator/data/config; JSON/PNG reais e financeiro intacto. HTTP público real em container somente na redeS3, sem resolução DNS app/postgres/DBteste: raiz/slug/runtime/JSON/PNGs200, privados/admin/fora-prefixo404. FixturesDB/bucket vazios, quatrocontainers/duasredes próprios removidos. Sem browser, submit autenticado ou auth integral; falha de PNG intermediário não injetada. Não presumir deploy. Principal preservado, host público novo iniciado explicitamente, sem PixGo real/push/commit.

## Publicação local sem exigir pagamento (20/11/2026)

Fundador autorizou implementar após consulta. Nova aba Publicação permite confirmação explícita administrativa, sem consultar/alterar pagamentos ou exigir cobrança. Exige versão salva, arte, prazo futuro, propriedade/referências válidas e PNGs existentes/revalidados. Snapshot imutável em campaign_publications com revisão/ator/data; migration0010_thin_cobalt_man.sql gerada/revisada/aplicada localmente, sem apagar dados. Lock campanha/editor, revisão e updatedAt esperado protegem aba obsoleta; repetição idempotente. Pendências bloqueiam botão; workbench inert durante requisição evita edição perdida no refresh. Edição bloqueada após publicação, sem republicação/despublicação nesta fatia.

`/<slug>` serve HTML estático compartilhado; `/events/<slug>/event.json` somente snapshot público e PNGs limitados à lista publicada, sem notas/cliente/financeiro/auditoria. Bucket continua privado; no-store; draft404, PNGs410 após prazo, manifesto permanece para tela encerrada. Runtime existente encerra sessão aberta por timer/focus/visibility. Slugs reservados rejeitados. Retenção considera snapshot publicado. Ver docs/publication.md. Não migra site antigo nem publica em produção; nenhuma chamada PixGo real, worker/cron, push ou commit.

Typecheck/lint/94 testes/build produção isolado/diffcheck aprovados em containers. Integração scripts/test-publication.ts aprovada em PostgreSQL tmpfs exclusivo: sem pagamento, snapshot/auditoria/idempotência, vazio/expirado/revisão obsoleta rejeitados, handlers HTML/JSON/PNGs reais, privacidade/fora-snapshot/draft404 e financeiro preexistente intacto. Fixtures/objetos próprios limpos, DB próprio removido, principal preservado. Revisão estática independente encontrou obsolescência de Detalhes e edição durante publicação; ambos tratados por timestamp+inert. Limites: teste invoca handlers diretamente, sem HTTP roteado/submit administrativo autenticado/browser/aceite visual desta aba; não declarar E2E ou integração auth novos aprovados. Sem mudanças na lógica auth. Site antigo intacto; produção/upload direto/escala continuam pendentes.

## Clientes — diretório Revolut (20/11/2026)

Pedido fundador: refatorar listagem segundo referência. Removido painel externo/header encaixotado/divisórias. Busca GET pill48px tonal com ações explícitas e aviso privacidade; heading20px500+contagem, linhas arredondadas com monograma circular/nome16px500/contato13px, campanhas à direita e abertura circular44px. Mobile busca própria/ações abaixo, contagem sob contato sem duplicar DOM, wrap de dados longos. Hover tonal/cobalto/foco2px/reduced-motion. CSS local ao diretório preserva ficha/monogramas compartilhados e cadastro modal no PageIntro. Sem mudanças consultas/auth/backend/schema.

Typecheck/lint/94 testes/build produção isolado/diffcheck aprovados em containers. Browser focal Chromium com SSR dos componentes reais+CSS real:30 cenários (preenchido/vazio/busca sem resultado, claro/escuro1440/1024/768/390/320), zero overflow/pageerror, links/form GET, foco teclado2px/hover/empty centralizado aprovados. Evidências `/tmp/namarca-client-directory-review`, principal observou preenchido1440claro/390escuro. Fixture sem hidratação/header/modal/autenticação/consulta banco; não substitui E2E GET/cadastro, leitor tela ou celular físico. Primeira tentativa fixture sem classe workspace omitia box-sizing e acusou overflow artificial: corrigida fixture sem mudar CSS para mascarar. Schema inalterado/sem migrations novas ou reexecução histórica. App principal observado parado durante rodada; checks em containers one-off, sem reinício/alteração dos serviços existentes, contas ou volumes. Sem commit/push/publicação.

## Clientes — vazio alinhado às bibliotecas e campanhas (20/11/2026)

Pedido fundador: mesmo tratamento do vazio de Campanhas. ClientEmpty compartilhado pelo diretório/ficha substitui EmptyState genérico por título/descrição/ação centralizados, máximo420px/padding40px16px, sem tracejado/ícone/altura mínima. Mantidos animação com reduced-motion, mensagens por busca/cadastro, destinos de cadastro/limpar busca, busca GET e aviso de privacidade. Retirado Plus decorativo do CTA vazio. Contrato/teste estrutural adicionados. Typecheck/lint/93 testes/build produção isolado/diffcheck aprovados em containers. Sem nova validação browser/E2E, schema/migrations novas (schema inalterado), auth/commit/push/publicação.

## Campanhas — vazio alinhado às bibliotecas (20/11/2026)

Pedido fundador: retirar caixa tracejada dos resultados vazios como em Artes. CampaignDirectory deixa de usar EmptyState genérico: título/descrição/ação centralizados, máximo420px/padding40px16px, sem tracejado/ícone/altura mínima. Preservados textos de primeiro cadastro vs seleção sem resultados, Limpar filtros com reset de busca/filtro, criação no cabeçalho e contagem acessível. Contrato/teste estrutural adicionados. Typecheck/lint/92 testes/build produção isolado/diffcheck aprovados em containers. Sem nova validação browser/E2E, schema/migrations novas (schema inalterado), auth/commit/push/publicação.

## Campanhas — ocultar ausência de cliente (20/11/2026)

Pedido fundador: listagem deixa de mostrar Sem cliente vinculado. CampaignDirectory renderiza linha do cliente apenas quando clientName existe; opções dos formulários preservadas. Typecheck em container/diffcheck aprovados; sem novos testes/build/browser/schema/migrations/commit/push/publicação nesta mudança pontual.

## Estúdio — nome editável no rodapé (20/11/2026)

Fundador pediu reativar edição no mesmo lugar. Texto secundário substituído por TextInput controlado no renderer compartilhado, nome acessível/title, disabled busy e onChange scoped por ID. Mantém12px/muted/alvo44/linha única, campo transparente em repouso/hover borda/foco superfície e foreground; flex1/width0/minwidth0 impede expandir/comprimir ações44. Alterações seguem change/dirty/rascunho/save scoped existentes, overlay inert compartilha aparência. Typecheck/lint/91 testes/build produção isolado/diffcheck aprovados em containers. Sem novo browser/save-reload autenticado/schema/migrations novas/commit/push/publicação.

## Estúdio — nome secundário junto às ações (20/11/2026)

Fundador aprovou meio-termo: nome12px/muted como texto à esquerda no rodapé, ações agrupadas à direita. Uma linha truncada/title completo, flex1/minwidth0; botões flex0/44px não encolhem. Sem renomeação inline/nova linha de campo; renderer compartilhado mantém overlay igual. Dados/rótulos/feedback inalterados. Contrato/teste estrutural atualizados. Typecheck/lint/91 testes/build produção isolado/diffcheck aprovados em containers. Sem novo browser/save-reload autenticado/schema/migrations novas/commit/push/publicação.

## Estúdio — cards sem nome visível (20/11/2026)

Fundador aprovou retirar nome por pouca relevância. Removido TextInput/renomeação inline do renderer compartilhado Artes/Figurinhas/overlay; cards passam a miniatura+ações, sem apagar ou alterar nomes nos dados. Alt, seleção/arraste/exclusão/referência acessíveis e feedback de upload/erro continuam usando nome. Contrato/teste estrutural atualizados. Typecheck/lint/91 testes/build produção isolado/diffcheck aprovados em containers; sem novo browser/save-reload autenticado/schema/migrations novas/commit/push/publicação. Cenários antigos de galeria que renomeiam por input precisam adaptação antes de nova execução integral; não declarar E2E aprovado.

## Estúdio — acabamento dos cartões Revolut (20/11/2026)

Fundador aprovou proposta: miniatura protagonista160px/cantos12/recuo12 Artes20 Figurinhas; card raio20/padding12/superfície compartilhada. Nome14px500 integrado/alvo44, hover/foco preservados. Rodapé sem divisória, ações44 neutras: referência esquerda/excluir direita, Figurinha só excluir direita; vermelho apenas hover/foco. Alça sem borda/discreta desktop reforçada hover/focus-within, toque visível44. Seleção arte borda cobalto única sem outline duplo. Renderer completo compartilhado/drag/save/negócio intactos. Testes estruturais atualizados para geometria e exceção transparente do nome. Typecheck/lint/91 testes/build produção isolado/diffcheck aprovados em containers. Schema inalterado/sem migrations novas/auth/serviços reais/commit/push/publicação. Browser focal Chromium fixture real:88 verificações+24 foco Artes/Figurinhas claro/escuro1000×800/390×844 aprovadas. Geometria160/12/12ou20, nome14/500/44, ações44/alinhamento/sem divisória, borda única/alça, original-overlay idênticos/inert/ariahidden, mouse/toqueCDP/teclado/Escape/disabled/foco/zero overflowhorizontal/pageerror. Evidências /tmp/namarca-sortable-review/result.json/focus.json/capturas; principal observou Artes desktop clara. Limites: fixture isolada sem autenticação/save/reload/Safari/Firefox/leitor de tela/aparelho físico.

## Estúdio — overlay com cartão completo (20/11/2026)

Fundador apontou perda dos botões e tipografia diferente no nome. Removido preview simplificado. Library recebe renderMaterial compartilhado com origem: mesma miniatura/Action, TextInput do nome e rodapé com editar referência/excluir (somente excluir em Figurinhas), classes/altura/fontes/paddings iguais. Overlay usa ws-studio-asset e apenas contorno/inclinação, inert+aria-hidden para impedir interação/tabulação duplicada. Reduced-motion seletor ajustado à especificidade. Teste estrutural exige renderer compartilhado e ausência de fonte própria. Typecheck/lint/91 testes/build produção isolado/diffcheck aprovados em containers. Sem schema/migrations novas/commit/push/publicação. Browser focal Chromium fixture desktop1000×800/mobile390×844:20 verificações aprovadas mouse/toqueCDP; fonte/peso/lineheight/padding do nome iguais, caixas layout original/overlay idênticas (card/thumbnail/footer), dois botões preservados, inert/ariahidden confirmados; commit/teclado/Escape/disabled/zero overflow/pageerror. Capturas /tmp/namarca-sortable-review/{desktop,mobile}-gesture-complete.png, desktop observada pelo principal. Rotação altera boundingbox visual, não layout. Limites: fixture não autenticada, sem save/reload/Safari/Firefox/leitor de tela/aparelho físico.

## Estúdio — miniatura estável ao iniciar arraste (20/11/2026)

Fundador reportou imagem colando no topo/mudando tamanho no overlay. Causa na fonte: preview duplicava geometria sem padding6/borda1 da thumbnail, raio12 vs6 e card ampliado scale1.025/borda2. Original e overlay agora compartilham exatamente regra CSS de caixa132px/padding6/borda1/raio6/contain/displayblock; overlay usa borda1+outline sem consumir espaço extra e mantém só inclinação, sem escala. Teste estrutural previne divergência de inset e retorno da escala. Typecheck/lint/91 testes/build produção isolado/diffcheck aprovados em containers. Sem nova medição browser nesta correção pontual, schema/migrations novas/commit/push/publicação.

## Estúdio — dnd-kit e arraste visual (20/11/2026)

Fundador rejeitou primeira versão como sem graça e pediu dnd-kit. Instalados @dnd-kit/core/sortable/utilities em container com lockfile. Substituída implementação manual por DndContext/SortableContext/rectSortingStrategy, PointerSensor6px e KeyboardSensor. Alça de pontos44px sobre miniatura em vez de linha Arrastar; overlay com miniatura/nome/contorno cobalto/inclinação acompanha ponteiro, placeholder tracejado e vizinhos animam220ms. Overlay montado mantém drop animation; reduced-motion remove animações/inclinação. Teclado agora Espaço→setas→Espaço, Escape cancela, anúncios/instruções PT; auto-scroll dnd-kit e closestCenter para destino mais próximo. Mantidos helper imutável, IDs/referências, seleção/recovery/dirty/save scoped sem upload incidental. Contrato e cenário galeria adaptados.

Typecheck/lint/91 testes/build produção isolado/diffcheck aprovados em containers. Schema inalterado, sem migrations novas/auth/serviços reais/commit/push/publicação. Inspeção das capturas focais desktop/mobile em /tmp/namarca-sortable-review mostra overlay inclinado/contorno cobalto, alça discreta e vizinhos deslocados. Rodada inicial detectou perda de foco porque placeholder ocultava alça com visibility:hidden: corrigido para opacity:0/pointer-events:none, mantendo foco e sem esconder conteúdo da árvore acessível. Cenário versionado adapta seta direita/baixo à geometria da grade. Revalidação final Chromium desktop1000×800/mobile390×844:18 verificações aprovadas com componente/helper/CSS reais; mouse/toqueCDP overlay acompanha/vizinhos abrem espaço/ordemABC permanece durante gesto eBCA após soltar, tokens/sem overflow horizontal, teclado geométrico direita desktop/baixo mobile, Escape/foco mouse+teclado restaurados após estabilizar, disabled/anúncio sem deslocamento/zero pageerror. Toque termina emBODY (não afirmar foco de teclado pelo toque). Capturas desktop/mobile durante gesto observadas pelo principal. Limites: fixture isolada sem save/reload autenticado, cenário galeria versionado não reexecutado, sem leitor de tela/Safari/Firefox/aparelho físico ou auditoria quadro a quadro do drop.

## Estúdio — reordenar por arraste (20/11/2026)

Pedido fundador: substituir setas clicáveis na listagem de Artes/Figurinhas. Novo SortableMaterial com alça Arrastar44px no topo do cartão, Pointer Events/capture para mouse/toque/caneta, limiar6px, cartão ativo atenuado e destino tracejado cobalto; aplica inserção ao soltar sobre cartão da mesma biblioteca. Fora/Escape/pointercancel cancela. Teclado pela alça usa setas para mover uma posição, preserva foco/identidades e anuncia posição; desabilitado em busy/recuperação ou biblioteca unitária. Nome/seleção/referência/exclusão independentes, touch-action:none apenas na alça; sem upload/save automático ou alterações backend/schema. Helper puro preserva objetos/referências e não muta array; cenário de galeria atualizado para ponteiro real+teclado em vez de botões removidos.

Typecheck/lint/91 testes/build produção isolado (inclui build:event)/diffcheck aprovados em containers. Sem migrations novas (schema inalterado), auth/financeiro/commit/push/publicação. Browser focal Chromium em fixture React com componente/helper/CSS reais: mouse primeiro→terceiro/retorno, ordem só no pointerup, quatro setas/limites/foco, Escape/perda capture e disabled aprovados. Mobile390×844 via CDP aprovou toque/commit/touchCancel/disabled; zero erros JS. Evidências /tmp/namarca-sortable-review/. Fixture não substitui integração autenticada/save/reload, cenário de galeria atualizado não reexecutado; sem leitor de tela/Safari/Firefox/aparelho físico. Arraste indica destino sem mover visualmente o cartão junto ao ponteiro e sem autoscroll próprio.

## Cobrança — máscara em reais (20/11/2026)

Campo valor usa prefixoR$ separado/semântico no label e máscara por centavos (39500→395,00;600000→6.000,00), teclado numérico, vazio preservado. Defaults/rascunhos decimais antigos normalizados antes de recuperar; baseline pós-emissão usa mesmo display. Servidor aceita formato milhar brasileiro além do decimal legado, sem alterar limitesR$10–6000; rejeita agrupamento inválido. Helpers puros/testes de máscara/defaults/parse/limites adicionados; teste antigo adaptado para milhar agora válido. Typecheck/lint/88 testes/build produção isolado/diffcheck aprovados em containers. Sem browser/E2E de cursor/colar/recovery/emissão nesta rodada; sem schema/migrations novas/commit/push/publicação.

## Cobrança — valor sem letras (20/11/2026)

Fundador reportou letras no campo valor: inputMode decimal só sugeria teclado. Campo agora filtra caracteres fora0–9/vírgula/ponto em input (digitação/colar) e inclui pattern decimal com até4inteiros/2casas e title; validação servidor mantém regex/limitesR$10–6000. Typecheck/lint/86 testes/diffcheck aprovados em containers; sem novo build/browser/E2E financeiro/migrations nesta alteração pontual. Sem commit/push/publicação.

## Formulários — superfície consistente dos campos (20/11/2026)

Fundador apontou Detalhes com inputs brancos vs Cobrança cinza sobre cinza. Regra ws-input/select e wrapper shadcn select/data agora usam --control-surface, como primitives compartilhados; grupo endereço usa mesmo token. Branco no claro/superfície escura no dark, painéis e ações secundárias preservados; nomes inline de materiais seguem transparentes. Sem mudanças de submit/validação/backend. Typecheck/lint/86 testes/build produção isolado/diffcheck aprovados em containers; teste novo estrutural preserva exceção inline. Sem browser/E2E/migrations novas/commit/push/publicação.

## Cobrança — emissão alinhada aos campos (20/11/2026)

Fundador apontou botão Emitir link maior que inputs. Override apenas ws-billing-submit desktop>760/pointerfine: minheight40/padding8x16/lineheight22, alinhando campos40; mobile/toque mantém alvo maior. Contrato atualizado. Typecheck/85 testes/diffcheck aprovados em containers; sem novo lint/build/browser/migrations nesta alteração CSS pontual. Sem commit/push/publicação.

## Cores — painel de ajustes Revolut (20/11/2026)

Fundador pediu refazer aba Cores segundo referência. Mosaico de swatches112px substituído por superfície tonal20px/linhas: amostra circular48px44mobile com pipeta discreta, nome/descrição/HEX12px; header20px500+descrição curta e Restaurar padrão pill. Mobile HEX abaixo da descrição, sem espremer conteúdo. Tokens compartilhados, nenhum texto sobre cor arbitrária. Quatro cores/defaults/preview/save scoped/confirmação restore/HEX válido/reversão blur/disabled preservados; useId associa hint ao HEX. Typecheck/lint/85 testes/build produção isolado/diffcheck aprovados em containers; teste novo estrutural, sem browser/E2E/aceite visual nesta rodada, sem migrations novas/commit/push/publicação.

## Bibliotecas vazias — composição centralizada (20/11/2026)

Fundador rejeitou texto solto à esquerda; bloco vazio agora centraliza título/descrição/ação, largura máxima420px, margin auto e padding40px16px. Header/grade preenchida/save preservados, sem tracejado/ícone decorativo. Contrato/teste estrutural atualizados. Typecheck/84 testes/diffcheck aprovados em containers; sem novo lint/build/browser/migrations nesta alteração CSS pontual. Sem commit/push/publicação.

## Estúdio — bibliotecas vazias compactas (20/11/2026)

Fundador aprovou trocar EmptyState genérico em Artes/Figurinhas por orientação compacta sem tracejado/Inbox/minheight280, alinhada esquerda. Uma ação adicionar no conteúdo vazio, volta cabeçalho após primeiro material; PNG transparência/25MiB/envio ao salvar explícitos, Figurinhas opcional. Input múltiplo compartilhado mantém seleção local/disabled/foco; seletor CSS agora cobre botão fora do header. Rótulos do fluxo ativo padronizados para Figurinhas (inclusive nome acessível). Typecheck/lint/84 testes/build produção isolado/diffcheck aprovados em containers. Teste novo estrutural; sem browser/E2E/migrations novas/commit/push/publicação.

## Estúdio — rodapés sem divisória (20/11/2026)

Fundador aprovou retirar linha acima de Salvar em Artes/Figurinhas/Cores. Override scoped ws-studio-section-footer border-top0 preserva padding20/status/progresso e demais rodapés. Typecheck em container/diffcheck aprovados; sem novos testes/build/browser/migrations nesta alteração CSS pontual. Sem commit/push/publicação.

## Editor — painéis padrão #DEDEDE (20/11/2026)

Pedido fundador: surface padrão passa de#f4f4f4 para#dedede; fundo branco/destaque cobalto/texto escuro mantidos. Teste e contrato atualizados; temas salvos preservados. Typecheck/83 testes/diffcheck aprovados em containers; sem novo lint/build/browser/migrations nesta mudança pontual, sem commit/push/publicação.

## Editor — padrão claro (20/11/2026)

Fundador preferiu fundo/painéis light. Defaults finais: fundo#ffffff/painéis#f4f4f4/destaque#494fdf/texto#191c1f para contraste; substitui padrão escuro anterior, sem alterar temas explícitos salvos. Typecheck/lint/83 testes/build produção isolado (inclui build:event)/diffcheck aprovados em containers; sem browser/E2E/migrations novas/commit/push/publicação.

## Editor — paleta inicial Namarca (20/11/2026)

Fundador pediu cores padrão com identidade do app. themeDefaults compartilhado passa a fundo#000000/painéis#16181a/destaque#494fdf/texto#ffffff; configuração inicial usa accent também no campo color legado. Aplica nova configuração/tema ausente/Restaurar padrão, sem sobrescrever temas explícitos existentes, migrar dados ou vincular cores à preferência administrativa. Teste de defaults/contraste/preservação da paleta antiga explícita adicionado. Typecheck/lint/83 testes/build produção isolado (inclui build:event)/diffcheck aprovados em containers; sem browser/E2E/migrations (schema inalterado), commit/push/publicação.

## Prévia — editor real mesmo sem arte (20/11/2026)

Pedido vigente substitui vazio integral: preview sempre monta PhotoEditor, mantém menu/ajuda/Artes/Stickers e histórico visíveis; Foto/Salvar/histórico/addsticker desabilitados sem composição. Só workspace-stage fica quadriculado12px, sem texto, CSS privado. Bridge adminTheme enum light/dark controla neutros iguais às thumbs, shell segue tema campanha; removida transparência/quadriculado no dispositivo pai. PhotoEditor trata zeroart antes de ler art.file, invalida requests e limpa composição/histórico/gesto/erro antigos ao remover última arte, evita spinner infinito/export antigo; primeira arte carrega sem remontar iframe/editor. Validação pública continua exigindo arte.

Typecheck/lint/82 testes/build produção isolado (inclui build:event)/diffcheck aprovados em containers. Testes novos/atualizados estruturais, sem browser/E2E nesta rodada: interação menu, transição vazio→arte→vazio e aparência ainda precisam validação real. Sem migrations/schema/auth/gateway/commit/push/publicação.

## Prévia vazia — neutros do administrativo (20/11/2026)

Refinamento aprovado: quadriculado vazio agora no dispositivo pai com --line/--surface e12px iguais às thumbs; iframe/documento ficam transparentes apenas sem arte. Acompanha tema administrativo automaticamente, sem enviar cores pelo bridge ou remontar iframe; mantém warnings/erros e editor com arte/tema campanha/runtime público. Substitui dependência das cores da campanha da entrada anterior. Typecheck/lint/82 testes/build produção isolado (inclui build:event)/diffcheck aprovados em containers. Sem nova inspeção browser/E2E/migrations (schema inalterado), sem commit/push/publicação.

## Prévia — vazio com quadriculado (20/11/2026)

Pedido fundador: prévia privada sem arte deixa de exibir Adicione uma arte PNG e mostra apenas quadriculado12px, preenchendo iframe; descrição acessível sem texto visível. CSS exclusivo apps/event/src/preview.css usa superfície/borda do tema da campanha (iframe independente), sem mudar editor com arte, thumbs ou runtime público. Typecheck/lint/82 testes/build:event/build produção isolado/diffcheck aprovados em containers. Sem nova inspeção browser/E2E/migrations (sem schema alterado). Sem commit/push/publicação.

## Estúdio — envio sequencial e arquivo atual visível (20/11/2026)

Fundador rejeitou detalhes recolhidos e aprovou envio de um arquivo por vez. Save usa uploadPool com concorrência1 (helper genérico conserva default3); próximo arquivo inicia após término do anterior, inclusive falha. Feedback mostra nome/situação do upload atual sem expansão e mantém falhas visíveis durante/fim da fila; contagem/barra por arquivos processados, confirmação final e SaveStatus preservados. Removidos details e CSS exclusivo. Retry/idempotência/preservação dos sucessos e saves scoped mantidos.

Typecheck/lint/81 testes/build produção isolado/diffcheck aprovados em containers; novo teste executa fila sequencial com falha intermediária, ordem preservada e máximo1 ativo. Sem nova validação browser ou E2E HTTP de upload; sem schema/migrations novas/commit/push/publicação.

## Estúdio — upload integrado ao rodapé (20/11/2026)

Fundador aprovou substituir caixa de uploads: status14px/500, contagem arquivos processados/total e barra3px apenas durante envio; preparação/save textual sem percentual fictício. Removidos ShinyText/ícone grande/etapas/numeração/resumo persistente/X do progresso. Details Ver arquivos recolhido, abre ao falhar; linhas simples/nome truncado/title/status/check enviado/scroll focável. Falha mantém fila e mensagem segura; distingue envio vs confirmação final, botão Tentar novamente reutiliza save/fila/idempotência existentes, sem reenviar sucessos. Sucesso confirmado limpa progresso e conserva SaveStatus3,5s junto botão; seleção local silenciosa. Cores/tema/iframe/regras auth/backend/schema preservados.

Typecheck/lint/80 testes e build produção isolado aprovados em containers; diffcheck aprovado. Sem nova validação browser, E2E de upload/retry ou migrations (nenhum schema alterado); teste estrutural não comprova aparência/interação real. Serviços principais estavam parados e não foram iniciados; volumes/dados preservados. Sem commit/push/publicação.

## Campanha — prefixo visual no endereço (20/11/2026)

Campo Endereço da campanha agora agrupa prefixo namarca.com/ não editável e input slug, com borda/foco/tokens compartilhados. Domínio e barra não participam do valor enviado nem alteram validação/rascunho. Typecheck em container/diffcheck aprovados; sem browser/build/testes/migrations novos. Sem commit/push/publicação.

## Campanha — cabeçalho sem resumo repetido (20/11/2026)

Fundador considerou resumo superior desnecessário. Header agora apenas voltar/nome/situação; removidos cliente/data/slug e aviso de publicação do topo, preservando formulário Detalhes e regras de negócio. Typecheck/80 testes/diffcheck aprovados em container; teste estrutural atualizado para ausência do resumo. Sem browser/build/migrations novos, sem commit/push/publicação.

## Abas — pendência discreta e estado junto de Salvar (20/11/2026)

Fundador aprovou ponto na tab+estado junto de Salvar. WorkspaceTabs troca selo Não salvo por ponto6px currentColor, mantendo aria-describedby/texto acessível. SaveStatus compartilhado em Detalhes/Artes/Figurinhas/Cores: Alterações não salvas, Salvando…, check+Salvo3,5s só com token de confirmação servidor, área reservada/limpo vazio; não reapresenta sucesso antigo após editar/reverter. Estúdio gera token por escopo só após save confirmado; mantém progresso/erros/guards/recovery/saves independentes, sem backend/auth/schema novos. Typecheck/lint/80 testes/build produção isolado/diffcheck aprovados em containers; teste estrutural adaptado à decisão vigente, sem browser/E2E de salvamento/recuperação nesta rodada. Sem migrations novas/commit/push/publicação.

## Administrativo — selects e datepicker shadcn (20/11/2026)

Pedido fundador: selects/datas shadcn. Instalados via CLI em container Select/Popover/Calendar, preservando Button existente; imports cn adaptados ao utilitário local/removida dependência cn redundante. Adicionadas date-fns/react-day-picker. Wrappers compartilhados migram cliente/data da campanha e campanha/situação/de-até no Financeiro ativo. Datas locais YYYY-MM-DD, ptBR, limpeza opcional, FormData names/GET preservados; campanha controla data/cliente na recuperação/save e change explícito informa observador de rascunho. Portais tematizados e CSS neutraliza tabela/botões legados no calendário; required auxiliar abre calendário inválido, servidor preservado. Form legado nova/form.tsx não ativo permanece nativo. Typecheck/lint/80 testes/build produção isolado/diffcheck aprovados em containers; teste novo estrutural, sem browser autenticado/teclado/refresh E2E nesta rodada, sem migrations novas/schema/auth. Sem commit/push/publicação. Validação visual/funcional de portais e recuperação real ainda necessária.

## Administrativo — sem rodapé (20/11/2026)

Fundador pediu remover footer administrativo. AdminLayout não renderiza nem importa Footer; header/main e demais superfícies preservados. Typecheck em container/diffcheck aprovados; sem browser/build/testes/migrations novos nesta remoção pontual. Sem commit/push/publicação.

## Cobranças — alinhamento das linhas (20/11/2026)

Fundador aprovou centralização vertical das células; desktop mantém descrição à esquerda, valor à direita, situação/ações centralizadas com cabeçalhos correspondentes. Mobile preserva blocos rotulados. Typecheck em container e diffcheck aprovados; sem browser/build/testes/migrations novos nesta alteração CSS pontual. Sem commit/push/publicação.

## Cobranças — botões compactos nas linhas (20/11/2026)

Fundador apontou altura dos botões nas rows. Override scoped às tabelas de cobrança reduz ações48→32px, fonte14→12px, ícones16→14 e padding5x10 somente desktop>760/pointer:fine; mais opções32quadrado. Mobile/toque mantém geometria anterior >=44. Emissão e demais ações preservadas. Typecheck/79 testes/diffcheck aprovados em container; sem browser/build/migrations novos. Sem commit/push/publicação.

## Cobranças — ações estáveis e badges sem quebra (20/11/2026)

Fundador apontou quebra de badge/compartilhamento/feedback de consulta. Corrigido override mobile que reativava quebra dos badges; situação usa largura toda no bloco mobile. Compartilhamento nowrap com Copiar link+ícone mais opções; substituído details expansível por menu Radix em portal tematizado com abrir checkout/copiar mensagem, preservando clipboard/erros/anúncio. PaymentAction mostra sucesso no botão Consultado com check, mensagem completa sr-only/title; erros visíveis preservados. Sem mudar action financeira. Typecheck/lint/79 testes/diffcheck aprovados em containers; teste estrutural atualizado para novo contrato, sem browser/build/migrations/regressão financeira nesta rodada. Sem commit/push/publicação.

## Cobranças — menos quebras nas tabelas (20/11/2026)

Fundador reportou quebras em Cobranças/Tentativas. CSS muda table-layout fixed→auto, mínimo980px desktop com scroll interno e nowrap em cabeçalhos/valores/datas/situações/ações; descrições e referências continuam quebráveis. Mobile<=760 preserva blocos rotulados, min-width0 e quebras naturais. Contrato local atualizado. Typecheck e79 testes aprovados em container, diffcheck aprovado; sem nova inspeção browser/build/migrations, sem regressão financeira. Sem commit/push/publicação.

## Campanhas — linhas mais compactas (20/11/2026)

Fundador apontou excesso de altura/scroll na lista. CSS reduz padding vertical22→10px desktop/16→12px mobile, título19/18→16px, mínimo do link de título32px desktop (44mobile) e gap de situações8→4px. Informações e ação abrir44px preservadas, sem altura fixa/corte de nomes longos. Typecheck e79 testes aprovados em container, diffcheck aprovado. Sem nova inspeção browser/build/migrations; sem commit/push/publicação.

## Administrativo — fundo do scroll elástico (20/11/2026)

Fundador reportou bege ao forçar scroll para cima. Body global ainda usa paper legado #f6f5f0; CSS administrativo agora aplica preto ao canvas html/body somente quando contém admin-shell, acompanhando header sem alterar conteúdo claro/escuro nem checkout/auth. Typecheck e79 testes aprovados em container, diffcheck aprovado; sem reprodução em Safari/celular físico, build ou migrations novos. Sem commit/push/publicação.

## Header — menu centralizado (20/11/2026)

Pedido do fundador: centralizar menu administrativo. Header usa grid com colunas laterais iguais e menu no centro, preservando marca à esquerda e ações à direita; até600px menu centralizado na segunda linha. Alteração somente CSS e contrato visual, sem lógica de navegação/auth/schema. Typecheck e79 testes aprovados em container; diffcheck aprovado. Sem nova inspeção browser, build ou migrations nesta alteração pontual; sem commit/push/publicação.

## Design — referência versionada no projeto (20/11/2026)

Por pedido do fundador, `~/Desktop/revolut.design.md` foi copiado integralmente para `docs/revolut.design.md`, com igualdade de bytes conferida por cmp. Referência visual para toda a aplicação; AGENTS.md exige sua leitura junto com docs/design-system.md em mudanças UI/UX, e README aponta ambos. Sistema local documenta adaptações operacionais/exceções, preservando cores configuráveis de campanhas, acessibilidade e regras de negócio. Não implica migração/publicação do editor anterior nem aplicação visual automática a superfícies ainda não trabalhadas. Mudança somente documental, diffcheck aprovado; testes/build/migrations não repetidos. Sem commit/push/publicação.

## Modais — backdrop fora do ThemeScope (20/11/2026)

Fundador reportou falta de destaque dos dialogs. Causa: overlay Radix em portal fora ui-scope usava var(--scrim) sem herança/fallback, ficando transparente. Corrigido compartilhado ws-client-dialog-overlay para rgba(0,0,0,.72)+blur4px explícitos independentes do tema; atende cliente/referência/recuperação sem mudar lógica foco/fechamento/geometria. Teste estático cobre ausência de dependência do token no portal. Typecheck/lint/79testes/build produção isolado/diffcheck aprovados em containers. Focal real Chromium1440/390 claro/escuro Cliente/Referência/Recuperaçãoglobal/confirmação:16medições bg72%/blur4, overlay fora ui-scope/tokenausente seminterferência, z70<conteúdo71/90. Escape/restaurafoco cliente/referência; recuperação inicial bloqueiaEscape/fora e confirmaçãoEscape preserva rascunho; descarteexplícito sem mutação servidor. Reducedmotionnone/0s, modaisviewport/zerooverflow/pageerror;15warningshydration persistem. Dez migrations/loginTOTP sintéticos em appDBtmpfs/rede próprios, fixtures vazias/recursos encerrados semapagarvolumes/principal preservado. Evidências `/tmp/namarca-modal-backdrop-review/RESULTADO.md`; principal observou Cliente390escuro. Limites semtrapTabdedicado/authintegral/financeiro/recuperaçãoIDBestúdio/Safari/Firefox/celularfísico. Sem auth/schema/backend/financeiro/commit/push/publicação.

## UI — auditoria de cores das rotas ativas (20/11/2026)

Pedido do fundador após perguntar cobertura integral. Auditoria de imports diferencia admin/auth/checkout ativos vs legado sem uso. Correções: brand-text separado da superfíciebrand (claro494fdf/darka4a8ff) em links/hover/monogramas; focodiretório ring; captionfinanceira branco sólido; alças/contorno/label/tint referência administrativa cobalto em vez laranja/verde; HEXinválido error em vez token inexistente; ShinyText cores atuais literais (parsercanvas); erros/soft/hover/foco checkout tokens locais em vez herdar salmão/vermelho legado; skiplinkglobal branco/ink/borda/fococobalto semverde. Corescampanha/runtime/QR/checkerboard/coords preservados. Contratos e exceções em `docs/color-audit.md`, testes estáticos ampliados. Não retematiza todos arquivos legados nem projeto anterior.

Typecheck/lint/79testes/build produção isolado/diffcheck aprovados em containers. Browser focal Chromium1440/390 claro/escuro:72capturas, brandtext6,06:1claro/9,62:1dark, captionbranco/cobalto6,06:1, noticeerro6/8,82:1, loginerrosintético5,81/7,05:1, checkouterrosintético5,93:1; selectedtab texto/focobrancos2px, skip primeiroTab branco/ink/fococobalto semverde. Referência real handles16x16 brand/bordabranca/contorno/tint/checkerboard preservados/modal dentroviewport; HEXinválido real aria-invalid/decoraçãoerror. Zero overflowhorizontal/pageerror,25warnings hydration persistem (console NÃO limpo). Migrations e integraçãoauth handler real aprovadasDBpróprio; fixtures vazias/appDBtmpfs/rede exclusivos encerrados semapagarvolumes/principal preservado. Evidências `/tmp/namarca-color-audit/RESULTADO.md`; principal observou modalreferência dark390 e checkouterro390. Limites: progresso/Shiny revisãofonte apenas; errosNotice/login/checkout fixturesDOM CSSreal semsubmit/gateway; sem regressão financeira/celularfísico/garantia de todosestados. Sem authlógica/schema/backend/serviço real/commit/push/publicação.

## Campanha — acabamento do cabeçalho e largura da Cobrança (20/11/2026)

Fundador apontou resumo superior inacabado e muitas quebras na Cobrança. Contexto removido do cartão separado e integrado ao header: nome+situação, cliente linkado/data, slug reservado também mobile e aviso secundário. CampaignSections mantém navegação/painéis/recovery sem prop context. Cobrança volta a emissão horizontal no topo e registros largura total, removendo painel lateral260; tentativas agrupam descrição/referência numa célula e ficam5colunas. CSS tabela fixed desktop, mobile<=760 apresentação em blocos rotulados2col (primeira/última largura toda), sem truncar conteúdo nem ocultar consulta. Fluxos/actions/guards/rascunhos/mock intactos, sem domínio/schema/auth novos.

Typecheck/lint/79 testes/build produção isolado/diff --check aprovados em containers. Focal Chromium isolado aprovou Detalhes/Cobrança1440/1024/768/390/320 claro/escuro, zero overflow página/pageerror; tabelas desktop sem scroll/células cortadas com descrição/ref longas e R$6mil, mobile blocos rotulados sem scrollinterno. Header cliente/data/slug visíveis/navdesktop preservada,50checks teclado/ARIA/memoiframe/rascunhos retidos; Maisopções teclado e copiarlink/msg sucesso/falha API simulada aprovados. Dez migrations/loginTOTP sintéticos; fixtures vazias/appDBtmpfs/rede próprios encerrados, volumes/principal preservados. Evidências `/tmp/namarca-campaign-polish-review/RESULTADO.md`; principal observou Cobrança1440clara e320escura. Limites:15warnings hydration (console NÃO limpo), sem emissão/consulta financeira E2E/clipboardSO/auth integral/celular físico. Sem commit/push/publicação.

## UI/UX — reestruturação operacional (20/11/2026)

Fundador pediu reposicionamento/estrutura/UX, não só tabs/tokens. Campanhas agora diretório operacional de linhas (busca primeiro, nome/cliente/slug, preparação/publicação separados, encerramento/abrir); preço legado retirado da UI por não representar total de cobranças. Contexto real da campanha (cliente linkado, data, slug reservado, limite publicação) separado das tarefas. WorkspaceTabs workbench com navegação lateral desktop>1100 e trilho mobile/tablet, aria-orientation responsiva/useSyncExternalStore e setas cima/baixo, sem rotas/remontagem de painéis/iframe. Detalhes Evento e Cliente/observações em grupos independentes, rodapé/save scoped mantidos. Cobrança em painel emissão lateral260 e registros principais com container>=850, empilha abaixo; Copiar link direto e Mais opções details inline para abrir checkout/copiar mensagem, feedback acessível preservado. Financeiro DOM resumo→filtros expansíveis→histórico; GET preservado, filtros ativos/inválidos abrem details, inválido não mostra resumo0 enganoso. Sem dashboard inventado, aprovações/publicação/CRM/auth/schema/backend novos. Fonte referência marketing aplicada como direção, não especificação de app autenticado Revolut.

Typecheck/lint/79 testes/build produção isolado/diff --check aprovados em containers. Novo teste estrutural estático não substitui browser. Focal Chromium isolado:90PNGs (84views/estados+6foco)1440/390/320 claro/escuro, zero overflow horizontal/pageerror; nav176verticaldesktop/mobilehorizontal,30checks teclado/ARIA/setas/Home/End/wrap e mesmoiframe/drafts Detalhes/Artes/Cobrança retidos. Contexto conferido com fixture real cliente/link/data/slug (slug oculto mobile por composição, não afirmar visível). Cobrança desktop painel1032 com260emissão/752registros, mobile empilha e tabelas scroll interno; SQL fixture cobrança/descrição longa/ref/reembolsoR$6mil, copiarlink/maisopções/copiarmsg aprovados (clipboard API simulado). Sem emissão real/mock inacessível na rede própria. Financeiro resumoantesfilters/history, details Enter/Space, GET válido/reset/inválido aprovados; inválido alerta/sem resumo0. Dez migrations/loginTOTP sintéticos reais aprovados e fixtures vazias/appDBtmpfs/rede próprios encerrados sem apagar volumes/dados principais. Evidências `/tmp/namarca-structural-review/RESULTADO.md`; principal observou Cobrança1440claro e Detalhes320escuro. Inspeção encontrou tentativas com linha329px por descrição espremida: fix min-width920 tabela/coluna descrição220/ref180 para scroll interno. Contexto mobile recebeu padding20 e linkdark mais claro. Revalidação focal delta aprovada:13capturas renovadas cobrança1440/390/320 claro/escuro/início-fimscroll e detalhes320dark; linha107px vs329,5desktop/388mobile anteriores, tabela920 com scroll interno seis cenários/zero overflow página, última coluna integralmente acessível ao rolar sem gateway. Padding20/linkdark #a4a8ff conferidos, zero pageerror/11warnings hydration nesta rodada. Principal observou captura cobrança1440clara renovada. Tradeoff: desktop também exige scroll interno até consulta. Delta documentado `/tmp/namarca-structural-review/DELTA.md`; fixtures vazias/recursos próprios encerrados e principal preservado. Persistem47 warnings hydration (console NÃO limpo); sem auth integral/emissão/consulta financeira/refresh recuperação/dispositivo físico/breakpoint exato849/850. Sem commit/push/publicação/serviços reais, principal preservado.

## UI — componentes e navegação Revolut, além dos tokens (20/11/2026)

Fundador rejeitou rodada anterior como retema preto/branco, pediu linguagem de produto mais próxima da Revolut e apontou tabs underline. WorkspaceTabs agora trilho segmentado pill com ícones, superfície ativa cobalto/indicador inteiro e pendência branca translúcida. Preservados ARIA/teclado/panelKey/visited/hidden/recovery e instância única do estúdio; sem trocar key ou remontar iframe. Filtros campanhas segmentados com aria-pressed, cards superfície suave/símbolo cobalto/ação circular. Clientes busca separada do painel da lista, monogramas circulares e hover de marca. Campos workspace e secundários tonais; seleção arte cobalto. Financeiro global pagas primeiro no DOM/superfície cobalto/coluna ampliada, demais estados neutros separados; sem chamar saldo/receita nem mudar consultas/CSV. Header corrigido para1280 alinhado ao shell. Login/checkout permanecem da rodada anterior, sem alegar reconstrução completa de jornadas. `docs/design-system.md` atualizada: cor comunica seleção e destaque, não só foco. Não implementado menu expansível de ações de cobrança nem mudanças de domínio.

Typecheck/lint/77 testes/build produção isolado/diff --check aprovados. Focal Chromium com fonte final em app/DBtmpfs/rede próprios:72PNGs (66views+6foco),1440/390/320 ambos temas, zero overflow horizontal/pageerror; tabs pill cobalto/ícones/sem underline,30 verificações teclado setas/Home/End/wrap/foco/ARIA, rail320 com scroll interno286/712 e tab focada inteira/outline interno2px. Mesma instância iframe e nome/arte locais retidos entre tabs, sem salvar incidentalmente. Header alinhado104–1336 no desktop1440. Financeiro vazio Pago primeiro/cobalto/destaque e Reembolsado sem corte. Dez migrations e login/senha/TOTP sintéticos aprovados; fixtures vazias/recursos próprios encerrados sem apagar volumes/principal preservado. Evidências `/tmp/namarca-revolut-components-review/RESULTADO.md`; principal observou Artes desktop clara, Financeiro desktop claro e foco Artes320escuro. Persistem35 warnings hydration (console NÃO limpo). Limites: sem valores financeiros longos/regressão financeira/buscaGET submetida/recuperação refresh/auth integral/celular físico. Sem auth/schema/backend/tema runtime/publicação/commit/push.

## UI — referência Revolut (20/11/2026)

Pedido do fundador: refatorar UI/UX conforme `~/Desktop/revolut.design.md`. Tokens administrativos substituem referência Vercel: branco/preto reais, superfície escura #16181a, cobalto #494fdf reservado ao foco/token de marca, secundários neutros e estados com texto explícito. Header preto nos dois temas, largura máxima1280 correspondente ao shell ativo; títulos de diretório40px/500 (32mobile), campanha mantém hierarquia compacta. Botões pill, campos12px, painéis/modais20px e dispositivo28px; sem sombras decorativas, seleção da arte com outline. Workspace ações48desktop/44mobile, auth campos56/botão48. Checkout canvas preto/card branco20px, marca e ações pill, timer neutro; QR/código/contagem e fluxos preservados. Sem download de fontes: Aeonik Pro não licenciada, stack local com fallback sistema. Sem reescrever posicionamento/copy, auth/backend/schema/financeiro/tema das campanhas ou runtime público. Adaptação operacional da referência de marketing, sem heros gigantes nem seções de tela inteira. Contrato documentado em `docs/design-system.md` e teste estático `tests/revolut-ui.test.ts` (não substitui browser).

Typecheck/lint/77 testes/build produção isolado/diff --check aprovados em containers. Focal Chromium em app/DBtmpfs/rede exclusivos:78 capturas claro/escuro1440/390/320 de Campanhas/Clientes/ficha/Financeiro vazio/Detalhes/Artes/arte sintética local/referência/Cores/Cobrança vazia/modal cliente/login vazio/checkout formulário vazio; zero overflow horizontal/pageerror, tokens/raios/pills/header preto confirmados, auth56/workspace40/checkout46 e botão48. Modal cliente Escape/restauração foco aprovados; reduced-motion medido sem animação/transição nos controles. Dez migrations em cada DB descartável e integração handler auth senha/TOTP/recuperação/revogação/guards aprovadas. Fixtures próprias vazias após limpeza explícita de duas auth_verification sintéticas, recursos próprios encerrados sem apagar volumes. Evidências `/tmp/namarca-revolut-review/RESULTADO.md`; login claro desktop/escuro390, campanhas claro desktop e arte local escura390 observados pelo principal. Inspeção encontrou header com max1440 vs conteúdo1280: corrigido para1280 após capturas, sem nova rodada browser desse ajuste pontual. Console NÃO limpo:35 warnings hydration preexistentes; não corrigidos nesta mudança de estilo. Limites: checkout só formulário vazio, sem regressão financeira/pending/paid/expired, clipboard, upload persistido, teste Tab containment dedicado ou celular físico. Sem commit/push/publicação e sem serviços reais; contas/dados/volumes principais preservados.

## Marca — autenticação usa Brand do header (20/11/2026)

Fundador apontou logos divergentes. AuthPanel agora importa Brand compartilhado do header/checkout no login/verificação/setup e no aside oculto; substitui wordmark antigo com ponto verde por wrapper auth-logo centralizado. Mesmos20px/600/tracking−.6/alvo44, sem alterar lógica auth/destinos de submit. Checkout já compartilhava Brand; runtime público separado conserva marca legada nesta tarefa, não declarar unificação pública. Typecheck/lint/76 testes/build isolado/diff --check aprovados. Integração auth BetterAuth real e10migrations aprovadas em DBtmpfs brand_auth_test/rede próprios: senha+TOTP/recuperação/revogação/guards; tabelas auth vazias antes cleanup. Browser login público vazio claro/escuro390/1440 aprovou marca/computados/pseudo-elementos ausentes/zero overflow e pageerror; nenhum envio/credencial real. Evidências `/tmp/namarca-auth-brand-review`; executor observou desktop claro/mobile escuro. Verify/setup cobertos backend, não visualmente. Recursos próprios removidos sem volumes/principal alterados. Sem commit/push.

## Administrativo — contrato visual compartilhado (20/11/2026)

Fundador pediu consistência em todo app admin, sem commit. ui.css define control-surface/nested-surface/popover/radius-control/radius-panel nos dois temas e adapta Button/Input shadcn sem layer (utilities venciam overrides antigos em components), incluindo header e auth visual sem alterar lógica. Botões40desktop/44mobile, campos40, foco ring2px; Action/ActionLink/secundários e upload compartilham neutros/hover/foco. Workspace select/textarea seguem campos comuns. Modais cliente/recuperação/referência usam popover/radius-panel, preservando min-height0 e geometria canvas. Cores/progresso/arte usam nested-surface, preview externo neutro em vez de verde; iframe/campanha intocados. Nomes inline de materiais/lixeira discreta também no claro. Clientes: ficha sem padding duplo (Surface !p-0), header/body/footer24px desktop18mobile; diretório e cartões vinculados alinham espaçamentos/cantos/interações. Tabelas compartilham peso500 no heading. Sem remoção de legado/mudança backend/auth/schema/checkout/publicação. Typecheck/lint/76 testes/build isolado/diff --check aprovados em containers. Focal Chromium autenticado real (senha/TOTP sintéticos) aprovado em app/DBtmpfs/rede exclusivos:66 capturas claro/escuro1440/390/320 Campanhas/Clientes/ficha/Detalhes/Artes/Cores/Cobrança/Financeiro/modal cliente/arte local/referência, zero overflow horizontal; header/actions40desktop44mobile, campos40, auth Inputs vazios medidos, modal cliente Escape/restaura foco, nome inline e iframe preservados. Migrations históricas aprovadas; fixtures vazias e recursos próprios removidos/principal/volumes preservados. Capturas/medidas/logs `/tmp/namarca-admin-token-review`; ficha clara desktop e arte local escura390 observadas pelo agente principal. Limites: Cobrança/Financeiro vazios, sem regressão financeira/upload persistido/clipboard/hover completo/celular físico. Console NÃO limpo: warnings dev de hydration mismatch em tabindex0 de botões Motion (hydration-summary.log), indicador1Issue nas capturas; não tratado nesta mudança de estilo. Não declarar regressão integral. Sem commit/push.

## Administrativo — paleta dark Vercel (20/11/2026)

Fundador autorizou aplicar referência ShadcnThemer Vercel de @mike (418a8650-514e-483b-a8cd-2c6e619ee97c), sem commit. Tokens dark em ui.css usam valores OKLCH da referência: background0/card.14/popover.18/secondary.25/muted-surface.23/border.26/input e interação.32/text1/muted-text e ring.72/destructive.69 .2 23.91. Aliases existentes preservados (muted é texto e accent legado é ink); utilities têm mapeamento específico para popover/muted/accent/input com fallback claro. Tipografia/geometria/claro não redesenhados; checkout e iframe da campanha intocados. Campos administrativos dark usam superfície do card; secundários transparentes/hover discreto. Estúdio dark mantém cards/painel/prévia externa na mesma superfície, nome integrado, adicionar transparente, excluir muted com vermelho hover/foco. Seleção e quadriculado preservados. Typecheck/lint/76 testes/build isolado/diff --check aprovados em containers; ajuste final de alias muted-surface teve typecheck/lint repetidos. Focal visual Chromium em container com fixture de markup baseado no componente e três CSS reais passou1440×900/390×900 claro/escuro: zero overflow, cores computadas corretas, secundários/upload transparentes e hover.32, nome integrado com foco/borda/outline, lixeira muted→error, quadriculado preservado em hover/foco. Capturas/estilos/hashes/logs `/tmp/namarca-dark-browser`; mobile escuro observado também pelo agente principal. Não é DOM autenticado nem runtime/backend/regressão integral; migrations não repetidas (CSS apenas). Browser/container temporário encerrados, principal/contas/campanhas/volumes preservados. Sem auth/schema/migrations novas/financeiro/publicação/commit/push.

## Estúdio — superfícies secundárias sem preto recortado (20/11/2026)

Fundador apontou card preto e botões pretos sobre painel cinza na aba Artes escura. Card de material passa a mesclar surface80%/control-secondary20%, campo de nome fica transparente (surface no foco), adicionar material e ações secundárias do estúdio usam surface em vez de background da página. Hover secundário continua control-secondary; primários, quadriculado, arte e iframe/tema da campanha preservados. CSS compartilhado também beneficia Figurinhas. Typecheck/lint/76 testes/build isolado/diff --check aprovados em containers. Sem nova inspeção browser/aceite visual; sem schema/migrations novas/auth/financeiro/publicação.

## Checkout — selo de prazo sem quebra interna (19/11/2026)

Mensagem visível ao zerar reduzida para Prazo encerrado; orientação de atualizar continua no anúncio acessível e ação existente. Badge white-space:nowrap/flex-shrink:0 evita quebra interna da mensagem. Typecheck/lint/diff --check aprovados em containers; sem novo browser/build nesta alteração pontual.

## Checkout — código visível e timer junto da situação (19/11/2026)

Pedido fundador: remover textos óbvios, código sempre à mostra e timer melhor posicionado. Removidas instrução scan/copy, linha link privado, confirmação pago redundante e parágrafos repetidos; preservado aviso DePix no rodapé. Código readOnly visível em textarea2linhas/56px monoespaçada (rolagem interna/resize para código longo), sem details. Timer em badge ao lado do heading situação, quebra responsiva; QR abaixo. Erro clipboard orienta selecionar código já visível. Typecheck/lint/76 testes/build isolado/diff --check aprovados em containers; runner dedicado atualizado e regressões financeiras/retry/CPF/CNPJ/privacidade aprovadas em Chromium isolado; código visível/readOnly/valor correto, timer junto heading, cópia/falha e ausência textos redundantes verificados. Zero overflow horizontal48 cenários. Pending padrão cabe375×667/390×844/1440×900; em320×568632px(+64), suíte exit1 exclusivamente gate visual estrito sem relaxar limites. Capturas/medidas/log `/tmp/namarca-checkout-visible-code`. Fixtures vazias/eventos limpos antesattempts, recursos próprios encerrados e principal preservado. Sem regras financeiras/schema/auth/gateway/publicação.

## Checkout — marca em shape e contagem regressiva Pix (19/11/2026)

Pedido fundador: marca no shape centralizado top50% fora do card. Wrapper48px absoluto top0/translate−50%, border/sombra/tokens admin; padding/margens reservam espaço sem corte e logo alvo44px. PixCountdown cliente usa expiresAt ISO absoluto do provedor, recalcula por Date.now a cada segundo/visibilitychange e não reinicia no refresh. Formata MM:SS ou H:MM:SS; timer aria-live off evita anúncio a cada segundo, zero anuncia Prazo encerrado/Atualize situação sem alterar status financeiro, gerar novo Pix ou consultar gateway. Expiração ausente não simula prazo. Sem schema/auth/gateway.

Typecheck/lint/76 testes/build isolado/diff --check aprovados em containers. Focal Chromium aprovou shape48px centrado horizontal/23px externos (1px borda), logo alvo44, timer reduz após2s/reload não reinicia/visibility atualiza, zero só mensagem sem mutação ou POST, reducedmotion. Regressões financeiras concluídas, mas gate visual exit1: pending375×667689px(+22),320×568706(+138),expired320625(+57); zero overflow horizontal48 cenários. Grupo shape+card ficava12,5px abaixo do centro; corrigido padding duplicado shell para simétrico preservando margin-top24 no card, visando centro correto e recuperar375. Typecheck/lint/76 testes/diff --check repetidos após ajuste; revalidação confirmou grupo shape+card centrado +0,5px e form/pending sem scroll375×667/390×844/1440×900, logo acessível/alvo44. Timer/reload/visibility/zero sem mutação/reducedmotion passaram novamente. Suite segue exit1 exclusivamente gate320×568: pending682px(+114),expired601(+33), sem relaxar limites; zero overflow horizontal48 cenários. Capturas/medidas renovadas, pending375 observado pelo executor; fixtures vazias/infra própria removida/principal saudável. Capturas/medidas/log em `/tmp/namarca-checkout-countdown`. Fixtures vazias/recursos próprios removidos/principal saudável/volumes preservados. Não declarar gate visual integral aprovado, limites320 conhecidos. Sem commit/push/publicação.

## Checkout — centralizado e movimento discreto (19/11/2026)

Pedido fundador: centralização vertical e animações. Shell usa align-items:safe center sobre min-height100dvh, centraliza quando cabe e preserva topo/rolagem em conteúdo maior. Card entra320ms opacity/y6; botões hover1px (somente hover disponível)/press scale.985, campos transição curta, detalhes fade180ms. Reduced-motion desliga entrada/transições/transformações; sem loop ou dependência nova. Typecheck/lint/75 testes/diff --check aprovados em containers; focal Chromium aprovado: form/pending/paid centralizados390×844/375×667/1440×900 (desvio<1,5px), excesso/detalhes abertos/topo e fim acessíveis, zero overflow horizontal32 cenários. Entrada320ms/y6, hover−1px/press.985 e reducedmotion sem animação/transição/transformação confirmados. Pending320×568 permanece665px/scroll esperado. 35 capturas/resultados/log em `/tmp/namarca-checkout-centered`; pending375 e320aberto inspecionados pelo executor. Fixtures SQL sem submit financeiro/regressão integral; sem celular físico/Safari/Firefox. Fixtures vazias/recursos próprios removidos, principal saudável/volumes preservados. Sem mudança financeira/schema/auth/publicação.

## Checkout — composição compacta para celular (19/11/2026)

Pedido fundador: caber conteúdo padrão em uma tela celular sem scroll. Reduzidos gaps/paddings/header, removidos rótulos Pix repetidos e parágrafo secundário pending; total em linha com valor28px, QR176px (144 em viewport<=720altura), instrução curta, rodapé compacto com detalhamento expansível preservado. Breakpoint por altura não corta conteúdo nem usa overflow hidden; telas menores, texto longo/ampliado, erros, teclado e detalhes abertos podem precisar scroll acessível. Alvos principais44px preservados. Typecheck/lint/75 testes/build isolado/diff --check aprovados; Medições Chromium confirmam estados form/pending/paid/expired/unknown recolhidos sem scroll em390×844 e375×667. Em320×568 pending ainda665px (+97) e expired593px (+25); demais cabem. Zero overflow horizontal inclusive detalhes/código aberto/erro/nomes longos, sem cortar conteúdo. Marca tem alvo32px no mobile (abaixo44); demais controles passam. Runner dedicado preserva regressões financeiras/CPF/CNPJ/retry/privacidade, mas termina falha no aceite visual estrito pelos limites320 e alvo da marca; não declarar integração totalmente aprovada nesse gate. 48 capturas/medidas/log em `/tmp/namarca-checkout-one-screen`. Fixtures vazias, recursos próprios removidos e principal/volumes preservados.

## Mock local — processo antigo após suporte CNPJ (19/11/2026)

Fundador reportou CNPJ recusado no mock. Código montado já aceitava CNPJ, mas processo estava iniciado desde18/11 antes da alteração19/11 e sem hot reload. Reiniciado somente serviço pixgo-mock via Compose, preservando arquivo de dados/volume. Cinco testes do mock aprovados em container; sem gerar pagamento na base principal para diagnóstico e sem coletar documento do usuário. Causa provável de processo antigo corrigida; usuário deve repetir no checkout para confirmar caso específico. Sem mudança código/gateway real.

## Pix — retry manual direto pelo cliente (19/11/2026)

Decisão nova do fundador substitui consultas automáticas/liberação administrativa abaixo: falha de geração mantém tentativa unknown para reconhecer callback tardio, mas cliente pode repetir explicitamente no mesmo checkout. Sem GETs automáticos, sem novo POST automático e sem ação recover/release no admin. Domínio antigo dessas ações removido, migration0009/colunas/eventos preservados históricos sem apagar dados. Creating recente (<15s) continua bloqueando POST concorrente; creating abandonado libera após15s, sem afirmar inexistência no provedor. Pagamento ativo/pago continua bloqueando e público prioriza pago/ativo sobre expirados. Risco residual de dois Pix criados após resposta perdida foi explicitado ao fundador; não cancela Pix anterior.

Pública mostra Não foi possível gerar o Pix e formulário disponível; action retorna erro curto com orientação atualizar se já pagou. Avisos/liberação/histórico de autorizações removidos da UI administrativa. Botão Tentar novamente no estado de falha; formulário sem erro continua Gerar Pix. Typecheck/lint/75 testes/build isolado/diff --check aprovados em containers. Integração dedicada completa Chromium aprovada:0GET automático na falha, retry explícito mesmo token, unknown preservado/callback tardio separado, ativo bloqueia, creating recente bloqueia/stale15s libera, CPF/CNPJ/idempotência/privacidade preservados. Fixtures vazias/recursos próprios encerrados sem tocar principal/volumes. Depois usuário reportou falha+Pix expirado simultâneos; corrigido failed só pela tentativa mais recente posterior ao payment e seção expired oculta se falha nova ou generating. Typecheck/lint/75 testes/diff --check repetidos; regressão dedicada completa Chromium aprovada: expired anterior+unknown posterior mostra só falha/Tentar novamente; unknown anterior+expired posterior mostra só expired/Gerar Pix. Ambos com reload, formulário vazio, zero mutação financeira/novos pagamentos e zero overflow390/1440. Capturas checkout-expired-then-unknown e checkout-unknown-then-expired em `/tmp/namarca-checkout-compact-review`. Migrations/typecheck/lint/diff --check aprovados pelo executor, fixtures vazias/recursos próprios removidos; principal/volumes preservados. Sem schema/auth/gateway real/commit/push/publicação.

## Pix incerto — consultas e liberação administrativa (19/11/2026)

Fundador aprovou não gerar outro Pix automaticamente: após falha/inconclusivo, até3 consultas GET sequenciais com intervalo750ms na mesma requisição (timeout4s cada). Sem resultado, checkout orienta falar com responsável. Admin tem Liberar nova tentativa com confirmação explícita do risco; servidor exige requireAdmin+confirmRisk,30s desde tentativa/5s desde consulta e ausência de pagamento ativo/registrado sob lock link+tentativa. Autoriza novo POST no mesmo token sem cancelar o anterior; tentativa permanece e callback tardio é reconhecido. Público prioriza pago/ativo em vez de último expirado. Aviso registra autorização anterior na UI.

Migration0009 aditiva: query_count/last_queried_at/retry_released_at/by e checkout_attempt_events (query/outcome/actor, retry_released/risk_acknowledged). Sem documento/payload em auditoria. Aplicada local; versões anteriores preservadas. Registro de pagamento agora usa ordem lock link→tentativa consistente com liberação/start, evitando corrida de autorização vs callback. Consulta manual pode repetir; limite3 vale automático. Typecheck/lint/75 testes/build isolado/diff --check aprovados em containers após ajustes finais de UI de histórico/guard creating; integração dedicada backend completa aprovada em Chromium isolado: exatamente3 GETs sequenciais após resposta perdida sem POSTextra; bloqueio sem liberação; limites30s/5s; seis liberações concorrentes com evento único/idempotência; mesmo token permite nova criação; ativo bloqueia liberação; callback antigo e duplicado preservam ambos pagamentos; público prioriza ativo sobre expired; auditoria sem documentos. Dez migrations no DBtmpfs próprio; fixtures vazias e recursos próprios removidos/principal e volumes preservados. Resposta perdida/relógios/expired simulados no runner. Focal administrativo Chromium aprovado: login/TOTP, cancelar confirmação semPOST/mutação, aceitar com confirmRisk grava autorização/ator/evento, bloqueios30s/5s/ativo via submit real, replay anônimo/pré-TOTP sem mutação, mesmo token habilita form e cliente gera únicoPOST/payment/attempt com anterior intacto. Zero overflow320/390/1440 claro/escuro; capturas `/tmp/namarca-release-review/release-{light,dark}-{320,390,1440}.png`, desktop claro/mobile320 escuro observados pelo executor. Runner temporário `/tmp/namarca-release-browser.ts`, não suíte integral. Guards replay retornam500 no protocolo Next/RSC mas não executam mutação; registrar limite de tratamento de erro, não bypass. Fixtures/eventos limpos e DBteste vazio/app próprio encerrado; principal/volumes preservados. Sem PixGo real/auth/commit/push/publicação.

## Cobrança — mensagens de consulta específicas (19/11/2026)

Fundador reportou aviso de criação incerta e erro genérico ao consultar. Action agora diferencia falha de recuperar criação, reconciliar pagamento e emitir link; consulta não sugere incorretamente valor inválido. Aviso administrativo Geração do Pix em verificação e botão Consultar situação sem marca do gateway. Bloqueio/registro/consulta inalterados, sem assumir que a tentativa falhou nem desbloquear novo Pix. Causa do caso local reportado não diagnosticada; nenhum registro financeiro alterado. Typecheck/lint/73 testes/diff --check aprovados em containers; sem nova execução browser/build nesta mudança de texto.

## Checkout — sem checkbox e marca do processador (19/11/2026)

Pedido explícito: removidos checkbox de ciência e exigência consent da server action; checkout não menciona PixGo em total/reembolso/rodapé. Informação da conversão/stablecoins e recebimento DePix/Liquid permanece em Sobre o pagamento no rodapé. Runner dedicado ajustado para submeter sem checkbox. Não constitui aceite jurídico versionado ou homologação live. Typecheck/lint/73 testes/build isolado/diff --check aprovados em containers; sem nova execução browser nesta remoção pontual. Gateway/mock inalterados, sem auth/schema/commit/push/publicação.

## Checkout — documento do pagador CPF ou CNPJ (19/11/2026)

Pedido: campo CPF ou CNPJ e orientação Faça o Pix de uma conta vinculada ao CPF ou CNPJ informado. Campo18 caracteres aceita pontuação/letras; servidor normaliza e valida CPF/CNPJ numérico e alfanumérico (baseASCII−48/dígitos verificadores). Adapter e startCheckout validam ambos; mock aceita formato correspondente sem persistir documento. Nome interno payerCpf/receiver_cpf mantido por compatibilidade; não declarar CNPJ homologado na PixGo real. Sem schema/auth/gateway real. Typecheck/lint/73 testes/build isolado/diff --check aprovados em containers; integração dedicada completa aprovada em Chromium com app/mock/DB tmpfs/rede exclusivos: CPF preservado, CNPJ sintético numérico/alfanumérico com pontuação/minúsculas, inválido rejeitado sem tentativa/pagamento remoto, QR pending/reload sem duplicação. Runner `scripts/test-checkout.ts` ampliado; ausência de documentos em domínio/receipts/listagem/arquivo mock/logs conferida. Migrations/typecheck/lint/diff --check aprovados pelo executor; recursos próprios removidos, principal/volumes preservados. Sem commit/push/publicação.

## Checkout — identidade alinhada ao administrativo (19/11/2026)

Fundador prefere estilo administrativo, principalmente logo. Novo Brand compartilhado entre AdminNav e checkout: namarca em20px/600/tracking−.6, sem ponto verde; links/destinos e nome acessível preservados. Checkout CSS local agora fonte system, neutros171717/737373/e5e5e5, card12px com sombra mínima, campos/botões/labels/foco alinhados ao admin; avisos sem verde legado e eyebrow discreto. Tema público continua claro, sem carregar menu/auth/ThemeScope administrativo. Sem alteração financeira/schema/auth.

Typecheck/lint/72 testes/build isolado/diff --check aprovados em containers; integração checkout completa revalidada em Chromium isolado, sem overflow390/1440 nos estados form/pending/código aberto/paid/refunded/expired/uncertain. Marca conferida sem pseudo-elementos/ponto verde; form desktop/pending mobile observados pelo executor. 14 capturas renovadas em `/tmp/namarca-checkout-compact-review`. Submit/concorrência/recuperação/adicionais/clipboardAPI preservados; testes da marca incorporados ao runner. Fixtures vazias, containers/rede próprios removidos e principal/volumes preservados. Limites: sem celular físico/clipboardSO/PixGo real, expired/uncertain via fixtures. Sem commit/push/publicação.

## Checkout — interface e textos mais diretos (19/11/2026)

Pedido: melhorar UI/UX com menos texto. Card público reduzido a500px com hierarquia nome/descrição/valor/form ou situação, CSS próprio restrito à rota, tipografia/espaços compactos e CTA largura total. Removida frase promocional, instruções e estados encurtados sem prometer liberação automática. CPF com hint associado e campos bloqueados durante envio. Ciência DePix permanece explícita no checkbox; detalhamento PixGo/Liquid recolhido no rodapé. Link privado continua avisado. Código bruto Pix recolhido em Ver código Pix; copiar em destaque confirma no próprio botão, sr-only anuncia e falha orienta cópia manual sem sucesso anterior. QR e regras financeiras/mock inalterados.

Typecheck/lint/72 testes/build isolado/diff --check aprovados em containers. Integração dedicada completa Chromium aprovada em DB tmpfs/app/mock/rede próprios, migrations até0008; runner versionado `scripts/test-checkout.ts` ampliado sem relaxar asserções. Zero overflow390/1440 em formulário/pending/paid/refunded/expired/uncertain/código expandido; details abre textarea readOnly correta; clipboard API simulado confirma botão e limpa sucesso na falha. Concorrência/idempotência/unknown/reconciliação/callback/adicionais300+100/ausência publicação preservados. 14 capturas sintéticas sem CPF em `/tmp/namarca-checkout-compact-review`, form desktop/pending mobile observados pelo executor. Expired fixtureSQL/uncertain sintética, sem celular físico/clipboardSO/aceite visual integral. Fixtures domínio vazias, containers/rede próprios removidos e volumes/principal preservados. Sem schema/auth/gateway real/commit/push/publicação.

## Cobrança — lista em tabela e emissão compacta (19/11/2026)

Pedido visual do fundador: substituídos cards individuais por seção Cobranças com tabela no padrão Tentativas (descrição/valor/situação/emissão/ações de compartilhar). CheckoutShare compacto mantém confirmação no botão, erros e abrir checkout sem bloco de URL/título por linha. Nova cobrança usa grid descrição/valor/botão no desktop, campo de valor padrão em vez de60px/28px e aviso único sem divisória; tablet duas colunas e mobile empilha. Sem mudanças backend/financeiras; Tentativas preservadas. Typecheck/lint/72 testes/build isolado/diff --check aprovados em containers. Revalidação focal Chromium da nova composição aprovada: emissão300+100, UUID/reset/recuperação, anterior pago preservado, checkouts distintos, refresh sem duplicação e cópia/falha (clipboard simulado na API). Zero overflow página320/390/768/1440 claro/escuro, tabelas com scroll interno. Desktop descrição/valor/botão na mesma linha e40px de altura. Capturas atualizadas `/tmp/namarca-multi-billing-review/cobranca-{light,dark}-{320,390,768,1440}.png`; desktop claro/mobile320 escuro inspecionados pelo executor. Runner temporário com seletores de linhas, não incorporado à suíte integral. Fixtures vazias e containers próprios encerrados; DB/volumes/contas reais/principal preservados. Sem commit/push/publicação.

## Cobrança — múltiplas solicitações por campanha (19/11/2026)

Fundador aprovou várias cobranças independentes, ex. inicial R$300 paga + adicional R$100. Emissão sempre disponível com descrição pública obrigatória1–120 e valorR$10–6.000. Cada link mantém snapshot nome/descrição/valor; pagos anteriores e vínculos não são alterados. UUID por intenção dá idempotência a reenvios iguais e rejeita mesma intenção divergente; nova intenção cria outra cobrança, mesmo valor/descrição. Após sucesso campos/rascunho limpam e UUID renova. Rascunho inclui somente amount/description, sem IDs/token; recuperação global espera Cobrança mesmo havendo links.

Migration0008 aditiva adiciona description NOT NULL default Campanha para links existentes, aplicada local sem alterar IDs/tokens/pagamentos. campaigns.priceCents é legado inicial e só preenche se nulo; adicionais não sobrescrevem. UI lista links por criação com status/valor/compartilhamento próprios; tentativas indicam descrição da cobrança e recuperação considera todos os links. Checkout público mostra descrição. Sem editar/revogar emitidos ou gateway live/publicação. Typecheck/lint/72 testes/build isolado aprovados; integração dedicada `scripts/test-checkout.ts` completa aprovada em Chromium: UUID concorrente idempotente/divergências rejeitadas, R$300 pago + adicionalR$100 pendente, tokens/descrições/tentativas independentes e anterior intacto, reload sem duplicação, reconciliação/callback/unknown preservados. DB próprio tmpfs/rede/app/mock descartáveis com migrations até0008; fixtures vazias e recursos próprios encerrados, sem volumes principais apagados. Browser administrativo focal passou emissão real300/Inicial +100/Adicional com anterior pago via fixture SQL intacto, UUID/reset, recuperação descrição+valor sem emissão, dois checkouts públicos, cópia/erro com clipboard na fronteira API e inválidos/reload sem duplicação. Encontrou overflow390 em ambos temas por span.sr-only absoluto do cabeçalho Consulta fora do scroll; .ws-scroll corrigido com position:relative para conter região acessível. Typecheck/lint/72 testes e diff --check repetidos após correção; revalidação confirmou correção390/768/1440 ambos temas e fluxo funcional novamente. Em320 revelou overflow8px distinto: selo Aguardando pagamento não cabia no cabeçalho. Corrigido flex-wrap do overview, quebra de nome e limite/quebra do pill; typecheck/lint/diff --check repetidos. Confirmação final focal Chromium passou fluxo e zero overflow320/390/768/1440 nos dois temas; selo quebra dentro do card em320. Oito capturas atualizadas em `/tmp/namarca-multi-billing-review/cobranca-{light,dark}-{320,390,768,1440}.png`, mobile escura inspecionada pelo executor. Fixtures verificadas vazias, containers próprios removidos e DB/volumes/principal preservados. Últimos ajustes CSS tiveram typecheck/lint/diff --check; build/72 testes aprovados antes do ajuste final de quebra. Fixtures removidas/DB isolado vazio/container próprio encerrado antes da revalidação; serviços principais preservados. Capturas anteriores `/tmp/namarca-multi-billing-review`, runner temporário `/tmp/namarca-multi-billing-focal.ts`. Sem regressão integral/celular físico. Sem commit/push.

## Cobrança — menos texto e sem salvar rascunho manual (19/11/2026)

Pedido do fundador: removido cabeçalho Link e pagamentos/descrição, botão Salvar rascunho da cobrança e textos locais redundantes; recuperação/guard automático do valor preservados. Nova cobrança sem descrição introdutória; compartilhar sem explicação repetida; política resumida a uma linha de nome público/valor fixo. Tentativas de pagamento intocadas. Edição após emissão foi sugerida pelo fundador, ainda não implementada: requer decisão de substituir/revogar link e lidar com tentativas existentes, sem alterar snapshots/pagamentos silenciosamente. Typecheck/lint/71 testes e diff --check aprovados em containers; sem novo browser/build nesta mudança pontual. Sem schema/auth/gateway.

## Financeiro — entrada global no menu (19/11/2026)

Fundador aprovou Financeiro ao lado de Campanhas/Clientes, com visão de todas as campanhas. Nova `/admin/financeiro` e CSV `/api/financial-report` exigem requireAdmin; consulta somente local com join de campanha e filtros campanha/situação/criação de-até (dias completos São Paulo UTC−3). Totais, tabela e CSV usam o mesmo recorte; inválidos não consultam e API retorna 400. CSV acrescenta nome da campanha à allow-list e neutraliza fórmulas. Link abre a campanha para consulta manual na PixGo. Sem reconciliação automática, alterações financeiras, schema/auth/gateway. Lista sem paginação nesta versão.

Removido link Resumo financeiro da aba Cobrança; rotas antigas por campanha preservadas protegidas para compatibilidade. Menu identifica corretamente uma das três seções. Mobile até600px usa linha adicional para os três links, evitando comprimir marca/tema/sair. Typecheck/lint/71 testes/build isolado/diff --check aprovados em containers. Focal global independente passou duas vezes em Chromium: guards página/API anônimo e pré-TOTP, login/TOTP real isolado, vazio e duas campanhas/seis pagamentos, filtros individuais/combinados, limites inclusivos São Paulo, inválidos/repetidos400, download real CSV global e legado isolado/seguro, navegação ativa e link removido da Cobrança. Sem overflow página/header em320/390/600/768/1440 nos dois temas. Capturas sintéticas `/tmp/namarca-financial-review/financeiro-{light,dark}-{320,390,600,768,1440}.png`; desktop claro e mobile escuro observados. Runner temporário `/tmp/namarca-financial-focal.ts`, não incorporado à suíte; tentativa intermediária corrigiu somente seletor temporário. Migrations históricas no DB descartável e fixtures confirmadas vazias antes/depois; container próprio encerrado, DB/volume e serviços principais preservados. Não cobre celular físico/carga/gateway real; sem regressão integral ou aceite do fundador. Sem commit/push/publicação/PixGo real.

## Cobrança — confirmação de cópia no botão (19/11/2026)

Por pedido do fundador, cópia bem-sucedida não exibe mais Notice/div visível: o próprio botão troca texto para Link copiado/Mensagem copiada e mostra check. Região sr-only anuncia sucesso; erro de clipboard continua visível e limpa sucesso anterior. Typecheck/lint e diff --check aprovados em container; sem nova execução browser, testes ou build nesta alteração pontual.

## Cobrança — hierarquia de emissão e compartilhamento (19/11/2026)

Refinamento visual restrito à aba Cobrança: antes da emissão, valor aparece somente no campo ampliado (sem resumo duplicado/desatualizado), Emitir link é ação primária e salvar rascunho é secundária, com escopo local explícito. Após emissão, valor fixo destacado, caminho do checkout visível/truncado, Copiar link primário e mensagem/abrir checkout secundários. Avisos de nome público/imutabilidade preservados. Histórico sempre em seção própria com contagem, vazio compacto e pendentes em tom de atenção. Mobile empilha ações; tokens claro/escuro existentes. Sem alteração nas actions, auth, schema, gateway ou regras financeiras.

Typecheck/lint/67 testes/build isolado e diff --check aprovados em containers. O focal BILLING_UI_ONLY ficou bloqueado antes da cobrança: cenário dirty antigo ainda espera diálogo ao salvar Detalhes com estúdio pendente, incompatível com salvamento independente vigente. Não foram relaxadas asserções; cobrança e responsividade não validadas no browser nesta rodada, sem capturas da aba. As 8 migrations históricas passaram no DB descartável; fixtures confirmadas vazias e containers próprios encerrados, DB/volume preservados e zero conexões restantes. Serviços principais intactos. Não declarar regressão completa ou aceite visual. Sem commit/push/publicação/PixGo real.

## Recuperação global e Detalhes independente (19/11/2026)

Pedido vigente: ao carregar campanha, uma única recuperação considera Detalhes/Cobrança/Estúdio, mesmo com Detalhes limpa. CampaignRecovery aguarda registros dos formulários e estúdio; recuperar aplica todos, descartar confirma e remove locais sem mutação servidor. Estúdio agora monta oculto na entrada para verificar IndexedDB (substitui lazy somente na primeira visita); uma única instância/iframe continua preservada. Conflito visual continua bloqueando sobrescrita e é avisado no dialog. UNIFIED_TABS_ONLY passou com detalhes+valor e cenário somente Cobrança ao abrir Detalhes; SECTION_SAVE_ONLY passou recuperando figurinha sem visitar estúdio antes.

Pedido seguinte: salvar Detalhes não deve pedir descarte de Figurinhas/outras abas. updateCampaign mantém guard/transação, retorna confirmação estruturada com valores/cliente resolvidos, sem redirect; revalidate preservado. Form aceita valores confirmados, limpa somente seu rascunho/status e sincroniza defaults; guards ignoram esse submit específico, sem remover aviso ao sair da campanha. SECTION_SAVE_ONLY ampliado passou com arte+figurinha+cor locais, salvar Detalhes sem dialogs, DB atualizado, iframe idêntico, zero uploads/PUT editor e pendências preservadas; saves scoped/refresh/cleanup também passaram. Typecheck/lint/67 testes e build isolado aprovados; ajuste final para aplicar valores normalizados/defaults do form teve typecheck/lint repetidos, sem novo browser/build depois desse ajuste pontual. Migrations históricas aplicadas no DB descartável. Fixtures clientes/campanhas vazias; app/DB teste encerrados; principais e volumes preservados.

Regressão integral desta rodada NÃO aprovada: runner ainda pressupunha estúdio lazy/aviso de submit antigo; durante adaptação passou clientes/dirty/cobrança/financeiro/galeria/runtime, mas parou na sincronização/desvínculo de cliente. Poll de cadastro inline foi corrigido para esperar cliente novo em vez de ID truthy anterior; uma fixture sintética residual removida só no banco descartável. Após mudança de submit independente o cenário dirty integral antigo ainda precisa atualização, não declarar regressão completa. Sem auth/schema/publicação/PixGo real/commit/push.

## Detalhes — sem faixa de sucesso (19/11/2026)

Por pedido do fundador, removida a div/Notice Dados da campanha salvos da página. Salvamento/action/redirect e erros preservados. Runner deixa de depender da faixa e sincroniza persistência por SQL nos cenários pertinentes. Typecheck/lint/67 testes e diff --check aprovados em container; sem nova execução browser/build nesta remoção pontual. Sem schema/auth/publicação.

## Validação da consolidação de abas (19/11/2026)

Revisada linha única Detalhes/Artes/Figurinhas/Cores/Cobrança. Cenário UNIFIED_TABS_ONLY ampliado com teclado (setas/Home/End), foco/ARIA do painel compartilhado, apenas um painel/tablist visível, rodapés scoped e linha horizontal sem overflow da página em 1440/390px. Passou antes e após correção abaixo; SECTION_SAVE_ONLY também passou. Capturas sintéticas `/tmp/namarca-unified-tabs-{1440,390}.png`; mobile observado, mas captura durante transição não constitui auditoria visual integral.

Regressão integral revelou defeito real dos rascunhos de Detalhes: cadastro inline salvo deixa clientId=new no armazenamento, servidor retorna UUID e refresh oferece recuperação indevida. useFormDraft agora permite normalizar rascunho somente contra cliente efetivamente vinculado pelo servidor com nome/contato iguais após trim; campos de novo cliente não participam da igualdade quando ambos os estados usam cliente existente. Não remove rascunhos no início do submit nem perde recuperação em falha. Runner passou a identificar etapas mais precisamente. Tentativas intermediárias reproduziram bloqueio no reload; PASS integral somente após corrigir produção, sem descartar modal no teste. Passou clientes/dirty/cobrança/financeiro/galerias/referência/export/runtime e criação/reload/reutilização/desvínculo inline.

Typecheck/lint/67 testes/build produção isolado e diff --check aprovados em containers. Migrations históricas aplicadas no DB descartável; sem DDL/auth novos. Fixtures verificadas vazias; app e DB descartáveis encerrados; volumes e serviços principais preservados. Sem nova integração auth dedicada, E2E públicos, auditoria visual integral, commit/push/publicação/PixGo real. Não declara intermitências históricas resolvidas.

## Campanha — abas únicas e rascunhos dos formulários (19/11/2026)

Pedido do fundador: uma linha Detalhes/Artes/Figurinhas/Cores/Cobrança, eliminando agrupador Estúdio e tabs internas no fluxo ativo. `CampaignSections` controla navegação/pendências; `WorkspaceTabs` suporta painel compartilhado entre várias tabs, mantendo uma única instância lazy do estúdio e iframe. Preview mostrar/ocultar e salvamentos scoped mantidos; painéis visuais ocultos preservam estado. Detalhes inicial; abas visuais continuam restritas a draft/unpublished.

Detalhes e valor da Cobrança ganham rascunhos sessionStorage por administrador/campanha/aba, allow-list explícita, status Não salvo e recuperação/descarte modal apenas quando a seção está ativa. Recuperação preenche sem salvar. Detalhes salva no servidor por action existente; Cobrança tem Salvar rascunho da cobrança exclusivamente local, explicado na UI, separado de Emitir link de cobrança. Não há novo save financeiro/backend. Guard links/beforeunload/submit de outros forms; pode haver dois prompts com múltiplas seções dirty. Voltar/programática continuam limite conhecido. SessionStorage não garante recuperação após fechar aba/limpar armazenamento; aviso em falha local. Não guarda foto, composição, CPF ou auth. Sem schema/auth/gateway novos.

Validação em containers: typecheck/lint/67 testes/build produção isolado aprovados; migrations históricas aplicadas em DB descartável. SECTION_SAVE_ONLY Chromium passou incluindo saves independentes, uploads scoped, revisão, refresh/IDB e cleanup. UNIFIED_TABS_ONLY passou: tabs únicas/ordem, allow-list, recuperação de Detalhes/Cobrança sem escrita no DB/emissão e identidade do iframe nas cinco abas. Capturas section-save desktop/mobile em /tmp/namarca-section-save-*.png; Artes mobile observada, sem auditoria visual integral. Tentativas intermediárias: socket hang up na inicialização, espera curta de bundle/GET e seletor exato de label com hint; helpers ajustados sem mascarar produção. Cenário modal corrigido para recuperação por seção ativa, não dois portais concorrentes. Fixtures verificadas vazias; app/DB descartáveis encerrados, volumes e principal preservados. Sem nova regressão integral/auth, commit/push/publicação.

## Campanha — formulário sóbrio e valor na Cobrança (19/11/2026)

Pedido do fundador: formulário compartilhado criar/dados sem círculos 01/02/03, descrições introdutórias ou seção de valor. Dois grupos discretos Evento (inclui encerramento) e Cliente e observações; colunas desktop, empilhado mobile. Schema/actions de dados não recebem nem persistem preço, preservando valores existentes; criação deixa null. Aba Cobrança recebe valor validado R$10–6.000 e emissão explícita. issueCheckout grava preço e snapshot na mesma transação sob lock; existente retorna sem mudar valor. Sem reemissão/revogação, gateway segue mock. Sem DDL/auth.

Typecheck/lint/67 testes, migrations históricas em DB descartável e build isolado aprovados em containers. BILLING_UI_ONLY Chromium passou criação sem preço, clientes, dirty guard preservando preço legado, rejeição de valor inválido, emissão com valor explícito e edição posterior preservando preço/snapshot. Cópia simulada na fronteira API, não SO. Capturas dados 1440 claro/390 escuro observadas em /tmp/namarca-admin-*.png; sem auditoria visual integral. Tentativas intermediárias do cenário extra de snapshot antes da cópia produziram timeout após navegação; teste reordenado para cópia no contexto de emissão, preservação após reload e novo submit, sem alteração produção para mascarar. Fixtures vazias; DB/app/volume exclusivos encerrados, principal preservado. Sem commit/push/publicação.

## Estúdio — quadriculado preservado no hover (19/11/2026)

Corrigido conflito do background shorthand do hover genérico de ws-action-ghost com thumbnail: seletor local agora inclui ui-scope e hover explícito para preservar quadriculado no card de arte. Typecheck/lint aprovados em container; sem nova inspeção browser, testes ou build nesta alteração CSS pontual. Sem schema/auth/publicação.

## Estúdio — sem selo de arte selecionada (19/11/2026)

Pedido seguinte do fundador: removido também o selo Selecionada dos cards de artes, junto do wrapper/CSS e import exclusivos. Seleção funcional, data-selected e aria-pressed preservados. Sem nova validação automatizada nesta alteração pontual; sem schema/auth/publicação.

## Estúdio — cards sem numeração no topo (19/11/2026)

Pedido do fundador: removida numeração visual no topo dos cards de artes e figurinhas, inclusive CSS exclusivo. Selo Selecionada da arte atual preservado; sem cabeçalho vazio nos demais cards. Ordem, ações e nomes acessíveis dos campos mantidos. Validação em container foi tentada, mas a saída recebida não confirmou execução dos checks; não declarar aprovação. Sem schema/auth/publicação.

## Transparência — quadriculado acompanha o tema administrativo (19/11/2026)

Miniaturas e canvas de referência do estúdio agora usam `--line`/`--surface` no quadriculado, inclusive no portal do modal, acompanhando claro/escuro sem mudar PNGs ou exportação. CSS legado recebeu o mesmo tratamento com fallback claro; quadriculado do runtime usa superfície/borda do tema da campanha (iframe tem tema próprio, independente do admin). Typecheck/lint/58 testes e build:event aprovados em containers; sem nova inspeção browser ou build Next nesta alteração CSS, sem schema/auth/publicação/commit.

> Documento de passagem de contexto para novas sessões de IA. Atualizado em 18/11/2026 ao final da sessão inicial. Descreve decisões do fundador, implementação existente, pendências e evidências; NÃO constitui aceite comercial ou declaração de prontidão de produção. O código e os serviços podem ter mudado depois: conferir antes de agir.

## Estúdio — rodapé na base, pendência explícita e seleção silenciosa (19/11/2026)

Pedido do fundador: linha/botão das abas ficam na base do painel via cadeia flex controls/library-panel/fieldset/tabs/tabpanel e footer margin-top:auto; no mobile segue base do conteúdo sem fixação na viewport. Indicador ponto substituído por selo Não salvo com descrição acessível e nome da aba estável. Seleção/decodificação local não mostra painel de preparação nem confirmação de carregamento; erros continuam visíveis. Progresso permanece para salvar/upload. Typecheck/lint/67 testes/build isolado aprovados em containers; sem nova validação browser nesta alteração. Sem schema/auth/publicação.

## Estúdio — salvamentos independentes por aba (19/11/2026)

Fundador aprovou Salvar artes/Salvar figurinhas/Salvar cores, substituindo salvar configuração global do estúdio. Cada painel tem rodapé próprio, indicador de pendência na aba e status textual. Progresso/erros ficam na aba da operação; referência integra artes. PUT envia scope artworks/stickers/theme e revisão global; backend sob lock mescla somente campo alvo à configuração atual/default e valida resultado completo, ignorando outros campos enviados. Scope ausente mantém API legada full save. Tema preserva color legado. Cleanup considera somente remoções realmente persistidas.

UI envia apenas arquivos da seção salva; mescla resposta somente naquele campo e mantém alterações/Blobs das demais seções. Snapshot/revisão atualizados, IndexedDB conserva pendências com revisão nova, apagando apenas quando todas as abas estiverem salvas. Troca de aba/iframe/foto preservados. Conflito externo ainda bloqueia sobrescrita e recarga exige descartar todas as abas explicitamente. Typecheck/lint/67 testes/build isolado aprovados. Primeiro focal identificou dirty falso após refresh por ordem de chaves JSONB; corrigido com sameDraftValue canônico (ordena objetos, preserva arrays), cobrindo sectionDirty/recuperação/pendências. SECTION_SAVE_ONLY passou sem relaxar asserts, confirmando tema sem upload, artes sem stickers, refresh/recuperação mantendo revisão/pendências e remoção isolada. PLAN_A_ONLY e GALLERY_ONLY passaram (inclui clientes/dirty/financeiro/galeria). Capturas desktop/mobile das três abas `/tmp/namarca-section-save-{pending,recovered,success}-*.png`, mobile Artes observado. Migrations históricas em DB descartável, fixtures vazias e recursos próprios encerrados; principal preservado. Sem schema/auth novos, commit/push/publicação.

## Estúdio — fila visível, percentual e etapas nomeadas (19/11/2026)

Pedido de clareza visual: lista mantém todos os arquivos na ordem, com Aguardando/Enviando/Enviado/Falhou e check individual; área rolável até240px, nomes truncados com title. Salvamento e sucesso preservam lista concluída. Percentual explícito calculado por arquivos processados, não bytes (falha não significa envio bem-sucedido). Cabeçalho Etapa N de3 e trilho com Concluído/Em andamento/A seguir, aria-current step. Paralelismo máximo3 mantido sem simular sequência fictícia. Typecheck/lint/58 testes/build isolado aprovados; sem nova validação browser nesta alteração UI. Sem schema/auth.

## Estúdio — sem aro e resumo persistente (19/11/2026)

Pedido vigente: aro de duas cores removido completamente (não só arredondado). Ícone central pulsa discretamente durante operação; sem arco externo. Painel permanece após preparo/salvamento até clicar X Fechar resumo da operação, disponível apenas ao concluir; timer de3,2s eliminado. Fechamento explícito mantém recolhimento suave. Falhas seguem alerta sem sucesso falso. Typecheck/lint/58 testes/build isolado aprovados em containers; sem nova conferência browser nesta alteração. Schema/auth inalterados.

## Estúdio — indicador giratório circular (19/11/2026)

Fundador apontou quadrado girando: órbita tinha border-radius:15px no box de 50px. Alterado para 50%, mantendo ícone/fundo fixos e arco circular giratório. Após fundador apontar círculo sobre quadrado, fundo `.ws-save-progress-icon` também corrigido de radius12px para50%, deixando toda a geometria circular (correção anterior incompleta). Typecheck/lint aprovados em container; sem nova validação browser/build/testes para este ajuste CSS pontual.

## Estúdio — conclusão e saída suave do progresso (19/11/2026)

Fundador apontou sumiço abrupto do painel. Save agora mostra estado Configuração salva com check, barra completa e etapas concluídas por 3,2s após confirmação real; AnimatePresence recolhe altura/opacidade em 280ms (reduced-motion zera duração). Preparação local termina em Materiais prontos para editar, sem sugerir envio/salvamento, também com retenção breve. Falhas mantêm alerta e nunca mostram sucesso. Timers cancelados em nova operação/unmount. Typecheck/lint/58 testes/build isolado aprovados em containers; teste estático cobre retenção e presença, sem nova regressão browser nesta alteração. Schema/auth inalterados, sem commit/push/publicação.

## Estúdio — React Bits no preparo/upload (19/11/2026)

Pedido de instalação React Bits executado em container via `npx shadcn@latest add @react-bits/ShinyText-TS-TW --yes`. Registry adicionado em components.json; fonte real em src/components/ShinyText.tsx, sem pacote/dependência runtime nova. Licença MIT + Commons Clause preservada em licenses/react-bits-LICENSE.md (uso no produto permitido; não redistribuir componentes como produto). Adaptação pontual: settingsRef atualizado em effect para compatibilidade lint React.

Painel de preparação/envio/salvamento usa ShinyText com contraste claro/escuro e texto estático (componente desmontado) sob reduced-motion, ícone com órbita, trilho de etapas e até três nomes de arquivos ativos/falhos, contagem real e quantidade na fila. Seleção/decodificação local também mostra preparação. Não simula bytes/tempo/percentual; tentativas processadas não significam sucesso. Erros/retry/fila/servidor preservados. Typecheck/lint/58 testes/build isolado aprovados. Primeiro focal PLAN_A_ONLY Chromium passou fila/retry e capturou desktop/mobile claro/escuro sem overflow (`/tmp/namarca-upload-bits-*.png`, mobile escuro observado). Detectou brilho continuando com reduced-motion dinâmico; integração corrigida para desmontar ShinyText. Motion useReducedMotion não atualizou dinamicamente nesse teste; integração usa useSyncExternalStore com matchMedia/change explícito. Revalidação final PLAN_A_ONLY passou sem relaxar asserts: ShinyText desmontado, gradiente ausente, zero RAF desse componente após settling e spinners/órbita parados. Fluxo paralelo/retry/save aprovado; capturas renovadas. Tentativas intermediárias esbarraram em disputa intermitente já conhecida do token de aba duplicada, repetição passou (não resolvida). Migrations históricas em DB descartável, fixtures vazias e recursos próprios encerrados, principal preservado. Sem schema/auth, commit/push/publicação.

## Estúdio — recuperação em dialog (19/11/2026)

Recuperação de rascunho passou de faixa inline para AlertDialog Radix em portal com tema administrativo: data/hora local, quantidade de artes/figurinhas, explicação de que recuperar não envia/salva e aviso explícito de conflito. Foco inicial em Recuperar, contenção modal; retorno ao root do estúdio após decisão. Descartar exige segundo passo; Voltar/Escape cancelam confirmação, clique fora/Escape não descartam/fecham decisão inicial. Mobile empilha ação primária acima da secundária; min-height:0 neutraliza ui-scope, viewport limitada, entrada suave e reduced-motion.

Typecheck/lint/58 testes/build isolado aprovados em containers. PLAN_A_ONLY e GALLERY_ONLY Chromium passaram, com foco/trap/Escape/clique externo, recuperar e descarte limpando IDB sem mutação servidor. Migrations históricas em PostgreSQL descartável. Capturas quatro combinações 1440/390 claro/escuro em `/tmp/namarca-recovery-*.png`; mobile escuro observado. Uma tentativa intermediária teve disputa intermitente de token de aba duplicada, repetição final passou; não declarar flakiness resolvida. Fixtures vazias e recursos descartáveis encerrados; principal preservado. Sem schema/auth, commit/push/publicação.

## Estúdio — progresso animado ao salvar (19/11/2026)

Texto solto substituído por `studio-save-progress.tsx` no rodapé: ícone giratório, etapas Preparar/Enviar/Salvar, entrada discreta e barra animada. Preparação/confirmação são indeterminadas; envio usa arquivos realmente processados/total (inclui tentativas falhas, não simula bytes nem sucesso). Fase Enviar começa antes do primeiro POST, não somente após terminar um arquivo. Tokens claro/escuro e reduced-motion existentes desativam animações/transições. Fila, API, IDB, erros e retry inalterados. Typecheck/lint/57 testes/build isolado aprovados em containers; sem nova validação browser ou migrations (schema/auth inalterados). Sem commit/push/publicação.

## Estúdio — Plano A de materiais e limpeza manual (19/11/2026)

Fundador aprovou implementar Plano A, não temporários com expiração. Seleção múltipla de artes/figurinhas fica no navegador; biblioteca/referência/iframe usam blob URLs same-origin validadas em mapa separado. Salvar envia apenas novos materiais ainda presentes em até três requisições paralelas, com progresso, UUID estável X-Upload-Id e repetição idempotente (bytes iguais exigidos). Falha parcial aguarda fila terminar, mantém rascunho e reutiliza sucessos. PUT confirma revisão somente após envios; conflito continua bloqueando sobrescrita. Nada de foto/composição no upload ou IndexedDB.

IndexedDB guarda materiais e configuração por administrador/campanha/aba (sessionStorage), oferecendo Recuperar/Descartar após refresh. BroadcastChannel detecta token herdado em aba duplicada com proprietário vivo e gera outro token (fallback sem essa proteção onde indisponível). Não garante restauração de aba encerrada, outro dispositivo ou armazenamento limpo/quota; falha local gera aviso sem bloquear edição em memória. Rascunho idêntico ao salvo é descartado automaticamente (inclusive commit com resposta perdida). Guards dirty continuam.

Após salvar remoções, exclui somente IDs da configuração anterior que deixaram de ser usados, revalidando referências atuais e campaign_packages históricos sob lock. Limpeza é pós-commit e falha não desfaz save. Painel recolhido Limpar arquivos não utilizados: análise sem apagar, quantidade/espaço, confirmação por lote de até100 IDs; preserva históricos e <24h; enumera somente chaves canônicas da campanha, inclusive objetos sem metadados. Sem cron/worker/serviços externos/schema novo. Resíduos excepcionais ainda possíveis. Docs campaign-editor/architecture/editor-runtime atualizados.

Validação em containers até esta etapa: typecheck/lint/56 testes/build isolado aprovados. Focal PLAN_A_ONLY Chromium passou duas vezes (multi local, referência/preview blob, refresh/IDB, três uploads reais paralelos, resposta perdida/retry idempotente, exclusão pós-save, foto privada). Integração backend descartável passou idade/escopo/retentores históricos sem metadados/exclusão após save. 6 E2E públicos passaram na repetição; primeira tentativa timeout no clique/login preexistente (sem mudança auth). Sem schema novo; migrations históricas aplicadas no banco descartável pelos testes, sem alteração principal. Após ajuste de duplicação, PLAN_A_ONLY passou com window.open herdando token e recebendo token independente, sem modificar rascunho original; refresh original recuperou arquivos. GALLERY_ONLY e runner integral Chromium também passaram (clientes/dirty/financeiro/galeria/runtime/export). Capturas sintéticas desktop/mobile com limpeza expandida em `/tmp/namarca-plan-a-shots`, desktop e detalhe mobile observados. Scripts precisaram sincronização de hidratação/status e descarte do rascunho intencional do cenário dirty; nenhum relaxamento em produção. Fixtures verificadas vazias; app/banco/volume descartáveis encerrados, principal preservado. Sem commit/push/publicação.

## Estúdio — skeleton de carregamento (19/11/2026)

Carregamento do bundle sob demanda e da configuração autenticada agora compartilham `studio-skeleton.tsx`, em vez de texto isolado. Esqueleto acompanha container/divisória, abas, dois cards de materiais, rodapé e área da prévia, com tokens claro/escuro e pulsação suave desativada em reduced-motion. Elementos decorativos sem controles focáveis, status acessível e aria-busy. Falha de GET substitui skeleton por alerta e Tentar novamente; salvamento/upload não substituem editor nem descartam rascunho. Prévia iframe mantém carregamento próprio, sem mudança no protocolo/runtime.

Validação em containers: typecheck/lint/44 testes e build isolado aprovados. Teste novo é estático (contrato de montagem, erro, acessibilidade e reduced-motion), sem nova validação visual/browser. Schema/auth inalterados; migrations não repetidas nesta mudança exclusivamente visual. Sem commit/push/publicação.

## Header — densidade e indicador animado (19/11/2026)

Refinamento pedido pelo fundador: altura mínima de 68px para 56px, espaço marca/menu de 24px para 48px no desktop (gap + margin), adaptado em telas estreitas. Linha ativa usa Motion layoutId com spring entre Campanhas/Clientes, em vez de duas linhas com scale independente; reduced-motion zera duração. Typecheck/lint/48 testes/build isolado aprovados. Sem nova validação browser ou migrations (schema/auth inalterados).

## Aprovação visual removida do produto (19/11/2026)

Pedido vigente do fundador: remover aprovação visual frontend/backend. Removidas aba/formulários ativos e legados, server action de aprovação, biblioteca/validações específicas, página e endpoint de snapshot histórico e componente exclusivo da prévia histórica. Prévia estática agora aceita apenas rascunho por bridge; query packageId é recusada, sem fetch histórico. Removido guard específico de aprovação; dirty de navegação/salvamento permanece. Estúdio, Dados, Cobrança e prévia viva preservados. Não confundir com publicação, que continua indisponível.

Tabela campaign_packages e migration 0007 preservadas somente por retenção de dados, sem uso ativo, assim como registros comerciais legados; nenhuma exclusão de dados/DDL nesta tarefa. Enum preparation_status legado mantido: era independente da aprovação visual e não foi migrado. Documentação anterior de aprovação neste arquivo e campaign-packages.md é histórica, substituída por esta decisão.

Validação: typecheck/lint/43 testes, migrations históricas em PostgreSQL descartável e build isolado aprovados em containers após remoção das rotas (cache de tipos dev regenerado/removido). Testes exclusivos da funcionalidade eliminados e scripts de integração adaptados sem executar nova regressão autenticada browser. Teste estático da prévia cobre ausência de fetch histórico e rejeição de packageId. Sem auth, PixGo real, publicação, push ou commit.

## Tema versão 1 — quatro cores (19/11/2026)

Fundador confirmou ausência de temas antigos salvos e autorizou primeiro formato versionado (version:1), sem compatibilidade com o formato antigo de oito cores. `EventTheme` completo: version/background/surface/accent/text. Parser compartilhado e validação servidor rejeitam versões desconhecidas, temas incompletos e campos antigos. Tema ausente usa exatamente os mesmos defaults da UI; novos rascunhos incluem tema v1 explícito. Aba Cores expõe apenas Fundo/Painéis/Destaque/Texto; Destaque alimenta ação e seleção/foco, Texto alimenta ícones/textos secundários. Texto sobre destaque e sobre fundo é calculado por luminância sRGB (preto/branco); bordas derivadas da superfície. Feedback usa superfície para texto legível. Campo legado event.color permanece no envelope do manifesto, sem controle nem papel visual próprio (variável deriva de accent). Sem migração de dados/DDL; JSONB já comporta versão. Sem reescrever campanhas/snapshots existentes.

Validação em containers: typecheck/lint/50 testes, migrations existentes em PostgreSQL descartável e build isolado aprovados. Testes novos cobrem tema completo, rejeição de versão/campos inválidos, equivalência do fallback e contraste automático. Sem nova execução autenticada no navegador ou aceite visual; sem auth/financeiro/publicação, commit ou push.

## Estúdio — controles de cores organizados (19/11/2026)

Aba Cores agora usa `studio-colors.tsx`: identidade da campanha separada e grupos Superfícies, Textos e Ações/destaque. Cada controle tem amostra clicável com seletor nativo e código HEX editável/nome acessível; apenas #RRGGBB válido altera rascunho, entrada incompleta reverte ao sair. Restaurar padrão exige confirmação e só altera rascunho; salvar continua explícito. Controles desabilitados durante operações, layout adapta para uma coluna no celular, tokens administrativos preservados. Removida também linha Rascunho atual · foto local da prévia por pedido anterior. Typecheck/lint/48 testes e build isolado aprovados em containers. Sem nova validação browser/migrations (schema inalterado), sem commit/push/publicação.

## Estúdio — salvar no rodapé e interface sem faixa de status (19/11/2026)

Fundador optou por manter salvamentos independentes em Dados e Estúdio (não implementar botão global). Na aba Estúdio removidos título redundante, indicador de rascunho/salvo e faixa visual permanente de notificações. Salvar configuração e recuperação de conflito ficam no rodapé, abaixo da biblioteca/prévia. Mensagens de sucesso/progresso permanecem apenas em região acessível sr-only; erros aparecem sob demanda junto ao rodapé, sem ocultar falhas de upload/salvamento. Guards dirty, API e persistência inalterados. Typecheck/lint/48 testes e build isolado aprovados em containers; sem nova execução browser ou migrations (schema inalterado). Sem commit/push/publicação.

## Header — barra única (19/11/2026)

Pedido do fundador: marca, menu e ações em uma única linha, sem masthead preto. `AdminNav` agora apresenta Namarca, Campanhas/Clientes e à direita tema + Sair diretamente (sem dropdown de conta). Fundo usa surface/foreground do tema. Em telas estreitas reduz gaps e oculta apenas ícones decorativos do menu, preservando nomes. SignOut e lógica de autenticação inalterados. Auditoria browser atualizada para verificar ordem/alinhamento e ausência de fundo preto no lugar do dropdown removido, mas não executada nesta alteração. Typecheck/lint/48 testes e build isolado executados com sucesso; sem nova execução browser/migrations (schema inalterado). Sem commit/push/publicação.

## Estúdio — correção real da altura mínima do Dialog (19/11/2026)

Fundador confirmou que dialog ainda ocupava a tela. Causa real encontrada: `.ui-scope` em `ui.css` impõe `min-height:100dvh` e também é classe do Dialog.Content. Corrigido no próprio `.ui-scope.ws-studio-reference-dialog` com `min-height:0`; ajustes anteriores só nos filhos/height não venciam mínimo. Canvas quadrado preservado; altura disponível reserva 280px para modal/folgas. Testes de galeria atualizados (heading redundante já removido), asserts no dialog real de margem >=60px, min-height 0, ausência de scroll e stage quadrado em 1440×900, 1440×768, 390×844. Capturas reais autenticadas observadas desktop 768 e mobile: `/tmp/namarca-dialog-real/namarca-reference-dialog-*.png`. Runner focal GALLERY_ONLY passou incluindo cliente/dirty/financeiro/galeria e referência por ponteiro real; tentativa intermediária detectou overflow a 768 e reserva ajustada antes PASS final. Typecheck/lint/48 testes/migrations descartáveis/build aprovados; fixtures vazias e app/DB/volume testes encerrados. Sem auth/schema/publicação. Evidências CSS sintéticas anteriores NÃO detectavam ui-scope e não comprovavam correção real.

## Estúdio — remoção de altura extra do modal (19/11/2026)

Novo ajuste: removida linha repetida nome/dimensões, padding 16px, footer sem padding extra e referência sem flex-grow. Modal fit-content limitado à viewport menos 128px, caixa quadrada preservada pela largura disponível/altura segura. Chromium com fixture CSS: margens verticais 118px em 1440×900, 64px em 1440×768, 199px em 390×844 e 64px em 844×390. Typecheck aprovado; fixture não substitui nova execução autenticada.

## Estúdio — modal compacto pela altura do conteúdo (19/11/2026)

Removida altura fixa do modal por pedido do fundador. Limite inicial de 300px foi regressão apontada pelo fundador e removido: área quadrada volta a ocupar a largura disponível (limitada apenas pela altura da viewport). Modal envolve conteúdo sem altura fixa; removidos textos visíveis de instrução/rascunho e kicker Referência, mantendo descrição acessível. Mantidos proporção da arte, limite da viewport e controles. Sem nova validação automatizada nesta alteração pontual.

## Estúdio — área da arte quadrada (19/11/2026)

Esclarecimento do fundador: a área que recebe a arte deve ser quadrada, com o lado maior da imagem preenchendo o quadrado e sobra no outro eixo, sem distorcer/cortar. Stage agora quadrado limitado por largura/altura disponíveis, centralizado no modal; canvas continua proporcional, sem padding entre arte e limites do quadrado no eixo maior. Dimensões do modal mantidas. Typecheck/lint aprovados; sem nova validação browser nesta alteração.

## Estúdio — mais respiro ao redor do modal (19/11/2026)

Fundador achou modal próximo demais do topo/rodapé: tamanho padrão inicialmente 720×640px, reduzido novamente a 560×520px por pedido do fundador, limitado a viewport menos 48px na largura e 96px na altura (mínimo 48px de margem vertical). Canvas adaptável e ausência de rolagem preservados. Typecheck/lint aprovados; sem nova execução browser/build/testes nesta mudança pontual de dimensões.

## Estúdio — modal da referência sem rolagem (19/11/2026)

Modal agora usa altura limitada à viewport, flex com área central encolhível e sem overflow. Canvas dimensionado pela proporção real da arte e altura/largura disponíveis via container size; não corta imagem nem modifica coordenadas fonte. Cabeçalho/Concluir permanecem fora da área flexível; instruções omitidas em janelas muito baixas. Scroll lock da página preservado. Typecheck/lint/48 testes/build aprovados. Chromium em fixture CSS sintética: 4 viewports (inclui 844x390 e 320x568) × 5 proporções (1:20 a 20:1), sem overflow do modal e canvas dentro da área. Não repetido runner autenticado integral nesta alteração, sem schema/auth/publicação.

## Estúdio — prévia com largura máxima (19/11/2026)

Coluna desktop limitada a 380px, dispositivo interno a 320px; iframe deixa 760px fixos e usa `clamp(360px, calc(100dvh - 280px), 624px)` para adaptar altura à janela sem esconder controles por corte CSS. Empilhamento mobile e recolhimento preservados. Typecheck/lint/48 testes/build isolado aprovados; sem nova validação browser nesta alteração pontual. Sem schema/auth/migrations novas ou publicação.

## Estúdio — container único e referência em modal (19/11/2026)

Refinamento pedido pelo fundador: biblioteca e prévia no mesmo container com divisória contínua, sem cards externos separados. Toggle dentro da própria área da prévia; quando recolhida mantém trilho com Mostrar prévia e iframe montado oculto. Biblioteca de artes usa grade de cards lado a lado com ações no rodapé (mover, editar área da foto, excluir). Thumbnail apenas seleciona arte na prévia. Referência não é renderizada inicialmente: botão do card abre Dialog Radix com canvas, Escape/foco contido/restauração ao botão, tema e scroll lock; Concluir aplica ao rascunho e salvar configuração continua explícito. Em telas pequenas a divisória fica horizontal e os cards empilham. Sem alteração domínio/auth/schema.

Validação: typecheck/lint, 48 testes, migrations descartáveis e build isolado aprovados. Runner integral Chromium com auditoria passou (galerias/referências por ponteiro em modal, Escape/foco, runtime/foto/export, dirty/aprovação/clientes/financeiro); captura desktop observada em `/tmp/namarca-unified-audit/namarca-visual-audit`. Duas execuções detectaram divisória sem borda por token CSS inexistente; corrigido para `--line` antes do PASS final. Pequeno ajuste final do rodapé dos cards para quatro ações em grid após captura/runner, com typecheck/lint/build repetidos, sem nova captura deste ajuste. Fixtures verificadas vazias e recursos descartáveis encerrados; principais preservados. Sem commit/push/deploy.

## Estúdio — integrado à aba da campanha (19/11/2026)

Pedido vigente do fundador substitui o modo dedicado: Estúdio voltou como aba ao lado de Dados/Aprovação/Cobrança; Dados continua inicial. Removidos lançador/fullscreen, isolamento inert/scroll lock, ampliador e navegação mobile separada. Conteúdo em duas colunas: esquerda com abas Artes/Figurinhas/Cores e referência da foto abaixo; direita com prévia. Ocultar/Mostrar prévia expande a esquerda sem desmontar iframe. Até 900px empilha controles e prévia, mantendo toggle. WorkspaceTabs aceita lazy opcional, monta estúdio somente na primeira visita e preserva rascunho/foto entre abas.

Validação em containers: typecheck/lint, 48 testes, migrations em banco descartável e build isolado aprovados. Runner integral Chromium com auditoria visual aprovado, incluindo retenção do mesmo iframe/foto ao alternar abas e ocultar/mostrar em desktop/mobile, galerias/export/aprovação/clientes/dirty/financeiro. Capturas desktop claro e mobile escuro observadas em `/tmp/namarca-tab-audit/namarca-visual-audit`. Primeira execução concorrente à atualização dos testes falhou no assert de composição durante retenção; execução final com scripts concluídos passou. Não comprova toque físico/materiais reais nem elimina flakiness histórica. Fixtures verificadas vazias. Sem auth/schema/backend, commit/push/deploy ou alteração do projeto antigo.

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
