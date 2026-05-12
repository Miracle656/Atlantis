import { Transaction } from "@mysten/sui/transactions";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { PACKAGE_ID, MODULE_NAME, REGISTRY_ID } from "../constants";
import { uploadToWalrus } from "../walrus";
import type { BlockberryDApp, BlockberryDEX } from "./blockberry";

export interface RegistrationResult {
    success: boolean;
    dappName: string;
    digest?: string;
    error?: string;
}

/**
 * Automated bulk registration using a private key
 * This bypasses wallet UI and signs transactions programmatically
 */
export async function bulkRegisterDApps(
    client: SuiClient,
    privateKey: string,
    dapps: (BlockberryDApp | BlockberryDEX)[],
    onProgress?: (current: number, total: number, result: RegistrationResult) => void
): Promise<RegistrationResult[]> {
    const results: RegistrationResult[] = [];

    // Create keypair from private key
    const keypair = Ed25519Keypair.fromSecretKey(privateKey);
    const address = keypair.getPublicKey().toSuiAddress();

    console.log(`Starting bulk registration for ${dapps.length} dApps from address: ${address}`);

    for (let i = 0; i < dapps.length; i++) {
        const dapp = dapps[i];
        const dappName = dapp.projectName;

        try {
            console.log(`[${i + 1}/${dapps.length}] Registering: ${dappName}`);

            // Extract data
            const packageId = dapp.packages && dapp.packages.length > 0 ? dapp.packages[0].packageAddress : "";
            const iconUrl = dapp.imgUrl || "";
            const category = "DeFi"; // Default category

            // Get social links
            let website = "";
            let twitter = "";
            let discord = "";

            if ('socialWebsite' in dapp) {
                website = dapp.socialWebsite || "";
                twitter = dapp.socialTwitter || "";
                discord = dapp.socialDiscord || "";
            }

            // Upload description to Walrus
            const description = `${dappName} - Imported from Blockberry`;
            const descriptionBlobId = await uploadToWalrus(description);

            // Create transaction with correct argument order
            const tx = new Transaction();

            tx.moveCall({
                target: `${PACKAGE_ID}::${MODULE_NAME}::register_dapp`,
                arguments: [
                    tx.object(REGISTRY_ID),
                    tx.pure.string(dappName),                    // name
                    tx.pure.string(`${dappName} on Sui`),        // tagline
                    tx.pure.string(descriptionBlobId),           // description_blob_id
                    tx.pure.string(iconUrl),                     // icon_url
                    tx.pure.string(""),                          // banner_url (placeholder)
                    tx.pure.string(category),                    // category
                    tx.pure.string(website),                     // website
                    tx.pure.option("string", twitter || null),   // twitter
                    tx.pure.option("string", discord || null),   // discord
                    tx.pure.option("string", null),              // github
                    tx.pure.option("address", packageId || null), // package_id
                    tx.pure.vector("string", [category]),        // features
                    tx.object('0x6'),                            // clock
                ],
            });

            // Sign and execute transaction
            const result = await client.signAndExecuteTransaction({
                transaction: tx,
                signer: keypair,
                options: {
                    showEffects: true,
                }
            });

            const success = result.effects?.status?.status === "success";

            if (success) {
                console.log(`✓ Successfully registered: ${dappName}`);
                results.push({
                    success: true,
                    dappName,
                    digest: result.digest
                });
            } else {
                console.error(`✗ Failed to register: ${dappName}`, result.effects?.status);
                results.push({
                    success: false,
                    dappName,
                    error: result.effects?.status?.error || "Unknown error"
                });
            }

            // Call progress callback
            if (onProgress) {
                onProgress(i + 1, dapps.length, results[results.length - 1]);
            }

            // Add delay to avoid overwhelming the network (500ms between transactions)
            if (i < dapps.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }

        } catch (error: any) {
            console.error(`✗ Error registering ${dappName}:`, error);
            results.push({
                success: false,
                dappName,
                error: error.message || String(error)
            });

            if (onProgress) {
                onProgress(i + 1, dapps.length, results[results.length - 1]);
            }
        }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\nBulk registration complete: ${successCount}/${dapps.length} successful`);

    return results;
}
