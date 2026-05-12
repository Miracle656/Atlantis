/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(num: number): string {
    if (num >= 1_000_000_000) {
        return `${(num / 1_000_000_000).toFixed(1)}B`;
    }
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
        return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
}

/**
 * Format currency values
 */
export function formatCurrency(num: number): string {
    return `$${formatNumber(num)}`;
}

/**
 * Format percentage change
 */
export function formatPercentage(num: number): string {
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
}

/**
 * Format date to relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
}

/**
 * Check if a dApp was launched recently (within 7 days)
 */
export function isNewLaunch(launchDate: string): boolean {
    const launch = new Date(launchDate);
    const now = new Date();
    const diffInDays = (now.getTime() - launch.getTime()) / (1000 * 60 * 60 * 24);
    return diffInDays <= 7;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
}

/**
 * Generate a random color for avatars
 */
export function getRandomColor(seed: string): string {
    const colors = [
        'bg-gradient-to-br from-primary-500 to-accent-purple',
        'bg-gradient-to-br from-accent-cyan to-sui-blue',
        'bg-gradient-to-br from-accent-pink to-accent-orange',
        'bg-gradient-to-br from-accent-purple to-primary-600',
    ];

    const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}
