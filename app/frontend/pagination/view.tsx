import { useNavigate } from "@remix-run/react";
import React from "react";
import { ViewContext } from "~/frontend/context";
import { LangLink } from "~/util/link";

interface PaginationProps {
	ctx: ViewContext;
	itemsOnThisPage: number;
	totalItems: number;
	page: number;
	pageSize: number;
	extraParams: Record<string, string[]>;
	onPageSizeChange?: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

export function Pagination(props: PaginationProps) {
	let {
		ctx,
		totalItems,
		page,
		pageSize,
		extraParams,
		onPageSizeChange,
	} = props;
	if (!ctx){
		throw new Error("Missing ViewContext")
	}

	const isPageSizeValid = PAGE_SIZE_OPTIONS.includes(pageSize);

	if (!isPageSizeValid) {
		pageSize = 10;
	}

	const navigate = useNavigate();
	const totalPages = Math.ceil(totalItems / pageSize);
	const buildQueryString = (newPage: number, newPageSize?: number) => {
		const params = new URLSearchParams({
			page: newPage.toString(),
			...(newPageSize ? { pageSize: newPageSize.toString() } : { pageSize: pageSize.toString() }),
		});
		for (const key in extraParams) {
			extraParams[key].forEach((value) => {
				params.append(key, value);
			});
		}
		return `?${params.toString()}`;
	};

	const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const newSize = Number(e.target.value);
		// Use Remix SPA navigation for better UX
		navigate(buildQueryString(1, newSize));
		if (onPageSizeChange) {
			onPageSizeChange(newSize);
		}
	};

	// Helper to generate page numbers (simple version: show all pages)
	const getPaginationWindow = () => {
		const delta = 2;
		const range: (number | string)[] = [];
		const left = Math.max(2, page - delta);
		const right = Math.min(totalPages - 1, page + delta);

		range.push(1);
		if (left > 2) range.push("...");

		for (let i = left; i <= right; i++) {
			range.push(i);
		}

		if (right < totalPages - 1) range.push("...");
		if (totalPages > 1) range.push(totalPages);

		return range;
	};

	const pageNumbers = getPaginationWindow();


	return (
		<nav className="dts-pagination" role="navigation" aria-label={ctx.t({
			"code": "pagination.label",
			"desc": "Aria label for pagination section",
			"msg": "Pagination"
		})}>
			<ul>
				{/* Only show previous button if not on first page */}
				{page > 1 && (
					<li>
						<LangLink
							lang={ctx.lang}
							className="mg-button mg-button--small mg-button-ghost"
							to={buildQueryString(page - 1)}
							aria-label={ctx.t({
								"code": "pagination.previous_page",
								"desc": "Aria label for previous page link in pagination",
								"msg": "Previous page"
							})}
						>
							<img src="/assets/icons/chevron-left-white.svg" alt="Previous" width={20} height={20} />
						</LangLink>
					</li>
				)}
				{pageNumbers.map((num, idx) => (
					<li key={idx}>
						{num === "..." ? (
							<span className="mg-button mg-button--small mg-button-ghost"
								aria-hidden="true"
								tabIndex={-1}
							>...</span>
						) : num === page ? (
							<span
								className="mg-button mg-button--small mg-button-ghost"
								aria-label={ctx.t({
									"code": "pagination.current_page",
									"desc": "Announcement of current page in pagination, {page_number} will be replaced with the actual page number",
									"msg": "Current page, page {page_number}"
								}, {
									"page_number": num
								})}
								aria-current="true"
							>
								{num}
							</span>
						) : (
							<LangLink
								lang={ctx.lang}
								className="mg-button mg-button--small mg-button-ghost"
								to={buildQueryString(num as number)}
								aria-label={ctx.t({
									"code": "pagination.go_to_page",
									"desc": "Aria label for link to a specific page, {page_number} will be replaced with the actual page number",
									"msg": "Page {page_number}"
								}, {
									"page_number": num
								})}
							>
								{num}
							</LangLink>
						)}
					</li>
				))}

				{/* Only show next button if not on last page */}
				{page < totalPages && (
					<li>
						<LangLink
							lang={ctx.lang}
							className="mg-button mg-button--small mg-button-ghost"
							to={buildQueryString(page + 1)}
							aria-label={ctx.t({
								"code": "pagination.next_page",
								"desc": "Aria label for next page link in pagination",
								"msg": "Next page"
							})}
						>
							<img src="/assets/icons/chevron-right-white.svg" alt="Next" width={20} height={20} />
						</LangLink>
					</li>
				)}
			</ul>
			<div className="dts-form-component">
				<select value={pageSize} onChange={handlePageSizeChange} aria-label="Items per page"
					id="dts-pagination-page-size"
				>
					{PAGE_SIZE_OPTIONS.map((size) => (
						<option key={size} value={size}>
							{ctx.t({
								"code": "pagination.items_per_page",
								"desc": "Label for number of items per page in pagination dropdown. {count} will be replaced with the number.",
								"msg": "{count} / page"
							}, {
								"count": size
							})}
						</option>
					))}
				</select>
			</div>
		</nav>
	);
}
