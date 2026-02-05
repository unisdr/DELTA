
import {
	UserFormProps,
	FormInputDef,
	FieldsView,
	FormView,
	ViewComponent
} from "~/frontend/form";

import { ApiKeyViewModel, UserCentricApiKeyFields } from "~/backend.server/models/api_key";
import React from "react";
import { formatDate } from "~/utils/date";
import { ViewContext } from "./context";
import { DContext } from "~/utils/dcontext";

export const route = "/settings/api-key"

export function fieldsDefCommon(ctx: DContext) {
	return [
		{ key: "name", label: ctx.t({ "code": "common.name", "msg": "Name" }), type: "text", required: true },
	]
}

export function fieldsDef(ctx: DContext): FormInputDef<UserCentricApiKeyFields>[] {
	return [
		...fieldsDefCommon(ctx) as any,
		{ key: "assignedToUserId", label: ctx.t({ "code": "api_keys.assign_to_user", "msg": "Assign to user" }), type: "text" }
	];
}

export function fieldsDefView(ctx: DContext): FormInputDef<ApiKeyViewModel>[] {
	return [
		{ key: "createdAt", label: ctx.t({ "code": "common.created_at", "msg": "Created at" }), type: "other" },
		{ key: "managedByUser", label: ctx.t({ "code": "api_keys.managed_by_user", "msg": "Managed by user" }), type: "other" },
		...fieldsDefCommon(ctx) as any,
		{ key: "secret", label: ctx.t({ "code": "api_keys.secret", "msg": "Secret" }), type: "text" },
	];
}

interface ApiKeyFormProps extends UserFormProps<UserCentricApiKeyFields> {
	userOptions?: Array<{ value: string, label: string }>;
	isAdmin?: boolean;
}

export function ApiKeyForm(props: ApiKeyFormProps) {
	const ctx = props.ctx;
	// Create field overrides for the user selection dropdown
	const fieldOverrides: Record<string, React.ReactElement | null | undefined> = {};

	// Handle user selection field for admins
	if (props.isAdmin) {
		// Check if there are user options available
		if (props.userOptions && props.userOptions.length > 0) {
			// Use a direct select element with the correct name to ensure proper form submission
			fieldOverrides.assignedToUserId = (
				<div key="assignedToUserId" className="dts-form-component">
					<div className="dts-form-component__label">
						<label htmlFor="assignedToUserId">{ctx.t({ "code": "api_keys.assign_to_user_optional", "msg": "Assign to user (optional)" })}</label>
					</div>
					<select
						id="assignedToUserId"
						name="assignedToUserId"
						className="form-control"
						defaultValue={props.fields?.assignedToUserId || ''}
					>
						<option value="">-- {ctx.t({ "code": "api_keys.select_user_optional", "msg": "Select user (optional)" })} --</option>
						{props.userOptions.map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<small className="form-text text-muted">
						{ctx.t({ "code": "api_keys.assigned_user_info", "msg": "If selected, this API key will only be valid when the assigned user is active." })}
					</small>
				</div>
			);
		} else {
			// Show a message when no users are available for assignment
			fieldOverrides.assignedToUserId = (
				<div key="assignedToUserId" className="dts-form-component">
					<div className="dts-form-component__label">
						<label htmlFor="assignedToUserId">{ctx.t({ "code": "api_keys.assign_to_user", "msg": "Assign to user" })}</label>
					</div>
					<div className="dts-form-component__label">
						{ctx.t({ "code": "api_keys.no_users_available", "msg": "No users are available for assignment. Please add users in the Access Management section first." })}
					</div>
				</div>
			);
		}
	}

	return (
		<FormView
			ctx={ctx}
			path={route}
			edit={props.edit}
			id={props.id}

			title={ctx.t({ "code": "api_keys", "msg": "API keys" })}
			editLabel={ctx.t({ "code": "api_keys.edit", "msg": "Edit API key" })}
			addLabel={ctx.t({ "code": "api_keys.add", "msg": "Add API key" })}

			errors={props.errors}
			fields={props.fields}
			fieldsDef={fieldsDef(ctx)}
			override={fieldOverrides}
		/>
	);
}


interface ApiKeyViewProps {
	ctx: ViewContext;
	item: ApiKeyViewModel & {
		isActive?: boolean;
		issues?: string[];
		assignedUserId?: string | null;
		assignedUserEmail?: string | null;
	};
}

export function ApiKeyView(props: ApiKeyViewProps) {
	const { ctx, item } = props;

	// Determine if we need to show status information
	const showStatusInfo = 'isActive' in item;
	const isDisabled = showStatusInfo && item.isActive === false;

	// Prepare status message if key is disabled
	const statusMessage = isDisabled ? (
		<div key="status" style={{
			marginTop: '1rem',
			padding: '0.75rem',
			borderRadius: '0.25rem',
			backgroundColor: '#FEE2E2',
			color: '#B91C1C',
			border: '1px solid #F87171'
		}}>
			<h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>⚠️ {ctx.t({ "code": "api_keys.disabled_warning", "msg": "This API key is disabled" })}</h3>
			<p style={{ margin: '0' }}>
				{ctx.t({ "code": "api_keys.disabled_reason", "msg": "Reason" })}: {item.issues?.join(', ') || ctx.t({ "code": "api_keys.inactive_user", "msg": "User status is inactive" })}
			</p>
		</div>
	) : null;

	// Prepare assigned user information if available
	const assignedUserInfo = item.assignedUserId ? (
		<div key="assignedUser">
			<p>{ctx.t({ "code": "api_keys.assigned_to_user", "msg": "Assigned to user" })}: {item.assignedUserEmail || item.assignedUserId}</p>
		</div>
	) : null;

	return (
		<ViewComponent
			ctx={ctx}
			path={route}
			id={props.item.id}
			title={ctx.t({ "code": "api_keys.api_keys", "msg": "API keys" })}
		>
			{statusMessage}

			<FieldsView def={fieldsDefView(ctx)} fields={item} override={{
				createdAt: (
					<div key="createdAt">
						<p>{ctx.t({ "code": "api_keys.created_at", "msg": "Created at" })}: {formatDate(item.createdAt)}</p>
					</div>
				),
				managedByUser: (
					<React.Fragment key="managedByUser">
						<div>
							<p>{ctx.t({ "code": "api_keys.managed_by", "msg": "Managed By" })}: {item.managedByUser.email}</p>
						</div>
						{assignedUserInfo}
					</React.Fragment>
				)
			}} />
		</ViewComponent>
	);
}


