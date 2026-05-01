import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";

import { InsertDivision } from "~/drizzle/schema/divisionTable";

import {
	DivisionBreadcrumbRow,
} from "~/backend.server/models/division";
import { DivisionRepository } from "~/db/queries/divisonRepository";

import { useLoaderData, useActionData, useNavigation, Form as RRForm } from "react-router";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { InputText } from "primereact/inputtext";
import { Divider } from "primereact/divider";
import { BreadCrumb as PrimeBreadCrumb } from "primereact/breadcrumb";
import { MenuItem } from "primereact/menuitem";
import { formStringData } from "~/utils/httputil";
import { NavSettings } from "~/frontend/components/NavSettings";

import { MainContainer } from "~/frontend/container";
import { getCountryAccountsIdFromSession } from "~/utils/session";

import { ViewContext } from "~/frontend/context";
import { LangLink } from "~/utils/link";

type DivisionBreadcrumbSourceRow = {
	id: string;
	parentId: string | null;
	name: Record<string, string> | null;
};

function buildDivisionBreadcrumbRows(
	rows: DivisionBreadcrumbSourceRow[],
	divisionId: string,
): DivisionBreadcrumbRow[] {
	const byId = new Map(rows.map((row) => [row.id, row]));
	const breadcrumbs: DivisionBreadcrumbRow[] = [];
	let currentId: string | null = divisionId;

	while (currentId) {
		const row = byId.get(currentId);
		if (!row) {
			break;
		}

		const nameMap = (row.name || {}) as Record<string, string>;
		const nameLang = nameMap.en ? "en" : (Object.keys(nameMap)[0] || "");

		breadcrumbs.unshift({
			id: row.id,
			parentId: row.parentId,
			nameLang,
			name: nameLang ? nameMap[nameLang] || "" : "",
		});

		currentId = row.parentId;
	}

	return breadcrumbs;
}

type BreadcrumbProps = {
	ctx: ViewContext;
	rows: DivisionBreadcrumbRow[] | null;
	linkLast?: boolean;
};

function Breadcrumb({ ctx, rows, linkLast }: BreadcrumbProps) {
	if (!rows) {
		return null;
	}

	const home: MenuItem = {
		label: ctx.t({ code: "geographies.geographic_levels", msg: "Geographic levels" }),
		template: (item, options) => (
			<LangLink
				lang={ctx.lang}
				to="/settings/geography"
				className={options.className}
			>
				{item.label}
			</LangLink>
		),
	};

	const model: MenuItem[] = rows.map((row, index) => {
		const isLink = index < rows.length - 1 || linkLast;
		return {
			label: row.name,
			template: (item, options) => {
				if (!isLink) {
					return <span className={options.className}>{item.label}</span>;
				}
				return (
					<LangLink
						lang={ctx.lang}
						to={`/settings/geography?parent=${row.id}`}
						className={options.className}
					>
						{item.label}
					</LangLink>
				);
			},
		};
	});

	return (
		<PrimeBreadCrumb
			className="mb-4"
			home={home}
			model={model}
		/>
	);
}

export const loader = authLoaderWithPerm(
	"ManageCountrySettings",
	async (loaderArgs) => {
		const { id } = loaderArgs.params;
		const { request } = loaderArgs;
		if (!id) {
			throw new Response("Missing item ID", { status: 400 });
		}

		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const item = await DivisionRepository.getById(id, countryAccountsId);

		if (!item) {
			throw new Response("Item not found", { status: 404 });
		}

		let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
		if (item.parentId) {
			const allRows = (await DivisionRepository.getByCountryAccountsId(
				countryAccountsId,
			)) as DivisionBreadcrumbSourceRow[];
			breadcrumbs = buildDivisionBreadcrumbRows(allRows, item.parentId);
		}

		return {
			data: item,
			breadcrumbs: breadcrumbs,
		};
	},
);

export const action = authActionWithPerm(
	"ManageCountrySettings",
	async (actionArgs) => {
		const { request, params } = actionArgs;

		const id = params.id;
		if (!id) {
			throw new Response("Missing ID", { status: 400 });
		}

		const countryAccountsId = await getCountryAccountsIdFromSession(request);

		const rawForm = formStringData(await request.formData());
		const { parentId, ...nameFields } = rawForm;
		const names = Object.entries(nameFields)
			.filter(([key]) => key.startsWith("names[") && key.endsWith("]"))
			.reduce(
				(acc, [key, value]) => {
					acc[key.slice(6, -1)] = value;
					return acc;
				},
				{} as Record<string, string>,
			);

		let data: InsertDivision = {
			parentId: parentId || null,
			name: names,
			countryAccountsId,
		};

		if (data.parentId) {
			const parentRecord = await DivisionRepository.getById(data.parentId, countryAccountsId);
			data.level = parentRecord?.level ? parentRecord.level + 1 : 1;
		} else {
			data.level = 1;
		}

		const res = await DivisionRepository.update(id, data, countryAccountsId);

		if (!res.ok) {
			return {
				ok: false,
				data: data,
				errors: res.errors,
			};
		}

		return {
			ok: true,
			data: data,
		};
	},
);

