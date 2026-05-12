import { SuiClient } from "@mysten/sui/client";
import { PACKAGE_ID, MODULE_NAME } from "../constants";

/**
 * Fetch the DApp object ID from the registry using the dApp name
 * Since Blockberry dApps don't have package_id in events, we match by name
 */
export async function getDAppObjectId(
    client: SuiClient,
    _packageAddress: string, // Prefixed with _ to indicate intentionally unused
    dappName?: string
): Promise<string | null> {
    try {
        // Query for DAppRegistered events
        const events = await client.queryEvents({
            query: {
                MoveEventType: `${PACKAGE_ID}::${MODULE_NAME}::DAppRegistered`,
            },
            limit: 100,
        });

        console.log("DAppRegistered events found:", events.data.length);

        if (events.data.length > 0 && dappName) {
            // Try to find the event that matches the dApp name
            for (const event of events.data) {
                const parsedJson = event.parsedJson as any;

                // Match by name (case-insensitive)
                if (parsedJson.name && parsedJson.name.toLowerCase() === dappName.toLowerCase()) {
                    console.log(`Found matching dApp by name: ${dappName}, dapp_id:`, parsedJson.dapp_id);
                    return parsedJson.dapp_id;
                }
            }
        }

        console.warn(`No DApp found with name: ${dappName}`);
        return null;
    } catch (error) {
        console.error("Error fetching DApp object ID:", error);
        return null;
    }
}
