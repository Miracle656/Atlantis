
export const NETWORK = import.meta.env.VITE_NETWORK || 'testnet';

// Network URL for SuiClient (Legacy support for useDeveloperProfile)
export const SUI_NETWORK = NETWORK === 'mainnet'
    ? 'https://fullnode.mainnet.sui.io:443'
    : 'https://fullnode.testnet.sui.io:443';

// New Network Config (for useNews and other new hooks)
export const NETWORK_CONFIG = {
    NETWORK: NETWORK,
    RPC_URL: SUI_NETWORK,
};

// News Contract configuration (from newsaggregator)
export const CONTRACT_CONFIG = {
    REGISTRY_ID: '0x68c01d2c08923d5257a5a9959d7c9250c4053dbe4641e229ccff2f35e6a3bb6d',
};

// Deployed Contract IDs (Restored from git history)
export const PACKAGE_ID = "0xf891668cf36b511419c78b8ae07ee85b6826e6fe7ecbf910558deffbeed75caa";
export const REGISTRY_ID = "0xfc8cd1e1a5f94c5663a9e84e4b4863635ee91466d50eaafebf1d96cc9e5fe2f0";
export const MODULE_NAME = 'dapp_registry';
export const CLOCK_ID = "0x6";

// Enoki Configuration
export const ENOKI_API_KEY = import.meta.env.VITE_ENOKI_API_KEY || 'enoki_public_c6930169d6800d51a67f59aff1345b40';
export const SPONSOR_ADDRESS = import.meta.env.VITE_SPONSOR_ADDRESS || '0x669fbc7dff33e6af17cd1ce556e39b791c065ffc0ea653363e69363813f6ec58';

// Blockberry API
export const BLOCKBERRY_API_KEY = import.meta.env.VITE_BLOCKBERRY_API_KEY || '';

// Wrapped NFT Contract (Testnet)
export const WRAPPED_NFT_PACKAGE_ID = "0xca29c04c74038b37ff1a4f83ffd023b7832af366d7860432815aa8f4ea90f185";
export const WRAPPED_NFT_MODULE = "sui_wrap";

// Admin Configuration
export const ADMIN_ADDRESS = import.meta.env.VITE_ADMIN_ADDRESS || '0x669fbc7dff33e6af17cd1ce556e39b791c065ffc0ea653363e69363813f6ec58';

// Walrus Configuration (Testnet) - Multiple endpoints for fallback
export const WALRUS_PUBLISHERS = [
    'https://walrus-testnet-publisher.nodes.guru',
    'https://walrus-testnet-publisher.stakely.io',
    'https://publisher.walrus-testnet.walrus.space',
    'https://walrus-testnet-publisher.everstake.one',
    'https://walrus-testnet-publisher.chainbase.online',
    'https://publisher.testnet.walrus.atalma.io',
    'https://walrus-testnet-publisher.natsai.xyz',
    'https://walrus-testnet-publisher.nodeinfra.com',
];

export const WALRUS_AGGREGATORS = [
    'https://walrus-testnet-aggregator.nodes.guru/v1',
    'https://walrus-testnet-aggregator.stakely.io/v1',
    'https://aggregator.walrus-testnet.walrus.space/v1',
    'https://walrus-testnet-aggregator.everstake.one/v1',
    'https://walrus-testnet-aggregator.chainbase.online/v1',
    'https://aggregator.testnet.walrus.atalma.io/v1',
    'https://walrus-testnet-aggregator.natsai.xyz/v1',
    'https://walrus-testnet-aggregator.nodeinfra.com/v1',
];

export const WALRUS_EPOCHS = 5; // Number of epochs to store
