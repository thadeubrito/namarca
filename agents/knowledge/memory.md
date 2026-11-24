# Memória operacional — estado atual

Memória seletiva, não diário de entregas. Código e migrations são a fonte da implementação; esta base preserva decisões, exceções e pendências não dedutíveis com segurança. Atualizar por substituição e remover pendências resolvidas. Não acrescentar contagens de testes ou relatos por tarefa.

## Preferência de colaboração do fundador

- Ao precisar de esclarecimentos, conduzir em pingue-pongue: uma pergunta por mensagem, com progresso explícito (ex.: **Pergunta 1 de 4**). Informar o total previsto no início e reajustá-lo se o escopo mudar.
- Acompanhar cada pergunta de sugestão/recomendação de resposta, sem tratá-la como decisão aprovada.
- Permitir respostas livres, materiais e intervenções no processo, inclusive reduzir/pular perguntas ou mudar de direção; não exigir uma opção ou resposta antes de acolher essas intervenções. Aplicar também em sessões futuras.

## Estado e fronteiras

- Unificação aprovada na branch `refactor/single-next-app`: aplicação Next única na raiz, sem monorepo/workspaces ou gateway de produção separado. Estrutura, hosts, build e leitura pública em [code-map.md](code-map.md). Compose sobrescreve apenas origens locais, sem trocar secrets/contas. A consolidação documental não encerra a homologação: restam validações HTTP/autenticadas e limites live abaixo; build não comprova migração pronta.
- O novo sistema possui administração, clientes leves, estúdio, prévia privada, checkout mock, financeiro e publicação local versionada. O público antigo em produção continua separado: implementação local não é migração/deploy nem homologação live.
- Storage: um definitivo imutável por material, compartilhado pelo rascunho/publicação. Prefixo `private/campaigns/` mantido sem mover arquivos; entrega pública por slug/ID/tipo conferido no DB pode ler antes de publicar (URLs de materiais não são sigilo). Publicação não copia PNG; sem compatibilidade de leitura com cópias/releases antigos; objetos existentes não foram apagados. Cleanup continua protegendo rascunho/publicação/histórico, mas URLs de materiais nunca publicados e sem referências podem expirar com exclusão.
- Editor React nativo Next compartilhado entre público e prévia privada, carregado client-only sob demanda; sem runtime HTML/esbuild, iframe ou postMessage. Estilos escopados e prévia por props com blobs allow-listed. Editor único; não criar segunda implementação. Campanha é a entidade também nos contratos técnicos, sem restaurar `/events/` ou `event.json`. Objetos antigos não foram migrados nem apagados; a entrega lê somente o definitivo canônico pelo vínculo no DB, sem fallback public/events ou public/campaigns. Publicações dependentes apenas das cópias antigas podem ficar indisponíveis; não republicar ou reparar campanhas automaticamente.
- Design tem diretrizes separadas: administrativo com referência Revolut; público com direção visual ainda a definir em `design/public.md`. Não aplicar Revolut automaticamente ao institucional/campanha. Prévia tem shell administrativo e conteúdo público. Login/TOTP e checkout preservam tratamento atual até definição de associação visual.
- Landing incorporada como página Next nativa (`src/app/page.tsx`, `src/components/site/`, `public/landing/`), sem dependência de build de `site/` ou `experiments/`; pastas históricas e laboratório removidos por autorização. Demonstração pública deve ser uma campanha normal criada no admin e publicada explicitamente; `tests/fixtures/exemplo-clube-sol` é apenas material de teste, nunca saída do build. CTA aponta a `/exemplo` por padrão; `EXAMPLE_CAMPAIGN_SLUG` substitui o slug, valor vazio oculta.
- `scripts/` contém apenas entradas de operação/MCP e integrações atuais. Runners manuais antigos de UI/editor/landing foram removidos, não homologados nem convertidos em cobertura equivalente; helpers de materiais usados por testes ficam em `tests/support/`, procedência das fotos em `public/landing/`.
- Aplicação contém componentes legados sem uso. Conferir imports e rotas ativas antes de alterar/remover; existência de arquivo ou tabela não significa funcionalidade vigente.

