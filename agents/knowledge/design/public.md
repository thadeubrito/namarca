# Design público — Namarca

**Status: direção visual ainda não definida.** Este arquivo reserva o escopo e preserva contratos existentes; não é um design público aprovado nem autorização para redesenhar/publicar.

## Escopo e fronteiras

- Site institucional (`apps/site`) e experiência da campanha (`apps/campaign`, `packages/editor`). Podem precisar de tratamentos distintos dentro da mesma direção pública; não presumir que marketing e ferramenta de composição terão o mesmo layout.
- Conteúdo do iframe da prévia privada reproduz a campanha e segue os mesmos contratos do editor público. Shell, dispositivo e controles administrativos externos seguem [admin.md](admin.md).
- Login/TOTP e checkout permanecem com tratamento existente registrado em `admin.md` até decisão explícita de associação visual. Não redesenhá-los incidentalmente ao trabalhar no institucional ou na campanha.
- [revolut.design.md](revolut.design.md) é referência administrativa. Não importar automaticamente sua paleta, tipografia, componentes ou composição para a parte pública.

## Até a direção ser definida

- Manter aparência e comportamento existentes nas correções pontuais. Um novo layout/identidade deve ter escopo e direção confirmados com o fundador, não ser apresentado como regra já aprovada.
- Não criar nova paleta pública por inferência a partir do administrativo. Reutilizar implementação compartilhada onde fizer sentido funcional, sem acoplar as duas diretrizes visuais.
- Preservar acessibilidade, responsividade, foco, contraste e reduced-motion; não cortar conteúdo para caber numa tela.
- Copy segue [product.md](../product.md): ativação digital, prioridade pré-evento, sem souvenir nem promessas de alcance.

## Contratos existentes a preservar

Estes são comportamentos/proteções atuais, não uma proposta estética futura:

- Cores da campanha são configuráveis e independentes do toggle administrativo. Defaults compartilhados: fundo #ffffff, painéis #dedede, destaque #494fdf, texto #191c1f. Não sobrescrever temas explícitos salvos ao introduzir direção pública.
- Foto/composição/exportação permanecem no navegador. Editor e estilos têm fonte única em `packages/editor`; não duplicar runtime para estilizar a prévia.
- Prévia privada sem arte mantém editor real, quadriculado neutro apenas na composição e operações sem composição desabilitadas. Bridge envia `adminTheme` enum somente para os neutros, não uma paleta arbitrária; shell mantém cores da campanha. Não remontar iframe ao trocar abas ou primeira/última arte.
- Carregamento inicial público/espera de configuração privada são silenciosos visualmente com status sr-only; documento privado transparente até montar shell. Sem timer artificial; erros, suspensão e encerramento continuam explícitos.
- Campanha não encontrada permanece provisoriamente título/mensagem sem marca e com estilo padrão do navegador, reset restrito a esse estado. Não tratar esse provisório como identidade pública definitiva.
- QR e transparência têm função, não são decoração. Não prejudicar leitura óptica, canvas, coordenadas, resolução ou exportação para seguir referência estética.
- Publicação/suspensão/encerramento e privacidade são regras de produto, não decisões de estilo. Ver [memory.md](../memory.md).

## A definir com o fundador

Quando começar o trabalho público, substituir esta seção por decisões aprovadas:

- Objetivos e hierarquia do institucional versus experiência do participante.
- Referências visuais públicas e ativos/fontes com direitos de uso.
- Linguagem de marca, tipografia, superfícies, movimento e componentes públicos.
- Relação entre identidade Namarca e personalização de cada campanha.
- Estados completos: carregamento, não encontrada, indisponibilidade, encerramento, erro e exportação.
- Associação definitiva de checkout e autenticação às diretrizes.

Não preencher essas lacunas automaticamente, nem transformar esta lista em backlog autorizado. Validar a direção em superfícies representativas antes de promover padrões a contrato.
