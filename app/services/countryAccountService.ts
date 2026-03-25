import { randomBytes, randomUUID } from "crypto";
import { addHours } from "date-fns";
import { eq, inArray, or } from "drizzle-orm";
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
import { DevExample1Repository } from "~/db/queries/devExample1Repository";
import { DisasterEventRepository } from "~/db/queries/disasterEventRepository";
import { DisasterRecordsRepository } from "~/db/queries/disasterRecordsRepository";
import { DisplacedRepository } from "~/db/queries/displacedRepository";
import { DisruptionRepository } from "~/db/queries/disruptionRepository";
import { divisionRepository } from "~/db/queries/divisonRepository";
import { EntityValidationAssignmentRepository } from "~/db/queries/entityValidationAssignmentRepository";
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
import {
	affectedTable,
	apiKeyTable,
	assetTable,
	damagesTable,
	deathsTable,
	devExample1Table,
	disasterEventTable,
	disasterRecordsTable,
	displacedTable,
	disruptionTable,
	divisionTable,
	entityValidationAssignmentTable,
	entityValidationRejectionTable,
	eventRelationshipTable,
	eventTable,
	hazardousEventTable,
	humanCategoryPresenceTable,
	humanDsgConfigTable,
	humanDsgTable,
	injuredTable,
	instanceSystemSettingsTable,
	lossesTable,
	missingTable,
	nonecoLossesTable,
	organizationTable,
	sectorDisasterRecordsRelationTable,
	userCountryAccountsTable,
} from "~/drizzle/schema";

// Create a custom error class for validation errors
export class CountryAccountValidationError extends Error {
	constructor(public errors: string[]) {
		super("Country account validation failed");
		this.name = "ValidationError";
	}
}

