import { DisasterRecordsView } from "~/frontend/disaster-record/form";

import {
	createViewLoaderPublicApproved,
	createViewLoaderPublicApprovedWithAuditLog,
} from "~/backend.server/handlers/form/form";

import { ViewScreenPublicApproved } from "~/frontend/form";
import { disasterRecordsById } from "~/backend.server/models/disaster_record";
import { nonecoLossesFilderBydisasterRecordsId } from "~/backend.server/models/noneco_losses";
import { sectorsFilterByDisasterRecordId } from "~/backend.server/models/disaster_record__sectors";
import { getAffectedByDisasterRecord } from "~/backend.server/models/analytics/affected-people-by-disaster-record";
import AuditLogHistory from "~/components/AuditLogHistory";
import { disasterRecordsTable } from "~/drizzle/schema/disasterRecordsTable";
import { lossesTable } from "~/drizzle/schema/lossesTable";
import { damagesTable } from "~/drizzle/schema/damagesTable";
import { disruptionTable } from "~/drizzle/schema/disruptionTable";
import { getTableName } from "drizzle-orm";

import { dr } from "~/db.server";
import { contentPickerConfig } from "./content-picker-config";
import { sql, eq } from "drizzle-orm";
import {
	authActionGetAuth,
	authActionWithPerm,
	optionalUser,
} from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { getUserIdFromSession } from "~/utils/session";
import { useLoaderData } from "react-router";
import { ViewContext } from "~/frontend/context";

import { LoaderFunctionArgs } from "react-router";
import { BackendContext } from "~/backend.server/context";
import { processApprovalStatusActionService } from "~/services/approvalStatusWorkflowService";
import { getReturnAssigneeUsers } from "~/db/queries/userCountryAccountsRepository";

export const loader = async (args: LoaderFunctionArgs) => {
	const { request, params } = args;
	const ctx = new BackendContext(args);
	const { id } = params;
	if (!id) {
		throw new Response("ID is required", { status: 400 });
	}

	const userSession = await optionalUser(args);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userId = userSession ? await getUserIdFromSession(request) : null;
	if (!countryAccountsId) {
		throw new Response("Unauthorized, no selected instance", { status: 401 });
	}

	// Create a wrapper function that includes tenant context
	const getByIdWithTenant = async (_ctx: BackendContext, idStr: string) => {
		return disasterRecordsById(idStr, countryAccountsId);
	};

	const loaderFunction = userSession
		? createViewLoaderPublicApprovedWithAuditLog({
				getById: getByIdWithTenant,
				recordId: id,
				tableName: getTableName(disasterRecordsTable),
			})
		: createViewLoaderPublicApproved({
				getById: getByIdWithTenant,
			});

	const result = await loaderFunction(args);
	if (result.item.countryAccountsId !== countryAccountsId) {
		throw new Response("Unauthorized access", { status: 403 });
	}

	const cpDisplayName =
		(await contentPickerConfig(ctx).selectedDisplay(
			ctx,
			dr,
			result.item.disasterEventId,
		)) ?? "";

	const disasterId = id;
	const disasterRecord = await dr
		.select({
			disaster_id: disasterRecordsTable.id,
			disaster_spatial_footprint: disasterRecordsTable.spatialFootprint,
			disruptions: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${disruptionTable.id},
              'spatial_footprint', ${disruptionTable.spatialFootprint}
            )
          ) FILTER (WHERE ${disruptionTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("disruptions"),
			losses: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${lossesTable.id},
              'spatial_footprint', ${lossesTable.spatialFootprint}
            )
          ) FILTER (WHERE ${lossesTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("losses"),
			damages: sql`
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', ${damagesTable.id},
              'spatial_footprint', ${damagesTable.spatialFootprint}
            )
          ) FILTER (WHERE ${damagesTable.id} IS NOT NULL), '[]'::jsonb
        )
      `.as("damages"),
		})
		.from(disasterRecordsTable)
		.leftJoin(
			disruptionTable,
			eq(disasterRecordsTable.id, disruptionTable.recordId),
		)
		.leftJoin(lossesTable, eq(disasterRecordsTable.id, lossesTable.recordId))
		.leftJoin(damagesTable, eq(disasterRecordsTable.id, damagesTable.recordId))
		.where(eq(disasterRecordsTable.id, disasterId))
		.groupBy(disasterRecordsTable.id, disasterRecordsTable.spatialFootprint);

	const returnAssignees = userSession
		? (await getReturnAssigneeUsers(countryAccountsId, userId)).map((user) => ({
				label: `${user.firstName} ${user.lastName}`.trim(),
				value: user.id,
			}))
		: [];

	const dbNonecoLosses = await nonecoLossesFilderBydisasterRecordsId(ctx, id);
	const dbDisRecSectors = await sectorsFilterByDisasterRecordId(ctx, id);
	const dbDisRecHumanEffectsSummaryTable = await getAffectedByDisasterRecord(
		dr,
		id,
	);

	const extendedItem = {
		...result.item,
		cpDisplayName,
		disasterRecord,
		returnAssignees,
	};

	return {
		...result,

		item: extendedItem,
		recordsNonecoLosses: dbNonecoLosses,
		recordsDisRecSectors: dbDisRecSectors,
		dbDisRecHumanEffectsSummaryTable,
	};
};

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request } = actionArgs;
	const ctx = new BackendContext(actionArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	const userSession = authActionGetAuth(actionArgs);
	const formData = await request.formData();

	const result = await processApprovalStatusActionService({
		ctx,
		request,
		formData,
		countryAccountsId,
		userId: userSession.user.id,
		recordType: "disaster_records",
	});

	return Response.json(result);
});

