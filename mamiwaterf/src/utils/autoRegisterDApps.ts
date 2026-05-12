import { Transaction } from "@mysten/sui/transactions";
import { PACKAGE_ID, REGISTRY_ID, MODULE_NAME } from "../constants";
import type { DApp } from "../types";

/**
 * Creates a transaction to register a dApp from Blockberry data
 * This uses minimal data since Blockberry provides most info
 */
export function createRegisterDAppTransaction(dapp: DApp): Transaction {
    const tx = new Transaction();

    // Use a simple description since we don't have full details from Blockberry
    const descriptionBlobId = ""; // Empty for Blockberry dApps

    tx.moveCall({
        target: `${PACKAGE_ID}::${MODULE_NAME}::register_dapp`,
        arguments: [
            tx.object(REGISTRY_ID),
            tx.pure.string(dapp.name),
            tx.pure.string(dapp.tagline),
            tx.pure.string(descriptionBlobId), // Empty blob ID
            tx.pure.string(dapp.iconUrl),
            tx.pure.string(dapp.bannerUrl),
            tx.pure.string(dapp.category),
            tx.pure.string(dapp.website || ""),
            tx.pure.option('string', dapp.twitter || null),
            tx.pure.option('string', dapp.discord || null),
            tx.pure.option('string', dapp.github || null),
            tx.pure.option('address', dapp.packageId || null),
            tx.pure.vector('string', dapp.features),
            tx.object('0x6'), // Clock object
        ],
    });

    return tx;
}

/**
 * Batch register multiple dApps in a single transaction
 * Note: This may hit gas limits if too many dApps are registered at once
 */
export function createBatchRegisterTransaction(dapps: DApp[]): Transaction {
    const tx = new Transaction();

    for (const dapp of dapps) {
        const descriptionBlobId = "";

        tx.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::register_dapp`,
            arguments: [
                tx.object(REGISTRY_ID),
                tx.pure.string(dapp.name),
                tx.pure.string(dapp.tagline),
                tx.pure.string(descriptionBlobId),
                tx.pure.string(dapp.iconUrl),
                tx.pure.string(dapp.bannerUrl),
                tx.pure.string(dapp.category),
                tx.pure.string(dapp.website || ""),
                tx.pure.option('string', dapp.twitter || null),
                tx.pure.option('string', dapp.discord || null),
                tx.pure.option('string', dapp.github || null),
                tx.pure.option('address', dapp.packageId || null),
                tx.pure.vector('string', dapp.features),
                tx.object('0x6'),
            ],
        });
    }

    return tx;
}
