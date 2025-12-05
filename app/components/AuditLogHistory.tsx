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

export default function AuditLogHistory({ ctx, auditLogs }: AuditLogHistoryProps) {
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
									"code": "audit_log.action_taken",
									"desc": "Label for the action taken in the audit log",
									"msg": "Action Taken"
								})}
							</th>
							<th>
								{ctx.t({
									"code": "audit_log.by",
									"desc": "Label for the user who performed the action in the audit log",
									"msg": "By"
								})}
							</th>
							<th>
								{ctx.t({
									"code": "audit_log.organisation",
									"desc": "Label for the organisation in the audit log",
									"msg": "Organisation"
								})}
							</th>
							<th>
								{ctx.t({
									"code": "audit_log.date",
									"desc": "Label for the date of the audit log entry",
									"msg": "Date"
								})}
							</th>
							<th>
								{ctx.t({
									"code": "audit_log.time",
									"desc": "Label for the timestamp of the audit log entry",
									"msg": "Time"
								})}
							</th>
						</tr>
					</thead>
					<tbody>
						{auditLogs.map((auditLogs) => {
							return (
								<tr key={auditLogs.id}>
									<td>{auditLogs.action}</td>
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
