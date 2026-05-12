import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState, useEffect } from "react";
import { PACKAGE_ID, REGISTRY_ID, MODULE_NAME } from "../constants";
import { uploadToWalrus, fetchFromWalrus } from "../walrus";

export interface DeveloperProfile {
    name: string;
    bio: string;
    avatar_url: string;
    website: string;
    twitter: string;
    verified: boolean;
}

export const useDeveloper = () => {
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    const [isRegistered, setIsRegistered] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [profile, setProfile] = useState<DeveloperProfile | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            if (!account) {
                setIsRegistered(false);
                setIsLoading(false);
                return;
            }

            try {
                // 1. Fetch Registry to get the 'developers' table ID
                const registryObj = await client.getObject({
                    id: REGISTRY_ID,
                    options: { showContent: true }
                });

                if (registryObj.data?.content?.dataType !== 'moveObject') {
                    throw new Error("Invalid Registry Object");
                }

                const fields = registryObj.data.content.fields as any;
                const developersTableId = fields.developers.fields.id.id;

                // 2. Check if user exists in the developers table
                // Table entries are dynamic fields with the address as the name
                try {
                    const developerObj = await client.getDynamicFieldObject({
                        parentId: developersTableId,
                        name: {
                            type: 'address',
                            value: account.address
                        }
                    });

                    if (developerObj.data) {
                        setIsRegistered(true);
                        // Parse profile data if needed
                        const devFields = developerObj.data.content?.dataType === 'moveObject'
                            ? (developerObj.data.content.fields as any).value.fields
                            : null;

                        if (devFields) {
                            setProfile({
                                name: devFields.name,
                                bio: devFields.bio_blob_id, // This is now the blob ID
                                avatar_url: devFields.avatar_url,
                                website: devFields.website,
                                twitter: devFields.twitter,
                                verified: devFields.verified
                            });

                            // Fetch bio content from Walrus
                            if (devFields.bio_blob_id) {
                                fetchFromWalrus(devFields.bio_blob_id).then(bioText => {
                                    if (bioText) {
                                        setProfile(prev => prev ? { ...prev, bio: bioText } : null);
                                    }
                                }).catch(err => {
                                    console.error("Failed to fetch bio:", err);
                                });
                            }
                        }
                    } else {
                        setIsRegistered(false);
                    }
                } catch (e) {
                    // If not found, it throws or returns null depending on client version/error handling
                    // Usually throws if not found
                    setIsRegistered(false);
                }

            } catch (error) {
                console.error("Error checking developer status:", error);
                setIsRegistered(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkStatus();
    }, [account, client]);

    const registerDeveloper = async (
        data: {
            name: string;
            bio: string;
            avatarUrl: string;
            website?: string;
            twitter?: string;
        },
        onSuccess?: () => void,
        onError?: (error: any) => void
    ) => {
        try {
            setIsRegistering(true);
            // 1. Upload Bio to Walrus
            console.log("Uploading bio to Walrus...");
            // We need to import uploadToWalrus. Let's assume it's available or I'll add the import.
            // Since I can't add imports easily with multi_replace in the same step if they are far away,
            // I will assume the user has it or I will add it in a separate step.
            // Wait, I should add the import first.

            // For now, let's just use the function assuming it's imported.
            const bioBlobId = await uploadToWalrus(data.bio);
            console.log("Bio Blob ID:", bioBlobId);

            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::register_developer`,
                arguments: [
                    tx.object(REGISTRY_ID),
                    tx.pure.string(data.name),
                    tx.pure.string(bioBlobId), // Pass Blob ID instead of raw text
                    tx.pure.string(data.avatarUrl),
                    tx.pure.option('string', data.website || null),
                    tx.pure.option('string', data.twitter || null),
                    tx.object('0x6'), // Clock
                ],
            });

            signAndExecuteTransaction(
                { transaction: tx },
                {
                    onSuccess: (result) => {
                        console.log("Developer registered!", result);
                        setIsRegistered(true);
                        setIsRegistering(false);
                        if (onSuccess) onSuccess();
                        // Optimistically update profile or refetch
                    },
                    onError: (err) => {
                        console.error("Registration failed", err);
                        setIsRegistering(false);
                        if (onError) onError(err);
                    },
                }
            );
        } catch (error) {
            console.error("Transaction failed:", error);
            setIsRegistering(false);
            if (onError) onError(error);
        }
    };

    return {
        isRegistered,
        isLoading,
        profile,
        registerDeveloper,
        isRegistering
    };
};
