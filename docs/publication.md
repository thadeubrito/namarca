# Publicação independente do administrativo

## Separação

- Administrativo Next: prepara campanha, autentica operador, valida e envia artefatos ao storage.
- Site público: HTML/CSS/JS estáticos e leitura de objetos publicados. Não usa Next, PostgreSQL, sessão, financeiro ou PixGo.
- Produção pretendida: `namarca.com` e `namarca.com/<slug>` em hospedagem estática/CDN independente. Nenhum DNS/deploy/site antigo alterado nesta entrega.
- Desenvolvimento: serviço `public-site` em `http://localhost:3001`, depende somente do S3 local. É um gateway read-only para o storage privado local; em produção CDN/R2 pode assumir essa entrega. Bucket não precisa liberar conteúdo privado.
- Administrativo usa `PUBLIC_SITE_URL` (origem sem caminho; padrão localhost:3001 em dev e https://namarca.com em produção) para abrir o site correto.

## Versões numeradas e comparação

Formato: `event.json` contém `{ "version": N }` quando o acesso está ativo e `{ "version": N, "suspended": true }` quando suspenso; o conteúdo está em `versions/vN.json`, referenciando `artworks/<UUID>.png` e `stickers/<UUID>.png`. Ponteiro é escrito por último, sem cache; versões e assets são imutáveis/cacheáveis. Numeração é reservada sob lock da campanha e persistida no banco; retry mantém a mesma versão. Objetos releases/hash e manifestos completos anteriores continuam legíveis, sem migração automática do site antigo.

Na aba Publicação, Comparar alterações permite versão entregue→rascunho salvo e versão→versão, com valores anteriores/novos, materiais, ordem, referências e cores. Não compara caminhos técnicos, cliente, notas ou financeiro. É leitura administrativa, com miniaturas privadas autenticadas; não envia dados administrativos ao público. A comparação do rascunho usa revisão/updatedAt exibidos; servidor rejeita revisão obsoleta ao publicar. Histórico usa snapshots retidos.

Estado de mudanças é compacto junto à situação no cabeçalho e na aba, sem faixa de aviso permanente. Ações Publicar campanha / Publicar alterações, com a versão de destino; primeira publicação confirmada em AlertDialog, sem checkbox ou menção financeira na interface. Disponibilidade é independente: Rascunho, Ativa, Suspensa ou Encerrada. Encerramento da última versão entregue prevalece sobre suspensão na situação exibida.

## Publicar

Aba Publicação com Publicar campanha/Publicar alterações; primeira publicação exige confirmação explícita em AlertDialog e no servidor, sem checkbox ou texto financeiro. `requireAdmin` na action. Nenhuma cobrança/pagamento é alterado ou consultado para liberar acesso. Exige materiais salvos, arte, prazo futuro, ownership/referências/PNG/dimensões válidos. Revisão do editor e updatedAt de Detalhes conferidos sob lock. Pendências bloqueiam botão; workbench inert durante envio.

1. Derivar manifesto por contrato público estrito: nenhuma nota, cliente, preço, pagamento, token ou auditoria.
2. Hash canônico identifica igualdade de conteúdo; número persistido identifica a versão pública vN. JSONB com outra ordem de chaves não cria versão desnecessária.
3. Validar bytes privados e congelar a intenção numerada; na entrega, enviar PNGs a `public/events/<slug>/artworks/<uuid>.png` e `stickers/<uuid>.png` (cache imutável). IDs nunca podem ser reaproveitados com bytes diferentes.
4. Gravar snapshot congelado/auditoria e estado published no banco. O rascunho continua editável; salvar nunca muda o manifesto público.
5. Gravar `public/events/<slug>/versions/vN.json` completo, imutável. **Por último**, gravar `public/events/<slug>/event.json` contendo apenas `{ "version": N }`, cache no-store. Este ponteiro é o interruptor público.
6. Registrar deliveredAt no banco e apresentar link público.

Não há transação distribuída S3/DB: falha de PNG não publica manifesto, podendo deixar objetos públicos órfãos sem referência; quem conhecer a URL completa poderá lê-los mesmo sem manifesto (o hash não é autorização). O clique explícito autoriza a cópia pública dos materiais; não há atomicidade de exposição entre arquivos. Nenhuma listagem pública é oferecida; falha posterior ao commit congela snapshot mas permite **Concluir publicação**. Retry entrega a mesma versão, nunca o rascunho alterado. Se manifest foi escrito mas confirmação DB falhou, público já pode estar acessível; repetição é segura. published não basta para declarar entrega: deliveredAt diferencia conclusão. Snapshots locais da implementação anterior, sem deliveredAt, podem ser exportados explicitamente com a mesma ação.

Migration0011 adiciona delivered_at nullable sem apagar dados;0010 preserva snapshot/revisão/ator/data. Sem approvals legadas, worker, cron ou publicação vinculada ao financeiro. Atualizar publicação gera nova release a partir do rascunho salvo, mantendo o manifesto anterior até o PUT final. Snapshots anteriores são retidos em campaign_publication_history (migration0012 e authorizedAt0013), inclusive materiais privados; releases públicas antigas não são apagadas. Entregas compartilham lock da campanha para evitar uma versão antiga sobrescrever a nova. Uma entrega pendente precisa ser concluída antes de iniciar outra. Endereço publicado permanece fixo (readOnly e validação servidor); demais detalhes, prazo e materiais são rascunhos editáveis. Cabeçalho usa prazo da última versão entregue. Suspensão e reativação são ações administrativas separadas da entrega de conteúdo (ver abaixo).

## Escolher uma versão publicada ou restaurar o rascunho

A visão geral da aba separa a versão pública atual do rascunho/próxima publicação (ou envio congelado pendente). Cada contexto informa seu número e efeito; quando o rascunho salvo é idêntico ao público, mostra Sem alterações e não oferece publicação redundante. Comparar alterações permanece logo abaixo. O histórico fica recolhido em Versões publicadas, separado do CTA principal, e oferece duas ações com confirmação AlertDialog:

- **Publicar esta versão** recoloca o mesmo número no link público, sem copiar conteúdo para o rascunho, criar nova versão, alterar nome/prazo editáveis ou mudar suspensão. Versão expirada e entrega pendente são rejeitadas. A versão que saiu do ar continua disponível no histórico.
- **Restaurar no rascunho** copia nome, encerramento, artes, figurinhas e cores da versão selecionada para o administrativo. Não muda ponteiro público nem cria publicação. Preserva endereço, cliente, observações, cobranças e suspensão; prazo expirado pode ser restaurado para edição.

As duas ações exigem administrador, confirmação, revisão, timestamp e versão pública esperados sob lock da campanha. Qualquer edição local não salva bloqueia os controles para evitar perda no refresh/reload. Restaurar recarrega os painéis persistentes. A próxima publicação do rascunho usa o maior número já existente + 1, mesmo após voltar uma versão anterior; nunca reescreve um manifesto numerado antigo.

Snapshots preservam autoria e data de autorização originais. A data de entrega representa a última colocação daquela versão no público, permitindo identificar corretamente a versão ainda no ar durante um envio posterior pendente. O histórico retém versões de conteúdo, não é um log completo de cada alternância. Storage e banco continuam sem transação distribuída: falha após escrever o ponteiro pode exigir repetição explícita para reconciliar. Sessões públicas já abertas não trocam sua composição automaticamente ao mudar de versão; a mudança vale ao carregar novamente a campanha.

## Restaurar versão publicada (rascunho salvo)

Ação **Restaurar versão publicada** no bloco Próxima publicação, somente quando existe publicação entregue e o rascunho salvo difere dela. Confirmação identifica a Versão de destino. Restaura nome, encerramento e configuração visual da última versão entregue; mantém endereço, cliente, observações, cobranças, suspensão, publicação e histórico. Não entrega arquivos públicos nem cria outra versão. Caminhos públicos de materiais são normalizados para os IDs privados no rascunho e validados contra os assets da campanha; prazo publicado expirado pode ser restaurado.

Operação exige requireAdmin, confirmação, revisão do editor, updatedAt da campanha e versão esperados sob o mesmo lock de publicação. Entrega pendente ou aba obsoleta são rejeitadas. Edições locais não salvas em qualquer aba (inclusive cobrança) bloqueiam a ação; é necessário salvar ou descartá-las primeiro. Após sucesso, a página recarrega para substituir também as instâncias persistentes de Detalhes/Estúdio pela configuração restaurada. Assets exclusivos do rascunho descartado não são apagados automaticamente; continuam sujeitos à limpeza manual segura já existente. Sem nova migration ou alteração financeira.

## Disponibilidade independente da versão

`campaigns.suspendedAt` e `suspendedBy` registram a suspensão administrativa, sem converter a campanha em rascunho ou alterar versões/cobranças. Publicar alterações durante a suspensão entrega uma nova versão e mantém `suspended:true` no ponteiro; nunca reativa automaticamente. Reativar libera a última versão publicada, sem incorporar mudanças do rascunho. O prazo não é pausado; reativação de versão expirada é rejeitada. Para estender o prazo, salvar e publicar uma versão com encerramento futuro.

As ações exigem `requireAdmin`, confirmação explícita na interface, `updatedAt` esperado e lock da campanha compartilhado com publicação/edição. Entrega incompleta deve ser concluída antes de mudar a disponibilidade. O ponteiro é escrito antes do commit de disponibilidade no banco: se o storage falhar, o banco não confirma a ação; se o commit falhar depois de um PUT bem-sucedido, pode haver divergência temporária. Repetir a ação reconcilia o mesmo estado; não há transação distribuída nem reversão automática segura.

Compatibilidade com entregas anteriores à migration0014: o backfill numera os registros no banco, mas não cria `versions/vN.json` no bucket. Ao suspender/reativar, o serviço verifica a existência desse objeto; se ausente, materializa **somente o snapshot já entregue** antes de escrever o ponteiro, preservando seus caminhos `releases/<hash>/...` e sem consultar o rascunho nem recopyar PNGs. Versões existentes não são sobrescritas. Falhas de HEAD/materialização impedem a escrita do ponteiro e a confirmação no banco. Isso também permite reparar, por repetição explícita da ação, um ponteiro órfão escrito pela implementação anterior; não há reparo automático de campanhas existentes.

O runtime reconhece suspensão antes de baixar a versão. Sessões já abertas verificam o ponteiro sem cache a cada 15 segundos e ao retornar o foco/visibilidade; detectar suspensão desmonta a composição e mostra indisponibilidade temporária, não encerramento. A verificação não recarrega a composição enquanto ativa. Retorno após suspensão exige Tentar novamente. Não é revogação instantânea: navegador offline, aba congelada, clientes antigos ou cache/CDN mal configurado podem atrasar o reconhecimento. PNGs e versões imutáveis já publicados continuam acessíveis por URL completa e podem ter sido baixados; suspender controla a experiência do editor, não apaga materiais ou arquivos exportados.

## Entrega estática

Host separado entrega `/`, `/<slug>`, `/event-runtime/*`, `/events/<slug>/event.json`, `/events/<slug>/versions/vN.json` e PNGs artworks/stickers; mantém leitura de releases legadas. Não serve bucket arbitrário, private, listagem ou mutações. A página raiz local é apenas uma entrada mínima, não substitui o marketing/site antigo.

O runtime público lê JSON/PNGs do mesmo host público. Slug inexistente abre shell estático e apresenta “Evento não encontrado” após404 do JSON. Assets não são revogados por prazo: como arquivos públicos, podem ser cacheados/baixados. Encerramento é aplicado pelo editor na abertura e a cada segundo/focus/visibilitychange; desmonta composição ao vencer, sem cron/admin. Fotos/composições permanecem no navegador, analytics no-op.

Rotas públicas Next criadas na primeira implementação foram removidas. O runtime público não consulta banco nem administrativo depois de publicar.

## Operação local

```sh
docker compose exec app npm run build:event
docker compose up -d public-site
```

Servir produção exige configuração explícita da hospedagem/CDN e associação do domínio ao storage público. Não houve provisionamento, deploy, PixGo real, alteração do projeto antigo ou cópia de campanhas existentes sem ação administrativa. Upload direto/Vercel, escala, backups e operação de cache ainda exigem preparação para produção.
