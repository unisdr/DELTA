export function createTranslationScript(
	lang: string,
	translations: Record<string, { msg?: string; msgs?: Record<string, string> }>
): string {
	return `
    window.DTS_TRANSLATIONS = ${JSON.stringify(translations)};
    window.DTS_LANG = ${JSON.stringify(lang)};

    globalThis.createTranslationGetter = function (_lang) {
      return function (p) {
        const translation = globalThis.DTS_TRANSLATIONS?.[p.code];
        if (translation) {
          return translation;
        }

        // Fallback: use the default msg or msgs from params
        if (p.msg !== undefined) {
          return { msg: p.msg };
        } else if (p.msgs !== undefined) {
          return { msgs: p.msgs };
        } else {
          throw new Error("Missing both translation msg and msgs for code: " + p.code);
        }
      };
    };
  `;
}
