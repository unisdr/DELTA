import { redirectDocument } from "react-router";
import { makeInstanceSystemSettingsRepository } from "~/modules/system-settings/system-settings-module.server";
import { sessionCookie } from "~/utils/session";

function getSafeRedirectTo(redirectTo: string | null): string {
	if (
		redirectTo &&
		redirectTo.startsWith("/") &&
		!redirectTo.startsWith("//")
	) {
		return redirectTo;
	}
	return "/";
}

export class SelectInstanceUseCase {
	async execute(request: Request) {
		const formData = await request.formData();
		const countryAccountsId = formData.get("countryAccountsId");

		const errors: Record<string, string> = {};
		if (!countryAccountsId || typeof countryAccountsId !== "string") {
			errors.countryInstance = "Select an instance first";
			return { ok: false as const, errors };
		}

		const url = new URL(request.url);
		let redirectTo = url.searchParams.get("redirectTo") || "/";
		if (redirectTo === "/") {
			redirectTo = "/hazardous-event/";
		}
		redirectTo = getSafeRedirectTo(redirectTo);

		const session = await sessionCookie().getSession(
			request.headers.get("Cookie"),
		);
		const instanceSystemSettingsRepository =
			makeInstanceSystemSettingsRepository();

		const countrySettings =
			await instanceSystemSettingsRepository.getByCountryAccountId(
				countryAccountsId,
			);

		session.set("countryAccountsId", countryAccountsId);
		session.set("countrySettings", countrySettings);
		const setCookie = await sessionCookie().commitSession(session);

		return redirectDocument(redirectTo, {
			headers: { "Set-Cookie": setCookie },
		});
	}
}
