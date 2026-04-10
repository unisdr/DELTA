import type { GeographicLevelsPageData } from "~/modules/geographic-levels/domain/entities/geographic-level";
import type { GeographicLevelRepositoryPort } from "~/modules/geographic-levels/domain/repositories/geographic-level-repository";
import { paginationQueryFromURL } from "~/frontend/pagination/api.server";
import { buildTree } from "~/components/TreeView";

interface GetGeographicLevelsPageDataInput {
	request: Request;
	countryAccountsId: string;
	parentId: string | null;
}

export class GetGeographicLevelsPageDataUseCase {
	constructor(private readonly repository: GeographicLevelRepositoryPort) {}

	async execute(
		input: GetGeographicLevelsPageDataInput,
	): Promise<GeographicLevelsPageData> {
		const langs = await this.repository.getLanguageCounts(
			input.parentId,
			input.countryAccountsId,
		);

		const selectedLangs = Object.entries(langs)
			.sort(([ak, ac], [bk, bc]) => {
				if (bc !== ac) {
					return bc - ac;
				}
				return ak.localeCompare(bk);
			})
			.slice(0, 3)
			.map(([lang]) => lang)
			.sort();

		const breadcrumbs = input.parentId
			? await this.repository.getBreadcrumb(
					input.parentId,
					input.countryAccountsId,
				)
			: null;

		const pagination = paginationQueryFromURL(input.request, ["parent"]);
		const [totalItems, items, treeSource] = await Promise.all([
			this.repository.countByParent(input.parentId, input.countryAccountsId),
			this.repository.listByParent(
				input.parentId,
				input.countryAccountsId,
				pagination.query.skip,
				pagination.query.take,
			),
			this.repository.listAllForTree(input.countryAccountsId),
		]);

		const treeData = buildTree(treeSource, "id", "parentId", "name", "en");

		return {
			langs,
			selectedLangs,
			breadcrumbs,
			treeData,
			items,
			pagination: {
				totalItems,
				itemsOnThisPage: Number(items.length),
				...pagination.viewData,
			},
		};
	}
}
