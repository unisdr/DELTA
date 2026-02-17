// Import necessary modules
import {
	disasterEventById,
	disasterEventCreate,
	DisasterEventFields,
	disasterEventUpdate,
} from "~/backend.server/models/event";

import {
	DisasterEventForm,
	fieldsDef,
} from "~/frontend/events/disastereventform";

import { formSave } from "~/backend.server/handlers/form/form";

import { formScreen } from "~/frontend/form";

import { route } from "~/frontend/events/disastereventform";

import { useLoaderData } from "react-router";

import { getItem2 } from "~/backend.server/handlers/view";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";
import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderGetUserForFrontend,
	authLoaderWithPerm,
} from "~/util/auth";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
	getUserIdFromSession,
} from "~/util/session";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema";
import { buildTree } from "~/components/TreeView";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { getUserCountryAccountsWithValidatorRole, getUserCountryAccountsWithAdminRole } from "~/db/queries/userCountryAccounts";
import { handleApprovalWorkflowService } from "~/backend.server/services/approvalWorkflowService";

// Helper function to get country ISO3 code
async function getCountryIso3(request: Request): Promise<string> {
	const settings = await getCountrySettingsFromSession(request);
	return settings?.dtsInstanceCtryIso3 || "";
}

// Helper function to get division GeoJSON data filtered by tenant context
async function getDivisionGeoJSON(countryAccountsId: string) {
	// Filter top-level divisions by tenant context
	return await dr
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
				eq(divisionTable.countryAccountsId, countryAccountsId)
			)
		);
}

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	const cloned = request.clone();
	const formData = await cloned.formData();
	const ctx = new BackendContext(actionArgs);
	const userSession = authActionGetAuth(actionArgs);

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	return formSave({
		actionArgs,
		fieldsDef: fieldsDef(ctx),
		save: async (tx, id, data) => {
			const updatedData = {
				...data,
				countryAccountsId,
				createdBy: userSession.user.id,
				updatedBy: userSession.user.id,
				updatedByUserId: userSession.user.id,
			};
			if (id) {
				// Save normal for data to database using the disasterEventUpdate function
				const returnValue = await disasterEventUpdate(ctx, tx, id, updatedData);

				if (returnValue.ok === true) {
					// continue to approval workflow processing
					//console.log( 'updatedData', request.formData() );
					//console.log( 'data', data );
					//console.log( 'data', data );
					await handleApprovalWorkflowService(ctx, tx, id, "disaster_event", {
						...updatedData,
						'tempValidatorUserIds': formData.get("tempValidatorUserIds"),
						'tempAction': formData.get("tempAction"),
					});
				}

				return returnValue;
			} else {
				// Save normal for data to database using the disasterEventCreate function
				const returnValue = await disasterEventCreate(ctx, tx, updatedData);

				if (returnValue.ok === true) {
					// continue to approval workflow processing
					
					await handleApprovalWorkflowService(ctx, tx, returnValue.id, "disaster_event", updatedData);
				}

				return returnValue;
			}
		},
		redirectTo: (id: string) => route + "/" + id,
	});
});

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { params, request } = loaderArgs;
	const ctx = new BackendContext(loaderArgs);
	const ctryIso3 = await getCountryIso3(request);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userId = await getUserIdFromSession(request);

	// Get users with validator role
	const usersWithValidatorRole = await getUserCountryAccountsWithValidatorRole(countryAccountsId);

	let filteredUsersWithValidatorRole: typeof usersWithValidatorRole = [];

	if (usersWithValidatorRole.length > 0) {
		// filter the usersWithValidatorRole to exclude the current user
		filteredUsersWithValidatorRole = usersWithValidatorRole.filter(
			(userAccount) => userAccount.id !== userId
		);
	}

	// if usersWithValidatorRole is empty, fall back to usersWithAdminRole excluding current user
	if (filteredUsersWithValidatorRole.length === 0) {
		const usersWithAdminRole = await getUserCountryAccountsWithAdminRole(countryAccountsId);
		filteredUsersWithValidatorRole = usersWithAdminRole.filter(
			(userAccount) => userAccount.id !== userId
		);
	}

	// Handle 'new' case without DB query
	if (params.id === "new") {
		// Define Keys Mapping
		const idKey = "id";
		const parentKey = "parentId";
		const nameKey = "name";

		// Filter divisions by tenant context for security
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

		const treeData = buildTree(rawData, idKey, parentKey, nameKey, "en", [
			"importId",
			"nationalId",
			"level",
			"name",
		]);

		// Get division GeoJSON filtered by tenant context
		const divisionGeoJSON = await getDivisionGeoJSON(countryAccountsId);

		return {
			
			item: null, // No existing item for new disaster event
			hip: await dataForHazardPicker(ctx),
			treeData: treeData,
			ctryIso3: ctryIso3,
			divisionGeoJSON: divisionGeoJSON || [],
			user: await authLoaderGetUserForFrontend(loaderArgs),
			usersWithValidatorRole: filteredUsersWithValidatorRole,
		};
	}

	// For existing items, fetch the disaster event
	const getDisasterEvent = async (ctx: BackendContext, id: string) => {
		return disasterEventById(ctx, id);
	};

	let item = null;
	try {
		item = await getItem2(ctx, params, getDisasterEvent);
		if (item.countryAccountsId !== countryAccountsId) {
			throw new Response("Unauthorized access", { status: 401 });
		}
	} catch (error) {
		// If item not found, return 404
		if (error instanceof Response && error.status === 404) {
			throw new Response("Disaster event not found", { status: 404 });
		}
		// Re-throw other errors
		throw error;
	}

	// Fetch division data & build tree
	const idKey = "id";
	const parentKey = "parentId";
	const nameKey = "name";
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

	const treeData = buildTree(rawData, idKey, parentKey, nameKey, "en", [
		"importId",
		"nationalId",
		"level",
		"name",
	]);

	// Get hazard picker data
	const hip = await dataForHazardPicker(ctx);

	// Get division GeoJSON data
	const divisionGeoJSON = await getDivisionGeoJSON(countryAccountsId);

	return {
		
		item,
		hip,
		treeData,
		ctryIso3,
		divisionGeoJSON: divisionGeoJSON || [],
		user: await authLoaderGetUserForFrontend(loaderArgs),
		usersWithValidatorRole: filteredUsersWithValidatorRole,
	};
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	let ctx = new ViewContext();
	let fieldsInitial: Partial<DisasterEventFields> = ld.item
		? {
			...ld.item,
			createdByUserId: ld.item.createdByUserId ?? undefined,
			updatedByUserId: ld.item.updatedByUserId ?? undefined,
		}
		: {};

	// Fix the hazardousEvent to include missing HIP properties with complete structure
	const fixedHazardousEvent = ld.item?.hazardousEvent
		? {
			...ld.item.hazardousEvent,
		}
		: null;

	return formScreen({
		ctx,
		extraData: {
			hip: ld.hip,
			hazardousEvent: fixedHazardousEvent,
			disasterEvent: ld.item?.disasterEvent,
			treeData: ld.treeData,
			ctryIso3: ld.ctryIso3,
			divisionGeoJSON: ld.divisionGeoJSON,
			user: ld.user,
		},
		fieldsInitial: fieldsInitial,
		form: DisasterEventForm,
		edit: !!ld.item,
		id: ld.item?.id,
		usersWithValidatorRole: ld.usersWithValidatorRole ?? [],
	});
}
