import { useQuery } from "@tanstack/react-query";
import { useSuiClient } from "@mysten/dapp-kit";
import { getDAppObjectId } from "../utils/getDAppObjectId";
import { REGISTRY_ID } from "../constants";

export interface OnChainDApp {
    id: string;
    name: string;
    tagline: string;
    descriptionBlobId: string;
    iconUrl: string;
    bannerUrl: string;
    category: string;
    website: string;
    twitter?: string;
    discord?: string;
    github?: string;
    features: string[];
    reviewsTableId: string;
    commentCount: number;
    rating: number;
    reviewCount: number;
    launchDate: number;
}

export const useOnChainDApp = (packageId: string, dappName?: string) => {
    const client = useSuiClient();

    return useQuery({
        queryKey: ["onChainDApp", packageId, dappName],
        queryFn: async (): Promise<OnChainDApp | null> => {
            if (!packageId && !dappName) return null;

            console.log(`Fetching on-chain dApp details for ${dappName || packageId}`);

            // 1. Get the DApp Object ID (this is the ID of the DApp struct)
            const dappObjectId = await getDAppObjectId(client, packageId, dappName);

            if (!dappObjectId) {
                console.log("DApp not found on-chain");
                return null;
            }

            console.log("Found DApp ID:", dappObjectId);

            // 2. Fetch the Registry Object to get the 'dapps' table ID
            const registryObject = await client.getObject({
                id: REGISTRY_ID,
                options: {
                    showContent: true
                }
            });

            if (!registryObject.data || !registryObject.data.content) {
                console.error("Registry object not found");
                return null;
            }

            const registryFields = (registryObject.data.content as any).fields;
            const dappsTableId = registryFields.dapps?.fields?.id?.id;

            if (!dappsTableId) {
                console.error("DApps table ID not found in registry");
                return null;
            }

            console.log("DApps Table ID:", dappsTableId);

            // 3. Fetch the DApp Object from the Table using getDynamicFieldObject
            // The key type is ID ('0x2::object::ID') and value is the dappObjectId
            const dappObject = await client.getDynamicFieldObject({
                parentId: dappsTableId,
                name: {
                    type: '0x2::object::ID',
                    value: dappObjectId
                }
            });

            console.log("DApp Dynamic Field Response:", dappObject);

            if (!dappObject.data || !dappObject.data.content) {
                console.error("DApp Object has no content:", dappObject);
                return null;
            }

            const fields = (dappObject.data.content as any).fields.value.fields;
            console.log("DApp Object Fields:", fields);
            console.log("🔍 Raw twitter field:", fields.twitter);
            console.log("🔍 Raw discord field:", fields.discord);
            console.log("🔍 Raw github field:", fields.github);

            // Extract reviews table ID
            const reviewsTableId = fields.reviews?.fields?.id?.id;
            console.log("Extracted Reviews Table ID:", reviewsTableId);

            return {
                id: dappObjectId,
                name: fields.name,
                tagline: fields.tagline,
                descriptionBlobId: fields.description_blob_id,
                iconUrl: fields.icon_url,
                bannerUrl: fields.banner_url,
                category: fields.category,
                website: fields.website,
                // Social fields are stored as plain strings, not Option<String> vectors
                twitter: fields.twitter || undefined,
                discord: fields.discord || undefined,
                github: fields.github || undefined,
                features: fields.features || [],
                reviewsTableId: reviewsTableId || "",
                commentCount: Number(fields.comment_count || 0),
                rating: Number(fields.rating) / 100,
                reviewCount: Number(fields.review_count),
                launchDate: Number(fields.created_at)
            };
        },
        enabled: !!packageId || !!dappName,
        staleTime: 1000 * 60 * 5 // Cache for 5 minutes
    });
};
