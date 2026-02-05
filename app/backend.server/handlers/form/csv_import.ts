import { Tx } from '~/db.server';

import { authActionWithPerm } from '~/util/auth';

import type { ActionFunctionArgs } from 'react-router';
import { parseFormData } from '@mjackson/form-data-parser';

import { parseCSV } from '~/util/csv';

import { ObjectWithImportId, CreateResult, UpdateResult } from './form';

import {
	csvCreate,
	csvUpdate,
	csvUpsert,
	CsvCreateRes,
	CsvUpdateRes,
	CsvUpsertRes,
	csvImportExample,
	ImportType,
} from './form_csv';

import { ErrorWithCode } from './form_utils';

import { FormInputDef } from '~/frontend/form';

import { authLoaderWithPerm } from '~/util/auth';

import { stringifyCSV } from '~/util/csv';
import { getCountryAccountsIdFromSession } from '~/util/session';
import { BackendContext } from '~/backend.server/context';

interface CreateActionArgs<T extends ObjectWithImportId> {
	fieldsDef: (ctx: BackendContext) => Promise<FormInputDef<T>[]>;

	create: (
		ctx: BackendContext,
		tx: Tx,
		data: T,
		countryAccountsId: string
	) => Promise<CreateResult<T>>;
	update: (
		ctx: BackendContext,
		tx: Tx,
		id: string,
		data: Partial<T>,
		countryAccountsId: string,
	) => Promise<UpdateResult<T>>;
	idByImportId: (tx: Tx, importId: string) => Promise<string | null>;
}

interface ErrorRes {
	ok: false;
	error: ErrorWithCode;
}

export interface Res {
	imported?: number;
	res: CsvCreateRes | CsvUpdateRes | CsvUpsertRes | ErrorRes;
}

export function createAction<T extends ObjectWithImportId>(args: CreateActionArgs<T>) {
	return authActionWithPerm('EditData', async (actionArgs: ActionFunctionArgs): Promise<Res> => {
		const { request } = actionArgs;
		const ctx = new BackendContext(actionArgs);

		let fieldsDef = await args.fieldsDef(ctx);

		try {
			// ✅ NEW: parse multipart form data
			const formData = await parseFormData(request, {
				maxFileSize: 10_000_000, // adjust if needed
			});

			const file = formData.get('file');
			if (!(file instanceof File)) {
				throw new Error('File was not set');
			}

			const fileString = await file.text();
			const importType = formData.get('import_type');

			const all = await parseCSV(fileString);
			const imported = all.length - 1;

			try {
				const countryAccountsId = await getCountryAccountsIdFromSession(request);

				switch (importType) {
					case 'create': {
						const res = await csvCreate<T>(
							{
								ctx,
								data: all,
								fieldsDef,
								create: args.create,
							},
							countryAccountsId,
						);
						return res.ok ? { imported, res } : { res };
					}

					case 'update': {
						const res = await csvUpdate<T>(
							{
								ctx,
								data: all,
								fieldsDef,
								update: args.update,
							},
							countryAccountsId,
						);
						return res.ok ? { imported, res } : { res };
					}

					case 'upsert': {
						const res = await csvUpsert<T>(
							{
								ctx,
								data: all,
								fieldsDef,
								create: args.create,
								update: args.update,
								idByImportIdAndCountryAccountsId: args.idByImportId,
							},
							countryAccountsId,
						);
						return res.ok ? { imported, res } : { res };
					}
				}
			} catch (e) {
				if (
					typeof e === 'object' &&
					e !== null &&
					'detail' in e &&
					typeof (e as any).detail === 'string'
				) {
					return {
						res: {
							ok: false,
							error: {
								code: 'pg_error',
								message: (e as any).detail,
							},
						},
					};
				}
				throw e;
			}

			return {
				res: {
					ok: false,
					error: {
						code: 'invalid_import_type',
						message: 'Invalid import_type',
					},
				},
			};
		} catch (err) {
			console.error('Could not import csv', err);
			return {
				res: {
					ok: false,
					error: {
						code: 'server_error',
						message: 'Server error',
					},
				},
			};
		}
	});
}

interface CreateExampleLoaderArgs<T> {
	fieldsDef: (ctx: BackendContext) => Promise<FormInputDef<T>[]>;
}

export function createExampleLoader<T>(args: CreateExampleLoaderArgs<T>) {
	return authLoaderWithPerm('EditData', async (loaderArgs) => {
		const ctx = new BackendContext(loaderArgs);
		const { request } = loaderArgs;
		const url = new URL(request.url);
		const importType = url.searchParams.get('import_type') || '';
		if (!['create', 'update', 'upsert'].includes(importType)) {
			return new Response('Not Found', { status: 404 });
		}
		let fieldsDef = await args.fieldsDef(ctx);
		let res = await csvImportExample({
			importType: importType as ImportType,
			fieldsDef: fieldsDef,
		});
		if (!res.ok) {
			return new Response(res.error, {
				status: 500,
				headers: { 'Content-Type': 'text/plain' },
			});
		}
		let data = await stringifyCSV(res.res!);
		const parts = url.pathname.split('/').filter((s) => s !== '');
		const typeName = parts.length > 1 ? parts[parts.length - 2] : '';
		let filename = typeName + '-' + importType;
		return new Response(data, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="${filename}.csv"`,
			},
		});
	});
}
