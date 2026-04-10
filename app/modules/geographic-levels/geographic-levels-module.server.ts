import { ExportGeographicLevelsCsvUseCase } from "~/modules/geographic-levels/application/use-cases/export-geographic-levels-csv";
import { GetGeographicLevelByIdUseCase } from "~/modules/geographic-levels/application/use-cases/get-geographic-level-by-id";
import { GetGeographicLevelsPageDataUseCase } from "~/modules/geographic-levels/application/use-cases/get-geographic-levels-page-data";
import { UpdateGeographicLevelUseCase } from "~/modules/geographic-levels/application/use-cases/update-geographic-level";
import { UploadGeographicLevelsZipUseCase } from "~/modules/geographic-levels/application/use-cases/upload-geographic-levels-zip";
import { getGeographicLevelsDb } from "~/modules/geographic-levels/infrastructure/db/client.server";
import { DrizzleGeographicLevelRepository } from "~/modules/geographic-levels/infrastructure/repositories/drizzle-geographic-level-repository.server";

function buildGeographicLevelRepository() {
	return new DrizzleGeographicLevelRepository(getGeographicLevelsDb());
}

export function makeGeographicLevelRepository(): DrizzleGeographicLevelRepository {
	return buildGeographicLevelRepository();
}

export function makeGetGeographicLevelsPageDataUseCase(): GetGeographicLevelsPageDataUseCase {
	return new GetGeographicLevelsPageDataUseCase(
		buildGeographicLevelRepository(),
	);
}

export function makeGetGeographicLevelByIdUseCase(): GetGeographicLevelByIdUseCase {
	return new GetGeographicLevelByIdUseCase(buildGeographicLevelRepository());
}

export function makeUpdateGeographicLevelUseCase(): UpdateGeographicLevelUseCase {
	return new UpdateGeographicLevelUseCase(buildGeographicLevelRepository());
}

export function makeUploadGeographicLevelsZipUseCase(): UploadGeographicLevelsZipUseCase {
	return new UploadGeographicLevelsZipUseCase();
}

export function makeExportGeographicLevelsCsvUseCase(): ExportGeographicLevelsCsvUseCase {
	return new ExportGeographicLevelsCsvUseCase(buildGeographicLevelRepository());
}
