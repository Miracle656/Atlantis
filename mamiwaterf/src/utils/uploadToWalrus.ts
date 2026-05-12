/**
 * Upload text or files to Walrus blob storage
 * Tries multiple publisher endpoints with fallback
 */

import { WALRUS_PUBLISHERS } from '../constants';

export interface WalrusUploadResult {
    blobId: string;
    suiRef?: string;
}

/**
 * Upload text content to Walrus
 */
export async function uploadTextToWalrus(text: string): Promise<WalrusUploadResult> {
    const blob = new Blob([text], { type: 'text/plain' });
    return uploadBlobToWalrus(blob);
}

/**
 * Upload file (image) to Walrus
 */
export async function uploadFileToWalrus(file: File): Promise<WalrusUploadResult> {
    return uploadBlobToWalrus(file);
}

/**
 * Upload blob to Walrus with multi-endpoint fallback
 */
async function uploadBlobToWalrus(blob: Blob): Promise<WalrusUploadResult> {
    let lastError: Error | null = null;

    // Try each publisher endpoint
    for (const publisherUrl of WALRUS_PUBLISHERS) {
        try {
            console.log(`Trying Walrus publisher: ${publisherUrl}`);

            const response = await fetch(publisherUrl, {
                method: 'PUT',
                body: blob,
                headers: {
                    'Content-Type': blob.type || 'application/octet-stream',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Walrus response:', data);

            // Extract blob ID from response
            const blobId = data.newlyCreated?.blobObject?.blobId ||
                data.alreadyCertified?.blobId;

            if (!blobId) {
                throw new Error('No blob ID in response');
            }

            console.log(`✅ Upload successful! Blob ID: ${blobId}`);

            return {
                blobId,
                suiRef: data.newlyCreated?.blobObject?.id || data.alreadyCertified?.event?.txDigest,
            };

        } catch (error) {
            console.error(`Failed to upload to ${publisherUrl}:`, error);
            lastError = error as Error;
            // Continue to next endpoint
        }
    }

    // All endpoints failed
    throw new Error(
        `Failed to upload to Walrus after trying ${WALRUS_PUBLISHERS.length} endpoints. Last error: ${lastError?.message}`
    );
}

/**
 * Convert File to base64 data URL (for preview)
 */
export function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
        return { valid: false, error: 'File must be an image' };
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        return { valid: false, error: 'Image must be less than 5MB' };
    }

    return { valid: true };
}
