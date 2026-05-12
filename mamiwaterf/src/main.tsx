import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider, createNetworkConfig } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { ToastProvider } from './components/Toast';
import App from './App.tsx';
import { RegisterEnokiWallets } from './components/RegisterEnokiWallets.tsx';
import './index.css';
import '@mysten/dapp-kit/dist/index.css';

const queryClient = new QueryClient();

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
  mainnet: { url: getFullnodeUrl('mainnet') },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <RegisterEnokiWallets />
        <WalletProvider autoConnect>
          <ToastProvider>
            <App />
          </ToastProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </StrictMode>,
);
