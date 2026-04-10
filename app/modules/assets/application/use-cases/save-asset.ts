import type { AssetRepositoryPort } from "~/modules/assets/domain/repositories/asset-repository";

export interface SaveAssetInput {
	id: string | null;
	countryAccountsId: string;
	name: string;
	category: string;
	notes: string;
	sectorIds: string;
	nationalId?: string | null;
}

export class SaveAssetUseCase {
	constructor(private readonly repository: AssetRepositoryPort) {}

	async execute(input: SaveAssetInput): Promise<{ id: string }> {
		const { id, countryAccountsId, ...data } = input;

		if (!id || id === "new") {
			return this.repository.create(data, countryAccountsId);
		}

		await this.repository.update(id, countryAccountsId, data);
		return { id };
	}
}
