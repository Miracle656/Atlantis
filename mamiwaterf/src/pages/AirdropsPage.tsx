import { ExternalLink, Sparkles, AlertCircle, Calendar } from 'lucide-react';
import talusLogo from '../assets/dapplogo/talus.jpg';
import suiballLogo from '../assets/dapplogo/suiball.jpg';
import ferraLogo from '../assets/dapplogo/ferra.jpg';
import pawtatoLogo from '../assets/dapplogo/pawtato.jpg';
import momentumLogo from '../assets/dapplogo/momentum.jpg';
import group28 from '../assets/Group 28.png';
import group29 from '../assets/Group 29.png';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface Airdrop {
    name: string;
    token: string;
    status: 'ACTIVE' | 'UPCOMING' | 'UNLOCKING' | 'FARMING';
    description: string;
    eligibility: string[];
    timeline: string;
    reward: string;
    why: string;
    link?: string;
    image: string;
}

interface Farm {
    project: string;
    type: string;
    action: string;
    potential: string;
    timeline: string;
}

const activeAirdrops: Airdrop[] = [
    {
        name: 'Talus Network',
        token: '$US',
        status: 'ACTIVE',
        description: 'Decentralized AI agent infrastructure on Sui. Airdrop for early testers and community members via the Nexus platform.',
        eligibility: [
            'Claim via official portal (talus.network/claim)',
            'Stake $US for 3/6/12 months',
            'Snapshot was in Nov 2025'
        ],
        timeline: 'Claims open until Dec 14, 2025',
        reward: 'Up to thousands of $US per eligible wallet',
        why: 'TGE and listings happened Dec 11; high volume backed by Polychain.',
        link: 'https://talus.network',
        image: talusLogo
    },
    {
        name: 'Suiball NFT',
        token: 'NFT',
        status: 'UPCOMING',
        description: 'Community-driven NFT collection celebrating Sui\'s ecosystem. Special "Origin Story" edition with 3,000+ robots.',
        eligibility: [
            'Engage on X: Like, RT, reply with address',
            'Follow @suiballO for updates'
        ],
        timeline: 'Airdrop on Dec 19, 2025',
        reward: 'Free NFTs (utility for ecosystem access)',
        why: 'Ties into Sui\'s community momentum; low-effort, high-engagement play.',
        image: suiballLogo
    },
    {
        name: 'Ferra Protocol',
        token: 'Points',
        status: 'FARMING',
        description: 'Dynamic liquidity layer on Sui. 0.25% of token supply allocated to top creators and Kaito ecosystem.',
        eligibility: [
            'Connect Sui wallet to Kaito Earn',
            'Complete quests: Daily check-ins, RTs, follows'
        ],
        timeline: 'Ongoing (Snapshot TBD, likely Q4 2025)',
        reward: 'Estimated $500–$5K+ for high farmers',
        why: 'Kaito AI spotlighting Ferra; easy points stacking.',
        image: ferraLogo
    },
    {
        name: 'Pawtato Finance',
        token: '$TATO',
        status: 'UNLOCKING',
        description: 'DeFi protocol on Sui. Cliff ends soon; provides liquidity rewards via $uTATO.',
        eligibility: [
            'Provide liquidity in TATO/USDC pool on Turbos',
            'Buy/hold $uTATO for 1:1 claims'
        ],
        timeline: 'Cliff ends Dec 15, 2025',
        reward: 'Full allocation unlock (tradable now)',
        why: 'Immediate claims possible in 3 days; boosts LP activity.',
        image: pawtatoLogo
    },
    {
        name: 'Momentum Finance',
        token: '$MMT',
        status: 'FARMING',
        description: 'Concentrated Liquidity DEX on Sui. Rewards for trading and liquidity provision.',
        eligibility: [
            'Earn "Bricks" via swaps & liquidity',
            'Use app to track points'
        ],
        timeline: 'Ongoing (TGE Q1 2026)',
        reward: 'Est. $200–$2K based on activity',
        why: 'High TVL signals strong incentives; farm before snapshot.',
        image: momentumLogo
    }
];

const farms: Farm[] = [
    { project: 'Aftermath Finance', type: 'DEX Aggregator', action: 'Swap/stake $SUI; hold Eggs NFTs', potential: 'High (6/10); $AFI tokens', timeline: 'TGE Dec 2025–Jan 2026' },
    { project: 'Zofai Perps', type: 'Perpetual DEX', action: 'Trade perps; earn HYPERBOOST points', potential: 'Medium-High; $ZOF tokens', timeline: 'Airdrop Q1 2026' },
    { project: 'Magma Finance', type: 'Hybrid DEX', action: 'Provide liquidity; Point Frenzy', potential: 'Very High (10/10); $MAG tokens', timeline: 'TGE early 2026' },
    { project: 'Beepit', type: 'AI Trading', action: 'Trade agents (GRAND PRIX S1)', potential: 'Medium; points-based', timeline: 'Snapshot Dec 2025' },
    { project: 'Slush Wallet', type: 'Wallet', action: 'Use for txns; ecosystem quests', potential: 'Medium; wallet rewards', timeline: 'TGE Q1 2026' }
];

