import { createContext, useContext, useState, type ReactNode } from 'react';
import type { DApp } from '../types';

interface MiniAppContextType {
    activeDApp: DApp | null;
    isOpen: boolean;
    isMinimized: boolean;
    openMiniApp: (dapp: DApp) => void;
    closeMiniApp: () => void;
    toggleMinimize: () => void;
}

const MiniAppContext = createContext<MiniAppContextType | undefined>(undefined);

export function MiniAppProvider({ children }: { children: ReactNode }) {
    const [activeDApp, setActiveDApp] = useState<DApp | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const openMiniApp = (dapp: DApp) => {
        setActiveDApp(dapp);
        setIsOpen(true);
        setIsMinimized(false);
    };

    const closeMiniApp = () => {
        setIsOpen(false);
        setActiveDApp(null);
        setIsMinimized(false);
    };

    const toggleMinimize = () => {
        setIsMinimized(prev => !prev);
    };

    return (
        <MiniAppContext.Provider value={{ activeDApp, isOpen, isMinimized, openMiniApp, closeMiniApp, toggleMinimize }}>
            {children}
        </MiniAppContext.Provider>
    );
}

export function useMiniApp() {
    const context = useContext(MiniAppContext);
    if (context === undefined) {
        throw new Error('useMiniApp must be used within a MiniAppProvider');
    }
    return context;
}
