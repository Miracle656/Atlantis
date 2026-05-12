/// Module: sui_wrap
/// Sui Wrapped 2025 NFT Contract
/// Mints NFTs representing a user's yearly Sui activity with images stored on Walrus
module sui_wrap::sui_wrap {
    use std::string::{Self, String};
    use sui::package;
    use sui::display;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use std::vector;

    // ======== Structs ========
    
    /// One-time witness for the module
    public struct SUI_WRAP has drop {}
    
    /// Wrapped stats embedded in the NFT
    public struct WrappedStats has store, copy, drop {
        total_transactions: u64,
        total_gas_spent: u64,  // in MIST (1 SUI = 1_000_000_000 MIST)
        persona: String,
        days_active: u64,
        most_active_month: String,
        unique_contracts: u64,
    }
    
    /// Main NFT object
    public struct WrappedNFT has key, store {
        id: UID,
        name: String,
        description: String,
        walrus_blob_id: String,
        image_url: String,  // Full URL passed from frontend - no hardcoded aggregator
        year: u16,
        owner_address: address,
        stats: WrappedStats,
        minted_at: u64,
    }
    
    // ======== Init Function ========
    
    fun init(otw: SUI_WRAP, ctx: &mut TxContext) {
        let keys = vector[
            string::utf8(b"name"),
            string::utf8(b"description"),
            string::utf8(b"image_url"),
            string::utf8(b"project_url"),
            string::utf8(b"creator"),
        ];

        let values = vector[
            string::utf8(b"{name}"),
            string::utf8(b"{description}"),
            // Construct Walrus URL from blob ID (like Narwhal does)
            string::utf8(b"https://aggregator.walrus-testnet.walrus.space/v1/blobs/{walrus_blob_id}"),
            string::utf8(b"https://mamiwater.xyz/wrapped"),
            string::utf8(b"Atlantis"),
        ];

        let publisher = package::claim(otw, ctx);
        let mut display = display::new_with_fields<WrappedNFT>(
            &publisher, keys, values, ctx
        );
        
        display::update_version(&mut display);
        
        transfer::public_transfer(publisher, ctx.sender());
        transfer::public_transfer(display, ctx.sender());
    }
    
    // ======== Public Entry Functions ========
    
    /// Mint a new Wrapped NFT
    /// IMPORTANT: Frontend must verify the connected wallet owns these stats before calling
    /// image_url should be the complete Walrus URL (not hardcoded to avoid aggregator dependency)
    public entry fun mint_wrapped_nft(
        walrus_blob_id: vector<u8>,
        image_url: vector<u8>,  // Full URL from frontend
        owner_address: address,  // The wallet that owns these stats
        total_transactions: u64,
        total_gas_spent: u64,
        persona: vector<u8>,
        days_active: u64,
        most_active_month: vector<u8>,
        unique_contracts: u64,
        ctx: &mut TxContext
    ) {
        // CRITICAL: Only the stats owner can mint their own NFT
        assert!(ctx.sender() == owner_address, 0);
        
        let blob_id_str = string::utf8(walrus_blob_id);
        let image_url_str = string::utf8(image_url);
        
        // Create stats struct
        let stats = WrappedStats {
            total_transactions,
            total_gas_spent,
            persona: string::utf8(persona),
            days_active,
            most_active_month: string::utf8(most_active_month),
            unique_contracts,
        };
        
        // Build description with stats
        let mut description = string::utf8(b"Sui Wrapped 2025 - ");
        string::append(&mut description, stats.persona);
        string::append(&mut description, string::utf8(b" persona"));
        
        let nft = WrappedNFT {
            id: object::new(ctx),
            name: string::utf8(b"Sui Wrapped 2025"),
            description,
            walrus_blob_id: blob_id_str,
            image_url: image_url_str,  // Use full URL from frontend
            year: 2025,
            owner_address: ctx.sender(),
            stats,
            minted_at: tx_context::epoch_timestamp_ms(ctx),
        };
        
        transfer::public_transfer(nft, ctx.sender());
    }
    
    /// Update NFT description (owner only)
    public entry fun update_description(
        nft: &mut WrappedNFT,
        new_description: vector<u8>,
        ctx: &TxContext
    ) {
        assert!(nft.owner_address == ctx.sender(), 1); // Only owner can update
        nft.description = string::utf8(new_description);
    }
    
    // ======== View Functions ========
    
    /// Get NFT stats
    public fun get_stats(nft: &WrappedNFT): WrappedStats {
        nft.stats
    }
    
    /// Get Walrus image URL
    public fun get_image_url(nft: &WrappedNFT): String {
        nft.image_url
    }
    
    /// Get blob ID
    public fun get_blob_id(nft: &WrappedNFT): String {
        nft.walrus_blob_id
    }
    
    /// Get year
    public fun get_year(nft: &WrappedNFT): u16 {
        nft.year
    }
    
    /// Get total transactions from stats
    public fun get_total_transactions(stats: &WrappedStats): u64 {
        stats.total_transactions
    }
    
    /// Get total gas spent from stats
    public fun get_total_gas_spent(stats: &WrappedStats): u64 {
        stats.total_gas_spent
    }
    
    /// Get persona from stats
    public fun get_persona(stats: &WrappedStats): String {
        stats.persona
    }
}
