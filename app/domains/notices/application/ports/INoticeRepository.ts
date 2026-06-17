import type { Notice } from "../../domain/Notice";
import type { Pagination } from "~/shared/types";

/**
 * Repository port for the Notices domain.
 *
 * This interface is the Dependency Inversion boundary between the application
 * layer and the infrastructure layer. Use-cases depend on this interface; the
 * Drizzle adapter (`DrizzleNoticeRepository`, Phase 4g) implements it.
 *
 * Multi-tenancy contract: every method that reads from or writes to persistence
 * MUST receive `tenantId` as an explicit parameter. No method may assume a
 * global or ambient tenant context. `save` receives tenancy implicitly via the
 * `Notice` entity itself (the entity's `tenantId` property carries it).
 *
 * Error contract: `findById` throws `NotFoundError` (from `app/shared/errors/`)
 * when no notice exists for the given `id` + `tenantId` pair. Callers must
 * catch `NotFoundError` rather than checking for a null return value.
 */
export interface INoticeRepository {
	/**
	 * Retrieves a single notice by its id within a specific tenant.
	 * Throws `NotFoundError` if no matching notice exists.
	 *
	 * @param id - The notice UUID.
	 * @param tenantId - Scopes the lookup to a single tenant; prevents cross-tenant reads.
	 */
	findById(id: string, tenantId: string): Promise<Notice>;

	/**
	 * Retrieves a paginated list of notices for a specific tenant.
	 *
	 * @param tenantId - Scopes the query to a single tenant; prevents cross-tenant reads.
	 * @param pagination - 1-based page number and page size.
	 */
	findAll(tenantId: string, pagination: Pagination): Promise<Notice[]>;

	/**
	 * Persists a notice entity (INSERT or UPDATE depending on whether it already exists).
	 * The notice's `tenantId` property carries the tenant context — no separate parameter needed.
	 *
	 * @param notice - The notice entity to persist.
	 * @returns The saved notice as it now exists in the store.
	 */
	save(notice: Notice): Promise<Notice>;

	/**
	 * Permanently removes a notice from the store.
	 *
	 * @param id - The notice UUID to delete.
	 * @param tenantId - Scopes the delete to a single tenant; prevents cross-tenant deletes.
	 */
	delete(id: string, tenantId: string): Promise<void>;
}
