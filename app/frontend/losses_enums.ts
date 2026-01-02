import { DContext } from "~/util/dcontext"

export function typeEnumNotAgriculture(ctx: DContext) {
	return [

		// Infrastructure- temporary for service/production continuity

		{
			key: "increase_in_expenditure_infrastructure_temporary",
			label: ctx.t({
				"code": "disaster_records.losses.type.increase_in_expenditure_infrastructure_temporary",
				"msg": "Increase in expenditure, Infrastructure temporary"
			}),
			type: "infrastructure_temporary"
		},
		{
			key: "decrease_in_revenues_infrastructure_temporary",
			label: ctx.t({
				"code": "disaster_records.losses.type.decrease_in_revenues_infrastructure_temporary",
				"msg": "Decrease in revenues, Infrastructure temporary"
			}),
			type: "infrastructure_temporary"
		},
		{
			key: "cost_for_service_or_production_continuity_incurred_but_not_assessed",
			label: ctx.t({
				"code": "disaster_records.losses.type.cost_for_service_or_production_continuity_incurred_but_not_assessed",
				"msg": "Cost for service or production continuity incurred but not assessed"
			}),
			type: "infrastructure_temporary"
		},


		// Production,Service delivery and availability of/access to goods and services


		{
			key: "increase_in_expenditure_for_production_service_delivery_and_availability",
			label: ctx.t({
				"code": "disaster_records.losses.type.increase_in_expenditure_for_production_service_delivery_and_availability",
				"msg": "Increase in expenditure for Production, Service delivery and availability"
			}),
			type: "production_service_delivery_and_availability"
		},
		{
			key: "decrease_in_revenues_due_to_drop_on_production_service_delivery_and_availability",
			label: ctx.t({
				"code": "disaster_records.losses.type.decrease_in_revenues_due_to_drop_on_production_service_delivery_and_availability",
				"msg": "Decrease in revenues due to drop on Production, Service delivery and availability"
			}),
			type: "production_service_delivery_and_availability"
		},
		{
			key: "access_difficultied",
			label: ctx.t({
				"code": "disaster_records.losses.type.access_difficultied",
				"msg": "Access difficulted"
			}),
			type: "production_service_delivery_and_availability"
		},
		{
			key: "availability_decreased",
			label: ctx.t({
				"code": "disaster_records.losses.type.availability_decreased",
				"msg": "Availability decreased"
			}),
			type: "production_service_delivery_and_availability"
		},
		// Governance and decision-making
		{
			key: "increase_in_expenditure_governance",
			label: ctx.t({
				"code": "disaster_records.losses.type.increase_in_expenditure_governance",
				"msg": "Increase in expenditure, Governance"
			}),
			type: "governance_and_decision_making"
		},
		{
			key: "decrease_in_revenue_governance",
			label: ctx.t({
				"code": "disaster_records.losses.type.decrease_in_revenue_governance",
				"msg": "Decrease in revenue, Governance"
			}),
			type: "governance_and_decision_making"
		},
		{
			key: "governance_processes_difficulted",
			label: ctx.t({
				"code": "disaster_records.losses.type.governance_processes_difficulted",
				"msg": "Governance processes difficulted"
			}),
			type: "governance_and_decision_making"
		},


		// Risk and vulnerabilities
		{
			key: "increase_in_expenditure_to_address_risk_and_vulnerabilities",
			label: ctx.t({
				"code": "disaster_records.losses.type.increase_in_expenditure_to_address_risk_and_vulnerabilities",
				"msg": "Increase in expenditure to address risk and vulnerabilities"
			}),
			type: "risk_and_vulnerabilities"
		},
		{
			key: "decrease_in_revenue_from_risk_protection",
			label: ctx.t({
				"code": "disaster_records.losses.type.decrease_in_revenue_from_risk_protection",
				"msg": "Decrease in revenue from risk protection"
			}),
			type: "risk_and_vulnerabilities"
		},
		{
			key: "risks_and_vulnerabilities_increased",
			label: ctx.t({
				"code": "disaster_records.losses.type.risks_and_vulnerabilities_increased",
				"msg": "Risks and vulnerabilities increased"
			}),
			type: "risk_and_vulnerabilities"
		},


		// Other losses


		{
			key: "increase_in_expenditure",
			label: ctx.t({
				"code": "disaster_records.losses.type.increase_in_expenditure",
				"msg": "Increase in expenditure"
			}),
			type: "other_losses"
		},
		{
			key: "decrease_in_revenues",
			label: ctx.t({
				"code": "disaster_records.losses.type.decrease_in_revenues",
				"msg": "Decrease in revenues"
			}),
			type: "other_losses"
		},
		{
			key: "non_quantified_other_losses",
			label: ctx.t({
				"code": "disaster_records.losses.type.non_quantified_other_losses",
				"msg": "Non quantified - other losses"
			}),
			type: "other_losses"
		},


		// Employment and Livelihoods losses
		{
			key: "number_of_work_days_lost",
			label: ctx.t({
				"code": "disaster_records.losses.type.number_of_work_days_lost",
				"msg": "# of work days lost"
			}),
			type: "employment_and_livelihoods_losses"
		},
		{
			key: "number_of_workers_who_loss_their_jobs",
			label: ctx.t({
				"code": "disaster_records.losses.type.number_of_workers_who_loss_their_jobs",
				"msg": "# of workers who loss their jobs"
			}),
			type: "employment_and_livelihoods_losses"
		},
		{
			key: "number_of_persons_whose_livelihoods_related_to_sector_lost",
			label: ctx.t({
				"code": "disaster_records.losses.type.number_of_persons_whose_livelihoods_related_to_sector_lost",
				"msg": "# of persons whose livelihoods related to sector lost"
			}),
			type: "employment_and_livelihoods_losses"
		}
	]
}

