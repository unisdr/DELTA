type Message = string | string[];

export type Translation = {
	msg?: Message;
	msgs?: Record<string, Message>;
};

export type TParams = {
	code: string;
	desc?: string;
} & Translation;

export type Translator = (
	params: TParams,
	replacements?: Record<string, any> | undefined | null,
) => string;

export function createMockTranslator(): Translator {
	return function (
		params: TParams,
		replacements?: Record<string, any> | null,
	): string {
		let strOrArr: string | string[];

		if (params.msgs !== undefined) {
			const msgValue = params.msgs.other ?? Object.values(params.msgs)[0];
			if (msgValue === undefined) {
				return `No valid form in msgs for ${params.code}`;
			}
			strOrArr = msgValue;
		} else if (params.msg !== undefined) {
			strOrArr = params.msg;
		} else {
			return `Translation missing for ${params.code}`;
		}

		let str = Array.isArray(strOrArr) ? strOrArr.join("\n") : strOrArr;

		if (replacements) {
			for (const [key, value] of Object.entries(replacements)) {
				str = str.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
			}
		}

		return str;
	};
}

// D prefix for Delta. Using this name instead of Context so that auto-complete could import the right file, since Context is a common name otherwise.
export interface DContext {
	lang: string;
	t: Translator;
	url(path: string): string;
}

export function createTestDContext(): DContext {
	const t = createMockTranslator();

	return {
		lang: "en",
		t: t,
		url: (path: string) => (path.startsWith("/") ? path : `/${path}`),
	};
}
