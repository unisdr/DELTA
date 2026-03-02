import { ViewContext } from "~/frontend/context";
import { LangLink } from "~/utils/link";
import { canDeleteDataCollectionRecord } from "~/frontend/user/roles";
import { HazardousEventDeleteButton } from "~/frontend/components/delete-dialog";

/**
 * Specialized ActionLinks component for data collection that uses the
 * with the required confirmation dialog
 */
export function DataCollectionActionLinks(props: {
	ctx: ViewContext;
	route: string;
	id: string | number;
	hideViewButton?: boolean;
	hideEditButton?: boolean;
	hideDeleteButton?: boolean;
	user?: any;
	approvalStatus?: string;
}) {
	const ctx = props.ctx;
	return (
		<>
			{!props.hideEditButton && (
				<LangLink lang={ctx.lang} to={`${props.route}/edit/${props.id}`}>
					<button
						type="button"
						className="mg-button mg-button-table"
						aria-label={ctx.t({
							code: "common.edit",
							msg: "Edit",
						})}
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
						aria-label={ctx.t({
							code: "common.view",
							msg: "View",
						})}
					>
						<svg aria-hidden="true" focusable="false" role="img">
							<use href="/assets/icons/eye-show-password.svg#eye-show" />
						</svg>
					</button>
				</LangLink>
			)}
			{canDeleteDataCollectionRecord(props.user.role, props.approvalStatus) && (
				<HazardousEventDeleteButton
					ctx={ctx}
					action={ctx.url(`${props.route}/delete/${props.id}`)}
					useIcon
				/>
			)}
		</>
	);
}
