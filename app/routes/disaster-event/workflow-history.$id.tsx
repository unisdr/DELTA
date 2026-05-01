import { useLoaderData } from "react-router";
import { inArray } from "drizzle-orm";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Link } from "react-router";

import { dr } from "~/db.server";
import { userTable } from "~/drizzle/schema";
import { PERMISSIONS } from "~/frontend/user/roles";
import { makeGetDisasterEventByIdUseCase } from "~/modules/disaster-event/disaster-event-module.server";
import { makeWorkflowRepository } from "~/modules/workflow/workflow-module.server";
import type { WorkflowStatus } from "~/modules/workflow/domain/entities/workflow-status";
import { authLoaderPublicOrWithPerm } from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";

type WorkflowHistoryRow = {
	id: string;
	status: WorkflowStatus;
	actionBy: string;
	comment: string | null;
	createdAt: Date | string;
};

type UserDisplay = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
};

function statusDisplayLabel(status: WorkflowStatus) {
	if (status === "submitted") {
		return "Waiting for validation";
	}
	if (status === "revision_requested") {
		return "Needs revision";
	}
	if (status === "approved") {
		return "Validated";
	}
	return status;
}

function formatDateTime(value: Date | string) {
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "-";
	}
	return date.toLocaleString("en-CA");
}

export const loader = authLoaderPublicOrWithPerm(
	PERMISSIONS.DISASTER_EVENT_VIEW_WORKFLOW_HISTORY,
	async ({ request, params }) => {
		const countryAccountsId = await getCountryAccountsIdFromSession(request);
		if (!countryAccountsId) {
			throw new Response("Unauthorized", { status: 401 });
		}
		if (!params.id) {
			throw new Response("ID is required", { status: 400 });
		}

		const disasterEvent = await makeGetDisasterEventByIdUseCase().execute({
			id: params.id,
			countryAccountsId,
		});
		if (!disasterEvent) {
			throw new Response("Disaster event not found", { status: 404 });
		}

		const history = await makeWorkflowRepository().getHistory(
			"disaster_event",
			params.id,
		);

		const actionByIds = Array.from(
			new Set(
				history
					.map((item) => item.actionBy)
					.filter((value): value is string => Boolean(value)),
			),
		);

		let usersById = new Map<string, UserDisplay>();
		if (actionByIds.length > 0) {
			const users = await dr
				.select({
					id: userTable.id,
					firstName: userTable.firstName,
					lastName: userTable.lastName,
					email: userTable.email,
				})
				.from(userTable)
				.where(inArray(userTable.id, actionByIds));

			usersById = new Map(users.map((user) => [user.id, user]));
		}

		const historyRows = history
			.map((item) => {
				const user = item.actionBy ? usersById.get(item.actionBy) : null;
				const fullName = user
					? [user.firstName, user.lastName].filter((part) => part.trim().length > 0).join(" ")
					: "";
				const actionBy = user
					? fullName
						? `${fullName} (${user.email})`
						: user.email
					: "-";

				return {
					id: item.id,
					status: item.status,
					actionBy,
					comment: item.comment,
					createdAt: item.createdAt,
				};
			})
			.sort((a, b) => {
				const aTs = new Date(a.createdAt).getTime();
				const bTs = new Date(b.createdAt).getTime();
				const safeA = Number.isNaN(aTs) ? 0 : aTs;
				const safeB = Number.isNaN(bTs) ? 0 : bTs;
				return safeB - safeA;
			});

		return {
			disasterEvent: {
				id: disasterEvent.id,
				eventName: disasterEvent.nameNational,
			},
			history: historyRows,
		};
	},
);

export default function DisasterEventWorkflowHistoryRoute() {
	const { disasterEvent, history } = useLoaderData<typeof loader>();
	const rows = history as WorkflowHistoryRow[];

	return (
		<div className="p-8">
			<Card className="border border-slate-200 shadow-sm">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<div>
						<h1 className="text-2xl font-semibold text-slate-800">Workflow History</h1>
						<p className="mt-1 text-sm text-slate-600">
							Disaster event: {disasterEvent.eventName || disasterEvent.id}
						</p>
					</div>
					<Link to="/disaster-event">
						<Button type="button" label="Back to list" icon="pi pi-arrow-left" text />
					</Link>
				</div>

				<DataTable value={rows} emptyMessage="No workflow history found for this record.">
					<Column
						field="status"
						header="Status"
						body={(row: WorkflowHistoryRow) => statusDisplayLabel(row.status)}
					/>
					<Column
						field="actionBy"
						header="Action by"
						body={(row: WorkflowHistoryRow) => row.actionBy}
					/>
					<Column
						field="comment"
						header="Comment"
						body={(row: WorkflowHistoryRow) => row.comment || "-"}
					/>
					<Column
						field="createdAt"
						header="Timestamp"
						body={(row: WorkflowHistoryRow) => formatDateTime(row.createdAt)}
					/>
				</DataTable>
			</Card>
		</div>
	);
}
