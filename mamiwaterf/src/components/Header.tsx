import { Link, useNavigate } from 'react-router-dom';
import { Search, Rocket, Menu, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { ConnectButton } from '@mysten/dapp-kit';
import logo from '../assets/Group 27.png';
import { useDApps } from '../hooks/useDApps';

interface HeaderProps {
    onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { data: dapps } = useDApps();

    // Filter dApps based on search query
    const searchResults = searchQuery.trim()
        ? (dapps || []).filter(dapp =>
            dapp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dapp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dapp.category.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 5) // Limit to 5 results
        : [];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchFocus = () => {
        if (searchQuery.trim()) {
            setShowResults(true);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);
        setShowResults(value.trim().length > 0);
    };

    const handleResultClick = (dappId: string) => {
        navigate(`/dapp/${dappId}`);
        setSearchQuery('');
        setShowResults(false);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setShowResults(false);
    };

    return (
        <header className="sticky top-0 z-50 bg-neo-white border-b-3 border-neo-black h-16 sm:h-20">
            <div className="h-full px-2 sm:px-4 flex items-center justify-between gap-2">
                {/* Left Section: Menu & Logo */}
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink">
                    <button
                        onClick={onMenuClick}
                        className="md:hidden p-1.5 sm:p-2 hover:bg-neo-yellow border-2 border-transparent hover:border-neo-black transition-all flex-shrink-0"
                    >
                        <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
                    </button>

                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group min-w-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 sm:border-3 border-neo-black shadow-neo-sm flex items-center justify-center group-hover:translate-x-1 group-hover:translate-y-1 group-hover:shadow-none transition-all overflow-hidden bg-white flex-shrink-0">
                            <img src={logo} alt="Atlantis Logo" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-base sm:text-xl font-black text-neo-black uppercase tracking-tighter font-dungeon truncate">
                            ATLANTIS
                        </span>
                    </Link>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-xl mx-4 hidden md:block" ref={searchRef}>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neo-black pointer-events-none z-10" />
                        <input
                            type="text"
                            placeholder="SEARCH DAPPS..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onFocus={handleSearchFocus}
                            className="w-full h-12 pl-10 pr-10 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-bold uppercase placeholder-gray-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-neo-pink transition-colors z-10"
                            >
                                <X className="w-4 h-4 text-neo-black" />
                            </button>
                        )}

                        {/* Search Results Dropdown */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-3 border-neo-black shadow-neo-lg max-h-96 overflow-y-auto z-50">
                                {searchResults.map((dapp) => (
                                    <button
                                        key={dapp.id}
                                        onClick={() => handleResultClick(dapp.id)}
                                        className="w-full px-4 py-3 text-left hover:bg-neo-yellow border-b-2 border-neo-black last:border-b-0 transition-colors flex items-center gap-3"
                                    >
                                        {dapp.iconUrl && (
                                            <img
                                                src={dapp.iconUrl}
                                                alt={dapp.name}
                                                className="w-10 h-10 border-2 border-neo-black object-cover"
                                            />
                                        )}
                                        <div className="flex-1">
                                            <div className="font-bold text-neo-black">{dapp.name}</div>
                                            <div className="text-sm text-gray-600 uppercase">{dapp.category}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* No Results */}
                        {showResults && searchQuery.trim() && searchResults.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-3 border-neo-black shadow-neo-lg p-4 z-50">
                                <p className="text-center text-gray-600 font-bold">No dApps found for "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-6 flex-shrink-0">
                    <button className="md:hidden p-1.5 sm:p-2 hover:bg-neo-cyan border-2 border-transparent hover:border-neo-black transition-all flex-shrink-0">
                        <Search className="w-5 h-5 sm:w-6 sm:h-6 text-neo-black" />
                    </button>

                    <Link
                        to="/submit"
                        className="hidden lg:flex items-center space-x-2 px-3 py-2 bg-neo-white border-3 border-neo-black shadow-neo hover:shadow-neo-lg hover:-translate-y-1 transition-all text-sm font-bold text-neo-black uppercase"
                    >
                        <Rocket className="w-4 h-4" />
                        <span>List Project</span>
                    </Link>

                    <div className="h-8 w-1 bg-neo-black hidden lg:block" />

                    <div className="hidden md:flex items-center">
                        <div className="neo-button-wrapper">
                            <ConnectButton connectText="CONNECT" className="!bg-neo-pink !text-neo-black !font-black !border-2 !border-neo-black !shadow-[4px_4px_0px_0px_#000000] hover:!translate-y-[-2px] hover:!shadow-[6px_6px_0px_0px_#000000] !transition-all !rounded-none !uppercase !px-2 sm:!px-4 !py-1.5 sm:!py-2 !h-auto !text-xs sm:!text-sm" />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
