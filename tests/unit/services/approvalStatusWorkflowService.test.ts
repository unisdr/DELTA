import { beforeEach, describe, expect, it, vi } from "vitest";
import { processApprovalStatusActionService } from "~/services/approvalStatusWorkflowService";

vi.mock("~/services/validationWorkflowRejectionService", () => ({
	saveValidationWorkflowRejectionCommentService: vi.fn(),
}));

vi.mock("~/backend.server/services/emailValidationWorkflowService", () => ({
	emailValidationWorkflowStatusChangeNotificationService: vi.fn(),
}));

const createMockCtx = () =>
	({
		t: ({ msg }: { msg: string }) => msg,
		fullUrl: (path: string) => `http://localhost${path}`,
	}) as any;

describe("processApprovalStatusActionService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns error for invalid id and does not call update service", async () => {
		const ctx = createMockCtx();
		const formData = new FormData();
		formData.set("action", "submit-validate");
		formData.set("id", "record-2");

		const updateStatusService = vi.fn();
		const result = await processApprovalStatusActionService({
			ctx,
			request: new Request("http://localhost/en/disaster-event/record-1"),
			formData,
			countryAccountsId: "country-1",
			userId: "user-1",
			recordType: "disaster_event"
		});

		expect(result.ok).toBe(false);
		expect(updateStatusService).not.toHaveBeenCalled();
	});

	it("returns error for invalid action and does not call update service", async () => {
		const ctx = createMockCtx();
		const formData = new FormData();
		formData.set("action", "invalid-action");
		formData.set("id", "record-1");

		const updateStatusService = vi.fn();
		const result = await processApprovalStatusActionService({
			ctx,
			request: new Request("http://localhost/en/disaster-event/record-1"),
			formData,
			countryAccountsId: "country-1",
			userId: "user-1",
			recordType: "disaster_event"
		});

		expect(result.ok).toBe(false);
		expect(updateStatusService).not.toHaveBeenCalled();
	});

	it("handles needs-revision by updating status, saving rejection, and sending email", async () => {
		const ctx = createMockCtx();
		const formData = new FormData();
		formData.set("action", "submit-reject");
		formData.set("id", "record-1");
		formData.set("rejection-comments", "Please fix missing fields");

		const updateStatusService = vi.fn().mockResolvedValue({
			ok: true,
			message: "updated",
		});

		const { saveValidationWorkflowRejectionCommentService } = await import(
			"~/services/validationWorkflowRejectionService"
		);
		(saveValidationWorkflowRejectionCommentService as any).mockResolvedValue({
			ok: true,
			message: "saved",
		});

		const { emailValidationWorkflowStatusChangeNotificationService } =
			await import("~/backend.server/services/emailValidationWorkflowService");
		(emailValidationWorkflowStatusChangeNotificationService as any).mockResolvedValue(
			undefined,
		);

		const result = await processApprovalStatusActionService({
			ctx,
			request: new Request("http://localhost/en/disaster-record/record-1"),
			formData,
			countryAccountsId: "country-1",
			userId: "user-1",
			recordType: "disaster_records"
		});

		expect(result).toEqual({ ok: true, message: "saved" });
		expect(updateStatusService).toHaveBeenCalledWith({
			ctx,
			id: "record-1",
			approvalStatus: "needs-revision",
			countryAccountsId: "country-1",
			userId: "user-1",
		});
		expect(saveValidationWorkflowRejectionCommentService).toHaveBeenCalledWith({
			ctx,
			approvalStatus: "needs-revision",
			recordId: "record-1",
			recordType: "disaster_records",
			rejectedByUserId: "user-1",
			rejectionMessage: "Please fix missing fields",
		});
		expect(emailValidationWorkflowStatusChangeNotificationService).toHaveBeenCalledWith({
			ctx,
			recordId: "record-1",
			recordType: "disaster_records",
			newStatus: "needs-revision",
			rejectionComments: "Please fix missing fields",
		});
	});
});
