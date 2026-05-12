import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState } from "react";
import { PACKAGE_ID, REGISTRY_ID, MODULE_NAME } from "../constants";
import { uploadToWalrus } from "../walrus";

import { getWalrusUrl } from "../walrus";

export const useRegisterDApp = () => {
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const [isRegistering, setIsRegistering] = useState(false);

    const registerDApp = async (
        data: {
            name: string;
            tagline: string;
            description: string;
            icon: File | string;
            banner: File | string;
            category: string;
            website: string;
            twitter?: string;
            discord?: string;
            github?: string;
            packageId?: string; // Smart contract package ID
            features: string[];
        },
        onSuccess?: () => void,
        onError?: (error: any) => void
    ) => {
        try {
            setIsRegistering(true);

            // --- STEP 1: Upload Description to Walrus ---
            console.log("Uploading description to Walrus...");
            const descriptionBlobId = await uploadToWalrus(data.description);
            console.log("Description Blob ID:", descriptionBlobId);

            // --- STEP 2: Upload Images to Walrus (if they are Files) ---
            let iconUrl = typeof data.icon === 'string' ? data.icon : '';
            if (data.icon instanceof File) {
                console.log("Uploading icon to Walrus...");
                const iconBlobId = await uploadToWalrus(data.icon);
                iconUrl = getWalrusUrl(iconBlobId);
            }

            let bannerUrl = typeof data.banner === 'string' ? data.banner : '';
            if (data.banner instanceof File) {
                console.log("Uploading banner to Walrus...");
                const bannerBlobId = await uploadToWalrus(data.banner);
                bannerUrl = getWalrusUrl(bannerBlobId);
            }

            // --- STEP 3: Submit to Sui ---
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::register_dapp`,
                arguments: [
                    tx.object(REGISTRY_ID),
                    tx.pure.string(data.name),
                    tx.pure.string(data.tagline),
                    tx.pure.string(descriptionBlobId),
                    tx.pure.string(iconUrl),
                    tx.pure.string(bannerUrl),
                    tx.pure.string(data.category),
                    tx.pure.string(data.website),

                    // --- FIX START ---
                    // Use tx.pure.option to wrap the value correctly for Move
                    // If the string is empty (''), we pass null to create a None option
                    tx.pure.option('string', data.twitter || null),
                    tx.pure.option('string', data.discord || null),
                    tx.pure.option('string', data.github || null),
                    tx.pure.option('address', data.packageId || null), // Package ID
                    // --- FIX END ---

                    tx.pure.vector('string', data.features),
                    tx.object('0x6'),
                ],
            });

            signAndExecuteTransaction(
                { transaction: tx },
                {
                    onSuccess: (result) => {
                        console.log("dApp registered on-chain!", result);
                        setIsRegistering(false);
                        if (onSuccess) onSuccess();
                    },
                    onError: (err) => {
                        console.error("Sui Transaction failed", err);
                        setIsRegistering(false);
                        if (onError) onError(err);
                    },
                }
            );
        } catch (error) {
            console.error("Process failed:", error);
            setIsRegistering(false);
            if (onError) onError(error);
        }
    };

    return { registerDApp, isRegistering };
};
