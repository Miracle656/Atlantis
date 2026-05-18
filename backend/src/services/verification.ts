
// @mysten/sui v2.16 moved the JSON-RPC client out of ./client (now the
// abstract base) into ./jsonRpc, renaming SuiClient -> SuiJsonRpcClient
// and getFullnodeUrl -> getJsonRpcFullnodeUrl. Aliased back to the old
// names so the rest of this file is unchanged.
import {
    SuiJsonRpcClient as SuiClient,
    getJsonRpcFullnodeUrl as getFullnodeUrl,
} from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import dotenv from 'dotenv';

dotenv.config();

const NETWORK = process.env.SUI_NETWORK || 'testnet';
const MODULE_NAME = 'dapp_registry';

/**
 * Lazily resolve the verification service's config + Sui client + signer.
 *
 * Previously this validated env + built the client at module-load time and
 * threw if anything was missing — which crashed the ENTIRE server (including
 * the unrelated agent eval endpoints) whenever the mamiwaterc registry
 * vars weren't set. Now a missing/invalid config only fails the
 * /api/verify-user request, not the process.
 */
interface VerificationCtx {
    client: SuiClient;
    adminKeypair: Ed25519Keypair;
    packageId: string;
    registryId: string;
    indexerCapId: string;
}

let _ctx: VerificationCtx | null = null;

function getVerificationCtx(): VerificationCtx {
    if (_ctx) return _ctx;

    const packageId = process.env.PACKAGE_ID;
    const registryId = process.env.REGISTRY_ID;
    const indexerCapId = process.env.INDEXER_CAP_ID;
    const adminSecretKey = process.env.ADMIN_SECRET_KEY;

    if (!packageId || !registryId || !indexerCapId || !adminSecretKey) {
        throw new Error(
            'Verification service is not configured (PACKAGE_ID / REGISTRY_ID / ' +
            'INDEXER_CAP_ID / ADMIN_SECRET_KEY missing). This endpoint is independent ' +
            'of the agent eval endpoints.'
        );
    }

    let adminKeypair: Ed25519Keypair;
    try {
        adminKeypair = Ed25519Keypair.fromSecretKey(adminSecretKey);
    } catch (e) {
        console.error('Failed to load admin keypair:', e);
        throw new Error('Invalid ADMIN_SECRET_KEY format');
    }

    _ctx = {
        client: new SuiClient({
            url: getFullnodeUrl(NETWORK as 'testnet' | 'mainnet'),
            network: NETWORK as 'testnet' | 'mainnet',
        }),
        adminKeypair,
        packageId,
        registryId,
        indexerCapId,
    };
    return _ctx;
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

    // Resolve config lazily — a missing registry config fails only this
    // request, not the whole process.
    let ctx: VerificationCtx;
    try {
        ctx = getVerificationCtx();
    } catch (e: any) {
        console.error('Verification not configured:', e?.message);
        return { verified: false, message: e?.message ?? 'Verification service unavailable.' };
    }
    const { client, adminKeypair, packageId, registryId, indexerCapId } = ctx;

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

        // Check if any transaction interacts with the dApp package.
        // Heuristic: stringify the tx and search for the package id. Good enough
        // for v0; a precise check would walk transaction.data.transaction.transactions
        // and match each MoveCall target. `tx: any` since the precise SuiTransactionBlockResponse
        // type imports vary across SDK minor versions and we only need stringify here.
        const hasInteracted = transactions.data.some((tx: any) => {
            return JSON.stringify(tx).includes(dappPackageId);
        });

        if (!hasInteracted) {
            return { verified: false, message: "No recent interaction found with this dApp." };
        }

        console.log(`Interaction found! Recording verification for ${userAddress}...`);

        // 3. Record Interaction On-Chain using IndexerCap
        const tx = new Transaction();

        tx.moveCall({
            target: `${packageId}::${MODULE_NAME}::record_interaction`,
            arguments: [
                tx.object(indexerCapId),    // The capability object
                tx.object(registryId),      // The registry
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
