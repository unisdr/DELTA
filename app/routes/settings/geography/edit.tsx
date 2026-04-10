import { authActionWithPerm, authLoaderWithPerm } from "~/utils/auth";

import { fromForm } from "~/backend.server/models/division";

import { InsertDivision } from "~/drizzle/schema/divisionTable";

import {
	DivisionBreadcrumbRow,
} from "~/backend.server/models/division";

import { useLoaderData, useActionData } from "react-router";

import { formStringData } from "~/utils/httputil";
import { NavSettings } from "~/frontend/components/nav-settings";

import { MainContainer } from "~/frontend/container";
import { getCountryAccountsIdFromSession, getUserRoleFromSession } from "~/utils/session";
import {
	makeGeographicLevelRepository,
	makeGetGeographicLevelByIdUseCase,
	makeUpdateGeographicLevelUseCase,
} from "~/modules/geographic-levels/geographic-levels-module.server";
import GeographicLevelForm from "~/modules/geographic-levels/presentation/geographic-level-form";




export const loader = authLoaderWithPerm(
	"ManageCountrySettings",
	async (loaderArgs) => {
		const { id } = loaderArgs.params;
		const { request } = loaderArgs;
		if (!id) {
			throw new Response("Missing item ID", { status: 400 });
		}

		// Get query parameter "view"
		const url = new URL(loaderArgs.request.url);
		const viewParam = url.searchParams.get("view");

		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		if (!countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}

		const item = await makeGetGeographicLevelByIdUseCase().execute({
			id,
			countryAccountsId,
		});

		if (!item) {
			throw new Response("Item not found", { status: 404 });
		}

		let breadcrumbs: DivisionBreadcrumbRow[] | null = null;
		if (item.parentId) {
			breadcrumbs = await makeGeographicLevelRepository().getBreadcrumb(
				item.parentId,
				countryAccountsId,
			);
		}

		const userRole = await getUserRoleFromSession(request);

		return {
			data: item,
			breadcrumbs: breadcrumbs,
			view: viewParam,
			userRole,
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
		if (!countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}

		const formData = formStringData(await request.formData());
		let data = fromForm(formData);

		const res = await makeUpdateGeographicLevelUseCase().execute({
			id,
			data,
			countryAccountsId,
		});

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


	let fields: InsertDivision;
	fields = loaderData.data;
	let errors: string[] = [];
	let changed = false;
	const actionData = useActionData<typeof action>();
	if (actionData) {
		fields = actionData.data;
		if (!actionData.ok) {
			errors = actionData.errors || [];
		} else {
			changed = true;
		}
	}

	const navSettings = <NavSettings userRole={loaderData.userRole ?? undefined} />;

	return (
		<MainContainer
			title={"Geographic levels"}
			headerExtra={navSettings}
		>
			<>
				{changed ? <p className="mb-4 text-sm text-emerald-700">{"The data was updated."}</p> : null}
				<GeographicLevelForm
					edit={true}
					fields={fields}
					errors={errors}
					breadcrumbs={loaderData.breadcrumbs}
				/>
			</>
		</MainContainer>
	);
}

