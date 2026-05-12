import { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useDApps } from '../hooks/useDApps';
import { useDeveloperProfile } from '../hooks/useDeveloperProfile';
import { useDeleteDApp } from '../hooks/useDeleteDApp';
import { Link } from 'react-router-dom';
import { User, Package, TrendingUp, Users, DollarSign, ArrowLeft, ExternalLink, Globe, Twitter, CheckCircle, AlertCircle } from 'lucide-react';
import DisplayName from '../components/DisplayName';
import EditDAppModal from '../components/EditDAppModal';
import type { DApp } from '../types';

export default function ProfilePage() {
    const account = useCurrentAccount();
    const { data: allDApps, isLoading } = useDApps();
    const { data: developerProfile } = useDeveloperProfile(account?.address);
    const { isPending, timeRemaining, deleteDApp, undoDelete } = useDeleteDApp();

    // Edit modal state
    const [editingDApp, setEditingDApp] = useState<DApp | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Filter dApps registered by this user
    const userDApps = allDApps?.filter(dapp =>
        dapp.developer?.id?.toLowerCase() === account?.address.toLowerCase()
    ) || [];

    console.log("Current account:", account?.address);
    console.log("All dApps:", allDApps?.length);
    console.log("User dApps:", userDApps.length);
    if (userDApps.length > 0) {
        console.log("Sample user dApp:", userDApps[0]);
        console.log("Sample dApp metrics:", userDApps[0].metrics);
        console.log("Sample dApp developer:", userDApps[0].developer);
    }

    // Calculate stats
    const totalUsers = userDApps.reduce((sum, dapp) => sum + dapp.metrics.users24h, 0);
    const totalVolume = userDApps.reduce((sum, dapp) => sum + dapp.metrics.volume24h, 0);
    const totalTransactions = userDApps.reduce((sum, dapp) => sum + dapp.metrics.transactions24h, 0);

    if (!account) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-yellow-100 border-4 border-yellow-500 p-8 text-center">
                    <User className="w-16 h-16 mx-auto mb-4 text-yellow-700" />
                    <h2 className="text-2xl font-black mb-2">Connect Your Wallet</h2>
                    <p className="text-gray-700 font-medium">
                        Please connect your wallet to view your profile
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neo-white pb-20">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 border-4 border-black font-bold flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-400' : 'bg-red-400'
                    }`}>
                    {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-4 font-black">✕</button>
                </div>
            )}

            {/* Undo Delete Banner */}
            {isPending && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-400 border-4 border-black px-6 py-4 flex items-center gap-4 shadow-neo">
                    <AlertCircle className="w-6 h-6" />
                    <div>
                        <p className="font-black">DELETION PENDING</p>
                        <p className="text-sm">Deleting in {timeRemaining} seconds...</p>
                    </div>
                    <button
                        onClick={undoDelete}
                        className="px-4 py-2 bg-black text-white font-black border-2 border-black hover:bg-gray-800"
                    >
                        UNDO
                    </button>
                </div>
            )}

            {/* Edit Modal */}
            {editingDApp && (
                <EditDAppModal
                    dapp={editingDApp}
                    isOpen={!!editingDApp}
                    onClose={() => setEditingDApp(null)}
                    onSuccess={() => {
                        setToast({ message: 'dApp updated successfully!', type: 'success' });
                        setTimeout(() => setToast(null), 5000);
                    }}
                />
            )}

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Back Button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 mb-6 px-4 py-2 font-bold"
                >
                    <ArrowLeft className="w-5 h-5" />
                    BACK TO HOME
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary p-3 border-3 border-black">
                        <User className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl md:text-4xl font-black uppercase">Developer Profile</h1>
                </div>

                {/* Developer Profile Card */}
                <div className="bg-white border-4 border-black p-6 mb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 bg-primary border-3 border-black flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {developerProfile?.avatar_url ? (
                                <img
                                    src={developerProfile.avatar_url}
                                    alt="Developer Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <User className="w-12 h-12 text-white" />
                            )}
                        </div>

                        <div className="flex-1 text-center md:text-left w-full">
                            {/* Name and Verified Badge */}
                            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                <h2 className="text-3xl font-black">
                                    {developerProfile?.name || <DisplayName name={account.address} />}
                                </h2>
                                {developerProfile?.verified && (
                                    <CheckCircle className="w-6 h-6 text-blue-500 fill-blue-500" />
                                )}
                            </div>

                            {/* Bio */}
                            {developerProfile?.bio && (
                                <p className="text-gray-700 mb-4 font-medium">
                                    {developerProfile.bio}
                                </p>
                            )}

                            {/* Social Links */}
                            <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
                                {developerProfile?.website && (
                                    <a
                                        href={developerProfile.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:text-secondary font-bold"
                                    >
                                        <Globe className="w-4 h-4" />
                                        Website
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                                {developerProfile?.twitter && (
                                    <a
                                        href={`https://twitter.com/${developerProfile.twitter.replace('@', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:text-secondary font-bold"
                                    >
                                        <Twitter className="w-4 h-4" />
                                        Twitter
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>

                            {/* Wallet Address */}
                            <p className="text-[10px] md:text-xs font-mono text-gray-500 break-all text-center md:text-left">
                                {account.address}
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t-2 border-black">
                        <div className="bg-gray-50 border-2 border-black p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Package className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-gray-600">PROJECTS</span>
                            </div>
                            <div className="text-xl md:text-3xl font-black truncate">{userDApps.length}</div>
                        </div>

                        <div className="bg-gray-50 border-2 border-black p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-gray-600">TOTAL USERS (24H)</span>
                            </div>
                            <div className="text-xl md:text-3xl font-black truncate" title={totalUsers.toLocaleString()}>{totalUsers.toLocaleString()}</div>
                        </div>

                        <div className="bg-gray-50 border-2 border-black p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-gray-600">TRANSACTIONS (24H)</span>
                            </div>
                            <div className="text-xl md:text-3xl font-black truncate" title={totalTransactions.toLocaleString()}>{totalTransactions.toLocaleString()}</div>
                        </div>

                        <div className="bg-gray-50 border-2 border-black p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-gray-600">VOLUME (24H)</span>
                            </div>
                            <div className="text-xl md:text-3xl font-black truncate" title={`$${totalVolume.toLocaleString()}`}>${totalVolume.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Projects Section */}
                <div className="mb-6">
                    <h2 className="text-2xl font-black mb-4 flex items-center gap-2">
                        <Package className="w-6 h-6" />
                        YOUR PROJECTS ({userDApps.length})
                    </h2>
                </div>

                {/* Projects List */}
                {
                    isLoading && (
                        <div className="text-center py-12">
                            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                        </div>
                    )
                }

                {
                    !isLoading && userDApps.length === 0 && (
                        <div className="bg-white border-4 border-black p-12 text-center">
                            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                            <h3 className="text-2xl font-black mb-2">No Projects Yet</h3>
                            <p className="text-gray-600 mb-6">You haven't registered any dApps yet</p>
                            <Link
                                to="/submit"
                                className="inline-block px-6 py-3 bg-primary text-black font-black border-3 border-black hover:bg-secondary transition-colors"
                            >
                                REGISTER YOUR FIRST DAPP
                            </Link>
                        </div>
                    )
                }

                {
                    !isLoading && userDApps.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {userDApps.map((dapp) => (
                                <div
                                    key={dapp.id}
                                    className="bg-white border-4 border-black p-6 hover:shadow-neo transition-all"
                                >
                                    {/* Project Header */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <img
                                            src={dapp.iconUrl}
                                            alt={dapp.name}
                                            className="w-16 h-16 border-3 border-black object-cover"
                                            onError={(e) => {
                                                e.currentTarget.src = 'https://via.placeholder.com/64?text=' + dapp.name.charAt(0);
                                            }}
                                        />
                                        <div className="flex-1">
                                            <h3 className="text-xl font-black mb-1">{dapp.name}</h3>
                                            <p className="text-sm text-gray-600 line-clamp-2">{dapp.tagline}</p>
                                        </div>
                                    </div>

                                    {/* Metrics */}
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <div className="text-center">
                                            <div className="text-xs text-gray-600 font-bold mb-1">USERS 24H</div>
                                            <div className="text-lg font-black">{dapp.metrics.users24h.toLocaleString()}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-gray-600 font-bold mb-1">TXS 24H</div>
                                            <div className="text-lg font-black">{dapp.metrics.transactions24h.toLocaleString()}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-gray-600 font-bold mb-1">VOLUME</div>
                                            <div className="text-lg font-black">${dapp.metrics.volume24h.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-2">
                                        {dapp.reviewsTableId ? (
                                            <>
                                                <button
                                                    className="flex-1 text-center px-4 py-2 bg-yellow-500 text-black font-bold border-2 border-black hover:bg-yellow-400 transition-colors"
                                                    onClick={() => setEditingDApp(dapp)}
                                                >
                                                    EDIT
                                                </button>
                                                <button
                                                    className="flex-1 text-center px-4 py-2 bg-red-500 text-white font-bold border-2 border-black hover:bg-red-600 transition-colors"
                                                    onClick={() => {
                                                        if (confirm(`Are you sure you want to delete ${dapp.name}? You'll have 30 seconds to undo.`)) {
                                                            deleteDApp({
                                                                dappId: dapp.id,
                                                                dappName: dapp.name,
                                                                onSuccess: () => {
                                                                    setToast({ message: `${dapp.name} deleted successfully!`, type: 'success' });
                                                                    setTimeout(() => setToast(null), 5000);
                                                                },
                                                                onError: (error) => {
                                                                    setToast({ message: `Failed to delete: ${error.message}`, type: 'error' });
                                                                    setTimeout(() => setToast(null), 5000);
                                                                }
                                                            });
                                                        }
                                                    }}
                                                >
                                                    DELETE
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex-1 px-4 py-2 bg-gray-100 border-2 border-gray-300 text-gray-500 font-bold text-center text-sm">
                                                BLOCKBERRY DATA - NOT EDITABLE
                                            </div>
                                        )}
                                        <Link
                                            to={`/dapp/${dapp.id}`}
                                            className="px-4 py-2 bg-black text-white font-bold border-2 border-black hover:bg-primary transition-colors flex items-center justify-center"
                                        >
                                            VIEW
                                        </Link>
                                        {dapp.website && (
                                            <a
                                                href={dapp.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 bg-white border-2 border-black font-bold hover:bg-gray-100 transition-colors"
                                            >
                                                <ExternalLink className="w-5 h-5" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }
            </div>
        </div>
    );
}