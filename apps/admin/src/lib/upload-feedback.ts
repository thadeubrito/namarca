// Only messages emitted by our upload endpoint may be shown to the administrator.
// Never echo arbitrary proxy/gateway responses, filenames or exception details.
const messages = new Set([
  'Nome de arquivo inválido',
  'Tipo de material inválido',
  'Envie PNG como corpo da requisição',
  'PNG inválido',
  'Dimensões inválidas',
  'Imagem excede 40 milhões de pixels',
  'PNG excede o limite de 25 MiB',
  'PNG deve conter pixels transparentes e opacos',
  'Campanha não encontrada',
  'Somente campanhas em rascunho e não publicadas podem ser editadas',
]);

export async function uploadFailureMessage(response: Response): Promise<string> {
  if (response.status === 403) return 'Sua sessão não permite este envio. Entre novamente no administrativo e tente de novo.';
  if (response.status === 413) return 'O arquivo excede o limite de envio (25 MiB ou 40 milhões de pixels). Reduza o PNG e tente novamente.';
  if ([404, 409, 422].includes(response.status)) {
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' && messages.has(body.error)) {
        if (body.error === 'PNG deve conter pixels transparentes e opacos') {
          return 'O PNG precisa ter ao menos um pixel totalmente transparente e um totalmente opaco. Confira a transparência ao exportar o material.';
        }
        if (body.error === 'PNG inválido') return 'O arquivo não é um PNG válido ou está corrompido. Exporte novamente como PNG e tente de novo.';
        return `${body.error}.`;
      }
    } catch { /* Proxy HTML and malformed JSON use a safe fallback. */ }
  }
  return 'Não foi possível enviar o PNG. Tente novamente. Se persistir, confira o formato, a transparência e o tamanho do arquivo.';
}
