import { MainContainer } from "~/frontend/container";
import { Accordion, AccordionTab } from "primereact/accordion";

type Section = {
    title: string;
    paragraphs: string[];
    bullets?: string[];
};

const sections: Section[] = [
    {
        title: "Is DELTA Resilience a response operational information system?",
        paragraphs: [
            "At its core, DELTA Resilience (Disaster & Hazardous Events, Losses and Damages Tracking & Analysis) is intended to support the tracking of hazardous events observed and monitored by relevant national agencies, such as hydrometeorological services, geological surveys, etc., and to document the effects these events have on exposed and vulnerable elements, such as housing and productive assets. It also enables analysis of the disruptions and impacts on affected people, systems, ecosystems, livelihoods, and more.",
            "DELTA Resilience is not designed to function as an operational emergency response tool, such as those used to handle emergency calls and dispatch resources (e.g., systems like 112 in Europe, a centralized emergency number with a geolocated emergency response dispatch system).",
            "While it is technically possible for country administrators to customize DELTA RESILIENCE to include an emergency response module, operational response systems typically require real-time, dynamic information on available response capacities (e.g., firefighters on duty and the specific equipment at their disposal; hospitals with specialized services and current capacity). These systems are also usually integrated with emergency call centres that geolocate incoming calls, classify the type of emergency (e.g., medical, fire-related, marine rescue), and determine the appropriate resources to deploy, often in real time, while connecting directly with emergency responders to dispatch them efficiently.",
            "DELTA, by contrast, is designed as a toolkit for tracking and understanding disaster and climate change impacts, to support more effective risk prevention, reduction, management and resilient recovery.",
        ],
        bullets: [
            "Risk analysis (e.g., calibrating risk models and identifying patterns of vulnerability)",
            "Disaster risk reduction financing (e.g., assessing the cost of disasters and informing suitable financing mechanisms)",
            "Risk-informed planning (e.g., resilient infrastructure planning; or DRR in agriculture)",
            "Early warning and early action (e.g., setting triggers for warnings and anticipatory action)",
            "Recovery planning (e.g., supporting post-disaster assessments and identifying recovery needs)",
            "Reporting (e.g., on international frameworks such as the Sendai Framework or the Global Goal on Adaptation)",
        ],
    },
    {
        title: "Is DELTA a UN reporting portal?",
        paragraphs: [
            "The Disaster Tracking System (DELTA Resilience) has been developed by UNDRR in collaboration with the World Meteorological Organization (WMO) and the United Nations Development Programme (UNDP) as a toolkit, including open-source software, for countries to establish and manage their own nationally owned disaster tracking systems.",
            "While DELTA Resilience is not designed to be a UN reporting portal, it is for national use and national applications as its primary purpose. However, there is an added benefit as it can be used to collect or process country data for specific international reporting obligations.",
            "One of the possible use cases supported by DELTA Resilience is facilitating reporting on international commitments, such as the Sendai Framework for Disaster Risk Reduction feeding into the official reporting tool for the Sendai Framework: the Sendai Framework Monitoring (SFM) portal, managed by UNDRR.",
            "DELTA Resilience may support future reporting needs, such as indicators under the Global Goal on Adaptation, and assist with data to inform reports produced under the United Nations Framework Convention on Climate Change (UNFCCC) and the Paris Agreement, including but not limited to national communications, biennial transparency reports (BTRs) and adaptation communications.",
        ],
    },
    {
        title: "Can DELTA Resilience help countries with reporting on the Sendai Framework Monitor?",
        paragraphs: [
            "As outlined in related questions, countries can export data from their national DELTA Resilience country instance to the SFM portal to streamline reporting. However, the two systems are distinct, with different purposes and governance structures.",
            "DELTA is a nationally owned and administered system for domestic data management and analysis, whereas the SFM is a UNDRR-managed platform designed to collect and consolidate country data on progress in implementing the Sendai Framework, based on globally agreed indicators and methodologies.",
        ],
    },
    {
        title: "Is the DELTA Resilience an accounting system?",
        paragraphs: [
            "The legacy system, DesInventar, was often referred to as a disaster accounting system because one of its main purposes was to account for the impacts of disasters.",
            "DELTA Resilience (Disaster & Hazardous Events, Losses and Damages Tracking & Analysis) is positioned as a tracking tool, emphasizing its ability not only to monitor the effects of disasters but also to track hazardous events that may trigger those impacts. While the core purpose of DELTA Resilience remains to support countries in accounting for disaster impacts, it introduces a new dimension of tracking to support emerging use cases, particularly in the areas of early warning and early action.",
            "To enable the tracking of hazardous events and the losses and damages they generate, the first release of the DELTA Resilience software allows countries to record damage or disruption in physical units (e.g., kilometres of roads destroyed or partially damaged; hours and users affected by a power outage). It also includes basic computation tools that allow users to multiply the number of units by average repair or replacement costs.",
            "In future versions, as more advanced analytical modules are introduced, DELTA Resilience will support the economic valuation of damages using various pricing units and methodologies. It will also allow for the estimation of losses, defined as changes in economic flows resulting from disasters, based on different recovery scenarios, strategies, baselines, and projections.",
        ],
    },
    {
        title: "How will DELTA differ from DesInventar?",
        paragraphs: [
            "The DELTA Resilience data model includes the recording of hazardous event parameters alongside the effects (damages and losses) triggered by the event. This ability to link hazardous events with disaster event information is one of the key innovations of the DELTA Resilience data model.",
            "The disaster event section, beyond serving as a wrapper for all records, is associated with a distinct disaster event, to which a system-generated universal unique identifier can be assigned. This identifier is compatible with other systems, such as GLIDE or national disaster ID systems.",
            "Disaster event records can be linked to other disaster events within the system, enabling the recording of cascading disaster chains such as Natech (natural-technological hazards).",
            "The DELTA system expands the core set of variables and disaggregation options for disaster event records, including new variables related to displacement and compound disaggregation across multiple dimensions.",
            "For other types of losses and damages, DELTA adopts a sector-based grouping of variables aligned with post-disaster needs assessments: social, infrastructure, productive, and cross-cutting.",
        ],
    },
    {
        title: "What are the elements that remain the same from the DesInventar methodology?",
        paragraphs: [
            "One important element that remains the same is the absence of thresholds for the registration of disaster events. Any event, no matter how localized or sector-specific, can be recorded, regardless of its size or nature.",
            "Another continuing element is the understanding that disaster events are triggered by hazardous events, which interact with specific conditions of exposure, vulnerability, and capacity. In this sense, disasters are not natural and should not be understood as solely caused by hazardous events.",
            "For a disaster event to be recorded, it must have spatial and temporal manifestations of human, material, economic, and/or environmental losses and impacts. Partially complete date elements may be used for recording.",
            "Within DELTA Resilience, the treatment of start and end dates has evolved to support the registration of slow-onset events, such as those associated with climate change processes (e.g., sea level rise or ocean acidification), where it is not possible to determine a precise beginning or end date.",
        ],
    },
    {
        title: "What data workflows does the DELTA Resilience methodology support?",
        paragraphs: [
            "In the system, you can link records of hazardous events to disaster events, which serve as containers for disaster records. Linkages can be created using the system's linking parameters and unique identifiers, and can be established, revisited, and confirmed at any time, following a nationally approved workflow.",
            "To ensure effective data governance and application, roles for collecting and validating specific data should be clearly and formally assigned to designated institutional actors and documented in national operational procedures.",
            "DELTA Resilience builds on approaches such as DALA, PDNA, DesInventar Sendai, the Sendai Framework Monitor (SFM), and FAO methodology for agriculture.",
        ],
    },
    {
        title: "How interoperable is the DELTA Resilience system with DesInventar?",
        paragraphs: [
            "A migration pathway has been developed to ensure that records from DesInventar-based databases can be transferred to DELTA Resilience country instances through an API-based ETL process.",
            "Fields containing fuzzy data, non-aggregated information, or variables based on DesInventar-specific definitions can be flagged as Old DesInventar variable, preserving historical records while enabling updated standards for new data.",
            "The middleware tool for migrating data from DesInventar to DELTA Resilience is branded as Disaster information exchange (DiX) and extends existing interoperability capabilities.",
        ],
    },
    {
        title: "What is the licensing for DELTA Resilience software?",
        paragraphs: [
            "The DELTA Resilience software is currently distributed under Apache License 2.0.",
            "The Apache License 2.0 is a permissive open-source license, allowing use, modification, and sharing, including commercial use, provided license terms and attribution are respected.",
        ],
    },
    {
        title: "What are the requirements to host a DELTA Resilience country instance?",
        paragraphs: [
            "The FAQ states a modern multi-core server with at least 8 GB RAM and around 50 GB SSD storage is recommended.",
            "Required components include a compatible server OS, PostgreSQL with PostGIS, Node.js, Remix/React application stack, SMTP email relay, domain/subdomain, and SSL certificate.",
        ],
    },
    {
        title: "In which languages is the interface available?",
        paragraphs: [
            "The interface is currently available in English, Arabic, and Russian.",
            "Spanish and Portuguese versions are planned, and future additional language support is expected through Weblate integration.",
        ],
    },
    {
        title: "What are the system capabilities for data visualisation?",
        paragraphs: [
            "In the DELTA Resilience beta version, the system includes three preconfigured dashboards designed to support rapid, template-based data visualisation.",
        ],
        bullets: [
            "Hazard-based dashboard",
            "Sector-based dashboard",
            "Disaster event dashboard",
        ],
    },
    {
        title: "How does DELTA Resilience support quality control?",
        paragraphs: [
            "DELTA Resilience includes built-in features to support data quality control throughout the data lifecycle, including role assignment, validation workflows, audit trails, and status flags.",
            "Some validation mechanisms are embedded directly into system computations. Required fields are marked, and users cannot save a record unless required fields are completed.",
        ],
    },
];

