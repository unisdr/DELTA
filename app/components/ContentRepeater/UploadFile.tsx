import fs from "fs";
import path from "path";
import ContentRepeaterFileValidator from "./FileValidator";
import { BASE_UPLOAD_PATH } from "~/utils/paths"; // ← Critical import!

interface FileInfo {
  name: string;
  content_type: string;
  view?: string;
  tenantPath?: string;
}

interface Item {
  file?: FileInfo;
}

const debug = false;

class ContentRepeaterUploadFile {
  /**
   * Delete files from disk based on items data
   */
  static delete(
    itemsData: any[],
    publicPath: string = path.join(process.cwd()),
    countryAccountsId?: string
  ): Item[] {
    const items: Item[] = itemsData;

    items.forEach((item) => {
      if (!item.file?.name) return;

      const fileName = item.file.name;
      const tenantPathFromItem = item.file.tenantPath;

      // Build possible absolute paths to delete
      const candidates: string[] = [];

      // 1. Use tenantPath from item if present (most reliable)
      if (tenantPathFromItem) {
        const cleanPath = tenantPathFromItem.startsWith("/") ? tenantPathFromItem.slice(1) : tenantPathFromItem;
        const fullPath = path.resolve(publicPath, cleanPath, fileName);
        candidates.push(fullPath);
      }

      // 2. Build path using current countryAccountsId
      if (countryAccountsId) {
        const tenantDir = path.join(BASE_UPLOAD_PATH, `tenant-${countryAccountsId}`);
        candidates.push(path.resolve(publicPath, tenantDir, fileName));
      }

      // 3. Legacy: try root-level tenant folder (for old files)
      candidates.push(path.resolve(publicPath, `tenant-${countryAccountsId || "unknown"}`, fileName));

      // 4. Fallback: direct path
      candidates.push(path.resolve(publicPath, fileName.startsWith("/") ? fileName.slice(1) : fileName));

      // Try to delete from first existing path
      for (const filePath of candidates) {
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            if (debug) console.log(`Deleted: ${filePath}`);
            break;
          } catch (err) {
            console.error(`Failed to delete: ${filePath}`, err);
          }
        }
      }
    });

    return items;
  }

  /**
   * Save (move) files from temp → final destination with proper tenant isolation
   */
  static save(
    itemsData: any[],
    tempPath: string,
    destinationPath: string,
    publicPath: string = path.join(process.cwd()),
    countryAccountsId?: string
  ): Item[] {
    const items: Item[] = itemsData;

    // Normalize input paths
    const cleanTempPath = tempPath.replace(/^\/+/, "").replace(/\/+$/, "");
    const cleanDestPath = destinationPath.replace(/^\/+/, "").replace(/\/+$/, "");

    // Determine tenant ID to use
    const tenantId: string | null = countryAccountsId || this.extractTenantIdFromItems(items) || null;

    // Build final destination directory: /uploads/tenant-{id}/destinationPath
    // const tenantSegment = tenantId ? `tenant-${tenantId}` : null;
    const finalDestDir = tenantId
      ? path.resolve(publicPath, BASE_UPLOAD_PATH, `tenant-${tenantId}`, cleanDestPath)
      : path.resolve(publicPath, BASE_UPLOAD_PATH, cleanDestPath);

    // Ensure destination exists
    fs.mkdirSync(finalDestDir, { recursive: true });

    const usedFiles = new Set<string>();

    const updatedItems = items.map((item) => {
      if (!item.file?.name) return item;

      const originalName = path.basename(item.file.name);
      const cleanedName = originalName.replace(/^\d+_/, ""); // remove timestamp prefix
      const finalFilePath = path.join(finalDestDir, cleanedName);
      usedFiles.add(cleanedName);

      // Skip validation if already done in pre-upload
      if (!ContentRepeaterFileValidator.isValidExtension(cleanedName)) {
        console.warn(`Skipped invalid file: ${cleanedName}`);
        return item;
      }

      // Build possible temp file locations
      const tempCandidates: string[] = [];

      // 1. From item.tenantPath (new format)
      if (item.file.tenantPath) {
        const cleanTenant = item.file.tenantPath.replace(/^\/+/, "");
        tempCandidates.push(path.resolve(publicPath, cleanTenant, cleanTempPath, originalName));
      }

      // 2. New format: /uploads/tenant-{id}/temp
      if (tenantId) {
        tempCandidates.push(
          path.resolve(publicPath, BASE_UPLOAD_PATH, `tenant-${tenantId}`, cleanTempPath, originalName)
        );
      }

      // 3. Old format: /tenant-{id}/temp
      if (tenantId) {
        tempCandidates.push(
          path.resolve(publicPath, `tenant-${tenantId}`, cleanTempPath, originalName)
        );
      }

      // 4. No tenant (legacy)
      tempCandidates.push(path.resolve(publicPath, cleanTempPath, originalName));

      // Find and move the first existing file
      let moved = false;
      for (const tempFile of tempCandidates) {
        if (fs.existsSync(tempFile)) {
          try {
            fs.renameSync(tempFile, finalFilePath);
            if (debug) console.log(`Moved: ${tempFile} → ${finalFilePath}`);
            moved = true;
            break;
          } catch (err) {
            console.error(`Move failed: ${tempFile}`, err);
          }
        }
      }

      if (!moved) {
        console.warn(`Temp file not found for: ${originalName}`);
      }

      // Update item with correct public path
      if (tenantId) {
        const relativeToPublic = path.relative(publicPath, finalFilePath);
        item.file.name = `/${relativeToPublic.replace(/\\/g, "/")}`;
        item.file.tenantPath = path.join(BASE_UPLOAD_PATH, `tenant-${tenantId}`);
      } else {
        const relativeToPublic = path.relative(publicPath, finalFilePath);
        item.file.name = `/${relativeToPublic.replace(/\\/g, "/")}`;
      }

      delete item.file.view; // Clean up temp URL

      return item;
    });

    // Cleanup: remove files in destination not in current items
    try {
      const existingFiles = fs.readdirSync(finalDestDir);
      for (const file of existingFiles) {
        if (!usedFiles.has(file)) {
          const filePath = path.join(finalDestDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
            if (debug) console.log(`Cleaned up old file: ${filePath}`);
          }
        }
      }
    } catch (err) {
      // Directory might not exist or be empty
    }

    return updatedItems;
  }

  // Helper: extract tenant ID from any item (for legacy support)
  private static extractTenantIdFromItems(items: any[]): string | null {
    for (const item of items) {
      if (item.file?.tenantPath) {
        const match = item.file.tenantPath.match(/tenant-([\w-]+)/);
        if (match) return match[1];
      }
      if (item.file?.name) {
        const match = item.file.name.match(/tenant-([\w-]+)/);
        if (match) return match[1];
      }
    }
    return null;
  }
}

export { ContentRepeaterUploadFile };