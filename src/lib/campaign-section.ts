const visualSections = ['artes', 'stickers', 'cores'];

/** Only select sections actually available in this campaign workbench. */
export function campaignSection(value: string | null, editable: boolean, publication: boolean): string {
  if (value === 'cobranca' || value === 'dados') return value;
  if (value === 'publicacao' && publication) return value;
  if (value && editable && visualSections.includes(value)) return value;
  return 'dados';
}

export function campaignSectionUrl(href: string, section: string): string {
  const url = new URL(href);
  url.searchParams.set('aba', section);
  return `${url.pathname}${url.search}${url.hash}`;
}
