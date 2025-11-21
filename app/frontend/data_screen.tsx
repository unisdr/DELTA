import { Pagination } from "~/frontend/pagination/view";
import { MainContainer } from "./container";
import { ViewContext } from "./context";

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
	hideMainLinks?: boolean,
}

export function DataScreen<T>(props: DataScreenProps<T>) {
	const ctx = props.ctx;
	const pagination = Pagination({
		ctx,
		...props.paginationData
	});
	return (
		<MainContainer title={props.plural}>
			<>
				<div className="dts-page-intro">
					<h2>{props.totalItems} {props.listName} in {props.instanceName}</h2>
				</div>
				{props.headerElement}
				{!props.hideMainLinks &&
					<DataMainLinks
						ctx={props.ctx}
						searchParams={props.searchParams}
						isPublic={props.isPublic}
						baseRoute={props.baseRoute}
						resourceName={props.resourceName}
						csvExportLinks={props.csvExportLinks}
					/>
				}
				{props.beforeListElement}
				{props.paginationData.totalItems ? (
					<>
						<section className="dts-page-section">
							{!props.isPublic && (
								<div className="dts-legend">
									<span className="dts-body-label">Record status</span>
									<div className="dts-legend__item">
										<span
											className="dts-status dts-status--draft"
											aria-labelledby="legend1"
										></span>
										<span id="legend1">Draft</span>
									</div>
									<div className="dts-legend__item">
										<span
											className="dts-status dts-status--waiting-for-validation"
											aria-labelledby="legend2"
										></span>
										<span id="legend2">Waiting for validation</span>
									</div>
									<div className="dts-legend__item">
										<span
											className="dts-status dts-status--needs-revision"
											aria-labelledby="legend3"
										></span>
										<span id="legend3">Needs revision</span>
									</div>
									<div className="dts-legend__item">
										<span
											className="dts-status dts-status--validated"
											aria-labelledby="legend4"
										></span>
										<span id="legend4">Validated</span>
									</div>
									<div className="dts-legend__item">
										<span
											className="dts-status dts-status--published"
											aria-labelledby="legend5"
										></span>
										<span id="legend5">Published</span>
									</div>
								</div>
							)}
							<table className="dts-table">
								<thead>
									<tr>
										{props.columns.map((col, index) => (
											<th key={index}>{col}</th>
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
}

export function DataMainLinks(props: DataMainLinksProps) {
	if (props.isPublic) return null;
	let urlParams = props.searchParams ? "?" + props.searchParams.toString() : "";
	let ctx = props.ctx
	return (
		<div
			className="dts-page-intro"
			aria-label="Main container"
		>
			<div
				className="dts-additional-actions"
				role="navigation"
				aria-label="Main links"
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
						aria-label={`Create new ${props.resourceName}`}
					>
						Add new {props.resourceName}
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
