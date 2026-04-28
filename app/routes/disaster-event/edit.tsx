import { randomUUID } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

import { and, eq, inArray } from "drizzle-orm";
import { redirect, useActionData, useLoaderData } from "react-router";

import { dr } from "~/db.server";
import { disasterEventAttachmentTable, divisionTable } from "~/drizzle/schema";
import { PERMISSIONS } from "~/frontend/user/roles";
import {
    makeGetDisasterEventByIdUseCase,
    makeListDisasterEventsUseCase,
    makeUpdateDisasterEventUseCase,
} from "~/modules/disaster-event/disaster-event-module.server";
import DisasterEventForm from "~/modules/disaster-event/presentation/disaster-event-form";
import {
    parseStepState,
    toDisasterEventWriteModel,
} from "~/modules/disaster-event/presentation/step-state";
import { hazardousEventTable } from "~/modules/hazardous-event/infrastructure/db/schema";
import {
    authActionWithPerm,
    authLoaderWithPerm,
} from "~/utils/auth";
import { DISASTER_EVENT_UPLOAD_PATH } from "~/utils/paths";
import { getCountryAccountsIdFromSession, getUserIdFromSession } from "~/utils/session";

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
    ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg",
    ".mp4", ".webm", ".mov", ".avi", ".mkv",
    ".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac",
    ".pdf", ".doc", ".docx", ".xls", ".xlsx",
]);

const MAX_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024;

function getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot < 0) return "";
    return fileName.slice(lastDot).toLowerCase();
}

function validateAttachments(files: File[]): string | undefined {
    if (!files.length) return undefined;
    const invalid = files.find(
        (f) => !ALLOWED_ATTACHMENT_EXTENSIONS.has(getFileExtension(f.name)),
    );
    if (invalid) return `File type not allowed: ${invalid.name}`;
    const total = files.reduce((sum, f) => sum + f.size, 0);
    if (total > MAX_ATTACHMENT_TOTAL_BYTES) return "Total attachment size must not exceed 10 MB.";
    return undefined;
}

function readAttachmentSelectionCount(formData: FormData): number {
    const raw = formData.get("attachmentSelectionCount");
    const num = raw ? parseInt(String(raw), 10) : 0;
    return Number.isFinite(num) ? num : 0;
}

async function saveDisasterAttachments(
    disasterEventId: string,
    countryAccountsId: string,
    files: File[],
): Promise<void> {
    if (!files.length) return;
    const tenantFolder = `tenant-${countryAccountsId}`;
    const uploadDir = path.resolve(process.cwd(), DISASTER_EVENT_UPLOAD_PATH, tenantFolder);
    await mkdir(uploadDir, { recursive: true });
    const rows = [];
    for (const file of files) {
        const originalName = path.basename(file.name || "file");
        const extension = getFileExtension(originalName);
        const generatedName = `${randomUUID()}${extension}`;
        const absolutePath = path.resolve(uploadDir, generatedName);
        const relativePath = path.join(DISASTER_EVENT_UPLOAD_PATH, tenantFolder, generatedName).replace(/\\/g, "/");
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(absolutePath, buffer);
        rows.push({
            disasterEventId,
            title: originalName,
            fileKey: `/${relativePath}`,
            fileName: originalName,
            fileType: file.type || extension.replace(/^\./, ""),
            fileSize: file.size,
        });
    }
    if (rows.length) {
        await dr.insert(disasterEventAttachmentTable).values(rows).execute();
    }
}

async function removeDisasterAttachmentsByIds(
    disasterEventId: string,
    attachmentIds: string[],
): Promise<void> {
    if (!attachmentIds.length) return;
    const targetRows = await dr
        .select({ id: disasterEventAttachmentTable.id, fileKey: disasterEventAttachmentTable.fileKey })
        .from(disasterEventAttachmentTable)
        .where(
            and(
                eq(disasterEventAttachmentTable.disasterEventId, disasterEventId),
                inArray(disasterEventAttachmentTable.id, attachmentIds),
            ),
        )
        .execute();
    if (!targetRows.length) return;
    await dr
        .delete(disasterEventAttachmentTable)
        .where(
            and(
                eq(disasterEventAttachmentTable.disasterEventId, disasterEventId),
                inArray(disasterEventAttachmentTable.id, targetRows.map((r) => r.id)),
            ),
        )
        .execute();
    for (const row of targetRows) {
        const normalizedPath = String(row.fileKey || "").replace(/^\/+/, "");
        if (!normalizedPath) continue;
        const absolutePath = path.resolve(process.cwd(), normalizedPath);
        try { await unlink(absolutePath); } catch { /* best effort */ }
    }
}