export default function Screen() {
	const loaderData = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const ctx = new ViewContext();

	const isSubmitting = navigation.state === "submitting";
	const saved = actionData?.ok === true;
	const hasError = actionData?.ok === false;

	const fields: InsertDivision = actionData?.data ?? loaderData.data;
	const nameMap = (fields.name ?? {}) as Record<string, string>;
	const langs = Object.keys(nameMap).sort();

	const navSettings = <NavSettings ctx={ctx} userRole={ctx.user?.role} />;

	return (
		<MainContainer
			title={ctx.t({
				code: "geographies.geographic_levels",
				msg: "Geographic levels",
			})}
			headerExtra={navSettings}
		>
			<div className="mx-auto w-full max-w-2xl">
				<Breadcrumb ctx={ctx} rows={loaderData.breadcrumbs} linkLast={true} />

				<Card className="shadow-sm">
					{/* Header */}
					<div className="mb-1 flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
							<i className="pi pi-map-marker text-lg text-primary" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-gray-800">
								{ctx.t({
									code: "geographies.edit_division",
									msg: "Edit division",
								})}
							</h2>
							<p className="text-sm text-gray-500">
								{ctx.t({
									code: "geographies.edit_division_subtitle",
									msg: "Update the details for this administrative division.",
								})}
							</p>
						</div>
					</div>

					<Divider className="my-4" />

					{/* Status messages */}
					{saved && (
						<Message
							className="mb-4 w-full"
							severity="success"
							text={ctx.t({
								code: "common.data_updated",
								msg: "The data was updated.",
							})}
						/>
					)}
					{hasError && (
						<Message
							className="mb-4 w-full"
							severity="error"
							text={ctx.t({
								code: "common.save_error",
								msg: "There was an error saving the data. Please try again.",
							})}
						/>
					)}

					{/* Form */}
					<RRForm method="post" className="flex flex-col gap-5">
						{/* Parent ID */}
						<div className="flex flex-col gap-1">
							<label
								htmlFor="field-parentId"
								className="text-sm font-medium text-gray-700"
							>
								{ctx.t({ code: "common.parent_id", msg: "Parent ID" })}
							</label>
							<InputText
								id="field-parentId"
								name="parentId"
								defaultValue={fields.parentId ? String(fields.parentId) : ""}
								className="w-full"
								placeholder={ctx.t({
									code: "geographies.parent_id_placeholder",
									msg: "Leave empty for top-level division",
								})}
							/>
						</div>

						{/* Name fields per language */}
						{langs.length > 0 && (
							<div className="flex flex-col gap-4">
								<p className="text-sm font-medium text-gray-700">
									{ctx.t({
										code: "geographies.names_by_language",
										msg: "Names by language",
									})}
								</p>
								{langs.map((lang) => (
									<div key={lang} className="flex flex-col gap-1">
										<label
											htmlFor={`field-name-${lang}`}
											className="flex items-center gap-2 text-sm font-medium text-gray-700"
										>
											<span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase text-gray-600">
												{lang}
											</span>
											{ctx.t(
												{
													code: "geographies.name_with_lang",
													desc: "Label for name field with language in parentheses. {lang} is replaced with the language code.",
													msg: "Name ({lang})",
												},
												{ lang },
											)}
										</label>
										<InputText
											id={`field-name-${lang}`}
											name={`names[${lang}]`}
											defaultValue={nameMap[lang] || ""}
											className="w-full"
										/>
									</div>
								))}
							</div>
						)}

						<Divider className="my-1" />

						{/* Actions */}
						<div className="flex items-center justify-between gap-3">
							<LangLink
								lang={ctx.lang}
								to={`/settings/geography${fields.parentId ? "?parent=" + fields.parentId + "&view=table" : "?view=table"}`}
							>
								<Button
									type="button"
									outlined
									icon="pi pi-arrow-left"
									label={ctx.t({
										code: "common.back_to_list",
										msg: "Back to list",
									})}
								/>
							</LangLink>
							<Button
								type="submit"
								icon="pi pi-check"
								label={ctx.t({
									code: "geographies.update_division",
									msg: "Update division",
								})}
								loading={isSubmitting}
								disabled={isSubmitting}
							/>
						</div>
					</RRForm>
				</Card>
			</div>
		</MainContainer>
	);
}