## Decisões que não devem regredir

### Identidade e privacidade

- Senha (8–128 caracteres) + TOTP obrigatórios; recuperação por códigos de uso único ou reset operacional com revogação. Nunca recriar/resetar conta real para testar.
- `requireAdmin` em cada operação privilegiada. Better Auth sozinho não substitui a prova própria `session.twoFactorVerified`; sessão autenticada sem segundo fator não é sessão administrativa.
- Formulários de auth devem falhar fechados sem hidratação, enviar POST e nunca colocar credenciais na URL. Não relaxar Origin/CSRF para corrigir ambiente local.
- Foto/composição não vão para backend, IndexedDB administrativo, bridge, logs, analytics ou session replay. Rascunhos administrativos guardam materiais da campanha, não fotos de participantes.

### Edição

- Detalhes, Artes, Figurinhas e Cores salvam independentemente. Revisão é global, mas save scoped preserva outras alterações locais. Não recriar “salvar tudo”.
- Painéis e editor React permanecem montados ao trocar abas; remontar perde a composição local. Aba ativa fica em `aba` na URL. Recuperação inicial considera todas as seções, inclusive Cobrança.
- Seleção de materiais é local; enviar somente ao salvar, **sequencialmente**, sem reenviar sucessos confirmados em retry. Descartar edições locais só afeta a aba, sem mutação de servidor; restaurar versão é operação distinta.
- Limpeza precisa proteger configuração atual, publicações/históricos e registros legados retentores. Não excluir bucket/prefixo amplo nem adicionar limpeza automática. Recuperação local não é backup.

### Clientes

- Nome/contato são compartilhados entre campanhas; editar cliente não altera snapshots ou cobranças. Desvincular não exclui cliente. Não deduplicar automaticamente por nome.
- Busca de clientes pode colocar contato na URL: não compartilhar URLs de busca nem registrar consultas em telemetria. Dados de cliente não pertencem ao manifesto público.
- Contratos/aprovações e campos organizer/contact legados são preservados, não sincronizados ou reativados como fonte atual.

### Financeiro

- Mock é o padrão e o checkout local não é homologação PixGo. CPF/CNPJ numérico e alfanumérico têm suporte local, não comprovação de aceitação pelo provedor real.
- Valor/descrição são definidos por cobrança e congelados no link. `campaigns.priceCents` é legado, não o total cobrado.
- Falha de criação incerta não autoriza POST automático. Decisão vigente permite retry explícito do cliente no mesmo checkout mantendo tentativa unknown para callback tardio; não ressuscitar consultas automáticas ou liberação administrativa removidas.
- Webhook confirma financeiro na requisição, sem publicar campanha. Idempotência, comparação de IDs/valor e callbacks tardios importam mais que a ordem aparente da UI.
- PixGo recebe Pix e liquida DePix/Liquid, não BRL em conta bancária. Comunicação jurídica/fiscal continua pendente; não inventar API de reembolso/cancelamento.

### Publicação

- Salvar rascunho não muda público. Publicar não consulta/exige pagamento; primeira publicação exige confirmação explícita. Endereço já publicado permanece fixo.
- Projeção pública estrita, sem cliente/notas/financeiro/tokens/auditoria. PostgreSQL é fonte da versão publicada e do histórico; bucket recebe apenas PNGs imutáveis, não JSON sincronizado. Preparação das imagens precede o commit que troca o público. Retry legado usa snapshot congelado, nunca draft posterior.
- Número público atual pode ser menor que o maior histórico. Publicar versão histórica mantém seu número e não muda draft; restaurar no rascunho não muda público. Próxima versão nova é max histórico + 1.
- S3 e banco não têm transação distribuída. PUT bem-sucedido seguido de falha mantém snapshot público anterior, mas pode deixar PNGs órfãos acessíveis pela URL. `published` não comprova entrega legada: conferir `deliveredAt`; pending legado não deve expor draft.
- Suspensão preservada em novas publicações; reativação usa versão entregue, não rascunho. Prazo não pausa, versão expirada não reativa. Checks de suspensão em sessões abertas não significam revogação instantânea; offline/cache/clientes antigos podem atrasar. Arquivos publicados/exportados não são apagados por suspensão ou prazo.
- Compatibilidade legada: backfill de números no DB não materializa imagens no bucket. Preservar snapshots/histórico/pending e objetos antigos, nunca usar draft para reparar versão antiga. A entrega pública atual depende do Next e do reader DB/cache; gateway histórico é apenas fixture de teste, não alternativa operacional.

