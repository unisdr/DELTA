import { Pagination } from "~/frontend/pagination/view";
import { MainContainer } from "./container";
import { ViewContext } from "./context";
import { ListLegend } from "~/components/ListLegend";
import { Button } from 'primereact/button';
import { canAddNewRecord } from "~/frontend/user/roles";

interface DataScreenProps<T> {
	ctx: ViewContext;
	title: string;
	isPublic?: boolean;
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
		<MainContainer title={props.title} headerExtra={props.MainContainer__headerExtra}>
			<>
				{props.countHeader && (
					<div className="dts-page-intro">
						<h2>{props.countHeader}</h2>
					</div>
				)}
				{props.headerElement}
				{!props.hideMainLinks &&
					<DataMainLinks
						ctx={props.ctx}
						searchParams={props.searchParams}
						isPublic={props.isPublic}
						baseRoute={props.baseRoute}
						csvExportLinks={props.csvExportLinks}
						addNewLabel={props.addNewLabel}
					/>
				}
				{props.beforeListElement}
				{props.paginationData.totalItems ? (
					<>
						<section className="dts-page-section">
							{!props.isPublic && (<>
								{!props.hideLegends && <ListLegend ctx={props.ctx} />}
							</>)}
							<table data-testid="list-table" className="dts-table width-override-data-collection">
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
					ctx.t({ "code": "common.no_data_found", "msg": "No data found" })
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
	csvExportLinks?: boolean;
	searchParams?: URLSearchParams;

	extraButtons?: { relPath: string, label: string }[]

	addNewLabel?: string;
}

export function DataMainLinks(props: DataMainLinksProps) {
	if (props.isPublic) return null;
	let urlParams = props.searchParams ? "?" + props.searchParams.toString() : "";
	let ctx = props.ctx;


	

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
				{!props.noCreate && <>
					<Button 
						id="add_new_event_link"
						className="mg-button mg-button--small mg-button-primary"
						label={props.addNewLabel ?? props.ctx.t({
							"code": "common.add",
							"msg": "Add"
						})} 
						visible={canAddNewRecord(ctx.user?.role ?? null)}
						onClick={
							() => {
								document.location.href = ctx.url(props.baseRoute) +
									(props.relLinkToNew
										? props.relLinkToNew + urlParams
										: "/edit/new" + urlParams);
						}}
					></Button>
				</>}
				{props.csvExportLinks && (
					<>
						{!props.noExport &&

							<a
								href={
									ctx.url(`${props.baseRoute}/csv-export${urlParams}`)
								}
								className="mg-button mg-button--small mg-button-outline"
								role="button"
								aria-label={ctx.t({ "code": "common.csv_export", "msg": "CSV export" })}
							>
								{ctx.t({ "code": "common.csv_export", "msg": "CSV export" })}
							</a>
						}
						{!props.noImport &&

							<a
								href={
									ctx.url(`${props.baseRoute}/csv-import${urlParams}`)
								}
								className="mg-button mg-button--small mg-button-secondary"
								role="button"
								aria-label={ctx.t({ "code": "common.export_csv", "msg": "CSV Import" })}
							>
								{ctx.t({ "code": "common.export_csv", "msg": "CSV Import" })}
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
