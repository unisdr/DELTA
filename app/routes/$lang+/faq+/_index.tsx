import { MainContainer } from "~/frontend/container";
import { Accordion, AccordionTab } from "primereact/accordion";

export default function FaqPage() {
	return (
		<MainContainer title="Frequently Asked Questions">
			<div className="pb-8">
				<div className="space-y-8">
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							1. On the system's purpose
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 1: Is DELTA Resilience a response operational information system?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											At its core, DELTA ( Disaster &amp; Hazardous Events,
											Losses and Damages Tracking &amp; Analysis) Resilience is
											intended to support the tracking of hazardous events
											observed and monitored by relevant national agencies, such
											as hydrometeorological services, geological surveys,
											volcanological institutes, environmental agencies, etc.,
											and to document the effects these events have on exposed
											and vulnerable elements, such as population, housing and
											productive assets. It also enables analysis of the
											disruptions and impacts on affected people, systems,
											ecosystems, livelihoods, and more.
										</p>
										<p>
											DELTA Resilience is not designed to function as an
											operational emergency response tool, such as those used to
											handle emergency calls and dispatch resources (e.g.,
											systems like 112 in Europe, a centralized emergency number
											with a geolocated emergency response dispatch system).
										</p>
										<p>
											While it is technically possible for country
											administrators to customize DELTA Resilience to include an
											emergency response module, operational response systems
											typically require real-time, dynamic information on
											available response capacities (e.g., firefighters on duty
											and the specific equipment at their disposal; hospitals
											with specialized services and current capacity). These
											systems are also usually integrated with emergency call
											centers that geolocate incoming calls, classify the type
											of emergency (e.g., medical, fire-related, marine rescue),
											and determine the appropriate resources to deploy, often
											in real time, while connecting directly with emergency
											responders to dispatch them efficiently.
										</p>
										<p>
											DELTA Resilience, by contrast, is designed as a toolkit
											for tracking and understanding disaster and climate change
											impacts, to support more effective risk prevention,
											reduction, management and resilient recovery. Its areas of
											application, outlined in more detail in the{" "}
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://www.undrr.org/building-risk-knowledge/disaster-data"
												target="_blank"
												rel="noopener noreferrer"
											>
												online repository
											</a>
											, include:
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Risk analysis (e.g., calibrating risk models and
												identifying patterns of vulnerability)
											</li>
											<li>
												Disaster risk reduction financing (e.g., assessing the
												cost of disasters and informing suitable financing
												mechanisms)
											</li>
											<li>
												Risk-informed planning (e.g., resilient infrastructure
												planning; or DRR in agriculture)
											</li>
											<li>
												Early warning and early action (e.g., setting triggers
												for warnings and anticipatory action)
											</li>
											<li>
												Recovery planning (e.g., supporting post-disaster
												assessments and identifying recovery needs and
												developing recovery strategies to build back better)
											</li>
											<li>
												Progress monitoring and reporting (e.g., on
												international frameworks such as the Sendai Framework or
												the Global Goal on Adaptation).
											</li>
										</ul>
										<p>
											Supporting reference:{" "}
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://www.undrr.org/building-risk-knowledge/disaster-data"
												target="_blank"
												rel="noopener noreferrer"
											>
												https://www.undrr.org/building-risk-knowledge/disaster-data
											</a>
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 2: Is DELTA Resilience a UN reporting portal?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The enhanced Disaster Tracking System, now known as DELTA
											Resilience has been developed by the United Nations Office
											for Disaster Risk Reduction (UNDRR) in collaboration with
											the World Meteorological Organization (WMO) and the United
											Nations Development Programme (UNDP) as a toolkit,
											including open-source software, for countries to establish
											and manage their own nationally owned hazardous events and
											disaster tracking systems.
										</p>
										<p>
											While DELTA Resilience is not designed as a UN reporting
											portal, its primary purpose is to support national use and
											national applications. Within this broader scope,
											international reporting is one of several potential
											applications, as the system can also be used to collect or
											process country data for specific international reporting
											obligations.
										</p>
										<p>
											One of the possible use cases supported by DELTA
											Resilience facilitating reporting on international
											commitments, such as the Sendai Framework for Disaster
											Risk Reduction feeding into the official reporting tool
											for the Sendai Framework is the Sendai Framework
											Monitoring (SFM) portal, managed by UNDRR.
										</p>
										<p>
											Reference:{" "}
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://sendaimonitor.undrr.org/"
												target="_blank"
												rel="noopener noreferrer"
											>
												https://sendaimonitor.undrr.org/
											</a>
										</p>
										<p>
											Similarly, DELTA Resilience may support future reporting
											needs, such as indicators under the Global Goal on
											Adaptation, and assist with data to inform reports
											produced under the United Nations Framework Convention on
											Climate Change (UNFCCC) and the Paris Agreement, including
											but not limited to, national communications, biennial
											transparency reports (BTRs) and adaptation communications.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 3: Can DELTA Resilience help countries with reporting on the Sendai Framework Monitor?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Countries can export data from their national DELTA
											Resilience systems to the SFM portal to streamline
											reporting. This functionality is expected to be supported
											through an API service. However, the two systems are
											distinct, with different purposes and governance
											structures.
										</p>
										<p>
											DELTA Resilience is a nationally owned and administered
											system for domestic data management and analysis, whereas
											the SFM is a UNDRR-managed platform designed to collect
											and consolidate country data on progress in implementing
											the Sendai Framework, based on globally agreed indicators
											and methodologies outlined in the{" "}
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://www.undrr.org/publication/technical-guidance-monitoring-and-reporting-progress-achieving-global-targets-sendai"
												target="_blank"
												rel="noopener noreferrer"
											>
												Technical guidance for monitoring and reporting on
												progress in achieving the global targets of the Sendai
												Framework for Disaster Risk Reduction
											</a>
											.
										</p>
										<p>
											Reference:{" "}
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://www.undrr.org/publication/technical-guidance-monitoring-and-reporting-progress-achieving-global-targets-sendai"
												target="_blank"
												rel="noopener noreferrer"
											>
												https://www.undrr.org/publication/technical-guidance-monitoring-and-reporting-progress-achieving-global-targets-sendai
											</a>
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 4: Is the DELTA Resilience an accounting system?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The legacy system, DesInventar , was often referred to as
											a disaster accounting system because one of its main
											purposes was to account for the impacts of disasters. The
											name DesInventar itself reflects this concept: in Spanish,
											it evokes the idea of an inventory system, where the
											prefix &amp;quot;Des-&amp;quot; implies undoing or
											removing, symbolising the depletion of assets caused by
											disasters.
										</p>
										<p>
											DELTA Resilience (Disaster &amp; Hazardous Events, Losses
											and Damages Tracking &amp; Analysis) is positioned as a
											tracking tool , emphasising its ability not only to
											monitor the effects of disasters but also to track
											hazardous events that may trigger those impacts. While the
											core purpose of DELTA Resilience remains to support
											countries in accounting for disaster impacts, it
											introduces a new dimension of tracking to support emerging
											use cases, particularly in the areas of early warning and
											early action .
										</p>
										<p>
											To enable the tracking of hazardous events and the losses
											and damages they generate, the first release of the DELTA
											Resilience software allows countries to record damage or
											disruption in physical units (e.g., kilometres of roads
											destroyed or partially damaged; hours and users affected
											by a power outage). It also includes basic computation
											tools that allow users to multiply the number of units by
											average repair or replacement costs, which may be
											pre-identified in national guidelines (e.g., unit price
											lists used for public works procurement or bidding) or
											sourced from global references . Alternatively, users can
											override the default calculations and input case-specific
											costs they have determined to express damage in economic
											terms, following DELTA Resilience methodologies adapted
											from Post-Disaster Needs Assessment (PDNA) sectoral
											guidelines.
										</p>
										<p>
											In future versions, as more advanced analytical modules
											(on-demand analysis module) are introduced, the DELTA
											Resilience will support the economic valuation of damages
											using various pricing units and methodologies. It will
											also allow for the estimation of losses , defined as
											changes in economic flows resulting from disasters, based
											on different recovery scenarios, strategies, baselines,
											and projections .
										</p>
										<p>
											To fully deploy these analytical capabilities, countries
											will need to provide the DELTA Resilience with access to
											relevant baseline (pre-disaster context and reference
											information, vulnerability and exposure data from core
											sector information systems and indicators) data by
											connecting it to authoritative national sources. This
											includes, for example, sectoral statistics on service
											demand and usage, price data and fluctuations, growth
											projections for service demand, and production costs for
											goods and services, along with a reliable source of
											inflation data and other key metadata.
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							2. On methodological and data framework
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 5: How DELTA Resilience system differs from DesInventar?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>In terms of the data model and methodology</p>
										<p>
											The DELTA Resilience data model records hazardous event
											parameters alongside the associated effects, including
											damages and losses. The ability to link hazardous events
											with disaster event information is one of the key
											innovations of the DELTA Resilience data model.
										</p>
										<p>
											Further guidance on the processes and methodologies for
											establishing authoritative and scientifically sound
											linkages between hazardous events and observed disaster
											effects is provided in the methodological compilation.
											This guidance also supports the progressive implementation
											of disaster impact statistics in line with the principles
											and recommendations set out in the Global Disaster‑Related
											Statistics Framework (G‑DRSF). The guidance will continue
											to evolve in step with advances in the global disaster
											risk reduction (DRR) scientific and practitioner
											community's capacity to understand compound, cascading,
											and complex linkages between triggers, drivers, and
											effects.
										</p>
										<p>
											The disaster event section, beyond serving as a container
											for all associated records (which are equivalent to the
											former datacards in DesInventar ), is associated with a
											distinct disaster event to which a system‑generated
											universally unique identifier can be assigned. This
											identifier is compatible with other systems, such as GLIDE
											or national disaster ID systems. In addition, disaster
											event records can be linked to other disaster events
											within the system, enabling the recording of cascading
											disaster chains, such as Natech (natural–technological
											hazards). This expands upon the previous capability in
											DesInventar, where cascading effects were captured using
											the "cause" data field when recording a disaster event.
										</p>
										<p>
											The disaster event data fields also allow for the
											inclusion of qualitative information related to early
											action, rapid assessments, and response operations. In
											addition, the disaster event section provides a summary of
											aggregated figures and values drawn from all associated
											disaster records (e.g., deaths, injuries, missing
											persons), as well as damages and losses expressed in
											monetary terms.
										</p>
										<p>
											The DELTA Resilience system also expands the core set of
											variables and disaggregation options for disaster event
											records. In the human effects section, new variables
											related to displacement are introduced, with options for
											multiple levels of intersectional disaggregation and date‑
											and time‑stamped data entries. These capabilities support
											use cases where information is dynamic and where it is
											important to capture how impacts - such as, for example,
											displacement flows and stocks - evolve over time. The
											system also supports compound disaggregation across
											multiple dimensions simultaneously, for example
											disaggregation by age, sex, income or poverty status, and
											disability for variables such as deaths, injuries, and
											missing persons.
										</p>
										<p>
											For other types of losses and damages, the DELTA
											Resilience data model adopts a sector‑based grouping of
											variables and data fields, aligned with the categories
											used in post‑disaster needs assessments: social,
											infrastructure, productive, and cross‑cutting. For
											example, the social category includes variables related to
											impacts on education and health, while the productive
											category includes options for sectors such as agriculture
											and tourism. The cross‑cutting category addresses issues
											that are not strictly sectoral but remain critical to
											understanding disaster impacts, such as the environment,
											employment, and livelihoods.
										</p>
										<p>
											Although not yet available in the beta version of the
											DELTA Resilience software, another key innovation is the
											functionality to integrate reference context and baseline
											information, such as data on exposure, vulnerability, and
											sector-specific statistics:
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Exposure information includes, for example, population
												and housing data and refers to the elements at risk,
												their location, their quantity, and other intrinsic
												characteristics.
											</li>
											<li>
												Vulnerability information refers to socio-economic
												characteristics of specific population groups (e.g.,
												literacy, income, dependency ratios, employment levels),
												as well as the physical, economic, or ecological
												vulnerability of assets and ecosystems (e.g.,
												characteristics of road networks, such as maintenance
												status, year of construction, type of materials used
												that may make specific assets more susceptible to
												damage).
											</li>
											<li>
												Sector-specific information might include supply and
												demand data in sectors such as tourism, including
												available capacities, services, employment, and
												contributions to the economy, as well as demand-side
												indicators like the number of arrivals and average
												duration of stay.
											</li>
											<li>
												Average unit costing refers to the use of standardised
												unit values for repairing or replacing damaged assets
												(e.g. cost per square meter of housing, cost per
												kilometer of road, or cost per hectare of crops). In
												line with Damage and Loss Assessment (DALA) and
												Post‑Disaster Needs Assessment (PDNA) guidance, these
												unit costs are applied to quantified physical damage to
												estimate economic damage. Unit costs are typically drawn
												from national price lists, procurement data, or other
												authoritative references, and may be adjusted where
												case‑specific information is available to reflect actual
												repair or replacement costs.
											</li>
										</ul>
										<p>
											Vulnerability, exposure, and other baseline information
											are not produced within DELTA Resilience, but are instead
											integrated from relevant national sources, such as
											national statistical offices or national spatial data
											infrastructures. Where authoritative national sources are
											not available or accessible, the system can provide
											default reference data from regional or global sources,
											ensuring continuity and analytical completeness.
										</p>
										<p>
											This baseline, reference, and contextual information is
											integrated into the data model to provide essential
											context for interpreting figures on losses and damages and
											for assessing disaster impact. Reference and baseline data
											are critical for comparing pre‑disaster and post‑disaster
											situations and for understanding the scale and
											significance of observed impacts. In particular, to
											accurately estimate and assign an economic value to
											losses—understood as changes in economic flows—it is
											essential to have access to statistics on use, production,
											and service levels, as well as to historical trends and
											forward‑looking projections that indicate how these
											variables might have evolved in the absence of the
											disaster.
										</p>
										<div className="overflow-x-auto">
											<table className="w-full border-collapse">
												<thead>
													<tr className="bg-slate-100">
														<th className="border border-slate-300 px-3 py-2 text-left font-semibold">
															Dimension
														</th>
														<th className="border border-slate-300 px-3 py-2 text-left font-semibold">
															DesInventar - strengths retained
														</th>
														<th className="border border-slate-300 px-3 py-2 text-left font-semibold">
															Key limitations in the legacy system
														</th>
														<th className="border border-slate-300 px-3 py-2 text-left font-semibold">
															DELTA Resilience solution
														</th>
													</tr>
												</thead>
												<tbody>
													<tr>
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Conceptual approach
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Event-based recording of disaster impacts; no
															thresholds for event registration; alignment with
															Sendai Framework principles
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Limited ability to clearly attribute impacts to
															specific hazardous events or represent cascading
															and compound chains
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Explicit linkage between hazardous events and
															disaster events, including cascading and compound
															events, using standard parameters and unique
															identifiers
														</td>
													</tr>
													<tr className="bg-slate-50">
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Data model
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Event-level capture of human impacts and physical
															damage; flexible, open-source structure
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Multiple records required to represent a single
															disaster; weak internal linkages
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Distinct disaster event entity acting as a
															container for records; system-generated unique
															event identifiers compatible with GLIDE and
															national systems
														</td>
													</tr>
													<tr>
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Human effects data
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Mortality and affected populations widely recorded
															and comparable across time
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Limited disaggregation, particularly by age, sex,
															disability, income or poverty status
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Expanded variable set and support for multiple and
															intersectional disaggregation, improving
															visibility of differentiated impacts
														</td>
													</tr>
													<tr className="bg-slate-50">
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Losses and damages
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Physical damage data captured across sectors
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Limited and inconsistent economic valuation of
															damages and losses
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Methodological guidance for economic valuation
															aligned with PDNA and DALA; support for damage,
															disruption, and losses estimation
														</td>
													</tr>
													<tr>
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Sector coverage
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Core variables for productive and service sectors
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Limited sector granularity and cross-sector
															analysis
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Expanded sector-based disaggregation across
															social, infrastructure, productive, and
															cross-cutting sectors
														</td>
													</tr>
													<tr className="bg-slate-50">
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Context and baselines
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Event records documented impacts
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Impacts often recorded without contextual,
															baseline, or reference data
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Integration of baseline, reference, exposure, and
															vulnerability data to support contextual analysis
															and counterfactual reasoning
														</td>
													</tr>
													<tr>
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Data governance
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Strong national ownership and long-standing NDMA
															engagement
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Limited standardization, data officialization, and
															documented workflows
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Strengthened data governance: standard
															definitions, taxonomies, metadata, data
															dictionaries, and sample standard operating
															procedures
														</td>
													</tr>
													<tr className="bg-slate-50">
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Institutional workflows
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Broad use for preparedness, response, and recovery
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Roles and quality-control responsibilities are
															often informal or unclear
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Configurable user roles, validation workflows, and
															guidance for institutionalization and coordination
														</td>
													</tr>
													<tr>
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Technology and Geographic Information Systems
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Basic geolocation and mapping in some instances
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Limited GIS functionality, visualization, and
															automation
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Enhanced georeferencing, GIS, built-in and
															on-demand analytics, and support for automation
														</td>
													</tr>
													<tr className="bg-slate-50">
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Interoperability
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Stand-alone national databases
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Weak integration with national statistics
															platforms and spatial data infrastructures
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Improved interoperability with national
															statistical systems, spatial data infrastructures,
															and risk information platforms
														</td>
													</tr>
													<tr>
														<td className="border border-slate-300 px-3 py-2 font-medium">
															Scalability and sustainability
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Customizable open-source solutions
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Aging technology and limited scalability
														</td>
														<td className="border border-slate-300 px-3 py-2">
															Modular, scalable architecture supporting
															long-term sustainability and system evolution
														</td>
													</tr>
												</tbody>
											</table>
										</div>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 6: What are the elements that remain the same from the DesInventar methodology?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DELTA Resilience retains core methodological principles
											from the DesInventar methodology to ensure continuity,
											comparability, and long‑term usability of disaster impact
											statistics.
										</p>
										<p>
											A fundamental element that remains unchanged is the
											absence of thresholds for the registration of disaster
											events. Any event - regardless of its scale, geographic
											extent, or sectoral scope—can be recorded, including
											highly localised or small‑scale events. This approach is
											aligned with the Sendai Framework for Disaster Risk
											Reduction and with the UN General Assembly‑endorsed
											definition of a disaster as "a serious disruption of the
											functioning of a community or a society at any scale due
											to a hazardous event interacting with conditions of
											exposure, vulnerability, and capacity, leading to impacts
											that may be immediate or manifest gradually, last over
											time, and exceed or test the capacity of the affected
											society to cope using its own resources."
										</p>
										<p>
											Another core element retained from DesInventar is the
											conceptual understanding that disaster events are
											triggered by hazardous events interacting with conditions
											of exposure, vulnerability, and capacity. In this sense,
											disasters are not "natural" and should not be understood
											as being caused solely by hazards, but rather as the
											outcome of these interacting conditions.
										</p>
										<p>
											Consistent with this approach, disaster events must have
											observable spatial and temporal manifestations of human,
											material, economic, and/or environmental losses and
											impacts. For temporal recording, partially complete date
											information (such as year, or year and month) may be used
											when full details are not available. Within DELTA
											Resilience, the treatment of start and end dates has
											evolved to support the registration of slow‑onset events,
											including climate‑related processes such as sea‑level rise
											or ocean acidification, for which precise beginning or end
											dates cannot be determined.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 7: What data workflows does the DELTA Resilience methodology support?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											In the system, records of hazardous events can be linked
											to disaster events, which serve as containers for disaster
											records (equivalent to the former DesInventar datacards ).
											Disaster events capture the effects of a hazard on
											specific locations, assets, or other exposed elements.
											Linkages are established using the system's linking
											parameters and universally unique identifiers (UUIDs),
											allowing hazardous events and disaster events to be
											associated in a consistent and traceable manner. These
											linkages can be created, reviewed, and confirmed at any
											time, in accordance with a nationally approved workflow
											that defines roles and procedures for proposing and
											validating linkages (for example, confirming that a
											specific disaster event was triggered by a particular
											hazardous event).
										</p>
										<p>
											To ensure effective data governance and use, it is
											recommended that, as part of institutionalizing DELTA
											Resilience, roles and responsibilities for data collection
											and validation are clearly and formally assigned to
											designated institutional actors. These assignments should
											be documented in national operational procedures, manuals,
											or other relevant governance instruments.
										</p>
										<p>
											To support this process, DELTA Resilience is accompanied
											by two complementary toolkits: a Data Ecosystem Maturity
											Assessment ( DEMA ) and a Data Readiness Assessment ( DARA
											). Together, these tools enable countries to assess the
											maturity of their disaster and risk data ecosystem, map
											institutional actors and their roles, evaluate readiness
											to track hazardous events and associated losses and
											damages, and identify concrete actions required to
											strengthen capacities and progress toward
											institutionalization of the system.
										</p>
										<p>
											For example, variables related to losses and damages in
											the agriculture sector may be assigned to designated data
											officers within relevant local, provincial, regional, or
											central agricultural services. Quality control and
											validation responsibilities should be defined in line with
											national regulations and institutional arrangements,
											whether centralized, decentralized, or organized through
											horizontal or vertical coordination mechanisms. The DELTA
											Resilience software supports this governance structure by
											allowing administrative users to assign specific system
											roles - such as data collector, data validator, or data
											viewer - reflecting operational responsibilities within
											national workflows.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 8: What methodologies does the DELTA Resilience (Disaster &amp; Hazardous Events, Losses and Damages Tracking &amp; Analysis) use to assess losses and damages?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The DELTA Resilience (Disaster &amp; Hazardous Events,
											Losses and Damages Tracking &amp; Analysis) builds on
											existing approaches such as the Damage and Loss Assessment
											(DALA) , Post-Disaster Needs Assessment (PDNA) ,
											DesInventar Sendai , the Sendai Framework Monitor (SFM) ,
											and the FAO methodology for agriculture . It integrates
											these into a standardised framework that captures human,
											economic, and environmental impacts of disasters. DELTA
											Resilience uses agreed international standards for
											taxonomies (how hazards and impacts are classified),
											variables (the specific data points collected, such as
											deaths, houses destroyed, or service disruptions), and
											hazard classification , while allowing countries to adapt
											them to their own contexts. Importantly, DELTA Resilience
											also covers slow-onset events (like desertification or
											sea-level rise) and non-economic losses (such as health
											impacts, displacement, cultural heritage, or social
											cohesion), ensuring a more complete picture of disaster
											and climate-related impacts.
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							3. About the software system
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 9: How interoperable is the DELTA Resilience system with DesInventar?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DesInventar‑based databases contain disaster records only,
											representing local observations of losses and damages (
											datacards ), rather than explicit disaster events as
											analytical constructs. To support the transition to the
											DELTA Resilience data model, a migration pathway has been
											developed to safely transfer all DesInventar records into
											the relevant national DELTA Resilience instance, subject
											to approval by the respective country administrators. This
											process is facilitated through an API‑based Extract,
											Transform and Load (ETL) middleware, branded as DiX (
											DesInventar Information Exchange), which transforms
											records from legacy DesInventar country databases into
											DELTA Resilience‑compatible records.
										</p>
										<p>
											To accommodate older DesInventar databases containing
											fuzzy or non‑quantified variables (for example, sectoral
											impacts reported without numeric values, or references to
											deaths without specified numbers), adjustments have been
											made to the DELTA Resilience data entry structure. During
											migration, records originating from DesInventar are
											clearly identified using a convention agreed with national
											administrators (e.g. source: DesInventar – Country X).
											Fields containing fuzzy data, non‑aggregated information,
											or variables based on DesInventar‑specific definitions
											(such as "affected people, according to DesInventar
											definitions") are flagged as "Old DesInventar variable".
											This ensures transparency for data producers and users,
											preserves historical records, and clearly signals that
											future data collection should follow updated definitions,
											standards, and disaggregation practices supported by DELTA
											Resilience.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 10: How interoperable is DELTA Resilience with Sendai Framework Monitoring?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DesInventar (Sendai version) and the Sendai Framework
											Monitoring (SFM) system have historically been
											interoperable. Governments using DesInventar Sendai to
											record event‑by‑event disaster losses and damages and
											maintaining their data on the UNDRR‑hosted DesInventar.net
											server, have been able to use an existing application
											programming interface (API) to transfer data to the SFM
											platform. This interoperability enables countries to
											report against Sendai Framework Targets A to D, which
											measure progress in reducing disaster‑related mortality,
											the number of people affected, direct economic losses, and
											damage to critical infrastructure and basic services.
										</p>
										<p>
											To support the transition from DesInventar to DELTA
											Resilience, a dedicated middleware solution has been
											developed as an extension of this interoperability
											approach. This API‑based Extract, Transform and Load (ETL)
											tool, branded as DiX ( DesInventar Information Exchange),
											is a backend, faceless service without a user interface.
											Its primary function is to transform legacy DesInventar
											records and migrate them into the DELTA Resilience data
											model in a structured and controlled manner.
										</p>
										<p>
											Building on this foundation, a new API is being prepared
											to support sustained interoperability between national
											DELTA Resilience instances and the SFM system. This
											forthcoming API will enable countries to continue
											aggregating event‑level disaster losses and damages
											recorded in DELTA Resilience into annual reporting values
											required by the SFM. In line with existing Sendai
											reporting practices, this will support the computation of
											indicators for Targets A (substantially reduce global
											disaster mortality), B (substantially reduce the number of
											affected people), C (reduce direct disaster economic loss
											in relation to global GDP), and D (substantially reduce
											disaster damage to critical infrastructure and disruption
											of basic services).
										</p>
										<p>
											Together, DiX and the new DELTA Resilience–SFM API form a
											coherent interoperability pathway: DiX addresses legacy
											data migration, while the new API will support routine,
											forward‑looking reporting from DELTA Resilience to the
											Sendai Framework Monitoring system, maintaining continuity
											with established reporting workflows while leveraging the
											enhanced data model and governance features of DELTA
											Resilience.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 11: What is the license for DELTA Resilience software?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The DELTA Resilience software is currently distributed
											under Apache License 2.0. The Apache License 2.0 is a
											permissive open-source license. This means you are free to
											use, modify, and share the DELTA Resilience software, even
											for commercial purposes, as long as you include a copy of
											the license and give proper credit to the original
											authors. It also provides an explicit grant of patent
											rights and comes with no warranty, which is typical for
											open-source software. An explicit grant of patent rights
											means the creators permit you to use any patents that
											apply to the software. There is a &amp;quot;no
											warranty&amp;quot; clause, meaning the software is
											provided &amp;quot;as is &amp;quot;;, the creators are not
											responsible for any issues or damage that might result
											from using it.
										</p>
										<p>
											This license is designed to encourage widespread adoption
											and collaboration, while also protecting the rights of
											both users and developers.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 12: What is the licensing for data contained in the DELTA Resilience national instance?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The licensing of data contained in a national DELTA
											Resilience instance is determined by the national
											authority or institution responsible for managing the
											system. Because each country owns and governs its national
											instance of DELTA Resilience, it retains full control over
											the data it collects, validates, and publishes through the
											platform, as well as over any data it may choose to share
											with any DELTA Resilience regional or UNDRR global
											instances, once and if established.
										</p>
										<p>
											Accordingly, data licensing arrangements may vary
											depending on national policies, regulations, and
											data‑sharing agreements. In many cases, countries may
											choose to apply an open data license (such as Creative
											Commons Attribution or Open Data Commons), particularly
											for aggregated, non‑sensitive, and anonymized data
											intended for public dissemination.
										</p>
										<p>
											To determine the applicable licensing terms for a specific
											national DELTA Resilience instance, users should consult
											the data policy or terms of use published by the national
											system administrator or contact the designated national
											focal point for further clarification.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 13: What is the recommended citation for the data produced through DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											When using or referencing data from a national DELTA
											Resilience instance, users should cite the national
											authority responsible for the data, along with the DELTA
											Resilience platform. A recommended citation format
											following as general reference style of the APA (American
											Psychological Association) citation style is: [Name of
											National Authority] (Year). Disaster loss and damage data.
											[DELTA Resilience platform name or URL. Accessed on
											[Date]. Example: National Disaster Management Agency of
											Country X (2025). Disaster losses and damages data. DELTA
											Resilience Country X Platform. Accessed on 30 June 2025.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 14: What are the requirements to host a DELTA Resilience country instance?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											To run a DELTA Resilience (Disaster Tracking System)
											country, for instance, a computer server with enough
											processing power and memory is needed. Specifically, the
											server should have a modern multi-core processor
											(quad-core), at least 8 GB of memory (RAM), and around 50
											GB of available space on a solid-state drive (SSD), which
											helps the system run faster and more reliably.
										</p>
										<p>
											The software that runs DELTA Resilience needs to be
											installed on a compatible operating system. This can be a
											recent version of Linux server (such as Ubuntu, CentOS, or
											Debian), or Windows Server (with a special setup that
											allows it to work like Linux). DELTA Resilience also
											requires a type of database called PostgreSQL, along with
											a mapping feature called PostGIS , which helps handle
											geographic and spatial data. In addition, the server must
											run Node.js, a program that allows web-based applications
											like DELTA Resilience to function. On top of this, the
											application uses Remix and React for the web interface.
											Other necessary components include a way to send emails
											from the system (called an SMTP email relay), a website
											address (domain or subdomain), and a security certificate
											(SSL) to protect users' data and ensure secure access.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 15: Is DELTA Resilience an open-source software, and what does it mean that DELTA Resilience is open-source software?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DELTA Resilience is an open ‑ source software platform,
											meaning that its source code — the instructions that make
											the system function — is freely available for anyone to
											view, use, modify, and share. Unlike proprietary or
											commercial software, open ‑ source solutions do not
											require the purchase of software licences. This allows
											countries and institutions to host, operate, and manage
											their own national instances of DELTA Resilience without
											licensing fees, while retaining full ownership and control
											over their systems.
										</p>
										<p>
											The source code and software components of DELTA
											Resilience are published and maintained in a public GitHub
											repository (
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://github.com/unisdr/delta"
												target="_blank"
												rel="noopener noreferrer"
											>
												https://github.com/unisdr/delta
											</a>
											). This repository contains the core application code,
											configuration files, and related technical resources that
											developers and IT teams may use to deploy, adapt, or
											extend the software. Making the code publicly available
											promotes transparency, enables peer review, and allows
											countries, partners, and developers to contribute
											improvements or reuse components in line with open ‑
											source licensing terms.
										</p>
										<p>
											In parallel, the technical documentation hosted on the
											DELTA Resilience website (
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://www.deltaresilience.org/en/about/technical-specifications"
												target="_blank"
												rel="noopener noreferrer"
											>
												https://www.deltaresilience.org/en/about/technical-specifications
											</a>
											) provides functional and architectural guidance rather
											than source code. This documentation describes the
											system's design principles, data model, standards and
											classifications, interoperability concepts, and
											implementation considerations. It is intended for a
											broader audience, including policymakers, statisticians,
											system administrators, and practitioners, to support
											informed adoption and institutionalisation of DELTA
											Resilience without requiring direct engagement with the
											underlying codebase.
										</p>
										<p>
											Together, the GitHub repository and the technical
											documentation serve complementary purposes:
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												GitHub provides access to the software itself and
												supports development, deployment, and customization.
											</li>
											<li>
												Deltaresilience.org provides authoritative technical
												explanations and guidance on how the system is
												structured, how it should be used, and how it aligns
												with international disaster risk reduction and disaster
												statistics frameworks.
											</li>
										</ul>
										<p>
											This combination of open ‑ source code and openly
											available technical documentation supports transparency,
											flexibility, collaboration, and sustainability, enabling
											countries to adapt DELTA Resilience to their specific
											needs while benefiting from shared improvements across the
											global community.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 16: Are there any software dependencies to consider installing and running the DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Open-source dependencies are additional components or
											tools that an open-source application relies on to
											function properly. These are also open-source, freely
											available, and maintained by their own development
											communities. In the case of DELTA Resilience, PostgreSQL
											and PostGIS (freely downloadable software) are examples of
											such dependencies. However, they do not add extra software
											requirements beyond what is already expected (outlined in
											the question related to running DELTA Resilience). These
											tools are standard parts of the DELTA Resilience system
											architecture, well-supported, and fully integrated,
											meaning no additional software or licenses are needed to
											use them as part of a DELTA Resilience installation.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 17: In which languages is the interface available?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The DELTA Resilience user interface is currently available
											in English, Arabic, and Russian, with Spanish and
											Portuguese under active development.
										</p>
										<p>
											DELTA Resilience already uses Weblate , an open‑source,
											web‑based translation management platform, to support the
											development and maintenance of additional language
											versions. Weblate enables collaborative translation by
											allowing authorized contributors to translate interface
											text strings directly through a shared online workspace,
											ensuring that translations can be updated continuously as
											the system evolves.
										</p>
										<p>
											While Weblate provides technical support for managing and
											integrating translations, human input remains essential to
											ensure accuracy, consistency, and appropriate use of
											disaster risk reduction terminology. Translations proposed
											through Weblate must therefore be reviewed and validated
											by qualified human reviewers, such as national experts,
											linguists, or designated focal points, before they are
											approved and made available in the live system. This
											governance step ensures that translated content reflects
											national context, sector‑specific terminology, and agreed
											definitions, rather than relying solely on automated or
											crowd‑sourced inputs.
										</p>
										<p>
											In the interim, users may also rely on browser‑based
											automatic translation tools, depending on their browser
											settings. However, these automated translations are
											intended only as temporary aid for navigation and should
											not be considered authoritative for official use or
											reporting.
										</p>
										<p>
											Together, the use of Weblate and structured human
											validation supports a community‑driven yet
											quality‑controlled approach to multilingual access in
											DELTA Resilience, allowing additional language versions to
											be developed sustainably while maintaining accuracy and
											consistency across national and international users
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							4. Communications & Branding
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 18: What is the branding for the DELTA Resilience system?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The DELTA Resilience (Disaster &amp; Hazardous Events,
											Losses and Damages Tracking &amp; Analysis) for hazardous
											events and associated losses and damages does not yet have
											a definitive global visual identity. However, the acronym
											&amp;quot;DELTA Resilience&amp;quot; has been widely
											adopted and provides flexibility for countries to
											contextualize and signal ownership through national
											branding of their systems, for example, Country DELTA
											Resilience, following a similar approach to the branding
											used for DesInventar (DI), such as LaoDI , CambDI , etc.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 19: Are there limits for users to be created in DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DELTA Resilience does not impose a limit on the number of
											users or the number of geographic-administrative divisions
											that can be configured for a national DELTA Resilience
											instance. The number of users assigned different roles
											within the system (e.g., administrator, data collector,
											data validator) is determined by each country's database
											administrators.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 20: How many geographic levels can admin users create in DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Unlike DesInventar Sendai, which allows up to three
											administrative levels typically representing subnational
											entities, DELTA Resilience enables an unrestricted number
											of configurable geographic-administrative levels.
										</p>
										<p>
											This flexibility allows countries to align the system with
											their actual governance structures and data workflows,
											including more granular units such as municipalities,
											neighborhoods, districts, or local committees/civil
											protection services that may directly input data. While
											three levels may be sufficient in more centralized
											countries, they have proven inadequate in federated
											systems or where strong data collection capacities exist
											at city or local levels.
										</p>
										<p>
											By supporting customizable geographic hierarchies, DELTA
											Resilience enables more precise data collection,
											strengthens local ownership, and improves alignment with
											national administrative structures. In addition to tagging
											data to specific administrative-geographic levels, DELTA
											Resilience also introduces geocoding capabilities that
											were not available in DesInventar. This allows users to
											geotag records, for example, for damaged infrastructure
											assets or to define the geographic extent of a hazardous
											event or affected area. As a result, DELTA Resilience
											supports both indexing data to an administrative unit and
											geospatial data using points, lines, or polygons, like any
											modern geographic information system (GIS).
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							5. On Data migration from the legacy system
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 21: What will happen with DesInventar Sendai and the data it contains?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The data contained in DesInventar Sendai–based databases
											can be migrated using an API-based Extract, Transform, and
											Load (ETL) tool developed specifically for this purpose.
											As DesInventar.net will no longer be supported by UNDRR
											after December 2027 , governments are encouraged to
											transition to DELTA Resilience, and support will be
											provided to facilitate a smooth migration process.
										</p>
										<p>
											To simplify this transition, all data currently hosted on
											the UNDRR-maintained DesInventar.net server will be
											converted into a DELTA Resilience, compatible format and
											made available for users to load into their national DELTA
											Resilience, instances. The publicly available data hosted
											on DesInventar.net will remain accessible for consultation
											purposes.
										</p>
										<p>
											At this stage, the API is publicly available on the
											DesInventar.net server and can be used to migrate data
											hosted on that UNDRR-maintained server. For data hosted on
											other DesInventar instances, whether public or private,
											administrators may also use the API to migrate their
											datasets. Researchers and other stakeholders interested in
											continuing to use the DesInventar Sendai software may
											still download and run it independently.
										</p>
										<p>
											UNDRR provides general guidance and technical
											documentation for using the API. Requests for direct
											technical assistance will be reviewed and addressed on a
											case-by-case basis.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 22: Can I migrate data from other disaster loss databases?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The API to transfer data from DesInventar to DELTA
											Resilience has been designed to transform data organized
											as per The API developed to transfer data from DesInventar
											to DELTA Resilience is designed to transform data
											structured according to the DesInventar format into
											records compatible with the DELTA Resilience data model.
											However, the tool can also be adapted to transfer disaster
											losses and damages data organized in other formats,
											provided it can be transformed into a DELTA Resilience -
											compatible structure.
										</p>
										<p>
											This is technically possible but may require adjustments
											to the tool. Requests for support will be reviewed and
											addressed on a case-by-case basis.
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							6. On the country rollout
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 23: What does it mean to roll out DELTA Resilience at the country level?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The process of introducing DELTA Resilience (Disaster
											&amp; Hazardous Events, Losses and Damages Tracking &amp;
											Analysis) for national use and long‑term
											institutionalization is referred to as a "rollout." A
											rollout follows a step‑by‑step approach designed to
											support countries in establishing a sustainable system and
											methodology for collecting, organizing, analyzing, and
											applying information on hazardous events, associated
											losses and damages, and their impacts.
										</p>
										<p>
											DELTA Resilience software is one component of a broader
											toolkit that countries may choose to adopt as part of this
											process. A rollout does not necessarily imply that
											countries must deploy UNDRR‑supported software if
											alternative systems are already in place or preferred. In
											many cases, the primary needs identified during a rollout
											relate instead to data governance arrangements,
											methodological development, standardization, or technical
											and analytical capacity building, rather than software
											deployment alone.
										</p>
										<p>
											To better understand national needs and to design a
											context‑specific implementation plan, UNDRR and its
											partners recommend conducting a Data Ecosystem Maturity
											Assessment (DEMA) and a Data Readiness Assessment (DARA).
											These self‑assessment tools help countries evaluate their
											overall data governance structures, the organisation and
											flow of their data value chain, and existing institutional
											and technical capacities. The findings provide a
											structured basis for developing a tailored national
											rollout plan and may also inform the preparation of
											project proposals to engage donors and partners for
											targeted technical or financial support..
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 24: Which partners support the DELTA Resilience rollout in countries?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											As a general principle, UNDRR, together with its core
											partners UNDP and WMO, is available and committed to
											supporting countries seeking to strengthen their disaster
											loss and damage tracking systems using DELTA Resilience
											(Disaster &amp; Hazardous Events, Losses and Damages
											Tracking &amp; Analysis). The type of support provided, as
											well as the involvement of additional UN entities,
											regional intergovernmental organizations, or non‑UN
											partners, is determined on a case‑by‑case basis. This
											depends on factors such as a country's data and digital
											capacity, level of development, regional and national
											context, and specific needs or requests.
										</p>
										<p>
											Depending on the intended use and application of disaster
											losses and damages data, specialized support mechanisms
											may also be mobilised . For example, where the objective
											is to strengthen the use of such data for impact‑based
											forecasting, early warning, or early action, countries may
											receive targeted support from dedicated early warning
											partners, specialized initiatives, and relevant funding
											mechanisms.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 25: When will the changeover to DELTA Resilience happen?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The beta version of the DELTA Resilience software was
											launched in June 2025, and the broader toolkit is being
											released progressively. New software functionalities,
											methodological notes, and capacity‑development tools are
											made available as they are finalized, incorporating
											feedback from technical experts and country users. Since
											DELTA Resilience is more than a software solution, the
											timing of when to begin strengthening national capacities,
											governance arrangements, methodologies, and tools for
											tracking hazardous events and associated losses and
											damages is determined by each national government.
										</p>
										<p>
											The DELTA Resilience software beta is currently available
											upon request for countries interested in exploring the
											system, and the source code is publicly accessible through
											the UNDRR GitHub repository:
										</p>
										<p>
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://github.com/unisdr/delta"
												target="_blank"
												rel="noopener noreferrer"
											>
												https://github.com/unisdr/delta
											</a>
										</p>
										<p>
											A recommended starting point for engagement is to conduct
											a self‑assessment of the national disaster data ecosystem,
											examining not only how disaster data are produced and by
											whom, but also how they are used and by which
											institutions. Such an assessment helps identify existing
											capacities, gaps, and coordination challenges, and may
											reveal new opportunities for collaboration across sectors
											and institutions.
										</p>
										<p>
											In practice, this process often demonstrates how improved
											data quality, standardization, and accessibility can
											strengthen evidence‑based decision‑making for disaster
											risk reduction, preparedness, response, and recovery. The
											assessment can then guide the development of a national
											roadmap to strengthen data ecosystem maturity and identify
											practical entry points, including priority activities and
											outputs for a work plan to institutionalize a Disaster
											Tracking System powered by DELTA Resilience.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 26: What technical assistance is available for countries interested in utilizing the system?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											UNDRR, UNDP, and WMO are open to receiving requests for
											technical assistance. Depending on the specific context,
											identified needs, comparative advantages, in-country
											portfolios, and the resources available to respond,
											different forms of support may be offered.
										</p>
										<p>
											At a minimum, countries that reach out to any of these
											partners will receive orientation on the DELTA Resilience
											toolkit of resources. Additional resources, such as
											training modules, technical guidance, and tutorials in
											various formats and languages, are being progressively
											developed and made available, including through digital
											and interactive platforms.
										</p>
										<p>
											For UNDRR, all technical assistance and country-level
											support are framed within its broader engagement on risk
											knowledge. This includes efforts to strengthen national
											capacities to produce, use, and govern disaster and risk
											data, transforming it into actionable knowledge and
											insights. The goal is to enable a better understanding of
											risk and disaster impacts, and to inform risk reduction
											and management decisions in the context of sustainable
											development and risk-informed humanitarian action.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 27: What does it mean to institutionalize the system?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Institutionalising DELTA Resilience (Disaster &amp;
											Hazardous Events, Losses and Damages Tracking &amp;
											Analysis) refers to the process of fully integrating it
											into a country's official systems, institutional
											arrangements, and data ecosystems, so that it becomes a
											sustainable and routine component of disaster risk
											management. This integration supports national efforts to
											avert, minimise , and address loss and damage, and to
											inform risk‑informed development and long‑term
											resilience‑building.
										</p>
										<p>
											Institutionalisation goes well beyond software adoption.
											It involves strengthening the broader disaster and risk
											data ecosystem within which DELTA Resilience operates,
											including the governance frameworks, institutional
											capacities, methodologies, data flows, and workflows
											required to systematically collect, analyse , validate,
											share, and use information on hazardous events, associated
											losses and damages, and their impacts. This includes
											ensuring coherence and interoperability across data
											producers and users, such as national statistical offices,
											disaster management authorities, sectoral ministries, and
											scientific and technical agencies.
										</p>
										<p>
											In practice, institutionalising DELTA Resilience typically
											includes:
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Clarifying and assigning roles and responsibilities
												across institutions involved in the disaster data
												ecosystem, covering data generation, validation,
												analysis, dissemination, and use.
											</li>
											<li>
												Embedding the system within legal, regulatory, or policy
												frameworks, where appropriate, to ensure authority,
												continuity, and accountability across the data value
												chain.
											</li>
											<li>
												Establishing regular and standardised data collection,
												integration, and quality ‑ assurance processes, aligned
												with national and international statistical and disaster
												risk reduction standards.
											</li>
											<li>
												Building and sustaining technical and human capacities
												across institutions to manage the system and to
												interpret and apply disaster loss and damage data
												effectively.
											</li>
										</ul>
										<p>
											Promoting systematic use of data across the ecosystem,
											ensuring that disaster loss and damage information informs
											planning, decision‑making, monitoring, reporting, and
											accountability across disaster risk reduction,
											preparedness, response, recovery, and climate adaptation
											processes.
										</p>
										<p>
											Ultimately, institutionalizing DELTA Resilience means that
											the system is owned, led, and maintained by national
											institutions and embedded within a functioning national
											disaster data ecosystem. It contributes to the production
											of authoritative and, where relevant, official statistics
											on disaster losses, damages , and broader climate and
											disaster impacts. The long‑term objective is to strengthen
											evidence‑based decision‑making, enable effective policies
											and implementation, and support risk prevention, risk
											reduction, resilient recovery, and resilience‑building as
											part of sustainable development
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							7. On data collection
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 28: What quantitative data can be recorded in the DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Quantitative data refer to measurable indicators that can
											be expressed numerically and form the backbone of disaster
											impact statistics, as defined in internationally agreed
											methodological frameworks such as the Global
											Disaster‑Related Statistics Framework (G‑DRSF) and
											associated disaster loss and damage methodologies. Within
											DELTA Resilience, quantitative data may include, but are
											not limited to, the following categories:
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Hazardous events: Physical measurements describing the
												hazard itself, such as magnitude or intensity (e.g. wind
												speed, seismic intensity, rainfall accumulation, flood
												extent).
											</li>
											<li>
												Damages: The direct physical destruction or damage to
												assets, expressed in numbers of units affected (e.g.
												houses destroyed or damaged, schools and health
												facilities affected, kilometres of roads or other
												infrastructure damaged). Damage represents impacts on
												capital stocks.
											</li>
											<li>
												Losses: In line with the G-DRSF, losses are defined as
												changes in economic flows resulting from a disaster,
												occurring over time after the event. This includes
												reductions in production, income, employment, or service
												provision, as well as increases in costs, compared to a
												counterfactual scenario in which the disaster had not
												occurred . Losses therefore capture impacts on economic
												activity and service delivery, rather than on physical
												assets, and are typically estimated using baseline data,
												historical trends, and projections.
											</li>
											<li>
												Disruptions: Measures of interruptions to services or
												systems, such as the duration of service outages (e.g.
												hours or days without electricity, water, transport, or
												health services) and the number of users or
												beneficiaries affected by those disruptions.
											</li>
											<li>
												Baseline and reference information : Contextual
												quantitative data used to interpret damages and losses
												and to estimate disaster impacts and losses over time.
												These may include sectoral supply and demand data,
												production levels, service coverage, pricing and costing
												information (e.g. commodity prices, farm ‑ gate prices,
												replacement costs of infrastructure assets, such as cost
												per kilometre of road).
											</li>
											<li>
												Human effects: Quantified information on people affected
												by disasters, including numbers of deaths, injuries,
												displaced persons, evacuees, or affected populations,
												with the possibility of disaggregation by age, sex,
												disability, income or other demographic and socio ‑
												economic characteristics.
											</li>
										</ul>
										<p>
											Together, these quantitative data categories support the
											production of coherent, comparable, and policy‑relevant
											disaster impact statistics, enabling analysis of both the
											direct physical effects of disasters (damages) and their
											longer‑term socio‑economic consequences (losses and
											disruptions) and overall macro, micro or individual
											impacts. Within DELTA Resilience, they provide the
											methodological foundation for tracking disaster impacts
											across sectors and over time, supporting national
											decision‑making, international reporting, and alignment
											with global statistical and disaster risk reduction
											frameworks.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 29: What qualitative data can be recorded in the DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Qualitative data can be captured at different levels in
											the DELTA Resilience/ Disaster Tracking System
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Hazardous events: for example, descriptions of the
												phenomenon's characteristics, warnings issued, the chain
												of events, and interactions.
											</li>
											<li>
												Disaster events: such as narratives of response
												operations, or assessment methodologies applied.
											</li>
											<li>
												Disaster records (losses and damages): particularly in
												relation to non-economic losses, where quantitative data
												may be limited but qualitative insights are valuable to
												capture the lived experience, for example, on impacts
												related to loss of intangible cultural assets such as
												traditions, etc.
											</li>
										</ul>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 30: Can I collect data on any type of hazard using the DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Yes, DELTA Resilience enables the collection of data on
											any hazardous event of concern for a country, including
											both slow-onset disasters and climate change processes, as
											well as extreme events. The system is based on the
											ISC/UNDRR Hazard Classification Review (current version:
											2025), which identifies and categorizes up to 281 specific
											hazards across eight hazard types: hydro-meteorological,
											extraterrestrial, geological, biological, environmental,
											chemical, technological, and societal.
										</p>
										<p>
											Reference:{" "}
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://www.undrr.org/publication/documents-and-publications/hazard-definition-and-classification-review-technical-report"
												target="_blank"
												rel="noopener noreferrer"
											>
												https://www.undrr.org/publication/documents-and-publications/hazard-definition-and-classification-review-technical-report
											</a>
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 31: Can I collect data from the field directly on the DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Yes, DELTA Resilience supports field data collection
											through its web-based interface, which can be accessed
											from any internet-connected device, including tablets and
											smartphones. This allows authorized users to enter
											disaster data directly from the field in real time or
											during post-disaster assessments.
										</p>
										<p>
											In future releases, the DELTA Resilience architecture will
											include a mobile application for custom-tailored survey
											forms, enabling seamless offline data collection. It will
											also support integration with external mobile data
											collection tools (such as KoBoToolbox , ODK, or custom
											apps), allowing offline data to be synchronised with the
											system once connectivity is available. This flexibility
											ensures that data from remote or low-connectivity areas
											can still be captured and incorporated into national
											records efficiently and securely.
										</p>
										<p>
											Field data collection workflows and access permissions are
											defined by each country's national implementation strategy
											and governance framework for DELTA Resilience.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 32: Can I use a tablet or mobile device to collect data on DELTA Resilience ? Does it work if I am offline?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Yes, the DELTA Resilience software is designed with a
											mobile-first approach, ensuring that screens are readable
											and usable on both small and large devices. This means
											data can be entered directly into DELTA Resilience using a
											mobile phone or tablet, as long as an internet connection
											is available.
										</p>
										<p>
											However, offline functionality, such as collecting data
											without connectivity and syncing it later, requires a
											mobile app, which is currently not yet available. The
											development of such an app is planned as part of the DELTA
											Resilience program's future roadmap.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 33: Who at the national and local levels needs to be engaged in collecting data in DELTA Resilience ?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The decision on who is responsible for collecting data
											within a national DELTA RESILIENCE instance rests with the
											government. Depending on the country's administrative and
											geographic structures, the degree of sectoral
											decentralization, and the roles and responsibilities
											assigned to different levels of government, the national
											DELTA Resilience administrator may choose to assign
											different roles to central and sub-national entities
											within the system.
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							8. On data analysis
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 34: What types of analysis are possible to do on DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The DELTA Resilience allows users to analyse disaster
											impacts in multiple ways, by hazard type (e.g., floods,
											droughts, earthquakes), by specific disaster event, or by
											sector such as agriculture, health, education, or
											infrastructure. A key feature is that impact data are
											directly connected to hazardous event information (e.g.,
											magnitude, duration, spatial footprint), which strengthens
											understanding of chains of effects and supports forensic
											and trend analysis. The system also integrates baseline
											and reference data (such as pre-disaster economic,
											demographic, or environmental indicators), allowing users
											to put losses and damages into context, for example,
											assessing the scale of affected population, service
											disruption, or production loss relative to pre-disaster
											levels. Because DELTA Resilience data can be disaggregated
											to the sub-national level, it provides granular insights
											into local vulnerabilities and sectoral impacts, helping
											governments and stakeholders target interventions more
											effectively and plan risk-informed recovery and
											development strategies. In addition, linking hazard
											parameters with observed impacts creates the basis for
											impact-based forecasting, helps define thresholds for
											warnings, and supports the selection of anticipatory and
											early actions to minimise losses before disasters fully
											unfold.
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							9. On data visualisation
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 35: What are the system capabilities for data visualisation?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											In the DELTA Resilience Beta version, the system includes
											three preconfigured dashboards designed to support rapid,
											template-based data visualisation . A dashboard is a
											visual interface that displays key data using charts,
											graphs, maps, and summary tables, making it easier to
											understand trends, patterns, and impacts at a glance .
										</p>
										<p>
											Each of the three dashboards in DELTA Resilience offers a
											different entry point for exploring data:
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Hazard-based dashboard allows users to view and analyse
												disaster data by type of hazard.
											</li>
											<li>
												Sector-based dashboard filters and presents data based
												on sectors such as health, agriculture, infrastructure,
												etc.
											</li>
											<li>
												Disaster event dashboard displays the effects of a
												specific disaster event across multiple dimensions,
												including human, economic, environmental, and other
												dimensions of impact.
											</li>
										</ul>
										<p>
											These dashboards help users quickly access and interpret
											key information for decision-making, reporting, and
											support further losses and damages data collection.
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							10. On quality control
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 36: How does DELTA Resilience support quality control?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DELTA Resilience includes built-in features to support
											data quality control throughout the entire data lifecycle.
											The system allows administrators to assign specific user
											roles, such as data collectors, validators, and reviewers,
											to ensure that data is reviewed and validated before it is
											finalised or published. Additionally, DELTA Resilience
											provides audit trails, logs or edit histories, and status
											flags (e.g., draft, approved, sent for review, published)
											to help track the quality, completeness, and reliability
											of each record over time.
										</p>
										<p>
											Some validation mechanisms are embedded directly into
											system computations. For example, in the case of human
											effects variables, the system checks the consistency of
											disaggregated data. Required fields are clearly marked,
											and users cannot save a record unless those fields are
											completed, supporting the systematic capture of some
											important fields and metadata.
										</p>
										<p>
											As part of the Country DELTA Resilience customization
											process, additional validation rules can be configured by
											the national administrator in alignment with national
											standards and data workflows. This helps to further
											enhance data consistency, accuracy, and credibility across
											the system.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 37: Who is responsible for quality control?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Quality control responsibilities are determined at the
											national level by the institution managing DELTA
											Resilience. Typically, the national DELTA Resilience
											administrator, in coordination with relevant government
											agencies or focal points, assigns validation and review
											roles to appropriately trained personnel. These may
											include national statistical offices, sectoral ministries,
											disaster risk management agencies, or subnational
											authorities, depending on the country's institutional
											arrangements. The overall objective is to ensure that each
											data point is reviewed by actors with the appropriate
											expertise before it becomes part of the official records.
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							11. On owning, administering hosting and sharing data
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 38: How is DELTA Resilience owned, administered, and shared across local, national, regional, and global levels?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Building on the legacy of DesInventar, the DELTA
											Resilience is designed at its core to support
											country-owned systems for tracking disaster losses and
											damages, with the ability to operate at sub-national
											resolution. While DesInventar evolved organically over
											time into a government tool for institutionalising
											official disaster loss databases, its early implementation
											varied: some databases were managed by regional
											intergovernmental organisations, others by technical or
											academic institutions, and in some cases, state-level,
											city, or metropolitan databases existed either in parallel
											to or disconnected from national-level systems.
										</p>
										<p>
											In contrast, the DELTA Resilience is clearly positioned as
											a toolkit for producing official disaster-related
											statistics, particularly in relation to disaster impact. A
											key innovation of DELTA Resilience is that it does not
											limit the number of sub-national geographic or
											administrative levels that can be configured by national
											administrators. By using a "nesting" approach, DELTA
											Resilience enables countries to zoom in and out on
											disaster effects across different territorial levels.
											While hazardous events and disasters are not constrained
											by administrative boundaries, losses and damages reporting
											often relies on recognised administrative or statistical
											units for relevance and comparability. These
											administrative boundaries may overlap with other
											geographic areas used for data aggregation, such as river
											basins or ecosystem zones, especially when assessing
											environmental or biodiversity-related losses.
										</p>
										<p>
											While recognising the valuable work done by researchers
											and academic institutions in collecting and compiling
											historical disaster data from multiple sources, and in
											some cases, maintaining data recording functions over many
											years, DELTA Resilience invites academic organisations to
											take on a different, more strategic role. To share data
											with the UNDRR-hosted global DELTA Resilience instance,
											the database must be administered by a central government
											authority.
										</p>
										<p>
											Nonetheless, regional organisations, NGOs, and academic
											institutions continue to have an important role within
											national DELTA Resilience ecosystems. Their specific roles
											are defined by each country's national administrator, but
											rather than focusing on tracking disasters from secondary
											sources, they are encouraged to support other areas such
											as capacity development in data management; technical
											assistance in data analysis and application, research and
											innovation for evidence-based decision-making.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 39: What data is publicly shared?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Data entered into a national DELTA Resilience instance is
											fully owned and controlled by the government or national
											institution responsible for administering the system. The
											designation of the national DELTA Resilience administrator
											is a decision made by the government. It is also the
											government that determines who can access, validate, and
											publish data, as well as what information is shared
											externally.
										</p>
										<p>
											Governments are encouraged to openly share non-sensitive,
											anonymised data to promote a culture of transparency and
											support accountability. Making data visible not only to
											national stakeholders but also to regional and global
											DELTA Resilience instances enhances the ability to
											benchmark progress across countries and provides an
											aggregated view of global trends. This is particularly
											important for tracking commitments under international
											frameworks such as the Sendai Framework for Disaster Risk
											Reduction and the Global Goal on Adaptation.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 40: What does it mean that the system is meant for official data production?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The DELTA Resilience is designed to support the creation
											of official statistics on disaster losses and damages.
											This means data are collected, validated, and managed by
											mandated government institutions (such as national
											disaster risk management offices, sectoral entities like
											agriculture or public works departments,
											hydro-meteorological services, or national statistics
											offices), ensuring they meet standards of quality,
											consistency, and credibility. By being recognised as
											official, DELTA Resilience data can be used not only for
											policymaking, planning, and international reporting (e.g.,
											on the Sendai Framework and SDGs), but also to guide
											public policy and investment decisions, for example,
											prioritising infrastructure upgrades, targeting social
											protection programs, or allocating budgets for disaster
											risk reduction and climate adaptation. Reliable and
											comparable statistics are essential for governments to
											justify investments, monitor progress, and build
											accountability in reducing disaster and climate-related
											risks.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 41: Can governments restrict the part of the data they want to make public?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Yes. While UNDRR and the DELTA Resilience promote
											transparency and comparability, governments retain full
											ownership and control of their national Disaster Tracking
											Systems, regardless of the hosting solution chosen.
											Administrators from national governments can decide what
											level of data to make publicly accessible (e.g.,
											aggregated national statistics) and what to keep
											restricted (e.g., sensitive sub-national data,
											sector-specific details, or personal information). This
											flexibility ensures that data privacy, security, and
											national policies are respected, while still allowing core
											indicators to feed into regional and global reporting. In
											addition, the DELTA Resilience supports national data
											workflows by embedding quality assurance and control
											mechanisms: roles and permissions can be assigned to
											different institutions, and the system issues issues
											internal notifications to designated reviewers and
											approvers for each type of data. This structured workflow
											ensures that all records undergo proper validation before
											publication, reinforcing the credibility and reliability
											of official disaster statistics.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 42: Is there a simultaneous synchronisation among instances?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Yes. The DELTA Resilience is designed as a federated
											system, meaning that national instances can synchronise
											with regional or global repositories. However, this
											functionality is used only at the discretion of the
											national administrator. Countries retain full control to
											decide whether to enable synchronisation , which datasets
											to share, and at what level of aggregation (e.g., national
											totals versus sub-national detail). When approved,
											synchronisation ensures that selected updates (such as new
											disaster event records) are reflected in connected
											platforms, supporting regional comparability and global
											aggregation while safeguarding national ownership of data.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 43: Is there a UNDRR-owned DELTA Resilience global instance?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Not yet. At present, the UNDRR shared environment operates
											primarily as a hosting service through which countries can
											deploy and manage their own national instances, consuming
											DELTA Resilience as a software-as-a-service (SaaS)
											solution without the need to maintain local
											infrastructure. Each country retains ownership and control
											of its data while benefiting from centralized hosting,
											maintenance, and technical support provided by UNDRR.
										</p>
										<p>
											In the near future , this shared environment will be
											complemented by a global aggregation platform enabling
											visualization of publicly shared official data and
											supporting global, regional, and thematic analysis of
											disaster and climate change impacts. Users will be able to
											compare data across countries, filter and analyze by
											country groups (e.g., SIDS), regions, or categories, and
											generate aggregated insights by hazard type, hazard
											cluster, or specific hazards.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 44: What will the UNDRR-maintained DELTA Resilience global instance contain?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The UNDRR global instance will provide analysis and
											visualization functionalities comparable to those
											available in national DELTA Resilience systems, drawing on
											publicly shared official data validated by countries. It
											is designed to support global, regional, and thematic
											analysis, enabling comparative views and aggregated
											insights across countries, regions, and hazard types.
										</p>
										<p>
											Data entry modules will not be accessible through the
											UNDRR DELTA Resilience global instance. Countries will
											continue to use their national DELTA Resilience systems
											(either hosted locally or within the UNDRR-supported
											shared instance) as the primary entry point for data
											collection, validation, and management.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 45: Can regional intergovernmental organizations establish a regional DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Regional intergovernmental organizations are encouraged to
											support and lead regional-level analysis of disaster
											impacts and trends, including the aggregation and
											interpretation of data related to transboundary hazardous
											events. Rather than serving as a primary data entry
											platform, a regional DELTA Resilience environment would
											focus on analysis and visualization, drawing on officially
											validated data shared by participating countries.
										</p>
										<p>
											Such regional initiatives can also play an important role
											in strengthening data governance, fostering coordination
											among countries, and supporting the development of a
											mature and collaborative data ecosystem across national
											and regional levels.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 46: What is the safety, data security protocols followed by DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DELTA Resilience is built on a secure, modular
											architecture that follows UN-standard data protection and
											cybersecurity practices, including:
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>Role-based access control</li>
											<li>Data Encryption</li>
											<li>Audit logs and user activity tracking</li>
											<li>
												Recommendation for hosting in secure, compliant
												environments
											</li>
										</ul>
										<p>
											Each national instance may be hosted locally or in a
											secure cloud environment, as decided by the national
											authority.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 47: What roles exist in DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DELTA Resilience supports configurable user roles to
											reflect operational responsibilities, such as
											Administrator: assign roles and define custom settings,
											such as custom disaggregation, language, etc. Data
											collectors: Enter primary data; Approvers/Validators:
											Review and confirm records; Viewers: Access data without
											editing rights.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 48: Who administers DELTA Resilience?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											Each national instance of the DELTA Resilience (Disaster
											&amp; Hazardous Events, Losses and Damages Tracking &amp;
											Analysis) is administered by a designated national
											authority or institution, as determined by the government.
											This could be a disaster risk management agency, national
											statistics office, civil protection authority, or another
											mandated entity with the responsibility to oversee
											hazardous event and losses and damages data collection,
											validation, and dissemination.
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							12. Applications and Use Cases
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 49: What is the linkage between the losses and damages tracking systems and the Post Disaster Needs Assessments?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The DELTA Resilience (Disaster &amp; Hazardous Events,
											Losses and Damages Tracking &amp; Analysis) closely aligns
											with the PDNA methodological approach, particularly in its
											definitions of damages (physical destruction of assets)
											and losses (decline in economic flows and services).
											Consistent with the PDNA and the Global Disaster‑Related
											Statistics Framework (G-DRSF), DELTA Resilience organises
											data across four key sectoral groups: productive, social,
											infrastructure, and cross‑cutting, mirroring the PDNA's
											structured analysis of effects and impacts.
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Methodological consistency : By borrowing PDNA's
												conceptual framing of damages and losses and applying
												the same sectoral taxonomy used in PDNAs, the DELTA
												Resilience ensures data compatibility. This enables the
												system to act both as a live data repository for ongoing
												and past hazardous and disaster events and as a landing
												place for PDNA outputs, preserving them in a structured
												national statistics framework.
											</li>
											<li>
												Comprehensive event coverage : While PDNAs are mostly
												used following major disasters to prepare detailed
												recovery plans, the DELTA Resilience is agnostic to
												event scale; there are no thresholds for registration.
												All hazardous events, including localised incidents and
												disaster events, can be recorded. Moreover, the DELTA
												Resilience also logs technical hazard parameters (such
												as magnitude, duration, or spatial footprint),
												regardless of whether they trigger losses.
											</li>
										</ul>
										<p>
											In essence, the DELTA Resilience extends PDNA's
											methodological strengths into everyday national data
											systems. It not only supports the design and
											interpretation of PDNA reports but also ensures that all
											disaster-related statistics, whether stemming from
											large-scale assessments or everyday hazardous events, are
											integrated into a unified, long-term knowledge base.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 50: What is the linkage between losses and damages tracking and the World Bank GRADE?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The Global Rapid Post-Disaster Damage Estimation (GRADE),
											developed by the World Bank and GFDRR, is a rapid, remote
											assessment tool that produces early estimates of direct
											physical damage, mainly to housing, infrastructure, and
											productive assets, within about two weeks of a disaster.
											It relies on hazard models, satellite and drone imagery,
											exposure data, and past disaster information to deliver
											credible, sectoral damage estimates.
										</p>
										<p>
											GRADE is not a continuous database but rather a post-event
											analytical service. Its results are highly complementary
											to national losses and damages tracking systems such as
											the DELTA Resilience
										</p>
										<p>
											On one hand, GRADE outputs can be imported into the DELTA
											Resilience, ensuring that rapid post-disaster estimates
											are preserved in the official national repository and
											integrated with other loss and damage records. On the
											other hand, historical data from the DELTA Resilience, on
											hazard footprints, damages, and sectoral impacts, can
											strengthen the calibration and contextualization of GRADE
											models when they are deployed in a country.
										</p>
										<p>
											Together, GRADE and DELTA Resilience reinforce each other:
											GRADE provides fast, model-based impact estimates to guide
											immediate decision-making, while the DELTA Resilience
											ensures long-term, systematic recording and validation of
											disaster statistics across all events, large and small.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 51: How does DELTA Resilience support access to the Fund for responding to loss and damage?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DELTA Resilience provides countries with a standardised,
											nationally owned system for recording disaster losses and
											damages, encompassing economic and non‑economic impacts,
											including those arising from slow‑onset processes such as
											climate‑related degradation. By enabling systematic,
											consistent, and disaggregated tracking of disaster impacts
											over time, DELTA Resilience helps establish an
											authoritative national statistical baseline on loss and
											damage.
										</p>
										<p>
											This baseline plays a critical role in informing the
											design, targeting, monitoring, and evaluation of support
											provided through the Fund for Responding to Loss and
											Damage (FRLD). By ensuring that data on losses and damages
											are comparable, transparent, disaggregated, and
											methodologically sound, DELTA Resilience strengthens the
											evidence base required to substantiate needs, support
											access to finance, and demonstrate results.
										</p>
										<p>
											More broadly, DELTA Resilience enhances accountability and
											credibility under the Fund by enabling countries to
											produce nationally led, policy‑relevant data that can be
											used for reporting, learning, and oversight. In doing so,
											it supports fair, evidence‑based decision‑making and
											reinforces trust between countries, implementing entities,
											and contributors to the Fund.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 52: How can I submit examples of current data applications?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://forms.office.com/e/PvnZw11EbB"
												target="_blank"
												rel="noopener noreferrer"
											>
												The form
											</a>{" "}
											is available online to share your case studies on current
											applications. We will review the submission, offer
											suggestions for improvement, support in edits and publish
											in the PreventionWeb collection of case studies.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 53: Where can I find good practices and case studies on the application of disaster data?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											A wide range of use cases, case studies, and practical
											insights is available on the UNDRR Disaster Losses and
											Damages Data page (
											<a
												className="text-blue-600 underline hover:text-blue-800"
												href="https://www.preventionweb.net/collections/disaster-losses-and-damages-data-case-studies"
												target="_blank"
												rel="noopener noreferrer"
											>
												link
											</a>
											), showcasing how loss and damage data are applied across
											areas from risk analysis to disaster risk reduction. These
											examples document both current applications and emerging
											use cases, building the case for investing in stronger
											disaster data systems and highlighting opportunities to
											expand their application through enhanced data quality.
											Illustrative cases include the use of loss data to
											calibrate parametric insurance in Colombia, to strengthen
											impact-based early warning for typhoons in the
											Philippines, and to support vulnerability modelling in Sri
											Lanka.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 54: How can I use the DELTA Resilience for my Biennial Transparency Reports (BTR)?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DELTA Resilience not only supports countries in preparing
											their Biennial Transparency Reports (BTRs) under the
											UNFCCC but also strengthens the credibility of those
											reports by providing reliable, structured, and nationally
											validated data on hazardous events and associated losses
											and damages. This data can inform several key sections of
											the BTR.
										</p>
										<p>
											For climate impacts and vulnerabilities, DELTA Resilience
											enables countries to track the effects of climate related
											hazards such as floods, droughts, and storms on people,
											livelihoods, infrastructure, and ecosystems. This supports
											evidence-based reporting on observed impacts, helps
											identify vulnerable sectors and groups, and offers a
											clearer understanding of national adaptation needs.
										</p>
										<p>
											When it comes to loss and damage, DELTA Resilience
											provides a structured way to document both economic and
											non-economic losses. This includes quantifying the scale
											and frequency of loss and damage, supporting reporting
											under Article 8 of the Paris Agreement, and informing
											financial needs assessments and resource mobilisation
											efforts.
										</p>
										<p>
											Finally, DELTA Resilience plays an important role in
											tracking the effectiveness of adaptation and risk
											reduction measures. By analysing trends over time,
											countries can report on their BTRs where such efforts have
											worked well, and where recurring losses highlight the need
											for further investment or action.
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
					<section className="space-y-4">
						<h2 className="text-xl font-semibold text-slate-900">
							13. Linkages
						</h2>
						<div className="space-y-4">
							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 55: How does the DELTA Resilience relate to the Secretary General's initiative on Early Warning for All">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DELTA Resilience is a core component of the Risk Knowledge
											pillar of EW4All. It provides official disaster impact
											data that strengthens risk assessments, informs
											preparedness and early action, and supports monitoring and
											evaluation. By tracking the real-world effects of hazards,
											it helps measure how effective early warnings are and
											guides improvements over time. It also contributes to the
											Monitoring and Forecasting pillar (Pillar 2) by
											highlighting which hazards have the greatest impacts,
											helping countries prioritize where stronger observation
											and forecasting systems are needed.
										</p>
										<p>
											By linking hazard parameters - such as rainfall, wind
											speed, or temperature - with observed impacts, DELTA
											Resilience builds the evidence base for impact-based
											forecasting. This allows governments to define clear
											warning thresholds (for example, the level of rainfall
											likely to trigger flooding) and to design anticipatory
											actions in advance. These actions go beyond traditional
											responses like evacuation or stockpiling relief goods, and
											can include measures formalized in early action protocols,
											such as pre-positioning animal feed, vaccinating
											livestock, securing seed stocks, or supporting farmers
											ahead of forecast droughts or floods. The goal is to
											protect livelihoods, reduce losses, and enable earlier,
											more effective responses to risk.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 56: How does DELTA Resilience link with the Global Disaster-related Statistics Framework (G-DRSF)?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											DELTA Resilience is strategically aligned with and
											contributes directly to the implementation of the Global
											Disaster‑Related Statistics Framework (G‑DRSF), the
											internationally agreed common framework for
											disaster‑related statistics endorsed by the UN statistical
											community. DELTA Resilience plays a practical role in
											operationalising the G‑DRSF's principles, translating them
											into nationally owned systems for collecting, organising,
											analysing, and applying disaster impact data.
										</p>
										<p>
											Key features and enabling factors underpinning this
											linkage include:
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Standardisation of terminology and classifications
											</li>
										</ul>
										<p>
											DELTA Resilience is grounded in internationally agreed
											statistical and hazard classification standards that are
											also referenced in the G‑DRSF, including the Hazard
											Information Profiles (HIPs) and the WMO Catalogue of
											Hazardous Events (WMO‑CHE). This shared standards base
											enables consistency, comparability, and interoperability
											across disaster datasets, facilitating data sharing and
											reuse within and across countries.
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>Disaggregated disaster impact data</li>
										</ul>
										<p>
											By capturing losses and damages at local and sub‑national
											scales, DELTA Resilience supports the G‑DRSF requirement
											for granular, disaggregated disaster impact statistics.
											This enables comparability across time, geography, hazard
											types, and population groups, supporting robust trend
											analysis and equity‑focused policy assessment.
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>Expanded coverage of risks and impacts</li>
										</ul>
										<p>
											Both DELTA Resilience and the G‑DRSF adopt a comprehensive
											view of disaster impacts. They cover a wide range of
											scenarios, including rapid‑ and slow‑onset events,
											cascading and compound disasters, transboundary hazards,
											and multi‑sectoral losses and damages, encompassing both
											economic and non‑economic impacts. This comprehensive
											scope reflects the evolving nature of disaster risk and
											climate‑related impacts.
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>Data governance and institutional collaboration</li>
										</ul>
										<p>
											DELTA Resilience reflects the G‑DRSF's emphasis on
											strengthening the disaster data ecosystem through
											institutional coordination and role clarity. Both
											frameworks promote enhanced collaboration between National
											Disaster Management Offices (NDMOs), National Hydrological
											and Meteorological Services (NHMSs), National Statistical
											Offices (NSOs), and sectoral agencies, extending the
											disaster loss and damage data value chain and enabling
											more advanced analytical and statistical use.
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Compatibility and interoperability with existing data
												systems
											</li>
										</ul>
										<p>
											Consistent with the G‑DRSF, DELTA Resilience is designed
											to integrate and harmonise data from existing disaster and
											statistical systems, including DesInventar, the Sendai
											Framework Monitoring system, sectoral databases, and
											relevant statistical indicators and metadata frameworks.
											This ensures continuity of historical data while enabling
											their integration into a coherent, modern disaster
											statistics architecture.
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Technological innovation adapted to country maturity
											</li>
										</ul>
										<p>
											Both DELTA Resilience and the G‑DRSF promote the use of
											appropriate technological solutions to improve data
											collection, management, dissemination, and analysis. DELTA
											Resilience supports modular, scalable technologies and
											analytical tools that can be adapted to different levels
											of national data ecosystem maturity, ensuring inclusivity
											and sustainability.
										</p>
										<p>
											Together, DELTA Resilience and the G‑DRSF form a coherent
											methodological and operational continuum: the G‑DRSF
											provides the conceptual and statistical foundation for
											disaster impact statistics, while DELTA Resilience
											provides countries with the practical system and tools to
											implement that framework in a nationally owned,
											policy‑relevant, and operational manner.
										</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Standardisation of terminology and classification :
												International standardisations , including HIPs and
												WMO-CHE, are an integral part of both DELTA Resilience
												and G-DRSF, allowing data sharing and promoting use and
												compatibility
											</li>
											<li>
												Disaggregated data : DELTA Resilience, by capturing
												disaggregated losses and damages at localised scales,
												ensures data granularity and quality, addressing a key
												requirement of the DRSF to enable comparability across
												time and space.
											</li>
											<li>
												Increased coverage of risks and impacts : DELTA
												Resilience and G-DRSF cover complex scenarios and
												multi-dimensional losses and damages sectors, and the
												disaster impacts: from rapid to slow onset events,
												cascading events, transboundary events, to various
												damage and loss sectorial impacts, including
												non-economic loss.
											</li>
											<li>
												Data governance and Institutional Collaboration : both
												DELTA Resilience and G-DRSF advocate and provide
												guidelines for linkages and enhanced collaboration
												between the National Disaster Management Offices
												(NDMOs), the National Hydro-Meteorological Services
												(NHMS) and the National Statistics Offices (NSOs),
												extending the losses and damages data value chain to
												support improved analytical options.
											</li>
											<li>
												Compatibility and interoperability of existing data :
												the existing disaster data, including Sendai Framework
												Monitor, DesInventar, and other statistical frameworks,
												indicator sets, and metadata, can be harmonized,
												connected, and integrated via G-DRSF into DELTA
												Resilience
											</li>
											<li>
												Technological innovation : both DELTA Resilience and
												G-DRSF promote technological advancement and integration
												of new data collection, dissemination, and analytics
												features that are tailored to country maturity
											</li>
										</ul>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 57: What are the linkages of DELTA with the WMO Cataloguing hazardous events?">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											The DELTA Resilience (Disaster &amp; Hazardous Events,
											Losses and Damages Tracking &amp; Analysis) has been
											designed to align with the WMO Catalogue of Hazardous
											Events (WMO-CHE) as the authoritative international
											methodology for classifying and recording hazardous
											events, to be applied by National Hydro-Meteorological
											Services (NMHSs).
										</p>
										<p>a. Hazard Taxonomy Alignment</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												The DELTA Resilience data model incorporates the WMO-CHE
												event classification as the reference taxonomy for
												hydrometeorological hazardous events.
											</li>
											<li>
												For hazards beyond the scope of WMO, core methodological
												elements, such as universal unique identifiers (UUIDs),
												temporal, spatial, and metadata fields, are adapted from
												WMO-CHE to ensure consistent recording of hazardous
												events, whether or not they ultimately result in a
												disaster.
											</li>
											<li>
												When a hazardous event is recorded in DELTA Resilience
												(e.g., a tropical cyclone, flood, drought, or compound
												event), it is registered using the relevant WMO-CHE
												variables (data fields and metadata ). Linkage
												parameters (e.g., the UUID assigned to a higher-level
												phenomenon) are applied to establish cascading event
												relationships and to attribute impacts to specific
												hazards and sub-hazards.
											</li>
											<li>
												This alignment ensures that hazardous event records
												remain consistent with WMO-agreed definitions, enabling
												comparability across countries and interoperability with
												meteorological and hydrological datasets.
											</li>
										</ul>
										<p>b. Integration with Disaster - Impact Linkages</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												DELTA Resilience goes beyond cataloguing hazardous
												events by linking them to associated damages , losses,
												and disruptions, enabling a comprehensive analysis of
												disaster impacts.
											</li>
											<li>
												The WMO-CHE classification provides the standardised
												"trigger event," which is captured in the DELTA
												Resilience hazardous event module as the initiating
												factor of observed "effects" on people, infrastructure,
												ecosystems, and economies.
											</li>
											<li>
												This strengthens the scientific and operational value of
												WMO-CHE by connecting hazardous event records,
												traditionally stored in highly technical NMHS databases,
												with multi-sectoral disaster data, thereby broadening
												their applicability and use.
											</li>
										</ul>
										<p>c. Cascading and Compound Events</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												DELTA Resilience mirrors the WMO-CHE methodology for
												cascading hazardous events, where each "child" event
												(e.g., a landslide triggered by heavy rainfall, or
												flooding caused by a tropical cyclone) is explicitly
												linked back to its "mother" or higher-level triggering
												phenomenon.
											</li>
											<li>
												These relationships are captured in the DELTA Resilience
												data model using machine-readable UUIDs , ensuring that
												both triggering and cascading events can be tracked as
												part of the same hazard sequence.
											</li>
											<li>
												The same approach is applied when linking disaster
												events to their originating hazardous events,
												reinforcing consistency and traceability across all
												records.
											</li>
											<li>
												This design enables DELTA RESILIENCE to reflect the
												multi-hazard and cascading nature of risk, while
												supporting countries in understanding complex hazard,
												impact chains.
											</li>
										</ul>
										<p>d. Interoperability and Unique Identifiers</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Hazardous events catalogued in DELTA Resilience are
												assigned UUIDs compatible with WMO-CHE standards. This
												allows DELTA Resilience to capture cross-border
												phenomena catalogued by regional WMO centers , while
												also accommodating national, regional, local, or
												sector-specific identifiers such as GLIDE (used by
												humanitarian partners) or the EU JRC Risk Data Hub .
											</li>
											<li>
												This interoperability facilitates data exchange and
												cross-referencing between national DELTA Resilience
												instances, WMO regional systems, and global disaster
												loss databases.
											</li>
										</ul>
										<p>e. Use in Reporting and Analysis</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												Through WMO-CHE integration, DELTA Resilience supports
												more robust risk analysis, early warning validation, and
												reporting for frameworks such as the Sendai Framework
												for Disaster Risk Reduction and the Paris Agreement.
											</li>
											<li>
												Countries can aggregate data by WMO-CHE hazard classes
												to analyse trends, compare across hazard types, and
												calibrate risk models.
											</li>
										</ul>
										<p>f. Future Development</p>
										<ul className="list-disc space-y-2 pl-6">
											<li>
												The DELTA Resilience roadmap foresees continued
												collaboration with WMO to refine event parameterisation,
												ensuring interoperability with evolving WMO-CHE
												standards (e.g., compound, cascading, and multi-hazard
												contexts).
											</li>
											<li>
												At the national level, collaborations such as those with
												Indonesian authorities, BNPB (disaster risk management)
												and BMKG (hydrometeorological and geological hazard
												monitoring), are developing protocols and governance
												mechanisms to authoritatively match hazardous events
												with disaster impacts. This strengthens institutional
												collaboration and enhances joint efforts to better
												understand how specific hazardous events affect housing,
												infrastructure, vulnerable populations, crops,
												livestock, ecosystems, and other at-risk elements.
											</li>
											<li>
												Understanding the spatial and temporal relationships
												between hazardous events and their impacts reveals
												patterns of vulnerability and susceptibility. These
												insights are critical for vulnerability and risk
												modelling and provide practical value for designing
												anticipatory action and strengthening capacities for
												impact-based forecasting .
											</li>
										</ul>
										<p>
											DELTA Resilience operationalises the WMO-CHE cataloguing
											standards and methodologies by embedding them in its event
											data model and linking them to disaster impact records. By
											explicitly modelling cascading hazard chains and ensuring
											unique identifiers across events and impacts, DELTA
											Resilience makes hazard cataloguing directly actionable
											for policy, risk analysis, and international reporting.
										</p>
									</div>
								</AccordionTab>
							</Accordion>

							<Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
								<AccordionTab header="Question 58: Linkages of DELTA RESILIENCE with the INFORM Sub-national risk index">
									<div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
										<p>
											INFORM Subnational and the DELTA Resilience (Disaster
											&amp; Hazardous Events, Losses and Damages Tracking &amp;
											Analysis) are complementary tools designed to strengthen
											risk knowledge and support decision-making, but they
											operate at different levels and with different purposes.
											INFORM Subnational provides a comparative,
											multi-dimensional risk index at provincial, district, or
											municipal scales, highlighting how hazard exposure,
											vulnerability, and coping capacity interact to create
											relative risk patterns. DELTA Resilience, by contrast, is
											an event-based system that enables systematic recording
											losses and damages from specific hazardous events that
											trigger disasters impacting people, assets, and sectors.
										</p>
										<p>
											Although there is not yet systematic integration of DELTA
											Resilience data into INFORM Subnational, strong conceptual
											and practical synergies exist. In particular, DELTA
											Resilience can enhance the measurement of impact-related
											vulnerability. This dimension of INFORM includes
											indicators such as populations affected by recent shocks,
											displacement, food insecurity, and damage to housing or
											infrastructure, which are often estimated through proxy
											measures or global sources. DELTA Resilience enable
											collection precisely this type of information at national
											and subnational levels, providing event-based data on
											affected populations, displacement, and sectoral impacts.
											Incorporating DELTA Resilience data would therefore
											improve the accuracy, timeliness, and national ownership
											of INFORM Subnational assessments.
										</p>
										<p>
											Together, the two approaches offer a more complete picture
											of disaster risk. INFORM Subnational identifies where
											structural risk is highest, while DELTA Resilience
											documents how those risks and specific hazardous and
											disaster events occurrences translate into actual losses
											and damages. Countries that deploy both tools can use
											DELTA Resilience to validate and update their subnational
											risk profiles, while relying on INFORM Subnational to
											prioritize regions for detailed monitoring and investment
											in disaster risk reduction. Linking these approaches more
											systematically would strengthen national risk information
											systems and reinforce coherence with the Sendai Framework
											and the Sustainable Development Goals.
										</p>
									</div>
								</AccordionTab>
							</Accordion>
						</div>
					</section>
				</div>
			</div>
		</MainContainer>
	);
}
