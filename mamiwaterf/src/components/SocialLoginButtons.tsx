import { useConnectWallet, useCurrentAccount, useWallets } from '@mysten/dapp-kit';
import { isEnokiWallet } from '@mysten/enoki';
import { LogIn } from 'lucide-react';

export function SocialLoginButtons() {
    const currentAccount = useCurrentAccount();
    const { mutate: connect } = useConnectWallet();
    const wallets = useWallets().filter(isEnokiWallet);

    // Get Google wallet (Enoki)
    const googleWallet = wallets.find(w => w.provider === 'google');

    // Don't show if already connected
    if (currentAccount) {
        return null;
    }

    // Don't show if Enoki wallets not registered
    if (!googleWallet) {
        return null;
    }

    return (
        <div className="flex flex-col gap-2">
            <button
                onClick={() => connect({ wallet: googleWallet })}
                className="flex items-center justify-center gap-2 bg-white border-3 border-neo-black px-4 py-2 font-bold shadow-neo hover:shadow-neo-lg active:shadow-none transition-all"
            >
                <LogIn className="w-4 h-4" />
                Sign in with Google (zkLogin)
            </button>
            <p className="text-xs text-gray-500 text-center">
                No wallet needed • Get testnet SUI from{' '}
                <a
                    href="https://faucet.testnet.sui.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                >
                    faucet
                </a>
            </p>
        </div>
    );
}
