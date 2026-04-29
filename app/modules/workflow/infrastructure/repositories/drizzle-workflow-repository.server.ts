import { and, asc, eq } from "drizzle-orm";
import type { WorkflowHistory } from "~/modules/workflow/domain/entities/workflow-history";
import type {
	WorkflowInstance,
	WorkflowTransitionInput,
} from "~/modules/workflow/domain/entities/workflow-instance";
import {
	isValidWorkflowTransition,
	type WorkflowEntityType,
	type WorkflowStatus,
} from "~/modules/workflow/domain/entities/workflow-status";
import type { WorkflowRepositoryPort } from "~/modules/workflow/domain/repositories/workflow-repository";
import type { Dr } from "~/modules/workflow/infrastructure/db/client.server";
import {
	workflowHistoryTable,
	workflowInstanceTable,
	workflowNotifiedTable,
} from "~/drizzle/schema";

function toDate(value: Date | string | null | undefined): Date | null {
	if (!value) return null;
	if (value instanceof Date) return value;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapInstance(
	row: typeof workflowInstanceTable.$inferSelect,
): WorkflowInstance {
	return {
		id: row.id,
		entityId: row.entityId,
		entityType: row.entityType as WorkflowEntityType,
		status: row.status as WorkflowStatus,
		createdAt: row.createdAt,
		updatedAt: toDate(row.updatedAt),
		draftedAt: toDate(row.draftedAt),
		submittedAt: toDate(row.submittedAt),
		approvedAt: toDate(row.approvedAt),
		publishedAt: toDate(row.publishedAt),
		rejectedAt: toDate(row.rejectedAt),
		revisionRequestedAt: toDate(row.revisionRequestedAt),
	};
}

function mapHistory(
	row: typeof workflowHistoryTable.$inferSelect,
): WorkflowHistory {
	return {
		id: row.id,
		workflowInstanceId: row.workflowInstanceId,
		status: row.status as WorkflowStatus,
		actionBy: row.actionBy,
		comment: row.comment,
		createdAt: row.createdAt,
	};
}

function timestampSetForStatus(status: WorkflowStatus, now: Date) {
	const setData: Partial<typeof workflowInstanceTable.$inferInsert> = {
		status,
		updatedAt: now,
	};

	if (status === "draft") {
		setData.draftedAt = now;
		setData.submittedAt = null;
		setData.approvedAt = null;
		setData.publishedAt = null;
		setData.rejectedAt = null;
		setData.revisionRequestedAt = null;
	}

	if (status === "submitted") {
		setData.submittedAt = now;
		setData.approvedAt = null;
		setData.publishedAt = null;
		setData.rejectedAt = null;
		setData.revisionRequestedAt = null;
	}

	if (status === "approved") {
		setData.approvedAt = now;
		setData.publishedAt = null;
		setData.rejectedAt = null;
		setData.revisionRequestedAt = null;
	}

	if (status === "published") {
		setData.publishedAt = now;
		setData.rejectedAt = null;
		setData.revisionRequestedAt = null;
	}

	if (status === "rejected") {
		setData.rejectedAt = now;
	}

	if (status === "revision_requested") {
		setData.revisionRequestedAt = now;
		setData.approvedAt = null;
		setData.publishedAt = null;
		setData.rejectedAt = null;
	}

	return setData;
}

export class DrizzleWorkflowRepository implements WorkflowRepositoryPort {
	constructor(private readonly db: Dr) {}

	async createInstance(args: {
		entityId: string;
		entityType: WorkflowEntityType;
		status?: WorkflowStatus;
		actionBy?: string | null;
		comment?: string | null;
	}): Promise<WorkflowInstance | null> {
		const existing = await this.findByEntity(args.entityType, args.entityId);
		if (existing) {
			return existing;
		}

		const status = args.status ?? "draft";
		const now = new Date();
		const created = await this.db
			.insert(workflowInstanceTable)
			.values({
				entityId: args.entityId,
				entityType: args.entityType,
				...timestampSetForStatus(status, now),
			})
			.returning();
		const row = created[0];
		if (!row) return null;

		await this.db.insert(workflowHistoryTable).values({
			workflowInstanceId: row.id,
			status,
			actionBy: args.actionBy ?? null,
			comment: args.comment ?? null,
		});

		return mapInstance(row);
	}

	async findByEntity(
		entityType: WorkflowEntityType,
		entityId: string,
	): Promise<WorkflowInstance | null> {
		const row = await this.db.query.workflowInstanceTable.findFirst({
			where: and(
				eq(workflowInstanceTable.entityType, entityType),
				eq(workflowInstanceTable.entityId, entityId),
			),
		});
		return row ? mapInstance(row) : null;
	}

	async transition(
		args: WorkflowTransitionInput,
	): Promise<WorkflowInstance | null> {
		const current = await this.findByEntity(args.entityType, args.entityId);
		if (!current) {
			return null;
		}
		if (!isValidWorkflowTransition(current.status, args.toStatus)) {
			throw new Error(
				`Invalid workflow transition: ${current.status} -> ${args.toStatus}`,
			);
		}

		const now = new Date();
		const setData = timestampSetForStatus(args.toStatus, now);

		const updatedRows = await this.db
			.update(workflowInstanceTable)
			.set(setData)
			.where(eq(workflowInstanceTable.id, current.id))
			.returning();
		const updated = updatedRows[0];
		if (!updated) return null;

		await this.db.insert(workflowHistoryTable).values({
			workflowInstanceId: current.id,
			status: args.toStatus,
			actionBy: args.actionBy ?? null,
			comment: args.comment ?? null,
		});

		if (args.notifiedUserIds) {
			await this.replaceNotifications({
				entityType: args.entityType,
				entityId: args.entityId,
				notifiedByUserId: args.actionBy ?? null,
				notifiedUserIds: args.notifiedUserIds,
				notificationMessage: args.comment ?? null,
			});
		}

		return mapInstance(updated);
	}

	async replaceNotifications(args: {
		entityType: WorkflowEntityType;
		entityId: string;
		notifiedByUserId: string | null;
		notifiedUserIds: string[];
		notificationMessage?: string | null;
	}): Promise<void> {
		const instance = await this.findByEntity(args.entityType, args.entityId);
		if (!instance) return;

		await this.db
			.delete(workflowNotifiedTable)
			.where(eq(workflowNotifiedTable.workflowInstanceId, instance.id));

		if (!args.notifiedUserIds.length) return;

		await this.db.insert(workflowNotifiedTable).values(
			args.notifiedUserIds.map((notifiedUserId) => ({
				workflowInstanceId: instance.id,
				notifiedUserId,
				notifiedByUserId: args.notifiedByUserId,
				notificationMessage: args.notificationMessage ?? null,
			})),
		);
	}

	async getHistory(
		entityType: WorkflowEntityType,
		entityId: string,
	): Promise<WorkflowHistory[]> {
		const instance = await this.findByEntity(entityType, entityId);
		if (!instance) {
			return [];
		}
		const rows = await this.db.query.workflowHistoryTable.findMany({
			where: eq(workflowHistoryTable.workflowInstanceId, instance.id),
			orderBy: [asc(workflowHistoryTable.createdAt)],
		});
		return rows.map(mapHistory);
	}
}
