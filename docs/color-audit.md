# Auditoria de cores — administrativo, auth e checkout

## Escopo

Rotas administrativas ativas, AuthPanel, checkout e controles administrativos do estúdio. Referência: `docs/design-system.md`. Auditoria de encadeamento de imports distingue componentes ativos de arquivos legados. Não inclui migração visual do editor público anterior, `packages/editor` ou cores de campanha.

## Correções

- Overlay compartilhado Radix usa preto a72% e blur4px explicitamente. Portal fica fora de ThemeScope: depender de `var(--scrim)` herdada deixava backdrop transparente. O valor do backdrop é deliberadamente autossuficiente; conteúdo continua usando tokens do tema.
- `ui.css`: token `--brand-text` separado da superfície `--brand`: #494fdf claro, #a4a8ff escuro. `--on-brand` branco e `--scrim` para overlay administrativo.
- Links da campanha, hover do nome no diretório e monogramas usam token de texto em vez do cobalto escuro inadequado para texto pequeno no fundo escuro.
- Foco do diretório usa `--ring`, sem impor cobalto sobre fundo escuro.
- Contorno, preenchimento, etiqueta e alças do modal administrativo de referência usam marca em vez de laranja/verde anteriores. Dimensões16px, transformação e coordenadas preservadas; quadriculado mantém superfície/borda do tema.
- Código HEX inválido usa `--error`; removida dependência de token `--destructive` inexistente.
- Caption financeira sobre cobalto usa branco sólido, não branco a72%.
- ShinyText administrativo usa cores alinhadas ao sistema. Recebe valores literais equivalentes aos tokens porque seu parser canvas não resolve custom properties CSS. Não alterar a biblioteca para interpretar variáveis nesta tarefa.
- Checkout define tokens próprios de erro/superfície/borda, soft/hover e foco cobalto; não herda vermelho/salmão antigo do CSS global. Continua claro sobre canvas preto.
- Skip link global tem contrato explícito branco/ink/borda/cobalto, independente de ThemeScope, sem foco verde herdado.

## Exceções preservadas

- QR Code auth/Pix: branco/preto intencional para leitura óptica.
- Cores de campanha, amostras e contraste automático de `studio-colors`: valores do usuário, não paleta administrativa.
- Quadriculado/transparência: ferramenta funcional, não cor decorativa.
- Branco sobre seleção cobalto, sombras internas de amostra, opacidade de desabilitados e scrim modal: exceções funcionais.
- Arquivos legados sem import nas rotas ativas podem conservar cores antigas. Não foram apagados nem migrados silenciosamente. Sua existência não implica aparência ativa.
- `globals.css` ainda contém regras legadas. A auditoria corrigiu escapes identificados nas rotas ativas, não fez substituição global que afetaria páginas fora do escopo.

## Evidências e limites

Focal Chromium em1440/390px claro/escuro,72capturas: texto de marca6,06:1/9,62:1; caption sobre cobalto6,06:1; erroNotice6/8,82:1; erroAuth5,81/7,05:1; erroCheckout5,93:1. Skip primeiroTab/foco, seleção, HEX inválido e referência real preservados; zero overflow/pageerror. Evidências `/tmp/namarca-color-audit/RESULTADO.md`. Erros Notice/auth/checkout foram fixturesDOM com CSSreal, sem submit; progressoShiny não teve revisão visual dinâmica. Persistem25warnings hydration.

Contratos estáticos em `tests/revolut-ui.test.ts`; não substituem contraste/renderização no navegador. Resultados da rodada e limites de cenários constam em `docs/CONTINUIDADE.md`. Não afirmar cobertura integral de toda combinação de conteúdo/estado/plataforma nem do projeto público anterior.
