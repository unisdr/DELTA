export type RoleId =
	| "data-viewer"
	| "data-collector"
	| "data-validator"
	| "admin"
	| "super_admin";

type RoleOption = {
	id: RoleId;
	label: string;
	desc: string;
};

export function validRoles(): RoleOption[] {
	return [
		{
			id: "data-viewer",
			label: "Data Viewer",
			desc: "View data and use analytics.",
		},
		{
			id: "data-collector",
			label: "Data Collector",
			desc: "Add, edit, import data.",
		},
		{
			id: "data-validator",
			label: "Data Validator",
			desc: "Validate data.",
		},
		{
			id: "admin",
			label: "Admin",
			desc: "Access and country settings.",
		},
		{
			id: "super_admin",
			label: "Super Admin",
			desc: "Global access and country account management.",
		},
	];
}

export type PermissionId =
	| "ViewUsers"
	| "EditUsers"
	| "InviteUsers"
	| "disaster_event.list"
	| "disaster_event.view_workflow_history"
	| "disaster_event.create"
	| "disaster_event.update"
	| "disaster_event.delete"
	| "disaster_event.submit_for_validation"
	| "disaster_event.validate"
	| "api-keys.list"
	| "api-keys.create"
	| "api-keys.update"
	| "api-keys.delete"
	| "ViewData"
	| "EditData"
	| "ViewApiDocs"
	| "EditHumanEffectsCustomDsg"
	| "ValidateData"
	| "DeleteValidatedData"
	| "ManageCountrySettings"
	| "assets.list"
	| "assets.create"
	| "assets.update"
	| "assets.delete"
	| "assets.import"
	| "assets.export"
	| "organizations.list"
	| "organizations.create"
	| "organizations.update"
	| "organizations.delete"
	| "activate_country_account"
	| "deactivate_country_account"
	| "modify_country_account"
	| "DeleteCountryAccount"
	| "CloneCountryAccount"
	| "ViewCountryAccounts"
	| "AddCountryAccount"
	| "EditCountryAccount"
	| "ViewFictitiousCountries"
	| "AddFictitiousCountry"
	| "EditFictitiousCountry"
	| "DeleteFictitiousCountry";

export const PERMISSIONS = {
	USERS_VIEW: "ViewUsers",
	USERS_EDIT: "EditUsers",
	USERS_INVITE: "InviteUsers",
	DISASTER_EVENT_LIST: "disaster_event.list",
	DISASTER_EVENT_VIEW_WORKFLOW_HISTORY: "disaster_event.view_workflow_history",
	DISASTER_EVENT_CREATE: "disaster_event.create",
	DISASTER_EVENT_UPDATE: "disaster_event.update",
	DISASTER_EVENT_DELETE: "disaster_event.delete",
	DISASTER_EVENT_SUBMIT_FOR_VALIDATION: "disaster_event.submit_for_validation",
	DISASTER_EVENT_VALIDATE: "disaster_event.validate",
	API_KEYS_LIST: "api-keys.list",
	API_KEYS_CREATE: "api-keys.create",
	API_KEYS_UPDATE: "api-keys.update",
	API_KEYS_DELETE: "api-keys.delete",
	DATA_VIEW: "ViewData",
	DATA_EDIT: "EditData",
	API_DOCS_VIEW: "ViewApiDocs",
	HUMAN_EFFECTS_CUSTOM_DSG_EDIT: "EditHumanEffectsCustomDsg",
	DATA_VALIDATE: "ValidateData",
	VALIDATED_DATA_DELETE: "DeleteValidatedData",
	COUNTRY_SETTINGS_MANAGE: "ManageCountrySettings",
	ASSETS_LIST: "assets.list",
	ASSETS_CREATE: "assets.create",
	ASSETS_UPDATE: "assets.update",
	ASSETS_DELETE: "assets.delete",
	ASSETS_IMPORT: "assets.import",
	ASSETS_EXPORT: "assets.export",
	ORGANIZATIONS_LIST: "organizations.list",
	ORGANIZATIONS_CREATE: "organizations.create",
	ORGANIZATIONS_UPDATE: "organizations.update",
	ORGANIZATIONS_DELETE: "organizations.delete",
	COUNTRY_ACCOUNT_ACTIVATE: "activate_country_account",
	COUNTRY_ACCOUNT_DEACTIVATE: "deactivate_country_account",
	COUNTRY_ACCOUNT_MODIFY: "modify_country_account",
	COUNTRY_ACCOUNT_DELETE: "DeleteCountryAccount",
	COUNTRY_ACCOUNT_CLONE: "CloneCountryAccount",
	COUNTRY_ACCOUNTS_VIEW: "ViewCountryAccounts",
	COUNTRY_ACCOUNT_ADD: "AddCountryAccount",
	COUNTRY_ACCOUNT_EDIT: "EditCountryAccount",
	FICTITIOUS_COUNTRIES_VIEW: "ViewFictitiousCountries",
	FICTITIOUS_COUNTRY_ADD: "AddFictitiousCountry",
	FICTITIOUS_COUNTRY_EDIT: "EditFictitiousCountry",
	FICTITIOUS_COUNTRY_DELETE: "DeleteFictitiousCountry",
} as const;

