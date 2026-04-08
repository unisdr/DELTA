import { eq } from "drizzle-orm";
import { countryAccountStatuses } from "~/drizzle/schema/countryAccountsTable";
import { userCountryAccountsTable } from "~/drizzle/schema/userCountryAccountsTable";
import type {
	InstanceOption,
	SelectInstanceRepositoryPort,
} from "~/modules/select-instance/domain/repositories/select-instance-repository";
import type { SelectInstanceDb } from "~/modules/select-instance/infrastructure/db/client.server";

export class DrizzleSelectInstanceRepository implements SelectInstanceRepositoryPort {
	constructor(private readonly db: SelectInstanceDb) {}

	async getActiveInstancesForUser(userId: string): Promise<InstanceOption[]> {
		const results = await this.db.query.userCountryAccountsTable.findMany({
			where: eq(userCountryAccountsTable.userId, userId),
			with: {
				countryAccount: {
					with: {
						country: true,
					},
				},
			},
		});

		const options: InstanceOption[] = [];
		for (const item of results) {
			const { countryAccount, ...uca } = item;
			if (!countryAccount) continue;
			if (countryAccount.status !== countryAccountStatuses.ACTIVE) continue;
			const { country, ...ca } = countryAccount;
			if (!country) continue;
			options.push({ ...uca, countryAccount: { ...ca, country } });
		}
		return options;
	}
}
