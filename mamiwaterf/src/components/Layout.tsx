import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useState } from 'react';
import type { Category } from '../types';
import { MiniAppProvider } from '../context/MiniAppContext';
import MiniAppContainer from './MiniAppContainer';
import logo from '../assets/Group 27.png';
import suilogo from "../assets/image001.png"
import walruslogo from "../assets/6864f039b26f4afedada6c10_logo.svg"
import suinslogo from "../assets/suinslogo.svg"
import enokilogo from "../assets/enoki.png"

export default function Layout() {
    const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <MiniAppProvider>
            <div className="min-h-screen bg-neo-white flex flex-col font-sans text-neo-black">
                <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
                <div className="flex-1 max-w-[1600px] mx-auto w-full flex relative">
                    <Sidebar
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        isMobileOpen={isMobileMenuOpen}
                        onMobileClose={() => setIsMobileMenuOpen(false)}
                    />
                    <main className="flex-1 min-w-0">
                        <Outlet context={{ selectedCategory }} />
                    </main>
                </div>
                <MiniAppContainer />
                <footer className="border-t-2 sm:border-t-3 border-neo-black py-8 sm:py-12 bg-neo-black text-neo-white mt-auto">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
                            <div className="sm:col-span-2 md:col-span-1">
                                <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-white flex items-center justify-center text-neo-black shadow-[4px_4px_0px_0px_#ffffff] overflow-hidden">
                                        <img src={logo} alt="Atlantis Logo" className="w-full h-full object-cover" />
                                    </div>
                                    <span className="font-black text-lg sm:text-xl uppercase tracking-tighter font-dungeon">ATLANTIS</span>
                                </div>
                                <p className="text-xs sm:text-sm font-medium text-gray-300">
                                    Discover the best dApps in the Sui ecosystem.
                                    <br />
                                    <span className="text-neo-yellow font-bold uppercase">Raw. Real-time. Brutal.</span>
                                </p>
                            </div>

                            <div>
                                <h3 className="font-black uppercase text-neo-pink mb-3 sm:mb-4 text-base sm:text-lg">Explore</h3>
                                <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm font-bold uppercase tracking-wide">
                                    <li><a href="/" className="hover:text-neo-yellow transition-colors hover:underline decoration-2 underline-offset-4">Trending</a></li>
                                    <li><a href="/rankings" className="hover:text-neo-yellow transition-colors hover:underline decoration-2 underline-offset-4">Rankings</a></li>
                                    <li><a href="/submit" className="hover:text-neo-yellow transition-colors hover:underline decoration-2 underline-offset-4">Submit dApp</a></li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-black uppercase text-neo-cyan mb-4 text-lg">Categories</h3>
                                <ul className="space-y-2 text-sm font-bold uppercase tracking-wide">
                                    <li><a href="/?category=DeFi" className="hover:text-neo-yellow transition-colors hover:underline decoration-2 underline-offset-4">DeFi</a></li>
                                    <li><a href="/?category=NFT" className="hover:text-neo-yellow transition-colors hover:underline decoration-2 underline-offset-4">NFT</a></li>
                                    <li><a href="/?category=Gaming" className="hover:text-neo-yellow transition-colors hover:underline decoration-2 underline-offset-4">Gaming</a></li>
                                    <li><a href="/?category=Social" className="hover:text-neo-yellow transition-colors hover:underline decoration-2 underline-offset-4">Social</a></li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-black uppercase text-neo-green mb-4 text-lg">Community</h3>
                                <ul className="space-y-2 text-sm font-bold uppercase tracking-wide">
                                    <li><a href="#" className="hover:text-neo-yellow transition-colors hover:underline decoration-2 underline-offset-4">Twitter</a></li>
                                    <li><a href="#" className="hover:text-neo-yellow transition-colors hover:underline decoration-2 underline-offset-4">Discord</a></li>
                                    <li><a href="#" className="hover:text-neo-yellow transition-colors hover:underline decoration-2 underline-offset-4">GitHub</a></li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t-2 border-white/20 text-center text-xs sm:text-sm font-bold uppercase tracking-wide sm:tracking-widest text-gray-400">
                            <p>© 2025 ATLANTIS. Built for the Sui ecosystem.</p>
                            {/* Fun Badge */}
                            <div className="mt-6 sm:mt-8 flex justify-center px-4">
                                <div className="bg-white border-2 border-black px-3 sm:px-6 py-2 sm:py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] inline-block transform -rotate-1 sm:-rotate-2">
                                    <p className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2 font-black uppercase text-xs sm:text-sm">
                                        <span className="whitespace-nowrap">Powered by</span>
                                        <span className="flex items-center gap-1.5 sm:gap-2">
                                            <img className='w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain' src={suilogo} alt="Sui" />
                                            <img className='w-12 h-6 sm:w-16 sm:h-8 md:w-20 md:h-10 object-contain' src={walruslogo} alt="Walrus" />
                                            <img className='w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain' src={suinslogo} alt="SuiNS" />
                                            <img className='w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain' src={enokilogo} alt="Enoki" />
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </MiniAppProvider>
    );
}
