import { Link } from 'react-router-dom';
import type { Category } from '../types';
import { categories } from '../data/mockData';
import { useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit';
import {
    Coins,
    Image,
    Gamepad2,
    Users,
    ShoppingBag,
    Server,
    Vote,
    Wallet,
    BarChart3,
    Layers,
    ChevronLeft,
    ChevronRight,
    X,
    ArrowLeftRight,
    Banknote,
    Sprout,
    Landmark,
    Rocket,
    Droplets,
    Building2,
    Scale,
    TestTube,
    CreditCard,
    TrendingUp,
    User
} from 'lucide-react';

const categoryIcons: Record<Category, React.ReactNode> = {
    DeFi: <Coins className="w-5 h-5" />,
    NFT: <Image className="w-5 h-5" />,
    Gaming: <Gamepad2 className="w-5 h-5" />,
    Social: <Users className="w-5 h-5" />,
    Marketplace: <ShoppingBag className="w-5 h-5" />,
    Infrastructure: <Server className="w-5 h-5" />,
    DAO: <Vote className="w-5 h-5" />,
    Wallet: <Wallet className="w-5 h-5" />,
    Analytics: <BarChart3 className="w-5 h-5" />,
    Other: <Layers className="w-5 h-5" />,
    Bridge: <ArrowLeftRight className="w-5 h-5" />,
    DEX: <ArrowLeftRight className="w-5 h-5" />,
    Lending: <Banknote className="w-5 h-5" />,
    Yield: <Sprout className="w-5 h-5" />,
    CDP: <Landmark className="w-5 h-5" />,
    Launchpad: <Rocket className="w-5 h-5" />,
    'Liquid Staking': <Droplets className="w-5 h-5" />,
    RWA: <Building2 className="w-5 h-5" />,
    'Algo Stables': <Scale className="w-5 h-5" />,
    Synthetics: <TestTube className="w-5 h-5" />,
    Payments: <CreditCard className="w-5 h-5" />,
    Derivatives: <TrendingUp className="w-5 h-5" />,
};

interface SidebarProps {
    selectedCategory?: Category | 'all';
    onCategoryChange?: (category: Category | 'all') => void;
    isMobileOpen?: boolean;
    onMobileClose?: () => void;
}

export default function Sidebar({ selectedCategory = 'all', onCategoryChange, isMobileOpen = false, onMobileClose }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <>
            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={onMobileClose}
                />
            )}

            <aside
                className={`
                    fixed md:sticky top-0 md:top-20 inset-y-0 left-0 z-50 
                    bg-neo-white border-r-3 border-neo-black 
                    h-full md:h-[calc(100vh-5rem)] 
                    transition-all duration-300 ease-in-out flex flex-col
                    ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
                    ${isCollapsed ? 'md:w-20' : 'md:w-64'}
                `}
            >
                {/* Mobile Close Button */}
                <button
                    onClick={onMobileClose}
                    className="absolute top-4 right-4 md:hidden p-1 hover:bg-neo-pink border-2 border-transparent hover:border-neo-black transition-all z-10"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-6 mt-12 md:mt-0">
                    {/* Toggle Button */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden md:block absolute -right-4 top-6 bg-neo-yellow border-2 border-neo-black shadow-neo-sm p-1 text-neo-black hover:bg-neo-pink transition-colors z-10"
                    >
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>

                    {/* Connect Wallet Button - Mobile Only */}
                    <div className="md:hidden mb-4">
                        <ConnectButton
                            connectText="CONNECT WALLET"
                            className="!w-full !bg-neo-pink !text-neo-black !font-black !border-2 !border-neo-black !shadow-neo !px-4 !py-3 !text-sm !uppercase hover:!translate-y-[-2px] hover:!shadow-neo-lg !transition-all !rounded-none"
                        />
                    </div>

                    {/* Explore Web3 */}
                    <div>
                        <button
                            onClick={() => {
                                onCategoryChange?.('all');
                                const element = document.getElementById('trending-dapps');
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth' });
                                } else {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-3 border-2 transition-all mb-2 uppercase font-bold ${selectedCategory === 'all'
                                ? 'bg-neo-pink text-neo-black border-neo-black shadow-neo-sm'
                                : 'bg-white text-gray-500 border-transparent hover:border-neo-black hover:shadow-neo-sm hover:text-neo-black'
                                }`}
                            title={isCollapsed ? "Explore Web3" : undefined}
                        >
                            <Layers className="w-5 h-5 flex-shrink-0" />
                            {!isCollapsed && <span className="whitespace-nowrap">Explore Web3</span>}
                        </button>

                        {!isCollapsed && (
                            <div className="ml-4 space-y-1 border-l-3 border-neo-black pl-4">
                                <Link to="/rankings" className="block px-4 py-2 text-sm font-bold text-gray-500 hover:text-neo-black hover:bg-neo-yellow border-2 border-transparent hover:border-neo-black transition-all uppercase">
                                    Rankings
                                </Link>
                                <Link to="/submit" className="block px-4 py-2 text-sm font-bold text-gray-500 hover:text-neo-black hover:bg-neo-green border-2 border-transparent hover:border-neo-black transition-all uppercase">
                                    Submit dApp
                                </Link>
                                <Link to="/profile" className="block px-4 py-2 text-sm font-bold text-gray-500 hover:text-neo-black hover:bg-neo-pink border-2 border-transparent hover:border-neo-black transition-all uppercase flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Profile
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Trending Now */}
                    <div>
                        {!isCollapsed && (
                            <h3 className="px-4 text-xs font-black text-neo-black uppercase tracking-wider mb-3 flex items-center justify-between border-b-2 border-neo-black pb-1">
                                <span>Trending now</span>
                                <BarChart3 className="w-3 h-3" />
                            </h3>
                        )}
                        <div className="space-y-1">
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => {
                                        onCategoryChange?.(category);
                                        const element = document.getElementById('trending-dapps');
                                        if (element) {
                                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        } else {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    }}
                                    className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-2 border-2 transition-all text-sm font-bold uppercase ${selectedCategory === category
                                        ? 'bg-neo-cyan text-neo-black border-neo-black shadow-neo-sm'
                                        : 'bg-transparent text-gray-500 border-transparent hover:bg-white hover:border-neo-black hover:shadow-neo-sm hover:text-neo-black'
                                        }`}
                                    title={isCollapsed ? category : undefined}
                                >
                                    {categoryIcons[category]}
                                    {!isCollapsed && <span>{category}</span>}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rewards / Other */}
                    <div>
                        {!isCollapsed && (
                            <h3 className="px-4 text-xs font-black text-neo-black uppercase tracking-wider mb-3 border-b-2 border-neo-black pb-1">
                                Rewards
                            </h3>
                        )}
                        <div className="space-y-1">
                            <Link
                                to="/updates"
                                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-2 border-2 border-transparent rounded-none text-sm font-bold text-gray-500 hover:bg-white hover:border-neo-black hover:shadow-neo-sm hover:text-neo-black transition-all uppercase`}
                                title={isCollapsed ? "Updates" : undefined}
                            >
                                <Vote className="w-5 h-5 flex-shrink-0" />
                                {!isCollapsed && <span>Updates</span>}
                            </Link>
                            <Link
                                to="/airdrops"
                                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'space-x-3 px-4'} py-2 border-2 border-transparent rounded-none text-sm font-bold text-gray-500 hover:bg-white hover:border-neo-black hover:shadow-neo-sm hover:text-neo-black transition-all uppercase`}
                                title={isCollapsed ? "Airdrops" : undefined}
                            >
                                <Coins className="w-5 h-5 flex-shrink-0" />
                                {!isCollapsed && <span>Airdrops</span>}
                            </Link>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
