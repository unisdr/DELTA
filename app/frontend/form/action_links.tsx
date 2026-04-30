import { ViewContext } from "../context";
import { LangLink } from "~/utils/link";
import { DeleteButton } from "../components/delete-dialog";

interface ActionLinksProps {
	ctx: ViewContext;
	route: string;
	id: string | number;
	deleteMessage?: string;
	deleteTitle?: string;
	confirmDeleteLabel?: string;
	cancelDeleteLabel?: string;
	hideViewButton?: boolean;
	hideEditButton?: boolean;
	hideDeleteButton?: boolean;
	user?: any;
	approvalStatus?: string | undefined;
}

export function ActionLinks(props: ActionLinksProps) {
	const ctx = props.ctx;
	return (
		<div style={{ display: "flex", justifyContent: "space-evenly" }}>
			{!props.hideEditButton && (
				<LangLink lang={ctx.lang} to={`${props.route}/edit/${props.id}`}>
					<button
						type="button"
						className="mg-button mg-button-table"
						aria-label={ctx.t({ code: "common.edit", msg: "Edit" })}
					>
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/edit.svg#edit" />
						</svg>
					</button>
				</LangLink>
			)}
			{!props.hideViewButton && (
				<LangLink lang={ctx.lang} to={`${props.route}/${props.id}`}>
					<button
						type="button"
						className="mg-button mg-button-table"
						aria-label={ctx.t({ code: "common.view", msg: "View" })}
					>
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/eye-show-password.svg#eye-show" />
						</svg>
					</button>
				</LangLink>
			)}
			{!props.hideDeleteButton && canDelete(props.approvalStatus, ctx.user) && (
				<DeleteButton
					ctx={ctx}
					key={props.id}
					action={ctx.url(`${props.route}/delete/${props.id}`)}
					useIcon
					confirmMessage={props.deleteMessage}
					title={props.deleteTitle}
					confirmLabel={props.confirmDeleteLabel}
					cancelLabel={props.cancelDeleteLabel}
					confirmIcon={
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/trash-alt.svg#delete" />
						</svg>
					}
					confirmButtonFirst={false}
				/>
			)}
		</div>
	);
}

/**
 * Determines if a user can delete
 * Based on business rules:
 * - Data-viewers cannot delete any records
 * - Records that are Published or Validated by someone else cannot be deleted
 */
function canDelete(approvalStatus: string | undefined, user: any): boolean {
	if (!user) return false;

	// Data-viewers cannot delete any records
	if (user.role === "data-viewer") return false;

	// Published or validated records cannot be deleted
	return (
		approvalStatus?.toLowerCase() !== "published" &&
		approvalStatus?.toLowerCase() !== "validated"
	);
}
