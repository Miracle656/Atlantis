
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex, toHex } from "@mysten/sui/utils";
import dotenv from 'dotenv';

dotenv.config();

const PACKAGE_ID = process.env.PACKAGE_ID;
const REGISTRY_ID = process.env.REGISTRY_ID;
const INDEXER_CAP_ID = process.env.INDEXER_CAP_ID;
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY;
const NETWORK = process.env.SUI_NETWORK || 'testnet';
const MODULE_NAME = 'dapp_registry';

if (!PACKAGE_ID || !REGISTRY_ID || !INDEXER_CAP_ID || !ADMIN_SECRET_KEY) {
    throw new Error("Missing required environment variables for verification service");
}

// Initialize Sui Client
const client = new SuiClient({
    url: getFullnodeUrl(NETWORK as 'testnet' | 'mainnet'),
});

// Initialize Admin Signer
// The key is likely in bech32 format (suiprivkey...) or hex
let adminKeypair: Ed25519Keypair;
try {
    if (ADMIN_SECRET_KEY.startsWith('suiprivkey')) {
        adminKeypair = Ed25519Keypair.fromSecretKey(ADMIN_SECRET_KEY);
    } else {
        // Assume hex or other format if needed, but standard is bech32 now
        // Fallback for raw bytes if needed, but let's stick to standard import
        adminKeypair = Ed25519Keypair.fromSecretKey(ADMIN_SECRET_KEY);
    }
} catch (e) {
    console.error("Failed to load admin keypair:", e);
    throw new Error("Invalid ADMIN_SECRET_KEY format");
}

export const verifyUserInteraction = async (
    userAddress: string,
    dappId: string,
    dappPackageId?: string
): Promise<{ verified: boolean; txDigest?: string, message?: string }> => {

    console.log(`Verifying user ${userAddress} for dApp ${dappId} (Package: ${dappPackageId})`);

    // 1. Check if user provided a package ID to check against
    if (!dappPackageId) {
        return { verified: false, message: "DApp has no smart contract package ID linked." };
    }

    // 2. Query User's Transaction History
    // We look for any transaction where the user interacted with the dApp's package
    try {
        const transactions = await client.queryTransactionBlocks({
            filter: {
                FromAddress: userAddress
            },
            options: {
                showInput: true,
                showEffects: true,
                showEvents: true
            },
            limit: 50, // Check last 50 transactions
            order: "descending"
        });

        // Check if any transaction interacts with the dApp package
        const hasInteracted = transactions.data.some(tx => {
            // Check move calls
            const moveCalls = tx.transaction?.data.transaction.kind === 'ProgrammableTransaction'
                ? tx.transaction.data.transaction.transactions
                : [];

            // This is a simplified check. A robust check would inspect every move call target.
            // Converting to JSON string to quick search for package ID is a heuristic.
            return JSON.stringify(tx).includes(dappPackageId);
        });

        if (!hasInteracted) {
            return { verified: false, message: "No recent interaction found with this dApp." };
        }

        console.log(`Interaction found! Recording verification for ${userAddress}...`);

        // 3. Record Interaction On-Chain using IndexerCap
        const tx = new Transaction();

        tx.moveCall({
            target: `${PACKAGE_ID}::${MODULE_NAME}::record_interaction`,
            arguments: [
                tx.object(INDEXER_CAP_ID!), // The capability object
                tx.object(REGISTRY_ID!),    // The registry
                tx.pure.id(dappId),         // The dApp ID
                tx.pure.address(userAddress), // The user to verify
                tx.object('0x6'),           // Clock
            ],
        });

        const result = await client.signAndExecuteTransaction({
            signer: adminKeypair,
            transaction: tx,
            options: {
                showEffects: true,
            },
        });

        console.log("Verification recorded:", result.digest);

        if (result.effects?.status.status === 'success') {
            return { verified: true, txDigest: result.digest };
        } else {
            console.error("Verification transaction failed:", result.effects?.status);
            return { verified: false, message: "Verification transaction failed on-chain." };
        }

    } catch (error) {
        console.error("Verification process error:", error);
        return { verified: false, message: "Internal verification error." };
    }
};
