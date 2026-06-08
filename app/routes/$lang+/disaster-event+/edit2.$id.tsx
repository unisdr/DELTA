// Import necessary modules
import {
	disasterEventById,
	disasterEventCreate,
	disasterEventUpdate,
} from "~/backend.server/models/event";

import {
	fieldsDef,
} from "~/frontend/events/disastereventform";

import { formSave } from "~/backend.server/handlers/form/form";


import { route } from "~/frontend/events/disastereventform";

import { Form as RouterForm, useLoaderData } from "react-router";

import { getItem2 } from "~/backend.server/handlers/view";
import { dataForHazardPicker } from "~/backend.server/models/hip_hazard_picker";
import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderGetUserForFrontend,
	authLoaderWithPerm,
} from "~/utils/auth";
import {
	getCountryAccountsIdFromSession,
	getCountrySettingsFromSession,
	getUserIdFromSession,
	getUserRoleFromSession,
} from "~/utils/session";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { dr } from "~/db.server";
import { divisionTable } from "~/drizzle/schema/divisionTable";
import { buildTree } from "~/components/TreeView";
import { SpatialFootprintFormView2 } from "~/frontend/spatialFootprintFormView2";

import { ViewContext } from "~/frontend/context";

import { BackendContext } from "~/backend.server/context";
import {
	getUserCountryAccountsWithAdminRole,
	getUserCountryAccountsWithValidatorRole,
} from "~/db/queries/userCountryAccountsRepository";
import { handleApprovalWorkflowService } from "~/backend.server/services/approvalWorkflowService";
import { canEditDataCollectionRecord } from "~/frontend/user/roles";
import { InputTextarea } from 'primereact/inputtextarea';

export const handle = {
	hideMainNavigation: true,
};

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
				eq(divisionTable.countryAccountsId, countryAccountsId),
			),
		);
}

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	const cloned = request.clone();
	const formData = await cloned.formData();
	const ctx = new BackendContext(actionArgs);
	const userSession = authActionGetAuth(actionArgs);

	const countryAccountsId = await getCountryAccountsIdFromSession(request);

	console.log("FormData entries:", Array.from(formData.entries()));
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
				const returnValue = await disasterEventUpdate(ctx, tx, id, updatedData);

				if (returnValue.ok === true) {
					await handleApprovalWorkflowService(ctx, tx, id, "disaster_event", {
						...updatedData,
						tempValidatorUserIds: formData.get("tempValidatorUserIds"),
						tempAction: formData.get("tempAction"),
					});
				}

				return returnValue;
			} else {
				const returnValue = await disasterEventCreate(ctx, tx, {
					...updatedData,
					createdByUserId: userSession.user.id,
				});

				if (returnValue.ok === true) {
					await handleApprovalWorkflowService(
						ctx,
						tx,
						returnValue.id,
						"disaster_event",
						{
							...updatedData,
							tempValidatorUserIds: formData.get("tempValidatorUserIds"),
							tempAction: formData.get("tempAction"),
						},
					);
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

	const usersWithValidatorRole =
		await getUserCountryAccountsWithValidatorRole(countryAccountsId);

	let filteredUsersWithValidatorRole: typeof usersWithValidatorRole = [];

	if (usersWithValidatorRole.length > 0) {
		filteredUsersWithValidatorRole = usersWithValidatorRole.filter(
			(userAccount) => userAccount.id !== userId,
		);
	}

	if (filteredUsersWithValidatorRole.length === 0) {
		const usersWithAdminRole =
			await getUserCountryAccountsWithAdminRole(countryAccountsId);
		filteredUsersWithValidatorRole = usersWithAdminRole.filter(
			(userAccount) => userAccount.id !== userId,
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
			throw new Response("Unauthorized access", { status: 403 });
		}
	} catch (error) {
		// If item not found, return 404
		if (error instanceof Response && error.status === 404) {
			throw new Response("Disaster event not found", { status: 404 });
		}
		// Re-throw other errors
		throw error;
	}

	const userRole = await getUserRoleFromSession(request) as string;

	if (canEditDataCollectionRecord(userRole, item.approvalStatus) === false) {
		throw new Response("Access forbidden", { status: 403 });
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

	// Fix the hazardousEvent to include missing HIP properties with complete structure
	const fixedHazardousEvent = ld.item?.hazardousEvent
		? {
				...ld.item.hazardousEvent,
			}
		: null;
	ctx;

	console.log("Loader:", {
		hip: ld.hip,
		hazardousEvent: fixedHazardousEvent,
		disasterEvent: ld.item?.disasterEvent,
		treeData: ld.treeData,
		ctryIso3: ld.ctryIso3,
		divisionGeoJSON: ld.divisionGeoJSON,
		user: ld.user,
	});

	//{ JSON.stringify(ld) }
	return (
		<>
			<StepperValidation
				ctx={ctx}
				hazardousEvent={fixedHazardousEvent}
				hip={ld.hip}
				disasterEvent={ld.item?.disasterEvent ?? null}
				treeData={ld.treeData}
				ctryIso3={ld.ctryIso3}
				divisionGeoJSON={ld.divisionGeoJSON}
				user={ld.user}
				usersWithValidatorRole={ld.usersWithValidatorRole ?? []}
			/>
		</>
	);

	// return formScreen({
	// 	ctx,
	// 	extraData: {
	// 		hip: ld.hip,
	// 		hazardousEvent: fixedHazardousEvent,
	// 		disasterEvent: ld.item?.disasterEvent,
	// 		treeData: ld.treeData,
	// 		ctryIso3: ld.ctryIso3,
	// 		divisionGeoJSON: ld.divisionGeoJSON,
	// 		user: ld.user,
	// 	},
	// 	fieldsInitial: fieldsInitial,
	// 	form: DisasterEventForm,
	// 	edit: !!ld.item,
	// 	id: ld.item?.id,
	// });
}

import { useEffect, useMemo, useRef, useState } from "react";
import { Stepper } from "primereact/stepper";
import { StepperPanel } from "primereact/stepperpanel";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Tooltip } from "primereact/tooltip";
import { Card } from "primereact/card";
import { PickList } from "primereact/picklist";
import { Dialog } from "primereact/dialog";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { Tree } from "primereact/tree";
import type { TreeProps } from "primereact/tree";
import type { TreeNode } from "primereact/treenode";
import {
	SaveSubmitDialog,
	type SaveAction,
} from "~/frontend/components/approval-workflow/SaveSubmitDialog";

type Errors = {
	nameNational?: string;
	endDate?: string;
};

type LinkedEventOption = {
	id: string;
	name: string;
	code: string;
};

type AdditionalDetailCategory = "response" | "assessment" | "declaration";

type DeclarationStatus = "unknown" | "yes" | "no";

type AdditionalDetailMeta = {
	declarationStatus?: DeclarationStatus;
	hadOfficialWarningOrWeatherAdvisory?: boolean;
	officialWarningAffectedAreas?: string;
};

type AdditionalDetailItem = {
	id: string;
	type: string;
	date: string;
	description: string;
	meta?: AdditionalDetailMeta;
};

type AdditionalDetailTypeOption = {
	value: string;
	label: string;
};

type EarlyActionFieldIndex = 1 | 2 | 3 | 4 | 5;
type AssessmentFieldIndex = 1 | 2 | 3 | 4 | 5;

type HazardPickerItem = {
	id: string;
	name: string;
};

type HipClusterItem = HazardPickerItem & {
	typeId: string;
};

type HipHazardItem = HazardPickerItem & {
	clusterId: string;
};

type StepperHipData = {
	types: HazardPickerItem[];
	clusters: HipClusterItem[];
	hazards: HipHazardItem[];
};

type StepperFormState = {
	id: string;
	nameNational:  string;
	nameGlobalOrRegional: string;
	nationalDisasterId: string;
	glide: string;
	recordingInstitution: string;
};

type EventBasicsCompareFields = {
	id: string;
	nameNational: string;
	nameGlobalOrRegional: string;
	nationalDisasterId: string;
	glide: string;
	recordingInstitution: string;
};

type DatePrecision = "yyyy-mm-dd" | "yyyy-mm" | "yyyy";

type DateWithPrecisionState = {
	precision: DatePrecision;
	year: string;
	month: string;
	day: string;
};

type DivisionTreeNodeInput = {
	id: string | number;
	name: string;
	children?: DivisionTreeNodeInput[];
};

function toPrimeTreeNodes(nodes: DivisionTreeNodeInput[]): TreeNode[] {
	return nodes.map((node) => ({
		key: String(node.id),
		label: node.name,
		data: { id: node.id },
		children: toPrimeTreeNodes(node.children || []),
	}));
}

function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) {
		return nodes;
	}

	return nodes.reduce<TreeNode[]>((accumulator, node) => {
		const label = String(node.label || "").toLowerCase();
		const filteredChildren = node.children
			? filterTreeNodes(node.children, normalizedQuery)
			: [];
		const matchesNode = label.includes(normalizedQuery);

		if (matchesNode || filteredChildren.length > 0) {
			accumulator.push({
				...node,
				children: filteredChildren,
			});
		}

		return accumulator;
	}, []);
}

function getTopLevelSelectedKeys(nodes: TreeNode[], selectionKeys: TreeProps["selectionKeys"]): string[] {
	if (!selectionKeys || typeof selectionKeys !== "object") {
		return [];
	}

	const checkedKeys = new Set(
		Object.entries(selectionKeys)
			.filter(([, value]) => {
				if (value === true) {
					return true;
				}
				if (typeof value === "object" && value !== null) {
					return "checked" in value && value.checked === true;
				}
				return false;
			})
			.map(([key]) => key),
	);

	const result: string[] = [];

	const visit = (treeNodes: TreeNode[], parentChecked: boolean) => {
		for (const node of treeNodes) {
			const key = node.key == null ? null : String(node.key);
			const isChecked = key ? checkedKeys.has(key) : false;

			if (isChecked && !parentChecked && key) {
				result.push(key);
			}

			if (node.children?.length) {
				visit(node.children, parentChecked || isChecked);
			}
		}
	};

	visit(nodes, false);
	return result;
}

function getNodeAndDescendantKeys(nodes: TreeNode[], targetKey: string): string[] {
	for (const node of nodes) {
		const nodeKey = node.key == null ? null : String(node.key);
		if (nodeKey === targetKey) {
			const descendantKeys = node.children ? collectNodeKeys(node.children) : [];
			return [targetKey, ...descendantKeys];
		}

		if (node.children?.length) {
			const match = getNodeAndDescendantKeys(node.children, targetKey);
			if (match.length > 0) {
				return match;
			}
		}
	}

	return [];
}

function collectNodeKeys(nodes: TreeNode[]): string[] {
	return nodes.flatMap((node) => {
		const nodeKey = node.key == null ? [] : [String(node.key)];
		const childKeys = node.children ? collectNodeKeys(node.children) : [];
		return [...nodeKey, ...childKeys];
	});
}

const requiredFieldOrder: Array<keyof Errors> = ["nameNational"];

const responseTypeOptions: AdditionalDetailTypeOption[] = [
	{ value: "early_action", label: "Early action" },
	{ value: "response_operation", label: "Response operation" },
];

const assessmentTypeOptions: AdditionalDetailTypeOption[] = [
	{
		value: "rapid_preliminary_assessment",
		label: "Rapid/Preliminary assessment",
	},
	{
		value: "post_disaster_assessment",
		label: "Post-disaster assessment",
	},
	{ value: "other_assessment", label: "Other assessment" },
];

const declarationTypeOptions: AdditionalDetailTypeOption[] = [
	{ value: "disaster_declaration", label: "Disaster declaration" },
	{
		value: "disaster_declaration_effects",
		label: "Disaster declaration effects",
	},
	{ value: "official_warning", label: "Official Warning" },
];

const declarationStatusOptions: AdditionalDetailTypeOption[] = [
	{ value: "unknown", label: "Unknown" },
	{ value: "yes", label: "Yes" },
	{ value: "no", label: "No" },
];

const datePrecisionOptions = [
	{ value: "yyyy-mm-dd", label: "Full date" },
	{ value: "yyyy-mm", label: "Year and month" },
	{ value: "yyyy", label: "Year only" },
];

const legacyDetailTypeToKey: Record<string, string> = {
	"Early action": "early_action",
	"Response operation": "response_operation",
	Coordination: "coordination",
	Evacuation: "evacuation",
	Assessment: "assessment",
	"Rapid assessment": "rapid_assessment",
	"Needs assessment": "needs_assessment",
	"Sector assessment": "sector_assessment",
	"Rapid/Preliminary assessment": "rapid_preliminary_assessment",
	"Post-disaster assessment": "post_disaster_assessment",
	"Other assessment": "other_assessment",
	"Disaster declaration": "disaster_declaration",
	"Disaster declaration effects": "disaster_declaration_effects",
	"Official Warning": "official_warning",
};

function normalizeDetailTypeValue(value: string): string {
	return legacyDetailTypeToKey[value] ?? value;
}

// const isValidEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value);

