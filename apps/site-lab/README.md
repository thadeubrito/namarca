# Laboratório estático Astro + React

Prova de conceito local autorizada, **sem migrar landing, campanha, editor ou administrativo**. URL local: http://localhost:3002/. O servidor entrega exclusivamente `dist/`; não executa Astro nem React no servidor. Sem integração de banco, publicação ou serviços externos em runtime.

## Estrutura

- `src/pages/index.astro`: HTML pré-renderizado, contexto e lista acessível mesmo sem JS.
- `src/components/ui/warp-carousel.tsx`: componente completo fornecido pelo usuário, geometria, curva temporal, mesh, GLSL/WebGL2 e fallback Canvas 2D preservados.
- `src/components/warp-demo.tsx`: ilha React com índice controlado e controles externos.
- `src/styles/global.css`: Tailwind v4 via plugin Vite e CSS local.
- `components.json`: configuração shadcn compatível, sem instalar Radix ou biblioteca desnecessária.
- `tsconfig.json`: TypeScript estrito; `@/*` aponta a `src/*` **deste workspace**.

`@/components/ui` resolve para `apps/site-lab/src/components/ui`. Essa convenção mantém imports de componentes portáveis e evita misturá-los ao admin. Não criar `/components/ui` na raiz do monorepo. Não é necessário executar o CLI shadcn: a estrutura já está configurada; um futuro `shadcn add` deve ser executado em container, com cwd neste workspace e revisão de mudanças/dependências. Não há providers, imagens Unsplash ou ícones exigidos pelo componente. A variante atual usa quatro WebPs locais do hero público; não busca assets remotos durante o uso.

## Dependências e comandos (somente containers)

Node 24.11.1; versões resolvidas no lock único: Astro 5.18.2, @astrojs/react 4.4.2, React/React DOM 19.3.1, Tailwind 4.3.5. Volume exclusivo, sem disputar o `node_modules` do app dev:

```sh
# Executar da raiz do repositório. Não carrega .env nem altera volumes existentes.
docker run --rm -e ASTRO_TELEMETRY_DISABLED=1 -v "$PWD:/app" -v namarca_site_lab_deps:/app/node_modules -w /app node:24.11.1-bookworm-slim npm ci --no-audit --no-fund
docker run --rm --network none -e ASTRO_TELEMETRY_DISABLED=1 -v "$PWD:/app" -v namarca_site_lab_deps:/app/node_modules -w /app node:24.11.1-bookworm-slim sh -c 'npm run typecheck --workspace @namarca/site-lab && npm run build --workspace @namarca/site-lab'
docker compose -f compose.site-lab.yaml up -d
# Parar somente o laboratório, sem apagar volumes:
docker compose -f compose.site-lab.yaml down
```

Para desenvolvimento com HMR: mesmo volume/dependências, `-p 127.0.0.1:4321:4321`, comando `npm run dev --workspace @namarca/site-lab -- --port 4321`. Isso é opcional; 3002 demonstra o **build**, não o servidor de desenvolvimento.

Validação de contratos: `node_modules/.bin/tsx --test tests/site-lab.test.ts` no container Node preparado. Browser: `scripts/test-site-lab.mjs` em `mcr.microsoft.com/playwright:v1.56.1-noble`, montando fonte read-only, volume de dependências e `/tmp/site-lab` para capturas. Usa `http://host.docker.internal:3002` por padrão; `SITE_LAB_URL` permite outra origem. Software WebGL/SwiftShader não comprova desempenho em GPU/aparelho físico.

## Cloudflare Pages — instruções, NÃO executadas

- Diretório raiz do projeto: raiz do repositório.
- Node de build: 24 (compatível com engines do monorepo).
- Comando: `npm ci && npm run build --workspace @namarca/site-lab` (opcional `ASTRO_TELEMETRY_DISABLED=1`).
- Pasta de saída relativa à raiz: `apps/site-lab/dist`.
- Sem adapter, SSR, Functions, worker, banco ou servidor Node em runtime.
- Criar projeto/deploy/integração Git exige autorização separada; nada foi provisionado.

O build gera HTML, CSS e JS locais. **React continua no bundle do navegador** para hidratar a ilha; Canvas/WebGL também precisa de JS. Não é conversão para HTML/CSS sem runtime. Hospedagem é estática, mas custos/limites do provedor não são garantidos por esta POC. Para produção, revisar CSP compatível com bootstrap de ilhas Astro (hashes/nonces ou estratégia apropriada), cache de assets e licença; não liberar `unsafe-eval` por conveniência.

## Mudanças pontuais em relação ao código fornecido

Strings com newline corrigidas para `\n`; ref de props sincronizada em effect; foco visível; autoplay sem anúncios repetidos ao leitor de tela; pausa externa realmente congela movimento e retoma com intervalo completo; reduced-motion conservador no primeiro frame, sem autoplay/spin/inércia (drag em passos); buffer GL liberado. O renderer e as quatro demonstrações numéricas permanecem no código como referência. A página usa `CAMPAIGN_CARDS`: **Órbita 26, Clube Sol, Lívia e Tomás, Luma 2026**, cópias locais de 480×853 px do hero público. Excluídas corrida/festival conforme preferência anterior. Autoplay da galeria avança **um** cartão, visitando todos; Warp em 0,7, sem glow, mesh ou texto sobre as artes. Geometria vertical `CH = CW * 853 / 480`, fit responsivo e textura limitada a 480px; quadro central íntegro, distorção lateral. Carregamento assíncrono deduplicado, imagem estática enquanto prepara, galeria HTML em details para falha/sem JS. Imagens não são enviadas a serviços externos.

## Direitos e limites

Crédito: **Warp Carousel por Louis Studios**, origem informada no código: https://studios.lou15.com/?ref=21st-code. Código entregue pelo usuário para teste; **licença de uso/redistribuição não confirmada**. Não presumir MIT, originalidade ou autorização de publicação comercial. Quatro imagens públicas foram baixadas em container em 2026-11-23, sem geração de IA. Origem individual e limites em `public/images/NOTICE.txt`; acesso público não comprova direitos de publicidade/redistribuição ou endosso. Fontes e imagens são servidas localmente. POC não pronta para produção.
