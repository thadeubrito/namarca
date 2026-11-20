# Namarca — instruções do projeto

- Responder em português.
- Este é o novo administrativo/checkout. O core do editor anterior foi integrado à prévia privada; a publicação pública ainda não foi migrada.
- Ao iniciar uma nova sessão, leia `docs/CONTINUIDADE.md` completo: decisões aprovadas, estado real, problemas conhecidos e backlog da V1.
- Consulte README.md e docs/architecture.md antes de alterações transversais.
- Para qualquer alteração de UI/UX, leia `docs/revolut.design.md` (referência visual de toda a aplicação) e `docs/design-system.md` (adaptações e contratos operacionais). Reutilize tokens e componentes compartilhados; não crie paletas locais divergentes. Preserve cores configuráveis das campanhas, contraste, acessibilidade e regras de negócio. Lacunas da referência de marketing devem ser resolvidas e documentadas no sistema local, não por imitação de funcionalidades da Revolut.
- Execute dependências, ferramentas e testes em containers; não instale no host.
- Desenvolvimento não pode exigir serviços externos: Compose fornece PostgreSQL, S3 compatível e PixGo simulada. Sem worker, cron ou Inngest; processar confirmação financeira diretamente no webhook.
- Nunca chamar PixGo real nem provisionar serviços pagos sem autorização específica. Mock é o padrão; produção exige configuração explícita.
- Não enviar fotos/composições de participantes ao servidor, logs ou telemetria.
- Posicionamento: ativação digital antes, durante e depois do evento, principalmente pré-evento por orientação do fundador. Não chamar de souvenir nem prometer alcance.
- Senha + TOTP obrigatórios. Nenhuma operação privilegiada pode depender apenas da proteção do layout; usar requireAdmin no servidor.
- Não habilitar cadastro público. Não registrar senhas, TOTP, códigos de recuperação, CPF ou payloads brutos dos pagamentos.
- Mudanças de schema exigem migrations versionadas, não apenas db:push.
- Validar typecheck, testes, migrations e build. Mudanças em auth exigem o teste de integração de autenticação.
- Não publicar, fazer push, apagar volumes ou alterar o projeto anterior sem pedido explícito.
