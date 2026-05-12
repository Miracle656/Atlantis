import { useQuery } from "@tanstack/react-query";
import { SuiClient } from "@mysten/sui/client";
import { REGISTRY_ID, SUI_NETWORK } from "../constants";

interface DeveloperProfile {
    name: string;
    bio: string;
    avatar_url: string;
    website: string | null;
    twitter: string | null;
    verified: boolean;
    dapp_ids: string[];
    created_at: string;
}

export function useDeveloperProfile(address: string | undefined) {
    return useQuery({
        queryKey: ["developer", address, REGISTRY_ID],
        queryFn: async (): Promise<DeveloperProfile | null> => {
            if (!address) return null;

            const client = new SuiClient({ url: SUI_NETWORK });

            try {
                // Get the Registry object to find the developers table
                const registryObject = await client.getObject({
                    id: REGISTRY_ID,
                    options: {
                        showContent: true,
                    },
                });

                if (registryObject.data?.content?.dataType !== "moveObject") {
                    console.error("Registry object not found");
                    return null;
                }

                const fields = registryObject.data.content.fields as any;
                const developersTableId = fields.developers?.fields?.id?.id;

                if (!developersTableId) {
                    console.error("Developers table not found");
                    return null;
                }

                // Query the dynamic field for this developer address
                const developerField = await client.getDynamicFieldObject({
                    parentId: developersTableId,
                    name: {
                        type: "address",
                        value: address,
                    },
                });

                if (developerField.data?.content?.dataType !== "moveObject") {
                    console.log("Developer not registered");
                    return null;
                }

                const developerData = developerField.data.content.fields as any;
                const value = developerData.value?.fields || developerData;

                // Fetch bio from Walrus if bio_blob_id exists
                let bio = "";
                const bioBlobId = value.bio_blob_id;

                if (bioBlobId && bioBlobId !== "") {
                    try {
                        // Fetch from Walrus aggregator
                        const walrusResponse = await fetch(
                            `https://aggregator.walrus-testnet.walrus.space/v1/${bioBlobId}`
                        );
                        if (walrusResponse.ok) {
                            bio = await walrusResponse.text();
                        }
                    } catch (error) {
                        console.error("Failed to fetch bio from Walrus:", error);
                    }
                }

                return {
                    name: value.name || "",
                    bio,
                    avatar_url: value.avatar_url || "",
                    website: value.website || null,
                    twitter: value.twitter || null,
                    verified: value.verified || false,
                    dapp_ids: value.dapp_ids || [],
                    created_at: value.created_at || "0",
                };
            } catch (error) {
                console.error("Error fetching developer profile:", error);
                return null;
            }
        },
        enabled: !!address,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
