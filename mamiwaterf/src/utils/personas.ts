export type PersonaType = 'Voyager' | 'Liquidity Lord' | 'Collector' | 'Degen' | 'Whale' | 'New Fish';

export interface Persona {
    type: PersonaType;
    title: string;
    description: string;
    icon: string; // Emoji for now
    color: string;
}

export const PERSONAS: Record<PersonaType, Persona> = {
    'Voyager': {
        type: 'Voyager',
        title: 'The Voyager',
        description: 'You sail the Sui seas with purpose. Steady, exploring, and always moving forward.',
        icon: '⛵',
        color: 'bg-blue-400'
    },
    'Liquidity Lord': {
        type: 'Liquidity Lord',
        title: 'Liquidity Lord',
        description: 'You are the market maker. Pools, swaps, and yield are your daily bread.',
        icon: '🌊',
        color: 'bg-neo-green'
    },
    'Collector': {
        type: 'Collector',
        title: 'The Curator',
        description: 'Your gallery is vast. You value digital art and ownership above all else.',
        icon: '🐚',
        color: 'bg-neo-pink'
    },
    'Degen': {
        type: 'Degen',
        title: 'Ape Warlord',
        description: 'Speed, volume, and risk. You live fast and transact faster.',
        icon: '⚡',
        color: 'bg-neo-yellow'
    },
    'Whale': {
        type: 'Whale',
        title: 'The Leviathan',
        description: 'Your splashes move the market. A true titan of the ecosystem.',
        icon: '🐳',
        color: 'bg-purple-500'
    },
    'New Fish': {
        type: 'New Fish',
        title: 'Baby Guppy',
        description: 'Welcome to the ocean! Your journey has just begun.',
        icon: '🐠',
        color: 'bg-cyan-300'
    }
};

export function determinePersona(
    txCount: number, 
    gasUsed: number, 
    uniqueInteractions: number,
    daysActive: number
): Persona {
    // 1. New User Check
    if (txCount < 5 || daysActive < 2) return PERSONAS['New Fish'];

    // 2. Whale Check (High Gas Burn = High Activity/Complexity)
    // Assuming gasUsed is in SUI. 100 SUI is a lot of gas (approx 100k txns or heavy moves)
    if (gasUsed > 50) return PERSONAS['Whale'];

    // 3. Degen Check (High frequency)
    const txPerDay = txCount / Math.max(daysActive, 1);
    if (txPerDay > 10) return PERSONAS['Degen'];

    // 4. Explorer/Diversity Check
    if (uniqueInteractions > 20) return PERSONAS['Voyager'];
    
    // Default fallback
    return PERSONAS['Voyager'];
}