export default function FaqPage() {
    return (
        <MainContainer title="" showHeader={false}>
            <div className="pb-8">
                <div className="mb-8 overflow-hidden rounded-2xl bg-[var(--color-sky-950)] px-6 py-7 shadow-[0_10px_28px_rgba(2,6,23,0.28)] ring-1 ring-sky-800/70 sm:px-8 sm:py-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                        Frequently Asked Questions
                    </p>
                    <h1 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
                        DELTA Resilience (Disaster & Hazardous Events, Losses and Damages Tracking & Analysis)
                    </h1>
                </div>

                <div className="space-y-4">
                    {sections.map((section, index) => (
                        <div key={section.title}>
                            <Accordion
                                className="rounded-xl bg-white shadow-[0_6px_22px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70"
                            >
                                <AccordionTab
                                    header={`Question ${index + 1}: ${section.title}`}
                                >
                                    <div className="space-y-3 px-1 text-[15px] leading-7 text-slate-800">
                                        {section.paragraphs.map((p) => (
                                            <p key={p}>{p}</p>
                                        ))}
                                        {section.bullets ? (
                                            <ul className="list-disc space-y-2 pl-6">
                                                {section.bullets.map((bullet) => (
                                                    <li key={bullet}>{bullet}</li>
                                                ))}
                                            </ul>
                                        ) : null}
                                    </div>
                                </AccordionTab>
                            </Accordion>
                        </div>
                    ))}
                </div>
            </div>
        </MainContainer>
    );
}
