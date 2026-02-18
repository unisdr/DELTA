import { relations } from "drizzle-orm";
import {
	pgTable,
	uuid,
	AnyPgColumn,
	text,
	timestamp,
	jsonb,
	unique,
} from "drizzle-orm/pg-core";
import {
	createdUpdatedTimestamps,
	approvalFields,
	apiImportIdField,
	hipRelationColumnsOptional,
	zeroText,
	ourBigint,
	zeroBool,
	ourMoney,
} from "../../utils/drizzleUtil";
import { eventTable } from "./eventTable";
import { hazardousEventTable } from "./hazardousEventTable";
import { countryAccounts } from "./countryAccounts";
import { hipHazardTable } from "./hipHazardTable";
import { hipClusterTable } from "./hipClusterTable";
import { hipTypeTable } from "./hipTypeTable";

export const disasterEventTable = pgTable(
	"disaster_event",
	{
		...createdUpdatedTimestamps,
		...approvalFields,
		...apiImportIdField(),
		...hipRelationColumnsOptional(),
		countryAccountsId: uuid("country_accounts_id").references(
			() => countryAccounts.id,
			{
				onDelete: "cascade",
			},
		),
		id: uuid("id")
			.primaryKey()
			.references((): AnyPgColumn => eventTable.id),
		hazardousEventId: uuid("hazardous_event_id").references(
			(): AnyPgColumn => hazardousEventTable.id,
		),
		disasterEventId: uuid("disaster_event_id").references(
			(): AnyPgColumn => disasterEventTable.id,
		),
		nationalDisasterId: zeroText("national_disaster_id"),
		// multiple other ids
		otherId1: zeroText("other_id1"),
		otherId2: zeroText("other_id2"),
		otherId3: zeroText("other_id3"),
		nameNational: zeroText("name_national"),
		glide: zeroText("glide"),
		nameGlobalOrRegional: zeroText("name_global_or_regional"),
		// yyyy or yyyy-mm or yyyy-mm-dd
		startDate: zeroText("start_date"),
		endDate: zeroText("end_date"),
		startDateLocal: text("start_date_local"),
		endDateLocal: text("end_date_local"),
		durationDays: ourBigint("duration_days"),
		disasterDeclaration: text("disaster_declaration", {
			enum: ["yes", "no", "unknown"],
		})
			.notNull()
			.default("unknown"),
		// multiple disaster declartions
		disasterDeclarationTypeAndEffect1: zeroText(
			"disaster_declaration_type_and_effect1",
		),
		disasterDeclarationDate1: timestamp("disaster_declaration_date1"),
		disasterDeclarationTypeAndEffect2: zeroText(
			"disaster_declaration_type_and_effect2",
		),
		disasterDeclarationDate2: timestamp("disaster_declaration_date2"),
		disasterDeclarationTypeAndEffect3: zeroText(
			"disaster_declaration_type_and_effect3",
		),
		disasterDeclarationDate3: timestamp("disaster_declaration_date3"),
		disasterDeclarationTypeAndEffect4: zeroText(
			"disaster_declaration_type_and_effect4",
		),
		disasterDeclarationDate4: timestamp("disaster_declaration_date4"),
		disasterDeclarationTypeAndEffect5: zeroText(
			"disaster_declaration_type_and_effect5",
		),
		disasterDeclarationDate5: timestamp("disaster_declaration_date5"),

		hadOfficialWarningOrWeatherAdvisory: zeroBool(
			"had_official_warning_or_weather_advisory",
		),
		officialWarningAffectedAreas: zeroText("official_warning_affected_areas"),

		// multiple early actions fields
		earlyActionDescription1: zeroText("early_action_description1"),
		earlyActionDate1: timestamp("early_action_date1"),
		earlyActionDescription2: zeroText("early_action_description2"),
		earlyActionDate2: timestamp("early_action_date2"),
		earlyActionDescription3: zeroText("early_action_description3"),
		earlyActionDate3: timestamp("early_action_date3"),
		earlyActionDescription4: zeroText("early_action_description4"),
		earlyActionDate4: timestamp("early_action_date4"),
		earlyActionDescription5: zeroText("early_action_description5"),
		earlyActionDate5: timestamp("early_action_date5"),

		// multiple rapid or preliminary assessments
		rapidOrPreliminaryAssessmentDescription1: text(
			"rapid_or_preliminary_assesment_description1",
		),
		rapidOrPreliminaryAssessmentDate1: timestamp(
			"rapid_or_preliminary_assessment_date1",
		),
		rapidOrPreliminaryAssessmentDescription2: text(
			"rapid_or_preliminary_assesment_description2",
		),
		rapidOrPreliminaryAssessmentDate2: timestamp(
			"rapid_or_preliminary_assessment_date2",
		),
		rapidOrPreliminaryAssessmentDescription3: text(
			"rapid_or_preliminary_assesment_description3",
		),
		rapidOrPreliminaryAssessmentDate3: timestamp(
			"rapid_or_preliminary_assessment_date3",
		),
		rapidOrPreliminaryAssessmentDescription4: text(
			"rapid_or_preliminary_assesment_description4",
		),
		rapidOrPreliminaryAssessmentDate4: timestamp(
			"rapid_or_preliminary_assessment_date4",
		),
		rapidOrPreliminaryAssessmentDescription5: text(
			"rapid_or_preliminary_assesment_description5",
		),
		rapidOrPreliminaryAssessmentDate5: timestamp(
			"rapid_or_preliminary_assessment_date5",
		),

		responseOperations: zeroText("response_oprations"),

		// multiple post disaster assessments
		postDisasterAssessmentDescription1: text(
			"post_disaster_assessment_description1",
		),
		postDisasterAssessmentDate1: timestamp("post_disaster_assessment_date1"),
		postDisasterAssessmentDescription2: text(
			"post_disaster_assessment_description2",
		),
		postDisasterAssessmentDate2: timestamp("post_disaster_assessment_date2"),
		postDisasterAssessmentDescription3: text(
			"post_disaster_assessment_description3",
		),
		postDisasterAssessmentDate3: timestamp("post_disaster_assessment_date3"),
		postDisasterAssessmentDescription4: text(
			"post_disaster_assessment_description4",
		),
		postDisasterAssessmentDate4: timestamp("post_disaster_assessment_date4"),
		postDisasterAssessmentDescription5: text(
			"post_disaster_assessment_description5",
		),
		postDisasterAssessmentDate5: timestamp("post_disaster_assessment_date5"),

		// multiple other assessments
		otherAssessmentDescription1: text("other_assessment_description1"),
		otherAssessmentDate1: timestamp("other_assessment_date1"),
		otherAssessmentDescription2: text("other_assessment_description2"),
		otherAssessmentDate2: timestamp("other_assessment_date2"),
		otherAssessmentDescription3: text("other_assessment_description3"),
		otherAssessmentDate3: timestamp("other_assessment_date3"),
		otherAssessmentDescription4: text("other_assessment_description4"),
		otherAssessmentDate4: timestamp("other_assessment_date4"),
		otherAssessmentDescription5: text("other_assessment_description5"),
		otherAssessmentDate5: timestamp("other_assessment_date5"),

		dataSource: zeroText("data_source"),
		recordingInstitution: zeroText("recording_institution"),
		effectsTotalUsd: ourMoney("effects_total_usd"),
		nonEconomicLosses: zeroText("non_economic_losses"),
		damagesSubtotalLocalCurrency: ourMoney("damages_subtotal_local_currency"),
		lossesSubtotalUSD: ourMoney("losses_subtotal_usd"),
		responseOperationsDescription: zeroText("response_operations_description"),
		responseOperationsCostsLocalCurrency: ourMoney(
			"response_operations_costs_local_currency",
		),
		responseCostTotalLocalCurrency: ourMoney(
			"response_cost_total_local_currency",
		),
		responseCostTotalUSD: ourMoney("response_cost_total_usd"),
		humanitarianNeedsDescription: zeroText("humanitarian_needs_description"),
		humanitarianNeedsLocalCurrency: ourMoney(
			"humanitarian_needs_local_currency",
		),
		humanitarianNeedsUSD: ourMoney("humanitarian_needs_usd"),

		rehabilitationCostsLocalCurrencyCalc: ourMoney(
			"rehabilitation_costs_local_currency_calc",
		),
		rehabilitationCostsLocalCurrencyOverride: ourMoney(
			"rehabilitation_costs_local_currency_override",
		),
		//rehabilitationCostsUSD: ourMoney("rehabilitation_costs_usd"),
		repairCostsLocalCurrencyCalc: ourMoney("repair_costs_local_currency_calc"),
		repairCostsLocalCurrencyOverride: ourMoney(
			"repair_costs_local_currency_override",
		),
		//repairCostsUSD: ourMoney("repair_costs_usd"),
		replacementCostsLocalCurrencyCalc: ourMoney(
			"replacement_costs_local_currency_calc",
		),
		replacementCostsLocalCurrencyOverride: ourMoney(
			"replacement_costs_local_currency_override",
		),
		//replacementCostsUSD: ourMoney("replacement_costs_usd"),
		recoveryNeedsLocalCurrencyCalc: ourMoney(
			"recovery_needs_local_currency_calc",
		),
		recoveryNeedsLocalCurrencyOverride: ourMoney(
			"recovery_needs_local_currency_override",
		),
		//recoveryNeedsUSD: ourMoney("recovery_needs_usd"),
		attachments: jsonb("attachments"),
		spatialFootprint: jsonb("spatial_footprint"),

		legacyData: jsonb("legacy_data"),
	},
	(table) => ({
		// Composite unique constraint for tenant-scoped api_import_id
		disasterEventApiImportIdTenantUnique: unique(
			"disaster_event_api_import_id_tenant_unique",
		).on(table.apiImportId, table.countryAccountsId),
	}),
);

