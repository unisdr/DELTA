import fs from 'fs';
import path from 'path';
import ContentRepeaterFileValidator from './FileValidator';
import { BASE_UPLOAD_PATH } from '~/utils/paths'; // ← ADD THIS!

interface UserSession {
    id?: string;
    countryAccountsId?: string;
    role?: string;
}

export async function handleFileRequest(
    request: Request,
    upload_path: string,
    download?: boolean,
    userSession?: UserSession,
): Promise<Response> {
    const debug = true;
    const url = new URL(request.url);
    const fileName = url.searchParams.get('name');
    const tenantPathParam = url.searchParams.get('tenantPath'); // e.g. "uploads/tenant-xxx" or "uploads\tenant-xxx"
    const requiredTenantId = url.searchParams.get('requiredTenantId');

    if (debug) {
        console.log('FileViewer request:', { fileName, tenantPathParam, upload_path });
        console.log('User session:', userSession?.countryAccountsId);
    }

    if (!fileName) {
        return new Response('File name is required', { status: 400 });
    }

    if (!userSession?.countryAccountsId) {
        return new Response(null, {
            status: 302,
            headers: { Location: '/error/unauthorized?reason=no-tenant' },
        });
    }

    const tenantId = userSession.countryAccountsId;
    const normalizedFileName = path.normalize(fileName).replace(/^(\.\.[\/\\])+/g, '');

    // Build the correct base directory: project_root/uploads/tenant-{id}
    const tenantBaseDir = path.join(BASE_UPLOAD_PATH, `tenant-${tenantId}`);
    const allowedDir = path.resolve(tenantBaseDir, upload_path); // e.g. uploads/tenant-xxx/temp

    // === PRIORITY 1: Use tenantPath from URL (most accurate) ===
    if (tenantPathParam) {
        // Fix Windows backslashes from URL encoding
        const cleanTenantPath = decodeURIComponent(tenantPathParam).replace(/\\/g, '/');
        const fullDir = path.resolve(cleanTenantPath, upload_path);
        const candidatePath = path.join(fullDir, normalizedFileName);

        if (debug) console.log('Trying tenantPath from URL:', candidatePath);

        if (
            candidatePath.startsWith(allowedDir) &&
            fs.existsSync(candidatePath) &&
            fs.statSync(candidatePath).isFile()
        ) {
            return serveFile(candidatePath, fileName, download);
        }
    }

    // === PRIORITY 2: Standard tenant folder (most common) ===
    const standardPath = path.join(allowedDir, normalizedFileName);
    if (fs.existsSync(standardPath) && fs.statSync(standardPath).isFile()) {
        if (debug) console.log('Found in standard tenant folder:', standardPath);
        return serveFile(standardPath, fileName, download);
    }

    // === PRIORITY 3: Legacy fallback (only if no tenantPath param) ===
    if (!tenantPathParam && !requiredTenantId) {
        const legacyPath = path.resolve(`.${upload_path}`, normalizedFileName);
        if (fs.existsSync(legacyPath) && fs.statSync(legacyPath).isFile()) {
            console.warn('Serving legacy file (outside uploads folder):', legacyPath);
            return serveFile(legacyPath, fileName, download);
        }
    }

    console.log(`File not found for tenant ${tenantId}: ${normalizedFileName}`);
    return new Response('File not found', { status: 404 });
}

function serveFile(filePath: string, fileName: string, download?: boolean): Response {
    const ext = path.extname(fileName).slice(1).toLowerCase();
    if (!ContentRepeaterFileValidator.allowedExtensions.includes(ext)) {
        return new Response('Invalid file type', { status: 400 });
    }

    const mimeTypes: Record<string, string> = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        pdf: 'application/pdf',
        // ... keep your full list
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
        const buffer = fs.readFileSync(filePath);
        const disposition = download ? 'attachment' : 'inline';
        return new Response(buffer, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `${disposition}; filename="${path.basename(fileName)}"`,
                'Content-Length': buffer.length.toString(),
            },
        });
    } catch (err) {
        console.error('Error serving file:', err);
        return new Response('Internal server error', { status: 500 });
    }
}