export async function createCountryAccountService(
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
		const instanceSystemSetting = await InstanceSystemSettingRepository.create(
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
}

export async function updateCountryAccountStatusService(
	id: string,
	status: number,
	shortDescription: string,
) {
	const countryAccount = await CountryAccountsRepository.getByIdWithCountry(id);
	if (!countryAccount) {
		throw new CountryAccountValidationError([
			`Country accounts id:${id} does not exist`,
		]);
	}
	if (!shortDescription || shortDescription.trim() === "") {
		throw new CountryAccountValidationError(["Short description is required"]);
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

export async function cloneCountryAccountService(
	countryAccountId: string,
	shortDescription: string,
) {
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
			await InstanceSystemSettingRepository.getByCountryAccountId(countryAccountId, tx);
		if (sourceInstanceSettings) {
			await tx.insert(instanceSystemSettingsTable).values({
				...sourceInstanceSettings,
				id: randomUUID(),
				countryAccountsId: newCountryAccountId,
			});
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

		const organizations = await tx
			.select()
			.from(organizationTable)
			.where(eq(organizationTable.countryAccountsId, countryAccountId));
		const organizationIdMap = createIdMap(organizations.map((row) => row.id));
		if (organizations.length > 0) {
			await tx.insert(organizationTable).values(
				organizations.map((row) => ({
					...row,
					id: getMappedId(organizationIdMap, row.id, "organization"),
					countryAccountsId: newCountryAccountId,
				})),
			);
		}

		const userCountryAccounts = await tx
			.select()
			.from(userCountryAccountsTable)
			.where(eq(userCountryAccountsTable.countryAccountsId, countryAccountId));
		const userCountryAccountIdMap = createIdMap(
			userCountryAccounts.map((row) => row.id),
		);
		if (userCountryAccounts.length > 0) {
			await tx.insert(userCountryAccountsTable).values(
				userCountryAccounts.map((row) => ({
					...row,
					id: getMappedId(
						userCountryAccountIdMap,
						row.id,
						"user country account",
					),
					countryAccountsId: newCountryAccountId,
					organizationId: row.organizationId
						? getMappedId(organizationIdMap, row.organizationId, "organization")
						: null,
				})),
			);
		}

		const humanDsgConfigs = await tx
			.select()
			.from(humanDsgConfigTable)
			.where(eq(humanDsgConfigTable.countryAccountsId, countryAccountId));
		if (humanDsgConfigs.length > 0) {
			await tx.insert(humanDsgConfigTable).values(
				humanDsgConfigs.map((row) => ({
					...row,
					countryAccountsId: newCountryAccountId,
				})),
			);
		}

		const divisions = await tx
			.select()
			.from(divisionTable)
			.where(eq(divisionTable.countryAccountsId, countryAccountId));
		const divisionIdMap = createIdMap(divisions.map((row) => row.id));
		if (divisions.length > 0) {
			await tx.insert(divisionTable).values(
				divisions.map((row) => ({
					...row,
					id: getMappedId(divisionIdMap, row.id, "division"),
					parentId: row.parentId
						? getMappedId(divisionIdMap, row.parentId, "division")
						: null,
					countryAccountsId: newCountryAccountId,
				})),
			);
		}

		const assets = await AssetRepository.getByCountryAccountsId(
			countryAccountId,
			tx,
		);
		const assetIdMap = createIdMap(assets.map((row) => row.id));
		if (assets.length > 0) {
			await tx.insert(assetTable).values(
				assets.map((row) => ({
					...row,
					id: getMappedId(assetIdMap, row.id, "asset"),
					countryAccountsId: newCountryAccountId,
				})),
			);
		}

		const apiKeys = await ApiKeyRepository.getByCountryAccountsId(
			countryAccountId,
			tx,
		);
		const apiKeyIdMap = createIdMap(apiKeys.map((row) => row.id));
		if (apiKeys.length > 0) {
			await tx.insert(apiKeyTable).values(
				apiKeys.map((row) => ({
					...row,
					id: getMappedId(apiKeyIdMap, row.id, "api key"),
					secret: randomBytes(32).toString("hex"),
					countryAccountsId: newCountryAccountId,
				})),
			);
		}

		const devExampleRows = await tx
			.select()
			.from(devExample1Table)
			.where(eq(devExample1Table.countryAccountsId, countryAccountId));
		const devExampleIdMap = createIdMap(devExampleRows.map((row) => row.id));
		if (devExampleRows.length > 0) {
			await tx.insert(devExample1Table).values(
				devExampleRows.map((row) => ({
					...row,
					id: getMappedId(devExampleIdMap, row.id, "dev example"),
					countryAccountsId: newCountryAccountId,
				})),
			);
		}

		const hazardousEvents =
			await HazardousEventRepository.getByCountryAccountsId(
				countryAccountId,
				tx,
			);
		const disasterEvents = await DisasterEventRepository.getByCountryAccountsId(
			countryAccountId,
			tx,
		);
		const oldEventIds = [
			...hazardousEvents.map((row) => row.id),
			...disasterEvents.map((row) => row.id),
		];
		const eventIdMap = createIdMap(oldEventIds);

		if (oldEventIds.length > 0) {
			const eventRows = await tx
				.select()
				.from(eventTable)
				.where(inArray(eventTable.id, oldEventIds));

			if (eventRows.length > 0) {
				await tx.insert(eventTable).values(
					eventRows.map((row) => ({
						...row,
						id: getMappedId(eventIdMap, row.id, "event"),
					})),
				);
			}
		}

		if (hazardousEvents.length > 0) {
			await tx.insert(hazardousEventTable).values(
				hazardousEvents.map((row) => ({
					...row,
					id: getMappedId(eventIdMap, row.id, "hazardous event"),
					countryAccountsId: newCountryAccountId,
				})),
			);
		}

		if (disasterEvents.length > 0) {
			await tx.insert(disasterEventTable).values(
				disasterEvents.map((row) => ({
					...row,
					id: getMappedId(eventIdMap, row.id, "disaster event"),
					countryAccountsId: newCountryAccountId,
					hazardousEventId: row.hazardousEventId
						? getMappedId(eventIdMap, row.hazardousEventId, "hazardous event")
						: null,
					disasterEventId: row.disasterEventId
						? getMappedId(eventIdMap, row.disasterEventId, "disaster event")
						: null,
				})),
			);
		}

		if (oldEventIds.length > 0) {
			const eventRelationships = await tx
				.select()
				.from(eventRelationshipTable)
				.where(
					or(
						inArray(eventRelationshipTable.parentId, oldEventIds),
						inArray(eventRelationshipTable.childId, oldEventIds),
					),
				);

			const clonedEventRelationships = eventRelationships
				.filter(
					(row) => eventIdMap.has(row.parentId) && eventIdMap.has(row.childId),
				)
				.map((row) => ({
					...row,
					parentId: getMappedId(eventIdMap, row.parentId, "event"),
					childId: getMappedId(eventIdMap, row.childId, "event"),
				}));

			if (clonedEventRelationships.length > 0) {
				await tx
					.insert(eventRelationshipTable)
					.values(clonedEventRelationships);
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
			await tx.insert(disasterRecordsTable).values(
				disasterRecords.map((row) => ({
					...row,
					id: getMappedId(disasterRecordIdMap, row.id, "disaster record"),
					countryAccountsId: newCountryAccountId,
					disasterEventId: row.disasterEventId
						? getMappedId(eventIdMap, row.disasterEventId, "disaster event")
						: null,
				})),
			);
		}

		const disasterRecordIds = disasterRecords.map((row) => row.id);
		const humanDsgRows = disasterRecordIds.length
			? await HumanDsgRepository.getByRecordIds(disasterRecordIds, tx)
			: [];
		const humanDsgIdMap = createIdMap(humanDsgRows.map((row) => row.id));
		if (humanDsgRows.length > 0) {
			await tx.insert(humanDsgTable).values(
				humanDsgRows.map((row) => ({
					...row,
					id: getMappedId(humanDsgIdMap, row.id, "human dsg"),
					recordId: getMappedId(
						disasterRecordIdMap,
						row.recordId,
						"disaster record",
					),
				})),
			);
		}

		const humanDsgIds = humanDsgRows.map((row) => row.id);
		const affectedIdMap = createIdMap([]);
		const displacedIdMap = createIdMap([]);
		const deathIdMap = createIdMap([]);
		const missingIdMap = createIdMap([]);
		const injuredIdMap = createIdMap([]);
		if (humanDsgIds.length > 0) {
			const affectedRows = await tx
				.select()
				.from(affectedTable)
				.where(inArray(affectedTable.dsgId, humanDsgIds));
			if (affectedRows.length > 0) {
				affectedRows.forEach((row) => affectedIdMap.set(row.id, randomUUID()));
				await tx.insert(affectedTable).values(
					affectedRows.map((row) => ({
						...row,
						id: getMappedId(affectedIdMap, row.id, "affected"),
						dsgId: getMappedId(humanDsgIdMap, row.dsgId, "human dsg"),
					})),
				);
			}

			const displacedRows = await tx
				.select()
				.from(displacedTable)
				.where(inArray(displacedTable.dsgId, humanDsgIds));
			if (displacedRows.length > 0) {
				displacedRows.forEach((row) =>
					displacedIdMap.set(row.id, randomUUID()),
				);
				await tx.insert(displacedTable).values(
					displacedRows.map((row) => ({
						...row,
						id: getMappedId(displacedIdMap, row.id, "displaced"),
						dsgId: getMappedId(humanDsgIdMap, row.dsgId, "human dsg"),
					})),
				);
			}

			const deathRows = await tx
				.select()
				.from(deathsTable)
				.where(inArray(deathsTable.dsgId, humanDsgIds));
			if (deathRows.length > 0) {
				deathRows.forEach((row) => deathIdMap.set(row.id, randomUUID()));
				await tx.insert(deathsTable).values(
					deathRows.map((row) => ({
						...row,
						id: getMappedId(deathIdMap, row.id, "death"),
						dsgId: getMappedId(humanDsgIdMap, row.dsgId, "human dsg"),
					})),
				);
			}

			const missingRows = await tx
				.select()
				.from(missingTable)
				.where(inArray(missingTable.dsgId, humanDsgIds));
			if (missingRows.length > 0) {
				missingRows.forEach((row) => missingIdMap.set(row.id, randomUUID()));
				await tx.insert(missingTable).values(
					missingRows.map((row) => ({
						...row,
						id: getMappedId(missingIdMap, row.id, "missing"),
						dsgId: getMappedId(humanDsgIdMap, row.dsgId, "human dsg"),
					})),
				);
			}

			const injuredRows = await tx
				.select()
				.from(injuredTable)
				.where(inArray(injuredTable.dsgId, humanDsgIds));
			if (injuredRows.length > 0) {
				injuredRows.forEach((row) => injuredIdMap.set(row.id, randomUUID()));
				await tx.insert(injuredTable).values(
					injuredRows.map((row) => ({
						...row,
						id: getMappedId(injuredIdMap, row.id, "injured"),
						dsgId: getMappedId(humanDsgIdMap, row.dsgId, "human dsg"),
					})),
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
			const disruptionRows = await tx
				.select()
				.from(disruptionTable)
				.where(inArray(disruptionTable.recordId, disasterRecordIds));
			disruptionRows.forEach((row) =>
				disruptionIdMap.set(row.id, randomUUID()),
			);
			if (disruptionRows.length > 0) {
				await tx.insert(disruptionTable).values(
					disruptionRows.map((row) => ({
						...row,
						id: getMappedId(disruptionIdMap, row.id, "disruption"),
						recordId: getMappedId(
							disasterRecordIdMap,
							row.recordId,
							"disaster record",
						),
					})),
				);
			}

			const humanCategoryPresenceRows = await tx
				.select()
				.from(humanCategoryPresenceTable)
				.where(inArray(humanCategoryPresenceTable.recordId, disasterRecordIds));
			humanCategoryPresenceRows.forEach((row) =>
				humanCategoryPresenceIdMap.set(row.id, randomUUID()),
			);
			if (humanCategoryPresenceRows.length > 0) {
				await tx.insert(humanCategoryPresenceTable).values(
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
				);
			}

			const nonEcoLossRows = await tx
				.select()
				.from(nonecoLossesTable)
				.where(inArray(nonecoLossesTable.disasterRecordId, disasterRecordIds));
			nonEcoLossRows.forEach((row) =>
				nonEcoLossIdMap.set(row.id, randomUUID()),
			);
			if (nonEcoLossRows.length > 0) {
				await tx.insert(nonecoLossesTable).values(
					nonEcoLossRows.map((row) => ({
						...row,
						id: getMappedId(nonEcoLossIdMap, row.id, "non-economic loss"),
						disasterRecordId: getMappedId(
							disasterRecordIdMap,
							row.disasterRecordId,
							"disaster record",
						),
					})),
				);
			}

			const sectorRelationRows = await tx
				.select()
				.from(sectorDisasterRecordsRelationTable)
				.where(
					inArray(
						sectorDisasterRecordsRelationTable.disasterRecordId,
						disasterRecordIds,
					),
				);
			sectorRelationRows.forEach((row) =>
				sectorRelationIdMap.set(row.id, randomUUID()),
			);
			if (sectorRelationRows.length > 0) {
				await tx.insert(sectorDisasterRecordsRelationTable).values(
					sectorRelationRows.map((row) => ({
						...row,
						id: getMappedId(sectorRelationIdMap, row.id, "sector relation"),
						disasterRecordId: getMappedId(
							disasterRecordIdMap,
							row.disasterRecordId,
							"disaster record",
						),
					})),
				);
			}

			const lossRows = await tx
				.select()
				.from(lossesTable)
				.where(inArray(lossesTable.recordId, disasterRecordIds));
			lossRows.forEach((row) => lossIdMap.set(row.id, randomUUID()));
			if (lossRows.length > 0) {
				await tx.insert(lossesTable).values(
					lossRows.map((row) => ({
						...row,
						id: getMappedId(lossIdMap, row.id, "loss"),
						recordId: getMappedId(
							disasterRecordIdMap,
							row.recordId,
							"disaster record",
						),
					})),
				);
			}

			const damageRows = await tx
				.select()
				.from(damagesTable)
				.where(inArray(damagesTable.recordId, disasterRecordIds));
			damageRows.forEach((row) => damageIdMap.set(row.id, randomUUID()));
			if (damageRows.length > 0) {
				await tx.insert(damagesTable).values(
					damageRows.map((row) => ({
						...row,
						id: getMappedId(damageIdMap, row.id, "damage"),
						recordId: getMappedId(
							disasterRecordIdMap,
							row.recordId,
							"disaster record",
						),
						assetId: getMappedId(assetIdMap, row.assetId, "asset"),
					})),
				);
			}

			const entityIds = [
				...disasterRecordIds,
				...hazardousEvents.map((row) => row.id),
				...disasterEvents.map((row) => row.id),
			];

			if (entityIds.length > 0) {
				const validationAssignments = await tx
					.select()
					.from(entityValidationAssignmentTable)
					.where(inArray(entityValidationAssignmentTable.entityId, entityIds));

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
					await tx
						.insert(entityValidationAssignmentTable)
						.values(clonedValidationAssignments);
				}

				const validationRejections = await tx
					.select()
					.from(entityValidationRejectionTable)
					.where(inArray(entityValidationRejectionTable.entityId, entityIds));

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
					await tx
						.insert(entityValidationRejectionTable)
						.values(clonedValidationRejections);
				}
			}
		}

		return { success: true, newCountryAccount };
	});
}

export async function deleteInstance(countryAccountId: string) {
	console.log("Deleting instance data for:", countryAccountId);
	return dr.transaction(async (tx) => {
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

		const disasterEvents = await DisasterEventRepository.getByCountryAccountsId(
			countryAccountId,
			tx,
		);
		const disasterEventIds = disasterEvents.map((r) => r.id);

		if (recordIds.length > 0) {
			// 1. delete records from tables related to human_dsg — needs dsg ids first
			const dsgRecords = await HumanDsgRepository.getByRecordIds(recordIds, tx);
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
		await divisionRepository.deleteByCountryAccountId(countryAccountId, tx);
		await UserCountryAccountRepository.deleteByCountryAccountIdAndIsPrimaryAdmin(
			countryAccountId,
			false,
			tx,
		);
		await OrganizationRepository.deleteByCountryAccountId(countryAccountId, tx);
		await DevExample1Repository.deleteByCountryAccountId(countryAccountId, tx);

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
}
