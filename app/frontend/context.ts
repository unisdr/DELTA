import { useRouteLoaderData } from "react-router";
import { UserForFrontend } from "~/utils/auth";
import { createMockTranslator, DContext, Translator } from "~/utils/dcontext";
import { CommonData } from "~/backend.server/handlers/commondata";

export class ViewContext implements DContext {
	t: Translator;
	lang: string = "en"; // Translation removed - always use English
	user: UserForFrontend | null;

	constructor() {
		const rootData = useRouteLoaderData("root") as CommonData;
		const commonData = rootData.common;
		if (!rootData.common.lang)
			throw new Error("lang not passed to ViewContext");
		this.lang = "en"; // Translation removed - always English
		this.user = commonData.user;

		this.t = createMockTranslator();
	}

	url(path: string): string {
		// Translation removed - no language prefix needed
		return path.startsWith("/") ? path : `/${path}`;
	}
}
