import { randomBytes, randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { addHours } from "date-fns";
import { BackendContext } from "~/backend.server/context";
import {
	sendInviteForExistingCountryAccountAdminUser,
	sendInviteForNewCountryAccountAdminUser,
} from "~/backend.server/models/user/invite";
import { dr } from "~/db.server";
import { AffectedRepository } from "~/db/queries/affectedRepository";
import { ApiKeyRepository } from "~/db/queries/apiKeyRepository";
import { AssetRepository } from "~/db/queries/assetRepository";
import { AuditLogsRepository } from "~/db/queries/auditLogsRepository";
import { CountryRepository } from "~/db/queries/countriesRepository";
import { CountryAccountsRepository } from "~/db/queries/countryAccountsRepository";
import { DamagesRepository } from "~/db/queries/damagesRepository";
import { DeathRepository } from "~/db/queries/deathRepository";
import { DisasterEventRepository } from "~/db/queries/disasterEventRepository";
import { DisasterRecordsRepository } from "~/db/queries/disasterRecordsRepository";
import { DisplacedRepository } from "~/db/queries/displacedRepository";
import { DisruptionRepository } from "~/db/queries/disruptionRepository";
import { DivisionRepository } from "~/db/queries/divisonRepository";
import { EntityValidationAssignmentRepository } from "~/db/queries/entityValidationAssignmentRepository";
import { EventRepository } from "~/db/queries/eventRepository";
import { EventRelationshipRepository } from "~/db/queries/eventRelationshipRepository";
import { EntityValidationRejectionRepository } from "~/db/queries/entityValidationRejectionRepository";
import { HazardousEventRepository } from "~/db/queries/hazardousEventRepository";
import { HumanCategoryPresenceRepository } from "~/db/queries/humanCategoryPresenceRepository";
import { HumanDsgConfigRepository } from "~/db/queries/humanDsgConfigRepository";
import { HumanDsgRepository } from "~/db/queries/humanDsgRepository";
import { InjuredRepository } from "~/db/queries/injuredRepository";
import { InstanceSystemSettingRepository } from "~/db/queries/instanceSystemSettingRepository";
import { LossesRepository } from "~/db/queries/lossesRepository";
import { MissingRepository } from "~/db/queries/missingRepository";
import { NonEcoLossesRepository } from "~/db/queries/nonEcoLossesRepository";
import { OrganizationRepository } from "~/db/queries/organizationRepository";
import { SectorDisasterRecordsRelationRepository } from "~/db/queries/sectorDisasterRecordsRelationRepository";
import { UserRepository } from "~/db/queries/UserRepository";
import { UserCountryAccountRepository } from "~/db/queries/userCountryAccountsRepository";
import {
	CountryAccountStatus,
	countryAccountStatuses,
	countryAccountTypesTable,
} from "~/drizzle/schema/countryAccountsTable";
import { COUNTRY_TYPE } from "~/drizzle/schema/countriesTable";
import { BASE_UPLOAD_PATH } from "~/utils/paths";

// Create a custom error class for validation errors
export class CountryAccountValidationError extends Error {
	constructor(public errors: string[]) {
		super("Country account validation failed");
		this.name = "ValidationError";
	}
}

function createIdMap(ids: string[]) {
	return new Map(ids.map((id) => [id, randomUUID()]));
}

function getMappedId(
	idMap: Map<string, string>,
	sourceId: string,
	entityName: string,
) {
	const mappedId = idMap.get(sourceId);
	if (!mappedId) {
		throw new Error(`Missing cloned ${entityName} mapping for ${sourceId}`);
	}
	return mappedId;
}

function toPosixPath(filePath: string) {
	return filePath.replace(/\\/g, "/");
}

function stripLeadingSlash(filePath: string) {
	return filePath.replace(/^\/+/, "");
}

function findTenantSegmentIndex(parts: string[]) {
	return parts.findIndex((part) => /^tenant-[\w-]+$/.test(part));
}

function resolveSourceAndDestinationRelativePaths(
	fileName: string,
	targetCountryAccountId: string,
) {
	const cleanName = stripLeadingSlash(toPosixPath(fileName));
	if (!cleanName) {
		return null;
	}

	const parts = cleanName.split("/").filter(Boolean);
	if (parts.length === 0) {
		return null;
	}

	const tenantSegmentIndex = findTenantSegmentIndex(parts);
	if (tenantSegmentIndex >= 0) {
		const srcParts = [...parts];
		const dstParts = [...parts];
		dstParts[tenantSegmentIndex] = `tenant-${targetCountryAccountId}`;
		return {
			sourceRelative: srcParts.join("/"),
			destinationRelative: dstParts.join("/"),
		};
	}

	const uploadsIndex = parts.findIndex((part) => part === BASE_UPLOAD_PATH);
	if (uploadsIndex >= 0) {
		return {
			sourceRelative: parts.join("/"),
			destinationRelative: [
				...parts.slice(0, uploadsIndex + 1),
				`tenant-${targetCountryAccountId}`,
				...parts.slice(uploadsIndex + 1),
			].join("/"),
		};
	}

	return {
		sourceRelative: parts.join("/"),
		destinationRelative: [
			BASE_UPLOAD_PATH,
			`tenant-${targetCountryAccountId}`,
			...parts,
		].join("/"),
	};
}

function cloneAttachmentFileReference(
	attachment: any,
	targetCountryAccountId: string,
) {
	if (!attachment || !attachment.file?.name) {
		return attachment;
	}

	const resolved = resolveSourceAndDestinationRelativePaths(
		String(attachment.file.name),
		targetCountryAccountId,
	);

	if (!resolved) {
		return attachment;
	}

	const sourceAbsolutePath = path.resolve(
		process.cwd(),
		resolved.sourceRelative,
	);
	const destinationAbsolutePath = path.resolve(
		process.cwd(),
		resolved.destinationRelative,
	);

	if (!fs.existsSync(sourceAbsolutePath)) {
		console.warn(
			`Attachment file not found during clone: ${sourceAbsolutePath}`,
		);
		return attachment;
	}

	fs.mkdirSync(path.dirname(destinationAbsolutePath), { recursive: true });
	fs.copyFileSync(sourceAbsolutePath, destinationAbsolutePath);

	return {
		...attachment,
		file: {
			...attachment.file,
			name: `/${toPosixPath(resolved.destinationRelative)}`,
			tenantPath: `${BASE_UPLOAD_PATH}/tenant-${targetCountryAccountId}`,
		},
	};
}

function cloneAttachmentsForCountryAccount(
	attachments: unknown,
	targetCountryAccountId: string,
) {
	let normalizedAttachments = attachments;
	if (typeof attachments === "string") {
		try {
			normalizedAttachments = JSON.parse(attachments);
		} catch {
			return attachments;
		}
	}

	if (
		!Array.isArray(normalizedAttachments) ||
		normalizedAttachments.length === 0
	) {
		return attachments;
	}

	return normalizedAttachments.map((attachment) =>
		cloneAttachmentFileReference(attachment, targetCountryAccountId),
	);
}

function deleteTenantUploadDirectories(countryAccountId: string) {
	const tenantFolder = `tenant-${countryAccountId}`;
	const candidates = [
		path.resolve(process.cwd(), BASE_UPLOAD_PATH, tenantFolder),
		path.resolve(process.cwd(), tenantFolder),
		path.resolve(process.cwd(), "public", BASE_UPLOAD_PATH, tenantFolder),
		path.resolve(process.cwd(), "public", tenantFolder),
	];

	const checked = new Set<string>();
	for (const directoryPath of candidates) {
		if (checked.has(directoryPath)) {
			continue;
		}
		checked.add(directoryPath);

		try {
			if (!fs.existsSync(directoryPath)) {
				continue;
			}

			const stat = fs.statSync(directoryPath);
			if (!stat.isDirectory()) {
				continue;
			}

			fs.rmSync(directoryPath, { recursive: true, force: true });
			console.log(`Deleted tenant upload directory: ${directoryPath}`);
		} catch (error) {
			console.error(
				`Failed to delete tenant upload directory: ${directoryPath}`,
				error,
			);
		}
	}
}

export const CountryAccountService = {
	async create(
		ctx: BackendContext,
		countryId: string,
		shortDescription: string,
		email: string,
		status: number = countryAccountStatuses.ACTIVE,
		countryAccountType: string = countryAccountTypesTable.OFFICIAL,
	) {
		const errors: string[] = [];
		if (!countryId) errors.push("Country is required");
		if (status === null || status === undefined)
			errors.push("Status is required");
		if (!email || email.trim() === "") errors.push("Admin email is required");
		if (!shortDescription || shortDescription.trim() === "")
			errors.push("Short description is required");
		if (!countryAccountType) errors.push("Choose instance type");

		if (countryId && countryId === "-1") {
			errors.push("Please select a country");
		}

		if (status && Number(status) !== 1 && Number(status) !== 0) {
			errors.push("Please enter status valid value");
		}

		if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toString())) {
			errors.push("Please enter a valid email address");
		}

		if (
			countryAccountType !== countryAccountTypesTable.OFFICIAL &&
			countryAccountType !== countryAccountTypesTable.TRAINING
		) {
			errors.push("Invalid instance type");
		}

		if (
			countryId &&
			countryId !== "-1" &&
			(await CountryRepository.getById(countryId)) == null
		) {
			errors.push("Invalid country Id");
		}
		if (
			countryId &&
			countryId !== "-1" &&
			countryAccountType === countryAccountTypesTable.OFFICIAL &&
			(await CountryAccountsRepository.getByCountryIdAndType(
				countryId,
				countryAccountTypesTable.OFFICIAL,
			))
		) {
			errors.push("An official account already exists for this country.");
		}
		if (errors.length > 0) {
			throw new CountryAccountValidationError(errors);
		}

		const isPrimaryAdmin = true;
		return dr.transaction(async (tx) => {
			const countryAccount = await CountryAccountsRepository.create(
				{
					countryId,
					status,
					type: countryAccountType,
					shortDescription,
				},
				tx,
			);
			console.log("countryAccount.id =", countryAccount.id);
			let isNewUser = false;
			let user = await UserRepository.getByEmail(email);
			if (!user) {
				isNewUser = true;
				user = await UserRepository.create(
					{
						email,
					},
					tx,
				);
			}
			const role = "admin";
			await UserCountryAccountRepository.create(
				{
					userId: user.id,
					countryAccountsId: countryAccount.id,
					role,
					isPrimaryAdmin,
				},
				tx,
			);

			const country = await CountryRepository.getById(countryId);
			if (!country) {
				errors.push(`Country with ID ${countryId} not found.`);
				throw new CountryAccountValidationError(errors);
			}
			const instanceSystemSetting =
				await InstanceSystemSettingRepository.create(
					{
						countryName: country.name,
						dtsInstanceCtryIso3: country.iso3 || "",
						countryAccountsId: countryAccount.id,
					},
					tx,
				);

			const EXPIRATION_DAYS = 14;

			if (isNewUser) {
				const inviteCode = randomBytes(32).toString("hex");
				const expirationTime = addHours(new Date(), EXPIRATION_DAYS * 24);

				// update user with invitation code
				UserRepository.updateById(
					user.id,
					{
						inviteSentAt: new Date(),
						inviteCode: inviteCode,
						inviteExpiresAt: expirationTime,
					},
					tx,
				);
				// send email with invitation code in it
				await sendInviteForNewCountryAccountAdminUser(
					ctx,
					user,
					"DELTA Resilience",
					role,
					country.name,
					countryAccountType,
					inviteCode,
				);
			} else {
				// here we need to check if the account is already verified
				if (user.emailVerified) {
					// user is already verified, sending email without verification code
					await sendInviteForExistingCountryAccountAdminUser(
						ctx,
						user,
						"DELTA Resilience",
						"Admin",
						country.name,
						countryAccountType,
					);
				} else {
					// user is not verified, update expiration and send email
					// update expiration
					const inviteCode = randomBytes(32).toString("hex");
					const expirationTime = addHours(new Date(), EXPIRATION_DAYS * 24);

					// update user with invitation code
					UserRepository.updateById(
						user.id,
						{
							inviteSentAt: new Date(),
							inviteCode: inviteCode,
							inviteExpiresAt: expirationTime,
						},
						tx,
					);
					// send email
					await sendInviteForNewCountryAccountAdminUser(
						ctx,
						user,
						"DELTA Resilience",
						role,
						country.name,
						countryAccountType,
						inviteCode,
					);
				}
			}
			return { countryAccount, user, instanceSystemSetting };
		});
	},

	async updateStatus(id: string, status: number, shortDescription: string) {
		const countryAccount =
			await CountryAccountsRepository.getByIdWithCountry(id);
		if (!countryAccount) {
			throw new CountryAccountValidationError([
				`Country accounts id:${id} does not exist`,
			]);
		}
		if (!shortDescription || shortDescription.trim() === "") {
			throw new CountryAccountValidationError([
				"Short description is required",
			]);
		}
		if (
			!Object.values(countryAccountStatuses).includes(
				status as CountryAccountStatus,
			)
		) {
			throw new CountryAccountValidationError([
				`Status: ${status} is not a valid value`,
			]);
		}

		const updatedCountryAccount = await CountryAccountsRepository.update(
			id,
			status,
			shortDescription,
		);
		return { updatedCountryAccount };
	},

	async resendInvitation(ctx: BackendContext, countryAccountId: string) {
		const countryAccount = await dr.query.countryAccountsTable.findFirst({
			where: (ca, { eq }) => eq(ca.id, countryAccountId),
			with: {
				userCountryAccounts: {
					where: (uca, { eq }) => eq(uca.isPrimaryAdmin, true),
					limit: 1,
					with: {
						user: true,
					},
				},
			},
			columns: {
				id: true,
				countryId: true,
				type: true,
			},
		});

		if (!countryAccount) {
			throw new CountryAccountValidationError(["Country account not found."]);
		}

		const adminUserRef = countryAccount.userCountryAccounts[0]?.user;
		if (!adminUserRef) {
			throw new CountryAccountValidationError([
				"Primary admin user not found.",
			]);
		}

		const country = await CountryRepository.getById(countryAccount.countryId);
		if (!country) {
			throw new CountryAccountValidationError([
				`Country with ID ${countryAccount.countryId} not found.`,
			]);
		}

		const userAdmin = await UserRepository.getById(adminUserRef.id);
		if (!userAdmin) {
			throw new CountryAccountValidationError([
				`User with ID ${adminUserRef.id} not found.`,
			]);
		}

		if (userAdmin.emailVerified) {
			await sendInviteForExistingCountryAccountAdminUser(
				ctx,
				userAdmin,
				"DELTA Resilience",
				"Admin",
				country.name,
				countryAccount.type,
			);
		} else {
			const EXPIRATION_DAYS = 14;
			const expirationTime = addHours(new Date(), EXPIRATION_DAYS * 24);

			await UserRepository.updateById(userAdmin.id, {
				inviteSentAt: new Date(),
				inviteExpiresAt: expirationTime,
			});

			await sendInviteForNewCountryAccountAdminUser(
				ctx,
				userAdmin,
				"DELTA Resilience",
				"Admin",
				country.name,
				countryAccount.type,
				userAdmin.inviteCode,
			);
		}
	},

	async clone(countryAccountId: string, shortDescription: string) {
		const errors: string[] = [];
		const countryAccount =
			await CountryAccountsRepository.getByIdWithCountry(countryAccountId);

		if (!countryAccount) {
			throw new CountryAccountValidationError([
				`Country accounts id:${countryAccountId} does not exist`,
			]);
		}

		if (!shortDescription || shortDescription.trim() === "") {
			errors.push("Short description is required");
		}

		if (countryAccount.country.type !== COUNTRY_TYPE.FICTIONAL) {
			errors.push("Only fictional country accounts can be cloned");
		}

		if (errors.length > 0) {
			throw new CountryAccountValidationError(errors);
		}

		return dr.transaction(async (tx) => {
			const newCountryAccount = await CountryAccountsRepository.create(
				{
					countryId: countryAccount.countryId,
					status: countryAccount.status,
					type: countryAccountTypesTable.TRAINING,
					shortDescription,
				},
				tx,
			);

			const newCountryAccountId = newCountryAccount.id;

			const sourceInstanceSettings =
				await InstanceSystemSettingRepository.getByCountryAccountId(
					countryAccountId,
					tx,
				);
			if (sourceInstanceSettings) {
				const { id: _sourceId, ...sourceSettingsWithoutId } =
					sourceInstanceSettings;
				await InstanceSystemSettingRepository.create(
					{
						...sourceSettingsWithoutId,
						countryAccountsId: newCountryAccountId,
					},
					tx,
				);
			} else {
				await InstanceSystemSettingRepository.create(
					{
						countryName: countryAccount.country.name,
						dtsInstanceCtryIso3: countryAccount.country.iso3 || "",
						countryAccountsId: newCountryAccountId,
					},
					tx,
				);
			}

			const organizations = await OrganizationRepository.getByCountryAccountsId(
				countryAccountId,
				tx,
			);
			const organizationIdMap = createIdMap(organizations.map((row) => row.id));
			if (organizations.length > 0) {
				await OrganizationRepository.createMany(
					organizations.map((row) => ({
						...row,
						id: getMappedId(organizationIdMap, row.id, "organization"),
						countryAccountsId: newCountryAccountId,
					})),
					tx,
				);
			}

			const userCountryAccounts =
				await UserCountryAccountRepository.getByCountryAccountsId(
					countryAccountId,
					tx,
				);
			const userCountryAccountIdMap = createIdMap(
				userCountryAccounts.map((row) => row.id),
			);
			if (userCountryAccounts.length > 0) {
				await UserCountryAccountRepository.createMany(
					userCountryAccounts.map((row) => ({
						...row,
						id: getMappedId(
							userCountryAccountIdMap,
							row.id,
							"user country account",
						),
						countryAccountsId: newCountryAccountId,
						organizationId: row.organizationId
							? getMappedId(
									organizationIdMap,
									row.organizationId,
									"organization",
								)
							: null,
					})),
					tx,
				);
			}

			const humanDsgConfigs =
				await HumanDsgConfigRepository.getByCountryAccountsId(
					countryAccountId,
					tx,
				);
			if (humanDsgConfigs.length > 0) {
				await HumanDsgConfigRepository.createMany(
					humanDsgConfigs.map((row) => ({
						hidden: row.hidden,
						custom: row.custom,
					})),
					newCountryAccountId,
					tx,
				);
			}

			const divisions = await DivisionRepository.getByCountryAccountsId(
				countryAccountId,
				tx,
			);
			const divisionIdMap = createIdMap(divisions.map((row) => row.id));
			if (divisions.length > 0) {
				await DivisionRepository.createMany(
					divisions.map((row) => ({
						...row,
						id: getMappedId(divisionIdMap, row.id, "division"),
						parentId: row.parentId
							? getMappedId(divisionIdMap, row.parentId, "division")
							: null,
						countryAccountsId: newCountryAccountId,
					})),
					tx,
				);
			}

			const assets = await AssetRepository.getByCountryAccountsId(
				countryAccountId,
				tx,
			);
			const assetIdMap = createIdMap(assets.map((row) => row.id));
			if (assets.length > 0) {
				await AssetRepository.createMany(
					assets.map((row) => ({
						...row,
						id: getMappedId(assetIdMap, row.id, "asset"),
						countryAccountsId: newCountryAccountId,
					})),
					tx,
				);
			}

			const apiKeys = await ApiKeyRepository.getByCountryAccountsId(
				countryAccountId,
				tx,
			);
			const apiKeyIdMap = createIdMap(apiKeys.map((row) => row.id));
			if (apiKeys.length > 0) {
				await ApiKeyRepository.createMany(
					apiKeys.map((row) => ({
						...row,
						id: getMappedId(apiKeyIdMap, row.id, "api key"),
						secret: randomBytes(32).toString("hex"),
						countryAccountsId: newCountryAccountId,
					})),
					tx,
				);
			}

			const hazardousEvents =
				await HazardousEventRepository.getByCountryAccountsId(
					countryAccountId,
					tx,
				);
			const disasterEvents =
				await DisasterEventRepository.getByCountryAccountsId(
					countryAccountId,
					tx,
				);
			const oldEventIds = [
				...hazardousEvents.map((row) => row.id),
				...disasterEvents.map((row) => row.id),
			];
			const eventIdMap = createIdMap(oldEventIds);

			if (oldEventIds.length > 0) {
				const eventRows = await EventRepository.getByIds(oldEventIds, tx);

				if (eventRows.length > 0) {
					await EventRepository.createMany(
						eventRows.map((row) => ({
							...row,
							id: getMappedId(eventIdMap, row.id, "event"),
						})),
						tx,
					);
				}
			}

			if (hazardousEvents.length > 0) {
				await HazardousEventRepository.createMany(
					hazardousEvents.map((row) => ({
						...row,
						id: getMappedId(eventIdMap, row.id, "hazardous event"),
						countryAccountsId: newCountryAccountId,
						attachments: cloneAttachmentsForCountryAccount(
							row.attachments,
							newCountryAccountId,
						),
					})),
					tx,
				);
			}

			if (disasterEvents.length > 0) {
				await DisasterEventRepository.createMany(
					disasterEvents.map((row) => ({
						...row,
						id: getMappedId(eventIdMap, row.id, "disaster event"),
						countryAccountsId: newCountryAccountId,
						attachments: cloneAttachmentsForCountryAccount(
							row.attachments,
							newCountryAccountId,
						),
						hazardousEventId: row.hazardousEventId
							? getMappedId(eventIdMap, row.hazardousEventId, "hazardous event")
							: null,
						disasterEventId: row.disasterEventId
							? getMappedId(eventIdMap, row.disasterEventId, "disaster event")
							: null,
					})),
					tx,
				);
			}

			if (oldEventIds.length > 0) {
				const eventRelationships =
					await EventRelationshipRepository.getByEventIds(oldEventIds, tx);

				const clonedEventRelationships = eventRelationships
					.filter(
						(row) =>
							eventIdMap.has(row.parentId) && eventIdMap.has(row.childId),
					)
					.map((row) => ({
						...row,
						parentId: getMappedId(eventIdMap, row.parentId, "event"),
						childId: getMappedId(eventIdMap, row.childId, "event"),
					}));

				if (clonedEventRelationships.length > 0) {
					await EventRelationshipRepository.createMany(
						clonedEventRelationships,
						tx,
					);
				}
			}

			const disasterRecords =
				await DisasterRecordsRepository.getByCountryAccountsId(
					countryAccountId,
					tx,
				);
			const disasterRecordIdMap = createIdMap(
				disasterRecords.map((row) => row.id),
			);
			if (disasterRecords.length > 0) {
				await DisasterRecordsRepository.createMany(
					disasterRecords.map((row) => ({
						...row,
						id: getMappedId(disasterRecordIdMap, row.id, "disaster record"),
						countryAccountsId: newCountryAccountId,
						attachments: cloneAttachmentsForCountryAccount(
							row.attachments,
							newCountryAccountId,
						),
						disasterEventId: row.disasterEventId
							? getMappedId(eventIdMap, row.disasterEventId, "disaster event")
							: null,
					})),
					tx,
				);
			}

			const disasterRecordIds = disasterRecords.map((row) => row.id);
			const humanDsgRows = disasterRecordIds.length
				? await HumanDsgRepository.getByRecordIds(disasterRecordIds, tx)
				: [];
			const humanDsgIdMap = createIdMap(humanDsgRows.map((row) => row.id));
			if (humanDsgRows.length > 0) {
				await HumanDsgRepository.createMany(
					humanDsgRows.map((row) => ({
						...row,
						id: getMappedId(humanDsgIdMap, row.id, "human dsg"),
						recordId: getMappedId(
							disasterRecordIdMap,
							row.recordId,
							"disaster record",
						),
					})),
					tx,
				);
			}

			const humanDsgIds = humanDsgRows.map((row) => row.id);
			const affectedIdMap = createIdMap([]);
			const displacedIdMap = createIdMap([]);
			const deathIdMap = createIdMap([]);
			const missingIdMap = createIdMap([]);
			const injuredIdMap = createIdMap([]);
			if (humanDsgIds.length > 0) {
				const affectedRows = await AffectedRepository.getByDsgIds(
					humanDsgIds,
					tx,
				);
				if (affectedRows.length > 0) {
					affectedRows.forEach((row) =>
						affectedIdMap.set(row.id, randomUUID()),
					);
					await AffectedRepository.createMany(
						affectedRows.map((row) => ({
							...row,
							id: getMappedId(affectedIdMap, row.id, "affected"),
							dsgId: getMappedId(humanDsgIdMap, row.dsgId, "human dsg"),
						})),
						tx,
					);
				}

				const displacedRows = await DisplacedRepository.getByDsgIds(
					humanDsgIds,
					tx,
				);
				if (displacedRows.length > 0) {
					displacedRows.forEach((row) =>
						displacedIdMap.set(row.id, randomUUID()),
					);
					await DisplacedRepository.createMany(
						displacedRows.map((row) => ({
							...row,
							id: getMappedId(displacedIdMap, row.id, "displaced"),
							dsgId: getMappedId(humanDsgIdMap, row.dsgId, "human dsg"),
						})),
						tx,
					);
				}

				const deathRows = await DeathRepository.getByDsgIds(humanDsgIds, tx);
				if (deathRows.length > 0) {
					deathRows.forEach((row) => deathIdMap.set(row.id, randomUUID()));
					await DeathRepository.createMany(
						deathRows.map((row) => ({
							...row,
							id: getMappedId(deathIdMap, row.id, "death"),
							dsgId: getMappedId(humanDsgIdMap, row.dsgId, "human dsg"),
						})),
						tx,
					);
				}

				const missingRows = await MissingRepository.getByDsgIds(
					humanDsgIds,
					tx,
				);
				if (missingRows.length > 0) {
					missingRows.forEach((row) => missingIdMap.set(row.id, randomUUID()));
					await MissingRepository.createMany(
						missingRows.map((row) => ({
							...row,
							id: getMappedId(missingIdMap, row.id, "missing"),
							dsgId: getMappedId(humanDsgIdMap, row.dsgId, "human dsg"),
						})),
						tx,
					);
				}

				const injuredRows = await InjuredRepository.getByDsgIds(
					humanDsgIds,
					tx,
				);
				if (injuredRows.length > 0) {
					injuredRows.forEach((row) => injuredIdMap.set(row.id, randomUUID()));
					await InjuredRepository.createMany(
						injuredRows.map((row) => ({
							...row,
							id: getMappedId(injuredIdMap, row.id, "injured"),
							dsgId: getMappedId(humanDsgIdMap, row.dsgId, "human dsg"),
						})),
						tx,
					);
				}
			}

			const disruptionIdMap = createIdMap([]);
			const humanCategoryPresenceIdMap = createIdMap([]);
			const nonEcoLossIdMap = createIdMap([]);
			const sectorRelationIdMap = createIdMap([]);
			const lossIdMap = createIdMap([]);
			const damageIdMap = createIdMap([]);
			if (disasterRecordIds.length > 0) {
				const disruptionRows = await DisruptionRepository.getByRecordIds(
					disasterRecordIds,
					tx,
				);
				disruptionRows.forEach((row) =>
					disruptionIdMap.set(row.id, randomUUID()),
				);
				if (disruptionRows.length > 0) {
					await DisruptionRepository.createMany(
						disruptionRows.map((row) => ({
							...row,
							id: getMappedId(disruptionIdMap, row.id, "disruption"),
							attachments: cloneAttachmentsForCountryAccount(
								row.attachments,
								newCountryAccountId,
							),
							recordId: getMappedId(
								disasterRecordIdMap,
								row.recordId,
								"disaster record",
							),
						})),
						tx,
					);
				}

				const humanCategoryPresenceRows =
					await HumanCategoryPresenceRepository.getByRecordIds(
						disasterRecordIds,
						tx,
					);
				humanCategoryPresenceRows.forEach((row) =>
					humanCategoryPresenceIdMap.set(row.id, randomUUID()),
				);
				if (humanCategoryPresenceRows.length > 0) {
					await HumanCategoryPresenceRepository.createMany(
						humanCategoryPresenceRows.map((row) => ({
							...row,
							id: getMappedId(
								humanCategoryPresenceIdMap,
								row.id,
								"human category presence",
							),
							recordId: getMappedId(
								disasterRecordIdMap,
								row.recordId,
								"disaster record",
							),
						})),
						tx,
					);
				}

				const nonEcoLossRows = await NonEcoLossesRepository.getByRecordIds(
					disasterRecordIds,
					tx,
				);
				nonEcoLossRows.forEach((row) =>
					nonEcoLossIdMap.set(row.id, randomUUID()),
				);
				if (nonEcoLossRows.length > 0) {
					await NonEcoLossesRepository.createMany(
						nonEcoLossRows.map((row) => ({
							...row,
							id: getMappedId(nonEcoLossIdMap, row.id, "non-economic loss"),
							disasterRecordId: getMappedId(
								disasterRecordIdMap,
								row.disasterRecordId,
								"disaster record",
							),
						})),
						tx,
					);
				}

				const sectorRelationRows =
					await SectorDisasterRecordsRelationRepository.getByRecordIds(
						disasterRecordIds,
						tx,
					);
				sectorRelationRows.forEach((row) =>
					sectorRelationIdMap.set(row.id, randomUUID()),
				);
				if (sectorRelationRows.length > 0) {
					await SectorDisasterRecordsRelationRepository.createMany(
						sectorRelationRows.map((row) => ({
							...row,
							id: getMappedId(sectorRelationIdMap, row.id, "sector relation"),
							disasterRecordId: getMappedId(
								disasterRecordIdMap,
								row.disasterRecordId,
								"disaster record",
							),
						})),
						tx,
					);
				}

				const lossRows = await LossesRepository.getByRecordIds(
					disasterRecordIds,
					tx,
				);
				lossRows.forEach((row) => lossIdMap.set(row.id, randomUUID()));
				if (lossRows.length > 0) {
					await LossesRepository.createMany(
						lossRows.map((row) => ({
							...row,
							id: getMappedId(lossIdMap, row.id, "loss"),
							attachments: cloneAttachmentsForCountryAccount(
								row.attachments,
								newCountryAccountId,
							),
							recordId: getMappedId(
								disasterRecordIdMap,
								row.recordId,
								"disaster record",
							),
						})),
						tx,
					);
				}

				const damageRows = await DamagesRepository.getByRecordIds(
					disasterRecordIds,
					tx,
				);
				damageRows.forEach((row) => damageIdMap.set(row.id, randomUUID()));
				if (damageRows.length > 0) {
					await DamagesRepository.createMany(
						damageRows.map((row) => ({
							...row,
							id: getMappedId(damageIdMap, row.id, "damage"),
							attachments: cloneAttachmentsForCountryAccount(
								row.attachments,
								newCountryAccountId,
							),
							recordId: getMappedId(
								disasterRecordIdMap,
								row.recordId,
								"disaster record",
							),
							assetId: getMappedId(assetIdMap, row.assetId, "asset"),
						})),
						tx,
					);
				}

				const entityIds = [
					...disasterRecordIds,
					...hazardousEvents.map((row) => row.id),
					...disasterEvents.map((row) => row.id),
				];

				if (entityIds.length > 0) {
					const validationAssignments =
						await EntityValidationAssignmentRepository.getByEntityIds(
							entityIds,
							tx,
						);

					const clonedValidationAssignments = validationAssignments.flatMap(
						(row) => {
							if (row.entityType === "disaster_records") {
								return [
									{
										...row,
										id: randomUUID(),
										entityId: getMappedId(
											disasterRecordIdMap,
											row.entityId ?? "",
											"disaster record",
										),
									},
								];
							}
							if (row.entityType === "hazardous_event") {
								return [
									{
										...row,
										id: randomUUID(),
										entityId: getMappedId(
											eventIdMap,
											row.entityId ?? "",
											"hazardous event",
										),
									},
								];
							}
							if (row.entityType === "disaster_event") {
								return [
									{
										...row,
										id: randomUUID(),
										entityId: getMappedId(
											eventIdMap,
											row.entityId ?? "",
											"disaster event",
										),
									},
								];
							}
							return [];
						},
					);

					if (clonedValidationAssignments.length > 0) {
						await EntityValidationAssignmentRepository.createMany(
							clonedValidationAssignments,
							tx,
						);
					}

					const validationRejections =
						await EntityValidationRejectionRepository.getByEntityIds(
							entityIds,
							tx,
						);

					const clonedValidationRejections = validationRejections.flatMap(
						(row) => {
							if (row.entityType === "disaster_records") {
								return [
									{
										...row,
										id: randomUUID(),
										entityId: getMappedId(
											disasterRecordIdMap,
											row.entityId ?? "",
											"disaster record",
										),
									},
								];
							}
							if (row.entityType === "hazardous_event") {
								return [
									{
										...row,
										id: randomUUID(),
										entityId: getMappedId(
											eventIdMap,
											row.entityId ?? "",
											"hazardous event",
										),
									},
								];
							}
							if (row.entityType === "disaster_event") {
								return [
									{
										...row,
										id: randomUUID(),
										entityId: getMappedId(
											eventIdMap,
											row.entityId ?? "",
											"disaster event",
										),
									},
								];
							}
							return [];
						},
					);

					if (clonedValidationRejections.length > 0) {
						await EntityValidationRejectionRepository.createMany(
							clonedValidationRejections,
							tx,
						);
					}
				}
			}

			return { success: true, newCountryAccount };
		});
	},

	async deleteInstance(countryAccountId: string) {
		console.log("Deleting instance data for:", countryAccountId);
		const deleted = await dr.transaction(async (tx) => {
			// 1. Get all disaster records for this country account
			const disasterRecords =
				await DisasterRecordsRepository.getByCountryAccountsId(
					countryAccountId,
					tx,
				);
			const recordIds = disasterRecords.map((r) => r.id);

			const hazardousEvents =
				await HazardousEventRepository.getByCountryAccountsId(
					countryAccountId,
					tx,
				);
			const hazardousEventIds = hazardousEvents.map((r) => r.id);

			const disasterEvents =
				await DisasterEventRepository.getByCountryAccountsId(
					countryAccountId,
					tx,
				);
			const disasterEventIds = disasterEvents.map((r) => r.id);

			if (recordIds.length > 0) {
				// 1. delete records from tables related to human_dsg — needs dsg ids first
				const dsgRecords = await HumanDsgRepository.getByRecordIds(
					recordIds,
					tx,
				);
				const dsgIds = dsgRecords.map((d) => d.id);

				if (dsgIds.length > 0) {
					await AffectedRepository.deleteByDsgIds(dsgIds, tx);
					await DisplacedRepository.deleteByDsgIds(dsgIds, tx);
					await DeathRepository.deleteByDsgIds(dsgIds, tx);
					await MissingRepository.deleteByDsgIds(dsgIds, tx);
					await InjuredRepository.deleteByDsgIds(dsgIds, tx);
				}

				// 2. delete records in tables related to disaster records.
				await HumanDsgRepository.deleteByRecordIds(recordIds, tx);
				await DisruptionRepository.deleteByRecordIds(recordIds, tx);
				await HumanCategoryPresenceRepository.deleteByRecordIds(recordIds, tx);
				await NonEcoLossesRepository.deleteByRecordIds(recordIds, tx);
				await SectorDisasterRecordsRelationRepository.deleteByRecordIds(
					recordIds,
					tx,
				);
				await LossesRepository.deleteByRecordIds(recordIds, tx);
				await DamagesRepository.deleteByRecordIds(recordIds, tx);

				EntityValidationAssignmentRepository.deleteByEntityIdsAndEntityType(
					recordIds,
					"disaster_records",
				);
				EntityValidationRejectionRepository.deleteByEntityIdsAndEntityType(
					recordIds,
					"disaster_records",
					tx,
				);
			}
			if (hazardousEventIds.length > 0) {
				EntityValidationAssignmentRepository.deleteByEntityIdsAndEntityType(
					recordIds,
					"hazardous_event",
					tx,
				);
				EntityValidationRejectionRepository.deleteByEntityIdsAndEntityType(
					recordIds,
					"hazardous_event",
					tx,
				);
			}
			if (disasterEventIds.length > 0) {
				EntityValidationAssignmentRepository.deleteByEntityIdsAndEntityType(
					recordIds,
					"disaster_event",
					tx,
				);
				EntityValidationRejectionRepository.deleteByEntityIdsAndEntityType(
					recordIds,
					"disaster_event",
					tx,
				);
			}
			await AssetRepository.deleteByCountryAccountIdAndIsBuiltIn(
				countryAccountId,
				false,
				tx,
			);
			await ApiKeyRepository.deleteByCountryAccountId(countryAccountId, tx);
			await AuditLogsRepository.deleteByCountryAccountId(countryAccountId, tx);
			await HumanDsgConfigRepository.deleteByCountryAccountId(
				countryAccountId,
				tx,
			);
			await DivisionRepository.deleteByCountryAccountId(countryAccountId, tx);
			await UserCountryAccountRepository.deleteByCountryAccountIdAndIsPrimaryAdmin(
				countryAccountId,
				false,
				tx,
			);
			await OrganizationRepository.deleteByCountryAccountId(
				countryAccountId,
				tx,
			);
			// 3. Delete all disaster records for this country account
			await DisasterRecordsRepository.deleteByCountryAccountId(
				countryAccountId,
				tx,
			);
			await DisasterEventRepository.deleteByCountryAccountId(
				countryAccountId,
				tx,
			);
			await HazardousEventRepository.deleteByCountryAccountId(
				countryAccountId,
				tx,
			);
			// 4. Finally, delete the country account itself
			await CountryAccountsRepository.deleteById(countryAccountId, tx);

			return true;
		});

		if (deleted) {
			deleteTenantUploadDirectories(countryAccountId);
		}

		return deleted;
	},
};
