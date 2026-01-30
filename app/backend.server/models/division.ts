import { SQL, sql, eq, isNull, and } from 'drizzle-orm';

import { selectTranslated } from './common';

import { divisionTable, InsertDivision, SelectDivision } from '~/drizzle/schema';

import { dr, Tx } from '~/db.server';

import { parse } from 'csv-parse';
import JSZip from 'jszip';

// Import utility functions
import { createLogger } from '~/utils/logger';
import {
    ValidationError,
    DatabaseError,
    GeoDataError,
    ImportError,
    TransactionError,
    AppError,
} from '~/utils/errors';
import { validateGeoJSON } from '~/utils/geoValidation';

// Create logger
const logger = createLogger('division');

export class UserError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UserError';
    }
}

export async function divisionsAllLanguages(
    parentId: string | null,
    _langs: string[],
    countryAccountsId: string,
): Promise<Record<string, number>> {
    // Note: Parameter is prefixed with underscore to indicate it's intentionally unused but kept for API consistency
    try {
        return await dr.transaction(async (tx: Tx) => {
            try {
                // No need to select translations as we're only counting
                const q = tx
                    .select({
                        key: sql<string>`jsonb_object_keys(${divisionTable.name})`,
                        count: sql<number>`COUNT(*)`,
                    })
                    .from(divisionTable)
                    .where(
                        and(
                            parentId
                                ? eq(divisionTable.parentId, parentId)
                                : isNull(divisionTable.parentId),
                            eq(divisionTable.countryAccountsId, countryAccountsId),
                        ),
                    )
                    .groupBy(sql`jsonb_object_keys(${divisionTable.name})`);

                const rows = await q;
                const counts: Record<string, number> = {};
                rows.forEach((row) => {
                    counts[row.key] = Number(row.count);
                });

                return counts;
            } catch (error) {
                logger.error('Failed to get divisions by language', { error, parentId });
                throw new DatabaseError('Failed to get divisions by language', { error, parentId });
            }
        });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new TransactionError('Failed to get divisions by language', { error });
    }
}

export async function deleteAll(countryAccountsId: string) {
    return await dr.transaction(async (tx: Tx) => {
        try {
            const result = await tx
                .delete(divisionTable)
                .where(eq(divisionTable.countryAccountsId, countryAccountsId))
                .returning({ id: divisionTable.id });
            return { deletedCount: result.length };
        } catch (error) {
            logger.error('Failed to delete divisions by country account ID', {
                error,
                countryAccountsId,
            });
            throw new DatabaseError('Failed to delete divisions by country account ID', {
                cause: error,
            });
        }
    });
}

export type DivisionBreadcrumbRow = {
    id: string;
    name: string;
    nameLang: string;
    parentId: string | null;
};

export async function divisionBreadcrumb(
    langs: string[],
    divisionId: string,
    countryAccountsId: string,
): Promise<DivisionBreadcrumbRow[]> {
    try {
        return await dr.transaction(async (tx: Tx) => {
            try {
                const tr = selectTranslated(divisionTable.name, 'name', langs);
                const breadcrumbs: DivisionBreadcrumbRow[] = [];
                let currentId: string | null = divisionId;

                while (currentId !== null) {
                    const select: {
                        id: typeof divisionTable.id;
                        parentId: typeof divisionTable.parentId;
                        name: SQL<string>;
                        nameLang: SQL<string>;
                    } = {
                        id: divisionTable.id,
                        parentId: divisionTable.parentId,
                        name: tr.name,
                        nameLang: tr.nameLang,
                    };

                    const res: DivisionBreadcrumbRow[] = await tx
                        .select(select)
                        .from(divisionTable)
                        .where(
                            and(
                                eq(divisionTable.id, currentId),
                                eq(divisionTable.countryAccountsId, countryAccountsId),
                            ),
                        )
                        .limit(1);

                    const division = res[0];
                    if (!division) break;
                    breadcrumbs.unshift(division);
                    currentId = division.parentId;
                }

                return breadcrumbs;
            } catch (error) {
                logger.error('Failed to get division breadcrumb', { error, divisionId });
                throw new DatabaseError('Failed to get division breadcrumb', { error, divisionId });
            }
        });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new TransactionError('Failed to get division breadcrumb', { error });
    }
}

export function divisionSelect(langs: string[], countryAccountsId: string) {
    let tr = selectTranslated(divisionTable.name, 'name', langs);
    let select: {
        id: typeof divisionTable.id;
        name: SQL<string>;
        nameLang: SQL<string>;
    } = {
        id: divisionTable.id,
        name: tr.name,
        nameLang: tr.nameLang,
    };
    return dr.transaction(async (tx: Tx) => {
        try {
            return await tx
                .select(select)
                .from(divisionTable)
                .where(eq(divisionTable.countryAccountsId, countryAccountsId));
        } catch (error) {
            logger.error('Failed to select divisions', { error });
            throw new DatabaseError('Failed to select divisions', { error });
        }
    });
}

async function parseCSV(data: string): Promise<string[][]> {
    return new Promise((resolve, reject) => {
        const parser = parse({
            delimiter: ',',
        });
        const records: string[][] = [];
        parser.on('readable', function () {
            let record;
            while ((record = parser.read()) !== null) {
                record = record.map((field: string) => field.trim());
                records.push(record);
            }
        });
        parser.on('error', function (err) {
            reject(new UserError(String(err)));
        });

        parser.on('end', function () {
            resolve(records);
        });

        parser.write(data);
        parser.end();
    });
}

