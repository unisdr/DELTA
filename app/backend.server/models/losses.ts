import { dr, Tx } from '~/db.server';
import { lossesTable, InsertLosses, disasterRecordsTable } from '~/drizzle/schema';
import { and, eq } from 'drizzle-orm';

import { CreateResult, DeleteResult, UpdateResult } from '~/backend.server/handlers/form/form';
import { Errors, FormInputDef, hasErrors } from '~/frontend/form';
import { deleteByIdForStringId } from './common';
import { unitsEnum } from '~/frontend/unit_picker';
import { typeEnumAgriculture, typeEnumNotAgriculture } from '~/frontend/losses_enums';
import { getDisasterRecordsByIdAndCountryAccountsId } from '~/db/queries/disasterRecords';
import { BackendContext } from '../context';
import { DContext } from '~/utils/dcontext';

export interface LossesFields extends Omit<InsertLosses, 'id'> {}

export function fieldsForPubOrPriv(
    ctx: DContext,
    pub: boolean,
    currencies?: string[],
): FormInputDef<LossesFields>[] {
    let pre = pub ? 'public' : 'private';

    if (!currencies) {
        currencies = ['USD'];
    }

    return [
        {
            key: (pre + 'Unit') as keyof LossesFields,
            label: ctx.t({ code: 'disaster_records.losses.value_unit', msg: 'Value Unit' }),
            type: 'enum',
            enumData: unitsEnum,
            uiRow: { colOverride: 5 },
        },
        {
            key: (pre + 'Units') as keyof LossesFields,
            label: ctx.t({ code: 'disaster_records.losses.value', msg: 'Value' }),
            type: 'number',
        },
        {
            key: (pre + 'CostUnit') as keyof LossesFields,
            label: ctx.t({ code: 'disaster_records.losses.cost_per_unit', msg: 'Cost per unit' }),
            type: 'money',
        },
        {
            key: (pre + 'CostUnitCurrency') as keyof LossesFields,
            label: ctx.t({ code: 'disaster_records.losses.cost_currency', msg: 'Cost currency' }),
            type: 'enum-flex',
            enumData: currencies.map((c) => ({ key: c, label: c })),
        },
        {
            key: (pre + 'CostTotal') as keyof LossesFields,
            label: ctx.t({ code: 'disaster_records.losses.total_cost', msg: 'Total cost' }),
            type: 'money',
            uiRow: {},
        },
        {
            key: (pre + 'CostTotalOverride') as keyof LossesFields,
            label: ctx.t({ code: 'common.override', msg: 'Override' }),
            type: 'bool',
        },
    ];
}

