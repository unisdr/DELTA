import { authLoader } from "~/utils/auth";

export const loader = authLoader(async () => {
	return null;
});
