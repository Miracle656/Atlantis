import { useSuiClientContext } from "@mysten/dapp-kit";
import { registerEnokiWallets, isEnokiNetwork } from "@mysten/enoki";
import { useEffect } from "react";
import { ENOKI_API_KEY } from "../constants";

/**
 * Component to register Enoki wallets with the wallet-standard
 * This enables social login (Google, Facebook, Twitch) as wallet options
 * 
 * IMPORTANT SETUP STEPS:
 * 1. Go to https://portal.enoki.mystenlabs.com
 * 2. Create/select your app
 * 3. Go to "Auth Providers" section
 * 4. Click "Add Provider" → Select "Google"
 * 5. Enter your Google Client ID: 845644888970-f2l47d20hv6c2dhqm0nugthgu47ncbpb.apps.googleusercontent.com
 * 6. Enoki will show you the redirect URI to add to Google Console
 * 7. Add that redirect URI to your Google OAuth settings
 * 8. Get your PUBLIC API key from Enoki Portal (starts with enoki_public_...)
 * 9. Update .env: VITE_ENOKI_API_KEY=enoki_public_...
 */
export function RegisterEnokiWallets() {
    const { client, network } = useSuiClientContext();

    useEffect(() => {
        if (!isEnokiNetwork(network)) {
            console.log(`Network ${network} is not supported by Enoki`);
            return;
        }

        if (!ENOKI_API_KEY) {
            console.warn("Enoki API key not configured. Please add VITE_ENOKI_API_KEY to .env");
            return;
        }

        if (ENOKI_API_KEY.startsWith('enoki_private_')) {
            console.error("You're using a PRIVATE API key. Please use a PUBLIC API key (enoki_public_...) for client-side OAuth");
            return;
        }

        console.log(`Registering Enoki wallets for network: ${network}`);

        try {
            const { unregister } = registerEnokiWallets({
                apiKey: ENOKI_API_KEY,
                providers: {
                    google: {
                        // This Client ID must be configured in Enoki Portal first!
                        clientId: '845644888970-f2l47d20hv6c2dhqm0nugthgu47ncbpb.apps.googleusercontent.com',
                    },
                },
                client: client as any, // Type assertion to bypass version mismatch
                network,
            });

            return unregister;
        } catch (error) {
            console.error("Failed to register Enoki wallets:", error);
        }
    }, [client, network]);

    return null;
}