// export function fieldsDef(): FormInputDef<LossesFields>[] {
export const createFieldsDef = (ctx: DContext, currencies: string[]) => {
    const fieldsDef: FormInputDef<LossesFields>[] = [
        { key: 'recordId', label: '', type: 'uuid' },
        { key: 'sectorId', label: '', type: 'other' },
        { key: 'sectorIsAgriculture', label: '', type: 'bool' },
        {
            key: 'typeNotAgriculture',
            label: ctx.t({ code: 'common.type', msg: 'Type' }),
            type: 'enum',
            enumData: [
                {
                    key: 'infrastructure_temporary',
                    label: ctx.t({
                        code: 'disaster_records.losses.infrastructure_temporary',
                        msg: 'Infrastructure- temporary for service/production continuity',
                    }),
                },
                {
                    key: 'production_service_delivery_and_availability',
                    label: ctx.t({
                        code: 'disaster_records.losses.production_service_delivery_and_availability',
                        msg: 'Production, Service delivery and availability of/access to goods and services',
                    }),
                },
                {
                    key: 'governance_and_decision_making',
                    label: ctx.t({
                        code: 'disaster_records.losses.governance_and_decision_making',
                        msg: 'Governance and decision-making',
                    }),
                },
                {
                    key: 'risk_and_vulnerabilities',
                    label: ctx.t({
                        code: 'disaster_records.losses.risk_and_vulnerabilities',
                        msg: 'Risk and vulnerabilities',
                    }),
                },
                {
                    key: 'other_losses',
                    label: ctx.t({
                        code: 'disaster_records.losses.other_losses',
                        msg: 'Other losses',
                    }),
                },
                {
                    key: 'employment_and_livelihoods_losses',
                    label: ctx.t({
                        code: 'disaster_records.losses.employment_and_livelihoods_losses',
                        msg: 'Employment and Livelihoods losses',
                    }),
                },
            ],
            uiRow: {},
        },
        {
            key: 'typeAgriculture',
            label: ctx.t({ code: 'common.type', msg: 'Type' }),
            type: 'enum',
            enumData: [
                {
                    key: 'infrastructure_temporary',
                    label: ctx.t({
                        code: 'disaster_records.losses.infrastructure_temporary',
                        msg: 'Infrastructure- temporary for service/production continuity',
                    }),
                },
                {
                    key: 'production_losses',
                    label: ctx.t({
                        code: 'disaster_records.losses.production_losses',
                        msg: 'Production losses',
                    }),
                },
                {
                    key: 'production_service_delivery_and_availability',
                    label: ctx.t({
                        code: 'disaster_records.losses.production_service_delivery_and_availability',
                        msg: 'Production, Service delivery and availability of/access to goods and services',
                    }),
                },
                {
                    key: 'governance_and_decision_making',
                    label: ctx.t({
                        code: 'disaster_records.losses.governance_and_decision_making',
                        msg: 'Governance and decision-making',
                    }),
                },
                {
                    key: 'risk_and_vulnerabilities',
                    label: ctx.t({
                        code: 'disaster_records.losses.risk_and_vulnerabilities',
                        msg: 'Risk and vulnerabilities',
                    }),
                },
                {
                    key: 'other_losses',
                    label: ctx.t({
                        code: 'disaster_records.losses.other_losses',
                        msg: 'Other losses',
                    }),
                },
                {
                    key: 'employment_and_livelihoods_losses',
                    label: ctx.t({
                        code: 'disaster_records.losses.employment_and_livelihoods_losses',
                        msg: 'Employment and Livelihoods losses',
                    }),
                },
            ],
            uiRow: {},
        },
        {
            key: 'relatedToNotAgriculture',
            label: ctx.t({ code: 'disaster_records.losses.related_to', msg: 'Related To' }),
            type: 'enum',
            enumData: typeEnumNotAgriculture(ctx).map((v) => ({
                key: v.key,
                label: v.label,
            })),
        },
        {
            key: 'relatedToAgriculture',
            label: ctx.t({ code: 'disaster_records.losses.related_to', msg: 'Related To' }),
            type: 'enum',
            enumData: typeEnumAgriculture(ctx).map((v) => ({
                key: v.key,
                label: v.label,
            })),
        },
        {
            key: 'description',
            label: ctx.t({ code: 'common.description', msg: 'Description' }),
            type: 'textarea',
            uiRowNew: true,
        },

        // Public
        ...fieldsForPubOrPriv(ctx, true, currencies),
        // Private
        ...fieldsForPubOrPriv(ctx, false, currencies),

        {
            key: 'spatialFootprint',
            label: ctx.t({ code: 'common.spatial_footprint', msg: 'Spatial footprint' }),
            type: 'other',
            psqlType: 'jsonb',
            uiRowNew: true,
        },
        {
            key: 'attachments',
            label: ctx.t({ code: 'common.attachments', msg: 'Attachments' }),
            type: 'other',
            psqlType: 'jsonb',
        },
    ];
    return fieldsDef;
};

export const createFieldsDefApi = (ctx: DContext, currencies: string[]) => {
    const fieldsDefApi: FormInputDef<LossesFields>[] = [
        ...createFieldsDef(ctx, currencies),
        { key: 'apiImportId', label: '', type: 'other' },
    ];
    return fieldsDefApi;
};

// export const fieldsDefApi: FormInputDef<LossesFields>[] = [
// 	...fieldsDef,
// 	{ key: "apiImportId", label: "", type: "other" },
// ];
export async function fieldsDefView(
    ctx: DContext,
    currencies: string[],
): Promise<FormInputDef<LossesFields>[]> {
    return createFieldsDef(ctx, currencies);
}

// export const fieldsDefView: FormInputDef<LossesFields>[] = [...fieldsDef];

export function validate(fields: Partial<LossesFields>): Errors<LossesFields> {
    let errors: Errors<LossesFields> = { fields: {} };
    let msg = 'must be >= 0';
    let check = (k: keyof LossesFields) => {
        if (fields[k] != null && (fields[k] as number) < 0) errors.fields![k] = [msg];
    };
    [
        'publicValue',
        'publicCostPerUnit',
        'publicTotalCost',
        'privateValue',
        'privateCostPerUnit',
        'privateTotalCost',
    ].forEach((k) => check(k as keyof LossesFields));

    return errors;
}

