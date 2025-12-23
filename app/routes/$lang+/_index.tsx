import { redirectDefaultLang } from "~/util/url.backend";

export const loader = async () => {
	return redirectDefaultLang("/hazardous-event")
};