type PermissionOption = {
	id: PermissionId;
	role: RoleId;
	label: string;
};

export function permissions(): PermissionOption[] {
	return [
		{
			id: "ViewUsers",
			role: "admin",
			label: "View users",
		},
		{
			id: "EditUsers",
			role: "admin",
			label: "Edit other user details",
		},
		{
			id: "InviteUsers",
			role: "admin",
			label: "Invite users",
		},
		{
			id: "disaster_event.list",
			role: "admin",
			label: "List disaster events",
		},
		{
			id: "disaster_event.view_workflow_history",
			role: "data-collector",
			label: "View disaster event workflow history",
		},
		{
			id: "disaster_event.create",
			role: "admin",
			label: "Create disaster events",
		},
		{
			id: "disaster_event.update",
			role: "admin",
			label: "Update disaster events",
		},
		{
			id: "disaster_event.delete",
			role: "admin",
			label: "Delete disaster events",
		},
		{
			id: "disaster_event.submit_for_validation",
			role: "data-collector",
			label: "Submit disaster events for validation",
		},
		{
			id: "disaster_event.validate",
			role: "data-validator",
			label: "Validate disaster events",
		},
		{
			id: "api-keys.list",
			role: "admin",
			label: "List API keys",
		},
		{
			id: "api-keys.create",
			role: "admin",
			label: "Create API keys",
		},
		{
			id: "api-keys.update",
			role: "admin",
			label: "Update API keys",
		},
		{
			id: "api-keys.delete",
			role: "admin",
			label: "Delete API keys",
		},
		{
			id: "ViewData",
			role: "data-viewer",
			label: "View data",
		},
		{
			id: "EditData",
			role: "data-collector",
			label: "Edit data",
		},
		{
			id: "ViewApiDocs",
			role: "data-viewer",
			label: "View API Docs",
		},
		{
			id: "EditHumanEffectsCustomDsg",
			role: "admin",
			label: "Edit custom disaggregations for human effects",
		},
		{
			id: "ValidateData",
			role: "data-validator",
			label: "Validate data records",
		},
		{
			id: "DeleteValidatedData",
			role: "data-validator",
			label: "Delete validated data records",
		},
		{
			id: "ManageCountrySettings",
			role: "admin",
			label: "Manage country settings",
		},
		{
			id: "assets.list",
			role: "admin",
			label: "List assets",
		},
		{
			id: "assets.create",
			role: "admin",
			label: "Create assets",
		},
		{
			id: "assets.update",
			role: "admin",
			label: "Update assets",
		},
		{
			id: "assets.delete",
			role: "admin",
			label: "Delete assets",
		},
		{
			id: "assets.import",
			role: "admin",
			label: "Import assets",
		},
		{
			id: "assets.export",
			role: "admin",
			label: "Export assets",
		},
		{
			id: "organizations.list",
			role: "admin",
			label: "List organizations",
		},
		{
			id: "organizations.create",
			role: "admin",
			label: "Create organizations",
		},
		{
			id: "organizations.update",
			role: "admin",
			label: "Update organizations",
		},
		{
			id: "organizations.delete",
			role: "admin",
			label: "Delete organizations",
		},
		// Super admin specific permissions
		{
			id: "activate_country_account",
			role: "super_admin",
			label: "Activate country account",
		},
		{
			id: "modify_country_account",
			role: "super_admin",
			label: "Modify country account",
		},
		{
			id: "ViewFictitiousCountries",
			role: "super_admin",
			label: "View fictitious countries",
		},
		{
			id: "AddFictitiousCountry",
			role: "super_admin",
			label: "Add fictitious country",
		},
		{
			id: "EditFictitiousCountry",
			role: "super_admin",
			label: "Edit fictitious country",
		},
		{
			id: "DeleteFictitiousCountry",
			role: "super_admin",
			label: "Delete fictitious country",
		},
		{
			id: "DeleteCountryAccount",
			role: "super_admin",
			label: "Delete country account",
		},
		{
			id: "CloneCountryAccount",
			role: "super_admin",
			label: "Clone country account",
		},
		{
			id: "ViewCountryAccounts",
			role: "super_admin",
			label: "View country accounts",
		},
		{
			id: "AddCountryAccount",
			role: "super_admin",
			label: "Add country account",
		},
		{
			id: "EditCountryAccount",
			role: "super_admin",
			label: "Edit country account",
		},
	];
}

