import { X, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { useMiniApp } from '../context/MiniAppContext';

export default function MiniAppContainer() {
    const { activeDApp, isOpen, isMinimized, closeMiniApp, toggleMinimize } = useMiniApp();

    if (!isOpen || !activeDApp) return null;

    return (
        <div
            className={`fixed right-4 transition-all duration-300 ease-in-out bg-white border-3 border-neo-black shadow-neo z-50 flex flex-col
                ${isMinimized ? 'bottom-0 h-16 w-80' : 'bottom-4 top-24 w-[450px]'}
            `}
        >
            {/* Header */}
            <div
                className="p-3 border-b-3 border-neo-black flex items-center justify-between bg-neo-yellow cursor-pointer select-none"
                onClick={toggleMinimize}
            >
                <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 bg-white border-2 border-neo-black flex items-center justify-center text-xl flex-shrink-0 shadow-neo-sm overflow-hidden">
                        {activeDApp.iconUrl ? (
                            <img src={activeDApp.iconUrl} alt={activeDApp.name} className="w-full h-full object-cover" />
                        ) : (
                            <span>💧</span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-sm truncate text-neo-black uppercase tracking-tight">{activeDApp.name}</h3>
                        <p className="text-xs font-bold text-gray-700 truncate uppercase">by {activeDApp.developer.name}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleMinimize(); }}
                        className="p-1.5 bg-white border-2 border-neo-black hover:bg-neo-black hover:text-white transition-colors shadow-neo-sm"
                    >
                        {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <a
                        href={activeDApp.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 bg-white border-2 border-neo-black hover:bg-neo-black hover:text-white transition-colors shadow-neo-sm flex items-center justify-center"
                        title="Open in new tab"
                    >
                        <Globe className="w-4 h-4" />
                    </a>
                    <button
                        onClick={(e) => { e.stopPropagation(); closeMiniApp(); }}
                        className="p-1.5 bg-neo-red border-2 border-neo-black text-white hover:bg-red-600 transition-colors shadow-neo-sm"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Iframe Container */}
            <div className={`flex-1 bg-white relative ${isMinimized ? 'hidden' : 'block'}`}>
                <iframe
                    src={activeDApp.website}
                    title={activeDApp.name}
                    className="w-full h-full border-0"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
                />
            </div>
        </div>
    );
}
