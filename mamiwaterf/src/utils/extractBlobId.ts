/**
 * Extracts the blob ID from a Walrus URL
 * @param url - Full Walrus URL or just a blob ID
 * @returns The blob ID or undefined if invalid
 */
export function extractBlobId(url: string | undefined): string | undefined {
    if (!url) return undefined;

    // If it's already just a blob ID (no slashes), return it
    if (!url.includes('/')) return url;

    // Extract blob ID from URL (last segment after /v1/)
    const match = url.match(/\/v1\/([^/]+)$/);
    return match ? match[1] : undefined;
}
