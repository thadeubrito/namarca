# Estúdio da campanha

Disponível na aba Estúdio de `/admin/campanhas/<UUID>`, para campanhas em rascunho e não publicadas. Dados e Cobrança continuam independentes; não há aprovação visual ativa nem publicação pública. Editor compartilhado em `packages/editor`, prévia estática isolada em `apps/event`. Ver [editor-runtime.md](editor-runtime.md).

## Operação — Plano A

1. Selecione uma ou várias artes/figurinhas PNG. A seleção é local: nenhum upload ocorre nesse momento.
2. Ajuste nomes, ordem, referência da foto pelo modal e tema de quatro cores. Biblioteca, referência e prévia usam object URLs locais para materiais novos.
3. Confira a composição com uma foto do dispositivo. Foto e composição nunca são incluídas na persistência do rascunho administrativo nem no upload.
4. Use **Salvar artes**, **Salvar figurinhas** ou **Salvar cores** na respectiva aba. Cada ação confirma apenas sua seção: artes incluem nomes/ordem/referências/remoções, figurinhas incluem nomes/ordem/remoções, cores incluem somente tema. Somente arquivos novos da seção salva são enviados, com até três requisições simultâneas e progresso. O servidor continua autoridade na validação do PNG.
5. Após os envios, o PUT com `scope: artworks|stickers|theme` mescla somente o campo escolhido à configuração salva sob lock e revisão otimista global. API sem scope mantém save completo por compatibilidade; a UI sempre envia scope. Campos de outras abas não são persistidos incidentalmente. Em falha parcial, o rascunho permanece e envios concluídos são reutilizados. UUID estável em `X-Upload-Id` torna a repetição do mesmo upload idempotente; divergência de bytes/campanha/tipo é recusada.
6. Arquivos locais removidos antes de salvar nunca são enviados. Materiais anteriormente salvos e removidos são excluídos **depois do commit**, com revalidação dos vínculos atuais e históricos. Falha nessa limpeza não desfaz a configuração salva e gera aviso.

Trocar de aba ou recolher a prévia não desmonta o iframe. A referência retangular limita/recorta a foto; alpha e referência têm responsabilidades distintas.

## Refresh e rascunho local

IndexedDB guarda configuração em edição e Blobs dos **materiais da campanha**, nunca a foto/composição do participante. Chave separada por administrador, campanha e aba (token em sessionStorage); BroadcastChannel detecta token herdado por uma aba duplicada enquanto a original está aberta e atribui novo token, evitando que disputem o mesmo registro. Em navegadores sem BroadcastChannel essa proteção adicional não está disponível. Após refresh na mesma aba, o estúdio abre um dialog modal com data/hora, quantidade de artes e figurinhas e **Recuperar rascunho** como ação principal. **Descartar** abre confirmação em segundo passo; Voltar/Escape cancelam essa confirmação sem apagar. Clique fora/Escape não descartam nem fecham a decisão inicial. O foco fica contido e retorna ao estúdio após a decisão. O dialog informa conflitos e que recuperar não salva nem envia materiais. Salvamento de uma seção atualiza a revisão e mantém configuração/Blobs pendentes das demais abas no IndexedDB; só apaga o rascunho quando todas as seções estiverem salvas.

Recuperar com revisão desatualizada preserva o conteúdo, mas bloqueia sobrescrita: é necessário descartar/recarregar a versão salva. Não há merge automático. A recuperação não é backup, não acompanha outro dispositivo e não garante reabrir uma aba encerrada. Dados limpos pelo navegador, modo privado, quota e falhas de IndexedDB podem impedir recuperação; nesses casos há aviso visível e a edição continua em memória.

Guard de alterações não salvas permanece em links, beforeunload e submit de dados da campanha. Não cobre todos os casos de navegação programática nem encerramento abrupto. O IndexedDB é local à origem; usar dispositivo administrativo confiável. Não há sincronização remota ou armazenamento de fotos.

## Limpeza manual

No estúdio, **Limpar arquivos não utilizados** analisa a campanha sem excluir nada. Exibe quantidade/espaço recuperável; cada exclusão exige confirmação e recebe no máximo 100 IDs. O controle fica indisponível durante alterações pendentes/salvamento/recuperação.

Backend exige requireAdmin + Origin nas mutações, trava a campanha e revalida referências na configuração atual e em `campaign_packages` históricos. Considera apenas chaves canônicas `private/campaigns/<campanha>/assets/<UUID>.png`, inclusive objetos sem linha no banco. A varredura manual ignora materiais com menos de 24 horas e datas desconhecidas. Não há exclusão ampla por prefixo, agendamento, worker ou cron. Falhas e itens preservados são informados; nova análise é necessária para novo lote.

Essa opção trata arquivos antigos e resíduos excepcionais. Banco e storage não são uma transação única: interrupções ainda podem deixar resíduos. Upload recente e histórico protegido nunca são candidatos à limpeza manual. A proteção de 24h não é lease de edição: um rascunho abandonado há mais tempo pode precisar reenviar seu Blob local.

## Dados e segurança

- `campaign_editor`: JSONB e revisão; `campaign_assets`: metadados/vínculo e dimensões.
- PNGs privados servidos por ID somente após autenticação; não aceitar chave S3 do navegador.
- Endpoints `/editor`, `/assets` e `/assets/cleanup` exigem administrador com segundo fator. Mutações validam origem e estado draft/unpublished.
- Concorrência de uploads, save e limpeza serializada por lock da campanha; PUT usa revisão e retorna 409 em conflito.
- Bridge verifica origem/janela/campanha e manifesto. Mapa de materiais locais separado aceita apenas filenames do evento e blob URLs da mesma origem. Entrada pública não usa esse mapa.
- Seleção inicial local verifica tipo/tamanho/decodificação; servidor verifica PNG, CRC, dimensões e pixels transparentes/opacos.

## Limites

PNG até 25 MiB e 40 milhões de pixels no ambiente Node local. A Vercel impõe limite próprio ao body: produção precisará de upload direto assinado e finalização, ainda não implementados. Seleção local válida não garante aceitação pelo servidor (transparência/CRC continuam obrigatórios).

Não há publicação, telemetria da prévia, biblioteca de modelos nem migração pública do projeto anterior. Rascunho vazio pode ser salvo, mas não abre composição. Não há garantia de composição acessível por teclado equivalente aos gestos do editor original. Limpeza mantém históricos legados; não reintroduz aprovação visual.