export type SelectDisasterEvent = typeof disasterEventTable.$inferSelect;
export type InsertDisasterEvent = typeof disasterEventTable.$inferInsert;

export const disasterEventTableConstrains = {
	hazardousEventId: "disaster_event_hazardous_event_id_hazardous_event_id_fk",
	countryAccountsId:
		"disaster_event_country_accounts_id_country_accounts_id_fk",
};

export const disasterEventRel = relations(disasterEventTable, ({ one }) => ({
	event: one(eventTable, {
		fields: [disasterEventTable.id],
		references: [eventTable.id],
	}),
	countryAccount: one(countryAccounts, {
		fields: [disasterEventTable.countryAccountsId],
		references: [countryAccounts.id],
	}),
	hazardousEvent: one(hazardousEventTable, {
		fields: [disasterEventTable.hazardousEventId],
		references: [hazardousEventTable.id],
	}),
	disasterEvent: one(disasterEventTable, {
		fields: [disasterEventTable.disasterEventId],
		references: [disasterEventTable.id],
	}),
	hipHazard: one(hipHazardTable, {
		fields: [disasterEventTable.hipHazardId],
		references: [hipHazardTable.id],
	}),
	hipCluster: one(hipClusterTable, {
		fields: [disasterEventTable.hipClusterId],
		references: [hipClusterTable.id],
	}),
	hipType: one(hipTypeTable, {
		fields: [disasterEventTable.hipTypeId],
		references: [hipTypeTable.id],
	}),
}));
