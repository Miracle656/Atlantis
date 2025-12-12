module mamiwaterc::dapp_registry {
    use std::string::{String};
    use sui::table::{Self, Table};
    use sui::clock::{Self, Clock};
    use sui::event;

    // ====== Error Codes ======
    const ENotAuthorized: u64 = 1;
    const EInvalidRating: u64 = 2;
    const EInsufficientUsage: u64 = 3;
    const EDAppNotFound: u64 = 4;
    const EAlreadyReviewed: u64 = 5;

    // ====== Constants ======
    const MIN_INTERACTIONS_FOR_REVIEW: u64 = 1;
    const MAX_RATING: u8 = 5;

    // ====== Structs ======

    /// Global registry for all dApps
    public struct Registry has key {
        id: UID,
        dapps: Table<ID, DApp>,
        developers: Table<address, Developer>,
        admin: address,
        total_dapps: u64,
    }

    /// Developer profile
    public struct Developer has store {
        name: String,
        bio_blob_id: String, // Walrus blob ID
        avatar_url: String,
        website: Option<String>,
        twitter: Option<String>,
        verified: bool,
        dapp_ids: vector<ID>,
        created_at: u64,
    }

    /// Main dApp structure
    public struct DApp has key, store {
        id: UID,
        name: String,
        tagline: String,
        description_blob_id: String, // Walrus blob ID
        icon_url: String,
        banner_url: String,
        category: String,
        website: String,
        twitter: Option<String>,
        discord: Option<String>,
        github: Option<String>,
        
        // Smart Contract Package ID (for automatic verification)
        package_id: Option<address>, // The dApp's smart contract package ID
        
        // Developer info
        developer: address,
        
        // Metrics
        metrics: Metrics,
        
        // Rankings
        rank: u64,
        rank_change: u64,
        rank_change_positive: bool, // true = up, false = down
        
        // Community
        rating: u64, // Stored as rating * 100 (e.g., 4.5 = 450)
        review_count: u64,
        upvotes: u64,
        
        // Launch info
        launch_date: u64,
        is_featured: bool,
        
        // Features list
        features: vector<String>,
        
        // Reviews (still stored on-chain with blob IDs)
        reviews: Table<address, Review>,
        
        // Comments - REMOVED vector, only count stored
        comment_count: u64,
        
        // User interactions tracking
        user_interactions: Table<address, UserInteraction>,
        
        created_at: u64,
        updated_at: u64,
    }

    /// Metrics tracking
    public struct Metrics has store {
        users_24h: u64,
        users_7d: u64,
        users_30d: u64,
        volume_24h: u64,
        volume_7d: u64,
        volume_30d: u64,
        tvl: Option<u64>,
        transactions_24h: u64,
        last_updated: u64,
    }

    /// User review
    public struct Review has store, drop {
        user: address,
        user_name: String,
        rating: u8,
        title: String,
        content_blob_id: String, // Walrus blob ID
        date: u64,
        helpful_count: u64,
        verified: bool,
        helpful_voters: vector<address>,
    }

    /// User interaction tracking
    public struct UserInteraction has store, drop {
        user: address,
        interaction_count: u64,
        last_interaction: u64,
        first_interaction: u64,
    }

    /// Admin capability
    public struct AdminCap has key {
        id: UID,
    }

    /// Indexer capability - CRITICAL for security
    /// Only the holder of this capability can update metrics and interactions
    public struct IndexerCap has key, store {
        id: UID,
    }

    // ====== Events ======

    public struct DAppRegistered has copy, drop {
        dapp_id: ID,
        name: String,
        developer: address,
        category: String,
        timestamp: u64,
    }

    public struct ReviewAdded has copy, drop {
        dapp_id: ID,
        user: address,
        rating: u8,
        content_blob_id: String,
        timestamp: u64,
    }

    /// Comment event - contains blob ID for content stored in Walrus
    public struct CommentAdded has copy, drop {
        dapp_id: ID,
        comment_id: ID,
        user: address,
        user_name: String,
        content_blob_id: String, // Walrus blob ID
        parent_id: Option<ID>,
        is_maker: bool,
        timestamp: u64,
    }

    public struct InteractionRecorded has copy, drop {
        dapp_id: ID,
        user: address,
        interaction_count: u64,
        timestamp: u64,
    }

    public struct MetricsUpdated has copy, drop {
        dapp_id: ID,
        users_24h: u64,
        volume_24h: u64,
        timestamp: u64,
    }

    // ====== Init Function ======

    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);
        
        // Create and share the registry
        let registry = Registry {
            id: object::new(ctx),
            dapps: table::new(ctx),
            developers: table::new(ctx),
            admin,
            total_dapps: 0,
        };
        transfer::share_object(registry);

        // Transfer admin capability
        transfer::transfer(AdminCap {
            id: object::new(ctx),
        }, admin);

        // Transfer indexer capability to admin (can be transferred later)
        transfer::transfer(IndexerCap {
            id: object::new(ctx),
        }, admin);
    }

    // ====== Developer Functions ======

    /// Register as a developer
    public entry fun register_developer(
        registry: &mut Registry,
        name: String,
        bio_blob_id: String,
        avatar_url: String,
        website: Option<String>,
        twitter: Option<String>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        let developer = Developer {
            name,
            bio_blob_id,
            avatar_url,
            website,
            twitter,
            verified: false,
            dapp_ids: vector::empty(),
            created_at: clock::timestamp_ms(clock),
        };
        
        table::add(&mut registry.developers, sender, developer);
    }

    /// Verify a developer (admin only)
    public entry fun verify_developer(
        registry: &mut Registry,
        developer_address: address,
        _admin_cap: &AdminCap,
    ) {
        let developer = table::borrow_mut(&mut registry.developers, developer_address);
        developer.verified = true;
    }

    // ====== DApp Registration ======

    /// Register a new dApp
    public entry fun register_dapp(
        registry: &mut Registry,
        name: String,
        tagline: String,
        description_blob_id: String, // Walrus blob ID
        icon_url: String,
        banner_url: String,
        category: String,
        website: String,
        twitter: Option<String>,
        discord: Option<String>,
        github: Option<String>,
        package_id: Option<address>, // Smart contract package ID
        features: vector<String>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        
        // Ensure developer is registered
        assert!(table::contains(&registry.developers, sender), ENotAuthorized);
        
        let dapp_uid = object::new(ctx);
        let dapp_id = object::uid_to_inner(&dapp_uid);
        
        let dapp = DApp {
            id: dapp_uid,
            name,
            tagline,
            description_blob_id,
            icon_url,
            banner_url,
            category,
            website,
            twitter,
            discord,
            github,
            package_id,
            developer: sender,
            metrics: Metrics {
                users_24h: 0,
                users_7d: 0,
                users_30d: 0,
                volume_24h: 0,
                volume_7d: 0,
                volume_30d: 0,
                tvl: option::none(),
                transactions_24h: 0,
                last_updated: timestamp,
            },
            rank: 0,
            rank_change: 0,
            rank_change_positive: true,
            rating: 0,
            review_count: 0,
            upvotes: 0,
            launch_date: timestamp,
            is_featured: false,
            features,
            reviews: table::new(ctx),
            comment_count: 0, // Start with 0 comments
            user_interactions: table::new(ctx),
            created_at: timestamp,
            updated_at: timestamp,
        };
        
        // Add to developer's dapp list
        let developer = table::borrow_mut(&mut registry.developers, sender);
        vector::push_back(&mut developer.dapp_ids, dapp_id);
        
        // Capture values for event before moving dapp
        let dapp_name = dapp.name;
        let dapp_category = dapp.category;
        
        // Add to registry
        table::add(&mut registry.dapps, dapp_id, dapp);
        registry.total_dapps = registry.total_dapps + 1;
        
        event::emit(DAppRegistered {
            dapp_id,
            name: dapp_name,
            developer: sender,
            category: dapp_category,
            timestamp,
        });
    }

    /// Update dApp information (developer only)
    public entry fun update_dapp(
        registry: &mut Registry,
        dapp_id: ID,
        name: String,
        tagline: String,
        description_blob_id: String,
        icon_url: String,
        banner_url: String,
        category: String,
        website: String,
        twitter: Option<String>,
        discord: Option<String>,
        github: Option<String>,
        package_id: Option<address>,
        features: vector<String>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        
        // Get the dApp
        assert!(table::contains(&registry.dapps, dapp_id), EDAppNotFound);
        let dapp = table::borrow_mut(&mut registry.dapps, dapp_id);
        
        // Verify ownership
        assert!(dapp.developer == sender, ENotAuthorized);
        
        // Update fields
        dapp.name = name;
        dapp.tagline = tagline;
        dapp.description_blob_id = description_blob_id;
        dapp.icon_url = icon_url;
        dapp.banner_url = banner_url;
        dapp.category = category;
        dapp.website = website;
        dapp.twitter = twitter;
        dapp.discord = discord;
        dapp.github = github;
        dapp.package_id = package_id;
        dapp.features = features;
        dapp.updated_at = timestamp;
    }

    /// Delete a dApp (developer only)
    /// Note: This removes the dApp from the registry but reviews/comments remain in tables
    public entry fun delete_dapp(
        registry: &mut Registry,
        dapp_id: ID,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Get the dApp to verify ownership
        assert!(table::contains(&registry.dapps, dapp_id), EDAppNotFound);
        let dapp = table::borrow(&registry.dapps, dapp_id);
        assert!(dapp.developer == sender, ENotAuthorized);
        
        // Remove from developer's dapp_ids
        let developer = table::borrow_mut(&mut registry.developers, sender);
        let (found, index) = vector::index_of(&developer.dapp_ids, &dapp_id);
        if (found) {
            vector::remove(&mut developer.dapp_ids, index);
        };
        
        // Remove from registry
        let DApp { 
            id,
            name: _,
            tagline: _,
            description_blob_id: _,
            icon_url: _,
            banner_url: _,
            category: _,
            website: _,
            twitter: _,
            discord: _,
            github: _,
            package_id: _,
            developer: _,
            metrics: Metrics {
                users_24h: _,
                users_7d: _,
                users_30d: _,
                volume_24h: _,
                volume_7d: _,
                volume_30d: _,
                tvl: _,
                transactions_24h: _,
                last_updated: _,
            },
            rank: _,
            rank_change: _,
            rank_change_positive: _,
            rating: _,
            review_count: _,
            upvotes: _,
            launch_date: _,
            is_featured: _,
            features: _,
            reviews,
            comment_count: _,
            user_interactions,
            created_at: _,
            updated_at: _,
        } = table::remove(&mut registry.dapps, dapp_id);
        
        // Clean up tables
        table::drop(reviews);
        table::drop(user_interactions);
        object::delete(id);
        
        registry.total_dapps = registry.total_dapps - 1;
    }

    /// Transfer dApp ownership to another developer
    public entry fun transfer_dapp_ownership(
        registry: &mut Registry,
        dapp_id: ID,
        new_owner: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Verify new owner is a registered developer
        assert!(table::contains(&registry.developers, new_owner), ENotAuthorized);
        
        // Get the dApp and verify current ownership
        assert!(table::contains(&registry.dapps, dapp_id), EDAppNotFound);
        let dapp = table::borrow_mut(&mut registry.dapps, dapp_id);
        assert!(dapp.developer == sender, ENotAuthorized);
        
        // Remove from current developer's list
        let current_dev = table::borrow_mut(&mut registry.developers, sender);
        let (found, index) = vector::index_of(&current_dev.dapp_ids, &dapp_id);
        if (found) {
            vector::remove(&mut current_dev.dapp_ids, index);
        };
        
        // Add to new developer's list
        let new_dev = table::borrow_mut(&mut registry.developers, new_owner);
        vector::push_back(&mut new_dev.dapp_ids, dapp_id);
        
        // Update dApp ownership
        dapp.developer = new_owner;
    }

    // ====== User Interaction Tracking ======

    /// Record a user interaction with a dApp
    /// SECURITY: Requires IndexerCap - only trusted backend can call this
    public entry fun record_interaction(
        _indexer_cap: &IndexerCap, // Capability required
        registry: &mut Registry,
        dapp_id: ID,
        user: address,
        clock: &Clock,
    ) {
        let timestamp = clock::timestamp_ms(clock);
        
        assert!(table::contains(&registry.dapps, dapp_id), EDAppNotFound);
        let dapp = table::borrow_mut(&mut registry.dapps, dapp_id);
        
        if (table::contains(&dapp.user_interactions, user)) {
            let interaction = table::borrow_mut(&mut dapp.user_interactions, user);
            interaction.interaction_count = interaction.interaction_count + 1;
            interaction.last_interaction = timestamp;
        } else {
            let interaction = UserInteraction {
                user,
                interaction_count: 1,
                last_interaction: timestamp,
                first_interaction: timestamp,
            };
            table::add(&mut dapp.user_interactions, user, interaction);
        };
        
        let interaction = table::borrow(&dapp.user_interactions, user);
        
        event::emit(InteractionRecorded {
            dapp_id,
            user,
            interaction_count: interaction.interaction_count,
            timestamp,
        });
    }

    // ====== Review System ======

    /// Add a review to a dApp
    public entry fun add_review(
        registry: &mut Registry,
        dapp_id: ID,
        user_name: String,
        rating: u8,
        title: String,
        content_blob_id: String, // Walrus blob ID
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        
        assert!(rating > 0 && rating <= MAX_RATING, EInvalidRating);
        assert!(table::contains(&registry.dapps, dapp_id), EDAppNotFound);
        
        let dapp = table::borrow_mut(&mut registry.dapps, dapp_id);
        
        // Check if user has already reviewed
        assert!(!table::contains(&dapp.reviews, sender), EAlreadyReviewed);
        
        // Check if user has interactions (for verified badge)
        // Anyone can review, but only users with interactions get the "verified" badge
        let verified = if (table::contains(&dapp.user_interactions, sender)) {
            let interaction = table::borrow(&dapp.user_interactions, sender);
            interaction.interaction_count >= MIN_INTERACTIONS_FOR_REVIEW
        } else {
            false
        };
        
        // No assertion here - anyone can review!
        // The 'verified' flag will show if they actually used the dApp
        
        let review = Review {
            user: sender,
            user_name,
            rating,
            title,
            content_blob_id,
            date: timestamp,
            helpful_count: 0,
            verified,
            helpful_voters: vector::empty(),
        };
        
        table::add(&mut dapp.reviews, sender, review);
        
        // Update dApp rating
        dapp.review_count = dapp.review_count + 1;
        let total_rating = (dapp.rating * (dapp.review_count - 1)) + ((rating as u64) * 100);
        dapp.rating = total_rating / dapp.review_count;
        dapp.updated_at = timestamp;
        
        event::emit(ReviewAdded {
            dapp_id,
            user: sender,
            rating,
            content_blob_id,
            timestamp,
        });
    }

    /// Mark a review as helpful
    public entry fun mark_review_helpful(
        registry: &mut Registry,
        dapp_id: ID,
        reviewer: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        assert!(table::contains(&registry.dapps, dapp_id), EDAppNotFound);
        let dapp = table::borrow_mut(&mut registry.dapps, dapp_id);
        
        let review = table::borrow_mut(&mut dapp.reviews, reviewer);
        
        // Check if user already voted
        if (!vector::contains(&review.helpful_voters, &sender)) {
            vector::push_back(&mut review.helpful_voters, sender);
            review.helpful_count = review.helpful_count + 1;
        };
    }

    // ====== Comment System ======

    /// Add a comment to a dApp
    /// Comments are NOT stored on-chain, only emitted as events
    /// Indexer reconstructs comment threads from events
    public entry fun add_comment(
        registry: &mut Registry,
        dapp_id: ID,
        user_name: String,
        content_blob_id: String, // Walrus blob ID
        parent_id: Option<ID>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        
        assert!(table::contains(&registry.dapps, dapp_id), EDAppNotFound);
        let dapp = table::borrow_mut(&mut registry.dapps, dapp_id);
        
        let comment_id = object::id_from_address(tx_context::fresh_object_address(ctx));
        let is_maker = sender == dapp.developer;
        
        // Increment comment count
        dapp.comment_count = dapp.comment_count + 1;
        dapp.updated_at = timestamp;
        
        // Emit event with blob ID
        event::emit(CommentAdded {
            dapp_id,
            comment_id,
            user: sender,
            user_name,
            content_blob_id,
            parent_id,
            is_maker,
            timestamp,
        });
    }

    // ====== Metrics Management ======

    /// Update dApp metrics
    /// SECURITY: Requires IndexerCap - only trusted backend can call this
    public entry fun update_metrics(
        _indexer_cap: &IndexerCap, // Capability required
        registry: &mut Registry,
        dapp_id: ID,
        users_24h: u64,
        users_7d: u64,
        users_30d: u64,
        volume_24h: u64,
        volume_7d: u64,
        volume_30d: u64,
        tvl: Option<u64>,
        transactions_24h: u64,
        clock: &Clock,
    ) {
        let timestamp = clock::timestamp_ms(clock);
        
        assert!(table::contains(&registry.dapps, dapp_id), EDAppNotFound);
        let dapp = table::borrow_mut(&mut registry.dapps, dapp_id);
        
        dapp.metrics.users_24h = users_24h;
        dapp.metrics.users_7d = users_7d;
        dapp.metrics.users_30d = users_30d;
        dapp.metrics.volume_24h = volume_24h;
        dapp.metrics.volume_7d = volume_7d;
        dapp.metrics.volume_30d = volume_30d;
        dapp.metrics.tvl = tvl;
        dapp.metrics.transactions_24h = transactions_24h;
        dapp.metrics.last_updated = timestamp;
        dapp.updated_at = timestamp;
        
        event::emit(MetricsUpdated {
            dapp_id,
            users_24h,
            volume_24h,
            timestamp,
        });
    }

    // ====== Admin Functions ======

    /// Feature a dApp (admin only)
    public entry fun feature_dapp(
        registry: &mut Registry,
        dapp_id: ID,
        is_featured: bool,
        _admin_cap: &AdminCap,
    ) {
        assert!(table::contains(&registry.dapps, dapp_id), EDAppNotFound);
        let dapp = table::borrow_mut(&mut registry.dapps, dapp_id);
        dapp.is_featured = is_featured;
    }

    /// Update dApp rank (admin only)
    public entry fun update_rank(
        registry: &mut Registry,
        dapp_id: ID,
        new_rank: u64,
        rank_change: u64,
        rank_change_positive: bool,
        _admin_cap: &AdminCap,
    ) {
        assert!(table::contains(&registry.dapps, dapp_id), EDAppNotFound);
        let dapp = table::borrow_mut(&mut registry.dapps, dapp_id);
        dapp.rank = new_rank;
        dapp.rank_change = rank_change;
        dapp.rank_change_positive = rank_change_positive;
    }

    // ====== View Functions ======

    /// Get dApp rating (returns rating * 100)
    public fun get_dapp_rating(registry: &Registry, dapp_id: ID): u64 {
        let dapp = table::borrow(&registry.dapps, dapp_id);
        dapp.rating
    }

    /// Get dApp review count
    public fun get_review_count(registry: &Registry, dapp_id: ID): u64 {
        let dapp = table::borrow(&registry.dapps, dapp_id);
        dapp.review_count
    }

    /// Get dApp comment count
    public fun get_comment_count(registry: &Registry, dapp_id: ID): u64 {
        let dapp = table::borrow(&registry.dapps, dapp_id);
        dapp.comment_count
    }

    /// Check if user has reviewed a dApp
    public fun has_reviewed(registry: &Registry, dapp_id: ID, user: address): bool {
        let dapp = table::borrow(&registry.dapps, dapp_id);
        table::contains(&dapp.reviews, user)
    }

    /// Get user interaction count
    public fun get_user_interactions(registry: &Registry, dapp_id: ID, user: address): u64 {
        let dapp = table::borrow(&registry.dapps, dapp_id);
        if (table::contains(&dapp.user_interactions, user)) {
            let interaction = table::borrow(&dapp.user_interactions, user);
            interaction.interaction_count
        } else {
            0
        }
    }
}
