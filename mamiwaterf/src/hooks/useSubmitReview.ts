import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useState } from "react";
import { PACKAGE_ID, REGISTRY_ID, MODULE_NAME } from "../constants";
import { uploadToWalrus } from "../walrus";
import { getDAppObjectId } from "../utils/getDAppObjectId";
import { createSponsoredTransaction, executeSponsoredTransaction } from "../services/api";

export const useSubmitReview = () => {
    const client = useSuiClient();
    const account = useCurrentAccount();
    const { mutateAsync: signTransaction } = useSignTransaction();
    const [isUploading, setIsUploading] = useState(false);

    const submitReview = async (
        dappId: string, // This is the package address from Blockberry
        rating: number, // 1 to 5
        title: string,
        commentText: string,
        userName: string,
        dappName?: string, // Optional dApp name for lookup
        onSuccess?: () => void,
        onError?: (error: any) => void
    ) => {
        try {
            setIsUploading(true);

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

            // --- STEP 2: Upload Content to Walrus ---
            console.log("Uploading to Walrus...");
            const blobId = await uploadToWalrus(commentText);
            console.log("Walrus Blob ID:", blobId);

            // --- STEP 3: Build Transaction ---
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::add_review`,
                arguments: [
                    tx.object(REGISTRY_ID),      // Registry Object
                    tx.object(dappObjectId),     // The DApp OBJECT ID (not package address!)
                    tx.pure.string(userName),    // User's display name
                    tx.pure.u8(rating),          // Rating (1-5)
                    tx.pure.string(title),       // Review Title
                    tx.pure.string(blobId),      // The Walrus Blob ID
                    tx.object('0x6'),            // Clock Object
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

            console.log("✅ Gasless review submitted!", result.digest);
            setIsUploading(false);
            if (onSuccess) onSuccess();

        } catch (error: any) {
            console.error("Process failed:", error);
            setIsUploading(false);

            // Handle specific error codes
            if (error.message && error.message.includes("MoveAbort") && error.message.includes("function: 5")) {
                if (onError) onError(new Error("You have already reviewed this dApp."));
            } else {
                if (onError) onError(error);
            }
        }
    };

    return { submitReview, isUploading };
};