## Problemas e lacunas conhecidos

Não são tarefas automaticamente autorizadas nem prova de que todo cenário ainda falha. Reproduzir antes de corrigir.

- Upload 422 com materiais reais do fundador foi reportado, mas investigação específica adiada. Mensagens melhores e fixtures sintéticas não diagnosticam esses arquivos; usar somente materiais autorizados.
- Runner de referência/galeria e disputa de token de aba duplicada tiveram intermitências. Repetição que passa não demonstra correção. Cenários históricos podem pressupor UI removida e exigir adaptação sem relaxar regras.
- Warnings de hidratação Motion/tabindex e antigo aviso de iframe `web-share` (iframe removido) foram observados; fixtures focais sem warnings não comprovam resolução global.
- Checkout em viewport 320×568 teve conteúdo maior que a tela em estados específicos. Não ocultar overflow para satisfazer gate visual; manter rolagem acessível.
- Gestos em celular físico, materiais/proporções reais, navegação dirty completa (incluindo Voltar/programática) e fluxo administrativo autenticado integral após as últimas mudanças não têm validação global garantida.
- Testes estruturais não comprovam aparência; browser com actions/contexts mockados não comprova auth, persistência ou submit Next real. Não reutilizar PASS antigo como resultado atual.
- Unificação Next ainda requer E2E HTTP de publicação/leitura/cache/invalidação, redirects de auth por host no navegador, revisão independente final. Falha de invalidação após commit pode aparentar falha da ação; revisar tratamento sem repetir publicação automaticamente. Runners históricos de menu/origens/gateway podem ter expectativas obsoletas e não são evidência de suíte integral verde.
- Institucional e demonstração dependem de fontes/fixtures locais incluídas no checkout; build local com arquivos não versionados não comprova build de checkout limpo.

## Fora do escopo autorizado atual

- Deploy, push, migração do público antigo, PixGo real ou provisionamento pago.
- Upload direto implementado localmente não equivale a homologação R2/Vercel: validar browser real, CORS/assinatura e pior caso de memória/tempo. Retenção aprovada para temporários: lifecycle do storage após 1 dia, exclusivamente `private/uploads/`, sem worker/cron; ainda não configurado localmente nem no R2. Não afeta definitivos/públicos nem remove autorizações do banco. Setup em `docs/uploads.md`.
- Entrega de imagens pelo Next ainda baixa bytes em memória. Definir origem pública do bucket e revisar streaming/redirect, memória e tempo no pior caso antes de homologação live; não inferir capacidade R2/Vercel dos testes locais.
- Backups/restauração, retenção de longo prazo, rate limiting distribuído, cache/CDN, escala e operação financeira live exigem preparação específica.
- Novas regras de revogação/reemissão, cancelamento/reembolso, oferta e métricas de participantes exigem escopo/decisão. Não usar backlog antigo como autorização.

Não há uma próxima implementação funcional aprovada apenas por constar aqui. O pedido ativo do usuário define o trabalho.

## Ferramentas de agentes

- React Bits usa servidor MCP **shadcn** conectado ao registry `@react-bits` de `components.json` na raiz, não endpoint React Bits independente. `.mcp.json` chama `scripts/react-bits-mcp.sh` em Docker; preservar PaceUI. Requer Docker ativo e cliente com cwd na raiz; recarregar cliente após configuração. Não adiciona componentes automaticamente.
- Conhecimento compartilhado em `agents/knowledge/`; papéis portáveis em `agents/roles/`: copywriter, product-experience, quality-security e interface-designer. Adaptadores consultivos em `.pi/agents/` leem a fonte a cada execução, sem duplicar o papel; modelo herdado da sessão. Não há adaptadores Claude/Codex nem orquestração automática. O principal continua responsável por síntese, implementação e validação.