export default function AirdropsPage() {
    const img1Ref = useRef(null);
    const img2Ref = useRef(null);

    useEffect(() => {
        // Floating animation for Image 1
        gsap.to(img1Ref.current, {
            y: 15,
            rotation: 5,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut"
        });

        // Floating animation for Image 2 (antisymmetric)
        gsap.to(img2Ref.current, {
            y: -20,
            rotation: -5,
            duration: 2.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
            delay: 0.5
        });
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="neo-box bg-white p-8 mb-8 relative overflow-hidden">
                {/* Animated Decor Elements */}
                <div className="absolute top-0 right-0 w-full h-full pointer-events-none overflow-hidden">
                    <img
                        ref={img1Ref}
                        src={group28}
                        alt="Decor"
                        className="absolute top-[10%] right-[5%] w-16 sm:w-24 md:w-32 opacity-80"
                    />
                    <img
                        ref={img2Ref}
                        src={group29}
                        alt="Decor"
                        className="absolute top-[40%] right-[15%] w-12 sm:w-20 md:w-24 opacity-60"
                    />
                </div>

                <div className="relative z-10">
                    <h1 className="text-4xl sm:text-5xl font-black uppercase mb-4 tracking-tighter">
                        Airdrops <span className="text-neo-pink">& Opportunity</span>
                    </h1>
                    <p className="text-lg font-medium text-gray-700 max-w-3xl leading-relaxed">
                        The Sui ecosystem is actively rewarding early adopters. We've curated a list of
                        <span className="font-bold"> confirmed & high-potential airdrops</span> happening right now.
                        Always verify links and DYOR — scams are rampant! 🚨
                    </p>
                </div>
            </div>

            {/* Active Airdrops Grid */}
            <h2 className="text-3xl font-black uppercase mb-6 flex items-center gap-2">
                <Sparkles className="w-8 h-8 text-neo-yellow" fill="currentColor" />
                Active Campaigns
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {activeAirdrops.map((drop, idx) => (
                    <div key={idx} className="neo-box p-6 bg-white hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex flex-col h-full relative overflow-hidden">
                        {/* Status Badge */}
                        <div className={`absolute top-0 right-0 px-4 py-2 font-black text-xs uppercase border-l-2 border-b-2 border-black z-10
                            ${drop.status === 'ACTIVE' ? 'bg-neo-green text-black' :
                                drop.status === 'UPCOMING' ? 'bg-neo-cyan text-black' :
                                    drop.status === 'UNLOCKING' ? 'bg-neo-pink text-black' :
                                        'bg-neo-yellow text-black'}`}>
                            {drop.status}
                        </div>

                        <div className="mb-4 pr-16 flex items-start gap-4">
                            <div className="w-16 h-16 rounded-none overflow-hidden border-2 border-black flex-shrink-0 shadow-neo-sm">
                                <img src={drop.image} alt={drop.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase mb-1 leading-tight">{drop.name}</h3>
                                <span className="inline-block px-2 py-0.5 bg-neo-black text-white text-xs font-bold font-mono">
                                    {drop.token}
                                </span>
                            </div>
                        </div>

                        <p className="text-gray-700 font-medium mb-6 border-l-4 border-neo-gray pl-4">
                            {drop.description}
                        </p>

                        <div className="space-y-4 mb-6 flex-grow">
                            <div>
                                <h4 className="font-black text-xs uppercase text-gray-500 mb-1">How to Participate</h4>
                                <ul className="list-disc list-inside text-sm font-bold text-neo-black space-y-1">
                                    {drop.eligibility.map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="bg-neo-white p-3 border-2 border-black flex gap-3 items-start">
                                <Calendar className="w-5 h-5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-black text-xs uppercase text-gray-500">Timeline</h4>
                                    <p className="text-sm font-bold">{drop.timeline}</p>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-black text-xs uppercase text-gray-500 mb-1">Reward Potential</h4>
                                <p className="text-sm font-bold text-neo-green bg-black inline-block px-2 py-1">
                                    {drop.reward}
                                </p>
                            </div>
                        </div>

                        {drop.link && (
                            <a
                                href={drop.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-auto w-full py-3 bg-neo-black text-white font-black uppercase text-center hover:bg-white hover:text-black border-2 border-black transition-colors flex items-center justify-center gap-2"
                            >
                                Go to Project <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                ))}
            </div>

            {/* Future Farms Table */}
            <div className="neo-box p-0 bg-white overflow-hidden">
                <div className="p-6 bg-neo-pink border-b-3 border-black">
                    <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                        <AlertCircle className="w-6 h-6" />
                        High-Potential Farms (Q4 2025 - Q1 2026)
                    </h2>
                    <p className="font-bold text-sm opacity-80 mt-1">
                        Active point-earning mode. No claims yet, but snapshots imminent.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-neo-black text-white text-sm uppercase font-black">
                                <th className="p-4 border-r-2 border-white">Project</th>
                                <th className="p-4 border-r-2 border-white">Type</th>
                                <th className="p-4 border-r-2 border-white">Key Actions</th>
                                <th className="p-4 border-r-2 border-white">Potential</th>
                                <th className="p-4">Timeline</th>
                            </tr>
                        </thead>
                        <tbody className="font-medium text-sm">
                            {farms.map((farm, idx) => (
                                <tr key={idx} className="border-b-2 border-black hover:bg-neo-yellow transition-colors">
                                    <td className="p-4 font-black border-r-2 border-black uppercase">{farm.project}</td>
                                    <td className="p-4 border-r-2 border-black">{farm.type}</td>
                                    <td className="p-4 border-r-2 border-black">{farm.action}</td>
                                    <td className="p-4 border-r-2 border-black font-bold">{farm.potential}</td>
                                    <td className="p-4">{farm.timeline}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
