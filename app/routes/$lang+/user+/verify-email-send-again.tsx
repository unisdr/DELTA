import {
	authLoaderAllowUnverifiedEmail,
	authLoaderGetAuth,
} from "~/util/auth";

import {
	sendEmailVerification
} from "~/backend.server/models/user/verify_email";
import { redirectLangFromRoute } from "~/util/url.backend";
import { BackendContext } from "~/backend.server/context";

export const loader = authLoaderAllowUnverifiedEmail(async (loaderArgs) => {
	const ctx = new BackendContext(loaderArgs);
	const { user } = authLoaderGetAuth(loaderArgs)
	await sendEmailVerification(ctx, user)
	return redirectLangFromRoute(loaderArgs, "/user/verify-email");
});
