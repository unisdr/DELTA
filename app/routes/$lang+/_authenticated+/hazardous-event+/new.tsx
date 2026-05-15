import { redirect, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { BackendContext } from "~/backend.server/context";

import { formSave } from "~/backend.server/handlers/form/form";
import {
	hazardousEventById,
	hazardousEventCreate,
} from "~/backend.server/models/event";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";
import { handleApprovalWorkflowService } from "~/backend.server/services/approvalWorkflowService";
import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server";
import {
	getUserCountryAccountsWithValidatorRole,
	getUserCountryAccountsWithAdminRole,
} from "~/db/queries/userCountryAccountsRepository";
import { divisionTable } from "~/drizzle/schema/divisionTable";
import { ViewContext } from "~/frontend/context";
import {
	fieldsDef,
	HazardousEventForm,
} from "~/frontend/events/hazardeventform";
import { formScreen } from "~/frontend/form";
import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderGetUserForFrontend,
	hasPermission,
	requireUser,
} from "~/utils/auth";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
	getUserIdFromSession,
	type UserSession,
} from "~/utils/session";

export async function loader(loaderArgs: LoaderFunctionArgs) {
	const { request, params } = loaderArgs;
	const lang = params.lang ?? "en";

	// React Router v7 runs all matched route loaders in parallel (Promise.all), so the
	// _authenticated parent layout's requireUser executes concurrently with this loader —
	// not before it. requireUser here ensures unauthenticated requests get a login redirect
	// rather than reaching the permission check and returning 403.
	// userSession is passed to authLoaderGetUserForFrontend because that helper reads
	// args.userSession (injected by the old authLoaderWithPerm wrapper).
	const userSession = await requireUser({ request, params });
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) throw redirect(`/${lang}/user/select-instance`);
	const permitted = await hasPermission(request, "EditData");
	if (!permitted) throw new Response("Forbidden", { status: 403 });

	const ctx = new BackendContext(loaderArgs);
	const argsWithSession = { ...loaderArgs, userSession };
	const user = await authLoaderGetUserForFrontend(argsWithSession);
	const userId = await getUserIdFromSession(request);

	const hip = await dataForHazardPicker(ctx);
	const u = new URL(request.url);

	const parentId = u.searchParams.get("parent") || "";

	// Get users with validator role
	const usersWithValidatorRole =
		await getUserCountryAccountsWithValidatorRole(countryAccountsId);
	let filteredUsersWithValidatorRole: typeof usersWithValidatorRole = [];

	if (usersWithValidatorRole.length > 0) {
		// filter the usersWithValidatorRole to exclude the current user
		filteredUsersWithValidatorRole = usersWithValidatorRole.filter(
			(userAccount) => userAccount.id !== userId,
		);
	}

	// if usersWithValidatorRole is empty, fall back to usersWithAdminRole excluding current user
	if (filteredUsersWithValidatorRole.length === 0) {
		const usersWithAdminRole =
			await getUserCountryAccountsWithAdminRole(countryAccountsId);
		filteredUsersWithValidatorRole = usersWithAdminRole.filter(
			(userAccount) => userAccount.id !== userId,
		);
	}

	if (parentId) {
		const parent = await hazardousEventById(ctx, parentId);
		if (!parent) {
			throw new Response("Parent not found", { status: 404 });
		}
		// Verify parent belongs to the same tenant
		if (parent.countryAccountsId !== countryAccountsId) {
			throw new Response("Unauthorized Access denied", { status: 403 });
		}

		return {
			hip,
			parentId,
			parent,
			treeData: [],
			ctryIso3: [],
			user,
			countryAccountsId,
			filteredUsersWithValidatorRole,
		};
	}

	// Load divisions filtered by tenant context
	const rawData = await dr
		.select({
			id: divisionTable.id,
			parentId: divisionTable.parentId,
			name: divisionTable.name,
			importId: divisionTable.importId,
			nationalId: divisionTable.nationalId,
			level: divisionTable.level,
		})
		.from(divisionTable)
		.where(sql`country_accounts_id = ${countryAccountsId}`);

	const treeData = buildTree(rawData, "id", "parentId", "name", "en", [
		"importId",
		"nationalId",
		"level",
		"name",
	]);

	// Use tenant's ISO3
	const settings = await getCountrySettingsFromSession(request);
	const ctryIso3 = settings.crtyIso3;

	// Load top-level divisions with geojson, filtered by tenant context
	const divisionGeoJSON = await dr
		.select({
			id: divisionTable.id,
			name: divisionTable.name,
			geojson: divisionTable.geojson,
		})
		.from(divisionTable)
		.where(
			and(
				isNull(divisionTable.parentId),
				isNotNull(divisionTable.geojson),
				eq(divisionTable.countryAccountsId, countryAccountsId),
			),
		);

	return {
		hip,
		treeData,
		ctryIso3,
		divisionGeoJSON: divisionGeoJSON || [],
		user,
		countryAccountsId,
		usersWithValidatorRole: filteredUsersWithValidatorRole,
	};
}

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	const ctx = new BackendContext(actionArgs);
	const userSession = authActionGetAuth(actionArgs) as UserSession;
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return formSave({
		isCreate: true,
		actionArgs,
		fieldsDef: fieldsDef(ctx),
		save: async (tx, id, data) => {
			if (!id) {
				const eventData = {
					...data,
					countryAccountsId: countryAccountsId,
					createdByUserId: userSession.user.id,
					updatedByUserId: userSession.user.id,
				};

				// Save normal for data to database using the hazardousEventUpdate function
				const returnValue = await hazardousEventCreate(ctx, tx, eventData);

				if (returnValue.ok === true) {
					// continue to approval workflow processing
					await handleApprovalWorkflowService(
						ctx,
						tx,
						returnValue.id,
						"hazardous_event",
						eventData,
					);
				}

				return returnValue;
			} else {
				throw new Error("Not an update screen");
			}
		},
		redirectTo: (id: string) => `/hazardous-event/${id}`,
	});
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	let ctx = new ViewContext();

	// @ts-ignore
	let fieldsInitial = { parent: ld.parentId };

	return formScreen({
		ctx,
		extraData: {
			hip: ld.hip,
			// @ts-ignore
			parent: ld.parent,
			treeData: ld.treeData,
			ctryIso3: ld.ctryIso3,
			user: ld.user,
			// @ts-ignore
			divisionGeoJSON: ld.divisionGeoJSON,
			countryAccountsId: ld.countryAccountsId,
		},
		fieldsInitial,
		form: HazardousEventForm,
		edit: false,
		usersWithValidatorRole: ld.usersWithValidatorRole,
	});
}
