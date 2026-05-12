import { WALRUS_PUBLISHERS, WALRUS_AGGREGATORS } from './constants';

export async function uploadToWalrus(content: string | File | Blob): Promise<string> {
    let body: string | File | Blob = content;

    // If content is just a string, we can send it directly
    // If it's an object/JSON, stringify it first
    if (typeof content === 'object' && !(content instanceof File) && !(content instanceof Blob)) {
        body = JSON.stringify(content);
    }

    const errors: Array<{ publisher: string; error: any }> = [];

    // Try each publisher endpoint
    for (const publisherBase of WALRUS_PUBLISHERS) {
        try {
            const publisherUrl = `${publisherBase}?epochs=30`;
            console.log(`Attempting upload to: ${publisherUrl}`);

            const response = await fetch(publisherUrl, {
                method: "PUT",
                body: body,
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Upload failed: ${text}`);
            }

            const data = await response.json();

            // Walrus returns: { newlyCreated: { blobObject: { blobId: "..." } } }
            // OR { alreadyCertified: { blobId: "..." } } depending on if data exists
            const blobId =
                data.newlyCreated?.blobObject?.blobId ||
                data.alreadyCertified?.blobId ||
                data.blobObject?.blobId;

            if (!blobId) {
                console.error("Walrus response:", data);
                throw new Error("Could not retrieve Blob ID from Walrus");
            }

            console.log(`✓ Upload successful to ${publisherUrl}`);
            return blobId;
        } catch (error) {
            console.warn(`✗ Failed to upload to ${publisherBase}:`, error);
            errors.push({ publisher: publisherBase, error });
            // Continue to next publisher
        }
    }

    // If all publishers failed, throw an error with details
    console.error("All Walrus publishers failed:", errors);
    throw new Error(`Upload failed on all ${WALRUS_PUBLISHERS.length} publishers. Last error: ${errors[errors.length - 1]?.error}`);
}

export function getWalrusUrl(blobId: string, aggregatorIndex: number = 0): string {
    return `${WALRUS_AGGREGATORS[aggregatorIndex]}/${blobId}`;
}

export async function fetchFromWalrus(blobId: string): Promise<string | null> {
    const errors: Array<{ aggregator: string; error: any }> = [];

    // Try each aggregator endpoint
    for (let i = 0; i < WALRUS_AGGREGATORS.length; i++) {
        const aggregatorUrl = getWalrusUrl(blobId, i);
        try {
            console.log(`Attempting fetch from: ${aggregatorUrl}`);

            // Add 10s timeout to prevent hanging indefinitely
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(aggregatorUrl, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`${response.status} ${response.statusText}`);
            }

            console.log(`✓ Fetch successful from ${WALRUS_AGGREGATORS[i]}`);
            return await response.text();
        } catch (error) {
            console.warn(`✗ Failed to fetch from ${WALRUS_AGGREGATORS[i]}:`, error);
            errors.push({ aggregator: WALRUS_AGGREGATORS[i], error });
            // Continue to next aggregator
        }
    }

    // If all aggregators failed, log and return null
    console.warn(`All Walrus aggregators failed for blob ${blobId}:`, errors);
    return null;
}
