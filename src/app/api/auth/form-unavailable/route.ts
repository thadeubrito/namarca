// Fail closed if a browser submits before hydration. Never read, log or redirect credentials.
export async function POST() {
  return new Response('O formulário não carregou corretamente. Volte para /login e recarregue a página.', {
    status: 400,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
