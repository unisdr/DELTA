import { DContext } from "~/util/dcontext";

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

export function validRoles(ctx: DContext): RoleOption[] {
	return [
		{
			id: "data-viewer",
			label: ctx.t({
				"code": "user.role.data_viewer.label",
				"msg": "Data Viewer"
			}),
			desc: ctx.t({
				"code": "user.role.data_viewer.desc",
				"msg": "View data and use analytics."
			})
		},
		{
			id: "data-collector",
			label: ctx.t({
				"code": "user.role.data_collector.label",
				"msg": "Data Collector"
			}),
			desc: ctx.t({
				"code": "user.role.data_collector.desc",
				"msg": "Add, edit, import data."
			})
		},
		{
			id: "data-validator",
			label: ctx.t({
				"code": "user.role.data_validator.label",
				"msg": "Data Validator"
			}),
			desc: ctx.t({
				"code": "user.role.data_validator.desc",
				"msg": "Validate data."
			})
		},
		{
			id: "admin",
			label: ctx.t({
				"code": "user.role.admin.label",
				"msg": "Admin"
			}),
			desc: ctx.t({
				"code": "user.role.admin.desc",
				"msg": "Access and country settings."
			})
		},
		{
			id: "super_admin",
			label: ctx.t({
				"code": "user.role.super_admin.label",
				"msg": "Super Admin"
			}),
			desc: ctx.t({
				"code": "user.role.super_admin.desc",
				"msg": "Global access and country account management."
			})
		}
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
	| "manage_country_accounts"
	| "create_country_account"
	| "activate_country_account"
	| "deactivate_country_account"
	| "modify_country_account";


type PermissionOption = {
	id: PermissionId;
	role: RoleId;
	label: string;
};

export function permissions(ctx: DContext): PermissionOption[] {
	return [
		{
			id: "ViewUsers",
			role: "admin",
			label: ctx.t({
				"code": "user.permission.view_users.label",
				"msg": "View users"
			})
		},
		{
			id: "EditUsers",
			role: "admin",
			label: ctx.t({
				"code": "user.permission.edit_users.label",
				"msg": "Edit other user details"
			})
		},
		{
			id: "InviteUsers",
			role: "admin",
			label: ctx.t({
				"code": "user.permission.invite_users.label",
				"msg": "Invite users"
			})
		},
		{
			id: "EditAPIKeys",
			role: "admin",
			label: ctx.t({
				"code": "user.permission.edit_api_keys.label",
				"msg": "Edit API Keys"
			})
		},
		{
			id: "ViewData",
			role: "data-viewer",
			label: ctx.t({
				"code": "user.permission.view_data.label",
				"msg": "View data"
			})
		},
		{
			id: "EditData",
			role: "data-collector",
			label: ctx.t({
				"code": "user.permission.edit_data.label",
				"msg": "Edit data"
			})
		},
		{
			id: "ViewApiDocs",
			role: "data-viewer",
			label: ctx.t({
				"code": "user.permission.view_api_docs.label",
				"msg": "View API Docs"
			})
		},
		{
			id: "EditHumanEffectsCustomDsg",
			role: "admin",
			label: ctx.t({
				"code": "user.permission.edit_human_effects_custom_dsg.label",
				"msg": "Edit custom disaggregations for human effects"
			})
		},
		{
			id: "ValidateData",
			role: "data-validator",
			label: ctx.t({
				"code": "user.permission.validate_data.label",
				"msg": "Validate data records"
			})
		},
		{
			id: "DeleteValidatedData",
			role: "data-validator",
			label: ctx.t({
				"code": "user.permission.delete_validated_data.label",
				"msg": "Delete validated data records"
			})
		},
		{
			id: "ManageCountrySettings",
			role: "admin",
			label: ctx.t({
				"code": "user.permission.manage_country_settings.label",
				"msg": "Manage country settings"
			})
		},
		{
			id: "ManageOrganizations",
			role: "admin",
			label: ctx.t({
				"code": "user.permission.manage_organizations.label",
				"msg": "Manage organizations"
			})
		},
		// Super admin specific permissions
		{
			id: "manage_country_accounts",
			role: "super_admin",
			label: ctx.t({
				"code": "user.permission.manage_country_accounts.label",
				"msg": "Manage country accounts"
			})
		},
		{
			id: "create_country_account",
			role: "super_admin",
			label: ctx.t({
				"code": "user.permission.create_country_account.label",
				"msg": "Create country account"
			})
		},
		{
			id: "activate_country_account",
			role: "super_admin",
			label: ctx.t({
				"code": "user.permission.activate_country_account.label",
				"msg": "Activate country account"
			})
		},
		{
			id: "deactivate_country_account",
			role: "super_admin",
			label: ctx.t({
				"code": "user.permission.deactivate_country_account.label",
				"msg": "Deactivate country account"
			})
		},
		{
			id: "modify_country_account",
			role: "super_admin",
			label: ctx.t({
				"code": "user.permission.modify_country_account.label",
				"msg": "Modify country account"
			})
		}
	];
}

export function permissionsMap(ctx: DContext): Record<PermissionId, RoleId> {
	return permissions(ctx).reduce<Record<PermissionId, RoleId>>((acc, { id, role }) => {
		acc[id] = role;
		return acc;
	}, {} as Record<PermissionId, RoleId>);
}

export const roles: {
	[K in RoleId]: PermissionId[];
} = {
	"data-viewer": [
		"ViewData",
		"ViewApiDocs"
	],
	"data-collector": [
		"ViewData",
		"ViewApiDocs",
		"EditData"
	],
	"data-validator": [
		"ViewData",
		"ViewApiDocs",
		"EditData",
		"ValidateData",
		"DeleteValidatedData"
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
		"ManageOrganizations"
	],
	// Global role (cross-tenant)
	super_admin: [
		// Super admin specific permissions - no country-specific permissions for data sovereignty
		"manage_country_accounts",
		"create_country_account",
		"activate_country_account",
		"deactivate_country_account",
		"modify_country_account",
	],
};

export function roleHasPermission(role: RoleId | string | null, permission: PermissionId): boolean {
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

// Get roles excluding super_admin for country-specific user management
export function getCountryRoles(ctx: DContext) {
	return validRoles(ctx).filter(role => role.id !== 'super_admin');
}

export function getCountryRole(ctx: DContext, roleId: RoleId | string | null) {
  if (!roleId) return null;
  return getCountryRoles(ctx).find(role => role.id === roleId);
}
