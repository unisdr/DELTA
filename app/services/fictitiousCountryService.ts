import { CountryRepository } from "~/db/queries/countriesRepository";
import { COUNTRY_TYPE, SelectCountries } from "~/drizzle/schema/countriesTable";

const FICTIONAL_COUNTRY_FLAG_URL = "/assets/country-instance-logo.png";

export class FictitiousCountryValidationError extends Error {
	constructor(public errors: string[]) {
		super("Fictitious country validation failed");
		this.name = "FictitiousCountryValidationError";
	}
}

export class FictitiousCountryNotFoundError extends Error {
	constructor() {
		super("Fictitious country not found");
		this.name = "FictitiousCountryNotFoundError";
	}
}

function isUniqueViolation(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	return error.message.toLowerCase().includes("unique");
}

function isForeignKeyDeleteViolation(error: unknown): boolean {
	if (!error || typeof error !== "object") {
		return false;
	}

	const err = error as {
		code?: string;
		message?: string;
		cause?: { code?: string; message?: string };
	};

	if (err.code === "23503" || err.cause?.code === "23503") {
		return true;
	}

	const message =
		`${err.message ?? ""} ${err.cause?.message ?? ""}`.toLowerCase();
	return message.includes("foreign key") || message.includes("violates");
}

export const FictitiousCountryService = {
	async getById(id: string): Promise<SelectCountries | null> {
		const country = await CountryRepository.getById(id);
		if (!country || country.type !== COUNTRY_TYPE.FICTIONAL) {
			return null;
		}
		return country;
	},

	async getAllFictionalOrderByName() {
		return CountryRepository.getByTypeOrderByName(COUNTRY_TYPE.FICTIONAL);
	},

	async create(nameInput: string): Promise<void> {
		const name = nameInput.trim();
		if (!name) {
			throw new FictitiousCountryValidationError(["Name is required"]);
		}

		const duplicate = await CountryRepository.getByName(name);
		if (duplicate) {
			throw new FictitiousCountryValidationError([
				"A country with this name already exists",
			]);
		}

		try {
			await CountryRepository.create({
				name,
				type: COUNTRY_TYPE.FICTIONAL,
				iso3: null,
				flagUrl: FICTIONAL_COUNTRY_FLAG_URL,
			});
		} catch (error) {
			if (isUniqueViolation(error)) {
				throw new FictitiousCountryValidationError([
					"A country with this name already exists",
				]);
			}
			throw error;
		}
	},

	async update(id: string, nameInput: string): Promise<void> {
		const name = nameInput.trim();
		if (!name) {
			throw new FictitiousCountryValidationError(["Name is required"]);
		}

		const existing = await FictitiousCountryService.getById(id);
		if (!existing) {
			throw new FictitiousCountryNotFoundError();
		}

		const duplicate = await CountryRepository.getByName(name);
		if (duplicate && duplicate.id !== id) {
			throw new FictitiousCountryValidationError([
				"A country with this name already exists",
			]);
		}

		try {
			await CountryRepository.updateById(id, {
				name,
				type: COUNTRY_TYPE.FICTIONAL,
				iso3: null,
			});
		} catch (error) {
			if (isUniqueViolation(error)) {
				throw new FictitiousCountryValidationError([
					"A country with this name already exists",
				]);
			}
			throw error;
		}
	},

	async delete(id: string): Promise<void> {
		const existing = await FictitiousCountryService.getById(id);
		if (!existing) {
			throw new FictitiousCountryNotFoundError();
		}

		try {
			await CountryRepository.deleteById(id);
		} catch (error) {
			if (isForeignKeyDeleteViolation(error)) {
				throw new FictitiousCountryValidationError([
					"This fictitious country cannot be deleted because it is used by other records.",
				]);
			}
			throw error;
		}
	},
};
