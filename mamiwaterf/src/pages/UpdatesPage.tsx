import { useLatestNews } from '../hooks/useNews';
import NewsCard from '../components/NewsCard';
import { Loader2 } from 'lucide-react';

export default function UpdatesPage() {
    const { data: articles, isLoading, error } = useLatestNews(50);

    // Filter out twitter noise
    const filteredArticles = articles?.filter(a => !a.source?.startsWith('@')) || [];

    return (
        <div className="min-h-screen bg-neo-white">
            {/* Header */}
            <div className="bg-neo-green border-b-3 border-neo-black py-8 md:py-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4 shadow-neo-lg inline-block bg-neo-white border-3 border-neo-black px-4 py-2 transform -rotate-1">
                        Protocol Updates
                    </h1>
                    <p className="text-lg md:text-xl font-bold font-mono max-w-2xl bg-neo-black text-neo-white p-2 inline-block transform rotate-1 border-2 border-transparent">
                        Latest news from the Sui ecosystem. Raw. Real-time.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 animate-spin text-neo-black mb-4" />
                        <p className="font-bold font-mono text-xl animate-pulse">Fetching updates...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-100 border-3 border-neo-black p-6 shadow-neo text-center">
                        <h2 className="text-2xl font-black text-red-600 mb-2 uppercase">Error Loading News</h2>
                        <p className="font-mono font-medium">{(error as Error).message}</p>
                    </div>
                ) : (
                    <>
                        {filteredArticles.length === 0 ? (
                            <div className="text-center py-20 font-bold text-xl text-gray-500 uppercase tracking-widest border-2 border-dashed border-gray-300">
                                No updates found.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                                {filteredArticles.map((article) => (
                                    <div key={article.id} className="h-full">
                                        <NewsCard article={article} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
