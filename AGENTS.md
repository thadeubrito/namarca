# Namarca — instruções para agentes

## Entrada e leitura seletiva

- Responder em português.
- Ao iniciar uma sessão, ler `agents/knowledge/memory.md`: estado relevante, decisões e problemas conhecidos. Não há diário obrigatório de implementação.
- Para produto, copy, jornadas, escopo ou regras de negócio, ler `agents/knowledge/product.md`. Direção futura não é autorização de implementação.
- Para localizar código, operar ambiente, testar ou fazer alterações transversais, consultar `agents/knowledge/code-map.md` e os arquivos reais envolvidos. Código/migrations são a fonte da implementação.
- Em UI/UX administrativa, ler `agents/knowledge/design/admin.md` e a referência integral `agents/knowledge/design/revolut.design.md`. Em site/campanha/editor público, ler `agents/knowledge/design/public.md`: a direção pública ainda está pendente, não herda Revolut. Prévia: shell externo administrativo, conteúdo do iframe público. Login/TOTP e checkout preservam tratamento atual até decisão de associação visual. Reutilizar componentes/tokens do escopo correto, preservando personalização, contraste, acessibilidade e regras de negócio.
- Conhecimento compartilhado fica em `agents/knowledge/`; papéis portáveis em `agents/roles/`. Adaptadores específicos devem mandar ler a fonte, nunca copiar o papel. No Pi, há adaptadores consultivos em `.pi/agents/`; novas execuções devem reler o papel.
- Especialistas disponíveis: `copywriter` (copy/microcopy), `product-experience` (jornadas/escopo/aceite), `quality-security` (revisão independente) e `interface-designer` (UI/UX por escopo). Acionar quando houver pergunta delimitada; não impor uma cadeia de agentes a toda tarefa. O principal mantém entendimento, síntese, implementação e validação. Não delegar aprovação de decisões ou privilégios.

## Restrições obrigatórias

- Novo monorepo administrativo/checkout, campanha pública local e editor compartilhado. O público antigo em produção não foi migrado. Não alterar `/Users/thadeubrito/workspace/personal/namarca` sem pedido específico.
- Executar dependências, ferramentas e testes em containers; não instalar no host. Desenvolvimento não pode exigir serviços externos: Compose fornece PostgreSQL, S3 compatível e PixGo simulada.
- Sem worker, cron ou Inngest. Processar confirmação financeira diretamente no webhook. Pagamento não publica campanha; salvar rascunho não modifica público.
- Nunca chamar PixGo real nem provisionar serviços pagos sem autorização específica. Mock é o padrão; produção exige configuração explícita.
- Não enviar fotos/composições de participantes ao servidor, logs ou telemetria.
- Posicionamento: ativação digital antes, durante e depois do evento, prioridade pré-evento por orientação do fundador. Não chamar de souvenir nem prometer alcance. A entidade é campanha; evento é contexto.
- Senha + TOTP obrigatórios; usar `requireAdmin` no servidor em toda operação privilegiada, não apenas no layout. Não habilitar cadastro público.
- Não ler/imprimir secrets, senhas, TOTP, códigos de recuperação, CPF/CNPJ ou payloads brutos de pagamentos. Não recriar/resetar contas/sessões existentes para testar.
- Schema exige migrations versionadas, não apenas `db:push`. Para mudanças de implementação, validar typecheck, testes, migrations quando pertinentes e build isolado. Mudanças em auth exigem integração de autenticação. Documentação apenas: validar referências e consistência, sem apresentar testes da aplicação como reexecutados.
- Não fazer deploy, push, apagar volumes ou alterar o projeto anterior sem pedido explícito. Publicação de conteúdo real de campanha também exige autorização; código de publicação local não é permissão para publicar campanhas existentes.

## Manutenção do conhecimento

- Uma informação tem uma fonte: produto/intenção em `product.md`, estado/exceções/pendências em `memory.md`, localização/operação em `code-map.md`, contratos visuais administrativos em `design/admin.md` e públicos em `design/public.md`.
- Ao concluir, atualizar somente o conhecimento que muda decisões futuras. Substituir o estado vigente e retirar pendências resolvidas; não acrescentar relato por tarefa, contagens de testes ou caminhos de logs/screenshots temporários.
- Registrar resultados e limites da execução na resposta. Histórico de alterações fica no Git; não converter PASS antigo em cobertura atual, nem backlog histórico em tarefa autorizada.
