# Primeiro acesso administrativo pelo navegador

O primeiro acesso cria **somente** a conta `ADMIN_EMAIL` configurada no servidor e sua credencial de senha. Não há cadastro público, campo de e-mail, sessão automática, convite ou recuperação de conta existente.

## Preparação autorizada

1. Aplicar a cadeia versionada de migrations, incluindo `0017`, ao banco explicitamente escolhido. Não executar `db:push` nem alterar contas para preparar o fluxo.
2. Configurar no ambiente de servidor `ADMIN_EMAIL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET` e `ADMIN_BOOTSTRAP_KEY`. Nunca colocar a chave em variável `NEXT_PUBLIC_*`, URL, repositório, logs ou telemetria.
3. Gerar a chave em um gerenciador seguro: recomenda-se **32 bytes aleatórios (256 bits), codificados em base64url sem padding**. O servidor aceita somente base64url com pelo menos 43 caracteres; comprimento/formato não garantem entropia. Não usar frases ou valores previsíveis.
4. Acessar `/login/primeiro-acesso` na origem administrativa HTTPS configurada. Informar chave, senha de 8–128 caracteres e confirmação. JavaScript é necessário; sem hidratação o envio fica desabilitado e o fallback usa POST sem credenciais na URL.
5. Após sucesso, abrir o link de login normal. Entrar com `ADMIN_EMAIL` e a nova senha; concluir o enrollment TOTP existente e guardar os códigos de recuperação antes de usar o administrativo.
6. Remover `ADMIN_BOOTSTRAP_KEY` do ambiente após concluir. O consumo persistido também impede reutilização, mesmo após reinício ou troca da chave.

A criação não concede sessão nem dispensa TOTP/`requireAdmin`. Não publicar campanhas reais como parte deste procedimento.

## Proteções e indisponibilidade

`POST /api/auth/bootstrap` aceita JSON de até 4 KiB reais (leitura streaming), sem query string, com `Origin` exatamente igual à origem de `BETTER_AUTH_URL`. Não herda a lista de origens de desenvolvimento do login. Respostas são genéricas, sem cookies, `no-store`, `no-referrer` e `noindex`.

Cinco tentativas globais em uma janela fixa de 15 minutos são reservadas no PostgreSQL antes de comparar a chave ou calcular o hash. A reserva é uma transação independente: rollback não devolve tentativa; o relógio é do banco, e falhas de banco fecham o acesso. Esse limite é exclusivo do bootstrap, não altera o login. Requisições rejeitadas no transporte não consultam o serviço.

A criação usa lock singleton e transação única para inserir usuário/credencial e marcar consumo. E-mail existente (inclusive com caixa diferente), consumo anterior, chave inválida/ausente, limite ou falha retornam a mesma mensagem. **Nunca atualiza usuário existente**. A página e o link podem continuar visíveis após consumo; visibilidade não informa elegibilidade.

Se indisponível, conferir configuração e migration sem imprimir valores sensíveis; aguardar a janela se necessário. Não limpar consumo, limites, sessões ou contas para tentar novamente. Recuperação de uma conta existente não faz parte deste fluxo. O CLI local `admin:create` legado permanece inalterado, mas não é o procedimento de primeiro acesso de produção descrito aqui.

## Validação isolada

`npm run test:auth`, em container com banco descartável `*_auth_test` migrado e vazio, exercita handler de bootstrap, origens, query, limite streaming, configuração/chave inválida, janela global, conta existente, concorrência, consumo e ausência de sessão, seguido do login e enrollment TOTP reais. Não rodar contra banco ou conta existentes. Integração não comprova experiência de navegador, TLS ou configuração do ambiente publicado.
