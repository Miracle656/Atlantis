import { SuiClient } from "@mysten/sui/client";
import { PACKAGE_ID, MODULE_NAME, REGISTRY_ID } from "../constants";

export interface OnChainDAppData {
    id: string;
    name: string;
    packageId: string;
    developer: string;
    category: string;
    iconUrl: string;
    bannerUrl: string;
    website: string;
    twitter?: string;
    discord?: string;
    github?: string;
    tagline: string;
    descriptionBlobId: string;
    features: string[];
    reviewsTableId: string;
    rating: number;
    reviewCount: number;
    commentCount: number;
    launchDate: number;
}

export async function fetchOnChainDApps(client: SuiClient): Promise<OnChainDAppData[]> {
    try {
        console.log("Fetching on-chain registered dApps...");

        // 1. Query DAppRegistered events to get all registered dApp IDs
        const events = await client.queryEvents({
            query: {
                MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::DAppRegistered`
            },
            limit: 200, // Increased from default 50 to fetch all dApps
            order: "descending"
        });

        console.log(`Found ${events.data.length} DAppRegistered events`);

        if (events.data.length === 0) {
            return [];
        }

        // 2. Get the Registry object to access the dapps table
        const registryObject = await client.getObject({
            id: REGISTRY_ID,
            options: {
                showContent: true
            }
        });

        if (!registryObject.data || !registryObject.data.content) {
            console.error("Registry object not found");
            return [];
        }

        const registryFields = (registryObject.data.content as any).fields;
        const dappsTableId = registryFields.dapps?.fields?.id?.id;

        if (!dappsTableId) {
            console.error("DApps table ID not found in registry");
            return [];
        }

        // 3. Fetch each dApp's full data from the table
        const dappPromises = events.data.map(async (event: any) => {
            try {
                const dappId = event.parsedJson.dapp_id;

                const dappObject = await client.getDynamicFieldObject({
                    parentId: dappsTableId,
                    name: {
                        type: '0x2::object::ID',
                        value: dappId
                    }
                });

                if (!dappObject.data || !dappObject.data.content) {
                    return null;
                }

                const fields = (dappObject.data.content as any).fields.value.fields;

                return {
                    id: dappId,
                    name: fields.name,
                    packageId: fields.package_id?.fields?.vec?.[0] || "",
                    developer: fields.developer,
                    category: fields.category,
                    iconUrl: fields.icon_url,
                    bannerUrl: fields.banner_url,
                    website: fields.website,
                    twitter: fields.twitter?.fields?.vec?.[0],
                    discord: fields.discord?.fields?.vec?.[0],
                    github: fields.github?.fields?.vec?.[0],
                    tagline: fields.tagline,
                    descriptionBlobId: fields.description_blob_id,
                    features: fields.features || [],
                    reviewsTableId: fields.reviews?.fields?.id?.id || "",
                    rating: Number(fields.rating) / 100, // Convert from stored format
                    reviewCount: Number(fields.review_count),
                    commentCount: Number(fields.comment_count),
                    launchDate: Number(fields.launch_date)
                } as OnChainDAppData;
            } catch (error) {
                console.error(`Failed to fetch dApp ${event.parsedJson.dapp_id}:`, error);
                return null;
            }
        });

        const dapps = (await Promise.all(dappPromises)).filter((d): d is OnChainDAppData => d !== null);
        console.log(`Fetched ${dapps.length} on-chain dApps`);

        return dapps;
    } catch (error) {
        console.error("Failed to fetch on-chain dApps:", error);
        return [];
    }
}
