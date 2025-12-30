import {
	hazardousEventById,
	hazardousEventUpdate,
} from "~/backend.server/models/event";

import {
	fieldsDef,
	HazardousEventForm,
} from "~/frontend/events/hazardeventform";

import { formScreen } from "~/frontend/form";

import { formSave } from "~/backend.server/handlers/form/form";

import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderGetUserForFrontend,
	authLoaderWithPerm,
} from "~/util/auth";

import { useLoaderData } from "@remix-run/react";

import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";

import { getItem2 } from "~/backend.server/handlers/view";

import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
} from "~/util/session";
import { divisionTable } from "~/drizzle/schema";
import { buildTree } from "~/components/TreeView";
import { dr } from "~/db.server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import { getUserCountryAccountsWithValidatorRole } from "~/db/queries/userCountryAccounts";

export const loader = authLoaderWithPerm("EditData", async (loaderArgs) => {
	const { params, request } = loaderArgs;
	const ctx = new BackendContext(loaderArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const item = await getItem2(ctx, params, hazardousEventById);
	if (!item || item.countryAccountsId !== countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	const user = await authLoaderGetUserForFrontend(loaderArgs);

	let hip = await dataForHazardPicker(ctx);

	if (item!.event.ps.length > 0) {
		let parent = item!.event.ps[0].p.he;
		let parent2 = await hazardousEventById(ctx, parent.id);
		if (parent2?.countryAccountsId !== countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}
		const usersWithValidatorRole = await getUserCountryAccountsWithValidatorRole(countryAccountsId);
		return {
			
			hip,
			item,
			parent: parent2,
			treeData: [],
			user,
			usersWithValidatorRole: usersWithValidatorRole,
		};
	}

	// Define Keys Mapping (Make it Adaptable)
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
		.where(eq(divisionTable.countryAccountsId, countryAccountsId));
	const treeData = buildTree(rawData, idKey, parentKey, nameKey, "en", [
		"importId",
		"nationalId",
		"level",
		"name",
	]);

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
				eq(divisionTable.countryAccountsId, countryAccountsId)
			)
		);

	const settings = await getCountrySettingsFromSession(request);
	const ctryIso3 = settings.ctryIso3;

	// Get users with validator role
	const usersWithValidatorRole = await getUserCountryAccountsWithValidatorRole(countryAccountsId);

	return {
		
		hip: hip,
		item: item,
		treeData: treeData,
		ctryIso3: ctryIso3,
		divisionGeoJSON: divisionGeoJSON || [],
		user,
		countryAccountsId,
		usersWithValidatorRole: usersWithValidatorRole,
	};
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	const ctx = new BackendContext(actionArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userSession = authActionGetAuth(actionArgs);

	return formSave({
		actionArgs,
		fieldsDef: fieldsDef(ctx),
		save: async (tx, id, data) => {
			const updatedData = {
				...data,
				countryAccountsId,
				updatedByUserId: userSession.user.id,
			};
			if (id) {
				return hazardousEventUpdate(ctx, tx, id, updatedData, (data as any).tableValidatorUserIds);
			} else {
				throw "not an create screen";
			}
		},
		redirectTo: (id: string) => `/hazardous-event/${id}`,
	});
});

export default function Screen() {
	let ld = useLoaderData<typeof loader>();
	if (!ld.item) {
		throw "invalid";
	}
	let ctx = new ViewContext()
	let fieldsInitial = {
		// both ld.item.event and ld.item have description fields, description field on event is not used
		// TODO: remove those fields from db
		...ld.item.event,
		...ld.item,
		parent: "",
		// normalize nullable properties to undefined to satisfy Partial<HazardousEventFields>
		createdByUserId: undefined,
		updatedByUserId: undefined,
		submittedByUserId: undefined,
		submittedAt: undefined,
		validatedByUserId: undefined,
		validatedAt: undefined,
		publishedByUserId: undefined,
		publishedAt: undefined,
		// Convert date strings to Date objects
		updatedAt: ld.item.updatedAt ? new Date(ld.item.updatedAt) : undefined,
		createdAt: ld.item.createdAt ? new Date(ld.item.createdAt) : undefined,
	};

	return formScreen({
		ctx,
		extraData: {
			hip: ld.hip,
			// @ts-ignore
			parent: ld.parent,
			treeData: ld.treeData,
			// @ts-ignore
			ctryIso3: ld.ctryIso3,
			user: ld.user,
			// @ts-ignore
			divisionGeoJSON: ld.divisionGeoJSON,
			// @ts-ignore
			countryAccountsId: ld.countryAccountsId,
		},
		fieldsInitial,
		//form: HazardousEventForm,
		form: HazardousEventForm,
		edit: true,
		id: ld.item.id,
		usersWithValidatorRole: ld.usersWithValidatorRole ?? [],
	});
}
