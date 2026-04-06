import {
	ActionFunctionArgs,
	LoaderFunctionArgs,
	redirectDocument,
} from "react-router";
import { BackendContext } from "~/backend.server/context";
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import { CountryRepository } from "~/db/queries/countriesRepository";
import { InstanceSystemSettingRepository } from "~/db/queries/instanceSystemSettingRepository";
import { UserCountryAccountRepository } from "~/db/queries/userCountryAccountsRepository";
import {
	countryAccountStatuses,
	SelectCountryAccounts,
} from "~/drizzle/schema/countryAccountsTable";
import { SelectCountries } from "~/drizzle/schema/countriesTable";
import { SelectUserCountryAccounts } from "~/drizzle/schema/userCountryAccountsTable";
import {
	getCountryAccountsIdFromSession,
	getUserFromSession,
	sessionCookie,
} from "~/utils/session";
import { redirectLangFromRoute, replaceLang } from "~/utils/url.backend";

export type LoaderDataType = SelectUserCountryAccounts & {
	countryAccount: Partial<SelectCountryAccounts> & {
		country: Partial<SelectCountries>;
	};
};

function getSafeRedirectTo(
	ctx: BackendContext,
	redirectTo: string | null,
): string {
	if (
		redirectTo &&
		redirectTo.startsWith("/") &&
		!redirectTo.startsWith("//")
	) {
		return redirectTo;
	}
	return ctx.url("/");
}

export const SelectInstanceService = {
	async loader(args: LoaderFunctionArgs) {
		const { request } = args;
		const ctx = new BackendContext(args);

		const userSession = await getUserFromSession(request);
		if (!userSession) {
			return redirectLangFromRoute(args, "/user/login");
		}

		const url = new URL(request.url);
		let cancelRedirectTo = url.searchParams.get("redirectTo") || "/";
		if (cancelRedirectTo === "/") {
			cancelRedirectTo = ctx.url("/hazardous-event/");
		}

		cancelRedirectTo = getSafeRedirectTo(ctx, cancelRedirectTo);

		const countryAccountIdFromSession =
			await getCountryAccountsIdFromSession(request);

		const userCountryAccounts = await UserCountryAccountRepository.getByUserId(
			userSession.user.id,
		);

		if (!userCountryAccounts || userCountryAccounts.length === 0) {
			return redirectLangFromRoute(args, "/user/login");
		}

		const data: LoaderDataType[] = (
			await Promise.all(
				userCountryAccounts.map(async (uca) => {
					if (!uca.countryAccountsId) return;
					const countryAccount = await CountryAccountsRepository.getById(
						uca.countryAccountsId,
					);
					if (
						!countryAccount ||
						countryAccount.status !== countryAccountStatuses.ACTIVE
					) {
						return null;
					}

					const country = await CountryRepository.getById(
						countryAccount.countryId,
					);
					if (!country) return null;

					return {
						...uca,
						countryAccount: {
							...countryAccount,
							country,
						},
					};
				}),
			)
		).filter(Boolean) as LoaderDataType[];

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
	},

	async action(args: ActionFunctionArgs) {
		const { request } = args;
		const formData = await request.formData();
		const countryAccountsId = formData.get("countryAccountsId");
		const ctx = new BackendContext(args);

		const errors: Record<string, string> = {};
		if (!countryAccountsId || typeof countryAccountsId !== "string") {
			errors.countryInstance = "Select an instance first";
			return {
				ok: false,
				errors,
			};
		}

		const url = new URL(request.url);
		let redirectTo = url.searchParams.get("redirectTo") || "/";
		if (redirectTo === "/") {
			redirectTo = ctx.url("/hazardous-event/");
		}

		redirectTo = getSafeRedirectTo(ctx, redirectTo);

		const session = await sessionCookie().getSession(
			request.headers.get("Cookie"),
		);

		const countrySettings =
			await InstanceSystemSettingRepository.getByCountryAccountId(
				countryAccountsId,
			);

		session.set("countryAccountsId", countryAccountsId);
		session.set("countrySettings", countrySettings);
		const setCookie = await sessionCookie().commitSession(session);

		redirectTo = replaceLang(redirectTo, countrySettings?.language || "en");

		return redirectDocument(redirectTo, {
			headers: { "Set-Cookie": setCookie },
		});
	},
};