type StepperValidationProps = {
	ctx: ViewContext;
	hazardousEvent: {
		id?: string | null;
	} | null;
	hip: StepperHipData;
	disasterEvent: {
		nameNational?: string | null;
		nameGlobalOrRegional?: string | null;
		nationalDisasterId?: string | null;
		glide?: string | null;
		startDate?: string | null;
		endDate?: string | null;
		startDateLocal?: string | null;
		endDateLocal?: string | null;
		hipTypeId?: string | null;
		hipClusterId?: string | null;
		hipHazardId?: string | null;
		disasterEventId?: string | null;
		recordingInstitution?: string | null;
		id?: string | null;
		spatialFootprint?: unknown;
		earlyActionDescription1?: string | null;
		earlyActionDate1?: string | Date | null;
		earlyActionDescription2?: string | null;
		earlyActionDate2?: string | Date | null;
		earlyActionDescription3?: string | null;
		earlyActionDate3?: string | Date | null;
		earlyActionDescription4?: string | null;
		earlyActionDate4?: string | Date | null;
		earlyActionDescription5?: string | null;
		earlyActionDate5?: string | Date | null;
		responseOperations?: string | null;
		rapidOrPreliminaryAssessmentDescription1?: string | null;
		rapidOrPreliminaryAssessmentDate1?: string | Date | null;
		rapidOrPreliminaryAssessmentDescription2?: string | null;
		rapidOrPreliminaryAssessmentDate2?: string | Date | null;
		rapidOrPreliminaryAssessmentDescription3?: string | null;
		rapidOrPreliminaryAssessmentDate3?: string | Date | null;
		rapidOrPreliminaryAssessmentDescription4?: string | null;
		rapidOrPreliminaryAssessmentDate4?: string | Date | null;
		rapidOrPreliminaryAssessmentDescription5?: string | null;
		rapidOrPreliminaryAssessmentDate5?: string | Date | null;
		postDisasterAssessmentDescription1?: string | null;
		postDisasterAssessmentDate1?: string | Date | null;
		postDisasterAssessmentDescription2?: string | null;
		postDisasterAssessmentDate2?: string | Date | null;
		postDisasterAssessmentDescription3?: string | null;
		postDisasterAssessmentDate3?: string | Date | null;
		postDisasterAssessmentDescription4?: string | null;
		postDisasterAssessmentDate4?: string | Date | null;
		postDisasterAssessmentDescription5?: string | null;
		postDisasterAssessmentDate5?: string | Date | null;
		otherAssessmentDescription1?: string | null;
		otherAssessmentDate1?: string | Date | null;
		otherAssessmentDescription2?: string | null;
		otherAssessmentDate2?: string | Date | null;
		otherAssessmentDescription3?: string | null;
		otherAssessmentDate3?: string | Date | null;
		otherAssessmentDescription4?: string | null;
		otherAssessmentDate4?: string | Date | null;
		otherAssessmentDescription5?: string | null;
		otherAssessmentDate5?: string | Date | null;
		disasterDeclaration?: DeclarationStatus | null;
		disasterDeclarationTypeAndEffect1?: string | null;
		disasterDeclarationDate1?: string | Date | null;
		disasterDeclarationTypeAndEffect2?: string | null;
		disasterDeclarationDate2?: string | Date | null;
		disasterDeclarationTypeAndEffect3?: string | null;
		disasterDeclarationDate3?: string | Date | null;
		disasterDeclarationTypeAndEffect4?: string | null;
		disasterDeclarationDate4?: string | Date | null;
		disasterDeclarationTypeAndEffect5?: string | null;
		disasterDeclarationDate5?: string | Date | null;
		hadOfficialWarningOrWeatherAdvisory?: boolean | null;
		officialWarningAffectedAreas?: string | null;
	} | null;
	treeData: unknown;
	ctryIso3: string;
	divisionGeoJSON: unknown;
	user: {
		role?: string | null;
	} | null;
	usersWithValidatorRole: Array<{
		id: string;
		firstName: string;
		lastName: string;
		email: string;
	}>;
};

