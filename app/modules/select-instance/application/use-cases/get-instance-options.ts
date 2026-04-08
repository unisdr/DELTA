import { redirect } from "react-router";
import {
	getCountryAccountsIdFromSession,
	getUserFromSession,
} from "~/utils/session";
import type { SelectInstanceRepositoryPort } from "~/modules/select-instance/domain/repositories/select-instance-repository";

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

export class GetInstanceOptionsUseCase {
	constructor(private readonly repository: SelectInstanceRepositoryPort) {}

	async execute(request: Request) {
		const userSession = await getUserFromSession(request);
		if (!userSession) {
			return redirect("/user/login");
		}

		const url = new URL(request.url);
		let cancelRedirectTo = url.searchParams.get("redirectTo") || "/";
		if (cancelRedirectTo === "/") {
			cancelRedirectTo = "/hazardous-event/";
		}
		cancelRedirectTo = getSafeRedirectTo(cancelRedirectTo);

		const countryAccountIdFromSession =
			await getCountryAccountsIdFromSession(request);

		const data = await this.repository.getActiveInstancesForUser(
			userSession.user.id,
		);

		if (data.length === 0) {
			return redirect("/user/login");
		}

		data.sort((a, b) => {
			const nameA = a.countryAccount.country.name || "";
			const nameB = b.countryAccount.country.name || "";
			return nameA.localeCompare(nameB);
		});

		return {
			data,
			hasSessionCountryAccountId: Boolean(countryAccountIdFromSession),
			cancelRedirectTo,
		};
	}
}
