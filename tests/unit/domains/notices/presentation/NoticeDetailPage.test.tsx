import { describe, it, expect, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { TranslationGetter } from "~/utils/translator";
import type { NoticeDto } from "~/domains/notices/application/dto/NoticeDto";

const stubTranslationGetter: TranslationGetter = (params) => ({
	msg: params.msg ?? params.code,
});
vi.stubGlobal(
	"createTranslationGetter",
	(_lang: string) => stubTranslationGetter,
);

let currentLang = "en";
vi.mock("react-router", () => ({
	useRouteLoaderData: vi.fn(() => ({
		common: { lang: currentLang, user: null },
	})),
}));

import { NoticeDetailPage } from "~/domains/notices/presentation/NoticeDetailPage";

function makeNotice(titleJson: Record<string, string>): NoticeDto {
	return {
		id: "notice-1",
		tenantId: "tenant-1",
		titleJson,
		bodyJson: null,
		isPublished: true,
		publishedAt: "2026-01-01T00:00:00.000Z",
		audience: "all",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
	};
}

describe("NoticeDetailPage", () => {
	it("renders the title for the current language when the key is present", () => {
		currentLang = "fr";
		const html = renderToString(
			<NoticeDetailPage data={makeNotice({ en: "Title", fr: "Titre" })} />,
		);

		expect(html).toContain("Titre");
	});

	it("falls back to the en key when the current language key is absent", () => {
		currentLang = "ar";
		const html = renderToString(
			<NoticeDetailPage data={makeNotice({ en: "Title" })} />,
		);

		expect(html).toContain("Title");
	});

	it("renders an empty title string when neither the current language nor en is present", () => {
		currentLang = "ar";
		const html = renderToString(
			<NoticeDetailPage data={makeNotice({ fr: "Titre" })} />,
		);

		expect(html).not.toContain("Titre");
		expect(html).toContain('<h1 class="dts-heading-2"></h1>');
	});
});
