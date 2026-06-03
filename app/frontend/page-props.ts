/**
 * Contract for all page-level components in the Clean Architecture migration.
 * Page components MUST accept loader data via this prop and MUST NOT call
 * useLoaderData() internally. The route file is the sole adapter that calls
 * useLoaderData() and passes the result as the `data` prop.
 */
export type PageProps<T> = {
	data: T;
};
