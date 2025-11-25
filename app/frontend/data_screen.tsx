import { Pagination } from "~/frontend/pagination/view";
import { MainContainer } from "./container";
import { ListLegend } from "~/components/ListLegend";

interface DataScreenProps<T> {
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
	const pagination = Pagination(props.paginationData);
	return (
		<MainContainer title={props.plural}>
			<>
				<div className="dts-page-intro">
					<h2>{props.totalItems} {props.listName} in {props.instanceName}</h2>
				</div>
				{props.headerElement}
				{!props.hideMainLinks &&
					<DataMainLinks
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
								<ListLegend />
							)}
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
	return (
		<div
			className="dts-page-intro"
			aria-label="Main container"
		>
			<div
				className="dts-additional-actions width-override-data-collection"
				role="navigation"
				aria-label="Main links"
			>
				{!props.noCreate &&
					<a
						href={
							props.baseRoute +
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
								href={`${props.baseRoute}/csv-export${urlParams}`}
								className="mg-button mg-button--small mg-button-outline"
								role="button"
								aria-label="Export CSV"
							>
								CSV Export
							</a>
						}
						{!props.noImport &&

							<a
								href={`${props.baseRoute}/csv-import${urlParams}`}
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
							href={`${props.baseRoute}/${b.relPath}${urlParams}`}
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
