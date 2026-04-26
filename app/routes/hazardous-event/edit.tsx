import { randomUUID } from "crypto";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { redirect, useActionData, useLoaderData } from "react-router";
import { and, eq, ne } from "drizzle-orm";
import type { Geometry } from "geojson";

import {
	makeGetHazardousEventByIdUseCase,
	makeHazardousEventRepository,
	makeUpdateHazardousEventUseCase,
} from "~/modules/hazardous-event/hazardous-event-module.server";
import type { HazardousEventGeometryType } from "~/modules/hazardous-event/domain/repositories/hazardous-event-repository";
import HazardousEventForm from "~/modules/hazardous-event/presentation/hazardous-event-form";
import {
	authActionGetAuth,
	authActionWithPerm,
	authLoaderWithPerm,
} from "~/utils/auth";
import { getCountryAccountsIdFromSession } from "~/utils/session";
import { dr } from "~/db.server";
import { hazardousEventTable } from "~/modules/hazardous-event/infrastructure/db/schema";
import { hazardousEventAttachmentTable } from "~/drizzle/schema/hazardousEventAttachmentTable";
import { HAZARDOUS_EVENT_UPLOAD_PATH } from "~/utils/paths";

const MAX_ATTACHMENT_TOTAL_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([
	".jpg",
	".jpeg",
	".png",
	".gif",
	".webp",
	".bmp",
	".svg",
	".mp4",
	".webm",
	".mov",
	".avi",
	".mkv",
	".mp3",
	".wav",
	".ogg",
	".m4a",
	".aac",
	".flac",
	".pdf",
	".doc",
	".docx",
	".xls",
	".xlsx",
]);

const ALLOWED_GEOMETRY_TYPES = new Set<HazardousEventGeometryType>([
	"POINT",
	"LINESTRING",
	"POLYGON",
	"MULTIPOLYGON",
]);

type SubmittedGeometry = {
	geojson: unknown;
	geometryType: HazardousEventGeometryType;
	name?: string;
	isPrimary: boolean;
};

function parseSubmittedGeometries(formData: FormData): SubmittedGeometry[] {
	const parsed: SubmittedGeometry[] = [];

	for (const raw of formData.getAll("geometries[]")) {
		if (typeof raw !== "string") {
			continue;
		}

		try {
			const value = JSON.parse(raw) as {
				geojson?: unknown;
				geometryType?: string;
				name?: string;
				isPrimary?: boolean;
			};

			if (!value || typeof value !== "object") {
				continue;
			}

			if (!value.geometryType || !ALLOWED_GEOMETRY_TYPES.has(value.geometryType as HazardousEventGeometryType)) {
				continue;
			}

			if (!value.geojson || typeof value.geojson !== "object") {
				continue;
			}

			parsed.push({
				geojson: value.geojson,
				geometryType: value.geometryType as HazardousEventGeometryType,
				name: typeof value.name === "string" ? value.name.trim() : undefined,
				isPrimary: Boolean(value.isPrimary),
			});
		} catch {
			continue;
		}
	}

	if (!parsed.length) {
		return parsed;
	}

	let seenPrimary = false;
	return parsed.map((item, index) => {
		if (item.isPrimary && !seenPrimary) {
			seenPrimary = true;
			return item;
		}

		if (!seenPrimary && index === parsed.length - 1) {
			return { ...item, isPrimary: true };
		}

		return { ...item, isPrimary: false };
	});
}

function getFileExtension(fileName: string): string {
	const lastDot = fileName.lastIndexOf(".");
	if (lastDot < 0) {
		return "";
	}
	return fileName.slice(lastDot).toLowerCase();
}

function validateAttachments(files: File[]): string | null {
	if (!files.length) {
		return null;
	}

	const invalidFile = files.find(
		(file) => !ALLOWED_ATTACHMENT_EXTENSIONS.has(getFileExtension(file.name)),
	);
	if (invalidFile) {
		return `File type not allowed: ${invalidFile.name}`;
	}

	const totalSize = files.reduce((sum, file) => sum + file.size, 0);
	if (totalSize > MAX_ATTACHMENT_TOTAL_BYTES) {
		return "Total attachment size must not exceed 10 MB.";
	}

	return null;
}

