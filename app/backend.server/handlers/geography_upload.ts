import { parseFormData } from '@mjackson/form-data-parser';

import { UserError, importZip } from '~/backend.server/models/division';

export async function handleRequest(request: Request, countryAccountsId: string) {
    try {
        // Parse multipart form data (files stored in memory by default)
        const formData = await parseFormData(request);

        const file = formData.get('file');

        if (!(file instanceof File)) {
            throw new UserError('File was not set');
        }

        // Convert File → Uint8Array
        const arrayBuffer = await file.arrayBuffer();
        const fileBytes = new Uint8Array(arrayBuffer);

        const res = await importZip(fileBytes, countryAccountsId);

        if (!res.success) {
            throw new UserError(res.error || 'Import failed');
        }

        return {
            ok: true,
            imported: res.data.imported,
            failed: res.data.failed,
            failedDetails: res.data.failedDetails || {},
        };
    } catch (err) {
        if (err instanceof UserError) {
            return { ok: false, error: err.message };
        }

        console.error('Could not import divisions zip', err);
        return { ok: false, error: 'Server error' };
    }
}
