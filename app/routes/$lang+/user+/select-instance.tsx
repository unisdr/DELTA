import { ActionFunctionArgs, useActionData, useNavigate, useNavigation, useSubmit } from "react-router";
import { useEffect, useRef, useState } from "react";
import { redirectDocument, useLoaderData } from "react-router";
import { LoaderFunctionArgs } from "react-router";

import {
	getCountryAccountsIdFromSession,
	getUserFromSession,
	sessionCookie,
} from "~/utils/session";
import { getSafeRedirectTo } from "./login";
import { UserCountryAccountRepository } from "~/db/queries/userCountryAccountsRepository";
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import { CountryRepository } from "~/db/queries/countriesRepository";
import { SelectUserCountryAccounts } from "~/drizzle/schema/userCountryAccountsTable";
import {
	countryAccountStatuses,
	countryAccountTypesTable,
	SelectCountryAccounts,
} from "~/drizzle/schema/countryAccountsTable";
import { SelectCountries } from "~/drizzle/schema/countriesTable";
import { InstanceSystemSettingRepository } from "~/db/queries/instanceSystemSettingRepository";
import { redirectLangFromRoute, replaceLang } from "~/utils/url.backend";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { Toast } from "primereact/toast";
import { ListBox } from "primereact/listbox";
import { Dialog } from "primereact/dialog";
import Tag from "~/components/Tag";

type LoaderDataType = SelectUserCountryAccounts & {
	countryAccount: Partial<SelectCountryAccounts> & {
		country: Partial<SelectCountries>;
	};
};

export const loader = async (args: LoaderFunctionArgs) => {
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

	const countryAccountIdFromSession = await getCountryAccountsIdFromSession(request);

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

				const country = await CountryRepository.getById(countryAccount.countryId);
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

	// Sort by country name
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
};

export const action = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const formData = await request.formData();
	const countryAccountsId = formData.get("countryAccountsId");
	const ctx = new BackendContext(args);

	const errors: Record<string, string> = {};
	if (!countryAccountsId || typeof countryAccountsId !== "string") {
		errors.countryInstance = "Select an instance first";
		return {
			ok: false,
			errors
		}
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
		await InstanceSystemSettingRepository.getByCountryAccountId(countryAccountsId);

	session.set("countryAccountsId", countryAccountsId);
	session.set("countrySettings", countrySettings);
	const setCookie = await sessionCookie().commitSession(session);

	redirectTo = replaceLang(redirectTo, countrySettings?.language || "en");

	return redirectDocument(redirectTo, {
		headers: { "Set-Cookie": setCookie },
	});
};

export default function SelectInstance() {
	const ld = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigate = useNavigate();
	const submit = useSubmit();
	const { data, hasSessionCountryAccountId, cancelRedirectTo } = ld;
	const ctx = new ViewContext();
	const [selectedCountryAccounts, setSelectedCountryAccounts] =
		useState<LoaderDataType | null>(null);
	const [dialogVisible] = useState(true);
	const toast = useRef<Toast>(null);
	const [isRtl, setIsRtl] = useState(false);
	const navigation = useNavigation();
	const isSubmitting =
		navigation.state === "submitting"

	useEffect(() => {
		setIsRtl(document.dir === "rtl");
	}, []);
	useEffect(() => {
		if (actionData?.ok === false && actionData.errors?.countryInstance) {
			toast.current?.show({
				severity: "error",
				summary: ctx.t({ code: "common.error", msg: "Error" }),
				detail: ctx.t({
					code: "user_select_instance.select_instance_first",
					msg: "Select an instance first.",
				}),
				life: 4000,
			});
		}
	}, [actionData]);

	const countryTemplate = (option: LoaderDataType) => {
		const instanceType = option.countryAccount.type;
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					width: "100%",
				}}
			>
				<div style={{ display: "flex", alignItems: "center" }}>
					<img
						alt={option.countryAccount.country.name}
						src={option.countryAccount.country.flagUrl}
						style={{ width: "18px", marginInlineEnd: "12px" }}
					/>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							lineHeight: 1.2,
						}}
					>
						<span style={{ fontWeight: "500" }}>
							{option.countryAccount.country.name}
						</span>
						<small>{option.countryAccount.shortDescription}</small>
					</div>
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
					}}
				>
					<Tag severity="info" value={option.role} />
					<Tag
						value={instanceType}
						severity={
							instanceType === countryAccountTypesTable.OFFICIAL
								? "info"
								: "warning"
						}
					/>
					<i
						className={`pi ${isRtl ? "pi-arrow-left" : "pi-arrow-right"}`}
						style={{ fontSize: "1rem" }}
					/>
				</div>
			</div>
		);
	};

	const handleCloseDialog = () => {
		if (hasSessionCountryAccountId) {
			navigate(cancelRedirectTo);
			return;
		}

		toast.current?.show({
			severity: "error",
			summary: ctx.t({ code: "common.error", msg: "Error" }),
			detail: ctx.t({
				code: "user_select_instance.select_instance_first",
				msg: "You must select a country instance and submit the form.",
			}),
			life: 4000,
		});
	};

	const handleInstanceSelect = (option: LoaderDataType | null) => {
		setSelectedCountryAccounts(option);

		if (!option?.countryAccountsId) {
			toast.current?.show({
				severity: "error",
				summary: ctx.t({ code: "common.error", msg: "Error" }),
				detail: ctx.t({
					code: "user_select_instance.select_instance_first",
					msg: "Select an instance first.",
				}),
				life: 4000,
			});
			return;
		}

		submit(
			{ countryAccountsId: option.countryAccountsId },
			{ method: "post" },
		);
	};

	return (
		<>
			<Toast ref={toast} />
			<Dialog
				visible={dialogVisible}
				onHide={handleCloseDialog}
				header={ctx.t({
					code: "user_select_instance.select_instance",
					msg: "Select an instance",
				})}
				modal
				style={{ width: "100%", maxWidth: "600px" }}
				className="rounded-lg"
			>
				<div className="flex flex-col gap-6">
					{/* Intro */}
					<div>
						<h3 className="text-lg font-semibold text-gray-800">
							{ctx.t(
								{
									code: "user_select_instance.instances_found",
									msg: "We found {n} instance(s) associated with your email ID. Please select the instance you want to review.",
								},
								{ n: data.length }
							)}
						</h3>
					</div>

					{/* Body */}
					<div className="flex flex-col gap-4">
						<input
							type="hidden"
							name="countryAccountsId"
							value={selectedCountryAccounts?.countryAccountsId ?? ""}
						/>

						<ListBox
							value={selectedCountryAccounts}
							onChange={(e) => handleInstanceSelect(e.value)}
							options={data}
							className="w-full"
							itemTemplate={countryTemplate}
							listStyle={{ maxHeight: "250px" }}
							disabled={isSubmitting}
						/>
					</div>

					{/* Footer Message */}
					<div className="text-sm text-gray-600 text-center pt-2">
						<div>{ctx.t({ code: "user_select_instance.no_instance_question", msg: "Don't see the right instance?" })}</div>
						<div>{ctx.t({ code: "user_select_instance.no_instance_contact", msg: "Contact your team admin to get access." })}</div>
					</div>
				</div>
			</Dialog>
		</>
	);
}
