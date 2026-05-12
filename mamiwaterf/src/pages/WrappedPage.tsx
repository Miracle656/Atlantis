import { useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import { useSuiWrappedStats } from '../hooks/useSuiWrappedStats';
import { PERSONAS } from '../utils/personas';
import { Loader2, Share2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { uploadToWalrus, elementToBlob } from '../utils/walrusUpload';
import { WRAPPED_NFT_PACKAGE_ID, WRAPPED_NFT_MODULE } from '../constants';
import toast, { Toaster } from 'react-hot-toast';

export default function WrappedPage() {
    const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
    const [targetInput, setTargetInput] = useState('');
    const [resolvedAddress, setResolvedAddress] = useState<string | undefined>(undefined);
    const [isResolving, setIsResolving] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Acquiring user data...');
    const [isMinting, setIsMinting] = useState(false);
    const [mintStatus, setMintStatus] = useState<string>('');

    const { data: stats, isLoading, error } = useSuiWrappedStats(network, resolvedAddress);
    const currentAccount = useCurrentAccount();
    const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    // Privacy check: is user viewing their own stats?
    const isViewingOwnStats = currentAccount?.address === resolvedAddress;

    // Cycle through loading messages
    useEffect(() => {
        if (!isLoading) return;

        const messages = [
            'Acquiring user data...',
            'Fetching transactions...',
            'Analyzing blockchain activity...',
            'Processing coin flows...',
            'Calculating gas fees...',
            'Generating insights...'
        ];

        let index = 0;
        const interval = setInterval(() => {
            index = (index + 1) % messages.length;
            setLoadingMessage(messages[index]);
        }, 2000); // Change message every 2 seconds

        return () => clearInterval(interval);
    }, [isLoading]);

    const resolveInput = async () => {
        if (!targetInput) return;

        // If it looks like an address, use it directly
        if (targetInput.startsWith('0x') && targetInput.length > 50) {
            setResolvedAddress(targetInput);
            nextSlide();
            return;
        }

        // Try SuiNS resolution
        if (targetInput.includes('.')) {
            setIsResolving(true);
            try {
                const client = new SuiClient({ url: getFullnodeUrl(network) });
                const address = await client.resolveNameServiceAddress({
                    name: targetInput
                });

                if (address) {
                    setResolvedAddress(address);
                    nextSlide();
                } else {
                    alert('Could not resolve SuiNS name');
                }
            } catch (e) {
                console.error(e);
                alert('Error resolving name');
            } finally {
                setIsResolving(false);
            }
        }
    };

    // Removed auto-jump to prevent skipping slides
    // User will navigate manually through the story

    const [slideIndex, setSlideIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const slideRef = useRef<HTMLDivElement>(null);

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const element = document.getElementById('wrapped-card');
        if (element) {
            try {
                const canvas = await html2canvas(element, {
                    backgroundColor: '#000000',
                    scale: 2 // High res
                });
                const data = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = data;
                link.download = `sui-wrapped-2025-${stats?.persona || 'atlantis'}.png`;
                link.click();
            } catch (err) {
                console.error("Failed to generate image", err);
            }
        }
    };

    const handleMintNFT = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!currentAccount || !stats || !resolvedAddress) {
            toast.error('Please connect your wallet and view your stats');
            return;
        }

        // Privacy check: prevent minting others' stats
        if (!isViewingOwnStats) {
            toast.error('You can only mint your own stats!');
            return;
        }

        setIsMinting(true);
        setMintStatus('Capturing image...');

        try {
            // 1. Capture wrapped card as image
            const element = document.getElementById('wrapped-card');
            if (!element) {
                throw new Error('Wrapped card element not found');
            }

            const blob = await elementToBlob(element);
            if (!blob) {
                throw new Error('Failed to create image');
            }

            // 2. Upload to Walrus
            setMintStatus('Uploading to Walrus...');
            const walrusResult = await uploadToWalrus(blob);
            if (!walrusResult) {
                throw new Error('Failed to upload to Walrus');
            }

            console.log('Walrus upload successful:', walrusResult);

            // 3. Prepare transaction
            setMintStatus('Preparing transaction...');
            const tx = new Transaction();

            tx.moveCall({
                target: `${WRAPPED_NFT_PACKAGE_ID}::${WRAPPED_NFT_MODULE}::mint_wrapped_nft`,
                arguments: [
                    tx.pure.string(walrusResult.blobId),
                    tx.pure.string(walrusResult.url),
                    tx.pure.address(resolvedAddress),
                    tx.pure.u64(stats.totalTxns),
                    tx.pure.u64(Math.floor(stats.gasBurned * 1_000_000_000)), // Convert to MIST
                    tx.pure.string(stats.persona),
                    tx.pure.u64(stats.daysActive),
                    tx.pure.string(stats.monthlyStats?.mostActiveMonth?.month || 'N/A'),
                    tx.pure.u64(stats.uniqueInteractions),
                ],
            });

            // 4. Sign and execute
            setMintStatus('Waiting for signature...');
            signAndExecuteTransaction(
                {
                    transaction: tx,
                },
                {
                    onSuccess: (result) => {
                        console.log('NFT minted successfully!', result);
                        setMintStatus('NFT Minted! 🎉');
                        toast.success(`NFT Minted Successfully! TX: ${result.digest.slice(0, 8)}...`);
                        setIsMinting(false);
                    },
                    onError: (error) => {
                        console.error('Minting failed:', error);
                        setMintStatus('');
                        toast.error(`Minting failed: ${error.message}`);
                        setIsMinting(false);
                    },
                }
            );
        } catch (error: any) {
            console.error('Minting error:', error);
            toast.error(`Error: ${error.message}`);
            setMintStatus('');
            setIsMinting(false);
        }
    };

    const toggleNetwork = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNetwork(prev => prev === 'mainnet' ? 'testnet' : 'mainnet');
    };

    const slides = [
        // Slide 0: Intro
        (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <h1 className="text-6xl font-black uppercase mb-4 text-white tracking-tighter wrapped-title">
                    Sui Wrapped <span className="text-neo-pink block text-4xl mt-2">by Atlantis</span>
                </h1>
                <div className="flex flex-col gap-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xl font-bold text-neo-yellow mb-2 wrapped-text">
                        Your 2025 Deep Dive
                    </p>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Wallet or name.sui (Optional)"
                            value={targetInput}
                            onChange={(e) => setTargetInput(e.target.value)}
                            className="flex-1 bg-white border-4 border-black p-4 font-bold text-black placeholder-gray-500 shadow-neo focus:outline-none"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') resolveInput();
                            }}
                        />
                    </div>

                    <button
                        onClick={targetInput ? resolveInput : () => {
                            // Use connected wallet address when diving in
                            if (currentAccount?.address) {
                                setResolvedAddress(currentAccount.address);
                                nextSlide();
                            } else {
                                toast.error('Please connect your wallet first');
                            }
                        }}
                        disabled={isResolving}
                        className="bg-neo-pink text-black font-black px-8 py-4 uppercase text-xl hover:scale-105 transition-transform border-4 border-black shadow-neo-lg disabled:opacity-50"
                    >
                        {isResolving ? 'Resolving...' : (targetInput ? 'Check This Wallet' : 'Dive In with My Wallet')}
                    </button>

                    {targetInput && (
                        <p className="text-xs text-white font-mono uppercase mt-2">Checking specific wallet/SuiNS</p>
                    )}
                </div>
            </div>
        ),
        // Slide 1: Stats
        (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <h2 className="text-4xl font-black uppercase mb-12 text-white">The Numbers</h2>

                <div className="space-y-8 w-full max-w-md">
                    <div className="neo-box bg-neo-yellow p-6 transform -rotate-2">
                        <p className="font-bold text-sm uppercase mb-1">Total Transactions</p>
                        <p className="text-5xl font-black">{stats?.totalTxns || 0}</p>
                    </div>

                    <div className="neo-box bg-neo-pink p-6 transform rotate-1">
                        <p className="font-bold text-sm uppercase mb-1">Gas Burned (SUI)</p>
                        <p className="text-5xl font-black">{stats?.gasBurned || 0}</p>
                    </div>

                    <div className="neo-box bg-neo-cyan p-6 transform -rotate-1">
                        <p className="font-bold text-sm uppercase mb-1">Days Active</p>
                        <p className="text-5xl font-black">{stats?.daysActive || 0}</p>
                    </div>
                </div>
            </div>
        ),
        // Slide 2: Highest Inflow Month
        (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <h2 className="text-4xl font-black uppercase mb-12 text-white">Peak Activity</h2>
                <div className="neo-box bg-neo-green p-8 transform rotate-2 max-w-md w-full">
                    <p className="font-bold text-sm uppercase mb-2 text-black">Highest Inflow Month</p>
                    <p className="text-6xl font-black mb-2 text-black">{stats?.monthlyStats.highestInflowMonth.month}</p>
                    <div className="bg-black text-neo-yellow px-4 py-2 inline-block transform -rotate-1">
                        <p className="text-2xl font-black">{stats?.monthlyStats.highestInflowMonth.txCount} TXs</p>
                    </div>
                </div>
            </div>
        ),
        // Slide 3: Lowest Inflow Month
        (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <h2 className="text-4xl font-black uppercase mb-12 text-white">Quiet Times</h2>
                <div className="neo-box bg-neo-pink p-8 transform -rotate-2 max-w-md w-full">
                    <p className="font-bold text-sm uppercase mb-2 text-black">Lowest Inflow Month</p>
                    <p className="text-6xl font-black text-black">{stats?.monthlyStats.lowestInflowMonth.month}</p>
                </div>
            </div>
        ),
        // Slide 4: Most Active Month
        (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <h2 className="text-4xl font-black uppercase mb-12 text-white">Your Power Month</h2>
                <div className="neo-box bg-neo-yellow p-8 transform rotate-1 max-w-md w-full">
                    <p className="font-bold text-sm uppercase mb-2 text-black">Most Active Month</p>
                    <p className="text-5xl font-black mb-2 text-black">{stats?.monthlyStats.mostActiveMonth.month}</p>
                    <div className="bg-black text-neo-cyan px-4 py-2 inline-block transform -rotate-1">
                        <p className="text-3xl font-black">{stats?.monthlyStats.mostActiveMonth.txCount} TXs</p>
                    </div>
                </div>
            </div>
        ),
        // Slide 5: Contract Interactions
        (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <h2 className="text-4xl font-black uppercase mb-12 text-white">On-Chain Footprint</h2>
                <div className="space-y-6 w-full max-w-md">
                    <div className="neo-box bg-neo-cyan p-6 transform -rotate-1">
                        <p className="font-bold text-sm uppercase mb-1 text-black">Unique Contracts</p>
                        <p className="text-5xl font-black text-black">{stats?.contractStats.uniqueContracts}</p>
                    </div>
                    <div className="neo-box bg-white p-6 transform rotate-2">
                        <p className="font-bold text-sm uppercase mb-2 text-black">Top Contract</p>
                        <p className="text-xs font-mono text-black mb-1">{stats?.contractStats.mostInteracted.address.substring(0, 16)}...</p>
                        <div className="bg-neo-pink text-black px-3 py-1 inline-block font-black">
                            {stats?.contractStats.mostInteracted.count} interactions
                        </div>
                    </div>
                </div>
            </div>
        ),
        // Slide 6: Top Coins
        (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <h2 className="text-4xl font-black uppercase mb-12 text-white">Your Treasure</h2>

                <div className="space-y-4 w-full max-w-md">
                    {(!stats?.coins || stats.coins.length === 0) && (
                        <div className="neo-box bg-gray-800 p-6">
                            <p className="text-white font-bold">No coins found</p>
                        </div>
                    )}
                    {stats?.coins.slice(0, 5).map((coin, idx) => {
                        const colors = ['bg-neo-pink', 'bg-neo-cyan', 'bg-neo-yellow', 'bg-neo-green', 'bg-white'];
                        const rotations = ['rotate-1', '-rotate-1', 'rotate-2', '-rotate-2', 'rotate-1'];
                        return (
                            <div key={idx} className={`neo-box ${colors[idx]} p-4 transform ${rotations[idx]}`}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="text-black font-black text-lg">#{idx + 1}</span>
                                        <span className="text-black font-bold truncate">{coin.symbol || 'Unknown'}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        ),
        // Slide 7: Persona Reveal
        (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <h2 className="text-3xl font-black uppercase mb-8 text-white">Your Sui Vibe Is...</h2>

                {stats && PERSONAS[stats.persona] && (
                    <div className={`neo-box ${PERSONAS[stats.persona].color} p-8 border-4 border-white shadow-2xl max-w-md w-full relative overflow-hidden`}>
                        <div className="text-9xl mb-4">{PERSONAS[stats.persona].icon}</div>
                        <h1 className="text-5xl font-black uppercase mb-4 text-black leading-none break-words">
                            {PERSONAS[stats.persona].title}
                        </h1>
                        <p className="text-xl font-bold bg-black text-white p-4 inline-block transform rotate-1">
                            {PERSONAS[stats.persona].description}
                        </p>
                    </div>
                )}
            </div>
        ),
        // Slide 8: Outro
        (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <h1 className="text-5xl font-black uppercase mb-8 text-white">You Conquered 2025</h1>

                {mintStatus && (
                    <div className="mb-4 px-6 py-3 bg-neo-pink text-black font-bold rounded">
                        {mintStatus}
                    </div>
                )}

                <div className="flex flex-col gap-4 w-full max-w-xs">
                    {/* Only show mint/share buttons if viewing own stats */}
                    {isViewingOwnStats && (
                        <>
                            <button
                                onClick={handleMintNFT}
                                disabled={isMinting}
                                className="bg-neo-pink text-black font-black px-6 py-4 uppercase flex items-center justify-center gap-2 hover:bg-white transition-colors border-2 border-black shadow-neo disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isMinting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Minting...
                                    </>
                                ) : (
                                    <>
                                        🎨 Mint as NFT
                                    </>
                                )}
                            </button>
                            <button onClick={handleShare} className="bg-neo-green text-black font-black px-6 py-4 uppercase flex items-center justify-center gap-2 hover:bg-white transition-colors border-2 border-black shadow-neo">
                                <Share2 className="w-5 h-5" />
                                Share Result
                            </button>
                        </>
                    )}

                    {!isViewingOwnStats && currentAccount && (
                        <div className="bg-neo-yellow text-black font-bold px-6 py-4 rounded">
                            <p className="text-sm">📌 Viewing another wallet's stats</p>
                            <p className="text-xs mt-2">Connect your own wallet to mint your Wrapped NFT</p>
                        </div>
                    )}

                    <Link to="/" onClick={(e) => e.stopPropagation()} className="bg-transparent text-white font-bold px-6 py-4 uppercase flex items-center justify-center gap-2 hover:underline">
                        Back to Home <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        )
    ];

    const nextSlide = () => {
        if (slideIndex < slides.length - 1) {
            // Animate out
            gsap.to(slideRef.current, {
                opacity: 0,
                x: -50,
                duration: 0.3,
                onComplete: () => {
                    setSlideIndex(prev => prev + 1);
                    // Animate in
                    gsap.fromTo(slideRef.current,
                        { opacity: 0, x: 50 },
                        { opacity: 1, x: 0, duration: 0.3 }
                    );
                }
            });
        }
    };

    const prevSlide = () => {
        if (slideIndex > 0) {
            // Animate out
            gsap.to(slideRef.current, {
                opacity: 0,
                x: 50,
                duration: 0.3,
                onComplete: () => {
                    setSlideIndex(prev => prev - 1);
                    // Animate in
                    gsap.fromTo(slideRef.current,
                        { opacity: 0, x: -50 },
                        { opacity: 1, x: 0, duration: 0.3 }
                    );
                }
            });
        }
    };

    // Initial Animation
    useEffect(() => {
        if (slideRef.current) {
            gsap.fromTo(slideRef.current,
                { opacity: 0, scale: 0.9 },
                { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
            );
        }
    }, [slideIndex]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-neo-black flex flex-col items-center justify-center text-white">
                <Loader2 className="w-16 h-16 text-neo-pink animate-spin mb-6" />
                <p className="text-2xl font-black text-white animate-pulse">{loadingMessage}</p>
                <p className="text-sm text-gray-400 mt-2">This may take a moment...</p>
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="min-h-screen bg-neo-black flex flex-col items-center justify-center text-white p-4">
                <h1 className="text-4xl font-black mb-4">Rough Seas 🌊</h1>
                <p className="mb-4 font-bold">We couldn't fetch stats for this wallet.</p>
                <div className="flex gap-4">
                    <button onClick={() => window.location.reload()} className="bg-white text-black px-6 py-3 font-black uppercase border-2 border-black shadow-neo hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">Retry</button>
                    <Link to="/" className="bg-neo-black border-2 border-white text-white px-6 py-3 font-black uppercase hover:bg-white hover:text-black hover:border-black transition-colors">Return Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-neo-black overflow-hidden relative cursor-pointer" onClick={nextSlide}>
            {/* Toast Notifications */}
            <Toaster position="top-center" />

            {/* Network Toggle */}
            <div className="absolute top-4 right-4 z-50">
                <button
                    onClick={toggleNetwork}
                    className="bg-neo-black border-2 border-white text-white text-xs font-bold px-3 py-1 uppercase hover:bg-white hover:text-black transition-colors"
                >
                    {network}
                </button>
            </div>

            {/* Progress Bar */}
            <div className="absolute top-0 left-0 w-full h-2 flex gap-1 z-40">
                {slides.map((_, idx) => (
                    <div key={idx} className="flex-1 bg-gray-800 h-full">
                        <div
                            className={`h-full bg-neo-pink transition-all duration-300 ${idx <= slideIndex ? 'w-full' : 'w-0'}`}
                        />
                    </div>
                ))}
            </div>

            {/* Content */}
            <div ref={slideRef} className="h-screen w-full">
                {slides[slideIndex]}
            </div>

            {/* Hint & Navigation */}
            <div className="absolute bottom-4 w-full flex items-center justify-center gap-4 pointer-events-none">
                <button
                    onClick={(e) => { e.stopPropagation(); prevSlide(); }}
                    disabled={slideIndex === 0}
                    className="pointer-events-auto bg-neo-cyan text-black font-bold px-4 py-2 uppercase text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform border-2 border-black shadow-neo"
                >
                    ← Prev
                </button>
                <p className="text-gray-500 font-mono text-xs uppercase animate-pulse">Tap to continue</p>
                <button
                    onClick={(e) => { e.stopPropagation(); nextSlide(); }}
                    disabled={slideIndex === slides.length - 1}
                    className="pointer-events-auto bg-neo-cyan text-black font-bold px-4 py-2 uppercase text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 transition-transform border-2 border-black shadow-neo"
                >
                    Next →
                </button>
            </div>

            {/* Hidden Capture Card */}
            {stats && (
                <div id="wrapped-card" className="fixed top-0 left-0 -z-50 w-[400px] h-[600px] bg-neo-black p-8 text-white flex flex-col items-center justify-between border-8 border-neo-pink">
                    <div className="text-center">
                        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Sui Wrapped</h1>
                        <p className="text-neo-yellow font-bold uppercase tracking-widest text-sm">2025 Edition</p>
                    </div>

                    <div className="text-center">
                        <div className="text-8xl mb-4">{PERSONAS[stats.persona]?.icon}</div>
                        <h2 className="text-4xl font-black uppercase text-neo-green mb-2">{PERSONAS[stats.persona]?.title}</h2>
                        <p className="text-sm font-medium px-4 opacity-80">{PERSONAS[stats.persona]?.description}</p>
                    </div>

                    <div className="w-full grid grid-cols-2 gap-4 mt-8">
                        <div className="bg-gray-900 p-4 text-center">
                            <p className="text-xs text-gray-400 uppercase">Txns</p>
                            <p className="text-2xl font-black">{stats.totalTxns}</p>
                        </div>
                        <div className="bg-gray-900 p-4 text-center">
                            <p className="text-xs text-gray-400 uppercase">First Swim</p>
                            <p className="text-2xl font-black">{stats.daysActive}d</p>
                        </div>
                    </div>

                    <div className="text-center mt-4">
                        <p className="text-xs font-mono text-gray-500">Generated by Atlantis</p>
                    </div>
                </div>
            )}
        </div>
    );
}
