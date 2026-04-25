import { Errors } from "~/frontend/form";

export type ErrorResult<T> = { ok: false; errors: Errors<T> };

export type CreateResult<T> = { ok: true; id: any } | ErrorResult<T>;

export type UpdateResult<T> = { ok: true } | ErrorResult<T>;
