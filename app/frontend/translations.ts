export type TParams = { code: string; msg: string; desc?: string };

export type Translator = (p: TParams) => string;

export function createTranslationScript(lang: string, translations: Record<string, string>): string{
	return `
    // eslint-disable-next-line
    window.DTS_TRANSLATIONS = ${JSON.stringify(translations)};
    window.DTS_LANG = ${JSON.stringify(lang)};
		globalThis.createTranslator = function (_lang) {
  return function (p) {
    if (typeof globalThis.DTS_TRANSLATIONS === 'object') {
      return globalThis.DTS_TRANSLATIONS[p.code] ?? p.msg;
    }
    return p.msg;
  };
};
  `;

}
