import type { Asset } from "~/modules/assets/domain/entities/asset";
import type { AssetRepositoryPort } from "~/modules/assets/domain/repositories/asset-repository";

export interface GetAssetByIdInput {
	id: string;
}

export class GetAssetByIdUseCase {
	constructor(private readonly repository: AssetRepositoryPort) {}

	async execute(input: GetAssetByIdInput): Promise<Asset | null> {
		return this.repository.findById(input.id);
	}
}
