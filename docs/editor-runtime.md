# Editor único e frontend estático

## Implementado localmente

O Next.js permanece responsável por administração, sessão e uploads. `apps/campaign` é um frontend React de navegador, compilado por esbuild: não depende de servidor Next, banco ou credenciais de bucket para executar o editor público.

Fonte única em `packages/editor/src`:

- `editor/`: interface, canvas, gestos, histórico e exportação;
- `events/events.ts`: contrato/validação do manifesto e tema;
- `styles.css`: aparência da experiência;
- `analytics.ts`: no-op nesta entrega, inclusive na entrada pública local.

O editor é um pacote npm workspace privado (`@namarca/editor`), sem publicação no registry. Seus exports explícitos `events`, `photo-editor` e `styles.css` são consumidos pelo administrativo em `apps/admin` e pelas duas entradas estáticas em `apps/campaign`. Campanha é o nome da entidade; nomes técnicos legados do protocolo (`EventConfig`, `/events`, `event.json` e `/event-runtime`) permanecem para compatibilidade.

## Entradas e isolamento

- `apps/campaign/src/main.tsx`: resolve `/<slug>`, busca `/events/<slug>/event.json` semcache; ponteiro `{version:N}` resolve `/events/<slug>/versions/vN.json`, mantendo leitura de manifesto completo legado; valida e carrega PNGs em `/events/<slug>/<file>`. Não recebe mensagens de configuração. Estado de encerramento conferido após leitura, a cada segundo e ao retornar à aba; ao encerrar desmonta o editor. Isso existe apenas no novo frontend local, não altera o público antigo.
- `apps/campaign/src/preview.tsx`: mesma interface e CSS, mas configuração em memória via bridge de mesma origem. Aceita somente parent, origem e campaignId correspondentes, contrato válido e filenames privados UUID.png. Mensagem inválida preserva última configuração e informa pausa. Para materiais novos do Plano A, mapa `localAssets` separado associa somente filenames presentes no evento a blob URLs da mesma origem; `PhotoEditor.assetUrls` prioriza esses materiais sem remontar a composição. Sem foto/composição no bridge; a entrada pública não aceita esse mapa.

O iframe aponta diretamente para HTML estático em `/event-runtime/preview.html`, sem layout/CSS/JS do Next. O caminho administrativo antigo de prévia foi mantido como redirect autenticado. Não há CORS externo nem afrouxamento de CSP.

O painel envia a arte selecionada como preferência; trocar arte no painel sincroniza a prévia. Testar outra arte dentro da prévia não edita a configuração administrativa. Atualizações de referência/tema e ampliar/recolher não remontam o iframe nem apagam a foto. Remover todas as artes desmonta a composição; não promete preservar foto nesse caso.

## Build e desenvolvimento

Somente containers:

```sh
docker compose exec app npm run build:event
# Opcional: observa TS/CSS enquanto trabalha no editor compartilhado.
docker compose exec app npm run dev:event
```

`predev` e `prebuild` também compilam o frontend automaticamente. Sem watch ativo, mudanças no editor estático exigem `build:event` e recarregar a prévia. O watch recompila, não injeta HMR nem salva a foto após reload.

Artefato canônico gerado, ignorado no Git: `apps/campaign/dist/`, com index/preview HTML, JS, CSS e chunks compartilhados. O host público consome esse diretório sem depender do Next. Os comandos `predev`/`prebuild` do workspace administrativo executam o build da campanha e copiam o artefato para `apps/admin/public/event-runtime/`, incluindo a prévia no deploy do admin. `build:event` permanece como alias legado para compilar somente a campanha; para atualizar a cópia administrativa, executar `npm run build:preview --workspace @namarca/admin`. A entrada pública pode ser hospedada estaticamente com fallback `/<slug>` para esse index e `/events/*` apontando ao gateway read-only do bucket. Desde a correção de20/11/2026, o serviço local `public-site` emlocalhost:3001 serve esse HTML e a raiz estática sem Next ou banco. O gateway somente lê o prefixo public/events do storage, com JSON/PNGs exportados pelo publicador. As rotas públicas Next da primeira implementação foram removidas. Em produção, hospedagem estática/CDN independente pode cumprir esse contrato. Ver publication.md. Abrir `/event-runtime/index.html` diretamente não é uma URL de evento válida.

Os caminhos dos assets de build são `/event-runtime/*`; preservar esse prefixo no host estático. Manifestos e PNGs não são incluídos no build. Chunks têm hash, entradas usam nomes estáveis; entrega atômica/retenção/cache de deploy ainda precisam ser definidos. Há publicação local de campanhas sem exigir pagamento; nenhuma CDN ou implantação pública foi provisionada.

## Evidências e limites

48 testes unitários/contratos, typecheck/lint, migrations completas em DB descartável e build Next isolado aprovados. Runner integral Chromium aprovado com galeria, sincronização de seleção, foto/PNG, ampliar/recolher, viewport 390px sem overflow, clientes e financeiro.

`scripts/editor-runtime-scenario.ts` compara estilos computados dos controles em repouso/hover e ausência de recursos Next na prévia; executa entrada pública com manifesto/PNGs sintéticos interceptados no navegador e bytes reais do build; exporta PNG em ambas. A interceptação contorna a classificação de address-space do Chromium para documento fixture, não contorna autenticação de produção. Testa rejeição de campanha/source e origem inválidos (origem inválida por MessageEvent sintético, não navegação cross-origin real), ausência de mutações e manifesto encerrado. `EDITOR_RUNTIME_ONLY=1` encerra após esse cenário, mantendo cenários anteriores. `EDITOR_RUNTIME_SHOTS=1` grava somente capturas sintéticas em /tmp; imagens observadas nesta sessão. Não comparar pixels entre composições diferentes: a prévia contém sticker e a pública não.

Primeiras execuções do cenário novo precisaram corrigir interceptação de subrecursos (Private Network Access do Chromium) e aguardar bitmap antes de escolher foto. Não foram corrigidas repetindo cegamente o runner. A flakiness histórica de outras partes não é declarada resolvida.

**Não migrado:** projeto `/Users/thadeubrito/workspace/personal/namarca` e público em produção continuam intactos. Eles ainda têm a implementação anterior. Esta entrega estabelece a fonte única e paridade das duas entradas neste repositório, não afirma paridade com o deploy antigo. Sem push/deploy, PixGo real, fotos reais, celular físico ou diagnóstico do 422.
