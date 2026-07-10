import { describe, it, expect, vi } from "vitest";
import React from "react";
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

vi.mock("react-router", () => ({
	useRouteLoaderData: vi.fn(() => ({ common: { lang: "en", user: null } })),
	Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
		React.createElement("a", { href: to }, children),
}));

import { NoticeListPage } from "~/domains/notices/presentation/NoticeListPage";

function makeNotice(overrides: Partial<NoticeDto> = {}): NoticeDto {
	return {
		id: crypto.randomUUID(),
		tenantId: "tenant-1",
		titleJson: { en: "Untitled" },
		bodyJson: null,
		isPublished: true,
		publishedAt: "2026-01-01T00:00:00.000Z",
		audience: "all",
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		...overrides,
	};
}

describe("NoticeListPage", () => {
	it("renders one row per notice with the resolved title", () => {
		const notices = [
			makeNotice({ titleJson: { en: "Notice A" } }),
			makeNotice({ titleJson: { en: "Notice B" } }),
			makeNotice({ titleJson: { en: "Notice C" } }),
		];

		const html = renderToString(<NoticeListPage data={notices} />);

		expect(html).toContain("Notice A");
		expect(html).toContain("Notice B");
		expect(html).toContain("Notice C");
	});

	it("renders distinct Published/Draft status labels", () => {
		const notices = [
			makeNotice({ titleJson: { en: "Published notice" }, isPublished: true }),
			makeNotice({ titleJson: { en: "Draft notice" }, isPublished: false }),
		];

		const html = renderToString(<NoticeListPage data={notices} />);

		expect(html).toContain("Published");
		expect(html).toContain("Draft");
	});
});
