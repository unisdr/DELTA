import { MainContainer } from "~/frontend/container";
import { Accordion, AccordionTab } from "primereact/accordion";

export default function FaqPage() {
    return (
        <MainContainer title="Frequently Asked Questions">
            <div className="pb-8">
                <div className="space-y-8">
                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">
                            On the system's purpose
                        </h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 1: Is DELTA Resilience a response operational information system?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            At its core, DELTA Resilience (Disaster & Hazardous Events, Losses and Damages Tracking & Analysis) is intended to support the tracking of hazardous events observed and monitored by relevant national agencies, such as hydrometeorological services, geological surveys, etc., and to document the effects these events have on exposed and vulnerable elements, such as housing and productive assets. It also enables analysis of the disruptions and impacts on affected people, systems, ecosystems, livelihoods, and more.
                                        </p>
                                        <p>
                                            DELTA Resilience is not designed to function as an operational emergency response tool, such as those used to handle emergency calls and dispatch resources (e.g., systems like 112 in Europe, a centralized emergency number with a geolocated emergency response dispatch system).
                                        </p>
                                        <p>
                                            While it is technically possible for country administrators to customize DELTA RESILIENCE to include an emergency response module, operational response systems typically require real-time, dynamic information on available response capacities (e.g., firefighters on duty and the specific equipment at their disposal; hospitals with specialized services and current capacity). These systems are also usually integrated with emergency call centres that geolocate incoming calls, classify the type of emergency (e.g., medical, fire-related, marine rescue), and determine the appropriate resources to deploy, often in real time, while connecting directly with emergency responders to dispatch them efficiently.
                                        </p>
                                        <p>
                                            DELTA, by contrast, is designed as a toolkit for tracking and understanding disaster and climate change impacts, to support more effective risk prevention, reduction, management and resilient recovery.
                                        </p>
                                        <p>
                                            Its areas of application, outlined in more detail in the online <a href="https://www.undrr.org/building-risk-knowledge/disaster-data" target="_blank" rel="noreferrer" className="text-[#0ea5e9] underline [text-underline-offset:2px] hover:text-[#0284c7]">repository</a>, include:
                                        </p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Risk analysis (e.g., calibrating risk models and identifying patterns of vulnerability)</li>
                                            <li>Disaster risk reduction financing (e.g., assessing the cost of disasters and informing suitable financing mechanisms)</li>
                                            <li>Risk-informed planning (e.g., resilient infrastructure planning; or DRR in agriculture)</li>
                                            <li>Early warning and early action (e.g., setting triggers for warnings and anticipatory action)</li>
                                            <li>Recovery planning (e.g., supporting post-disaster assessments and identifying recovery needs)</li>
                                            <li>Reporting (e.g., on international frameworks such as the Sendai Framework or the Global Goal on Adaptation)</li>
                                        </ul>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 2: Is DELTA a UN reporting portal?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The Disaster Tracking System (DELTA Resilience) has been developed by UNDRR in collaboration with the World Meteorological Organization (WMO) and the United Nations Development Programme (UNDP) as a toolkit, including open-source software, for countries to establish and manage their own nationally owned disaster tracking systems.
                                        </p>
                                        <p>
                                            While DELTA Resilience is not designed to be a UN reporting portal, it is for national use and national applications as its primary purpose. However, there is an added benefit as it can be used to collect or process country data for specific international reporting obligations.
                                        </p>
                                        <p>
                                            One of the possible use cases supported by DELTA Resilience is facilitating reporting on international commitments, such as the Sendai Framework for Disaster Risk Reduction feeding into the official reporting tool for the Sendai Framework: the Sendai Framework Monitoring (SFM) portal, managed by UNDRR.
                                        </p>
                                        <p>
                                            DELTA Resilience may support future reporting needs, such as indicators under the Global Goal on Adaptation, and assist with data to inform reports produced under the United Nations Framework Convention on Climate Change (UNFCCC) and the Paris Agreement, including but not limited to national communications, biennial transparency reports (BTRs) and adaptation communications.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 3: Can DELTA Resilience help countries with reporting on the Sendai Framework Monitor?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            As outlined in related questions, countries can export data from their national DELTA Resilience country instance to the SFM portal to streamline reporting. However, the two systems are distinct, with different purposes and governance structures. DELTA is a nationally owned and administered system for domestic data management and analysis, whereas the SFM is a UNDRR-managed platform designed to collect and consolidate country data on progress in implementing the Sendai Framework, based on globally agreed indicators and methodologies outlined in the <a href="https://www.undrr.org/publication/technical-guidance-monitoring-and-reporting-progress-achieving-global-targets-sendai" target="_blank" rel="noreferrer" className="text-[#0ea5e9] underline [text-underline-offset:2px] hover:text-[#0284c7]">Technical guidance</a> for monitoring and reporting on progress in achieving the global targets of the Sendai Framework for Disaster Risk Reduction.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 4: Is the DELTA Resilience an accounting system?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The legacy system, DesInventar, was often referred to as a disaster accounting system because one of its main purposes was to account for the impacts of disasters. The name DesInventar itself reflects this concept: in Spanish, it evokes the idea of an inventory system, where the prefix "Des-" implies undoing or removing, symbolising the depletion of assets caused by disasters.
                                        </p>
                                        <p>
                                            DELTA Resilience (Disaster & Hazardous Events, Losses and Damages Tracking & Analysis) is positioned as a tracking tool, emphasizing its ability not only to monitor the effects of disasters but also to track hazardous events that may trigger those impacts. While the core purpose of DELTA Resilience remains to support countries in accounting for disaster impacts, it introduces a new dimension of tracking to support emerging use cases, particularly in the areas of early warning and early action.
                                        </p>
                                        <p>
                                            To enable the tracking of hazardous events and the losses and damages they generate, the first release of the DELTA Resilience software allows countries to record damage or disruption in physical units (e.g., kilometres of roads destroyed or partially damaged; hours and users affected by a power outage). It also includes basic computation tools that allow users to multiply the number of units by average repair or replacement costs, which may be pre-identified in national guidelines (e.g., unit price lists used for public works procurement or bidding) or sourced from global references. Alternatively, users can override the default calculations and input case-specific costs they have determined to express damage in economic terms, following DELTA Resilience methodologies adapted from Post-Disaster Needs Assessment (PDNA) sectoral guidelines.
                                        </p>
                                        <p>
                                            In future versions, as more advanced analytical modules are introduced, DELTA Resilience will support the economic valuation of damages using various pricing units and methodologies. It will also allow for the estimation of losses, defined as changes in economic flows resulting from disasters, based on different recovery scenarios, strategies, baselines, and projections.
                                        </p>
                                        <p>
                                            To fully deploy these analytical capabilities, countries will need to provide the DELTA Resilience with access to relevant baseline (pre-disaster context and reference information, vulnerability and exposure data from core sector information systems and indicators) data by connecting it to authoritative national sources. This includes, for example, sectoral statistics on service demand and usage, price data and fluctuations, growth projections for service demand, and production costs for goods and services, along with a reliable source of inflation data and other key metadata.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">On methodologies</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 5: How will DELTA differ from DesInventar?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA Resilience data model includes the recording of hazardous event parameters alongside the effects (damages and losses) triggered by the event. This ability to link hazardous events with disaster event information is one of the key innovations of the DELTA Resilience data model.
                                        </p>
                                        <p>
                                            Further guidance on the processes and methodologies for establishing authoritative and scientifically sound linkages between hazardous events and observed disaster effects is provided in the methodological compilation. This guidance will continue to evolve in line with advances in the global disaster risk reduction (DRR) scientific and practitioner community's capacity to understand compound, cascading, and complex linkages between triggers, drivers, and effects.
                                        </p>
                                        <p>
                                            The disaster event section, beyond serving as a wrapper for all records (equivalent to the old datacards in DesInventar), is associated with a distinct disaster event, to which a system-generated universal unique identifier can be assigned. This identifier is compatible with other systems, such as GLIDE or national disaster ID systems. Additionally, disaster event records can be linked to other disaster events within the system, enabling the recording of cascading disaster chains such as Natech (natural-technological hazards). This expands upon the previous capability in DesInventar, which captured cascading effects using the "cause" field when recording a disaster event.
                                        </p>
                                        <p>
                                            The disaster event record also allows for the inclusion of qualitative information related to early warning, early action, rapid assessments, and response operations. Furthermore, the disaster event section provides a summary of aggregated figures and values from all associated disaster records (e.g., deaths, injuries, missing persons), as well as damages expressed in monetary terms.
                                        </p>
                                        <p>
                                            The DELTA system also expands the core set of variables and disaggregation options for disaster event records. In the human impact section, new variables related to displacement are introduced, with options for multiple levels of disaggregation and time-stamped data entries. The system supports compound disaggregation across multiple dimensions simultaneously, for example, disaggregation by age, sex, income/poverty status, and disability for variables such as deaths, injuries, and missing persons.
                                        </p>
                                        <p>
                                            For other types of losses and damages, DELTA data model adopts a sector-based grouping of variables, aligned with the categories used in post-disaster needs assessments: social, infrastructure, productive, and cross-cutting. For example, the social category includes variables related to impacts on education and health. The productive category includes options for sectors such as agriculture and tourism. The cross-cutting category addresses issues that are not strictly sectoral but remain critical, such as environment, employment, and livelihoods.
                                        </p>
                                        <p>
                                            Although not yet available in the beta version of the DELTA Resilience software, another key innovation is the functionality to integrate reference and baseline information, such as data on exposure, vulnerability, and sector-specific statistics.
                                        </p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Exposure information includes, for example, population and housing data and refers to the elements at risk, their location, their amount and other intrinsic characteristics.</li>
                                            <li>Vulnerability information refers to socio-economic characteristics of specific population groups (e.g., literacy, income, dependency ratios, employment levels), as well as the physical, economic, or ecological vulnerability of assets and ecosystems (e.g., characteristics of road networks, such as maintenance status, year of construction, and the materials or technologies used that may make specific assets more susceptible to damage).</li>
                                            <li>Sector-specific information might include supply and demand data in sectors such as tourism, including available capacities, services, employment, and contributions to the economy, as well as demand-side indicators like the number of arrivals and average duration of stay.</li>
                                        </ul>
                                        <p>
                                            The vulnerability, exposure, and other baseline information are not produced within DTS but are integrated from relevant national sources, for example, national statistical offices or spatial data infrastructures. When authoritative national sources are not available or accessible, the system will provide default options from global or regional sources.
                                        </p>
                                        <p>
                                            This baseline, reference, and contextual information is integrated into the data model to provide essential context for interpreting figures on losses and damages and for assessing impact. Reference or baseline data are crucial for comparing pre- and post-event situations. To accurately estimate and assign an economic value to losses, understood as changes in economic flows, it is essential to have access to statistics on use, production, and service levels, as well as historical trends and projections that indicate how those variables might have evolved had the disaster not occurred.
                                        </p>
                                        <img
                                            src="/assets/images/faq/how_is_delta_different_from_desinventar.jpg"
                                            alt="How will DELTA differ from DesInventar?"
                                            className="mt-4 w-full rounded-lg"
                                        />
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 6: What are the elements that remain the same from the DesInventar methodology?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The tables above summarize how DELTA RESILIENCE and DesInventar differ, and which methodological elements have been retained. One important element that remains the same is the absence of thresholds for the registration of disaster events. Any event, no matter how localized or sector-specific, can be recorded, regardless of its size or nature. This approach is aligned with the Sendai Framework and the UN General Assembly-endorsed definition of a disaster "A serious disruption of the functioning of a community or a society at any scale due to a hazardous event interacting with conditions of exposure, vulnerability, and capacity, leading to impacts that may be immediate or manifest gradually, last over time, and exceed or test the capacity of the affected society to cope using its own resources"
                                        </p>
                                        <p>
                                            A serious disruption of the functioning of a community or a society at any scale due to a hazardous event interacting with conditions of exposure, vulnerability, and capacity, leading to impacts that may be immediate or manifest gradually, last over time, and exceed or test the capacity of the affected society to cope using its own resources.
                                        </p>
                                        <p>
                                            Another continuing element from the DesInventar methodology is the understanding that disaster events are triggered by hazardous events, which interact with specific conditions of exposure, vulnerability, and capacity. In this sense, disasters are not "natural" and should neither be referred to nor understood as solely caused by hazardous events. Rather, they result from the interaction of those underlying conditions.
                                        </p>
                                        <p>
                                            For a disaster event to be recorded, it must have spatial and temporal manifestations of human, material, economic, and/or environmental losses and impacts. Regarding the temporal dimension, partially complete date elements (e.g., just the year, or year and month) may be used for recording. However, within the DELTA Resilience, the treatment of start and end dates has evolved to support the registration of slow-onset events, such as those associated with climate change processes (e.g., sea level rise or ocean acidification), where it is not possible to determine a precise beginning or end date.
                                        </p>
                                        <p>
                                            Another continued aspect of the Desinventar methodology is that disaster events are triggered by hazardous events which interact with specific conditions of exposure, vulnerability and capacity. In a way, they are not natural and should not be referred to as natural or understood as caused only by the hazardous event, but due to the interaction of those conditions
                                        </p>
                                        <p>
                                            Disaster events, to be tracked, need to have some observable spatial and temporal manifestations of human, material, economic and/or environmental losses and impacts. In the detail of recording temporal dimensions, partially complete date/temporal elements can be used (e.g. year, or year and date only on start dates) but in the context of DTS the required nature of the start and end dates is changed to enable registration of slow onset events such as those linked to climate change processes like sea level rise or ocean acidification for which is not possible to pinpoint a specific beginning and end point.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 7: What data workflows does the DELTA Resilience methodology support?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            In the system, you can link records of hazardous events to disaster events, which serve as containers for disaster records (like the old DesInventar datacard). These disaster events capture the effects of a hazard on specific locations, assets, or other exposed elements. Linkages can be created using the system's linking parameters and unique identifiers. Linkages can be established, revisited, and confirmed at any time, following a nationally approved workflow that defines roles and processes for proposing and confirming linkages (e.g., "this disaster event was triggered by this specific hazardous event").
                                        </p>
                                        <p>
                                            To ensure effective data governance and application, it is recommended that, as part of the process of institutionalizing the DELTA Resilience (Disaster & Hazardous Events, Losses and Damages Tracking & Analysis), roles for collecting and validating specific data are clearly and formally assigned to designated institutional actors. These roles should be documented in national operational procedures, manuals, or other relevant formats.
                                        </p>
                                        <p>
                                            For example, variables related to losses and damages in the agriculture sector should be assigned to designated data officers within relevant local, provincial, regional, or central agricultural services. Quality control responsibilities should be defined according to national regulations and institutional arrangements, whether they are centralised, decentralised, or involve horizontal or vertical structures. The software system allows administrative users to assign specific user roles, such as data collector, data validator, or data viewer, in order to reflect operational responsibilities within the system.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 8: What methodologies does the DELTA Resilience (Disaster &amp; Hazardous Events, Losses and Damages Tracking &amp; Analysis) use to assess losses and damages?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA Resilience (Disaster &amp; Hazardous Events, Losses and Damages Tracking &amp; Analysis) builds on existing approaches such as the Damage and Loss Assessment (DALA), Post-Disaster Needs Assessment (PDNA), DesInventar Sendai, the Sendai Framework Monitor (SFM), and the FAO methodology for agriculture. It integrates these into a standardised framework that captures human, economic, and environmental impacts of disasters. DELTA RESILIENCE uses agreed international standards for taxonomies (how hazards and impacts are classified), variables (the specific data points collected, such as deaths, houses destroyed, or service disruptions), and hazard classification, while allowing countries to adapt them to their own contexts. Importantly, DELTA RESILIENCE also covers slow-onset events (like desertification or sea-level rise) and non-economic losses (such as health impacts, displacement, cultural heritage, or social cohesion), ensuring a more complete picture of disaster and climate-related impacts.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">About the software system</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 9: How interoperable is the DELTA Resilience system with DesInventar?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            A migration pathway has been developed to ensure that all records from DesInventar-based databases can be safely transferred to the relevant DELTA Resilience country instance, once approved by the respective country administrators. The objective of this middleware tool (an API-based Extract, Transform and Load (ETL)) is to enable the transformation of records contained in a specific "region (country)" database in the legacy DesInventar data cards into DELTA RESILIENCE database records.
                                        </p>
                                        <p>
                                            To accommodate certain data cards from older DesInventar databases that contained fuzzy variables (e.g., indicating damage to a sector without detailed quantification, or mentioning deaths without specifying numbers), adjustments have been made to the data entry structure in DELTA RESILIENCE. When data is transferred, records originating from DesInventar will be clearly marked in a way agreed upon by each database administrator (e.g., source: DesInventar Country X).
                                        </p>
                                        <p>
                                            To accommodate certain data cards from older DesInventar databases that contained fuzzy variables (e.g., indicating damage to a sector without detailed quantification, or mentioning deaths without specifying numbers), adjustments have been made to the data entry structure in DTS. When data is transferred, records originating from DesInventar will be clearly marked in a way agreed upon by each database administrator (e.g., source: DesInventar Country X).
                                        </p>
                                        <p>
                                            Fields containing fuzzy data, non-aggregated information, or variables based on DesInventar-specific definitions (e.g., "affected people, as per DesInventar definitions") will be flagged as "Old DesInventar variable." This ensures clarity for both data users and producers that these fields are maintained to preserve historical records, but that going forward, data should be recorded in a more disaggregated format or according to updated definitions and standards.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 10: What is the licensing for DELTA Resilience software?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA REsilience software is currently distributed under Apache License 2.0. The Apache License 2.0 is a permissive open-source license. This means you are free to use, modify, and share the DELTA Resilience software, even for commercial purposes, as long as you include a copy of the license and give proper credit to the original authors. It also provides an explicit grant of patent rights and comes with no warranty, which is typical for open-source software. An explicit grant of patent rights means the creators permit you to use any patents that apply to the software. There is a "no warranty" clause, meaning the software is provided "as is";, the creators are not responsible for any issues or damage that might result from using it.
                                        </p>
                                        <p>
                                            This license is designed to encourage widespread adoption and collaboration, while also protecting the rights of both users and developers. This license is designed to encourage widespread adoption and collaboration, while also protecting the rights of both users and developers.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 11: How interoperable is DELTA Resilience with Sendai Framework Monitoring?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            DesInventar (Sendai version) and the Sendai Framework Monitoring (SFM) systems were already interoperable, in the sense that any government using DesInventar Sendai to record event-by-event disaster losses and damages and keeping their data up to date on the UNDRR-hosted server (Desinventar.net), could utilise the available application programming interface (API). This API links DesInventar Sendai with the SFM system, enabling the transfer of data to report on indicators under Targets A to D. These targets measure progress in reducing disaster-related mortality, the number of people affected, economic losses, and disruptions to critical infrastructure and basic services.
                                        </p>
                                        <p>
                                            The middleware tool for migrating data from DesInventar to the Disaster Terminology Standard (DELTA Resilience) has been developed as an extension of the existing API. This is a faceless extract transform and load type of tool without a user interface and is branded as Disaster information exchange or DiX. It will allow users to continue pulling data from DELTA Resilience into the SFM system, aggregating event-level records on disaster losses and damages into annual reporting values used to compute indicators for Targets A (substantially reduce global disaster mortality), B (substantially reduce the number of affected people), C (reduce direct disaster economic loss in relation to global GDP), and D (substantially reduce disaster damage to critical infrastructure and disruption of basic services).
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 12: What is the licensing for data contained in the DELTA Resilience national instance?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The licensing of data contained in a DELTA Resilience national instance is determined by the national authority or institution responsible for managing the system. Since each country owns and governs its national instance of DELTA Resilience, it retains full control over the data it collects, validates, and publishes through the platform, as well as over any data it chooses to share with DELTA Resilience regional or UNDRR global instances.
                                        </p>
                                        <p>
                                            As such, data licensing may vary depending on national policies, regulations, and data-sharing agreements. In many cases, countries may choose to apply for an open data license (such as Creative Commons Attribution or Open Data Commons), particularly for aggregated, non-sensitive, anonymised data intended for public dissemination.
                                        </p>
                                        <p>
                                            To determine the applicable licensing terms for a specific DELTA Resilience national instance, users should refer to the data policy or terms of use published by the national administrator or contact the designated focal point for further clarification.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 13: What is the recommended citation for the data produced through DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            When using or referencing data from a national DELTA Resilience instance, users should cite the national authority responsible for the data, along with the DELTA Resilience platform. A recommended citation format following as general reference style of the APA (American Psychological Association) citation style is: [Name of National Authority] (Year). Disaster loss and damage data. [DELTA Resilience platform name or URL. Accessed on [Date]. Example: National Disaster Management Agency of Country X (2025). Disaster losses and damages data. DELTA RESILIENCE Country X Platform. Accessed on 30 June 2025.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 14: What are the requirements to host a DELTA Resilience country instance?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            To run a DELTA Resilience (Disaster Tracking System) country, for instance, a computer server with enough processing power and memory is needed. Specifically, the server should have a modern multi-core processor (quad-core), at least 8 GB of memory (RAM), and around 50 GB of available space on a solid-state drive (SSD), which helps the system run faster and more reliably.
                                        </p>
                                        <p>
                                            The software that runs DELTA Resilience needs to be installed on a compatible operating system. This can be a recent version of Linux server (such as Ubuntu, CentOS, or Debian), or Windows Server (with a special setup that allows it to work like Linux). DELTA Resilience also requires a type of database called PostgreSQL, along with a mapping feature called PostGIS, which helps handle geographic and spatial data. In addition, the server must run Node.js, a program that allows web-based applications like DELTA Resilience to function. On top of this, the application uses Remix and React for the web interface. Other necessary components include a way to send emails from the system (called an SMTP email relay), a website address (domain or subdomain), and a security certificate (SSL) to protect users' data and ensure secure access.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 15: Is DELTA Resilience an open-source software, and what does it mean that DELTA RESILIENCE is open-source software?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            DELTA Resilience is an open-source software, which means the source code, the instructions that make the program work, is freely available for anyone to view, use, modify, and share. Unlike commercial software that usually requires a paid license, open-source software allows countries or institutions to host and manage their own version of DELTA Resilience without licensing fees. This also promotes transparency, flexibility, and collaboration, as users can adapt the software to their specific needs, contribute improvements, and benefit from the enhancements made by others in the global community.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 16: Are there any software dependencies to consider installing and running the DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Open-source dependencies are additional components or tools that an open-source application relies on to function properly. These are also open-source, freely available, and maintained by their own development communities. In the case of DELTA Resilience, PostgreSQL and PostGIS (freely downloadable software) are examples of such dependencies. However, they do not add extra software requirements beyond what is already expected (outlined in the question related to running DELTA Resilience). These tools are standard parts of the DELTA Resilience system architecture, well-supported, and fully integrated, meaning no additional software or licenses are needed to use them as part of a DELTA Resilience installation.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 17: In which languages is the interface available?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The interface is currently available in English, Arabic, and Russian. A Spanish and Portuguese versions will be released soon. In the meantime, automatic translation can be enabled through browser plugins or built-in translation features, depending on the user's browser settings. In the future, additional language versions will be supported through the integration of Weblate, enabling collaborative and community-driven translations.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Communications &amp; Branding</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 18: What is the branding for the DELTA Resilience system?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA Resilience (Disaster &amp; Hazardous Events, Losses and Damages Tracking &amp; Analysis) for hazardous events and associated losses and damages does not yet have a definitive global visual identity. However, the acronym "DELTA Resilience" has been widely adopted and provides flexibility for countries to contextualize and signal ownership through national branding of their systems, for example, Country DELTA Resilience, following a similar approach to the branding used for DesInventar (DI), such as LaoDI, CambDI, etc.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 19: Are there limits for users to be created in DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            DELTA Resilience does not impose a limit on the number of users or the number of geographic-administrative divisions that can be configured for a national DELTA Resilience instance. The number of users assigned different roles within the system (e.g., administrator, data collector, data validator) is determined by each country's database administrators.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 20: How many geographic levels can admin users create in DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Unlike DesInventar Sendai, which allows up to three administrative levels typically representing subnational entities, DELTA Resilience enables an unrestricted number of configurable geographic-administrative levels.
                                        </p>
                                        <p>
                                            This flexibility allows countries to align the system with their actual governance structures and data workflows, including more granular units such as municipalities, neighborhoods, districts, or local committees/civil protection services that may directly input data. While three levels may be sufficient in more centralized countries, they have proven inadequate in federated systems or where strong data collection capacities exist at city or local levels.
                                        </p>
                                        <p>
                                            By supporting customizable geographic hierarchies, DELTA Resilience enables more precise data collection, strengthens local ownership, and improves alignment with national administrative structures. In addition to tagging data to specific administrative-geographic levels, DELTA Resilience also introduces geocoding capabilities that were not available in DesInventar. This allows users to geotag records, for example, for damaged infrastructure assets or to define the geographic extent of a hazardous event or affected area. As a result, DELTA Resilience supports both indexing data to an administrative unit and geospatial data using points, lines, or polygons, like any modern geographic information system (GIS).
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">On Data migration from the legacy system</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 21: What will happen with DesInventar Sendai and the data it contains?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The data contained in DesInventar Sendai–based databases can be migrated using an API-based Extract, Transform, and Load (ETL) tool developed specifically for this purpose. As DesInventar.net will no longer be supported after December 2026, governments are encouraged to transition to DELTA Resilience, and support will be provided to facilitate a smooth migration process.
                                        </p>
                                        <p>
                                            To simplify this transition, all data currently hosted on the UNDRR-maintained DesInventar.net server will be converted into a DELTA Resilience–compatible format and made available for users to load into their national DELTA Resilience, instances. The publicly available data hosted on DesInventar.net will remain accessible for consultation purposes.
                                        </p>
                                        <p>
                                            At this stage, the API is publicly available on the DesInventar.net server and can be used to migrate data hosted on that UNDRR-maintained server. For data hosted on other DesInventar instances, whether public or private, administrators may also use the API to migrate their datasets. Researchers and other stakeholders interested in continuing to use the DesInventar Sendai software may still download and run it independently.
                                        </p>
                                        <p>
                                            UNDRR provides general guidance and technical documentation for using the API. Requests for direct technical assistance will be reviewed and addressed on a case-by-case basis.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 22: Can I migrate the data from other disaster loss databases?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The API to transfer data from DesInventar to DELTA Resilience has been designed to transform data organized as per The API developed to transfer data from DesInventar to DELTA Resilience is designed to transform data structured according to the DesInventar format into records compatible with the DELTA Resilience data model. However, the tool can also be adapted to transfer disaster losses and damages data organized in other formats, provided it can be transformed into a DELTA Resilience - compatible structure.
                                        </p>
                                        <p>
                                            This is technically possible but may require adjustments to the tool. Requests for support will be reviewed and addressed on a case-by-case basis.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">On the country rollout</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 23: What does it mean to roll out DELTA Resilience at the country level?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The process of introducing the DELTA Resilience (Disaster &amp; Hazardous Events, Losses and Damages Tracking &amp; Analysis) into a country for national use and institutionalisation is referred to as a "rollout." It is a step-by-step approach designed to support countries in establishing a sustainable system and methodology to collect, organise, analyse, and apply information on hazardous events, associated losses and damages, and their impacts.
                                        </p>
                                        <p>
                                            DELTA Resilience software is one element of the broader toolkit that countries may choose to adopt. However, a DELTA Resilience rollout does not necessarily mean that countries must use UNDRR-supported software if they do not wish to. In many cases, primary needs may lie in areas such as data governance, methodological development, or technical capacity building.
                                        </p>
                                        <p>
                                            To better understand these needs and to design a country-specific implementation plan, UNDRR and partners recommend conducting a Data Ecosystem Maturity Assessment and data readiness and quality assessment tools. This self-assessment tool helps countries evaluate their overall data governance, the structure and flow of their data value chain, and identify opportunities for improvement. The results can serve as the foundation for a tailored country rollout plan and can also inform project proposals to engage donors and partners for technical or financial support.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 24: Which partners support the DELTA Resilience rollout in countries?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            As a general rule, UNDRR, together with its core partners UNDP and WMO, is available and committed to supporting countries interested in strengthening their disaster loss and damage tracking systems using the DELTA Resilience (Disaster &amp; Hazardous Events, Losses and Damages Tracking &amp; Analysis). The type of support provided, and the involvement of additional UN entities, regional organisations, or non-UN partners, will vary case-by-case basis. This depends on factors such as a country's data and digital capacity, level of development, regional and country context, and specific needs or requests.
                                        </p>
                                        <p>
                                            Depending on the specific use cases and application of disaster losses and damages data, specialized support mechanisms may also be mobilized. For example, if the goal is to strengthen the use of such data for impact-based warning and early action, countries may receive support from dedicated early warning partners, initiatives, and funding sources.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 25: When will the changeover to DELTA Resilience happen?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA Resilience software and toolkit are being released progressively. New functionalities, methodological notes, and capacity development tools are made available as they are finalised, incorporating feedback from experts and users. Since DELTA Resilience is more than just a software tool, the decision on when to begin the process of strengthening capacities, governance mechanisms, methodologies, and tools for tracking hazardous events and associated losses and damages rests with each national government.
                                        </p>
                                        <p>
                                            A beta version of the DELTA Resilience software is currently available upon request for countries interested in exploring it and the code is publicly available on the UNDRR GitHub <a href="https://github.com/unisdr/delta" target="_blank" rel="noreferrer" className="text-[#0ea5e9] underline [text-underline-offset:2px] hover:text-[#0284c7]">Repository</a>. The recommended starting point is to conduct a self-assessment of the national disaster data ecosystem, examining not only how data is produced and by whom, but also how it is used and by which actors.
                                        </p>
                                        <p>
                                            This assessment can help identify existing capacities and gaps and may also open new opportunities for collaboration. It often reveals how improved data quality and availability can enhance evidence-based decision-making across sectors. The assessment should help guide countries in developing a roadmap to strengthen data ecosystem maturity and identify practical entry points, including activities and outputs for a work plan to institutionalize their Disaster Tracking System powered by DELTA Resilience
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 26: What technical assistance is available for countries interested in utilising the system?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            UNDRR, UNDP, and WMO are open to receiving requests for technical assistance. Depending on the specific context, identified needs, comparative advantages, in-country portfolios, and the resources available to respond, different forms of support may be offered.
                                        </p>
                                        <p>
                                            At a minimum, countries that reach out to any of these partners will receive orientation on the DELTA Resilience toolkit of resources. Additional resources, such as training modules, technical guidance, and tutorials in various formats and languages, are being progressively developed and made available, including through digital and interactive platforms. For UNDRR, all technical assistance and country-level support are framed within its broader engagement on risk knowledge. This includes efforts to strengthen national capacities to produce, use, and govern disaster and risk data, transforming it into actionable knowledge and insights. The goal is to enable a better understanding of risk and disaster impacts, and to inform risk reduction and management decisions in the context of sustainable development and risk-informed humanitarian action
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 27: What does it mean to institutionalize the system?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Institutionalising the DELTA Resilience (Disaster &amp; Hazardous Events, Losses and Damages Tracking &amp; Analysis) means integrating it into a country's official systems, structures, and processes so that it becomes a sustainable and routine part of disaster risk management—supporting efforts to avert, minimize, and address loss and damage. This goes beyond simply adopting the software; it involves establishing and maintaining the governance, capacities, methodologies, and workflows required to systematically collect, analyse, and use data on hazardous events, losses, and damages.
                                        </p>
                                        <p>
                                            Institutionalization typically includes:
                                        </p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Understanding, identifying, and assigning clear roles and responsibilities across government agencies and stakeholders.</li>
                                            <li>Embedding the system into legal or policy frameworks, where relevant.</li>
                                            <li>Ensuring regular data collection and validation processes are in place.</li>
                                            <li>Building technical and human capacities to manage and use the system effectively.</li>
                                            <li>Promoting the use of data for planning, decision-making, reporting, and accountability.</li>
                                        </ul>
                                        <p>
                                            Ultimately, institutionalizing DELTA Resilience means the system is owned, led, and maintained by national institutions, contributing to the production of official data and statistics on loss, damage, and broader climate and disaster impacts. The long-term objective is to inform decision-making, enable effective policies and implementation, and support risk prevention, reduction, risk-informed development and Resilience building.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">On data collection</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 28: What quantitative data can be recorded in DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Quantitative data refers to measurable metrics that can be expressed in numbers. These may include:
                                        </p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Hazardous events: magnitude or intensity measurements (e.g., wind speed, seismic intensity, rainfall).</li>
                                            <li>Damage: number of physical units destroyed or damaged (e.g., houses, schools, health facilities, infrastructure).</li>
                                            <li>Disruptions: duration of service interruptions (e.g., in days or hours), number of users affected by service disruptions.</li>
                                            <li>Baseline and reference information: supply or demand information on sectors, pricing or costing information (e.g. commodity prices, farm gate prices of tons of different crops, cost of replacement of infrastructure assets, like km/road)</li>
                                            <li>Human effects: number of people affected, displaced, or belonging to specific age or demographic groups.</li>
                                        </ul>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 29: What qualitative data can be recorded in DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Qualitative data can be captured at different levels in the DELTA/ Disaster Tracking system
                                        </p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Hazardous events: for example, descriptions of the phenomenon's characteristics, the chain of events, and interactions.</li>
                                            <li>Disaster events: such as narratives of response operations, warnings issued, or assessment methodologies applied.</li>
                                            <li>Disaster records: particularly in relation to non-economic losses, where quantitative data may be limited but qualitative insights are valuable to capture the lived experience, for example, on impacts related to loss of intangible cultural assets such as traditions, etc.</li>
                                        </ul>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 30: Can I collect data on any type of hazards using DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Yes, DELTA Resilience enables the collection of data on any hazardous event of concern for a country, including both slow-onset disasters and climate change processes, as well as extreme events. The system is based on the ISC/UNDRR Hazard Classification Review (current version: <a href="https://www.undrr.org/publication/documents-and-publications/hazard-information-profiles-hips-2025-version" target="_blank" rel="noreferrer" className="text-[#0ea5e9] underline [text-underline-offset:2px] hover:text-[#0284c7]">2025</a>), which identifies and categorises up to 281 specific hazards across eight hazard types: hydro-meteorological, extraterrestrial, geological, biological, environmental, chemical, technological, and societal.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 31: Can I collect data from the field directly on DELTA?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Yes, DELTA Resilience supports field data collection through its web-based interface, which can be accessed from any internet-connected device, including tablets and smartphones. This allows authorized users to enter disaster data directly from the field in real time or during post-disaster assessments.
                                        </p>
                                        <p>
                                            In future releases, the DELTA Resilience architecture will include a mobile application for custom-tailored survey forms, enabling seamless offline data collection. It will also support integration with external mobile data collection tools (such as KoBoToolbox, ODK, or custom apps), allowing offline data to be synchronised with the system once connectivity is available. This flexibility ensures that data from remote or low-connectivity areas can still be captured and incorporated into national records efficiently and securely.
                                        </p>
                                        <p>
                                            Field data collection workflows and access permissions are defined by each country's national implementation strategy and governance framework for DELTA Resilience.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 32: Can I use a tablet or mobile device to collect data on DELTA Resilience? Does it work if I am offline?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Yes, the DELTA Resilience software is designed with a mobile-first approach, ensuring that screens are readable and usable on both small and large devices. This means data can be entered directly into DELTA Resilience using a mobile phone or tablet, as long as an internet connection is available.
                                        </p>
                                        <p>
                                            However, offline functionality, such as collecting data without connectivity and syncing it later, requires a mobile app, which is currently not yet available. The development of such an app is planned as part of the DELTA Resilience program's future roadmap.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 33: Who at the national and local levels needs to be engaged in collecting data in DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The decision on who is responsible for collecting data within a national DELTA RESILIENCE instance rests with the government. Depending on the country's administrative and geographic structures, the degree of sectoral decentralization, and the roles and responsibilities assigned to different levels of government, the national DELTA Resilience administrator may choose to assign different roles to central and sub-national entities within the system.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">On data analysis</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 34: What types of analysis are possible to do on DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA Resilience allows users to analyse disaster impacts in multiple ways, by hazard type (e.g., floods, droughts, earthquakes), by specific disaster event, or by sector such as agriculture, health, education, or infrastructure. A key feature is that impact data are directly connected to hazardous event information (e.g., magnitude, duration, spatial footprint), which strengthens understanding of chains of effects and supports forensic and trend analysis. The system also integrates baseline and reference data (such as pre-disaster economic, demographic, or environmental indicators), allowing users to put losses and damages into context, for example, assessing the scale of affected population, service disruption, or production loss relative to pre-disaster levels. Because DELTA Resilience data can be disaggregated to the sub-national level, it provides granular insights into local vulnerabilities and sectoral impacts, helping governments and stakeholders target interventions more effectively and plan risk-informed recovery and development strategies. In addition, linking hazard parameters with observed impacts creates the basis for impact-based forecasting, helps define thresholds for warnings, and supports the selection of anticipatory and early actions to minimise losses before disasters fully unfold.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">On data visualisation</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 35: What are the system capabilities for data visualisation?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            In the DELTA Resilience Beta version, the system includes three preconfigured dashboards designed to support rapid, template-based data visualisation. A dashboard is a visual interface that displays key data using charts, graphs, maps, and summary tables, making it easier to understand trends, patterns, and impacts at a glance.
                                        </p>
                                        <p>
                                            Each of the three dashboards in DELTA Resilience offers a different entry point for exploring data:
                                        </p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Hazard-based dashboard allows users to view and analyse disaster data by type of hazard.</li>
                                            <li>Sector-based dashboard filters and presents data based on sectors such as health, agriculture, infrastructure, etc.</li>
                                            <li>Disaster event dashboard displays the effects of a specific disaster event across multiple dimensions, including human, economic, environmental, and other dimensions of impact.</li>
                                        </ul>
                                        <p>
                                            These dashboards help users quickly access and interpret key information for decision-making, reporting, and support further losses and damages data collection.
                                        </p>
                                        <p>
                                            Each of the three dashboards in DELTA offers a different entry point for exploring data:
                                        </p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Hazard-based dashboard allows users to view and analyse disaster data by type of hazard.</li>
                                            <li>Sector-based dashboard filters and presents data based on sectors such as health, agriculture, infrastructure, etc.</li>
                                            <li>Disaster event dashboard displays the effects of a specific disaster event across multiple dimensions, including human, economic, environmental, and other dimensions of impact.</li>
                                        </ul>
                                        <p>
                                            These dashboards help users quickly access and interpret key information for decision-making, reporting, and support further losses and damages data collection.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">On quality control</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 36: How does DELTA Resilience support quality control?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            DELTA Resilience includes built-in features to support data quality control throughout the entire data lifecycle. The system allows administrators to assign specific user roles, such as data collectors, validators, and reviewers, to ensure that data is reviewed and validated before it is finalised or published. Additionally, DELTA Resilience provides audit trails, logs or edit histories, and status flags (e.g., draft, approved, sent for review, published) to help track the quality, completeness, and reliability of each record over time.
                                        </p>
                                        <p>
                                            Some validation mechanisms are embedded directly into system computations. For example, in the case of human impact variables, the system checks the consistency of disaggregated data. Required fields are clearly marked, and users cannot save a record unless those fields are completed, supporting the systematic capture of some important fields and metadata.
                                        </p>
                                        <p>
                                            As part of the Country DELTA Resilience setup and customization process, additional validation rules can be configured by the national administrator in alignment with national standards and data workflows. This helps to further enhance data consistency, accuracy, and credibility across the system.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 37: Who is responsible for quality control?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Quality control responsibilities are determined at the national level by the institution managing DELTA Resilience. Typically, the national DELTA Resilience administrator, in coordination with relevant government agencies or focal points, assigns validation and review roles to appropriately trained personnel. These may include national statistical offices, sectoral ministries, disaster risk management agencies, or subnational authorities, depending on the country's institutional arrangements. The overall objective is to ensure that each data point is reviewed by actors with the appropriate expertise before it becomes part of the official records
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">On owning, administering hosting and sharing data</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 38: How is DELTA Resilience owned, administered, and shared across local, national, regional, and global levels?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Building on the legacy of DesInventar, the DELTA Resilience is designed at its core to support country-owned systems for tracking disaster losses and damages, with the ability to operate at sub-national resolution. While DesInventar evolved organically over time into a government tool for institutionalising official disaster loss databases, its early implementation varied: some databases were managed by regional intergovernmental organizations, others by technical or academic institutions, and in some cases, state-level, city, or metropolitan databases existed either in parallel to or disconnected from national-level systems.
                                        </p>
                                        <p>
                                            In contrast, the DELTA Resilience is clearly positioned as a toolkit for producing official disaster-related statistics, particularly in relation to disaster impact. A key innovation of DELTA Resilience is that it does not limit the number of sub-national geographic or administrative levels that can be configured by national administrators. By using a "nesting" approach, DELTA Resilience enables countries to zoom in and out on disaster effects across different territorial levels. While hazardous events and disasters are not constrained by administrative boundaries, losses and damages reporting often relies on recognised administrative or statistical units for relevance and comparability. These administrative boundaries may overlap with other geographic areas used for data aggregation, such as river basins or ecosystem zones, especially when assessing environmental or biodiversity-related losses.
                                        </p>
                                        <p>
                                            While recognising the valuable work done by researchers and academic institutions in collecting and compiling historical disaster data from multiple sources, and in some cases, maintaining data recording functions over many years, DELTA Resilience invites academic organisations to take on a different, more strategic role. To share data with the UNDRR-hosted global DELTA Resilience instance, the database must be administered by a central government authority.
                                        </p>
                                        <p>
                                            Nonetheless, regional organisations, NGOs, and academic institutions continue to have an important role within national DELTA Resilience ecosystems. Their specific roles are defined by each country's national administrator, but rather than focusing on tracking disasters from secondary sources, they are encouraged to support other areas such as capacity development in data management; technical assistance in data analysis and application, research and innovation for evidence-based decision-making.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 39: What data is publicly shared?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Data entered into a national DELTA Resilience instance is fully owned and controlled by the government or national institution responsible for administering the system. The designation of the national DELTA Resilience administrator is a decision made by the government. It is also the government that determines who can access, validate, and publish data, as well as what information is shared externally.
                                        </p>
                                        <p>
                                            Governments are encouraged to openly share non-sensitive, anonymised data to promote a culture of transparency and support accountability. Making data visible not only to national stakeholders but also to regional and global DELTA Resilience instances enhances the ability to benchmark progress across countries and provides an aggregated view of global trends. This is particularly important for tracking commitments under international frameworks such as the Sendai Framework for Disaster Risk Reduction and the Global Goal on Adaptation.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 40: What does it mean that the system is meant for official data production?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA Resilience is designed to support the creation of official statistics on disaster losses and damages. This means data are collected, validated, and managed by mandated government institutions (such as national disaster risk management offices, sectoral entities like agriculture or public works departments, hydro-meteorological services, or national statistics offices), ensuring they meet standards of quality, consistency, and credibility. By being recognised as official, DELTA Resilience data can be used not only for policymaking, planning, and international reporting (e.g., on the Sendai Framework and SDGs), but also to guide public policy and investment decisions, for example, prioritising infrastructure upgrades, targeting social protection programs, or allocating budgets for disaster risk reduction and climate adaptation. Reliable and comparable statistics are essential for governments to justify investments, monitor progress, and build accountability in reducing disaster and climate-related risks
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 41: Can governments restrict the part of the data they want to make public?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Yes. While UNDRR and the DELTA Resilience promote transparency and comparability, governments retain full ownership and control of their national Disaster Tracking Systems, regardless of the hosting solution chosen. Administrators from national governments can decide what level of data to make publicly accessible (e.g., aggregated national statistics) and what to keep restricted (e.g., sensitive sub-national data, sector-specific details, or personal information). This flexibility ensures that data privacy, security, and national policies are respected, while still allowing core indicators to feed into regional and global reporting. In addition, the DELTA Resilience supports national data workflows by embedding quality assurance and control mechanisms: roles and permissions can be assigned to different institutions, and the system issues issues internal notifications to designated reviewers and approvers for each type of data. This structured workflow ensures that all records undergo proper validation before publication, reinforcing the credibility and reliability of official disaster statistics.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 42: Is there a simultaneous synchronisation among instances?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Yes. The DELTA Resilience is designed as a federated system, meaning that national instances can synchronise with regional or global repositories. However, this functionality is used only at the discretion of the national administrator. Countries retain full control to decide whether to enable synchronisation, which datasets to share, and at what level of aggregation (e.g., national totals versus sub-national detail). When approved, synchronisation ensures that selected updates (such as new disaster event records) are reflected in connected platforms, supporting regional comparability and global aggregation while safeguarding national ownership of data.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 43: Is there a UNDRR-owned DELTA Resilience global instance?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Not yet. At present, the UNDRR shared environment operates primarily as a hosting service through which countries can deploy and manage their own national instances, consuming DELTA Resilience as a software-as-a-service (SaaS) solution without the need to maintain local infrastructure. Each country retains ownership and control of its data while benefiting from centralized hosting, maintenance, and technical support provided by UNDRR.
                                        </p>
                                        <p>
                                            In the near future, this shared environment will be complemented by a global aggregation platform enabling visualization of publicly shared official data and supporting global, regional, and thematic analysis of disaster and climate change impacts. Users will be able to compare data across countries, filter and analyze by country groups (e.g., SIDS), regions, or categories, and generate aggregated insights by hazard type, hazard cluster, or specific hazards.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 44: What will the UNDRR-maintained DELTA Resilience global instance contain?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The UNDRR global instance will provide analysis and visualization functionalities comparable to those available in national DELTA Resilience systems, drawing on publicly shared official data validated by countries. It is designed to support global, regional, and thematic analysis, enabling comparative views and aggregated insights across countries, regions, and hazard types.
                                        </p>
                                        <p>
                                            Data entry modules will not be accessible through the UNDRR DELTA Resilience global instance. Countries will continue to use their national DELTA Resilience systems (either hosted locally or within the UNDRR-supported shared instance) as the primary entry point for data collection, validation, and management.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 45: Can regional intergovernmental organizations establish a regional DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Regional intergovernmental organizations are encouraged to support and lead regional-level analysis of disaster impacts and trends, including the aggregation and interpretation of data related to transboundary hazardous events. Rather than serving as a primary data entry platform, a regional DELTA Resilience environment would focus on analysis and visualization, drawing on officially validated data shared by participating countries.
                                        </p>
                                        <p>
                                            Such regional initiatives can also play an important role in strengthening data governance, fostering coordination among countries, and supporting the development of a mature and collaborative data ecosystem across national and regional levels.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 46: What are the safety, data security protocols followed by DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            DELTA Resilience is built on a secure, modular architecture that follows UN-standard data protection and cybersecurity practices, including:
                                        </p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Role-based access control</li>
                                            <li>Data Encryption</li>
                                            <li>Audit logs and user activity tracking</li>
                                            <li>Recommendation for hosting in secure, compliant environments</li>
                                        </ul>
                                        <p>
                                            Each national instance may be hosted locally or in a secure cloud environment, as decided by the national authority.
                                        </p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Role-based access control</li>
                                            <li>Data Encryption</li>
                                            <li>Audit logs and user activity tracking</li>
                                            <li>Recommendation for hosting in secure, compliant environments</li>
                                        </ul>
                                        <p>
                                            Each national instance may be hosted locally or in a secure cloud environment, as decided by the national authority.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 47: What roles exist in DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            DELTA Resilience supports configurable user roles to reflect operational responsibilities, such as Administrator: assign roles and define custom settings, such as custom disaggregation, language, etc. Data collectors: Enter primary data; Approvers/Validators: Review and confirm records; Viewers: Access data without editing rights.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 48: Who administers DELTA Resilience?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            Each national instance of the DELTA Resilience (Disaster &amp; Hazardous Events, Losses and Damages Tracking &amp; Analysis) is administered by a designated national authority or institution, as determined by the government. This could be a disaster risk management agency, national statistics office, civil protection authority, or another mandated entity with the responsibility to oversee hazardous event and losses and damages data collection, validation, and dissemination
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">Applications and Use Cases</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 49: What is the linkage between the losses and damages tracking systems and the Post Disaster Needs Assessments?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA Resilience (Disaster &amp; Hazardous Events, Losses and Damages Tracking &amp; Analysis) closely aligns with the PDNA methodological approach, particularly in its definitions of damages (physical destruction of assets) and losses (decline in economic flows and services). Consistent with the PDNA and draft Global Disaster-Related Statistics (DRS) framework, DELTA Resilience organises data across four key sectoral groups: productive, social, infrastructure, and cross-cutting, mirroring the PDNA's structured analysis of effects and impacts.
                                        </p>
                                        <p>
                                            Methodological consistency: By borrowing PDNA's conceptual framing of damages and losses and applying the same sectoral taxonomy used in PDNAs, the DELTA Resilience ensures data compatibility. This enables the system to act both as a live data repository for ongoing and past hazardous and disaster events and as a landing place for PDNA outputs, preserving them in a structured national statistics framework.
                                        </p>
                                        <p>
                                            Comprehensive event coverage: While PDNAs are mostly used following major disasters to prepare detailed recovery plans, the DELTA Resilience is agnostic to event scale; there are no thresholds for registration. All hazardous events, including localised incidents and disaster events, can be recorded. Moreover, the DELTA Resilience also logs technical hazard parameters (such as magnitude, duration, or spatial footprint), regardless of whether they trigger losses.
                                        </p>
                                        <p>
                                            In essence, the DELTA Resilience extends PDNA's methodological strengths into everyday national data systems. It not only supports the design and interpretation of PDNA reports but also ensures that all disaster-related statistics, whether stemming from large-scale assessments or everyday hazardous events, are integrated into a unified, long-term knowledge base.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 50: What is the linkage between losses and damages tracking and the World Bank GRADE?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The Global Rapid Post-Disaster Damage Estimation (GRADE), developed by the World Bank and GFDRR, is a rapid, remote assessment tool that produces early estimates of direct physical damage, mainly to housing, infrastructure, and productive assets, within about two weeks of a disaster. It relies on hazard models, satellite and drone imagery, exposure data, and past disaster information to deliver credible, sectoral damage estimates.
                                        </p>
                                        <p>
                                            GRADE is not a continuous database but rather a post-event analytical service. Its results are highly complementary to national losses and damages tracking systems such as the DELTA Resilience
                                        </p>
                                        <p>
                                            On one hand, GRADE outputs can be imported into the DELTA Resilience, ensuring that rapid post-disaster estimates are preserved in the official national repository and integrated with other loss and damage records. On the other hand, historical data from the DELTA Resilience, on hazard footprints, damages, and sectoral impacts, can strengthen the calibration and contextualization of GRADE models when they are deployed in a country.
                                        </p>
                                        <p>
                                            Together, GRADE and DELTA Resilience reinforce each other: GRADE provides fast, model-based impact estimates to guide immediate decision-making, while the DELTA Resilience ensures long-term, systematic recording and validation of disaster statistics across all events, large and small.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 51: How does DELTA Resilience support access to the Fund to respond to loss and damage?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA Resilience provides countries with a standardised, nationally owned system to record disaster losses and damages, including both economic and non-economic impacts, as well as slow-onset events. This creates the official statistical baseline needed to inform the design, monitoring, and evaluation of support provided through the Loss and Damage Fund. By ensuring data are comparable, disaggregated, and credible, the DELTA Resilience strengthens the evidence base for access to finance, reporting, and accountability under the Fund.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 52: How can I submit examples of current data applications?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The <a href="https://forms.office.com/e/PvnZw11EbB" target="_blank" rel="noreferrer" className="text-[#0ea5e9] underline [text-underline-offset:2px] hover:text-[#0284c7]">form</a> is available online to share your case studies on current applications. We will review the submission, offer suggestions for improvement, support in edits and publish in the PreventionWeb collection of case studies.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 53: Where can I find good practices and case studies on the application of disaster data?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            A wide range of use cases, case studies, and practical insights is available on the <a href="https://www.undrr.org/building-risk-knowledge/disaster-data" target="_blank" rel="noreferrer" className="text-[#0ea5e9] underline [text-underline-offset:2px] hover:text-[#0284c7]">UNDRR Disaster Losses and Damages Data</a> page, showcasing how loss and damage data are applied across areas from risk analysis to disaster risk reduction. These examples document both current applications and emerging use cases, building the case for investing in stronger disaster data systems and highlighting opportunities to expand their application through enhanced data quality. Illustrative cases include the use of loss data to calibrate parametric insurance in Colombia, to strengthen impact-based early warning for typhoons in the Philippines, and to support vulnerability modelling in Sri Lanka.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 54: How can I use the DELTA Resilience for my Biennial Transparency Reports (BTR)?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            DELTA Resilience not only supports countries in preparing their Biennial Transparency Reports (BTRs) under the UNFCCC but also strengthens the credibility of those reports by providing reliable, structured, and nationally validated data on hazardous events and associated losses and damages. This data can inform several key sections of the BTR.
                                        </p>
                                        <p>
                                            For climate impacts and vulnerabilities, DELTA Resilience enables countries to track the effects of climate related hazards such as floods, droughts, and storms on people, livelihoods, infrastructure, and ecosystems. This supports evidence-based reporting on observed impacts, helps identify vulnerable sectors and groups, and offers a clearer understanding of national adaptation needs.
                                        </p>
                                        <p>
                                            When it comes to loss and damage, DELTA Resilience provides a structured way to document both economic and non-economic losses. This includes quantifying the scale and frequency of loss and damage, supporting reporting under Article 8 of the Paris Agreement, and informing financial needs assessments and resource mobilisation efforts.
                                        </p>
                                        <p>
                                            Finally, DELTA Resilience plays an important role in tracking the effectiveness of adaptation and risk reduction measures. By analysing trends over time, countries can report on their BTRs where such efforts have worked well, and where recurring losses highlight the need for further investment or action.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-xl font-semibold text-slate-900">LINKAGES</h2>
                        <div className="space-y-4">
                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 55: How does the DTS relate to the Secretary General's initiative on Early Warning for All?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA Resilience is a core part of EW4All's Risk Knowledge pillar, providing official disaster impact data that strengthens risk assessments and informs preparedness and early action. It also supports monitoring and evaluation by measuring the effectiveness of warnings and contributes to Pillar 2 (Monitoring and Forecasting) by identifying which hazards require stronger observation and forecasting systems.
                                        </p>
                                        <p>
                                            In addition, by linking hazard parameters with observed impacts, the DELTA Resilience provides the evidence base for impact-based forecasting. This allows governments to define thresholds for warnings (e.g., rainfall levels likely to trigger flooding) and to select appropriate anticipatory actions. These go beyond classic measures like evacuation or stockpiling relief goods, and may include actions codified in early action protocols, such as pre-positioning animal feed, vaccinating livestock, securing seed stocks, or supporting farmers ahead of forecast droughts or floods, to protect livelihoods and reduce long-term losses.
                                        </p>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 56: How does DELTA Resilience link with the Global Common Framework for Disaster-related Statistics?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            DELTA Resilience is strategically linked to the new global common framework for disaster-related statistics (<a href="https://unstats.un.org/UNSDWebsite/statcom/session_57/documents/BG-4c-G-DRSF-E.pdf" target="_blank" rel="noreferrer" className="text-[#0ea5e9] underline [text-underline-offset:2px] hover:text-[#0284c7]">G-DRSF</a>), playing a vital role in operationalizing its core goals. Key features and enabling factors of the linkage are:
                                        </p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Standardisation of terminology and classification: International standardisations, including HIPs and WMO-CHE, are an integral part of both DELTA Resilience and G-DRSF, allowing data sharing and promoting use and compatibility</li>
                                            <li>Disaggregated data: DELTA Resilience, by capturing disaggregated losses and damages at localised scales, ensures data granularity and quality, addressing a key requirement of the DRSF to enable comparability across time and space.</li>
                                            <li>Increased coverage of risks and impacts: DELTA Resilience and G-DRSF cover complex scenarios and multi-dimensional losses and damages sectors, and the disaster impacts: from rapid to slow onset events, cascading events, transboundary events, to various damage and loss sectorial impacts, including non-economic loss.</li>
                                            <li>Data governance and Institutional Collaboration: both DELTA Resilience and G-DRSF advocate and provide guidelines for linkages and enhanced collaboration between the National Disaster Management Offices (NDMOs), the National Hydro-Meteorological Services (NHMS) and the National Statistics Offices (NSOs), extending the losses and damages data value chain to support improved analytical options.</li>
                                            <li>Compatibility and interoperability of existing data: the existing disaster data, including Sendai Framework Monitor, DesInventar, and other statistical frameworks, indicator sets, and metadata, can be harmonized, connected, and integrated via G-DRSF into DELTA Resilience</li>
                                            <li>Technological innovation: both DELTA Resilience and G-DRSF promote technological advancement and integration of new data collection, dissemination, and analytics features that are tailored to country maturity</li>
                                        </ul>
                                    </div>
                                </AccordionTab>
                            </Accordion>

                            <Accordion className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70">
                                <AccordionTab header="Question 57: What are the linkages of DELTA with the WMO Cataloguing hazardous events?">
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        <p>
                                            The DELTA Resilience (Disaster &amp; Hazardous Events, Losses and Damages Tracking &amp; Analysis) has been designed to align with the WMO Catalogue of Hazardous Events (WMO-CHE) as the authoritative international methodology for classifying and recording hazardous events, to be applied by National Hydro-Meteorological Services (NMHSs).
                                        </p>
                                        <p><strong>Hazard Taxonomy Alignment</strong></p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>The DELTA RESILIENCE data model incorporates the WMO-CHE event classification as the reference taxonomy for hydrometeorological hazardous events.</li>
                                            <li>For hazards beyond the scope of WMO, core methodological elements, such as universal unique identifiers (UUIDs), temporal, spatial, and metadata fields, are adapted from WMO-CHE to ensure consistent recording of hazardous events, whether or not they ultimately result in a disaster.</li>
                                            <li>When a hazardous event is recorded in DELTA Resilience (e.g., a tropical cyclone, flood, drought, or compound event), it is registered using the relevant WMO-CHE variables (data fields and metadata). Linkage parameters (e.g., the UUID assigned to a higher-level phenomenon) are applied to establish cascading event relationships and to attribute impacts to specific hazards and sub-hazards.</li>
                                            <li>This alignment ensures that hazardous event records remain consistent with WMO-agreed definitions, enabling comparability across countries and interoperability with meteorological and hydrological datasets.</li>
                                        </ul>
                                        <p><strong>Integration with Disaster–Impact Linkages</strong></p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>DELTA Resilience goes beyond cataloguing hazardous events by linking them to associated damages, losses, and disruptions, enabling a comprehensive analysis of disaster impacts.</li>
                                            <li>The WMO-CHE classification provides the standardised "trigger event," which is captured in the DELTA Resilience hazardous event module as the initiating factor of observed "effects" on people, infrastructure, ecosystems, and economies.</li>
                                            <li>This strengthens the scientific and operational value of WMO-CHE by connecting hazardous event records, traditionally stored in highly technical NMHS databases, with multi-sectoral disaster data, thereby broadening their applicability and use.</li>
                                        </ul>
                                        <p><strong>Cascading and Compound Events</strong></p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>DELTA Resilience mirrors the WMO-CHE methodology for cascading hazardous events, where each "child" event (e.g., a landslide triggered by heavy rainfall, or flooding caused by a tropical cyclone) is explicitly linked back to its "mother" or higher-level triggering phenomenon.</li>
                                            <li>These relationships are captured in the DELTA Resilience data model using machine-readable UUIDs, ensuring that both triggering and cascading events can be tracked as part of the same hazard sequence.</li>
                                            <li>The same approach is applied when linking disaster events to their originating hazardous events, reinforcing consistency and traceability across all records.</li>
                                            <li>This design enables DELTA RESILIENCE to reflect the multi-hazard and cascading nature of risk, while supporting countries in understanding complex hazard, impact chains.</li>
                                        </ul>
                                        <p><strong>Interoperability and Unique Identifiers</strong></p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Hazardous events catalogued in DELTA Resilience are assigned UUIDs compatible with WMO-CHE standards. This allows DELTA Resilience to capture cross-border phenomena catalogued by regional WMO centers, while also accommodating national, regional, local, or sector-specific identifiers such as GLIDE (used by humanitarian partners) or the EU JRC Risk Data Hub.</li>
                                            <li>This interoperability facilitates data exchange and cross-referencing between national DELTA Resilience instances, WMO regional systems, and global disaster loss databases.</li>
                                        </ul>
                                        <p><strong>Use in Reporting and Analysis</strong></p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>Through WMO-CHE integration, DELTA Resilience supports more robust risk analysis, early warning validation, and reporting for frameworks such as the Sendai Framework for Disaster Risk Reduction and the Paris Agreement.</li>
                                            <li>Countries can aggregate data by WMO-CHE hazard classes to analyse trends, compare across hazard types, and calibrate risk models.</li>
                                        </ul>
                                        <p><strong>Future Development</strong></p>
                                        <ul className="list-disc space-y-2 pl-6">
                                            <li>The DELTA Resilience roadmap foresees continued collaboration with WMO to refine event parameterisation, ensuring interoperability with evolving WMO-CHE standards (e.g., compound, cascading, and multi-hazard contexts).</li>
                                            <li>At the national level, collaborations such as those with Indonesian authorities, BNPB (disaster risk management) and BMKG (hydrometeorological and geological hazard monitoring), are developing protocols and governance mechanisms to authoritatively match hazardous events with disaster impacts. This strengthens institutional collaboration and enhances joint efforts to better understand how specific hazardous events affect housing, infrastructure, vulnerable populations, crops, livestock, ecosystems, and other at-risk elements.</li>
                                            <li>Understanding the spatial and temporal relationships between hazardous events and their impacts reveals patterns of vulnerability and susceptibility. These insights are critical for vulnerability and risk modelling and provide practical value for designing anticipatory action and strengthening capacities for impact-based forecasting.</li>
                                        </ul>
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    </section>
                </div>
                <div className="mt-10 rounded-xl bg-slate-50 px-6 py-5 ring-1 ring-slate-200/70">
                    <h3 className="mb-2 text-base font-semibold text-slate-900">In short</h3>
                    <p className="text-[15px] leading-7 text-slate-700">
                        DELTA Resilience operationalises the WMO-CHE cataloguing standards and methodologies by embedding them in its event data model and linking them to disaster impact records. By explicitly modelling cascading hazard chains and ensuring unique identifiers across events and impacts, DELTA Resilience makes hazard cataloguing directly actionable for policy, risk analysis, and international reporting.
                    </p>
                </div>
            </div>
        </MainContainer>
    );
}
