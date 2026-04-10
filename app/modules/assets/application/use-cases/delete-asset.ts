import type {
	AssetDeleteResult,
	AssetRepositoryPort,
} from "~/modules/assets/domain/repositories/asset-repository";

export interface DeleteAssetInput {
	id: string;
	countryAccountsId: string;
}

export class DeleteAssetUseCase {
	constructor(private readonly repository: AssetRepositoryPort) {}

	async execute(input: DeleteAssetInput): Promise<AssetDeleteResult> {
		return this.repository.deleteById(input.id, input.countryAccountsId);
	}
}
