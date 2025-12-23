export function createTranslationScript(
  lang: string,
  translations: Record<string, { msg: string } | { msgs: Record<string, string> }>
): string {
  return `
    window.DTS_TRANSLATIONS = ${JSON.stringify(translations)};
    window.DTS_LANG = ${JSON.stringify(lang)};

    globalThis.createTranslationGetter = function (_lang) {
      return function (p) {
        const translation = globalThis.DTS_TRANSLATIONS?.[p.code];
        if (translation !== undefined) {
          return translation;
        }

        if (p.msgs !== undefined) {
          return { msgs: p.msgs };
        }
        if (p.msg !== undefined) {
          return { msg: p.msg };
        }

        throw new Error("Missing translation for code: " + p.code);
      };
    };
  `;
}