// interface ImportItem {
//   ImportID: string;
//   GeodataFileName: string;
// }

// interface FailedUpdate {
//   id: string;
//   error: string;
// }

interface BatchResult {
    id: string;
    success: boolean;
    data?: any;
    error?: string;
}

interface ImportRes {
    success: boolean;
    data?: any;
    error?: string;
}

// Types
interface DivisionData {
    importId: string;
    nationalId: string;
    parent: string;
    geodataFile: string;
    name: Record<string, string>;
}

interface ProcessingResult {
    successfulImports: Set<string>;
    failedImports: Map<string, string>;
    updatedCount: number;
    insertedCount: number;
}

// Main import function
export async function importZip(
    zipBytes: Uint8Array,
    countryAccountsId: string,
): Promise<ImportRes> {
    try {
        const zip = await JSZip.loadAsync(zipBytes);

        // Extract and validate CSV data
        const divisions = await extractDivisionsFromCSV(zip);

        // Build GeoJSON file lookup map
        const geoJsonLookup = buildGeoJsonLookup(zip);

        // Process divisions in correct order (parents before children)
        const result = await processDivisions(divisions, geoJsonLookup, zip, countryAccountsId);

        logger.info('Import completed', {
            totalProcessed: divisions.size,
            successful: result.successfulImports.size,
            failed: result.failedImports.size,
            inserted: result.insertedCount,
            updated: result.updatedCount,
        });

        return {
            success: true,
            data: {
                totalProcessed: divisions.size,
                imported: result.successfulImports.size,
                failed: result.failedImports.size,
                inserted: result.insertedCount,
                updated: result.updatedCount,
                failedDetails: Object.fromEntries(result.failedImports),
            },
        };
    } catch (error) {
        logger.error('Failed to process ZIP file', { error });
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// Extract and parse CSV from ZIP
async function extractDivisionsFromCSV(zip: JSZip): Promise<Map<string, DivisionData>> {
    const csvFile = Object.values(zip.files).find((file) =>
        file.name.toLowerCase().endsWith('.csv'),
    );

    if (!csvFile) {
        throw new ImportError('No CSV file found in ZIP');
    }

    const csvContent = await csvFile.async('text');
    const rows = await parseCSV(csvContent);

    if (rows.length < 2) {
        throw new ImportError('CSV file is empty or contains only headers');
    }

    const headers = rows[0];
    validateCSVHeaders(headers);

    const divisions = new Map<string, DivisionData>();
    const langCodes = extractLanguageCodes(headers);

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const division = parseDivisionRow(row, headers, langCodes);

        if (division) {
            divisions.set(division.importId, division);
        }
    }

    if (divisions.size === 0) {
        throw new ImportError('No valid divisions found in CSV');
    }

    logger.info('Parsed CSV divisions', {
        totalDivisions: divisions.size,
        languages: langCodes,
    });

    return divisions;
}

// Validate CSV headers
function validateCSVHeaders(headers: string[]): void {
    const requiredColumns = ['id', 'parent', 'geodata', 'national_id'];
    const missingColumns = requiredColumns.filter((col) => !headers.includes(col));

    if (missingColumns.length > 0) {
        throw new ImportError(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Check for required 'en' language column
    if (!headers.includes('en')) {
        throw new ImportError(
            'Missing required language column: "en". The English language column is mandatory. ' +
                'You can include additional language columns (e.g., ar, fr, es) but "en" must be present.',
        );
    }
}

// Extract language codes from headers
function extractLanguageCodes(headers: string[]): string[] {
    const requiredColumns = ['id', 'parent', 'geodata', 'national_id'];
    const langCodes = headers.filter((h) => !requiredColumns.includes(h));

    if (langCodes.length === 0) {
        throw new ImportError('No language columns found (e.g., en, ar, fr)');
    }

    return langCodes;
}

// Parse a single division row
function parseDivisionRow(
    row: string[],
    headers: string[],
    langCodes: string[],
): DivisionData | null {
    const id = row[headers.indexOf('id')]?.trim();

    // Skip empty rows
    if (!id) return null;

    const parent = row[headers.indexOf('parent')]?.trim() || '';
    const geodata = row[headers.indexOf('geodata')]?.trim();
    const nationalId = row[headers.indexOf('national_id')]?.trim();

    if (!geodata || !nationalId) {
        logger.warn('Skipping row with missing required fields', { id });
        return null;
    }

    const name: Record<string, string> = {};
    langCodes.forEach((lang) => {
        const value = row[headers.indexOf(lang)]?.trim();
        if (value) {
            name[lang] = value;
        }
    });

    return {
        importId: id,
        nationalId,
        parent,
        geodataFile: geodata,
        name,
    };
}

// Build lookup map for GeoJSON files
function buildGeoJsonLookup(zip: JSZip): Map<string, string> {
    const lookup = new Map<string, string>();

    Object.keys(zip.files).forEach((path) => {
        if (path.toLowerCase().endsWith('.geojson')) {
            const filename = path.split('/').pop()?.toLowerCase() || '';
            lookup.set(filename, path);
        }
    });

    logger.info('Found GeoJSON files', { count: lookup.size });

    return lookup;
}

// Process divisions in hierarchical order (level by level)
async function processDivisions(
    divisions: Map<string, DivisionData>,
    geoJsonLookup: Map<string, string>,
    zip: JSZip,
    countryAccountsId: string,
): Promise<ProcessingResult> {
    const levels = buildHierarchicalLevels(divisions);
    const idMap = new Map<string, string>(); // Maps import_id to database id
    const successfulImports = new Set<string>();
    const failedImports = new Map<string, string>();
    let updatedCount = 0;
    let insertedCount = 0;

    // Pre-load existing divisions into idMap so updates can find parents
    await preloadExistingDivisions(idMap, countryAccountsId);

    logger.info('Processing divisions by level', {
        totalLevels: levels.length,
        distribution: levels.map((level, i) => `Level ${i}: ${level.length}`),
        existingDivisions: idMap.size,
    });

    // Process each level sequentially (parents before children)
    for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
        const divisionIds = levels[levelIndex];

        logger.info(`Processing level ${levelIndex}`, {
            count: divisionIds.length,
        });

        const stats = await processBatch(
            divisionIds,
            divisions,
            geoJsonLookup,
            zip,
            countryAccountsId,
            idMap,
            successfulImports,
            failedImports,
            `level-${levelIndex}`,
        );

        updatedCount += stats.updated;
        insertedCount += stats.inserted;
    }

    return { successfulImports, failedImports, updatedCount, insertedCount };
}

// Build hierarchical levels (roots at 0, their children at 1, etc.)
function buildHierarchicalLevels(divisions: Map<string, DivisionData>): string[][] {
    const levels: string[][] = [];
    const processed = new Set<string>();
    const divisionArray = Array.from(divisions.entries());

    // Level 0: roots (no parent or empty parent)
    const roots = divisionArray
        .filter(([_, div]) => !div.parent || div.parent === '')
        .map(([id, _]) => id);

    if (roots.length === 0) {
        throw new ImportError('No root divisions found (divisions without parent)');
    }

    logger.info('Found root divisions', {
        count: roots.length,
        roots: roots,
    });

    levels.push(roots);
    roots.forEach((id) => processed.add(id));

    // Build subsequent levels
    let currentLevel = 0;
    let hasMore = true;

    while (hasMore && currentLevel < 100) {
        // Safety limit
        const children = divisionArray
            .filter(
                ([id, div]) =>
                    !processed.has(id) &&
                    div.parent &&
                    div.parent !== '' &&
                    processed.has(div.parent),
            )
            .map(([id, _]) => id);

        if (children.length === 0) {
            hasMore = false;
        } else {
            logger.info(`Level ${currentLevel + 1} divisions`, {
                count: children.length,
                examples: children.slice(0, 5),
            });
            levels.push(children);
            children.forEach((id) => processed.add(id));
            currentLevel++;
        }
    }

    // Check for orphaned divisions (parent reference doesn't exist)
    const orphaned = divisionArray
        .filter(([id, div]) => {
            if (processed.has(id)) return false;
            if (!div.parent || div.parent === '') return false;
            return !divisions.has(div.parent);
        })
        .map(([id, div]) => `${id} (parent: ${div.parent})`);

    if (orphaned.length > 0) {
        logger.error('Found divisions with missing parent references', {
            count: orphaned.length,
            examples: orphaned.slice(0, 10),
        });
        throw new ImportError(
            `Invalid parent references found. ${orphaned.length} divisions reference non-existent parents. Examples: ${orphaned.slice(0, 3).join(', ')}`,
        );
    }

    // Check for unprocessed divisions (circular references or other issues)
    const unprocessed = divisionArray
        .filter(([id, _]) => !processed.has(id))
        .map(([id, div]) => `${id} (parent: ${div.parent})`);

    if (unprocessed.length > 0) {
        logger.error('Unprocessed divisions found', {
            count: unprocessed.length,
            examples: unprocessed.slice(0, 10),
        });
    }

    return levels;
}

// Pre-load existing divisions into idMap for updates
async function preloadExistingDivisions(
    idMap: Map<string, string>,
    countryAccountsId: string,
): Promise<void> {
    const existing = await dr
        .select({
            id: divisionTable.id,
            importId: divisionTable.importId,
        })
        .from(divisionTable)
        .where(eq(divisionTable.countryAccountsId, countryAccountsId));

    existing.forEach((div) => {
        if (div.importId) {
            idMap.set(div.importId, div.id);
        }
    });

    logger.info('Pre-loaded existing divisions', {
        count: idMap.size,
    });
}

// Process a batch of divisions (SEQUENTIALLY, not in parallel)
async function processBatch(
    divisionIds: string[],
    divisions: Map<string, DivisionData>,
    geoJsonLookup: Map<string, string>,
    zip: JSZip,
    countryAccountsId: string,
    idMap: Map<string, string>,
    successfulImports: Set<string>,
    failedImports: Map<string, string>,
    batchType: string,
): Promise<{ updated: number; inserted: number }> {
    logger.info(`Processing ${batchType}`, {
        total: divisionIds.length,
    });

    let updated = 0;
    let inserted = 0;

    // Process divisions SEQUENTIALLY to ensure idMap is updated before children need it
    for (let i = 0; i < divisionIds.length; i++) {
        const divisionId = divisionIds[i];

        const result = await processSingleDivision(
            divisionId,
            divisions,
            geoJsonLookup,
            zip,
            countryAccountsId,
            idMap,
        );

        if (result.success) {
            successfulImports.add(divisionId);
            if (result.wasUpdate) {
                updated++;
            } else {
                inserted++;
            }
        } else {
            failedImports.set(divisionId, result.error || 'Unknown error');
        }

        // Log progress every 10 divisions
        if ((i + 1) % 10 === 0 || i + 1 === divisionIds.length) {
            logger.info(`Progress (${batchType})`, {
                processed: i + 1,
                total: divisionIds.length,
                successful: successfulImports.size,
                failed: failedImports.size,
                updated,
                inserted,
            });
        }
    }

    return { updated, inserted };
}

// Process a single division
async function processSingleDivision(
    divisionId: string,
    divisions: Map<string, DivisionData>,
    geoJsonLookup: Map<string, string>,
    zip: JSZip,
    countryAccountsId: string,
    idMap: Map<string, string>,
): Promise<BatchResult & { wasUpdate?: boolean }> {
    try {
        const division = divisions.get(divisionId);
        if (!division) {
            throw new ImportError(`Division not found: ${divisionId}`);
        }

        logger.info('Processing division', {
            importId: division.importId,
            parent: division.parent || 'none',
            geodataFile: division.geodataFile,
            currentIdMapSize: idMap.size,
            hasParentInMap: division.parent ? idMap.has(division.parent) : 'N/A',
        });

        // Find GeoJSON file
        const normalizedFilename = division.geodataFile.toLowerCase();
        const geoJsonPath = geoJsonLookup.get(normalizedFilename);

        if (!geoJsonPath) {
            throw new ImportError(`GeoJSON file not found: ${division.geodataFile}`);
        }

        let geoJsonContent: string;
        try {
            geoJsonContent = await zip.files[geoJsonPath].async('text');
        } catch (error) {
            throw new ImportError(
                `Failed to read GeoJSON file ${division.geodataFile}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }

        // Validate GeoJSON before processing
        let parsedGeoJson: any;
        try {
            parsedGeoJson = JSON.parse(geoJsonContent);
        } catch (error) {
            throw new ImportError(
                `Invalid JSON in file ${division.geodataFile}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }

        // Basic GeoJSON validation
        if (!parsedGeoJson.type) {
            throw new ImportError(
                `Invalid GeoJSON in ${division.geodataFile}: missing 'type' property`,
            );
        }

        // Validate based on GeoJSON type
        const validTypes = [
            'Feature',
            'FeatureCollection',
            'Point',
            'LineString',
            'Polygon',
            'MultiPoint',
            'MultiLineString',
            'MultiPolygon',
            'GeometryCollection',
        ];

        if (!validTypes.includes(parsedGeoJson.type)) {
            throw new ImportError(
                `Invalid GeoJSON in ${division.geodataFile}: unknown type '${parsedGeoJson.type}'`,
            );
        }

        // Import within transaction and get the database ID and operation type
        const { dbId, wasUpdate } = await dr.transaction(async (tx) => {
            return await importDivision(tx, division, idMap, countryAccountsId, geoJsonContent);
        });

        if (!dbId) {
            throw new ImportError('Import failed without error');
        }

        // CRITICAL: Store the mapping AFTER the transaction commits
        idMap.set(division.importId, dbId);

        logger.info('Division imported and mapped', {
            importId: division.importId,
            dbId: dbId,
            idMapSize: idMap.size,
            operation: wasUpdate ? 'updated' : 'inserted',
        });

        return {
            id: divisionId,
            success: true,
            wasUpdate,
        };
    } catch (error) {
        logger.error('Failed to process division', {
            divisionId,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });

        return {
            id: divisionId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

// Import a single division into the database
async function importDivision(
    tx: any, // Your transaction type
    division: DivisionData,
    idMap: Map<string, string>,
    countryAccountsId: string,
    geoJsonContent: string,
): Promise<{ dbId: string; wasUpdate: boolean }> {
    // Parse GeoJSON
    const geojson = JSON.parse(geoJsonContent);

    // Extract geometry based on GeoJSON type
    let geometryJson: any;
    if (geojson.type === 'FeatureCollection') {
        // If it's a FeatureCollection, use the first feature's geometry
        if (!geojson.features || geojson.features.length === 0) {
            throw new ImportError(
                `FeatureCollection in division ${division.importId} has no features`,
            );
        }
        geometryJson = geojson.features[0].geometry;
    } else if (geojson.type === 'Feature') {
        // If it's a Feature, extract the geometry
        geometryJson = geojson.geometry;
    } else {
        // It's already a geometry object
        geometryJson = geojson;
    }

    if (!geometryJson) {
        throw new ImportError(`No geometry found in division ${division.importId}`);
    }

    // Determine parent ID from idMap if parent exists
    let parentId: string | null = null;
    let level = 1;

    if (division.parent && division.parent !== '') {
        parentId = idMap.get(division.parent) || null;
        if (!parentId) {
            logger.error('Parent not found in idMap', {
                divisionId: division.importId,
                parentImportId: division.parent,
                availableParents: Array.from(idMap.keys()),
            });
            throw new ImportError(
                `Parent division not found: ${division.parent} for division ${division.importId}`,
            );
        }

        // Get parent level and increment
        const parent = await tx
            .select({ level: divisionTable.level })
            .from(divisionTable)
            .where(eq(divisionTable.id, parentId))
            .limit(1);

        level = parent[0] ? Number(parent[0].level) + 1 : 1;
    }

    // Check if division already exists
    const existing = await tx
        .select({ id: divisionTable.id })
        .from(divisionTable)
        .where(
            and(
                eq(divisionTable.importId, division.importId),
                eq(divisionTable.countryAccountsId, countryAccountsId),
            ),
        )
        .limit(1);

    let divisionDbId: string;
    let wasUpdate = false;

    if (existing.length > 0) {
        // Update existing division
        divisionDbId = existing[0].id;
        wasUpdate = true;

        await tx
            .update(divisionTable)
            .set({
                nationalId: division.nationalId,
                parentId,
                name: division.name,
                geojson: geojson,
                level: BigInt(level),
                geom: sql`ST_MakeValid(ST_GeomFromGeoJSON(${JSON.stringify(geometryJson)}))`,
                bbox: sql`ST_Envelope(ST_MakeValid(ST_GeomFromGeoJSON(${JSON.stringify(geometryJson)})))`,
            })
            .where(eq(divisionTable.id, divisionDbId));

        logger.debug('Division updated successfully', {
            importId: division.importId,
            dbId: divisionDbId,
            parent: division.parent || 'none',
            level,
        });
    } else {
        // Insert new division
        const [inserted] = await tx
            .insert(divisionTable)
            .values({
                importId: division.importId,
                nationalId: division.nationalId,
                parentId,
                countryAccountsId,
                name: division.name,
                geojson: geojson,
                level: BigInt(level),
                geom: sql`ST_MakeValid(ST_GeomFromGeoJSON(${JSON.stringify(geometryJson)}))`,
                bbox: sql`ST_Envelope(ST_MakeValid(ST_GeomFromGeoJSON(${JSON.stringify(geometryJson)})))`,
            })
            .returning({ id: divisionTable.id });

        divisionDbId = inserted.id;

        logger.debug('Division inserted successfully', {
            importId: division.importId,
            dbId: divisionDbId,
            parent: division.parent || 'none',
            level,
        });
    }

    // Return the database ID and operation type
    return { dbId: divisionDbId, wasUpdate };
}

export function fromForm(formData: Record<string, string>): InsertDivision {
    const { parentId, ...nameFields } = formData;

    const names = Object.entries(nameFields)
        .filter(([key]) => key.startsWith('names[') && key.endsWith(']'))
        .reduce(
            (acc, [key, value]) => {
                const lang = key.slice(6, -1);
                acc[lang] = value;
                return acc;
            },
            {} as { [key: string]: string },
        );

    return {
        parentId: parentId ? parentId : null,
        name: names,
    };
}

/**
 * Validates division data before creation or update
 * Checks for duplicate divisions, validates parent-child relationships,
 * and ensures proper level calculation based on parent
 */
async function validateDivisionData(
    tx: Tx,
    data: InsertDivision,
    countryAccountsId: string,
    existingId?: string,
): Promise<{ valid: boolean; errors: string[]; level?: number }> {
    const errors: string[] = [];
    let level = 1; // Default level for root divisions

    // Validate parent exists and belongs to the same tenant if specified
    if (data.parentId !== null && data.parentId !== undefined) {
        const parent = await tx.query.divisionTable.findFirst({
            where: and(
                eq(divisionTable.id, data.parentId),
                eq(divisionTable.countryAccountsId, countryAccountsId),
            ),
        });

        if (!parent) {
            errors.push(
                `Parent division with ID ${data.parentId} not found or does not belong to the same tenant`,
            );
        } else {
            // Calculate level based on parent's level
            level = (parent.level || 0) + 1;

            // Check for circular reference (only needed for updates)
            if (existingId) {
                const wouldCreateCircularReference = await checkCircularReference(
                    tx,
                    existingId,
                    data.parentId,
                    countryAccountsId,
                );

                if (wouldCreateCircularReference) {
                    errors.push(
                        'Cannot set parent: would create a circular reference in the division hierarchy',
                    );
                }
            }
        }
    }

    if (!(data.name && Object.keys(data.name).length > 0)) {
        errors.push('Division name is required');
    }

    // Check for duplicate nationalId if provided
    if (data.nationalId) {
        const query = and(
            eq(divisionTable.nationalId, data.nationalId),
            eq(divisionTable.countryAccountsId, countryAccountsId),
        );

        // If updating an existing division, exclude it from the duplicate check
        const whereClause = existingId
            ? and(query, sql`${divisionTable.id} != ${existingId}`)
            : query;

        const existingWithSameNationalId = await tx.query.divisionTable.findFirst({
            where: whereClause,
        });

        if (existingWithSameNationalId) {
            errors.push(`A division with the national ID "${data.nationalId}" already exists`);
        }
    }

    // Check for duplicate importId if provided
    if (data.importId) {
        const query = and(
            eq(divisionTable.importId, data.importId),
            eq(divisionTable.countryAccountsId, countryAccountsId),
        );

        // If updating an existing division, exclude it from the duplicate check
        const whereClause = existingId
            ? and(query, sql`${divisionTable.id} != ${existingId}`)
            : query;

        const existingWithSameImportId = await tx.query.divisionTable.findFirst({
            where: whereClause,
        });

        if (existingWithSameImportId) {
            errors.push(`A division with the import ID "${data.importId}" already exists`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        level,
    };
}

/**
 * Checks if setting parentId for a division would create a circular reference
 * @param tx Database transaction
 * @param divisionId ID of the division being updated
 * @param parentId New parent ID to set
 * @param countryAccountId Tenant context ID
 * @returns true if a circular reference would be created, false otherwise
 */
async function checkCircularReference(
    tx: Tx,
    divisionId: string,
    parentId: string,
    countryAccountId: string,
): Promise<boolean> {
    // Simple case: division can't be its own parent
    if (divisionId === parentId) {
        return true;
    }

    // Check if any ancestor of the new parent is the division itself
    let currentId = parentId;
    const visited = new Set<string>();

    while (currentId) {
        // Prevent infinite loops
        if (visited.has(currentId)) {
            return true;
        }
        visited.add(currentId);

        // Get the parent of the current division
        const current = await tx.query.divisionTable.findFirst({
            where: and(
                eq(divisionTable.id, currentId),
                eq(divisionTable.countryAccountsId, countryAccountId),
            ),
            columns: {
                parentId: true,
            },
        });

        // If we reached a root division or can't find the division, stop
        if (!current || current.parentId === null) {
            break;
        }

        // If the parent is the division we're updating, we have a circular reference
        if (current.parentId === divisionId) {
            return true;
        }

        // Move up the hierarchy
        currentId = current.parentId;
    }

    return false;
}

export async function createDivision(
    data: InsertDivision,
    countryAccountsId: string,
): Promise<{ ok: boolean; errors?: string[] }> {
    try {
        return await dr.transaction(async (tx: Tx) => {
            try {
                // Validate division data
                const validation = await validateDivisionData(tx, data, countryAccountsId);

                if (!validation.valid) {
                    return { ok: false, errors: validation.errors };
                }

                // Insert with validated level
                await tx.insert(divisionTable).values({
                    ...data,
                    level: validation.level,
                    countryAccountsId: countryAccountsId,
                });

                return { ok: true };
            } catch (error) {
                logger.error('Failed to create division', { error, data });
                return { ok: false, errors: ['Failed to create the division'] };
            }
        });
    } catch (error) {
        logger.error('Failed to create division', { error, data });
        return { ok: false, errors: ['Failed to create the division'] };
    }
}

export async function update(
    id: string,
    data: InsertDivision,
    countryAccountsId: string,
): Promise<{ ok: boolean; errors?: string[] }> {
    try {
        return await dr.transaction(async (tx: Tx) => {
            try {
                // Verify division exists and belongs to the tenant
                const existingDivision = await tx.query.divisionTable.findFirst({
                    where: and(
                        eq(divisionTable.id, id),
                        eq(divisionTable.countryAccountsId, countryAccountsId),
                    ),
                });

                if (!existingDivision) {
                    return { ok: false, errors: ['Division not found or access denied'] };
                }

                // Validate division data
                const validation = await validateDivisionData(tx, data, countryAccountsId, id);

                if (!validation.valid) {
                    return { ok: false, errors: validation.errors };
                }

                // Update with validated level
                await tx
                    .update(divisionTable)
                    .set({
                        ...data,
                        level: validation.level,
                    })
                    .where(
                        and(
                            eq(divisionTable.id, id),
                            eq(divisionTable.countryAccountsId, countryAccountsId),
                        ),
                    );

                return { ok: true };
            } catch (error) {
                logger.error('Failed to update division', { error, id, data });
                return { ok: false, errors: ['Failed to update the division'] };
            }
        });
    } catch (error) {
        logger.error('Failed to update division', { error, id, data });
        return { ok: false, errors: ['Failed to update the division'] };
    }
}

export async function divisionById(id: string, countryAccountsId: string) {
    try {
        return await dr.transaction(async (tx: Tx) => {
            try {
                const res = await tx.query.divisionTable.findFirst({
                    where: and(
                        eq(divisionTable.id, id),
                        eq(divisionTable.countryAccountsId, countryAccountsId),
                    ),
                    with: {
                        divisionParent: true,
                    },
                });
                return res;
            } catch (error) {
                logger.error('Failed to get division by ID', { error, id });
                throw new DatabaseError('Failed to get division by ID', { error, id });
            }
        });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new TransactionError('Failed to get division by ID', { error });
    }
}

export async function getAllChildren(divisionId: string, countryAccountsId: string) {
    try {
        return await dr.transaction(async (tx: Tx) => {
            try {
                const res = await tx.execute(sql`
          WITH RECURSIVE DivisionChildren AS (
            SELECT id, parent_id
            FROM division
            WHERE id = ${divisionId}
            AND country_accounts_id = ${countryAccountsId}

            UNION ALL

            SELECT t.id, t.parent_id
            FROM division t
            INNER JOIN DivisionChildren c ON t.parent_id = c.id
            WHERE t.country_accounts_id = ${countryAccountsId}
          )

          SELECT id
          FROM DivisionChildren;
        `);

                return res;
            } catch (error) {
                logger.error('Failed to get all children', { error, divisionId });
                throw new DatabaseError('Failed to get all children', { error, divisionId });
            }
        });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new TransactionError('Failed to get all children', { error });
    }
}

export async function getAllIdOnly(divisionId: string, countryAccountsId: string) {
    try {
        return await dr.transaction(async (tx: Tx) => {
            try {
                const res = await tx.execute(sql`
					WITH RECURSIVE ParentCTE AS (
						-- Start from the child node
						SELECT id, name, parent_id
						FROM division
						WHERE id = ${divisionId} AND country_accounts_id = ${countryAccountsId}

						UNION ALL

						-- Recursively find parents
						SELECT s.id, s.name, s.parent_id
						FROM division s
						INNER JOIN ParentCTE p ON s.id = p.parent_id
					),
					ChildCTE AS (
						-- Find all descendants (children)
						SELECT id, name, parent_id, level
						FROM division
						WHERE id = ${divisionId} AND country_accounts_id = ${countryAccountsId}
						UNION ALL
						SELECT t.id, t.name, t.parent_id, t.level
						FROM division t
						INNER JOIN ChildCTE c ON t.parent_id = c.id
					)
					SELECT *
					FROM (
						SELECT id FROM ParentCTE
						UNION
						SELECT id FROM ChildCTE
					) all_records
        		`);

                return res;
            } catch (error) {
                logger.error('Failed to get all children', { error, divisionId });
                throw new DatabaseError('Failed to get all children', { error, divisionId });
            }
        });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new TransactionError('Failed to get all children', { error });
    }
}

export async function getParent(divisionId: string, countryAccountsId: string) {
    try {
        return await dr.transaction(async (tx: Tx) => {
            try {
                const res = await tx.execute(sql`
					WITH RECURSIVE ParentCTE AS (
						-- Start from the child node
						SELECT id, name, parent_id
						FROM division
						WHERE id = ${divisionId} AND country_accounts_id = ${countryAccountsId}

						UNION ALL

						-- Recursively find parents
						SELECT s.id, s.name, s.parent_id
						FROM division s
						INNER JOIN ParentCTE p ON s.id = p.parent_id
					)
					SELECT * FROM ParentCTE
        		`);

                return res;
            } catch (error) {
                logger.error('Failed to get all children', { error, divisionId });
                throw new DatabaseError('Failed to get all children', { error, divisionId });
            }
        });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new TransactionError('Failed to get all children', { error });
    }
}

export type PartialDivision = Pick<SelectDivision, 'id' | 'name' | 'parentId'>;
export async function getAllDivisionsByCountryAccountsId(
    countryAccountId: string,
): Promise<PartialDivision[]> {
    try {
        const divisions = await dr
            .select({
                id: divisionTable.id,
                name: divisionTable.name,
                parentId: divisionTable.parentId,
            })
            .from(divisionTable)
            .where(eq(divisionTable.countryAccountsId, countryAccountId));

        return divisions.map((division) => ({
            id: division.id,
            name: division.name,
            parentId: division.parentId,
        }));
    } catch (error) {
        throw new Error('Failed to fetch divisions');
    }
}

/**
 * Get the number of top-level (level 1) divisions for a given country account.
 *
 * This helper performs a tenant-scoped count of rows in the `division` table
 * where `level = 1` and `country_accounts_id` matches the provided ID.
 *
 * Notes:
 * - Returns a number representing the count of level-1 divisions.
 * - This function delegates directly to the global `dr` database handle and
 *   does not open an explicit transaction. Callers that need transactional
 *   guarantees should handle that externally.
 *
 * @param countryAccountId - Tenant (country account) UUID to scope the count
 * @returns Promise<number> count of level 1 divisions for the tenant
 */
export async function getCountDivisionByLevel1(countryAccountId: string) {
    const countLevel1 = await dr.$count(
        divisionTable,
        and(eq(divisionTable.level, 1), eq(divisionTable.countryAccountsId, countryAccountId)),
    );

    return countLevel1;
}

export async function getDivisionByLevel(level: number, countryAccountId: string) {
    try {
        return await dr.transaction(async (tx: Tx) => {
            try {
                const res = await tx.query.divisionTable.findMany({
                    where: and(
                        eq(divisionTable.level, level),
                        eq(divisionTable.countryAccountsId, countryAccountId),
                    ),
                    with: {
                        divisionParent: true,
                    },
                });
                return res;
            } catch (error) {
                logger.error('Failed to get divisions by level', { error, level });
                throw new DatabaseError('Failed to get divisions by level', { error, level });
            }
        });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new TransactionError('Failed to get divisions by level', { error });
    }
}

export async function getDivisionsBySpatialQuery(
    geojson: any,
    options: {
        relationshipType?: 'intersects' | 'contains' | 'within';
    } = {},
    countryAccountsId: string,
): Promise<any[]> {
    try {
        return await dr.transaction(async (tx: Tx) => {
            try {
                // Validate GeoJSON
                const validationResult = validateGeoJSON(geojson);
                if (!validationResult.valid) {
                    throw new GeoDataError(`Invalid GeoJSON: ${validationResult.error}`, {
                        geojson,
                        validationError: validationResult.error,
                    });
                }

                // Add spatial relationship condition
                const relationshipType = options.relationshipType || 'intersects';
                let spatialFunction: string;

                switch (relationshipType) {
                    case 'contains':
                        spatialFunction = 'ST_Contains';
                        break;
                    case 'within':
                        spatialFunction = 'ST_Within';
                        break;
                    case 'intersects':
                    default:
                        spatialFunction = 'ST_Intersects';
                        break;
                }

                const query = sql`
          SELECT d.*
          FROM ${divisionTable} d
          WHERE ${spatialFunction}(
            d.geom,
            ST_GeomFromGeoJSON(${JSON.stringify(geojson)})
          )
          AND d.country_accounts_id = ${countryAccountsId};
        `;

                const results = await tx.execute(query);
                return results.rows;
            } catch (error) {
                logger.error('Failed to execute spatial query', { error, geojson, options });
                if (error instanceof GeoDataError) {
                    throw error;
                }
                throw new DatabaseError('Failed to get divisions by spatial query', {
                    error,
                    options,
                    geojson,
                });
            }
        });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new TransactionError('Failed to execute spatial query transaction', { error });
    }
}

/**
 * Updates geometry data for all divisions that have GeoJSON but no geometry
 * This function is used to fix data inconsistencies when divisions have been imported
 * without proper geometry conversion
 *
 * @param countryAccountsId - Tenant context for filtering divisions by tenant
 * @returns Object with count of updated divisions and any errors
 */
export async function updateMissingGeometryForDivisions(
    countryAccountsId: string,
): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    try {
        return await dr.transaction(async (tx: Tx) => {
            // Find divisions with geojson but no geometry
            const divisionsToUpdate = await tx.query.divisionTable.findMany({
                where: and(
                    eq(divisionTable.countryAccountsId, countryAccountsId),
                    sql`${divisionTable.geojson} IS NOT NULL`,
                    sql`${divisionTable.geom} IS NULL`,
                ),
                columns: {
                    id: true,
                    geojson: true,
                },
            });

            logger.info(
                `Found ${divisionsToUpdate.length} divisions with missing geometry for tenant ${countryAccountsId}`,
            );

            // Process each division
            for (const division of divisionsToUpdate) {
                try {
                    if (!division.geojson) continue;

                    // Update geometry using PostGIS functions
                    await tx.execute(sql`
            UPDATE ${divisionTable}
            SET 
              geom = ST_GeomFromGeoJSON(${JSON.stringify(division.geojson)}),
              bbox = ST_Envelope(ST_GeomFromGeoJSON(${JSON.stringify(division.geojson)}))
            WHERE id = ${division.id}
          `);

                    // Generate spatial index
                    await tx.execute(sql`
            UPDATE ${divisionTable}
            SET spatial_index = ST_GeoHash(ST_Centroid(geom), 10)
            WHERE id = ${division.id} AND geom IS NOT NULL
          `);

                    updated++;
                } catch (error) {
                    const errorMessage = `Failed to update geometry for division ID ${division.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                    logger.error(errorMessage);
                    errors.push(errorMessage);
                }
            }

            logger.info(`Successfully updated geometry for ${updated} divisions`);
            return { updated, errors };
        });
    } catch (error) {
        const errorMessage = `Transaction failed during geometry update: ${error instanceof Error ? error.message : 'Unknown error'}`;
        logger.error(errorMessage);
        errors.push(errorMessage);
        return { updated, errors };
    }
}

export async function getDivisionsByBoundingBox(
    bbox: [number, number, number, number],
    options: {
        relationshipType?: 'intersects' | 'contains' | 'within';
    } = {},
    countryAccountsId: string,
): Promise<any[]> {
    try {
        return await dr.transaction(async () => {
            try {
                // Validate bounding box coordinates
                const [minLon, minLat, maxLon, maxLat] = bbox;

                if (minLon >= maxLon || minLat >= maxLat) {
                    throw new ValidationError(
                        'Invalid bounding box: min values must be less than max values',
                        {
                            bbox,
                            details: `[${minLon}, ${minLat}, ${maxLon}, ${maxLat}]`,
                        },
                    );
                }

                if (
                    Math.abs(minLat) > 90 ||
                    Math.abs(maxLat) > 90 ||
                    Math.abs(minLon) > 180 ||
                    Math.abs(maxLon) > 180
                ) {
                    throw new ValidationError('Invalid bounding box: coordinates out of range', {
                        bbox,
                        details:
                            'Latitude must be between -90 and 90, longitude between -180 and 180',
                    });
                }

                // Convert bbox to GeoJSON polygon
                const bboxPolygon = {
                    type: 'Polygon',
                    coordinates: [
                        [
                            [minLon, minLat],
                            [maxLon, minLat],
                            [maxLon, maxLat],
                            [minLon, maxLat],
                            [minLon, minLat],
                        ],
                    ],
                };

                // Use spatial query function
                return await getDivisionsBySpatialQuery(bboxPolygon, options, countryAccountsId);
            } catch (error) {
                logger.error('Failed to get divisions by bounding box', { error, bbox, options });
                if (error instanceof ValidationError) {
                    throw error;
                }
                throw new DatabaseError('Failed to get divisions by bounding box', {
                    error,
                    bbox,
                    options,
                });
            }
        });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new TransactionError('Failed to execute bounding box query transaction', { error });
    }
}
