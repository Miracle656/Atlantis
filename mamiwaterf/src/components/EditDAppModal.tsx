import { useState, useEffect } from 'react';
import { X, Upload, Loader } from 'lucide-react';
import type { DApp, Category } from '../types';
import { useUpdateDApp } from '../hooks/useUpdateDApp';
import { uploadTextToWalrus, uploadFileToWalrus, validateImageFile, fileToDataURL } from '../utils/uploadToWalrus';

interface EditDAppModalProps {
    dapp: DApp;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function EditDAppModal({ dapp, isOpen, onClose, onSuccess }: EditDAppModalProps) {
    const { isUpdating, updateDApp } = useUpdateDApp();

    // Form state
    const [formData, setFormData] = useState<{
        name: string;
        tagline: string;
        description: string;
        iconUrl: string;
        bannerUrl: string;
        website: string;
        twitter: string;
        discord: string;
        github: string;
        category: Category;
        features: string;
    }>({
        name: dapp.name,
        tagline: dapp.tagline,
        description: '',
        iconUrl: dapp.iconUrl,
        bannerUrl: dapp.bannerUrl,
        website: dapp.website,
        twitter: dapp.twitter || '',
        discord: dapp.discord || '',
        github: dapp.github || '',
        category: dapp.category,
        features: dapp.features.join(', '),
    });

    const [iconFile, setIconFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [iconPreview, setIconPreview] = useState(dapp.iconUrl);
    const [bannerPreview, setBannerPreview] = useState(dapp.bannerUrl);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset form when dApp changes
    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: dapp.name,
                tagline: dapp.tagline,
                description: '',
                iconUrl: dapp.iconUrl,
                bannerUrl: dapp.bannerUrl,
                website: dapp.website,
                twitter: dapp.twitter || '',
                discord: dapp.discord || '',
                github: dapp.github || '',
                category: dapp.category,
                features: dapp.features.join(', '),
            });
            setIconPreview(dapp.iconUrl);
            setBannerPreview(dapp.bannerUrl);
            setIconFile(null);
            setBannerFile(null);
            setError(null);
        }
    }, [dapp, isOpen]);

    const handleIconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error || 'Invalid image');
            return;
        }

        setIconFile(file);
        const preview = await fileToDataURL(file);
        setIconPreview(preview);
        setError(null);
    };

    const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error || 'Invalid image');
            return;
        }

        setBannerFile(file);
        const preview = await fileToDataURL(file);
        setBannerPreview(preview);
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsUploading(true);

        try {
            // 1. Upload description to Walrus
            let descriptionBlobId = dapp.description.includes('Blob ID:')
                ? dapp.description.replace('Blob ID: ', '')
                : '';

            if (formData.description.trim()) {
                console.log('Uploading description to Walrus...');
                const result = await uploadTextToWalrus(formData.description);
                descriptionBlobId = result.blobId;
                console.log('Description uploaded:', descriptionBlobId);
            }

            // 2. Upload icon if changed
            let iconUrl = formData.iconUrl;
            if (iconFile) {
                console.log('Uploading icon to Walrus...');
                const result = await uploadFileToWalrus(iconFile);
                // Use Walrus aggregator URL
                iconUrl = `https://aggregator.walrus-testnet.walrus.space/v1/${result.blobId}`;
                console.log('Icon uploaded:', iconUrl);
            }

            // 3. Upload banner if changed
            let bannerUrl = formData.bannerUrl;
            if (bannerFile) {
                console.log('Uploading banner to Walrus...');
                const result = await uploadFileToWalrus(bannerFile);
                bannerUrl = `https://aggregator.walrus-testnet.walrus.space/v1/${result.blobId}`;
                console.log('Banner uploaded:', bannerUrl);
            }

            setIsUploading(false);

            // 4. Update dApp on-chain
            const features = formData.features
                .split(',')
                .map(f => f.trim())
                .filter(f => f.length > 0);

            updateDApp(
                {
                    dappId: dapp.id,
                    name: formData.name,
                    tagline: formData.tagline,
                    descriptionBlobId,
                    iconUrl,
                    bannerUrl,
                    website: formData.website,
                    twitter: formData.twitter || undefined,
                    discord: formData.discord || undefined,
                    github: formData.github || undefined,
                    category: formData.category,
                    features,
                },
                () => {
                    onSuccess();
                    onClose();
                },
                (err) => {
                    setError(err.message);
                }
            );

        } catch (err) {
            setIsUploading(false);
            setError((err as Error).message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-4 border-black max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b-4 border-black p-6 flex items-center justify-between">
                    <h2 className="text-3xl font-black">EDIT DAPP</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 border-2 border-black"
                        disabled={isUpdating || isUploading}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-100 border-2 border-red-500 p-4">
                            <p className="text-red-700 font-bold">{error}</p>
                        </div>
                    )}

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-bold mb-2">NAME *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-black font-mono"
                            required
                        />
                    </div>

                    {/* Tagline */}
                    <div>
                        <label className="block text-sm font-bold mb-2">TAGLINE *</label>
                        <input
                            type="text"
                            value={formData.tagline}
                            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-black font-mono"
                            required
                            maxLength={100}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold mb-2">DESCRIPTION</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-black font-mono h-32"
                            placeholder="Enter new description (will be uploaded to Walrus)"
                        />
                        <p className="text-xs text-gray-600 mt-1">Leave empty to keep existing description</p>
                    </div>

                    {/* Icon Upload */}
                    <div>
                        <label className="block text-sm font-bold mb-2">ICON IMAGE</label>
                        <div className="flex gap-4 items-start">
                            <img
                                src={iconPreview}
                                alt="Icon preview"
                                className="w-24 h-24 border-2 border-black object-cover"
                            />
                            <div className="flex-1">
                                <label className="inline-block px-4 py-2 bg-primary text-black font-bold border-2 border-black cursor-pointer hover:bg-secondary">
                                    <Upload className="w-4 h-4 inline mr-2" />
                                    UPLOAD NEW ICON
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleIconChange}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-xs text-gray-600 mt-2">Max 5MB. Leave unchanged to keep current icon.</p>
                            </div>
                        </div>
                    </div>

                    {/* Banner Upload */}
                    <div>
                        <label className="block text-sm font-bold mb-2">BANNER IMAGE</label>
                        <div className="space-y-2">
                            <img
                                src={bannerPreview}
                                alt="Banner preview"
                                className="w-full h-48 border-2 border-black object-cover"
                            />
                            <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold border-2 border-black cursor-pointer hover:bg-secondary">
                                <Upload className="w-4 h-4" />
                                <span>UPLOAD NEW BANNER</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleBannerChange}
                                    className="hidden"
                                />
                            </label>
                            <p className="text-xs text-gray-600">Max 5MB. Leave unchanged to keep current banner.</p>
                        </div>
                    </div>

                    {/* Website */}
                    <div>
                        <label className="block text-sm font-bold mb-2">WEBSITE *</label>
                        <input
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-black font-mono"
                            required
                            placeholder="https://example.com"
                        />
                    </div>

                    {/* Social Links */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-bold mb-2">TWITTER</label>
                            <input
                                type="text"
                                value={formData.twitter}
                                onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-black font-mono"
                                placeholder="@username"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">DISCORD</label>
                            <input
                                type="text"
                                value={formData.discord}
                                onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-black font-mono"
                                placeholder="discord.gg/..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-2">GITHUB</label>
                            <input
                                type="text"
                                value={formData.github}
                                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                                className="w-full px-4 py-2 border-2 border-black font-mono"
                                placeholder="github.com/..."
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-bold mb-2">CATEGORY *</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value as Category })}
                            className="w-full px-4 py-2 border-2 border-black font-bold"
                            required
                        >
                            <option value="DeFi">DeFi</option>
                            <option value="DEX">DEX</option>
                            <option value="NFT">NFT</option>
                            <option value="Gaming">Gaming</option>
                            <option value="Social">Social</option>
                            <option value="Marketplace">Marketplace</option>
                            <option value="Infrastructure">Infrastructure</option>
                            <option value="DAO">DAO</option>
                            <option value="Wallet">Wallet</option>
                            <option value="Analytics">Analytics</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Features */}
                    <div>
                        <label className="block text-sm font-bold mb-2">FEATURES</label>
                        <input
                            type="text"
                            value={formData.features}
                            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                            className="w-full px-4 py-2 border-2 border-black font-mono"
                            placeholder="Swap, Liquidity, Farming (comma-separated)"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 pt-4 border-t-2 border-black">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-200 border-2 border-black font-black hover:bg-gray-300"
                            disabled={isUpdating || isUploading}
                        >
                            CANCEL
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-3 bg-primary text-black border-2 border-black font-black hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            disabled={isUpdating || isUploading}
                        >
                            {(isUpdating || isUploading) && <Loader className="w-5 h-5 animate-spin" />}
                            {isUploading ? 'UPLOADING...' : isUpdating ? 'UPDATING...' : 'SAVE CHANGES'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
