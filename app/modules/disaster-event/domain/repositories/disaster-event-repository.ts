import type {
	DisasterEvent,
	DisasterEventApprovalStatus,
	DisasterEventListItem,
	DisasterEventWriteModel,
} from "~/modules/disaster-event/domain/entities/disaster-event";

export interface DisasterEventPagination {
	totalItems: number;
	itemsOnThisPage: number;
	page: number;
	pageSize: number;
	extraParams: Record<string, string[]>;
}

export interface ListDisasterEventsQuery {
	countryAccountsId: string;
	search?: string;
	recordingInstitution?: string;
	approvalStatus?: DisasterEventApprovalStatus;
	fromDate?: string;
	toDate?: string;
	pagination: {
		page: number;
		pageSize: number;
	};
}

export interface ListDisasterEventsResult {
	items: DisasterEventListItem[];
	pagination: DisasterEventPagination;
}

export interface DisasterEventRepositoryPort {
	create(data: DisasterEventWriteModel): Promise<DisasterEvent | null>;
	findById(
		id: string,
		countryAccountsId: string,
	): Promise<DisasterEvent | null>;
	updateById(
		id: string,
		countryAccountsId: string,
		data: Partial<DisasterEventWriteModel>,
	): Promise<DisasterEvent | null>;
	deleteById(
		id: string,
		countryAccountsId: string,
	): Promise<DisasterEvent | null>;
	listByCountryAccountsId(
		args: ListDisasterEventsQuery,
	): Promise<ListDisasterEventsResult>;
}
