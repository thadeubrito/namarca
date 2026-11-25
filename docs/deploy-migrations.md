# Migrations automáticas na Vercel

`vercel.json` define `npm run vercel-build`: executa `scripts/migrate-production.mjs` e, somente após sucesso, `npm run build`.

## Configuração

Na Vercel, em **Settings → Environment Variables → Production**:

- `DATABASE_URL`: conexão usada pela aplicação.
- `MIGRATION_DATABASE_URL`: recomendado para migrations; conexão **direta** do mesmo banco/branch Neon usado pela aplicação (hostname sem `-pooler`). Pode ter credencial própria com permissões DDL. Não adicionar ao Git, ao navegador ou a logs.

Se `MIGRATION_DATABASE_URL` não existir, o runner usa `DATABASE_URL`, desde que não seja conexão pooled do Neon. Sem conexão explícita ou com pooler, o deploy falha fechado. Nunca usar o fallback local de `drizzle.config.ts` em produção.

Não basta copiar uma conexão qualquer do Neon: conferir projeto, branch e database iguais aos da aplicação. Variáveis de Production não devem ser atribuídas a Preview. O runner ignora migrations fora de `VERCEL=1` e `VERCEL_ENV=production`; isso não isola por si só o acesso da aplicação de preview ao banco. Se previews precisarem de banco, usar branch/banco exclusivo.

## Operação

1. Alterar o schema, gerar migrations no container (`npm run db:generate`) e revisar SQL/metadados. Não usar `db:push` em produção.
2. Validar a cadeia em banco descartável e versionar `drizzle/` junto com o código.
3. No deploy de produção, o runner aplica somente migrations pendentes usando o journal Drizzle, sem criar/resetar contas ou publicar campanhas.
4. Migrations e lock usam a mesma conexão PostgreSQL direta. Um advisory lock fixo protege execuções deste runner: outro deploy simultâneo falha e deve ser reexecutado depois, sem disputar DDL. CLI `db:migrate` manual não participa desse lock; não executá-lo simultaneamente.
5. Erros interrompem o build com mensagem genérica, sem imprimir SQL, credenciais ou dados retornados. Timeout de conexão: 15s; timeout por statement: 120s. Investigar falhas de forma segura antes de tentar novamente.

O lock cobre somente migrations, não a ordem de promoção de deploys; evitar promover um deploy antigo após outro mais recente. Migrations fora do mecanismo transacional normal do Drizzle exigem procedimento específico revisado.

## Compatibilidade e rollback

A versão antiga continua atendendo enquanto o banco é migrado e o build ocorre. Usar mudanças compatíveis (expand/contract): adicionar primeiro, migrar usos/dados e só remover estruturas em entrega posterior. Não editar migrations já aplicadas.

Build falhou depois das migrations? O banco **já foi alterado**. Rollback da Vercel não reverte schema. Não fazer rollback destrutivo automático; correções devem ser migrations novas revisadas. Backup/restauração e operações destrutivas precisam de planejamento separado.

`npm run build` local e o build isolado de validação continuam sem executar migrations. Desenvolvimento local mantém `npm run db:migrate` explícito, no PostgreSQL do Compose.
