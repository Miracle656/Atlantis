import { ExternalLink, MessageCircle, Coins } from 'lucide-react';
import type { NewsArticle } from '../types';

interface NewsCardProps {
    article: NewsArticle;
}

export default function NewsCard({ article }: NewsCardProps) {
    const bgImage = article.image
        ? `https://wsrv.nl/?url=${encodeURIComponent(article.image)}&w=800&output=webp`
        : `https://placehold.co/600x400/000000/FFF?text=${article.category || 'News'}`;

    return (
        <div className="h-full flex flex-col bg-white border-3 border-neo-black shadow-neo hover:shadow-neo-lg hover:translate-y-[-2px] transition-all duration-200 group relative overflow-hidden">
            {/* Image Container */}
            <div className="relative h-48 border-b-3 border-neo-black overflow-hidden bg-gray-100">
                <img
                    src={bgImage}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />
                <div className="absolute top-2 right-2 bg-neo-yellow border-2 border-neo-black shadow-neo-sm px-2 py-1 text-xs font-bold uppercase z-10">
                    {article.category}
                </div>
                {/* Source badge */}
                <div className="absolute bottom-0 left-0 bg-neo-black text-white px-3 py-1 text-xs font-mono border-t-2 border-r-2 border-neo-black">
                    {article.source}
                </div>
            </div>

            {/* Content */}
            <div className="p-4 flex-1 flex flex-col relative z-20 bg-white">
                <div className="mb-2 text-xs font-mono text-gray-500 flex justify-between items-center">
                    <span>{new Date(Number(article.timestamp)).toLocaleDateString()}</span>
                </div>

                <h3 className="text-lg font-black leading-tight mb-2 line-clamp-3 group-hover:text-neo-blue transition-colors">
                    {article.title}
                </h3>

                <p className="text-sm text-gray-600 line-clamp-3 mb-4 font-medium flex-grow">
                    {article.summary || article.content?.substring(0, 100) || 'No summary available...'}
                </p>

                {/* Footer / Stats */}
                <div className="mt-auto pt-3 border-t-2 border-gray-100 flex items-center justify-between text-xs font-bold uppercase text-gray-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <Coins className="w-3 h-3" />
                            {article.totalTips > 0 ? `${(article.totalTips / 1_000_000_000).toFixed(2)} SUI` : '-'}
                        </span>
                        <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" />
                            {article.commentCount}
                        </span>
                    </div>

                    <a
                        href={article.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-neo-black hover:text-neo-pink transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Read <ExternalLink className="w-3 h-3" />
                    </a>
                </div>
            </div>
        </div>
    );
}
