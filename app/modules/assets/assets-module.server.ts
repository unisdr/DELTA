import { DeleteAssetUseCase } from "~/modules/assets/application/use-cases/delete-asset";
import { GetAssetByIdUseCase } from "~/modules/assets/application/use-cases/get-asset-by-id";
import { ListAssetsUseCase } from "~/modules/assets/application/use-cases/list-assets";
import { SaveAssetUseCase } from "~/modules/assets/application/use-cases/save-asset";
import { getAssetDb } from "~/modules/assets/infrastructure/db/client.server";
import { DrizzleAssetRepository } from "~/modules/assets/infrastructure/repositories/drizzle-asset-repository.server";

function buildAssetRepository() {
	return new DrizzleAssetRepository(getAssetDb());
}

export function makeAssetRepository(): DrizzleAssetRepository {
	return buildAssetRepository();
}

export function makeListAssetsUseCase(): ListAssetsUseCase {
	return new ListAssetsUseCase(buildAssetRepository());
}

export function makeGetAssetByIdUseCase(): GetAssetByIdUseCase {
	return new GetAssetByIdUseCase(buildAssetRepository());
}

export function makeSaveAssetUseCase(): SaveAssetUseCase {
	return new SaveAssetUseCase(buildAssetRepository());
}

export function makeDeleteAssetUseCase(): DeleteAssetUseCase {
	return new DeleteAssetUseCase(buildAssetRepository());
}