export function permissionsMap(): Record<PermissionId, RoleId> {
	return permissions().reduce<Record<PermissionId, RoleId>>(
		(acc, { id, role }) => {
			acc[id] = role;
			return acc;
		},
		{} as Record<PermissionId, RoleId>,
	);
}

export const roles: {
	[K in RoleId]: PermissionId[];
} = {
	"data-viewer": ["ViewData", "ViewApiDocs"],
	"data-collector": [
		"ViewData",
		"ViewApiDocs",
		"EditData",
		"disaster_event.view_workflow_history",
		"disaster_event.submit_for_validation",
	],
	"data-validator": [
		"ViewData",
		"ViewApiDocs",
		"EditData",
		"ValidateData",
		"DeleteValidatedData",
		"disaster_event.view_workflow_history",
		"disaster_event.validate",
	],
	admin: [
		"ViewData",
		"ViewApiDocs",
		"EditData",
		"ValidateData",
		"DeleteValidatedData",

		"ViewUsers",
		"EditUsers",
		"InviteUsers",
		"disaster_event.list",
		"disaster_event.view_workflow_history",
		"disaster_event.create",
		"disaster_event.update",
		"disaster_event.delete",
		"disaster_event.submit_for_validation",
		"disaster_event.validate",
		"assets.list",
		"assets.create",
		"assets.update",
		"assets.delete",
		"assets.import",
		"assets.export",
		"api-keys.list",
		"api-keys.create",
		"api-keys.update",
		"api-keys.delete",
		"EditHumanEffectsCustomDsg",
		"ManageCountrySettings",
		"organizations.list",
		"organizations.create",
		"organizations.update",
		"organizations.delete",
	],
	// Global role (cross-tenant)
	super_admin: [
		// Super admin specific permissions - no country-specific permissions for data sovereignty
		"activate_country_account",
		"deactivate_country_account",
		"modify_country_account",
		"ViewFictitiousCountries",
		"AddFictitiousCountry",
		"EditFictitiousCountry",
		"DeleteFictitiousCountry",
		"DeleteCountryAccount",
		"CloneCountryAccount",
		"ViewCountryAccounts",
		"AddCountryAccount",
		"EditCountryAccount",
	],
};

export function roleHasPermission(
	role: RoleId | string | null | undefined,
	permission: PermissionId,
): boolean {
	if (!role) {
		return false;
	}

	// Check if using the new roles structure
	if (roles[role as RoleId] && roles[role as RoleId].includes(permission)) {
		return true;
	}

	return false;
}

// Helper function to check if user is super admin
export function isSuperAdmin(role: RoleId | string | null): boolean {
	return role === "super_admin";
}

// Helper function to check if user can add new records
export function canAddNewRecord(role: RoleId | string | null): boolean {
	if (!role) {
		return false;
	}
	// Currently all roles can add records, but data-viewer has limited permissions
	// This can be customized based on specific permission requirements
	if (role === "data-viewer") return false;
	else return true;
}

// Helper function to check if user can edit records
export function canEditRecord(role: RoleId | string | null): boolean {
	if (!role) {
		return false;
	}
	// Currently all roles can edit records, but data-viewer has limited permissions
	// This can be customized based on specific permission requirements
	if (role === "data-viewer") return false;
	else return true;
}

// Get roles excluding super_admin for country-specific user management
export function getCountryRoles() {
	return validRoles().filter((role) => role.id !== "super_admin");
}

export function getCountryRole(roleId: RoleId | string | null) {
	if (!roleId) return null;
	return getCountryRoles().find((role) => role.id === roleId);
}