export function typeEnumAgriculture(ctx: DContext) {
	return [

		// Infrastructure- temporary for service/production continuity

		{
			"key": "increase_in_expenditure_infrastructure_temporary",
			"label": ctx.t({
				"code": "disaster_records.losses.type.increase_in_expenditure_infrastructure_temporary",
				"msg": "Increase in expenditure, Infrastructure temporary"
			}),
			"type": "infrastructure_temporary"
		},
		{
			"key": "decrease_in_revenues_infrastructure_temporary",
			"label": ctx.t({
				"code": "disaster_records.losses.type.decrease_in_revenues_infrastructure_temporary",
				"msg": "Decrease in revenues, Infrastructure temporary"
			}),
			"type": "infrastructure_temporary"
		},
		{
			"key": "cost_for_service_or_production_continuity_incurred_but_not_assessed",
			"label": ctx.t({
				"code": "disaster_records.losses.type.cost_for_service_or_production_continuity_incurred_but_not_assessed",
				"msg": "Cost for service or production continuity incurred but not assessed"
			}),
			"type": "infrastructure_temporary"
		},

		// Production losses

		{
			"key": "production_inputs",
			"label": ctx.t({
				"code": "disaster_records.losses.type.production_inputs",
				"msg": "Production inputs"
			}),
			"type": "production_losses"
		},
		{
			"key": "production_outputs",
			"label": ctx.t({
				"code": "disaster_records.losses.type.production_outputs",
				"msg": "Production outputs"
			}),
			"type": "production_losses"
		},

		// Production, Service delivery and availability of/access to goods and services

		{
			"key": "increase_in_expenditure_for_production_service_delivery_and_availability",
			"label": ctx.t({
				"code": "disaster_records.losses.type.increase_in_expenditure_for_production_service_delivery_and_availability",
				"msg": "Increase in expenditure for Production, Service delivery and availability"
			}),
			"type": "production_service_delivery_and_availability"
		},
		{
			"key": "decrease_in_revenues_due_to_drop_on_production_service_delivery_and_availability",
			"label": ctx.t({
				"code": "disaster_records.losses.type.decrease_in_revenues_due_to_drop_on_production_service_delivery_and_availability",
				"msg": "Decrease in revenues due to drop on Production, Service delivery and availability"
			}),
			"type": "production_service_delivery_and_availability"
		},
		{
			"key": "access_difficultied",
			"label": ctx.t({
				"code": "disaster_records.losses.type.access_difficultied",
				"msg": "Access difficulted"
			}),
			"type": "production_service_delivery_and_availability"
		},
		{
			"key": "availability_decreased",
			"label": ctx.t({
				"code": "disaster_records.losses.type.availability_decreased",
				"msg": "Availability decreased"
			}),
			"type": "production_service_delivery_and_availability"
		},

		// Governance and decision-making

		{
			"key": "increase_in_expenditure_governance",
			"label": ctx.t({
				"code": "disaster_records.losses.type.increase_in_expenditure_governance",
				"msg": "Increase in expenditure, Governance"
			}),
			"type": "governance_and_decision_making"
		},
		{
			"key": "decrease_in_revenue_governance",
			"label": ctx.t({
				"code": "disaster_records.losses.type.decrease_in_revenue_governance",
				"msg": "Decrease in revenue, Governance"
			}),
			"type": "governance_and_decision_making"
		},
		{
			"key": "governance_processes_difficulted",
			"label": ctx.t({
				"code": "disaster_records.losses.type.governance_processes_difficulted",
				"msg": "Governance processes difficulted"
			}),
			"type": "governance_and_decision_making"
		},
		// Risk and vulnerabilities
		{
			"key": "increase_in_expenditure_to_address_risk_and_vulnerabilities",
			"label": ctx.t({
				"code": "disaster_records.losses.type.increase_in_expenditure_to_address_risk_and_vulnerabilities",
				"msg": "Increase in expenditure to address risk and vulnerabilities"
			}),
			"type": "risk_and_vulnerabilities"
		},
		{
			"key": "decrease_in_revenue_from_risk_protection",
			"label": ctx.t({
				"code": "disaster_records.losses.type.decrease_in_revenue_from_risk_protection",
				"msg": "Decrease in revenue from risk protection"
			}),
			"type": "risk_and_vulnerabilities"
		},
		{
			"key": "risks_and_vulnerabilities_increased",
			"label": ctx.t({
				"code": "disaster_records.losses.type.risks_and_vulnerabilities_increased",
				"msg": "Risks and vulnerabilities increased"
			}),
			"type": "risk_and_vulnerabilities"
		},
		// Other losses
		{
			"key": "increase_in_expenditure",
			"label": ctx.t({
				"code": "disaster_records.losses.type.increase_in_expenditure",
				"msg": "Increase in expenditure"
			}),
			"type": "other_losses"
		},
		{
			"key": "decrease_in_revenues",
			"label": ctx.t({
				"code": "disaster_records.losses.type.decrease_in_revenues",
				"msg": "Decrease in revenues"
			}),
			"type": "other_losses"
		},
		{
			"key": "non_quantified_other_losses",
			"label": ctx.t({
				"code": "disaster_records.losses.type.non_quantified_other_losses",
				"msg": "Non quantified - other losses"
			}),
			"type": "other_losses"
		},
		// Employment and Livelihoods losses
		{
			"key": "number_of_work_days_lost",
			"label": ctx.t({
				"code": "disaster_records.losses.type.number_of_work_days_lost",
				"msg": "# of work days lost"
			}),
			"type": "employment_and_livelihoods_losses"
		},
		{
			"key": "number_of_workers_who_loss_their_jobs",
			"label": ctx.t({
				"code": "disaster_records.losses.type.number_of_workers_who_loss_their_jobs",
				"msg": "# of workers who loss their jobs"
			}),
			"type": "employment_and_livelihoods_losses"
		},
		{
			"key": "number_of_workers_who_loss_their_jobs_permanently",
			"label": ctx.t({
				"code": "disaster_records.losses.type.number_of_workers_who_loss_their_jobs_permanently",
				"msg": "# of workers who loss their jobs permanently"
			}),
			"type": "employment_and_livelihoods_losses"
		},
		{
			"key": "number_of_persons_whose_livelihoods_related_to_sector_lost",
			"label": ctx.t({
				"code": "disaster_records.losses.type.number_of_persons_whose_livelihoods_related_to_sector_lost",
				"msg": "# of persons whose livelihoods related to sector lost"
			}),
			"type": "employment_and_livelihoods_losses"
		}
	]
}