async function saveHazardousAttachments(
	hazardousEventId: string,
	countryAccountsId: string,
	files: File[],
): Promise<void> {
	if (!files.length) {
		return;
	}

	const tenantFolder = `tenant-${countryAccountsId}`;
	const uploadDir = path.resolve(
		process.cwd(),
		HAZARDOUS_EVENT_UPLOAD_PATH,
		tenantFolder,
	);

	await mkdir(uploadDir, { recursive: true });

	const rows: Array<typeof hazardousEventAttachmentTable.$inferInsert> = [];

	for (const file of files) {
		const originalName = path.basename(file.name || "file");
		const extension = getFileExtension(originalName);
		const generatedName = `${randomUUID()}${extension}`;
		const absolutePath = path.resolve(uploadDir, generatedName);
		const relativePath = path
			.join(HAZARDOUS_EVENT_UPLOAD_PATH, tenantFolder, generatedName)
			.replace(/\\/g, "/");

		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(absolutePath, buffer);

		rows.push({
			hazardousEventId,
			title: originalName,
			fileKey: `/${relativePath}`,
			fileName: originalName,
			fileType: file.type || extension.replace(/^\./, ""),
			fileSize: file.size,
		});
	}

	if (rows.length) {
		await dr.insert(hazardousEventAttachmentTable).values(rows).execute();
	}
}

function optionalField(formData: FormData, name: string): string | null {
	const value = String(formData.get(name) || "").trim();
	return value || null;
}

export const loader = authLoaderWithPerm("EditData", async ({ request, params }) => {
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	if (!params.id) {
		throw new Response("ID is required", { status: 400 });
	}

	const item = await makeGetHazardousEventByIdUseCase().execute({
		id: params.id,
		countryAccountsId,
	});
	if (!item) {
		throw new Response("Hazardous event not found", { status: 404 });
	}
	const repository = makeHazardousEventRepository();
	const geometryRows = await repository.listGeometriesByHazardousEventId(item.id);
	const initialGeometries = geometryRows
		.map((geometryRow) => {
			try {
				const parsedGeoJson = JSON.parse(geometryRow.geometryGeoJson) as Geometry;
				if (!parsedGeoJson || typeof parsedGeoJson !== "object" || !("type" in parsedGeoJson)) {
					return null;
				}

				return {
					id: geometryRow.id,
					geojson: parsedGeoJson,
					geometryType: geometryRow.geometryType,
					name: geometryRow.name || "",
					isPrimary: geometryRow.isPrimary,
				};
			} catch {
				return null;
			}
		})
		.filter((itemValue): itemValue is {
			id: string;
			geojson: Geometry;
			geometryType: HazardousEventGeometryType;
			name: string;
			isPrimary: boolean;
		} => Boolean(itemValue));

	// Fetch HIP data options
	const hipTypes = await dr.query.hipTypeTable.findMany();
	const hipClusters = await dr.query.hipClusterTable.findMany();
	const hipHazards = await dr.query.hipHazardTable.findMany();
	const causalEvents = await dr
		.select({
			id: hazardousEventTable.id,
			nationalSpecification: hazardousEventTable.nationalSpecification,
			recordOriginator: hazardousEventTable.recordOriginator,
			startDate: hazardousEventTable.startDate,
		})
		.from(hazardousEventTable)
		.where(
			and(
				eq(hazardousEventTable.countryAccountsId, countryAccountsId),
				ne(hazardousEventTable.id, item.id),
			),
		)
		.execute();

	return {
		item,
		initialGeometries,
		hipTypes: hipTypes.map((t) => ({ label: t.name_en, value: t.id })),
		hipClusters: hipClusters.map((c) => ({ label: c.name_en, value: c.id, typeId: c.typeId })),
		hipHazards: hipHazards.map((h) => ({ label: h.name_en, value: h.id, clusterId: h.clusterId })),
		causalEventOptions: causalEvents.map((event) => ({
			id: event.id,
			nationalSpecification: event.nationalSpecification || "",
			recordOriginator: event.recordOriginator || "",
			startDate: event.startDate || "",
		})),
	};
});

