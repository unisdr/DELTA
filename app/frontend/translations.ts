export function createTranslationScript(lang: string, translations: Record<string, string>): string {
	return `
    // eslint-disable-next-line
    window.DTS_TRANSLATIONS = ${JSON.stringify(translations)};
    window.DTS_LANG = ${JSON.stringify(lang)};
		globalThis.createTranslationGetter = function (_lang) {
  return function (p) {
    if (typeof globalThis.DTS_TRANSLATIONS === 'object') {
      return globalThis.DTS_TRANSLATIONS[p.code] ?? p.msg;
    }
    return p.msg;
  };
};
  `;

}