export async function lossesCreate(
    _ctx: BackendContext,
    tx: Tx,
    fields: LossesFields,
): Promise<CreateResult<LossesFields>> {
    let errors = validate(fields);
    if (hasErrors(errors)) return { ok: false, errors };

    if (fields.sectorIsAgriculture) {
        fields.relatedToNotAgriculture = null;
    } else {
        fields.relatedToAgriculture = null;
    }

    const res = await tx
        .insert(lossesTable)
        .values({ ...fields })
        .returning({ id: lossesTable.id });
    return { ok: true, id: res[0].id };
}

export async function lossesUpdate(
    _ctx: BackendContext,
    tx: Tx,
    id: string,
    fields: Partial<LossesFields>,
): Promise<UpdateResult<LossesFields>> {
    let errors = validate(fields);
    if (hasErrors(errors)) return { ok: false, errors };

    if (typeof fields.sectorIsAgriculture == 'boolean') {
        if (fields.sectorIsAgriculture) {
            fields.relatedToNotAgriculture = null;
        } else {
            fields.relatedToAgriculture = null;
        }
    }

    await tx
        .update(lossesTable)
        .set({ ...fields })
        .where(eq(lossesTable.id, id));
    return { ok: true };
}

export async function lossesUpdateByIdAndCountryAccountsId(
    _ctx: BackendContext,
    tx: Tx,
    id: string,
    countryAccountsId: string,
    fields: Partial<LossesFields>,
): Promise<UpdateResult<LossesFields>> {
    let errors = validate(fields);
    if (hasErrors(errors)) return { ok: false, errors };

    let recordId = await getRecordId(tx, id);

    const disasterRecords = getDisasterRecordsByIdAndCountryAccountsId(recordId, countryAccountsId);
    if (!disasterRecords) {
        return {
            ok: false,
            errors: {
                general: ["No matching disaster record found or you don't have access"],
            },
        };
    }

    if (typeof fields.sectorIsAgriculture == 'boolean') {
        if (fields.sectorIsAgriculture) {
            fields.relatedToNotAgriculture = null;
        } else {
            fields.relatedToAgriculture = null;
        }
    }

    await tx
        .update(lossesTable)
        .set({ ...fields })
        .where(eq(lossesTable.id, id));
    return { ok: true };
}

async function getRecordId(tx: Tx, id: string) {
    let rows = await tx
        .select({
            recordId: lossesTable.recordId,
        })
        .from(lossesTable)
        .where(eq(lossesTable.id, id))
        .execute();
    if (!rows.length) throw new Error('not found by id');
    return rows[0].recordId;
}

export type LossesViewModel = Exclude<Awaited<ReturnType<typeof lossesById>>, undefined>;

export async function lossesIdByImportId(tx: Tx, importId: string) {
    const res = await tx
        .select({ id: lossesTable.id })
        .from(lossesTable)
        .where(eq(lossesTable.apiImportId, importId));
    return res.length == 0 ? null : String(res[0].id);
}
export async function lossesIdByImportIdAndCountryAccountsId(
    tx: Tx,
    importId: string,
    countryAccountsId: string,
) {
    const res = await tx
        .select({ id: lossesTable.id })
        .from(lossesTable)
        .innerJoin(disasterRecordsTable, eq(lossesTable.sectorId, disasterRecordsTable.id))
        .where(
            and(
                eq(lossesTable.apiImportId, importId),
                eq(disasterRecordsTable.countryAccountsId, countryAccountsId),
            ),
        );
    return res.length == 0 ? null : String(res[0].id);
}

export async function lossesById(ctx: BackendContext, idStr: string) {
    return lossesByIdTx(ctx, dr, idStr);
}

export async function lossesByIdTx(_ctx: BackendContext, tx: Tx, id: string) {
    let res = await tx.query.lossesTable.findFirst({
        where: eq(lossesTable.id, id),
    });
    if (!res) throw new Error('Id is invalid');
    return res;
}

export async function lossesDeleteById(id: string): Promise<DeleteResult> {
    await deleteByIdForStringId(id, lossesTable);
    return { ok: true };
}

export async function lossesDeleteBySectorId(id: string): Promise<DeleteResult> {
    await dr.delete(lossesTable).where(eq(lossesTable.sectorId, id));

    return { ok: true };
}
