import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

// Configuration
const NETWORK = 'testnet';
const PACKAGE_ID = '0xf891668cf36b511419c78b8ae07ee85b6826e6fe7ecbf910558deffbeed75caa';

// Your wallet address (the one that deployed the contract)
const YOUR_WALLET_ADDRESS = 'YOUR_WALLET_ADDRESS_HERE';

async function findIndexerCap() {
    try {
        const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

        console.log('Searching for IndexerCap owned by:', YOUR_WALLET_ADDRESS);
        console.log('Package ID:', PACKAGE_ID);

        // Get all objects owned by your address
        const objects = await client.getOwnedObjects({
            owner: YOUR_WALLET_ADDRESS,
            options: {
                showType: true,
                showContent: true,
            },
        });

        console.log(`\nFound ${objects.data.length} objects owned by this address\n`);

        // Filter for IndexerCap
        const indexerCapType = `${PACKAGE_ID}::dapp_registry::IndexerCap`;
        const indexerCaps = objects.data.filter(obj => {
            const type = obj.data?.type;
            return type === indexerCapType;
        });

        if (indexerCaps.length > 0) {
            console.log('✅ Found IndexerCap(s):');
            indexerCaps.forEach((cap, index) => {
                console.log(`\n${index + 1}. IndexerCap ID: ${cap.data?.objectId}`);
                console.log(`   Type: ${cap.data?.type}`);
            });

            console.log('\n📋 Use this ID in recordInteraction.ts:');
            console.log(`INDEXER_CAP_ID = '${indexerCaps[0].data?.objectId}'`);
        } else {
            console.log('❌ No IndexerCap found for this address.');
            console.log('Make sure you deployed the contract with this wallet address.');
        }

        // Also look for AdminCap
        const adminCapType = `${PACKAGE_ID}::dapp_registry::AdminCap`;
        const adminCaps = objects.data.filter(obj => {
            const type = obj.data?.type;
            return type === adminCapType;
        });

        if (adminCaps.length > 0) {
            console.log('\n✅ Also found AdminCap(s):');
            adminCaps.forEach((cap, index) => {
                console.log(`${index + 1}. AdminCap ID: ${cap.data?.objectId}`);
            });
        }

    } catch (error) {
        console.error('Error finding IndexerCap:', error);
    }
}

// Run the script
findIndexerCap();
