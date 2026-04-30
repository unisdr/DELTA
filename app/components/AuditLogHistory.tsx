import { ViewContext } from "~/frontend/context";

type AuditLog = {
	id: string;
	action: string;
	by: string | null;
	organization: string | null;
	timestamp: Date;
};

type AuditLogHistoryProps = {
	ctx: ViewContext;
	auditLogs: AuditLog[];
};

function translateAuditLogAction(ctx: ViewContext, eventName: string) {
	const [rawAction, ...typeParts] = eventName.split(" ");
	const objType = typeParts.join(" ");

	// Step 1: Translate the object type
	let translatedObj;
	switch (objType) {
		case "disaster event":
			translatedObj = ctx.t({
				code: "disaster_event",
				msg: "Disaster event",
			});
			break;
		case "hazardous event":
			translatedObj = ctx.t({
				code: "hazardous_event",
				msg: "Hazardous event",
			});
			break;
		case "disaster record":
			translatedObj = ctx.t({
				code: "disaster_record",
				msg: "Disaster record",
			});
			break;
		default:
			translatedObj = objType;
	}

	// Step 2: Translate the action with the translated object
	switch (rawAction) {
		case "Create":
			return ctx.t(
				{
					code: "audit_log.action.create_with_object",
					msg: "Create {obj}",
				},
				{ obj: translatedObj.toLowerCase() },
			);

		case "Update":
			return ctx.t(
				{
					code: "audit_log.action.update_with_object",
					msg: "Update {obj}",
				},
				{ obj: translatedObj.toLowerCase() },
			);

		case "Delete":
			return ctx.t(
				{
					code: "audit_log.action.delete_with_object",
					msg: "Delete {obj}",
				},
				{ obj: translatedObj.toLowerCase() },
			);

		default:
			return eventName;
	}
}
export default function AuditLogHistory({
	ctx,
	auditLogs,
}: AuditLogHistoryProps) {
	return (
		<>
			<style>{`
		.table-styled {
		  width: 100%;
		  border-collapse: collapse;
		  margin-top: 20px;
		  font-size: 14px;
		  overflow-x: auto;
		}

		.table-styled th,
		.table-styled td {
		  padding: 12px 15px;
		  border: 1px solid #ddd;
		  text-align: left;
		}

		.table-styled th {
		  background-color: #f4f4f4;
		  font-weight: bold;
		  position: relative;
		}
		`}</style>
			<div className="table-container">
				<table className="table-styled" style={{ marginTop: "0px" }}>
					<thead>
						<tr>
							<th>
								{ctx.t({
									code: "audit_log.action_taken",
									desc: "Label for the action taken in the audit log",
									msg: "Action taken",
								})}
							</th>
							<th>
								{ctx.t({
									code: "audit_log.by",
									desc: "Label for the user who performed the action in the audit log",
									msg: "By",
								})}
							</th>
							<th>
								{ctx.t({
									code: "audit_log.organisation",
									desc: "Label for the organisation in the audit log",
									msg: "Organisation",
								})}
							</th>
							<th>
								{ctx.t({
									code: "audit_log.date",
									desc: "Label for the date of the audit log entry",
									msg: "Date",
								})}
							</th>
							<th>
								{ctx.t({
									code: "audit_log.time",
									desc: "Label for the timestamp of the audit log entry",
									msg: "Time",
								})}
							</th>
						</tr>
					</thead>
					<tbody>
						{auditLogs.map((auditLogs) => {
							return (
								<tr key={auditLogs.id}>
									<td>{translateAuditLogAction(ctx, auditLogs.action)}</td>
									<td>{auditLogs.by}</td>
									<td>{auditLogs.organization}</td>
									<td>{auditLogs.timestamp.toDateString()}</td>
									<td>{auditLogs.timestamp.toTimeString()}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</>
	);
}
