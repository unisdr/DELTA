export function urlLang(lang: string, path: string): string{
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `/${lang}${normalizedPath}`;
}
