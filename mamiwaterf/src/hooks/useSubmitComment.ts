import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState } from "react";
import { PACKAGE_ID, REGISTRY_ID, MODULE_NAME } from "../constants";
import { uploadToWalrus } from "../walrus";
import { getDAppObjectId } from "../utils/getDAppObjectId";
import { createSponsoredTransaction, executeSponsoredTransaction } from "../services/api";

export const useSubmitComment = () => {
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutateAsync: signTransaction } = useSignTransaction();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitComment = async (
        dappId: string, // This is the package address from Blockberry
        content: string,
        dappName?: string, // Optional dApp name for lookup
        parentId?: string,
        onSuccess?: () => void,
        onError?: (error: any) => void
    ) => {
        try {
            setIsSubmitting(true);

            if (!account) {
                throw new Error("Please connect your wallet first");
            }

            // --- STEP 1: Get the DApp Object ID using the dApp name ---
            console.log("Fetching DApp object ID for:", dappName || dappId);
            const dappObjectId = await getDAppObjectId(client, dappId, dappName);

            if (!dappObjectId) {
                throw new Error(`DApp not found in registry for package: ${dappId}. Please register this dApp first.`);
            }

            console.log("DApp Object ID:", dappObjectId);

            // --- STEP 2: Upload content to Walrus ---
            console.log("Uploading comment to Walrus...");
            const contentBlobId = await uploadToWalrus(content);
            console.log("Comment Blob ID:", contentBlobId);

            // --- STEP 3: Build Transaction ---
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::add_comment`,
                arguments: [
                    tx.object(REGISTRY_ID),
                    tx.object(dappObjectId), // Use object ID instead of package address
                    tx.pure.string(account.address), // user_name (using address for now)
                    tx.pure.string(contentBlobId), // content_blob_id
                    tx.pure.option('id', parentId || null),
                    tx.object('0x6'), // Clock
                ],
            });

            // --- STEP 4: Build transaction bytes (onlyTransactionKind: true) ---
            console.log("Building transaction...");
            tx.setSender(account.address);
            const transactionKindBytes = await tx.build({
                client,
                onlyTransactionKind: true
            });

            // Convert Uint8Array to base64 string
            const transactionKindBytesBase64 = btoa(
                String.fromCharCode(...transactionKindBytes)
            );

            // --- STEP 5: Create sponsored transaction ---
            console.log("Creating sponsored transaction...");
            const sponsoredTx = await createSponsoredTransaction(
                transactionKindBytesBase64,
                account.address
            );

            console.log("Sponsored transaction created:", sponsoredTx.digest);

            // --- STEP 6: Sign the sponsored transaction bytes ---
            console.log("Signing sponsored transaction...");
            // Convert base64 bytes back to Uint8Array for signing
            const sponsoredBytes = Uint8Array.from(atob(sponsoredTx.bytes), c => c.charCodeAt(0));

            // Build a transaction from the sponsored bytes for signing
            const txToSign = Transaction.from(sponsoredBytes);
            const { signature } = await signTransaction({
                transaction: txToSign,
            });

            // --- STEP 7: Execute sponsored transaction ---
            console.log("Executing sponsored transaction...");
            const result = await executeSponsoredTransaction(
                sponsoredTx.digest,
                signature
            );

            console.log("✅ Gasless comment submitted!", result.digest);
            setIsSubmitting(false);
            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error("Failed to submit comment:", error);
            setIsSubmitting(false);
            if (onError) onError(error);
        }
    };

    return { submitComment, isSubmitting };
};

