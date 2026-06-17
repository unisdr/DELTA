import { describe, expect, it } from "vitest";
import { ValidationError } from "~/shared/errors";
import { Notice, type NoticeProps } from "./Notice";

const baseProps: NoticeProps = {
	id: "notice-1",
	tenantId: "tenant-1",
	titleJson: { en: "My Notice" },
	bodyJson: null,
	isPublished: false,
	audience: "public",
	publishedAt: null,
	createdAt: new Date("2024-01-01T00:00:00Z"),
	updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("Notice.create()", () => {
	describe("Happy paths", () => {
		it("returns a Notice instance when titleJson has one locale, isPublished is false, publishedAt is null", () => {
			const notice = Notice.create(baseProps);

			expect(notice).toBeInstanceOf(Notice);
			expect(notice.titleJson).toEqual({ en: "My Notice" });
			expect(notice.isPublished).toBe(false);
			expect(notice.publishedAt).toBeNull();
		});

		it("returns a Notice instance without throwing when titleJson has multiple locales", () => {
			const props: NoticeProps = {
				...baseProps,
				titleJson: { en: "My Notice", fr: "Mon Avis" },
			};

			expect(() => Notice.create(props)).not.toThrow();
		});

		it("returns a Notice instance without throwing when isPublished is true and publishedAt is set", () => {
			const props: NoticeProps = {
				...baseProps,
				titleJson: { en: "Published" },
				isPublished: true,
				publishedAt: new Date("2024-06-01T00:00:00Z"),
			};

			expect(() => Notice.create(props)).not.toThrow();
		});
	});

	describe("Failure paths", () => {
		it("throws ValidationError when titleJson is an empty object", () => {
			const props: NoticeProps = {
				...baseProps,
				titleJson: {},
			};

			expect(() => Notice.create(props)).toThrow(ValidationError);
		});

		it("throws ValidationError with a message referencing titleJson when titleJson is empty", () => {
			const props: NoticeProps = {
				...baseProps,
				titleJson: {},
			};

			expect(() => Notice.create(props)).toThrow(/titleJson/);
		});

		it("throws ValidationError when titleJson has only whitespace-only locale values", () => {
			const props: NoticeProps = {
				...baseProps,
				titleJson: { en: "   ", fr: "" },
			};

			expect(() => Notice.create(props)).toThrow(ValidationError);
		});

		it("throws ValidationError when publishedAt is non-null but isPublished is false", () => {
			const props: NoticeProps = {
				...baseProps,
				titleJson: { en: "Draft" },
				isPublished: false,
				publishedAt: new Date("2024-06-01T00:00:00Z"),
			};

			expect(() => Notice.create(props)).toThrow(ValidationError);
		});

		it("throws ValidationError with a message referencing publishedAt/isPublished when publishedAt is set on an unpublished notice", () => {
			const props: NoticeProps = {
				...baseProps,
				titleJson: { en: "Draft" },
				isPublished: false,
				publishedAt: new Date("2024-06-01T00:00:00Z"),
			};

			expect(() => Notice.create(props)).toThrow(/publishedAt/);
		});
	});

	describe("No shared mutable state", () => {
		it("two sequential calls with valid props return independent instances (no module-level shared state)", () => {
			const a = Notice.create(baseProps);
			const b = Notice.create(baseProps);

			expect(a).toBeInstanceOf(Notice);
			expect(b).toBeInstanceOf(Notice);
			// Each call returns its own object — not the same reference
			expect(a).not.toBe(b);
			// Both reflect the input props correctly
			expect(a.titleJson).toEqual(baseProps.titleJson);
			expect(b.titleJson).toEqual(baseProps.titleJson);
		});

		it("two sequential calls with invalid props each throw their own independent ValidationError", () => {
			const invalidProps: NoticeProps = {
				...baseProps,
				titleJson: {},
			};

			const call = () => Notice.create(invalidProps);

			// Each call throws independently
			expect(call).toThrow(ValidationError);
			expect(call).toThrow(ValidationError);
		});
	});

	describe("All properties are accessible after construction", () => {
		it("exposes every NoticeProps field via a getter that returns the value passed in props", () => {
			const props: NoticeProps = {
				id: "notice-42",
				tenantId: "tenant-99",
				titleJson: { en: "Title", fr: "Titre" },
				bodyJson: { en: "Body text", fr: "Corps du texte" },
				isPublished: true,
				audience: "private",
				publishedAt: new Date("2024-06-15T12:00:00Z"),
				createdAt: new Date("2024-06-01T00:00:00Z"),
				updatedAt: new Date("2024-06-15T12:00:00Z"),
			};

			const notice = Notice.create(props);

			expect(notice.id).toBe(props.id);
			expect(notice.tenantId).toBe(props.tenantId);
			expect(notice.titleJson).toEqual(props.titleJson);
			expect(notice.bodyJson).toEqual(props.bodyJson);
			expect(notice.isPublished).toBe(props.isPublished);
			expect(notice.audience).toBe(props.audience);
			expect(notice.publishedAt).toEqual(props.publishedAt);
			expect(notice.createdAt).toEqual(props.createdAt);
			expect(notice.updatedAt).toEqual(props.updatedAt);
		});
	});
});
