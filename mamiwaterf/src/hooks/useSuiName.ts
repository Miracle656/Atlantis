import { useSuiClient } from '@mysten/dapp-kit';
import { useQuery } from '@tanstack/react-query';

export function useSuiName(address: string | undefined | null) {
    const client = useSuiClient();

    return useQuery({
        queryKey: ['sui-name', address],
        queryFn: async () => {
            if (!address) return null;

            // Validate address format (should be 0x followed by 64 hex chars)
            const addressRegex = /^0x[a-fA-F0-9]{64}$/;
            if (!addressRegex.test(address)) {
                // Silently return null for invalid/truncated addresses
                return null;
            }

            try {
                const name = await client.resolveNameServiceNames({
                    address,
                    limit: 1,
                });
                return name.data?.[0] || null;
            } catch (error) {
                // Silently fail - most addresses don't have SuiNS names
                return null;
            }
        },
        enabled: !!address,
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false, // Don't retry on failure
    });
}
