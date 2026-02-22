import { Form, Field, SubmitButton, FieldErrors } from "~/frontend/form";
import { InsertDivision } from "~/drizzle/schema/divisionTable";

import { DivisionBreadcrumbRow } from "~/backend.server/models/division";
import { ViewContext } from "./context";

import { LangLink } from "~/utils/link";

interface DivisionFormProps {
	ctx: ViewContext;
	edit: boolean;
	fields: InsertDivision;
	errors: any;
	breadcrumbs: DivisionBreadcrumbRow[] | null;
}

export function DivisionForm({
	ctx,
	edit,
	fields,
	errors,
	breadcrumbs,
}: DivisionFormProps) {
	return (
		<>
			<h2>
				{edit
					? ctx.t({
							code: "geographies.edit_division",
							msg: "Edit division",
						})
					: ctx.t({
							code: "geographies.create_division",
							msg: "Create division",
						})}
			</h2>
			<Breadcrumb ctx={ctx} rows={breadcrumbs} linkLast={true} />
			<Form ctx={ctx} errors={errors} className="dts-form">
				<Field
					label={ctx.t({
						code: "common.parent_id",
						msg: "Parent ID",
					})}
					extraClassName="dts-form-component"
				>
					<input
						type="text"
						name="parentId"
						defaultValue={fields.parentId ? String(fields.parentId) : ""}
					/>
					<FieldErrors errors={errors} field="parentId" />
				</Field>

				{fields.name &&
					Object.keys(fields.name).map((lang) => (
						<Field
							key={lang}
							label={ctx.t(
								{
									code: "geographies.name_with_lang",
									desc: "Label for name field with language in parentheses. {lang} is replaced with the language code.",
									msg: "Name ({lang})",
								},
								{ lang },
							)}
							extraClassName="dts-form-component"
						>
							<input
								type="text"
								name={`names[${lang}]`}
								defaultValue={fields.name?.[lang] || ""}
							/>
							<FieldErrors errors={errors} field={`names.${lang}`} />
						</Field>
					))}

				<div className="dts-form__actions">
					<SubmitButton
						className="mg-button mg-button-primary"
						label={
							edit
								? ctx.t({
										code: "geographies.update_division",
										msg: "Update division",
									})
								: ctx.t({
										code: "geographies.create_division",
										msg: "Create division",
									})
						}
					/>
				</div>
			</Form>
			<LangLink
				lang={ctx.lang}
				to={`/settings/geography${fields.parentId ? "?parent=" + fields.parentId : ""}`}
			>
				{ctx.t({
					code: "common.back_to_list",
					msg: "Back to list",
				})}
			</LangLink>
		</>
	);
}

type BreadcrumbProps = {
	ctx: ViewContext;
	rows: DivisionBreadcrumbRow[] | null;
	linkLast?: boolean;
};

export function Breadcrumb({ ctx, rows, linkLast }: BreadcrumbProps) {
	if (!rows) {
		return null;
	}
	return (
		<nav aria-label="breadcrumb">
			<ol>
				<li key="root">
					<LangLink lang={ctx.lang} to={`/settings/geography`}>
						Root
					</LangLink>
				</li>
				{rows.map((row, index) => (
					<li key={row.id}>
						{index < rows.length - 1 || linkLast ? (
							<LangLink
								lang={ctx.lang}
								to={`/settings/geography?parent=${row.id}`}
							>
								{row.name}
							</LangLink>
						) : (
							<span>{row.name}</span>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
