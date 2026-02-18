import { useLoaderData } from "react-router";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { BackendContext } from "~/backend.server/context";

import { formSave } from "~/backend.server/handlers/form/form";
import {
	hazardousEventById,
	hazardousEventCreate,
} from "~/backend.server/models/event";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";
import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server";
import { getUserCountryAccountsWithValidatorRole } from "~/db/queries/userCountryAccounts";
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
	authLoaderWithPerm,
} from "~/utils/auth";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
	type UserSession,
} from "~/utils/session";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { request } = loaderArgs;
	const ctx = new BackendContext(loaderArgs);
	const user = await authLoaderGetUserForFrontend(loaderArgs);

	// Get tenant context - we need to use the full user session from loaderArgs
	const userSession = (loaderArgs as any).userSession as UserSession;
	if (!userSession) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const hip = await dataForHazardPicker(ctx);
	const u = new URL(request.url);

	const parentId = u.searchParams.get("parent") || "";
	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	if (parentId) {
		const parent = await hazardousEventById(ctx, parentId);
		if (!parent) {
			throw new Response("Parent not found", { status: 404 });
		}
		// Verify parent belongs to the same tenant
		if (parent.countryAccountsId !== countryAccountsId) {
			throw new Response("Unauthorized Access denied", { status: 403 });
		}
		// Get users with validator role
		const usersWithValidatorRole =
			await getUserCountryAccountsWithValidatorRole(countryAccountsId);

		return {
			hip,
			parentId,
			parent,
			treeData: [],
			ctryIso3: [],
			user,
			countryAccountsId,
			usersWithValidatorRole,
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

	// Get users with validator role
	const usersWithValidatorRole =
		await getUserCountryAccountsWithValidatorRole(countryAccountsId);

	return {
		hip,
		treeData,
		ctryIso3,
		divisionGeoJSON: divisionGeoJSON || [],
		user,
		countryAccountsId,
		usersWithValidatorRole: usersWithValidatorRole,
	};
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	const ctx = new BackendContext(actionArgs);
	const userSession = authActionGetAuth(actionArgs);
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
				return hazardousEventCreate(ctx, tx, eventData);
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
