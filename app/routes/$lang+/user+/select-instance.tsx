import { ActionFunctionArgs, redirect, useActionData, useNavigation } from "react-router";
import { useEffect, useRef, useState } from "react";
import { Form, redirectDocument, useLoaderData } from "react-router";
import { LoaderFunctionArgs } from "react-router";

import {
	getCountryAccountsIdFromSession,
	getUserFromSession,
	sessionCookie,
} from "~/utils/session";
import { getSafeRedirectTo } from "./login";
import { UserCountryAccountRepository } from "~/db/queries/userCountryAccountsRepository";
import { getCountryAccountById } from "~/db/queries/countryAccounts";
import { CountryRepository } from "~/db/queries/countriesRepository";
import { MainContainer } from "~/frontend/container";
import { NavSettings } from "../settings/nav";

import { SelectUserCountryAccounts } from "~/drizzle/schema/userCountryAccountsTable";
import {
	countryAccountTypesTable,
	SelectCountryAccounts,
} from "~/drizzle/schema/countryAccounts";
import { SelectCountries } from "~/drizzle/schema/countriesTable";
import { getInstanceSystemSettingsByCountryAccountId } from "~/db/queries/instanceSystemSetting";
import { redirectLangFromRoute, replaceLang } from "~/utils/url.backend";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { ListBox } from "primereact/listbox";
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
	const redirectTo = getSafeRedirectTo(ctx, url.searchParams.get("redirectTo"));
	const countryAccountId = await getCountryAccountsIdFromSession(request);

	if (countryAccountId) {
		return redirect(redirectTo);
	}

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
				const countryAccount = await getCountryAccountById(
					uca.countryAccountsId,
				);
				if (!countryAccount) return null;

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
	};
};

export const action = async (args: ActionFunctionArgs) => {
	const { request } = args;
	const formData = await request.formData();
	const countryAccountsId = formData.get("countryAccountsId");
	const ctx = new BackendContext(args);

	const errors: Record<string, string> = {};
	if (!countryAccountsId || typeof countryAccountsId !== "string") {
		// return new Response("Instance not selected", { status: 400 });
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
		await getInstanceSystemSettingsByCountryAccountId(countryAccountsId);

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
	const { data } = ld;
	const ctx = new ViewContext();
	const [selectedCountryAccounts, setSelectedCountryAccounts] =
		useState<LoaderDataType | null>(null);
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
					<img
						alt="arrow"
						src={
							isRtl
								? "/assets/icons/arrow-left.svg"
								: "/assets/icons/arrow-right.svg"
						}
						style={{ width: "24px" }}
					/>
				</div>
			</div>
		);
	};

	return (
		<MainContainer
			title={ctx.t({
				code: "user_select_instance.select_instance",
				msg: "Select an instance",
			})}
			headerExtra={<NavSettings ctx={ctx} />}
		>
			<>
				<div className="card flex justify-content-center">
					<Toast ref={toast} />
				</div>
				<Form
					method="POST"
					className="flex flex-col gap-6"
				>
					{/* Intro */}
					<div>
						<h2 className="text-2xl font-semibold text-gray-800">
							{ctx.t(
								{
									code: "user_select_instance.instances_found",
									msg: "We found {n} instance(s) associated with your email ID. Please select the instance you want to review.",
								},
								{ n: data.length }
							)}
						</h2>
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
							onChange={(e) => setSelectedCountryAccounts(e.value)}
							options={data}
							className="w-full "
							itemTemplate={countryTemplate}
							listStyle={{ maxHeight: "250px" }}
						/>

						{/* Actions */}
						<div className="flex justify-end">
							<Button type="submit"
								disabled={isSubmitting}
								loading={isSubmitting} >
								{ctx.t({ code: "common.go", msg: "Go" })}
							</Button>
						</div>
					</div>

					{/* Footer Message */}
					<div className="text-base text-gray-600">
						{ctx.t({
							code: "user_select_instance.no_instance_message",
							msg: "Don't see the right instance? Contact your team admin to get access.",
						})}
					</div>
				</Form>
			</>
		</MainContainer>
	);
}
