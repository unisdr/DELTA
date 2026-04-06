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
	| "EditAPIKeys"
	| "ViewData"
	| "EditData"
	| "ViewApiDocs"
	| "EditHumanEffectsCustomDsg"
	| "ValidateData"
	| "DeleteValidatedData"
	| "ManageCountrySettings"
	| "ManageOrganizations"
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
			id: "EditAPIKeys",
			role: "admin",
			label: "Edit API Keys",
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
			id: "ManageOrganizations",
			role: "admin",
			label: "Manage organizations",
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
	"data-collector": ["ViewData", "ViewApiDocs", "EditData"],
	"data-validator": [
		"ViewData",
		"ViewApiDocs",
		"EditData",
		"ValidateData",
		"DeleteValidatedData",
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
		"EditAPIKeys",
		"EditHumanEffectsCustomDsg",
		"ManageCountrySettings",
		"ManageOrganizations",
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
