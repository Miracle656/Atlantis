/// Script to create Display for Wrapped NFTs
/// Run this to make your NFTs show in wallets
module sui_wrap::create_display {
    use sui::package;
    use sui::display;
    use std::string;
    use sui_wrap::sui_wrap::WrappedNFT;

    /// Create a new Display for WrappedNFT
    /// Call this function once from the package owner
    public entry fun create_nft_display(publisher: &package::Publisher, ctx: &mut TxContext) {
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
            string::utf8(b"{image_url}"),
            string::utf8(b"https://mamiwater.xyz/wrapped"),
            string::utf8(b"Atlantis"),
        ];

        let mut display_obj = display::new_with_fields<WrappedNFT>(
            publisher, keys, values, ctx
        );
        
        display::update_version(&mut display_obj);
        transfer::public_transfer(display_obj, ctx.sender());
    }
}
