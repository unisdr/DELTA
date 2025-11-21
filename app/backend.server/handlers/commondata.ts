import { getLanguage, LangRouteParam } from "~/util/lang.backend";

import {
	authLoaderGetOptionalUserForFrontend,
	UserForFrontend
} from "~/util/auth";

export interface CommonData {
	common: CommonDataUnwrapped
}

export interface CommonDataUnwrapped {
	lang: string
	user: UserForFrontend | null
}

export type CommonDataLoaderArgs = {
	request: Request;
} & LangRouteParam;

export async function getCommonData(args: CommonDataLoaderArgs): Promise<CommonDataUnwrapped> {
	let lang = getLanguage(args);
	let user = await authLoaderGetOptionalUserForFrontend(args);
	return {
		lang,
		user
	}
}
