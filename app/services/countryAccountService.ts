import { randomBytes } from "crypto";
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
import {
	countryAccountWithTypeExists,
	createCountryAccount,
	getCountryAccountWithCountryById,
	updateCountryAccount,
} from "~/db/queries/countryAccounts";
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
import { createInstanceSystemSetting } from "~/db/queries/instanceSystemSetting";
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
} from "~/drizzle/schema/countryAccounts";

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
		errors.push("Invalide instance type");
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
		(await countryAccountWithTypeExists(
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
		const countryAccount = await createCountryAccount(
			countryId,
			status,
			countryAccountType,
			shortDescription,
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
		const instanceSystemSetting = createInstanceSystemSetting(
			country.name,
			country.iso3 || "",
			countryAccount.id,
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
	const countryAccount = await getCountryAccountWithCountryById(id);
	if (!countryAccount) {
		throw new CountryAccountValidationError([
			`Country accounts id:${id} does not exist`,
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

	const updatedCountryAccount = await updateCountryAccount(
		id,
		status,
		shortDescription,
	);
	return { updatedCountryAccount };
}

export async function resetInstanceData(countryAccountId: string) {
	console.log("Resetting instance data for:", countryAccountId);
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

		return true;
	});
}
