import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import type { NoticeDto } from "~/domains/notices/application/dto/NoticeDto";
import type { PageProps } from "~/frontend/page-props";
import type { LocaleMap } from "~/domains/notices/domain/Notice";
import { useViewContext } from "~/frontend/context";
import { formatDateDisplay } from "~/utils/date";
import { LangLink } from "~/utils/link";

// $lang-segment lookup, not the Phase 5c Accept-Language resolveLocale() (design.md Decision 7).
function resolveLocale(map: LocaleMap | null, lang: string): string {
	if (!map) return "";
	return map[lang] ?? map["en"] ?? "";
}

export function NoticeListPage({ data }: PageProps<NoticeDto[]>) {
	const ctx = useViewContext();

	return (
		<DataTable
			value={data}
			dataKey="id"
			stripedRows
			size="small"
			className="w-full"
			emptyMessage={ctx.t({ code: "notices.empty", msg: "No notices found." })}
		>
			<Column
				field="titleJson"
				header={ctx.t({ code: "notices.title", msg: "Title" })}
				body={(n: NoticeDto) => resolveLocale(n.titleJson, ctx.lang)}
			/>
			<Column
				field="isPublished"
				header={ctx.t({ code: "notices.status", msg: "Status" })}
				body={(n: NoticeDto) =>
					n.isPublished
						? ctx.t({ code: "notices.status_published", msg: "Published" })
						: ctx.t({ code: "notices.status_draft", msg: "Draft" })
				}
			/>
			<Column
				field="publishedAt"
				header={ctx.t({ code: "notices.published_at", msg: "Published" })}
				body={(n: NoticeDto) =>
					n.publishedAt ? formatDateDisplay(n.publishedAt) : "—"
				}
			/>
			<Column
				field="updatedAt"
				header={ctx.t({ code: "notices.updated_at", msg: "Last updated" })}
				body={(n: NoticeDto) => formatDateDisplay(n.updatedAt)}
			/>
			<Column
				header={ctx.t({ code: "notices.actions", msg: "Actions" })}
				body={(n: NoticeDto) => (
					<LangLink lang={ctx.lang} to={`/notices/${n.id}`}>
						<Button
							type="button"
							icon="pi pi-eye"
							text
							size="small"
							aria-label={ctx.t({ code: "common.view", msg: "View" })}
						/>
					</LangLink>
				)}
			/>
		</DataTable>
	);
}
