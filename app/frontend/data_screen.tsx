import { Pagination } from "~/frontend/pagination/view";
import { MainContainer } from "./container";
import { ViewContext } from "./context";
import { ListLegend } from "~/components/ListLegend";

interface DataScreenProps<T> {
	ctx: ViewContext;
	plural: string;
	isPublic?: boolean;
	resourceName: string;
	baseRoute: string;
	searchParams?: URLSearchParams;
	columns: string[];
	items: T[];
	paginationData: any;
	listName: string
	instanceName: string;
	totalItems: number;
	renderRow: (item: T, baseRoute: string) => React.ReactNode;
	csvExportLinks?: boolean;
	headerElement?: React.ReactNode;
	beforeListElement?: React.ReactNode;
	hideMainLinks?: boolean;

	countHeader?: string;
	addNewLabel?: string;

	hideLegends?: boolean;
	MainContainer__headerExtra?: React.ReactNode;
}

export function DataScreen<T>(props: DataScreenProps<T>) {
	const ctx = props.ctx;
	const pagination = Pagination({
		ctx,
		...props.paginationData
	});
	return (
		<MainContainer title={props.plural} headerExtra={props.MainContainer__headerExtra}>
			<>
				{props.countHeader && (
					<div className="dts-page-intro">
						<h2>
							{props.countHeader
								? props.countHeader
								: `${props.totalItems} ${props.listName} in ${props.instanceName}`}
						</h2>
					</div>
				)}

				{props.headerElement}
				{!props.hideMainLinks &&
					<DataMainLinks
						ctx={props.ctx}
						searchParams={props.searchParams}
						isPublic={props.isPublic}
						baseRoute={props.baseRoute}
						resourceName={props.resourceName}
						csvExportLinks={props.csvExportLinks}
						addNewLabel={props.addNewLabel}
					/>
				}
				{props.beforeListElement}
				{props.paginationData.totalItems ? (
					<>
						<section className="dts-page-section">
							{!props.isPublic && (<>
								{!props.hideLegends && <ListLegend ctx={props.ctx} /> }
							</>)}
							<table className="dts-table width-override-data-collection">
								<thead>
									<tr>
										{props.columns.map((col, index) => (
											<th key={index}
												className={col === 'Actions' ? "dts-table__cell-centered" : undefined}
											>{col}</th>
										))}
									</tr>
								</thead>
								<tbody>
									{props.items.map((item) =>
										props.renderRow(item, props.baseRoute)
									)}
								</tbody>
							</table>
							{pagination}
						</section>
					</>
				) : (
					`No data found`
				)}
			</>
		</MainContainer>
	);
}

interface DataMainLinksProps {
	ctx: ViewContext;

	noCreate?: boolean;
	noExport?: boolean;
	noImport?: boolean;

	relLinkToNew?: string;
	isPublic?: boolean;
	baseRoute: string;
	resourceName: string;
	csvExportLinks?: boolean;
	searchParams?: URLSearchParams;

	extraButtons?: { relPath: string, label: string }[]

	addNewLabel?: string;
}

export function DataMainLinks(props: DataMainLinksProps) {
	if (props.isPublic) return null;
	let urlParams = props.searchParams ? "?" + props.searchParams.toString() : "";
	let ctx = props.ctx
	return (
		<div
			className="dts-page-intro"
		>
			<div
				className="dts-additional-actions width-override-data-collection"
				role="navigation"
				aria-label={ctx.t({
					"code": "record.resource_actions",
					"desc": "Label for the group of actions (Add new, Export, Import, etc.) on list pages",
					"msg": "Resource actions"
				})}
			>
				{!props.noCreate &&
					<a
						href={
							ctx.url(props.baseRoute) +
							(props.relLinkToNew
								? props.relLinkToNew + urlParams
								: "/edit/new" + urlParams)
						}
						className="mg-button mg-button--small mg-button-primary"
						role="button"
					>
						{props.addNewLabel ? props.addNewLabel : `Add new ${props.resourceName}`}
					</a>
				}
				{props.csvExportLinks && (
					<>
						{!props.noExport &&

							<a
								href={
									ctx.url(`${props.baseRoute}/csv-export${urlParams}`)
								}
								className="mg-button mg-button--small mg-button-outline"
								role="button"
								aria-label="Export CSV"
							>
								CSV Export
							</a>
						}
						{!props.noImport &&

							<a
								href={
									ctx.url(`${props.baseRoute}/csv-import${urlParams}`)
								}
								className="mg-button mg-button--small mg-button-secondary"
								role="button"
								aria-label="Import CSV"
							>
								CSV Import
							</a>
						}
					</>
				)}
				{props.extraButtons &&
					props.extraButtons.map(b =>
						<a
							href={
								ctx.url(`${props.baseRoute}/${b.relPath}${urlParams}`)
							}
							className="mg-button mg-button--small mg-button-secondary"
							role="button"
							aria-label={b.label}
							key={b.relPath}
						>
							{b.label}
						</a>
					)
				}
			</div>
		</div>
	);
}
