import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToString } from "react-dom/server";
import { TranslationGetter } from "~/utils/translator";

// Stub globalThis.createTranslationGetter before any module that calls it is
// imported.  The stub returns a TranslationGetter that echoes the msg param
// back so ctx.t(...) produces human-readable output in assertions.
const stubTranslationGetter: TranslationGetter = (params) => ({
	msg: params.msg ?? params.code,
});

vi.stubGlobal(
	"createTranslationGetter",
	(_lang: string) => stubTranslationGetter,
);

// Mock react-router:
//   - useRouteLoaderData returns minimal valid root data so ViewContext
//     initialises without throwing
//   - useLoaderData is a spy that throws — confirming the component never
//     calls it after the refactor
//   - useNavigate, Link, Form are stubbed so child components that import
//     them don't crash during renderToString
vi.mock("react-router", () => ({
	useRouteLoaderData: vi.fn(() => ({
		common: { lang: "en", user: null },
	})),
	useLoaderData: vi.fn(() => {
		throw new Error(
			"useLoaderData was called inside HazardousEventListPage — " +
				"the component MUST NOT call useLoaderData() after the refactor",
		);
	}),
	useNavigate: vi.fn(() => vi.fn()),
	Link: ({ children, ...props }: { children: React.ReactNode; to: string }) =>
		`<a href="${props.to}">${children}</a>`,
	Form: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		method?: string;
	}) => `<form method="${props.method ?? "get"}">${children}</form>`,
}));

import type { HazardousEventListLoaderData } from "~/frontend/events/hazardeventlist";
import { HazardousEventListPage } from "~/frontend/events/hazardeventlist";

// ── Shared stub data ────────────────────────────────────────────────────────

const ITEM_ID = "aaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

/** Minimal stub that satisfies HazardousEventListLoaderData for one item. */
const stubDataOneItem: HazardousEventListLoaderData = {
	isPublic: false,
	countryAccountsId: "test-country",
	filters: {
		hipHazardId: "",
		hipClusterId: "",
		hipTypeId: "",
		search: "",
		fromDate: "",
		toDate: "",
		recordingOrganization: "",
		hazardousEventStatus: "",
		recordStatus: "",
		viewMyRecords: false,
		pendingMyAction: false,
		approvalStatus: "published",
		userId: "user-1",
	},
	hip: {
		hazards: [],
		clusters: [],
		types: [],
	},
	organizations: [],
	data: {
		items: [
			{
				id: ITEM_ID,
				hipHazardId: "haz-1",
				hipClusterId: null,
				hipTypeId: "",
				startDate: "2024-01-01",
				endDate: "2024-01-02",
				description: "Test hazardous event",
				approvalStatus: "published",
				createdAt: new Date("2024-01-01T00:00:00Z"),
				updatedAt: new Date("2024-01-02T00:00:00Z"),
				hipHazard: { name: "Flood" },
				hipCluster: null,
				hipType: null,
			},
		],
		pagination: {
			totalItems: 1,
			itemsOnThisPage: 1,
			page: 1,
			pageSize: 10,
			extraParams: {},
		},
	},
};

/** Stub with no items for the empty-state test. */
const stubDataEmpty: HazardousEventListLoaderData = {
	...stubDataOneItem,
	data: {
		items: [],
		pagination: {
			totalItems: 0,
			itemsOnThisPage: 0,
			page: 1,
			pageSize: 10,
			extraParams: {},
		},
	},
};

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
	vi.clearAllMocks();
});

describe("HazardousEventListPage", () => {
	describe("Scenario: component renders item rows from injected data", () => {
		it("renders list-table testid and item data when items are present", () => {
			const html = renderToString(
				<HazardousEventListPage
					data={stubDataOneItem}
					isPublic={false}
					basePath="/hazardous-event"
				/>,
			);

			expect(html).toContain('data-testid="list-table"');
			// First 5 chars of the UUID must appear as the link text
			expect(html).toContain(ITEM_ID.slice(0, 5));
			// Hazard name from hipHazard.name
			expect(html).toContain("Flood");
		});
	});

	describe("Scenario: empty-state when no items", () => {
		it("renders 'No records found' and omits list-table when items array is empty", () => {
			const html = renderToString(
				<HazardousEventListPage
					data={stubDataEmpty}
					isPublic={false}
					basePath="/hazardous-event"
				/>,
			);

			expect(html).toContain("No records found");
			expect(html).not.toContain('data-testid="list-table"');
		});
	});

	describe("Scenario: public mode hides Record status column", () => {
		it("omits 'Record status' header when isPublic is true", () => {
			const html = renderToString(
				<HazardousEventListPage
					data={stubDataOneItem}
					isPublic={true}
					basePath="/hazardous-event"
				/>,
			);

			expect(html).not.toContain("Record status");
		});
	});

	describe("Scenario: no useLoaderData call during render", () => {
		it("renders without calling useLoaderData", () => {
			// The useLoaderData mock throws if called — renderToString completing
			// without throwing is the assertion.
			expect(() =>
				renderToString(
					<HazardousEventListPage
						data={stubDataOneItem}
						isPublic={false}
						basePath="/hazardous-event"
					/>,
				),
			).not.toThrow();
		});
	});
});