export const action = authActionWithPerm("EditData", async (actionArgs) => {
	const { request, params } = actionArgs;
	const userSession = authActionGetAuth(actionArgs);
	const countryAccountsId = await getCountryAccountsIdFromSession(request);
	if (!countryAccountsId) {
		throw new Response("Unauthorized", { status: 401 });
	}
	if (!params.id) {
		throw new Response("ID is required", { status: 400 });
	}

	const formData = await request.formData();
	const updatedByUserId = userSession?.user?.id || "";
	const attachmentFiles = Array.from(formData.getAll("attachments")).filter(
		(value): value is File => value instanceof File && value.size > 0,
	);
	const attachmentValidationError = validateAttachments(attachmentFiles);
	if (attachmentValidationError) {
		return {
			error: attachmentValidationError,
			fieldErrors: undefined,
		};
	}
	const causeHazardousEventIds = [
		...new Set(
			Array.from(formData.getAll("causeHazardousEventIds[]"))
				.map((value) => String(value).trim())
				.filter(Boolean),
		),
	];
	const submittedGeometries = parseSubmittedGeometries(formData);

	const result = await makeUpdateHazardousEventUseCase().execute({
		id: params.id,
		countryAccountsId,
		data: {
			hipHazardId: optionalField(formData, "hipHazardId"),
			hipClusterId: optionalField(formData, "hipClusterId"),
			hipTypeId: optionalField(formData, "hipTypeId"),
			nationalSpecification: optionalField(formData, "nationalSpecification"),
			startDate: String(formData.get("startDate") || "").trim(),
			endDate: optionalField(formData, "endDate"),
			recordOriginator: String(formData.get("recordOriginator") || "").trim(),
			description: optionalField(formData, "description"),
			dataSource: optionalField(formData, "dataSource"),
			magnitude: optionalField(formData, "magnitude"),
			hazardousEventStatus: optionalField(formData, "hazardousEventStatus") as
				| "forecasted"
				| "ongoing"
				| "passed"
				| null,
			updatedByUserId,
		},
	});

	if (!result.ok) {
		return {
			error: result.fieldErrors ? undefined : result.error,
			fieldErrors: result.fieldErrors,
		};
	}

	const repository = makeHazardousEventRepository();

	await repository.setCauseHazardousEventIds(
		params.id,
		causeHazardousEventIds,
	);

	await repository.deleteGeometriesByHazardousEventId(params.id);
	for (const geometryItem of submittedGeometries) {
		await repository.addGeometry({
			hazardousEventId: params.id,
			geojson: JSON.stringify(geometryItem.geojson),
			geometryType: geometryItem.geometryType,
			name: geometryItem.name || null,
			source: "manual",
			isPrimary: geometryItem.isPrimary,
			createdBy: updatedByUserId || null,
		});
	}

	await saveHazardousAttachments(params.id, countryAccountsId, attachmentFiles);

	return redirect("/hazardous-event");
});

export default function HazardousEventEditRoute() {
	const {
		item,
		initialGeometries,
		hipTypes,
		hipClusters,
		hipHazards,
		causalEventOptions,
	} = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();

	return (
		<HazardousEventForm
			title="Edit Hazardous Event"
			actionError={actionData?.error}
			fieldErrors={actionData?.fieldErrors}
			initialValues={item}
			initialGeometries={initialGeometries}
			hipTypes={hipTypes}
			hipClusters={hipClusters}
			hipHazards={hipHazards}
			causalEventOptions={causalEventOptions}
		/>
	);
}
