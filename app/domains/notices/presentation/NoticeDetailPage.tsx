import type { NoticeDto } from "~/domains/notices/application/dto/NoticeDto";
import type { PageProps } from "~/frontend/page-props";
import type { LocaleMap } from "~/domains/notices/domain/Notice";
import { useViewContext } from "~/frontend/context";
import { formatDateDisplay } from "~/utils/date";

// $lang-segment lookup, not the Phase 5c Accept-Language resolveLocale() (design.md Decision 7).
function resolveLocale(map: LocaleMap | null, lang: string): string {
	if (!map) return "";
	return map[lang] ?? map["en"] ?? "";
}

export function NoticeDetailPage({ data }: PageProps<NoticeDto>) {
	const ctx = useViewContext();
	const title = resolveLocale(data.titleJson, ctx.lang);
	const body = resolveLocale(data.bodyJson, ctx.lang);

	return (
		<div>
			<h1 className="dts-heading-2">{title}</h1>
			<p>
				{data.isPublished
					? ctx.t({ code: "notices.status_published", msg: "Published" })
					: ctx.t({ code: "notices.status_draft", msg: "Draft" })}
				{data.publishedAt ? ` — ${formatDateDisplay(data.publishedAt)}` : ""}
			</p>
			<div>{body}</div>
		</div>
	);
}
