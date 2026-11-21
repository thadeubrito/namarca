# Publicação independente do administrativo

## Separação

- Administrativo Next: prepara campanha, autentica operador, valida e envia artefatos ao storage.
- Site público: HTML/CSS/JS estáticos e leitura de objetos publicados. Não usa Next, PostgreSQL, sessão, financeiro ou PixGo.
- Produção pretendida: `namarca.com` e `namarca.com/<slug>` em hospedagem estática/CDN independente. Nenhum DNS/deploy/site antigo alterado nesta entrega.
- Desenvolvimento: serviço `public-site` em `http://localhost:3001`, depende somente do S3 local. É um gateway read-only para o storage privado local; em produção CDN/R2 pode assumir essa entrega. Bucket não precisa liberar conteúdo privado.
- Administrativo usa `PUBLIC_SITE_URL` (origem sem caminho; padrão localhost:3001 em dev e https://namarca.com em produção) para abrir o site correto.

## Versões numeradas e comparação

Novo formato: `event.json` contém somente `{ "version": N }`; o conteúdo está em `versions/vN.json`, referenciando `artworks/<UUID>.png` e `stickers/<UUID>.png`. Ponteiro é escrito por último, sem cache; versões e assets são imutáveis/cacheáveis. Numeração é reservada sob lock da campanha e persistida no banco; retry mantém a mesma versão. Objetos releases/hash e manifestos completos anteriores continuam legíveis, sem migração automática do site antigo.

Na aba Publicação, Comparar alterações permite versão entregue→rascunho salvo e versão→versão, com valores anteriores/novos, materiais, ordem, referências e cores. Não compara caminhos técnicos, cliente, notas ou financeiro. É leitura administrativa, com miniaturas privadas autenticadas; não envia dados administrativos ao público. A comparação do rascunho usa revisão/updatedAt exibidos; servidor rejeita revisão obsoleta ao publicar. Histórico usa snapshots retidos.

Estado de mudanças é compacto junto à situação no cabeçalho e na aba, sem faixa de aviso permanente. Botão Publicar vN; checkbox sem pagamento somente na primeira publicação.

## Publicar

Aba Publicação com Publicar/Atualizar publicação, confirmação explícita sem exigir pagamento, `requireAdmin` na action. Nenhuma cobrança/pagamento é alterado ou consultado para liberar acesso. Exige materiais salvos, arte, prazo futuro, ownership/referências/PNG/dimensões válidos. Revisão do editor e updatedAt de Detalhes conferidos sob lock. Pendências bloqueiam botão; workbench inert durante envio.

1. Derivar manifesto por contrato público estrito: nenhuma nota, cliente, preço, pagamento, token ou auditoria.
2. Hash canônico identifica igualdade de conteúdo; número persistido identifica a versão pública vN. JSONB com outra ordem de chaves não cria versão desnecessária.
3. Validar bytes privados e congelar a intenção numerada; na entrega, enviar PNGs a `public/events/<slug>/artworks/<uuid>.png` e `stickers/<uuid>.png` (cache imutável). IDs nunca podem ser reaproveitados com bytes diferentes.
4. Gravar snapshot congelado/auditoria e estado published no banco. O rascunho continua editável; salvar nunca muda o manifesto público.
5. Gravar `public/events/<slug>/versions/vN.json` completo, imutável. **Por último**, gravar `public/events/<slug>/event.json` contendo apenas `{ "version": N }`, cache no-store. Este ponteiro é o interruptor público.
6. Registrar deliveredAt no banco e apresentar link público.

Não há transação distribuída S3/DB: falha de PNG não publica manifesto, podendo deixar objetos públicos órfãos sem referência; quem conhecer a URL completa poderá lê-los mesmo sem manifesto (o hash não é autorização). O clique explícito autoriza a cópia pública dos materiais; não há atomicidade de exposição entre arquivos. Nenhuma listagem pública é oferecida; falha posterior ao commit congela snapshot mas permite **Concluir publicação**. Retry entrega a mesma versão, nunca o rascunho alterado. Se manifest foi escrito mas confirmação DB falhou, público já pode estar acessível; repetição é segura. published não basta para declarar entrega: deliveredAt diferencia conclusão. Snapshots locais da implementação anterior, sem deliveredAt, podem ser exportados explicitamente com a mesma ação.

Migration0011 adiciona delivered_at nullable sem apagar dados;0010 preserva snapshot/revisão/ator/data. Sem approvals legadas, worker, cron ou publicação vinculada ao financeiro. Atualizar publicação gera nova release a partir do rascunho salvo, mantendo o manifesto anterior até o PUT final. Snapshots anteriores são retidos em campaign_publication_history (migration0012 e authorizedAt0013), inclusive materiais privados; releases públicas antigas não são apagadas. Entregas compartilham lock da campanha para evitar uma versão antiga sobrescrever a nova. Uma entrega pendente precisa ser concluída antes de iniciar outra. Endereço publicado permanece fixo (readOnly e validação servidor); demais detalhes, prazo e materiais são rascunhos editáveis. Cabeçalho usa prazo da última versão entregue. Sem despublicação/suspensão nesta fatia.

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
