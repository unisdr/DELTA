export interface SectorDisasterRecord {
	disRecSectorsId: string;
	disRecSectorsWithDamage: boolean;
	disRecSectorsDamageCost: number | null;
	disRecSectorsDamageCostCurrency: string | null;
	disRecSectorsDamageRecoveryCost: number | null;
	disRecSectorsDamageRecoveryCostCurrency: string | null;
	disRecSectorsWithDisruption: boolean;
	disRecSectorsWithLosses: boolean;
	disRecSectorsLossesCost: number | null;
	disRecSectorsLossesCostCurrency: string | null;
	disRecSectorsdisasterRecordId: string;
	disRecSectorsSectorId: string;

	catId: string | null;
	catName: string | null;

	sectorTreeDisplay: string;
	sectorTreeDisplayIds: string;
}