export const loader = authLoaderWithPerm(
    PERMISSIONS.DISASTER_EVENT_UPDATE,
    async ({ request, params }) => {
        const countryAccountsId = await getCountryAccountsIdFromSession(request);
        if (!countryAccountsId) {
            throw new Response("Unauthorized", { status: 401 });
        }
        if (!params.id) {
            throw new Response("ID is required", { status: 400 });
        }

        const item = await makeGetDisasterEventByIdUseCase().execute({
            id: params.id,
            countryAccountsId,
        });
        if (!item) {
            throw new Response("Disaster event not found", { status: 404 });
        }

        const [hipTypes, hipClusters, hipHazards, divisions, responseTypes, assessmentTypes, disasters, hazardous, attachments] =
            await Promise.all([
                dr.query.hipTypeTable.findMany(),
                dr.query.hipClusterTable.findMany(),
                dr.query.hipHazardTable.findMany(),
                dr.query.divisionTable.findMany({
                    where: eq(divisionTable.countryAccountsId, countryAccountsId),
                }),
                dr.query.responseTypeTable.findMany(),
                dr.query.assessmentTypeTable.findMany(),
                makeListDisasterEventsUseCase().execute({ countryAccountsId, page: 1, pageSize: 200 }),
                dr.select({ id: hazardousEventTable.id, nationalSpecification: hazardousEventTable.nationalSpecification, startDate: hazardousEventTable.startDate })
                    .from(hazardousEventTable)
                    .where(eq(hazardousEventTable.countryAccountsId, countryAccountsId)),
                dr.select({
                    id: disasterEventAttachmentTable.id,
                    fileName: disasterEventAttachmentTable.fileName,
                    fileType: disasterEventAttachmentTable.fileType,
                    fileSize: disasterEventAttachmentTable.fileSize,
                })
                    .from(disasterEventAttachmentTable)
                    .where(eq(disasterEventAttachmentTable.disasterEventId, params.id))
                    .execute(),
            ]);

        return {
            item,
            initialAttachments: attachments,
            hipTypes: hipTypes.map((t) => ({ label: t.name_en, value: t.id })),
            hipClusters: hipClusters.map((c) => ({ label: c.name_en, value: c.id, typeId: c.typeId })),
            hipHazards: hipHazards.map((h) => ({ label: h.name_en, value: h.id, clusterId: h.clusterId })),
            divisions: divisions.map((d) => ({ label: d.nationalId || d.id, value: d.id })),
            responseTypes: responseTypes.map((r) => ({ label: r.type, value: r.id })),
            assessmentTypes: assessmentTypes.map((a) => ({ label: a.type, value: a.id })),
            disasterOptions: disasters.data.items
                .filter((d) => d.id !== item.id)
                .map((d) => ({ label: d.nameNational, value: d.id, startDate: d.startDate ? String(d.startDate) : null })),
            hazardousOptions: hazardous.map((h) => ({ label: h.nationalSpecification || h.id, value: h.id, startDate: h.startDate ? String(h.startDate) : null })),
        };
    },
);

export const action = authActionWithPerm(
    PERMISSIONS.DISASTER_EVENT_UPDATE,
    async ({ request, params }) => {
        const countryAccountsId = await getCountryAccountsIdFromSession(request);
        if (!countryAccountsId) {
            throw new Response("Unauthorized", { status: 401 });
        }
        if (!params.id) {
            throw new Response("ID is required", { status: 400 });
        }

        const formData = await request.formData();

        const attachmentIdsToRemove = formData
            .getAll("attachmentsToRemove[]")
            .map(String)
            .filter(Boolean);
        if (attachmentIdsToRemove.length) {
            await removeDisasterAttachmentsByIds(params.id, attachmentIdsToRemove);
        }

        const stepState = parseStepState(formData.get("stepState"));
        const writeModel = toDisasterEventWriteModel(countryAccountsId, stepState);
        const updatedByUserId = await getUserIdFromSession(request);
        writeModel.updatedByUserId = updatedByUserId ?? null;
        const result = await makeUpdateDisasterEventUseCase().execute({
            id: params.id,
            countryAccountsId,
            data: writeModel,
        });
        if (!result.ok) {
            return { error: result.error };
        }

        const selectionCount = readAttachmentSelectionCount(formData);
        if (selectionCount > 0) {
            const rawFiles = formData.getAll("attachments");
            const files = rawFiles.filter((f): f is File => f instanceof File && f.size > 0);
            const attachmentValidationError = validateAttachments(files);
            if (attachmentValidationError) {
                return { error: attachmentValidationError };
            }
            await saveDisasterAttachments(params.id, countryAccountsId, files);
        }

        return redirect("/disaster-event");
    },
);

export default function DisasterEventEditRoute() {
    const actionData = useActionData<typeof action>();
    const loaderData = useLoaderData<typeof loader>();

    return (
        <DisasterEventForm
            title="Edit Disaster Event"
            submitLabel="Save"
            actionError={actionData?.error}
            initialValues={loaderData.item}
            initialAttachments={loaderData.initialAttachments}
            hipTypes={loaderData.hipTypes}
            hipClusters={loaderData.hipClusters}
            hipHazards={loaderData.hipHazards}
            divisions={loaderData.divisions}
            disasterOptions={loaderData.disasterOptions}
            hazardousOptions={loaderData.hazardousOptions}
            responseTypes={loaderData.responseTypes}
            assessmentTypes={loaderData.assessmentTypes}
        />
    );
}
