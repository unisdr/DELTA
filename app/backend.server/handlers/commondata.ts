import { UserForFrontend } from "~/utils/auth";

export interface CommonData {
	common: CommonDataUnwrapped;
}

interface CommonDataUnwrapped {
	lang: string;
	user: UserForFrontend | null;
}