export default function Screen() {
	const ld = useLoaderData<typeof loader>();
	const ctx = new ViewContext();
	const auditLogs = (ld as any).auditLogs as any[] | undefined;

	return (
		<>
			<ViewScreenPublicApproved
				loaderData={ld}
				ctx={ctx}
				viewComponent={DisasterRecordsView}
			/>
			{ld.item && (
				<div className="mg-container">
					<div>&nbsp;</div>
					<section>
						<div className="mx-auto px-4">
							<fieldset className="mb-6">
								<div className="mb-4">
									<legend className="text-xl font-semibold text-gray-800">
										{ctx.t({ code: "human_effects", msg: "Human effects" })}
									</legend>
								</div>

								<div className="border-0">
									<div className="overflow-x-auto">
										<table className="w-full border border-gray-300 text-sm">
											<thead className="bg-gray-50 text-gray-700">
												<tr>
													<th className="border border-gray-300 px-3 py-2"></th>
													<th className="border border-gray-300 px-3 py-2"></th>
													<th className="border border-gray-300 px-3 py-2"></th>
													<th
														className="border border-gray-300 px-3 py-2 text-center"
														colSpan={2}
													>
														{ctx.t({
															code: "human_effects.affected_old_desinventar",
															desc: "Human effects Affected (DesInventar is an older system used for tracking disaster data)",
															msg: "Affected (Old DesInventar)",
														})}
													</th>
													<th className="border border-gray-300 px-3 py-2"></th>
												</tr>
												<tr>
													{[
														{ code: "human_effects.deaths", msg: "Deaths" },
														{ code: "human_effects.injured", msg: "Injured" },
														{ code: "human_effects.missing", msg: "Missing" },
														{
															code: "human_effects.directly_affected",
															msg: "Directly",
														},
														{
															code: "human_effects.indirectly_affected",
															msg: "Indirectly",
														},
														{
															code: "human_effects.displaced",
															msg: "Displaced",
														},
													].map(({ code, msg }) => (
														<th
															key={code}
															className="border border-gray-300 px-3 py-2 font-medium text-left"
														>
															{ctx.t({ code, msg })}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												<tr className="hover:bg-gray-50">
													{(
														[
															{ key: "deaths", tbl: "Deaths" },
															{ key: "injured", tbl: "Injured" },
															{ key: "missing", tbl: "Missing" },
															{ key: "directlyAffected", tbl: "Affected" },
															{ key: "indirectlyAffected", tbl: "Affected" },
															{ key: "displaced", tbl: "Displaced" },
														] as const
													).map(({ key }) => {
														const value =
															ld.dbDisRecHumanEffectsSummaryTable[key];
														return (
															<td
																key={key}
																className="border border-gray-300 px-3 py-2"
															>
																{typeof value === "number" ? (
																	<span>{value}</span>
																) : value === true ? (
																	<span>
																		{ctx.t({ code: "common.yes", msg: "Yes" })}
																	</span>
																) : (
																	<span className="text-gray-400">-</span>
																)}
															</td>
														);
													})}
												</tr>
											</tbody>
										</table>
									</div>
								</div>
							</fieldset>
						</div>
					</section>
					<section>
						<div className="mx-auto px-4">
							<fieldset className="mb-6">
								<div className="mb-4">
									<legend className="text-xl font-semibold text-gray-800">
										{ctx.t({ code: "sector_effects", msg: "Sector effects" })}
									</legend>
								</div>

								<div className="border-0">
									<div className="overflow-x-auto">
										<table className="w-full border border-gray-300 text-sm">
											<thead className="bg-gray-50 text-gray-700">
												<tr>
													<th
														className="border border-gray-300 px-3 py-2"
														colSpan={2}
													/>
													<th
														className="border border-gray-300 px-3 py-2 text-center"
														colSpan={3}
													>
														{ctx.t({
															code: "sector_effects.damage",
															msg: "Damage",
														})}
													</th>
													<th
														className="border border-gray-300 px-3 py-2 text-center"
														colSpan={2}
													>
														{ctx.t({
															code: "sector_effects.losses",
															msg: "Losses",
														})}
													</th>
													<th
														className="border border-gray-300 px-3 py-2"
														colSpan={1}
													/>
												</tr>
												<tr>
													{[
														{ code: "common.id", msg: "ID" },
														{ code: "sector_effects.sector", msg: "Sector" },
														{ code: "sector_effects.damage", msg: "Damage" },
														{
															code: "sector_effects.recovery_cost",
															msg: "Recovery cost",
														},
														{ code: "sector_effects.cost", msg: "Cost" },
														{ code: "sector_effects.losses", msg: "Losses" },
														{ code: "sector_effects.cost", msg: "Cost" },
														{
															code: "sector_effects.disruption",
															msg: "Disruption",
														},
													].map(({ code, msg }, i) => (
														<th
															key={`${code}-${i}`}
															className="border border-gray-300 px-3 py-2 font-medium text-left"
														>
															{ctx.t({ code, msg })}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												{Array.isArray(ld.recordsDisRecSectors) &&
													ld.recordsDisRecSectors.map((item, index) => (
														<tr key={index} className="hover:bg-gray-50">
															<td className="border border-gray-300 px-3 py-2 text-gray-500 font-mono text-xs">
																{item.disRecSectorsId.slice(0, 8)}
															</td>
															<td className="border border-gray-300 px-3 py-2">
																{item.sectorTreeDisplay}
															</td>
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsWithDamage && (
																	<span>
																		{ctx.t({ code: "common.yes", msg: "Yes" })}
																	</span>
																)}
															</td>
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsDamageRecoveryCost && (
																	<span>
																		{item.disRecSectorsDamageRecoveryCost}{" "}
																		{
																			item.disRecSectorsDamageRecoveryCostCurrency
																		}
																	</span>
																)}
															</td>
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsDamageCost && (
																	<span>
																		{item.disRecSectorsDamageCost}{" "}
																		{item.disRecSectorsDamageCostCurrency}
																	</span>
																)}
															</td>
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsWithLosses && (
																	<span>
																		{ctx.t({ code: "common.yes", msg: "Yes" })}
																	</span>
																)}
															</td>
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsLossesCost && (
																	<span>
																		{item.disRecSectorsLossesCost}{" "}
																		{item.disRecSectorsLossesCostCurrency}
																	</span>
																)}
															</td>
															<td className="border border-gray-300 px-3 py-2">
																{item.disRecSectorsWithDisruption && (
																	<span>
																		{ctx.t({ code: "common.yes", msg: "Yes" })}
																	</span>
																)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								</div>
							</fieldset>
						</div>
					</section>
					<section>
						<div className="mx-auto px-4">
							<fieldset className="mb-6">
								<div className="mb-4">
									<legend className="text-xl font-semibold text-gray-800">
										{ctx.t({
											code: "non_economic_losses",
											msg: "Non-economic losses",
										})}
									</legend>
								</div>

								<div className="border-0">
									<div className="overflow-x-auto">
										<table className="w-full border border-gray-300 text-sm">
											<thead className="bg-gray-50 text-gray-700">
												<tr>
													{[
														{ code: "common.id", msg: "ID" },
														{ code: "common.category", msg: "Category" },
														{ code: "common.description", msg: "Description" },
													].map(({ code, msg }) => (
														<th
															key={code}
															className="border border-gray-300 px-3 py-2 font-medium text-left"
														>
															{ctx.t({ code, msg })}
														</th>
													))}
												</tr>
											</thead>
											<tbody>
												{Array.isArray(ld.recordsNonecoLosses) &&
													ld.recordsNonecoLosses.map((item, index) => (
														<tr key={index} className="hover:bg-gray-50">
															<td className="border border-gray-300 px-3 py-2 text-gray-500 font-mono text-xs">
																{item.noneccoId.slice(0, 8)}
															</td>
															<td className="border border-gray-300 px-3 py-2">
																{item.categoryTreeDisplay}
															</td>
															<td className="border border-gray-300 px-3 py-2 text-gray-700">
																{item.noneccoDesc.slice(0, 300)}
															</td>
														</tr>
													))}
											</tbody>
										</table>
									</div>
								</div>
							</fieldset>
						</div>
					</section>
				</div>
			)}

			{auditLogs && auditLogs.length > 0 && (
				<>
					<div className="mg-container">
						<div>&nbsp;</div>
						<section>
							<div className="mx-auto px-4">
								<fieldset className="mb-6">
									<div className="mb-4">
										<legend className="text-xl font-semibold text-gray-800">
											{ctx.t({
												code: "audit_log.history",
												msg: "Audit log history",
											})}
										</legend>
									</div>

									<div className="border-0">
										<AuditLogHistory ctx={ctx} auditLogs={auditLogs} />
									</div>
								</fieldset>
							</div>
						</section>
					</div>
				</>
			)}
		</>
	);
}
