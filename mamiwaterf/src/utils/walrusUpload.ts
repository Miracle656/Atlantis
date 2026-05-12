import { WALRUS_PUBLISHERS, WALRUS_EPOCHS, WALRUS_AGGREGATORS } from '../constants';
import toast from 'react-hot-toast';

/**
 * Upload an image blob to Walrus with fallback across multiple publishers
 * @param imageBlob - The image as a Blob
 * @returns Object containing blob ID and full URL
 */
export async function uploadToWalrus(imageBlob: Blob): Promise<{
    blobId: string;
    url: string;
} | null> {
    console.log('Starting Walrus upload...', imageBlob.size, 'bytes');

    // Try each publisher until one succeeds
    for (let i = 0; i < WALRUS_PUBLISHERS.length; i++) {
        const publisher = WALRUS_PUBLISHERS[i];

        try {
            console.log(`Attempting upload to publisher ${i + 1}/${WALRUS_PUBLISHERS.length}: ${publisher}`);

            const uploadUrl = `${publisher}/v1/blobs?epochs=${WALRUS_EPOCHS}`;
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                body: imageBlob,
                headers: {
                    'Content-Type': 'image/png',
                }
            });

            if (!response.ok) {
                console.warn(`Publisher ${publisher} failed with status ${response.status}`);
                continue; // Try next publisher
            }

            const result = await response.json();
            console.log('Walrus response:', result);

            // Extract blob ID from response
            let blobId: string;

            if (result.newlyCreated?.blobObject?.blobId) {
                blobId = result.newlyCreated.blobObject.blobId;
            } else if (result.alreadyCertified?.blobId) {
                blobId = result.alreadyCertified.blobId;
            } else {
                console.error('Unexpected response format:', result);
                continue; // Try next publisher
            }

            // Try to construct URL with working aggregator
            const url = await constructAggregatorUrl(blobId);
            if (!url) {
                console.warn('Could not construct aggregator URL, trying next publisher');
                continue;
            }

            console.log('✅ Upload successful!', { blobId, url, publisher });
            toast.success('Image uploaded to Walrus!');

            return { blobId, url };
        } catch (error) {
            console.warn(`Publisher ${publisher} error:`, error);
            // Continue to next publisher
        }
    }

    // All publishers failed
    console.error('All Walrus publishers failed');
    toast.error('Failed to upload to Walrus. All publishers unavailable.');
    return null;
}

/**
 * Try to find a working aggregator and construct URL
 */
async function constructAggregatorUrl(blobId: string): Promise<string | null> {
    // Try first aggregator (most likely to work)
    const primaryAggregator = WALRUS_AGGREGATORS[0];
    return `${primaryAggregator}/${blobId}`;
}

/**
 * Convert HTMLElement to PNG Blob for upload
 * @param element - The HTML element to capture
 * @returns PNG image as Blob
 */
export async function elementToBlob(element: HTMLElement): Promise<Blob | null> {
    try {
        const html2canvas = (await import('html2canvas')).default;

        const canvas = await html2canvas(element, {
            backgroundColor: '#000000',
            scale: 2, // High resolution
            logging: false,
        });

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/png', 1.0);
        });
    } catch (error) {
        console.error('Failed to convert element to blob:', error);
        toast.error('Failed to capture image');
        return null;
    }
}
