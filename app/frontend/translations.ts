export function createTranslationScript(
	lang: string,
	translations: any
): any {
	return `
    window.DTS_TRANSLATIONS = ${JSON.stringify(translations)};
    window.DTS_LANG = ${JSON.stringify(lang)};

    globalThis.createTranslationGetter = function (_lang) {
      return function (p) {
        // Step 1: Try direct key lookup (e.g. DTS_TRANSLATIONS['translations.example_counter'])
        let translation = globalThis.DTS_TRANSLATIONS?.[p.code];
        if (translation !== undefined) {
          return { msgs: translation };
        }

        // Step 2: Try path traversal: split 'a.b.c' and walk down
        const parts = p.code.split('.');
        let current = globalThis.DTS_TRANSLATIONS;
        for (const part of parts) {
          if (current == null || typeof current !== 'object') {
            current = undefined;
            break;
          }
          current = current[part];
        }

        if (current !== undefined) {
          return { msgs: current };
        }

        // Step 3: Fallback to inline msg or msgs
        if (p.msgs !== undefined) {
          return { msgs: p.msgs };
        }
        if (p.msg !== undefined) {
          return { msg: p.msg };
        }

        throw new Error("Missing both translation msg and msgs for code: " + p.code);
      };
    };
  `;
}
