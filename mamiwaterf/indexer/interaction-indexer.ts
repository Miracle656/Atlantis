import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Configuration
const NETWORK = 'testnet';
const PACKAGE_ID = 'YOUR_PACKAGE_ID'; // The Mamiwater contract package ID
const REGISTRY_ID = 'YOUR_REGISTRY_ID'; // The Registry object ID
const INDEXER_CAP_ID = 'YOUR_INDEXER_CAP_ID'; // The IndexerCap object ID
const ADMIN_SECRET_KEY = 'YOUR_PRIVATE_KEY'; // Admin private key (be careful!)

// Initialize Client
const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

// Initialize Admin Keypair
// NOTE: In production, use a secure key management system
const keypair = Ed25519Keypair.fromSecretKey(fromB64(ADMIN_SECRET_KEY));

// Helper to decode base64 private key if needed
function fromB64(str: string): Uint8Array {
    return Uint8Array.from(Buffer.from(str, 'base64'));
}

// State to track last processed checkpoint
let lastCheckpoint = 0n;

async function main() {
    console.log('🚀 Starting Interaction Indexer...');
    console.log(`Network: ${NETWORK}`);
    console.log(`Indexer Address: ${keypair.toSuiAddress()}`);

    // Get latest checkpoint to start from
    const latest = await client.getLatestCheckpointSequenceNumber();
    lastCheckpoint = BigInt(latest) - 100n; // Start 100 checkpoints back just in case

    // Start polling loop
    while (true) {
        try {
            await processNewCheckpoints();
        } catch (e) {
            console.error('Error in polling loop:', e);
        }
        // Wait 2 seconds before next poll
        await new Promise(r => setTimeout(r, 2000));
    }
}

async function processNewCheckpoints() {
    const latest = await client.getLatestCheckpointSequenceNumber();
    const latestBn = BigInt(latest);

    if (latestBn <= lastCheckpoint) return;

    console.log(`Processing checkpoints ${lastCheckpoint + 1n} to ${latestBn}...`);

    // Fetch transactions in this range (simplified for example)
    // In production, you'd fetch checkpoint details

    // For this example, we'll query recent transactions for specific dApp packages
    // You would maintain a list of registered dApp package IDs
    const monitoredPackages = ['0x...dapp1', '0x...dapp2'];

    for (const pkgId of monitoredPackages) {
        await checkPackageInteractions(pkgId);
    }

    lastCheckpoint = latestBn;
}

async function checkPackageInteractions(targetPackageId: string) {
    // Query transactions involving this package
    const txs = await client.queryTransactionBlocks({
        filter: {
            InputObject: targetPackageId, // Or MoveFunction filter
        },
        options: {
            showEffects: true,
            showInput: true,
        },
        limit: 10,
    });

    for (const tx of txs.data) {
        const sender = tx.transaction?.data.sender;
        const status = tx.effects?.status.status;

        if (sender && status === 'success') {
            console.log(`✅ Detected interaction: User ${sender} with Package ${targetPackageId}`);
            await recordInteractionOnChain(sender, targetPackageId);
        }
    }
}

async function recordInteractionOnChain(userAddress: string, dappPackageId: string) {
    try {
        const txb = new TransactionBlock();

        // Find the dApp ID corresponding to this package ID
        // You'd need a mapping or lookup here
        const dappId = 'DAPP_OBJECT_ID';

        txb.moveCall({
            target: `${PACKAGE_ID}::dapp_registry::record_interaction`,
            arguments: [
                txb.object(INDEXER_CAP_ID),
                txb.object(REGISTRY_ID),
                txb.pure(dappId),
                txb.pure(userAddress),
                txb.object('0x6'), // Clock
            ],
        });

        const result = await client.signAndExecuteTransactionBlock({
            signer: keypair,
            transactionBlock: txb,
        });

        console.log(`📝 Recorded interaction on-chain. Tx: ${result.digest}`);
    } catch (e) {
        console.error(`Failed to record interaction:`, e);
    }
}

main().catch(console.error);
