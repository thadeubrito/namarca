# Segurança e limites desta base

## Autenticação

Senha longa + TOTP, cadastro público bloqueado, sessão validada no banco em toda operação privilegiada. Códigos de recuperação são secretos e de uso único. Recuperação operacional exige acesso à infraestrutura, redefine senha/segundo fator e revoga sessões. Desenvolvimento HTTP é somente localhost; produção exige HTTPS.

O rate limiter da biblioteca é uma proteção inicial. Em produção serverless, validar armazenamento compartilhado e proteção de borda antes de exposição pública; não assumir que memória de uma instância limita ataques distribuídos. Não tratar esta base como auditoria de segurança concluída.

## Pagamentos

PixGo é simulada por padrão. O adapter não publica automaticamente campanhas sem pacote pronto. HMAC valida bytes exatos, timestamp e assinatura; valor e identificadores são conferidos via consulta ao gateway. Nunca persistir corpo bruto do webhook, CPF ou dados bancários para debug. Receipts e pagamentos não dependem de telemetria para auditoria; são persistidos na mesma transação, sem processamento em segundo plano.

O mock não prova aprovação da conta PixGo, limite financeiro, recebimento em DePix, regras fiscais, integração real, emissão fiscal ou política de reembolso. Validar separadamente com autorização.

## Dependências

A instalação inicial revelou alertas no tooling de desenvolvimento: cadeia drizzle-kit → esbuild antigo e cadeia eslint-config-next → picomatch, além de avisos de peer dependencies de ESLint. Não aplicar `npm audit fix --force` sem revisão: as sugestões incluem downgrades incompatíveis. Inngest foi removido (não faz parte da stack).

Reexecutar `npm audit` e revisar o lockfile antes do deploy. Alertas de tooling não devem ser apresentados como vulnerabilidades comprovadamente exploráveis no endpoint da aplicação, mas também não devem ser ocultados. Não executar servidores de tooling expostos na internet nem processar padrões arbitrários de terceiros com os linters.

## Operação

Nenhum deploy ou serviço externo foi provisionado. Antes de produção: backup/restauração PostgreSQL, política de retenção, secrets próprios, URLs HTTPS, monitoramento de falhas do webhook e procedimento para conferir pagamentos sem notificação. Não há worker ou agendamento. A configuração Compose é para desenvolvimento, não um plano de recuperação de produção.
