import { useSuiName } from '../hooks/useSuiName';

interface DisplayNameProps {
    name: string;
    className?: string;
}

export default function DisplayName({ name, className = '' }: DisplayNameProps) {
    const isAddress = name.startsWith('0x') && name.length > 10;
    const { data: suiName } = useSuiName(isAddress ? name : null);

    const displayName = !isAddress
        ? name
        : (suiName || `${name.slice(0, 6)}...${name.slice(-4)}`);

    return <span className={className}>{displayName}</span>;
}