function StepperValidation({
	ctx,
	disasterEvent,
	hip,
	treeData,
	ctryIso3,
	divisionGeoJSON,
	user,
	usersWithValidatorRole,
}: StepperValidationProps) {
	ctryIso3;
	divisionGeoJSON;

	const divisionNodes = useMemo(
		() =>
			toPrimeTreeNodes(
				(Array.isArray(treeData)
					? (treeData as DivisionTreeNodeInput[])
					: []) || [],
			),
		[treeData],
	);

	const divisionLabelByKey = useMemo(() => {
		const map = new Map<string, string>();
		const walk = (nodes: TreeNode[]) => {
			for (const node of nodes) {
				if (node.key != null) {
					map.set(String(node.key), String(node.label || node.key));
				}
				if (node.children?.length) {
					walk(node.children);
				}
			}
		};

		walk(divisionNodes);
		return map;
	}, [divisionNodes]);

	const [selectedDivisionKeys, setSelectedDivisionKeys] =
		useState<TreeProps["selectionKeys"]>(null);
	const [divisionSearchTerm, setDivisionSearchTerm] = useState("");

	const filteredDivisionNodes = useMemo(
		() => filterTreeNodes(divisionNodes, divisionSearchTerm),
		[divisionNodes, divisionSearchTerm],
	);

	const selectedDivisionNames = useMemo(() => {
		if (!selectedDivisionKeys || typeof selectedDivisionKeys !== "object") {
			return [];
		}

		const keys = getTopLevelSelectedKeys(divisionNodes, selectedDivisionKeys);

		return keys
			.map((key) => divisionLabelByKey.get(key))
			.filter((label): label is string => Boolean(label));
	}, [divisionLabelByKey, divisionNodes, selectedDivisionKeys]);

	const selectedDivisionCount = selectedDivisionNames.length;
	const selectedDivisionItems = useMemo(
		() =>
			getTopLevelSelectedKeys(divisionNodes, selectedDivisionKeys).map((key) => ({
				key,
				label: divisionLabelByKey.get(key) ?? key,
			})),
		[divisionLabelByKey, divisionNodes, selectedDivisionKeys],
	);

	const clearDivisionSelection = () => {
		setSelectedDivisionKeys(null);
	};

	const removeDivisionSelection = (keyToRemove: string) => {
		setSelectedDivisionKeys((currentSelection) => {
			if (!currentSelection || typeof currentSelection !== "object") {
				return currentSelection;
			}

			const keysToRemove = new Set(getNodeAndDescendantKeys(divisionNodes, keyToRemove));
			const nextSelection = Object.fromEntries(
				Object.entries(currentSelection).filter(([key]) => !keysToRemove.has(key)),
			);

			return Object.keys(nextSelection).length > 0 ? nextSelection : null;
		});
	};

	const eventBasicsInitialValues: EventBasicsCompareFields = {
		id: disasterEvent?.id ?? "",
		nameNational: disasterEvent?.nameNational ?? "",
		nameGlobalOrRegional: disasterEvent?.nameGlobalOrRegional ?? "",
		nationalDisasterId: disasterEvent?.nationalDisasterId ?? "",
		glide: disasterEvent?.glide ?? "",
		recordingInstitution: disasterEvent?.recordingInstitution ?? "",
	};
	const [activeStep, setActiveStep] = useState(0);
	const firstNameTooltipRef = useRef<Tooltip>(null);
	const [form, setForm] = useState<StepperFormState>({
		id: eventBasicsInitialValues.id,
		nameNational: disasterEvent?.nameNational ?? "",
		nameGlobalOrRegional: disasterEvent?.nameGlobalOrRegional ?? "",
		nationalDisasterId: disasterEvent?.nationalDisasterId ?? "",
		glide: disasterEvent?.glide ?? "",
		recordingInstitution: disasterEvent?.recordingInstitution ?? "",
	});

	console.log("Initial form state - disasterEvent:", { disasterEvent });
	console.log("Initial form state - hip:", { hip });

	const parseDateWithPrecision = (value: string | null | undefined): DateWithPrecisionState => {
		if (!value) {
			return {
				precision: "yyyy-mm-dd",
				year: "",
				month: "",
				day: "",
			};
		}

		if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
			return {
				precision: "yyyy-mm-dd",
				year: value.slice(0, 4),
				month: value.slice(5, 7),
				day: value.slice(8, 10),
			};
		}

		if (/^\d{4}-\d{2}$/.test(value)) {
			return {
				precision: "yyyy-mm",
				year: value.slice(0, 4),
				month: value.slice(5, 7),
				day: "",
			};
		}

		if (/^\d{4}$/.test(value)) {
			return {
				precision: "yyyy",
				year: value,
				month: "",
				day: "",
			};
		}

		return {
			precision: "yyyy-mm-dd",
			year: "",
			month: "",
			day: "",
		};
	};

	const toDateWithPrecisionValue = (state: DateWithPrecisionState): string => {
		if (state.precision === "yyyy") {
			if (state.year.length !== 4) {
				return "";
			}
			return state.year;
		}

		if (state.precision === "yyyy-mm") {
			if (state.year.length !== 4 || state.month.length !== 2) {
				return "";
			}
			return `${state.year}-${state.month}`;
		}

		if (
			state.year.length !== 4 ||
			state.month.length !== 2 ||
			state.day.length !== 2
		) {
			return "";
		}

		return `${state.year}-${state.month}-${state.day}`;
	};

	const toComparableBoundaryDate = (
		state: DateWithPrecisionState,
		boundary: "start" | "end",
	): string => {
		if (state.precision === "yyyy") {
			return boundary === "start"
				? `${state.year}-01-01`
				: `${state.year}-12-31`;
		}

		if (state.precision === "yyyy-mm") {
			if (boundary === "start") {
				return `${state.year}-${state.month}-01`;
			}

			const lastDayOfMonth = new Date(
				Date.UTC(Number(state.year), Number(state.month), 0),
			)
				.getUTCDate()
				.toString()
				.padStart(2, "0");
			return `${state.year}-${state.month}-${lastDayOfMonth}`;
		}

		return `${state.year}-${state.month}-${state.day}`;
	};

	const [startDateState, setStartDateState] = useState<DateWithPrecisionState>(
		parseDateWithPrecision(disasterEvent?.startDate),
	);
	const [endDateState, setEndDateState] = useState<DateWithPrecisionState>(
		parseDateWithPrecision(disasterEvent?.endDate),
	);
	const [startDateLocal, setStartDateLocal] = useState(
		disasterEvent?.startDateLocal ?? "",
	);
	const [endDateLocal, setEndDateLocal] = useState(
		disasterEvent?.endDateLocal ?? "",
	);
	const [spatialFootprintDialogVisible, setSpatialFootprintDialogVisible] =
		useState(false);
	const [spatialFootprintValue, setSpatialFootprintValue] = useState<any[]>(
		() => {
			try {
				if (Array.isArray(disasterEvent?.spatialFootprint)) {
					return disasterEvent.spatialFootprint as any[];
				}
				if (typeof disasterEvent?.spatialFootprint === "string") {
					return JSON.parse(disasterEvent.spatialFootprint) || [];
				}
			} catch {
				// Ignore parse failures and fallback to empty list
			}
			return [];
		},
	);

	const monthOptions = [
		{ value: "01", label: "January" },
		{ value: "02", label: "February" },
		{ value: "03", label: "March" },
		{ value: "04", label: "April" },
		{ value: "05", label: "May" },
		{ value: "06", label: "June" },
		{ value: "07", label: "July" },
		{ value: "08", label: "August" },
		{ value: "09", label: "September" },
		{ value: "10", label: "October" },
		{ value: "11", label: "November" },
		{ value: "12", label: "December" },
	];

	const renderDateWithPrecision = (
		prefix: "startDate" | "endDate",
		label: string,
		state: DateWithPrecisionState,
		setState: React.Dispatch<React.SetStateAction<DateWithPrecisionState>>,
		errorMessage?: string,
	) => {
		const isFullDate = state.precision === "yyyy-mm-dd";
		const isYearMonth = state.precision === "yyyy-mm";
		const isYearOnly = state.precision === "yyyy";

		return (
			<>
				<div className="col-span-12 md:col-span-6">
					<label htmlFor={`${prefix}Format`} className="mb-1 inline-flex items-center gap-2">
						{label} format
					</label>
					<Dropdown
						id={`${prefix}Format`}
						value={state.precision || null}
						options={datePrecisionOptions}
						optionLabel="label"
						optionValue="value"
						onChange={(event) => {
							const precision =
								typeof event.value === "string"
									? (event.value as DatePrecision)
									: ("yyyy-mm-dd" as DatePrecision);
							setState((current) => ({
								...current,
								precision,
								month: precision === "yyyy" ? "" : current.month,
								day: precision === "yyyy-mm-dd" ? current.day : "",
							}));
						}}
						placeholder="Select format"
						className="w-full"
					/>
				</div>

				<div className="col-span-12 md:col-span-6">
					{isFullDate ? (
						<>
							<label htmlFor={`${prefix}Date`} className="mb-1 inline-flex items-center gap-2">
								{label} date
							</label>
							<Calendar
								id={`${prefix}DateCalendar`}
								inputId={`${prefix}Date`}
								value={
									state.year.length === 4 &&
									state.month.length === 2 &&
									state.day.length === 2
										? new Date(
												Number(state.year),
												Number(state.month) - 1,
												Number(state.day),
										  )
										: null
								}
								onChange={(event) => {
									const selected = event.value;
									if (!(selected instanceof Date) || Number.isNaN(selected.getTime())) {
										setState((current) => ({
											...current,
											year: "",
											month: "",
											day: "",
										}));
										return;
									}

									const year = String(selected.getFullYear());
									const month = String(selected.getMonth() + 1).padStart(2, "0");
									const day = String(selected.getDate()).padStart(2, "0");
									setState((current) => ({
										...current,
										year,
										month,
										day,
									}));
								}}
								dateFormat="yy-mm-dd"
								placeholder="YYYY-MM-DD"
								showIcon
								className="w-full"
							/>
						</>
					) : null}

					{isYearMonth ? (
						<div className="grid grid-cols-2 gap-2">
							<div>
								<label htmlFor={`${prefix}Year`} className="mb-1 inline-flex items-center gap-2">
									{label} year
								</label>
								<InputText
									id={`${prefix}Year`}
									value={state.year}
									onChange={(event) => {
										const year = event.target.value.replace(/\D/g, "").slice(0, 4);
										setState((current) => ({ ...current, year }));
									}}
									keyfilter="int"
									maxLength={4}
									className="w-full"
								/>
							</div>
							<div>
								<label htmlFor={`${prefix}Month`} className="mb-1 inline-flex items-center gap-2">
									{label} month
								</label>
								<Dropdown
									id={`${prefix}Month`}
									value={state.month || null}
									options={monthOptions}
									optionLabel="label"
									optionValue="value"
									onChange={(event) => {
										setState((current) => ({
											...current,
											month: typeof event.value === "string" ? event.value : "",
										}));
									}}
									placeholder="Select month"
									className="w-full"
								>
								</Dropdown>
							</div>
						</div>
					) : null}

					{isYearOnly ? (
						<>
							<label htmlFor={`${prefix}Year`} className="mb-1 inline-flex items-center gap-2">
								{label} year
							</label>
							<InputText
								id={`${prefix}Year`}
								value={state.year}
								onChange={(event) => {
									const year = event.target.value.replace(/\D/g, "").slice(0, 4);
									setState((current) => ({ ...current, year }));
								}}
								keyfilter="int"
								maxLength={4}
								className="w-full"
							/>
						</>
					) : null}

					{errorMessage ? (
						<p className="mt-1 text-xs text-red-600">{errorMessage}</p>
					) : null}
				</div>
			</>
		);
	};
	const [linkedEventSearch, setLinkedEventSearch] = useState("");
	const [linkedEventLoading, setLinkedEventLoading] = useState(false);
	const [linkedEventSource, setLinkedEventSource] = useState<LinkedEventOption[]>([]);
	const [linkedEventTarget, setLinkedEventTarget] = useState<LinkedEventOption[]>([]);
	const [linkedDisasterEventSearch, setLinkedDisasterEventSearch] = useState("");
	const [linkedDisasterEventLoading, setLinkedDisasterEventLoading] = useState(false);
	const [linkedDisasterEventSource, setLinkedDisasterEventSource] = useState<LinkedEventOption[]>([]);
	const [linkedDisasterEventTarget, setLinkedDisasterEventTarget] = useState<LinkedEventOption[]>([]);
	const [linkedDisasterRecordSearch, setLinkedDisasterRecordSearch] = useState("");
	const [linkedDisasterRecordLoading, setLinkedDisasterRecordLoading] = useState(false);
	const [linkedDisasterRecordSource, setLinkedDisasterRecordSource] = useState<LinkedEventOption[]>([]);
	const [linkedDisasterRecordTarget, setLinkedDisasterRecordTarget] = useState<LinkedEventOption[]>([]);

	const formatBackendDate = (value: string | Date | null | undefined): string => {
		if (!value) {
			return "";
		}

		const dateValue = value instanceof Date ? value : new Date(value);
		if (Number.isNaN(dateValue.getTime())) {
			return "";
		}

		const day = String(dateValue.getUTCDate()).padStart(2, "0");
		const month = String(dateValue.getUTCMonth() + 1).padStart(2, "0");
		const year = String(dateValue.getUTCFullYear());
		return `${day}/${month}/${year}`;
	};

	const mapEarlyActionToResponses = (): AdditionalDetailItem[] => {
		const indexes: EarlyActionFieldIndex[] = [1, 2, 3, 4, 5];
		const responseOperationDescription = String(
			disasterEvent?.responseOperations ?? "",
		).trim();

		const earlyActionItems = indexes.reduce<AdditionalDetailItem[]>((accumulator, index) => {
			const descriptionRaw =
				disasterEvent?.[
					`earlyActionDescription${index}` as const
				] ?? "";
			const dateRaw =
				disasterEvent?.[
					`earlyActionDate${index}` as const
				] ?? null;

			const descriptionText = String(descriptionRaw).trim();
			const formattedDate = formatBackendDate(dateRaw);

			if (!descriptionText && !formattedDate) {
				return accumulator;
			}

			accumulator.push({
				id: `response-early-action-${index}`,
				type: "early_action",
				date: formattedDate,
				description: descriptionText,
			});

			return accumulator;
		}, []);

		if (!responseOperationDescription) {
			return earlyActionItems;
		}

		return [
			...earlyActionItems,
			{
				id: "response-operation-backend",
				type: "response_operation",
				date: "",
				description: responseOperationDescription,
			},
		];
	};

	const mapAssessmentsToItems = (): AdditionalDetailItem[] => {
		const indexes: AssessmentFieldIndex[] = [1, 2, 3, 4, 5];
		const configs = [
			{
				type: "rapid_preliminary_assessment",
				descriptionPrefix: "rapidOrPreliminaryAssessmentDescription",
				datePrefix: "rapidOrPreliminaryAssessmentDate",
			},
			{
				type: "post_disaster_assessment",
				descriptionPrefix: "postDisasterAssessmentDescription",
				datePrefix: "postDisasterAssessmentDate",
			},
			{
				type: "other_assessment",
				descriptionPrefix: "otherAssessmentDescription",
				datePrefix: "otherAssessmentDate",
			},
		] as const;

		return configs.reduce<AdditionalDetailItem[]>((allItems, config) => {
			const itemsForType = indexes.reduce<AdditionalDetailItem[]>((items, index) => {
				const descriptionRaw =
					disasterEvent?.[
						`${config.descriptionPrefix}${index}` as const
					] ?? "";
				const dateRaw =
					disasterEvent?.[
						`${config.datePrefix}${index}` as const
					] ?? null;

				const descriptionText = String(descriptionRaw).trim();
				const formattedDate = formatBackendDate(dateRaw);

				if (!descriptionText && !formattedDate) {
					return items;
				}

				items.push({
					id: `assessment-${config.type}-${index}`,
					type: config.type,
					date: formattedDate,
					description: descriptionText,
				});

				return items;
			}, []);

			return [...allItems, ...itemsForType];
		}, []);
	};

	const mapDeclarationsToItems = (): AdditionalDetailItem[] => {
		const declarationItems: AdditionalDetailItem[] = [];
		const declarationStatus = disasterEvent?.disasterDeclaration;

		if (declarationStatus && ["unknown", "yes", "no"].includes(declarationStatus)) {
			declarationItems.push({
				id: "declaration-status",
				type: "disaster_declaration",
				date: "",
				description: "",
				meta: {
					declarationStatus,
				},
			});
		}

		const effectIndexes: AssessmentFieldIndex[] = [1, 2, 3, 4, 5];
		for (const index of effectIndexes) {
			const descriptionText = String(
				disasterEvent?.[
					`disasterDeclarationTypeAndEffect${index}` as const
				] ?? "",
			).trim();
			const formattedDate = formatBackendDate(
				disasterEvent?.[
					`disasterDeclarationDate${index}` as const
				] ?? null,
			);

			if (!descriptionText && !formattedDate) {
				continue;
			}

			declarationItems.push({
				id: `declaration-effects-${index}`,
				type: "disaster_declaration_effects",
				date: formattedDate,
				description: descriptionText,
			});
		}

		const warningFlag = Boolean(disasterEvent?.hadOfficialWarningOrWeatherAdvisory);
		const warningAreas = String(disasterEvent?.officialWarningAffectedAreas ?? "").trim();
		if (warningFlag || warningAreas) {
			declarationItems.push({
				id: "declaration-official-warning",
				type: "official_warning",
				date: "",
				description: warningAreas,
				meta: {
					hadOfficialWarningOrWeatherAdvisory: warningFlag,
					officialWarningAffectedAreas: warningAreas,
				},
			});
		}

		return declarationItems;
	};

	const [responses, setResponses] = useState<AdditionalDetailItem[]>(() =>
		mapEarlyActionToResponses(),
	);
	const [assessments, setAssessments] = useState<AdditionalDetailItem[]>(() =>
		mapAssessmentsToItems(),
	);
	const [declarations, setDeclarations] = useState<AdditionalDetailItem[]>(() =>
		mapDeclarationsToItems(),
	);
	const responseCountByType = useMemo(() => {
		return responses.reduce<Record<string, number>>((counts, item) => {
			const key = normalizeDetailTypeValue(item.type);
			counts[key] = (counts[key] ?? 0) + 1;
			return counts;
		}, {});
	}, [responses]);
	const assessmentCountByType = useMemo(() => {
		return assessments.reduce<Record<string, number>>((counts, item) => {
			const key = normalizeDetailTypeValue(item.type);
			counts[key] = (counts[key] ?? 0) + 1;
			return counts;
		}, {});
	}, [assessments]);
	const declarationCountByType = useMemo(() => {
		return declarations.reduce<Record<string, number>>((counts, item) => {
			const key = normalizeDetailTypeValue(item.type);
			counts[key] = (counts[key] ?? 0) + 1;
			return counts;
		}, {});
	}, [declarations]);

	const parseDetailDate = (value: string): Date | null => {
		const match = /^([0-3]\d)\/([0-1]\d)\/(\d{4})$/.exec(value.trim());
		if (!match) {
			return null;
		}

		const day = Number(match[1]);
		const month = Number(match[2]);
		const year = Number(match[3]);
		const parsed = new Date(year, month - 1, day);

		if (
			parsed.getFullYear() !== year ||
			parsed.getMonth() !== month - 1 ||
			parsed.getDate() !== day
		) {
			return null;
		}

		return parsed;
	};

	const formatDetailDate = (value: Date | null): string => {
		if (!value) {
			return "";
		}

		const day = String(value.getDate()).padStart(2, "0");
		const month = String(value.getMonth() + 1).padStart(2, "0");
		const year = String(value.getFullYear());
		return `${day}/${month}/${year}`;
	};

	const [detailDialogVisible, setDetailDialogVisible] = useState(false);
	const [detailDialogCategory, setDetailDialogCategory] =
		useState<AdditionalDetailCategory>("response");
	const [editingDetailId, setEditingDetailId] = useState<string | null>(null);
	const [detailForm, setDetailForm] = useState({
		type: "",
		dateValue: null as Date | null,
		description: "",
		declarationStatus: "" as DeclarationStatus | "",
		hadOfficialWarningOrWeatherAdvisory: false,
		officialWarningAffectedAreas: "",
	});
	const isResponseOperationType =
		detailDialogCategory === "response" &&
		detailForm.type === "response_operation";
	const isDeclarationStatusType =
		detailDialogCategory === "declaration" &&
		detailForm.type === "disaster_declaration";
	const isOfficialWarningType =
		detailDialogCategory === "declaration" &&
		detailForm.type === "official_warning";
	const showDateField =
		!isResponseOperationType &&
		!isDeclarationStatusType &&
		!isOfficialWarningType;
	const hasOfficialWarningAreas =
		detailForm.officialWarningAffectedAreas.trim().length > 0;
	const passesOfficialWarningRule =
		!isOfficialWarningType ||
		!detailForm.hadOfficialWarningOrWeatherAdvisory ||
		hasOfficialWarningAreas;
	const hasDetailType = detailForm.type.trim().length > 0;
	const hasDetailContent = isDeclarationStatusType
		? detailForm.declarationStatus !== ""
		: isOfficialWarningType
			? detailForm.hadOfficialWarningOrWeatherAdvisory ||
				hasOfficialWarningAreas
			: detailForm.description.trim().length > 0 ||
				detailForm.dateValue !== null;
	const canSaveDetail =
		hasDetailType && hasDetailContent && passesOfficialWarningRule;
	const [errors, setErrors] = useState<Errors>({});
	const [visibleModalSubmit, setVisibleModalSubmit] =
		useState<boolean>(false);
	const [selectedHipTypeId, setSelectedHipTypeId] = useState(
		disasterEvent?.hipTypeId ?? "",
	);
	const [selectedHipClusterId, setSelectedHipClusterId] = useState(
		disasterEvent?.hipClusterId ?? "",
	);
	const [selectedHipHazardId, setSelectedHipHazardId] = useState(
		disasterEvent?.hipHazardId ?? "",
	);

	const sortedHipTypes = [...(hip?.types ?? [])].sort((a, b) =>
		a.name.localeCompare(b.name),
	);
	const sortedHipClusters = [...(hip?.clusters ?? [])].sort((a, b) =>
		a.name.localeCompare(b.name),
	);
	const sortedHipHazards = [...(hip?.hazards ?? [])].sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	const filteredHipClusters = sortedHipClusters.filter((cluster) =>
		selectedHipTypeId ? cluster.typeId === selectedHipTypeId : true,
	);

	const filteredHipHazards = sortedHipHazards.filter((hazard) => {
		const matchesCluster =
			!selectedHipClusterId || hazard.clusterId === selectedHipClusterId;
		const matchesType =
			!selectedHipTypeId ||
			sortedHipClusters.some(
				(cluster) =>
					cluster.id === hazard.clusterId &&
					cluster.typeId === selectedHipTypeId,
			);

		return matchesCluster && matchesType;
	});

	const hazardTypeOptions = sortedHipTypes.map((item) => ({
		label: item.name,
		value: item.id,
	}));

	const hazardClusterOptions = filteredHipClusters.map((item) => ({
		label: item.name,
		value: item.id,
	}));

	const specificHazardOptions = filteredHipHazards.map((item) => ({
		label: item.name,
		value: item.id,
	}));

	const handleTypeChange = (typeId: string) => {
		setSelectedHipTypeId(typeId);
		setSelectedHipHazardId("");

		if (!typeId) {
			setSelectedHipClusterId("");
			return;
		}

		if (
			selectedHipClusterId &&
			!sortedHipClusters.some(
				(cluster) =>
					cluster.id === selectedHipClusterId && cluster.typeId === typeId,
			)
		) {
			setSelectedHipClusterId("");
		}
	};

	const handleClusterChange = (clusterId: string) => {
		setSelectedHipClusterId(clusterId);
		setSelectedHipHazardId("");

		if (!clusterId) {
			return;
		}

		const matchedCluster = sortedHipClusters.find(
			(cluster) => cluster.id === clusterId,
		);
		if (matchedCluster) {
			setSelectedHipTypeId(matchedCluster.typeId);
		}
	};

	const selectSpecificHazard = (hazard: HipHazardItem) => {
		setSelectedHipHazardId(hazard.id);

		const matchedCluster = sortedHipClusters.find(
			(cluster) => cluster.id === hazard.clusterId,
		);
		if (matchedCluster) {
			setSelectedHipClusterId(matchedCluster.id);
			setSelectedHipTypeId(matchedCluster.typeId);
		}
	};

	const mockBackendLinkedEvents: LinkedEventOption[] = [
		{ id: "1", name: "Coastal Storm Delta", code: "DE-2024-001" },
		{ id: "2", name: "Industrial Leak - Benzene", code: "HE-2024-003" },
		{ id: "3", name: "Riverbank Flood", code: "FL-2024-011" },
		{ id: "4", name: "Power Grid Failure", code: "IN-2024-008" },
		{ id: "5", name: "Port Fuel Fire", code: "FI-2024-006" },
		{ id: "6", name: "Mountain Landslide", code: "GE-2024-014" },
		{ id: "7", name: "Hospital Oxygen Shortage", code: "HE-2024-017" },
		{ id: "8", name: "Pipeline Rupture - East", code: "IN-2024-021" },
		{ id: "9", name: "Warehouse Chemical Fire", code: "FI-2024-023" },
		{ id: "10", name: "Urban Flash Flood", code: "FL-2024-025" },
		{ id: "11", name: "Bridge Structural Failure", code: "IN-2024-028" },
		{ id: "12", name: "Cyclone Iris", code: "DE-2024-030" },
		{ id: "13", name: "Fuel Depot Explosion", code: "FI-2024-032" },
		{ id: "14", name: "Water Treatment Outage", code: "IN-2024-035" },
		{ id: "15", name: "Drought Escalation", code: "CL-2024-038" },
		{ id: "16", name: "Heatwave Alert Cluster", code: "CL-2024-041" },
		{ id: "17", name: "Cargo Train Derailment", code: "TR-2024-044" },
		{ id: "18", name: "Airport Fuel Spill", code: "TR-2024-046" },
		{ id: "19", name: "Substation Fire", code: "IN-2024-049" },
		{ id: "20", name: "River Contamination", code: "HE-2024-052" },
	];

	const mockBackendLinkedDisasterEvents: LinkedEventOption[] = [
		{ id: "d1", name: "Monsoon Flooding - Northern Basin", code: "DI-2024-101" },
		{ id: "d2", name: "Severe Drought - Central Plains", code: "DI-2024-103" },
		{ id: "d3", name: "Cyclone Aurora", code: "DI-2024-106" },
		{ id: "d4", name: "Earthquake Swarm - Western Ridge", code: "DI-2024-109" },
		{ id: "d5", name: "Volcanic Ash Dispersion", code: "DI-2024-112" },
		{ id: "d6", name: "Cross-Border River Flood", code: "DI-2024-115" },
		{ id: "d7", name: "Seasonal Heatwave Emergency", code: "DI-2024-118" },
		{ id: "d8", name: "Landslide Cluster - Hill District", code: "DI-2024-121" },
		{ id: "d9", name: "Tropical Storm Kendra", code: "DI-2024-124" },
		{ id: "d10", name: "Coastal Surge Impact", code: "DI-2024-127" },
		{ id: "d11", name: "Wildfire Expansion - South Range", code: "DI-2024-130" },
		{ id: "d12", name: "Urban Flood Emergency", code: "DI-2024-133" },
	];

	const mockBackendLinkedDisasterRecords: LinkedEventOption[] = [
		{ id: "r1", name: "Emergency Shelter Activation Record", code: "DR-2024-201" },
		{ id: "r2", name: "Damage Assessment Batch A", code: "DR-2024-204" },
		{ id: "r3", name: "Relief Distribution Log - East", code: "DR-2024-207" },
		{ id: "r4", name: "Casualty Verification Register", code: "DR-2024-210" },
		{ id: "r5", name: "Road Access Clearance Report", code: "DR-2024-213" },
		{ id: "r6", name: "Temporary Housing Intake", code: "DR-2024-216" },
		{ id: "r7", name: "Medical Supply Movement Sheet", code: "DR-2024-219" },
		{ id: "r8", name: "Livelihood Support Request File", code: "DR-2024-222" },
		{ id: "r9", name: "Water Trucking Operations Record", code: "DR-2024-225" },
		{ id: "r10", name: "Flood Barrier Deployment Note", code: "DR-2024-228" },
		{ id: "r11", name: "Power Restoration Tracking File", code: "DR-2024-231" },
		{ id: "r12", name: "Community Incident Consolidation", code: "DR-2024-234" },
	];

	const isStep1Complete =
		form.nameNational.trim().length > 0;

	const readFieldValue = (fieldId: keyof StepperFormState) => {
		const element = document.getElementById(fieldId) as
			| HTMLInputElement
			| HTMLSelectElement
			| HTMLTextAreaElement
			| null;
		if (!element) {
			return form[fieldId];
		}
		return element.value ?? "";
	};

	const saveCurrentFormState = (): StepperFormState => {
		const snapshot: StepperFormState = {
			id: readFieldValue("id"),
			nameNational: readFieldValue("nameNational"),
			nameGlobalOrRegional: readFieldValue("nameGlobalOrRegional"),
			nationalDisasterId: readFieldValue("nationalDisasterId"),
			glide: readFieldValue("glide"),
			recordingInstitution: readFieldValue("recordingInstitution"),
		};

		setForm((current) =>
			JSON.stringify(current) === JSON.stringify(snapshot)
				? current
				: snapshot,
		);

		return snapshot;
	};

	const validateStep1 = (formData: StepperFormState = form) => {
		const nextErrors: Errors = {};
		const startDateValue = toDateWithPrecisionValue(startDateState);
		const endDateValue = toDateWithPrecisionValue(endDateState);

		if (!formData.nameNational.trim()) {
			nextErrors.nameNational = "Name (National) is required";
		}

		if (startDateValue && endDateValue) {
			const startBoundary = toComparableBoundaryDate(startDateState, "start");
			const endBoundary = toComparableBoundaryDate(endDateState, "end");

			if (endBoundary < startBoundary) {
				nextErrors.endDate = "End date cannot be before start date";
			}
		}

		setErrors(nextErrors);
		if (Object.keys(nextErrors).length > 0) {
			requestAnimationFrame(() => {
				const firstInvalidField = requiredFieldOrder.find(
					(fieldName) => !!nextErrors[fieldName],
				);
				if (firstInvalidField) {
					const element = document.getElementById(
						firstInvalidField,
					) as HTMLInputElement | null;
					element?.focus();
					return;
				}

				if (nextErrors.endDate) {
					const endDateElement =
						(document.getElementById("endDateDate") as HTMLInputElement | null) ||
						(document.getElementById("endDateYear") as HTMLInputElement | null) ||
						(document.getElementById("endDateMonth") as HTMLSelectElement | null);
					endDateElement?.focus();
				}
			});
			return false;
		}

		return true;
	};

	const onStepSelect = (event: { index: number }) => {
		const snapshot = saveCurrentFormState();
		if (event.index > 0 && !validateStep1(snapshot)) {
			setActiveStep(0);
			return;
		}

		setActiveStep(event.index);
	};

	const goNext = () => {
		const snapshot = saveCurrentFormState();
		if (validateStep1(snapshot)) {
			setActiveStep(1);
		}
	};

	const goToAdditionalDetails = () => {
		const snapshot = saveCurrentFormState();
		if (validateStep1(snapshot)) {
			setActiveStep(2);
		}
	};

	const goToReview = () => {
		const snapshot = saveCurrentFormState();
		if (validateStep1(snapshot)) {
			setActiveStep(3);
		}
	};

	const saveAsDraft = () => {
		saveCurrentFormState();
	};

	const formatDateForSubmit = (value: Date | null): string => {
		if (!value) {
			return "";
		}

		const day = String(value.getDate()).padStart(2, "0");
		const month = String(value.getMonth() + 1).padStart(2, "0");
		const year = String(value.getFullYear());
		return `${year}-${month}-${day}`;
	};

	const handleSubmitAction = (action: SaveAction, validatorIds?: string) => {
		const tempActionField = document.getElementById(
			"tempAction",
		) as HTMLInputElement | null;
		if (tempActionField) {
			tempActionField.value = action;
		}

		const tempValidatorField = document.getElementById(
			"tempValidatorUserIds",
		) as HTMLInputElement | null;
		if (tempValidatorField) {
			tempValidatorField.value = validatorIds || "";
		}

		const formElement = document.getElementById(
			"disaster-event-stepper-form",
		) as HTMLFormElement | null;
		if (formElement) {
			if (!formElement.checkValidity()) {
				formElement.reportValidity();
				return;
			}

			setVisibleModalSubmit(false);
			formElement.requestSubmit();
		}
	};

	const usersWithValidatorRoleOptions = usersWithValidatorRole.map((userAccount) => ({
		name: `${userAccount.firstName} ${userAccount.lastName}`,
		id: userAccount.id,
		email: userAccount.email,
	}));

	const hiddenFormValues = useMemo(() => {
		const values: Array<{ name: string; value: string }> = [];
		const pushValue = (name: string, value: string | null | undefined) => {
			values.push({ name, value: value ?? "" });
		};

		pushValue("id", form.id);
		pushValue("nameNational", form.nameNational);
		pushValue("nameGlobalOrRegional", form.nameGlobalOrRegional);
		pushValue("nationalDisasterId", form.nationalDisasterId);
		pushValue("glide", form.glide);
		pushValue("recordingInstitution", form.recordingInstitution);
		pushValue("hipTypeId", selectedHipTypeId);
		pushValue("hipClusterId", selectedHipClusterId);
		pushValue("hipHazardId", selectedHipHazardId);
		pushValue("startDate", toDateWithPrecisionValue(startDateState));
		pushValue("endDate", toDateWithPrecisionValue(endDateState));
		pushValue("startDateLocal", startDateLocal);
		pushValue("endDateLocal", endDateLocal);
		pushValue("spatialFootprint", JSON.stringify(spatialFootprintValue ?? []));

		const earlyActions = responses.filter(
			(item) => normalizeDetailTypeValue(item.type) === "early_action",
		);
		for (let index = 0; index < 5; index++) {
			const item = earlyActions[index];
			pushValue(`earlyActionDescription${index + 1}`, item?.description ?? "");
			pushValue(
				`earlyActionDate${index + 1}`,
				item?.date ? formatDateForSubmit(parseDetailDate(item.date)) : "",
			);
		}

		const responseOperation = responses.find(
			(item) => normalizeDetailTypeValue(item.type) === "response_operation",
		);
		pushValue("responseOperations", responseOperation?.description ?? "");

		const assessmentConfigs = [
			{
				type: "rapid_preliminary_assessment",
				descriptionPrefix: "rapidOrPreliminaryAssessmentDescription",
				datePrefix: "rapidOrPreliminaryAssessmentDate",
			},
			{
				type: "post_disaster_assessment",
				descriptionPrefix: "postDisasterAssessmentDescription",
				datePrefix: "postDisasterAssessmentDate",
			},
			{
				type: "other_assessment",
				descriptionPrefix: "otherAssessmentDescription",
				datePrefix: "otherAssessmentDate",
			},
		] as const;

		for (const config of assessmentConfigs) {
			const items = assessments.filter(
				(item) => normalizeDetailTypeValue(item.type) === config.type,
			);
			for (let index = 0; index < 5; index++) {
				const item = items[index];
				pushValue(`${config.descriptionPrefix}${index + 1}`, item?.description ?? "");
				pushValue(
					`${config.datePrefix}${index + 1}`,
					item?.date ? formatDateForSubmit(parseDetailDate(item.date)) : "",
				);
			}
		}

		const declarationStatusItem = declarations.find(
			(item) => normalizeDetailTypeValue(item.type) === "disaster_declaration",
		);
		pushValue(
			"disasterDeclaration",
			declarationStatusItem?.meta?.declarationStatus ?? "",
		);

		const declarationEffects = declarations.filter(
			(item) =>
				normalizeDetailTypeValue(item.type) === "disaster_declaration_effects",
		);
		for (let index = 0; index < 5; index++) {
			const item = declarationEffects[index];
			pushValue(
				`disasterDeclarationTypeAndEffect${index + 1}`,
				item?.description ?? "",
			);
			pushValue(
				`disasterDeclarationDate${index + 1}`,
				item?.date ? formatDateForSubmit(parseDetailDate(item.date)) : "",
			);
		}

		const officialWarning = declarations.find(
			(item) => normalizeDetailTypeValue(item.type) === "official_warning",
		);
		pushValue(
			"hadOfficialWarningOrWeatherAdvisory",
			officialWarning?.meta?.hadOfficialWarningOrWeatherAdvisory ? "true" : "off",
		);
		pushValue(
			"officialWarningAffectedAreas",
			officialWarning?.meta?.officialWarningAffectedAreas ?? "",
		);

		return values;
	}, [
		assessments,
		declarations,
		endDateLocal,
		endDateState,
		form,
		responses,
		selectedHipClusterId,
		selectedHipHazardId,
		selectedHipTypeId,
		spatialFootprintValue,
		startDateLocal,
		startDateState,
	]);

	const renderReviewItem = (label: string, value: string) => (
		<div className="space-y-1">
			<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
				{label}
			</p>
			<p className="text-[14px] leading-[14px] font-semibold text-slate-800">{value || "-"}</p>
		</div>
	);

	const maxDetailItems = 5;
	const maxEarlyActionItems = 5;
	const maxResponseOperationItems = 1;
	const maxDisasterDeclarationItems = 1;
	const maxDisasterDeclarationEffectsItems = 5;
	const maxOfficialWarningItems = 1;
	const detailTypeLabelByValue = useMemo(() => {
		return new Map(
			[
				...responseTypeOptions,
				...assessmentTypeOptions,
				...declarationTypeOptions,
			].map((option) => [
				option.value,
				option.label,
			]),
		);
	}, []);
	const availableAssessmentTypeOptions = useMemo(
		() =>
			assessmentTypeOptions.filter(
				(option) => (assessmentCountByType[option.value] ?? 0) < maxDetailItems,
			),
		[assessmentCountByType],
	);
	const detailTypeOptions = useMemo(() => {
		if (detailDialogCategory === "response") {
			return responseTypeOptions.filter((option) => {
				if (option.value === detailForm.type) {
					return true;
				}
				if (option.value === "early_action") {
					return (responseCountByType.early_action ?? 0) < maxEarlyActionItems;
				}
				if (option.value === "response_operation") {
					return (
						(responseCountByType.response_operation ?? 0) <
						maxResponseOperationItems
					);
				}
				return true;
			});
		}

		if (detailDialogCategory === "assessment") {
			return assessmentTypeOptions.filter(
				(option) =>
					availableAssessmentTypeOptions.some(
						(availableOption) => availableOption.value === option.value,
					) || option.value === detailForm.type,
			);
		}

		return declarationTypeOptions.filter((option) => {
			if (option.value === detailForm.type) {
				return true;
			}

			if (option.value === "disaster_declaration") {
				return (
					(declarationCountByType.disaster_declaration ?? 0) <
					maxDisasterDeclarationItems
				);
			}

			if (option.value === "disaster_declaration_effects") {
				return (
					(declarationCountByType.disaster_declaration_effects ?? 0) <
					maxDisasterDeclarationEffectsItems
				);
			}

			if (option.value === "official_warning") {
				return (
					(declarationCountByType.official_warning ?? 0) <
					maxOfficialWarningItems
				);
			}

			return true;
		});
	}, [
		availableAssessmentTypeOptions,
		detailDialogCategory,
		detailForm.type,
		declarationCountByType,
		maxDisasterDeclarationEffectsItems,
		maxDisasterDeclarationItems,
		maxEarlyActionItems,
		maxOfficialWarningItems,
		maxResponseOperationItems,
		responseCountByType,
	]);
	const canAddAnyResponse =
		(responseCountByType.early_action ?? 0) < maxEarlyActionItems ||
		(responseCountByType.response_operation ?? 0) < maxResponseOperationItems;
	const canAddAnyAssessment = assessmentTypeOptions.some(
		(option) => (assessmentCountByType[option.value] ?? 0) < maxDetailItems,
	);
	const canAddAnyDeclaration =
		(declarationCountByType.disaster_declaration ?? 0) <
			maxDisasterDeclarationItems ||
		(declarationCountByType.disaster_declaration_effects ?? 0) <
			maxDisasterDeclarationEffectsItems ||
		(declarationCountByType.official_warning ?? 0) < maxOfficialWarningItems;
	const reviewSpatialFootprintItems = useMemo(
		() =>
			spatialFootprintValue
				.filter((item) => Boolean(item))
				.map((item, index) => {
					const title =
						typeof item?.title === "string" ? item.title.trim() : "";
					return title || `Spatial footprint ${index + 1}`;
				}),
		[spatialFootprintValue],
	);

	const openAddDetail = (category: AdditionalDetailCategory) => {
		if (category === "response" && !canAddAnyResponse) {
			return;
		}

		if (category === "assessment" && !canAddAnyAssessment) {
			return;
		}

		if (category === "declaration" && !canAddAnyDeclaration) {
			return;
		}

		let defaultType = "";
		if (category === "response") {
			defaultType =
				responseTypeOptions.find((option) => {
					if (option.value === "early_action") {
						return (responseCountByType.early_action ?? 0) < maxEarlyActionItems;
					}
					if (option.value === "response_operation") {
						return (
							(responseCountByType.response_operation ?? 0) <
							maxResponseOperationItems
						);
					}
					return false;
				})?.value ?? "";
		} else if (category === "assessment") {
			defaultType = availableAssessmentTypeOptions[0]?.value ?? "";
		} else if (category === "declaration") {
			defaultType =
				declarationTypeOptions.find((option) => {
					if (option.value === "disaster_declaration") {
						return (
							(declarationCountByType.disaster_declaration ?? 0) <
							maxDisasterDeclarationItems
						);
					}

					if (option.value === "disaster_declaration_effects") {
						return (
							(declarationCountByType.disaster_declaration_effects ?? 0) <
							maxDisasterDeclarationEffectsItems
						);
					}

					if (option.value === "official_warning") {
						return (
							(declarationCountByType.official_warning ?? 0) <
							maxOfficialWarningItems
						);
					}

					return false;
				})?.value ?? "";
		}

		setDetailDialogCategory(category);
		setEditingDetailId(null);
		setDetailForm({
			type: defaultType,
			dateValue: null,
			description: "",
			declarationStatus: "",
			hadOfficialWarningOrWeatherAdvisory: false,
			officialWarningAffectedAreas: "",
		});
		setDetailDialogVisible(true);
	};

	const openEditDetail = (category: AdditionalDetailCategory, item: AdditionalDetailItem) => {
		setDetailDialogCategory(category);
		setEditingDetailId(item.id);
		const normalizedType = normalizeDetailTypeValue(item.type);
		setDetailForm({
			type: normalizedType,
			dateValue:
				category === "response" && normalizedType === "response_operation"
					? null
					: category === "declaration" && normalizedType !== "disaster_declaration_effects"
					? null
					: parseDetailDate(item.date),
			description: item.description,
			declarationStatus:
				category === "declaration" && normalizedType === "disaster_declaration"
					? item.meta?.declarationStatus ?? ""
					: "",
			hadOfficialWarningOrWeatherAdvisory:
				category === "declaration" && normalizedType === "official_warning"
					? Boolean(item.meta?.hadOfficialWarningOrWeatherAdvisory)
					: false,
			officialWarningAffectedAreas:
				category === "declaration" && normalizedType === "official_warning"
					? item.meta?.officialWarningAffectedAreas ?? item.description
					: "",
		});
		setDetailDialogVisible(true);
	};

	const saveDetail = () => {
		if (!canSaveDetail) {
			return;
		}

		const trimmedType = detailForm.type.trim();
		const trimmedDescription = detailForm.description.trim();

		const targetCategory = detailDialogCategory;
		const setTarget =
			targetCategory === "response"
				? setResponses
				: targetCategory === "assessment"
					? setAssessments
					: setDeclarations;
		const declarationMeta: AdditionalDetailMeta | undefined =
			targetCategory === "declaration"
				? {
					declarationStatus: isDeclarationStatusType
						? (detailForm.declarationStatus as DeclarationStatus)
						: undefined,
					hadOfficialWarningOrWeatherAdvisory: isOfficialWarningType
						? detailForm.hadOfficialWarningOrWeatherAdvisory
						: undefined,
					officialWarningAffectedAreas: isOfficialWarningType
						? detailForm.officialWarningAffectedAreas.trim()
						: undefined,
				}
				: undefined;
		const nextItem: AdditionalDetailItem = {
			id: editingDetailId ?? `${targetCategory}-${Date.now()}`,
			type: trimmedType,
			date:
				targetCategory === "response" && trimmedType === "response_operation"
					? ""
					: targetCategory === "declaration" && trimmedType !== "disaster_declaration_effects"
					? ""
					: formatDetailDate(detailForm.dateValue),
			description:
				targetCategory === "declaration" && trimmedType === "disaster_declaration"
					? ""
					: targetCategory === "declaration" && trimmedType === "official_warning"
						? detailForm.officialWarningAffectedAreas.trim()
						: trimmedDescription,
			meta: declarationMeta,
		};

		setTarget((prev) => {
			if (editingDetailId) {
				return prev.map((item) => (item.id === editingDetailId ? nextItem : item));
			}

			if (targetCategory === "response") {
				if (nextItem.type === "early_action") {
					const earlyActionCount = prev.filter(
						(item) => normalizeDetailTypeValue(item.type) === "early_action",
					).length;
					if (earlyActionCount >= maxEarlyActionItems) {
						return prev;
					}
				}

				if (nextItem.type === "response_operation") {
					const responseOperationCount = prev.filter(
						(item) =>
							normalizeDetailTypeValue(item.type) ===
							"response_operation",
					).length;
					if (responseOperationCount >= maxResponseOperationItems) {
						return prev;
					}
				}
			} else if (targetCategory === "assessment") {
				const nextTypeCount = prev.filter(
					(item) => normalizeDetailTypeValue(item.type) === nextItem.type,
				).length;
				if (nextTypeCount >= maxDetailItems) {
					return prev;
				}
			} else {
				if (nextItem.type === "disaster_declaration") {
					const nextTypeCount = prev.filter(
						(item) =>
							normalizeDetailTypeValue(item.type) === "disaster_declaration",
					).length;
					if (nextTypeCount >= maxDisasterDeclarationItems) {
						return prev;
					}
				}

				if (nextItem.type === "disaster_declaration_effects") {
					const nextTypeCount = prev.filter(
						(item) =>
							normalizeDetailTypeValue(item.type) ===
							"disaster_declaration_effects",
					).length;
					if (nextTypeCount >= maxDisasterDeclarationEffectsItems) {
						return prev;
					}
				}

				if (nextItem.type === "official_warning") {
					const nextTypeCount = prev.filter(
						(item) => normalizeDetailTypeValue(item.type) === "official_warning",
					).length;
					if (nextTypeCount >= maxOfficialWarningItems) {
						return prev;
					}
				}
			}

			return [...prev, nextItem];
		});

		setDetailDialogVisible(false);
	};

	const deleteDetail = () => {
		if (!editingDetailId) {
			return;
		}

		const setTarget =
			detailDialogCategory === "response"
				? setResponses
				: detailDialogCategory === "assessment"
					? setAssessments
					: setDeclarations;
		setTarget((prev) => prev.filter((item) => item.id !== editingDetailId));
		setDetailDialogVisible(false);
	};

	const renderDetailCard = (category: AdditionalDetailCategory, item: AdditionalDetailItem) => {
		const badgeClass =
			category === "response"
				? "bg-blue-100 text-blue-700"
				: category === "assessment"
					? "bg-violet-100 text-violet-700"
					: "bg-amber-100 text-amber-700";
		const typeLabel =
			detailTypeLabelByValue.get(normalizeDetailTypeValue(item.type)) ??
			item.type;
		const descriptionValue = getDetailDescriptionValue(item);

		return (
			<Card
				key={item.id}
				className="rounded-2xl border border-slate-200 shadow-none"
				pt={{ body: { style: { padding: "14px 16px" } } }}
			>
				<div className="flex items-start justify-between gap-3">
					<div className="w-full">
						<div className="flex items-center gap-3">
							<span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${badgeClass}`}>
								{typeLabel}
							</span>
							{item.date ? (
								<span className="text-[12px] text-slate-500">{item.date}</span>
							) : null}
						</div>
						<p className="mt-1 text-[14px] text-slate-500">
							{descriptionValue
								? (() => {
									const lines = descriptionValue.split("\n");
									return lines.map((line, index) => (
										<span key={`${item.id}-line-${index}`}>
											{line}
											{index < lines.length - 1 ? <br /> : null}
										</span>
									));
								})()
								: "-"}
						</p>
					</div>
					<Button
						type="button"
						icon="pi pi-pencil"
						text
						rounded
						aria-label="Edit"
						onClick={() => openEditDetail(category, item)}
					/>
				</div>
			</Card>
		);
	};

	function getDetailDescriptionValue(item: AdditionalDetailItem): string {
		if (item.type === "disaster_declaration") {
			return `Disaster declaration: ${
				declarationStatusOptions.find(
					(option) => option.value === item.meta?.declarationStatus,
				)?.label ?? "-"
			}`;
		}

		if (item.type === "official_warning") {
			return [
				`Was there an officially issued warning and/or weather advisory?: ${
					item.meta?.hadOfficialWarningOrWeatherAdvisory ? "Yes" : "No"
				}`,
				`Which affected areas were covered by the warning?: ${
					item.meta?.officialWarningAffectedAreas || "-"
				}`,
			].join("\n");
		}

		return item.description;
	}

	const renderStep4DetailRow = (category: AdditionalDetailCategory, item: AdditionalDetailItem) => {
		const badgeClass =
			category === "response"
				? "bg-blue-100 text-blue-700"
				: category === "assessment"
					? "bg-violet-100 text-violet-700"
					: "bg-amber-100 text-amber-700";
		const typeLabel =
			detailTypeLabelByValue.get(normalizeDetailTypeValue(item.type)) ??
			item.type;
		const descriptionValue = getDetailDescriptionValue(item);

		return (
			<div key={item.id} className="space-y-2">
				<div className="flex items-center gap-3">
					<span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${badgeClass}`}>
						{typeLabel}
					</span>
					{item.date ? (
						<span className="text-[12px] text-slate-500">{item.date}</span>
					) : null}
				</div>
				{descriptionValue ? (
					<p className="text-[14px] text-slate-500">
						{descriptionValue.split(/\r?\n/).map((line, index, lines) => (
							<span key={`${item.id}-review-line-${index}`}>
								{line}
								{index < lines.length - 1 ? <br /> : null}
							</span>
						))}
					</p>
				) : null}
			</div>
		);
	};

	const renderStep4SectionCard = (
		title: string,
		iconClass: string,
		emptyLabel: string,
		content: React.ReactNode,
		hasItems: boolean,
	) => (
		<Card className="rounded-2xl border border-slate-200 shadow-none" pt={{ body: { style: { padding: "18px 20px" } } }}>
			<div className="space-y-4">
				<div className="flex items-center gap-2 text-slate-800">
					<i className={iconClass} />
					<h4 className="text-[18px] leading-[24px] font-semibold">{title}</h4>
				</div>
				{hasItems ? (
					<div className="space-y-5">{content}</div>
				) : (
					<p className="text-[14px] italic text-slate-400">{emptyLabel}</p>
				)}
			</div>
		</Card>
	);

	const renderEmptyDetails = (label: string) => (
		<div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center text-[13px] text-slate-400">
			{label}
		</div>
	);

	const searchLinkedEvents = async (query: string) => {
		setLinkedEventLoading(true);

		await new Promise((resolve) => setTimeout(resolve, 450));

		const lowerQuery = query.trim().toLowerCase();
		const matched = mockBackendLinkedEvents.filter((item) => {
			if (!lowerQuery) {
				return true;
			}

			return (
				item.name.toLowerCase().includes(lowerQuery) ||
				item.code.toLowerCase().includes(lowerQuery)
			);
		});

		setLinkedEventSource(
			matched
				.filter(
					(item) => !linkedEventTarget.some((selected) => selected.id === item.id),
				)
				.slice(0, 10),
		);
		setLinkedEventLoading(false);
	};

	const searchLinkedDisasterEvents = async (query: string) => {
		setLinkedDisasterEventLoading(true);

		await new Promise((resolve) => setTimeout(resolve, 450));

		const lowerQuery = query.trim().toLowerCase();
		const matched = mockBackendLinkedDisasterEvents.filter((item) => {
			if (!lowerQuery) {
				return true;
			}

			return (
				item.name.toLowerCase().includes(lowerQuery) ||
				item.code.toLowerCase().includes(lowerQuery)
			);
		});

		setLinkedDisasterEventSource(
			matched
				.filter(
					(item) => !linkedDisasterEventTarget.some((selected) => selected.id === item.id),
				)
				.slice(0, 10),
		);
		setLinkedDisasterEventLoading(false);
	};

	const searchLinkedDisasterRecords = async (query: string) => {
		setLinkedDisasterRecordLoading(true);

		await new Promise((resolve) => setTimeout(resolve, 450));

		const lowerQuery = query.trim().toLowerCase();
		const matched = mockBackendLinkedDisasterRecords.filter((item) => {
			if (!lowerQuery) {
				return true;
			}

			return (
				item.name.toLowerCase().includes(lowerQuery) ||
				item.code.toLowerCase().includes(lowerQuery)
			);
		});

		setLinkedDisasterRecordSource(
			matched
				.filter(
					(item) => !linkedDisasterRecordTarget.some((selected) => selected.id === item.id),
				)
				.slice(0, 10),
		);
		setLinkedDisasterRecordLoading(false);
	};

	const linkedEventItemTemplate = (item: LinkedEventOption) => (
		<div>
			<p className="font-semibold text-slate-700">{item.name}</p>
			<p className="text-sm text-slate-500">{item.code}</p>
		</div>
	);

	const openSpatialDialog = () => {
		setSpatialFootprintDialogVisible(true);
	};

	useEffect(() => {
		firstNameTooltipRef.current?.updateTargetEvents();
	}, [activeStep]);

	useEffect(() => {
		searchLinkedEvents("");
		searchLinkedDisasterEvents("");
		searchLinkedDisasterRecords("");
	}, []);

	return (<>
		<div className="card flex justify-content-center">
			<SaveSubmitDialog
				ctx={ctx}
				visible={visibleModalSubmit}
				onHide={() => setVisibleModalSubmit(false)}
				onSubmit={handleSubmitAction}
				usersWithValidatorRole={usersWithValidatorRoleOptions}
				userRole={user?.role ?? undefined}
			/>
		</div>
		<style>{`
			.status-stepper .p-stepper-title::after {
				content: attr(data-status);
				display: block;
				margin-top: 2px;
				font-size: 12px;
				line-height: 16px;
				font-weight: 600;
				letter-spacing: 0.06em;
				text-transform: uppercase;
				color: #94a3b8;
			}

			.status-stepper .p-stepper-title[data-status="required"]::after {
				color: #94a3b8;
			}

			.status-stepper .p-stepper-title[data-status="optional"]::after {
				color: #9ca3af;
			}

			.status-stepper .p-stepper-nav {
				position: relative;
				padding: 30px 0;
				margin: 6px 0 16px;
			}

			.status-stepper .p-stepper-nav::before,
			.status-stepper .p-stepper-nav::after {
				content: "";
				position: absolute;
				left: 0;
				right: 0;
				height: 1px;
				background: #e2e8f0;
			}

			.status-stepper .p-stepper-nav::before {
				top: 0;
			}

			.status-stepper .p-stepper-nav::after {
				bottom: 0;
			}
		`}</style>
		<div className="mg-container">
			<section className="dts-page-section">
				<RouterForm id="disaster-event-stepper-form" method="post">
					<input
						type="hidden"
						id="tempValidatorUserIds"
						name="tempValidatorUserIds"
					/>
					<input type="hidden" id="tempAction" name="tempAction" />
					{hiddenFormValues.map((field) => (
						<input
							key={field.name}
							type="hidden"
							name={field.name}
							value={field.value}
						/>
					))}
				<div className="mb-4">
					<div className="flex items-center justify-between px-4 py-2">
						<h2 className="text-[16px] font-semibold text-slate-800">
							{ctx.t({
								code: "disaster_event.edit",
								msg: "Edit disaster event",
							})}
						</h2>
						<Button
							type="button"
							icon="pi pi-times"
							text
							aria-label="Close"
							onClick={() => document.location.href = ctx.url("/disaster-event")}
						/>
					</div>
				</div>


				
				<Tooltip
					ref={firstNameTooltipRef}
					target=".first-name-tooltip"
					content="Enter the person's given name as shown on official records."
				/>
				<Stepper
					className="status-stepper"
					activeStep={activeStep}
					onChangeStep={onStepSelect}
					headerPosition="bottom"
					pt={{
						stepperpanel: {
							action: ({ context }: { context: { index: number } }) => ({
								disabled: context.index > 0 && !isStep1Complete,
								"aria-disabled": context.index > 0 && !isStep1Complete,
							}),
						},
					}}
				>
					<StepperPanel
						header="Basic Information"
						pt={{
							title: {
								style: { textAlign: "center" },
								"data-status": "required",
							},
						}}
					>
						<div className="grid grid-cols-12 gap-4">
							<div className="col-span-12 mb-4">
								<h2 className="text-[18px] leading-[24px] font-semibold text-slate-800 tracking-[-0.01em]">
									Event basics
								</h2>
								<p className="mt-2 text-[14px] leading-[22px] text-slate-500">
									General information about the disaster event.
								</p>
							</div>

							<div className="col-span-12 grid grid-cols-12 gap-4">
								<div className="col-span-12 md:col-span-4">
									<label htmlFor="nameNational" className="mb-1 inline-flex items-center gap-2">
										<span className="text-red-500">*</span> Disaster name - national
									</label>
									<InputText
										id="nameNational"
										name="nameNational"
										defaultValue={form.nameNational}
										placeholder="For example, Hurricane Mitch"
										className="w-full"
										required={true}
									/>
									{errors.nameNational ? (
										<p className="mt-1 text-xs text-red-600">{errors.nameNational}</p>
									) : null}
								</div>

								<div className="col-span-12 md:col-span-4">
									<label htmlFor="nameGlobalOrRegional" className="mb-1 inline-flex items-center gap-2">
										Disaster name - Other (Global or Regional)
									</label>
									<InputText
										id="nameGlobalOrRegional"
										name="nameGlobalOrRegional"
										defaultValue={form.nameGlobalOrRegional}
										placeholder="Add event name"
										className="w-full"
									/>
								</div>

								<div className="col-span-12 md:col-span-4">
									<label htmlFor="nationalDisasterId" className="mb-1 inline-flex items-center gap-2">
										National event ID
									</label>
									<InputText
										id="nationalDisasterId"
										name="nationalDisasterId"
										defaultValue={form.nationalDisasterId}
										placeholder="Add event ID"
										className="w-full"
									/>
								</div>

								<div className="col-span-12 md:col-span-4">
									<label htmlFor="glide" className="mb-1 inline-flex items-center gap-2">
										<span className="inline-flex items-center gap-1">
											GLIDE number
											<i className="pi pi-info-circle text-xs text-slate-400" aria-hidden="true" />
										</span>
									</label>
									<InputText
										id="glide"
										name="glide"
										defaultValue={form.glide}
										placeholder="Add GLIDE number"
										className="w-full"
									/>
								</div>

								<div className="col-span-12 md:col-span-4">
									<label htmlFor="disasterEventId" className="mb-1 inline-flex items-center gap-2">
										Disaster event UUID
									</label>
									<div className="flex items-center gap-2">
										<InputText
											id="id"
											name="id"
											defaultValue={form.id}
											readOnly
											className="w-full"
										/>
	

										<Button
											type="button"
											icon="pi pi-copy"
											text
											rounded
											aria-label="Copy disaster event UUID"
											onClick={() => navigator.clipboard.writeText(form.id.toString())}
										/>
									</div>
								</div>

								<div className="col-span-12 md:col-span-4">
									<label htmlFor="recordingInstitution" className="mb-1 inline-flex items-center gap-2">
										Recording organisation
									</label>
									<InputText
										id="recordingInstitution"
										name="recordingInstitution"
										defaultValue={form.recordingInstitution}
										className="w-full"
									/>
								</div>
							</div>

							<div className="col-span-12 my-6 border-t border-slate-200" />

							<div className="col-span-12 mb-4">
								<h2 className="text-[18px] leading-[24px] font-semibold text-slate-800 tracking-[-0.01em]">
									Hazard and timing
								</h2>
								<p className="mt-2 text-[14px] leading-[22px] text-slate-500">
									Detailed information regarding the observed hazards and timing.
								</p>
							</div>

							<div className="col-span-12 grid grid-cols-12 gap-4">
								<div className="col-span-12 md:col-span-4">
									<label htmlFor="hazardTypeObserved" className="mb-1 inline-flex items-center gap-2">
										Hazard type (observed) <i className="pi pi-info-circle ml-1 text-xs text-slate-400" aria-hidden="true" />
									</label>
									<Dropdown
										id="hazardTypeObserved"
										value={selectedHipTypeId || null}
										options={hazardTypeOptions}
										onChange={(event) =>
											handleTypeChange(
												typeof event.value === "string" ? event.value : "",
											)
										}
										placeholder="Select hazard type"
										className="w-full"
										filter
										filterBy="label"
										showClear
									/>
									<input type="hidden" name="hipTypeId" value={selectedHipTypeId} />
								</div>

								<div className="col-span-12 md:col-span-4">
									<label htmlFor="hazardClusterObserved" className="mb-1 inline-flex items-center gap-2">
										Hazard cluster (observed) <i className="pi pi-info-circle ml-1 text-xs text-slate-400" aria-hidden="true" />
									</label>
									<Dropdown
										id="hazardClusterObserved"
										value={selectedHipClusterId || null}
										options={hazardClusterOptions}
										onChange={(event) =>
											handleClusterChange(
												typeof event.value === "string" ? event.value : "",
											)
										}
										placeholder="Select hazard cluster"
										className="w-full"
										filter
										filterBy="label"
										showClear
									/>
									<input type="hidden" name="hipClusterId" value={selectedHipClusterId} />
								</div>

								<div className="col-span-12 md:col-span-4">
									<label htmlFor="specificHazardObserved" className="mb-1 inline-flex items-center gap-2">
										Specific hazard (observed) <i className="pi pi-info-circle ml-1 text-xs text-slate-400" aria-hidden="true" />
									</label>
									<Dropdown
										id="specificHazardObserved"
										value={selectedHipHazardId || null}
										options={specificHazardOptions}
										onChange={(event) => {
											const hazardId =
												typeof event.value === "string" ? event.value : "";
											if (!hazardId) {
												setSelectedHipHazardId("");
												return;
											}

											const selectedHazard = sortedHipHazards.find(
												(item) => item.id === hazardId,
											);
											if (selectedHazard) {
												selectSpecificHazard(selectedHazard);
											}
										}}
										placeholder="Enter hazard name or HIPS code"
										className="w-full"
										filter
										filterBy="label"
										virtualScrollerOptions={{ itemSize: 38 }}
										showClear
									/>
									<input type="hidden" name="hipHazardId" value={selectedHipHazardId} />
								</div>

								<div className="col-span-12">
									<div className="grid grid-cols-12 gap-4">
										{renderDateWithPrecision(
											"startDate",
											"Start date",
											startDateState,
											setStartDateState,
										)}
										{renderDateWithPrecision(
											"endDate",
											"End date",
											endDateState,
											setEndDateState,
											errors.endDate,
										)}

										<div className="col-span-12 md:col-span-6">
											<label htmlFor="startDateLocal" className="mb-1 inline-flex items-center gap-2">
												Start date in local format
											</label>
											<InputText
												id="startDateLocal"
												name="startDateLocal"
												value={startDateLocal}
												onChange={(event) => setStartDateLocal(event.target.value)}
												className="w-full"
											/>
										</div>

										<div className="col-span-12 md:col-span-6">
											<label htmlFor="endDateLocal" className="mb-1 inline-flex items-center gap-2">
												End date in local format
											</label>
											<InputText
												id="endDateLocal"
												name="endDateLocal"
												value={endDateLocal}
												onChange={(event) => setEndDateLocal(event.target.value)}
												className="w-full"
											/>
										</div>

										<input
											type="hidden"
											name="startDate"
											value={toDateWithPrecisionValue(startDateState)}
										/>
										<input
											type="hidden"
											name="endDate"
											value={toDateWithPrecisionValue(endDateState)}
										/>
									</div>
								</div>
							</div>

							<div className="col-span-12 my-6 border-t border-slate-200" />

							<div className="col-span-12 mb-2">
								<h2 className="text-[18px] leading-[24px] font-semibold text-slate-800 tracking-[-0.01em]">
									Disaster event spatial information
								</h2>
								<p className="mt-2 text-[14px] leading-[22px] text-slate-500">
									Indicate the geographic areas where the disaster event was experienced.
								</p>
							</div>

							<div className="col-span-12 space-y-4">
								<div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
									<div className="flex items-start justify-between gap-4">
										<div>
											<div className="flex items-center gap-2">
												<i className="pi pi-map-marker text-blue-500" />
												<h3 className="text-[18px] font-semibold text-slate-800">Geographical level</h3>
											</div>
											<p className="mt-2 text-[14px] leading-[22px] text-slate-500">
												Select the administrative areas where the disaster event was experienced.
											</p>
											<Button
												type="button"
												className="mt-4"
												label="Add affected areas"
												outlined
												icon="pi pi-plus"
												onClick={openSpatialDialog}
											/>
											<div className="mt-6 flex flex-wrap gap-2 text-sm">
												{selectedDivisionItems.length > 0 &&
													selectedDivisionItems.map((item) => (
														<div
															key={item.key}
															className="inline-flex items-center gap-2 rounded-md bg-sky-100 px-3 py-2 text-sky-700"
														>
															<span>{item.label}</span>
															<button
																type="button"
																aria-label={`Remove ${item.label}`}
																onClick={() => removeDivisionSelection(item.key)}
																className="cursor-pointer text-sky-700 transition hover:text-sky-900"
															>
																×
															</button>
														</div>
													))}
											</div>
										</div>
										<i className="pi pi-chevron-right pt-2 text-slate-400" />
									</div>
								</div>

								<SpatialFootprintFormView2
									ctx={ctx}
									divisions={
										Array.isArray(divisionGeoJSON) ? divisionGeoJSON : []
									}
									ctryIso3={ctryIso3 || ""}
									initialData={spatialFootprintValue}
									onChange={(items) => {
										setSpatialFootprintValue(Array.isArray(items) ? items : []);
									}}
								/>
									

								
							</div>

							<Dialog
								header="Select geographic levels"
								visible={spatialFootprintDialogVisible}
								style={{ width: "72rem", maxWidth: "95vw" }}
								onHide={() => setSpatialFootprintDialogVisible(false)}
								draggable={false}
								resizable={false}
								appendTo="self"
							>
								<div>
									<p className="mb-4 text-[13px] text-slate-500">
										Select one or more geographic levels from the hierarchical tree below.
									</p>
									<div className="mb-3 flex items-center gap-3">
										<div className="relative w-full">
											<i className="pi pi-search pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
											<InputText
												value={divisionSearchTerm}
												onChange={(event) => setDivisionSearchTerm(event.target.value)}
												placeholder="Search locations..."
												className="w-full pr-10"
											/>
										</div>
									</div>
									<div className="mb-3 flex items-center justify-between rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-slate-700">
										<div>
											{selectedDivisionCount} location
											{selectedDivisionCount === 1 ? " selected" : "s selected"}
										</div>
										<Button
											type="button"
											label="Clear all"
											text
											size="small"
											onClick={clearDivisionSelection}
										/>
									</div>
									<div className="max-h-[26rem] overflow-auto rounded-md border border-slate-200 bg-white p-3 shadow-sm">
										<Tree
											value={filteredDivisionNodes}
											selectionMode="checkbox"
											selectionKeys={selectedDivisionKeys}
											onSelectionChange={(e) =>
												setSelectedDivisionKeys(e.value)
											}
											className="w-full"
										/>
									</div>
								</div>
							</Dialog>
						</div>


						

						<div className="flex items-center justify-between w-full mt-6">
							<Button
								type="button"
								label="Cancel"
								outlined
								onClick={() => document.location.href = ctx.url("/disaster-event")}
							/>
							<div className="flex gap-2">
								<Button
									type="button"
									label="Save as draft"
									outlined
									onClick={saveAsDraft}
								/>
								<Button
									type="button"
									label="Next"
									icon="pi pi-chevron-right"
									iconPos="right"
									onClick={goNext}
								/>
							</div>
						</div>
					</StepperPanel>

					<StepperPanel
						header="Linked events"
						pt={{
							title: {
								style: { textAlign: "center" },
								"data-status": "optional",
							},
						}}
					>
						<div className="col-span-12 mb-4">
							<h2 className="text-[18px] leading-[24px] font-semibold text-slate-800 tracking-[-0.01em]">
								Linked hazardous events
							</h2>
							<p className="mt-2 text-[14px] leading-[22px] text-slate-500">
								Link this disaster event to triggered hazardous events.
							</p>
						</div>
						<div className="space-y-4">
							<div>
								<div className="mt-2 flex gap-3">
									<div className="relative w-full">
										<i className="pi pi-search pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
										<InputText
											id="linkedEventSearch"
											value={linkedEventSearch}
											onChange={(event) => setLinkedEventSearch(event.target.value)}
											placeholder="Type to search hazardous events..."
											className="w-full pr-10"
										/>
									</div>
									<Button
										type="button"
										label={linkedEventLoading ? "Searching..." : "Search"}
										onClick={() => searchLinkedEvents(linkedEventSearch)}
										disabled={linkedEventLoading}
									/>
								</div>
							</div>

							<PickList
								dataKey="id"
								source={linkedEventSource}
								target={linkedEventTarget}
								onChange={(event) => {
									setLinkedEventSource(event.source);
									setLinkedEventTarget(event.target);
								}}
								itemTemplate={linkedEventItemTemplate}
								sourceHeader="Latest 10 hazardous events / Search results "
								targetHeader="Selected triggered (subsequent hazardous events)"
								sourceStyle={{ height: "18rem" }}
								targetStyle={{ height: "18rem" }}
								showSourceFilter={false}
								showTargetFilter={false}
							/>
						</div>
						
						<div className="col-span-12 mb-4 mt-8">
							<h2 className="text-[18px] leading-[24px] font-semibold text-slate-800 tracking-[-0.01em]">
								Linked disaster events
							</h2>
							<p className="mt-2 text-[14px] leading-[22px] text-slate-500">
								Link this disaster event to triggered disaster events.
							</p>
						</div>
						<div className="space-y-4">

							<div className="pt-4">
								<div className="mt-2 flex gap-3">
									<div className="relative w-full">
										<i className="pi pi-search pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
										<InputText
											id="linkedDisasterEventSearch"
											value={linkedDisasterEventSearch}
											onChange={(event) => setLinkedDisasterEventSearch(event.target.value)}
											placeholder="Type to search disaster events..."
											className="w-full pr-10"
										/>
									</div>
									<Button
										type="button"
										label={linkedDisasterEventLoading ? "Searching..." : "Search"}
										onClick={() => searchLinkedDisasterEvents(linkedDisasterEventSearch)}
										disabled={linkedDisasterEventLoading}
									/>
								</div>
							</div>

							<PickList
								dataKey="id"
								source={linkedDisasterEventSource}
								target={linkedDisasterEventTarget}
								onChange={(event) => {
									setLinkedDisasterEventSource(event.source);
									setLinkedDisasterEventTarget(event.target);
								}}
								itemTemplate={linkedEventItemTemplate}
								sourceHeader="Latest 10 disaster events / Search results"
								targetHeader="Selected  triggered (subsequent disaster events)"
								sourceStyle={{ height: "18rem" }}
								targetStyle={{ height: "18rem" }}
								showSourceFilter={false}
								showTargetFilter={false}
							/>
						</div>

						<div className="col-span-12 mb-4 mt-8">
							<h2 className="text-[18px] leading-[24px] font-semibold text-slate-800 tracking-[-0.01em]">
								Linked disaster records
							</h2>
							<p className="mt-2 text-[14px] leading-[22px] text-slate-500">
								Link this disaster event to related disaster records.
							</p>
						</div>
						<div className="space-y-4">
							<div className="pt-4">
								<div className="mt-2 flex gap-3">
									<div className="relative w-full">
										<i className="pi pi-search pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
										<InputText
											id="linkedDisasterRecordSearch"
											value={linkedDisasterRecordSearch}
											onChange={(event) => setLinkedDisasterRecordSearch(event.target.value)}
											placeholder="Type to search disaster records..."
											className="w-full pr-10"
										/>
									</div>
									<Button
										type="button"
										label={linkedDisasterRecordLoading ? "Searching..." : "Search"}
										onClick={() => searchLinkedDisasterRecords(linkedDisasterRecordSearch)}
										disabled={linkedDisasterRecordLoading}
									/>
								</div>
							</div>

							<PickList
								dataKey="id"
								source={linkedDisasterRecordSource}
								target={linkedDisasterRecordTarget}
								onChange={(event) => {
									setLinkedDisasterRecordSource(event.source);
									setLinkedDisasterRecordTarget(event.target);
								}}
								itemTemplate={linkedEventItemTemplate}
								sourceHeader="Latest 10 disaster records / Search results"
								targetHeader="Selected linked disaster records"
								sourceStyle={{ height: "18rem" }}
								targetStyle={{ height: "18rem" }}
								showSourceFilter={false}
								showTargetFilter={false}
							/>
						</div>

						<div className="flex items-center justify-between w-full mt-6">
							<Button
								type="button"
								label="Cancel"
								outlined
								onClick={() => (document.location.href = ctx.url("/disaster-event"))}
							/>
							<div className="flex gap-2">
								<Button
									type="button"
									label="Save as draft"
									outlined
									onClick={saveAsDraft}
								/>
								<Button
									type="button"
									label="Back"
									outlined
									icon="pi pi-chevron-left"
									iconPos="left"
									onClick={() => {
										saveCurrentFormState();
										setActiveStep(0);
									}}
								/>
								<Button
									type="button"
									label="Next"
									icon="pi pi-chevron-right"
									iconPos="right"
									onClick={goToAdditionalDetails}
								/>
							</div>
						</div>
					</StepperPanel>

					<StepperPanel
						header="Additional details"
						pt={{
							title: {
								style: { textAlign: "center" },
								"data-status": "optional",
							},
						}}
					>
						<div>
							<h3 className="text-[18px] leading-[24px] font-semibold text-slate-800">Additional details</h3>
							<p className="mt-2 text-[14px] text-slate-500">
								Document responses, assessments, and official declarations related to this disaster event.
							</p>

							<div className="mt-8 flex items-start justify-between gap-4">
								<div className="flex items-start gap-3">
									<div className="rounded-xl bg-blue-100 p-2">
										<i className="pi pi-file-edit text-blue-600" />
									</div>
									<div>
										<h4 className="text-[18px] leading-[24px] font-semibold text-slate-800">Responses</h4>
										<p className="text-[14px] text-slate-500">Track early actions and response operations</p>
									</div>
								</div>
								<Button
									type="button"
									label="Add response"
									icon="pi pi-plus"
									outlined
									disabled={!canAddAnyResponse}
									onClick={() => openAddDetail("response")}
								/>
							</div>

							{responses.length > 0 ? (
								<div className="mt-4 space-y-3">
									{responses.map((item) => renderDetailCard("response", item))}
								</div>
							) : (
								renderEmptyDetails("No responses recorded yet")
							)}

							<div className="my-8 border-t border-slate-200" />

							<div className="flex items-start justify-between gap-4">
								<div className="flex items-start gap-3">
									<div className="rounded-xl bg-violet-100 p-2">
										<i className="pi pi-clipboard text-violet-600" />
									</div>
									<div>
										<h4 className="text-[18px] leading-[24px] font-semibold text-slate-800">Assessments</h4>
										<p className="text-[14px] text-slate-500">Document needs assessments and evaluations</p>
									</div>
								</div>
								<Button
									type="button"
									label="Add assessment"
									icon="pi pi-plus"
									outlined
									disabled={!canAddAnyAssessment}
									onClick={() => openAddDetail("assessment")}
								/>
							</div>

							{assessments.length > 0 ? (
								<div className="mt-4 space-y-3">
									{assessments.map((item) => renderDetailCard("assessment", item))}
								</div>
							) : (
								renderEmptyDetails("No assessments recorded yet")
							)}

							<div className="my-8 border-t border-slate-200" />

							<div className="flex items-start justify-between gap-4">
								<div className="flex items-start gap-3">
									<div className="rounded-xl bg-amber-100 p-2">
										<i className="pi pi-send text-amber-600" />
									</div>
									<div>
										<h4 className="text-[18px] leading-[24px] font-semibold text-slate-800">Official declarations</h4>
										<p className="text-[14px] text-slate-500">Record official emergency declarations</p>
									</div>
								</div>
								<Button
									type="button"
									label="Add declaration"
									icon="pi pi-plus"
									outlined
									disabled={!canAddAnyDeclaration}
									onClick={() => openAddDetail("declaration")}
								/>
							</div>

							{declarations.length > 0 ? (
								<div className="mt-4 space-y-3">
									{declarations.map((item) => renderDetailCard("declaration", item))}
								</div>
							) : (
								renderEmptyDetails("No declarations recorded yet")
							)}
						</div>

						<Dialog
							header={editingDetailId ? `Edit ${detailDialogCategory}` : `Add ${detailDialogCategory}`}
							visible={detailDialogVisible}
							style={{ width: "34rem" }}
							onHide={() => setDetailDialogVisible(false)}
							draggable={false}
							resizable={false}
						>
							<div className="space-y-4">
								<div>
									<label className="mb-1 block">Type</label>
									<select
										value={detailForm.type}
										onChange={(event) => {
											const selectedType = event.target.value;
											setDetailForm((state) => ({
												...state,
												type: selectedType,
												dateValue:
													detailDialogCategory === "response" &&
													selectedType === "response_operation"
														? null
														: detailDialogCategory === "declaration" &&
														selectedType !== "disaster_declaration_effects"
														? null
														: state.dateValue,
												declarationStatus:
													selectedType === "disaster_declaration"
														? state.declarationStatus
														: "",
												hadOfficialWarningOrWeatherAdvisory:
													selectedType === "official_warning"
														? state.hadOfficialWarningOrWeatherAdvisory
														: false,
												officialWarningAffectedAreas:
													selectedType === "official_warning"
														? state.officialWarningAffectedAreas
														: "",
											}));
										}}
										disabled={Boolean(editingDetailId)}
										className="w-full rounded-md border border-slate-300 px-3 py-2"
									>
										<option value="">Select type</option>
										{detailTypeOptions.map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								</div>

								{showDateField ? (
									<div>
										<label className="mb-1 block">Date</label>
										<Calendar
											value={detailForm.dateValue}
											onChange={(event) =>
												setDetailForm((state) => ({
													...state,
													dateValue: event.value instanceof Date ? event.value : null,
												}))
											}
											dateFormat="dd/mm/yy"
											placeholder="Select date"
											showIcon
											className="w-full"
										/>
									</div>
								) : null}

								{isDeclarationStatusType ? (
									<div>
										<label className="mb-1 block">Disaster declaration status</label>
										<select
											value={detailForm.declarationStatus}
											onChange={(event) =>
												setDetailForm((state) => ({
													...state,
													declarationStatus: event.target.value as DeclarationStatus | "",
												}))
											}
											className="w-full rounded-md border border-slate-300 px-3 py-2"
										>
											<option value="">Select declaration status</option>
											{declarationStatusOptions.map((option) => (
												<option key={option.value} value={option.value}>
													{option.label}
												</option>
											))}
										</select>
									</div>
								) : null}

								{isOfficialWarningType ? (
									<div className="space-y-3">
										<label className="flex items-center gap-2 text-sm text-slate-700">
											<input
												type="checkbox"
												checked={detailForm.hadOfficialWarningOrWeatherAdvisory}
												onChange={(event) =>
													setDetailForm((state) => ({
														...state,
														hadOfficialWarningOrWeatherAdvisory: event.target.checked,
													}))
												}
											/>
											<span>
												Was there an officially issued warning and/or weather advisory?
											</span>
										</label>

										<div>
											<label className="mb-1 block">
												Which affected areas were covered by the warning?
											</label>
											<InputTextarea
												value={detailForm.officialWarningAffectedAreas}
												onChange={(event) =>
													setDetailForm((state) => ({
														...state,
														officialWarningAffectedAreas: event.target.value,
													}))
												}
												rows={3}
												placeholder="Enter affected areas"
												className="w-full"
											/>
											{detailForm.hadOfficialWarningOrWeatherAdvisory &&
											!hasOfficialWarningAreas ? (
												<p className="mt-1 text-xs text-red-600">
													Affected areas are required when warning/advisory is checked.
												</p>
											) : null}
										</div>
									</div>
								) : null}

								{!isDeclarationStatusType && !isOfficialWarningType ? (
									<div>
									<label className="mb-1 block">Description</label>
									<InputTextarea
										value={detailForm.description}
										onChange={(event) =>
											setDetailForm((state) => ({ ...state, description: event.target.value }))
										}
										rows={4}
										placeholder="Enter description"
										className="w-full"
									/>
									</div>
								) : null}

								<div className="flex items-center justify-between gap-2 pt-2">
									<div>
										{editingDetailId ? (
											<Button
												type="button"
												label="Delete"
												severity="danger"
												outlined
												onClick={deleteDetail}
											/>
										) : null}
									</div>
									<div className="flex gap-2">
										<Button
											type="button"
											label="Cancel"
											outlined
											onClick={() => setDetailDialogVisible(false)}
										/>
										<Button
											type="button"
											label={editingDetailId ? `Save ${detailDialogCategory}` : `Add ${detailDialogCategory}`}
											disabled={!canSaveDetail}
											onClick={saveDetail}
										/>
									</div>
								</div>
							</div>
						</Dialog>

						<div className="flex items-center justify-between w-full mt-6">
							<Button
								type="button"
								label="Cancel"
								outlined
								onClick={() => (document.location.href = ctx.url("/disaster-event"))}
							/>
							<div className="flex gap-2">
								<Button
									type="button"
									label="Save as draft"
									outlined
									onClick={saveAsDraft}
								/>
								<Button
									type="button"
									label="Back"
									outlined
									icon="pi pi-chevron-left"
									iconPos="left"
									onClick={() => {
										saveCurrentFormState();
										setActiveStep(1);
									}}
								/>
								<Button
									type="button"
									label="Next"
									icon="pi pi-chevron-right"
									iconPos="right"
									onClick={goToReview}
								/>
							</div>
						</div>
					</StepperPanel>

					<StepperPanel
						header="Review and save"
						pt={{
							title: {
								style: { textAlign: "center" },
								"data-status": "required",
							},
						}}
					>
						<div className="space-y-5">
							<div>
								<h3 className="text-[18px] leading-[24px] font-semibold text-slate-800">
									Review and save
								</h3>
								<p className="mt-1 text-[14px] leading-[22px] text-slate-500">
									Verify the information before saving.
								</p>
							</div>

						<Card className="rounded-2xl border border-slate-200 shadow-none" pt={{ body: { style: { padding: '5px 20px 5px 20px' } } }}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 text-slate-800">
										<i className="pi pi-info-circle text-blue-600" />
										<h4 className="text-[16px] leading-[16px] font-semibold">Basic information</h4>
									</div>
									<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
										{renderReviewItem("Disaster name - national", form.nameNational)}
										{renderReviewItem("Disaster name - global/regional", form.nameGlobalOrRegional)}
										{renderReviewItem("National event ID", form.nationalDisasterId)}
										{renderReviewItem("GLIDE number", form.glide)}
										{renderReviewItem("Disaster event UUID", form.id)}
										{renderReviewItem("Recording organisation", form.recordingInstitution)}
									</div>
								</div>
							</Card>

						<Card className="rounded-2xl border border-slate-200 shadow-none" pt={{ body: { style: { padding: '5px 20px 5px 20px' } } }}>
								<div className="space-y-6">
									<div className="flex items-center gap-2 text-slate-800">
										<i className="pi pi-map-marker text-blue-600" />
										<h4 className="text-[16px] leading-[16px] font-semibold">Hazard classification</h4>
									</div>
									<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
										{renderReviewItem(
											"Hazard type",
											sortedHipTypes.find((item) => item.id === selectedHipTypeId)?.name || "",
										)}
										{renderReviewItem(
											"Hazard cluster",
											sortedHipClusters.find((item) => item.id === selectedHipClusterId)?.name || "",
										)}
										{renderReviewItem(
											"Specific hazard",
											sortedHipHazards.find((item) => item.id === selectedHipHazardId)?.name || "",
										)}
										{renderReviewItem("HIPS code", selectedHipHazardId)}
									</div>
								</div>
							</Card>

						{renderStep4SectionCard(
							"Location",
							"pi pi-map-marker text-blue-600",
							"No location details available",
							<>
								<div className="space-y-2">
									<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
										Geographic levels
									</p>
									{selectedDivisionItems.length > 0 ? (
										<div className="flex flex-wrap gap-2">
											{selectedDivisionItems.map((item) => (
												<span
													key={`review-division-${item.key}`}
													className="rounded-md bg-blue-50 px-2 py-1 text-[12px] text-blue-700"
												>
													{item.label}
												</span>
											))}
										</div>
									) : (
										<p className="text-[14px] italic text-slate-400">
											No geographic levels selected
										</p>
									)}
								</div>

								<div className="space-y-2">
									<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
										Spatial footprint
									</p>
									{reviewSpatialFootprintItems.length > 0 ? (
										<ul className="list-disc pl-5 text-[14px] text-slate-500">
											{reviewSpatialFootprintItems.map((title, index) => (
												<li key={`review-footprint-${index}`}>{title}</li>
											))}
										</ul>
									) : (
										<p className="text-[14px] italic text-slate-400">
											No spatial data defined
										</p>
									)}
								</div>
							</>,
							selectedDivisionItems.length > 0 || reviewSpatialFootprintItems.length > 0,
						)}

						{renderStep4SectionCard(
							"Linked disaster records",
							"pi pi-file text-blue-600",
							"No disaster records linked yet",
							linkedDisasterRecordTarget.map((record) => (
								<div key={record.id} className="space-y-1">
									<p className="text-[14px] font-semibold text-slate-700">{record.name}</p>
									<p className="text-[13px] text-slate-500">{record.code}</p>
								</div>
							)),
							linkedDisasterRecordTarget.length > 0,
						)}

						{renderStep4SectionCard(
							"Responses",
							"pi pi-file-edit text-blue-600",
							"No responses recorded yet",
							responses.map((item) => renderStep4DetailRow("response", item)),
							responses.length > 0,
						)}

						{renderStep4SectionCard(
							"Assessments",
							"pi pi-clipboard text-violet-600",
							"No assessments recorded yet",
							assessments.map((item) => renderStep4DetailRow("assessment", item)),
							assessments.length > 0,
						)}

						{renderStep4SectionCard(
							"Official declarations",
							"pi pi-send text-amber-600",
							"No declarations recorded yet",
							declarations.map((item) => renderStep4DetailRow("declaration", item)),
							declarations.length > 0,
						)}
						</div>

						<div className="flex items-center justify-between w-full mt-6">
							<Button
								type="button"
								label="Cancel"
								outlined
								onClick={() => (document.location.href = ctx.url("/disaster-event"))}
							/>
							<div className="flex gap-2">
								<Button
									type="button"
									label="Save as draft"
									outlined
									onClick={saveAsDraft}
								/>
								<Button
									type="button"
									label="Back"
									outlined
									icon="pi pi-chevron-left"
									iconPos="left"
									onClick={() => {
										saveCurrentFormState();
										setActiveStep(2);
									}}
								/>
								<Button
									type="button"
									label="Save"
									onClick={() => {
										const snapshot = saveCurrentFormState();
										if (validateStep1(snapshot)) {
											setVisibleModalSubmit(true);
										}
									}}
								/>
							</div>
						</div>
					</StepperPanel>
				</Stepper>
				</RouterForm>
			</section>
		</div>
	</>);
}
