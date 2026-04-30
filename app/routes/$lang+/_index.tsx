import { redirectDefaultLang } from "~/utils/url.backend";

export const loader = async () => {
	return redirectDefaultLang("/hazardous-event");
};
