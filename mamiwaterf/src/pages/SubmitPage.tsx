import { useState } from 'react';
import { Rocket, Upload, Link as LinkIcon, Loader2, UserPlus } from 'lucide-react';
import { categories } from '../data/mockData';
import { useRegisterDApp } from '../hooks/useRegisterDApp';
import { ADMIN_ADDRESS } from '../constants';
import { useDeveloper } from '../hooks/useDeveloper';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useToast } from '../components/Toast';
import AutoRegisterButton from '../components/AutoRegisterButton';

export default function SubmitPage() {
    // Developer Status
    const { isRegistered, isLoading: isDevLoading, registerDeveloper, isRegistering: isDevRegistering } = useDeveloper();

    // Developer Form State
    const [devForm, setDevForm] = useState({
        name: '',
        bio: '',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        website: '',
        twitter: ''
    });

    // DApp Form State
    const [formData, setFormData] = useState({
        name: '',
        tagline: '',
        description: '',
        category: 'DeFi',
        website: '',
        twitter: '',
        discord: '',
        github: '',
        packageId: '', // Smart contract package ID
        iconUrl: '',
        bannerUrl: '',
        features: ['Decentralized', 'Secure', 'Fast'] // Default features
    });

    const [iconFile, setIconFile] = useState<File | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);

    const { registerDApp, isRegistering } = useRegisterDApp();
    const account = useCurrentAccount();

    const { success, error, info } = useToast();

    // --- Developer Registration Handlers ---
    const handleDevChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDevForm({
            ...devForm,
            [e.target.name]: e.target.value,
        });
    };

    const handleDevSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!account) return;

        registerDeveloper(
            devForm,
            () => {
                success("Developer profile created! You can now submit dApps.");
            },
            (err) => {
                console.error(err);
                error("Failed to register developer. See console.");
            }
        );
    };

    // --- DApp Registration Handlers ---
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!account) {
            info("Please connect your wallet first");
            return;
        }

        if (!iconFile || !bannerFile) {
            error("Please upload both an icon and a banner.");
            return;
        }

        registerDApp(
            {
                ...formData,
                packageId: formData.packageId || undefined, // Only include if provided
                icon: iconFile,
                banner: bannerFile
            },
            () => {
                success('dApp registered successfully!');
                // Reset form
                setFormData({
                    name: '',
                    tagline: '',
                    description: '',
                    category: 'DeFi',
                    website: '',
                    twitter: '',
                    discord: '',
                    github: '',
                    packageId: '',
                    iconUrl: '',
                    bannerUrl: '',
                    features: ['Decentralized', 'Secure', 'Fast']
                });
                setIconFile(null);
                setBannerFile(null);
            },
            (err) => {
                console.error(err);
                error('Failed to register dApp. See console for details.');
            }
        );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'icon' | 'banner') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (type === 'icon') {
                setIconFile(file);
            } else {
                setBannerFile(file);
            }
        }
    };

    if (!account) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
                <div className="neo-box p-8 bg-white">
                    <h1 className="text-2xl font-black uppercase mb-4">Connect Wallet</h1>
                    <p className="text-xl font-medium text-gray-600">Please connect your wallet to submit a dApp.</p>
                </div>
            </div>
        );
    }

    if (isDevLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-12 h-12 animate-spin text-neo-black" />
            </div>
        );
    }

    // --- Render Developer Registration Form if not registered ---
    if (!isRegistered) {
        return (
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-neo-pink border-3 border-neo-black shadow-neo mb-4">
                        <UserPlus className="w-10 h-10 text-neo-black" />
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Become a Developer</h1>
                    <p className="text-xl font-medium text-gray-600">Create your developer profile to start publishing dApps.</p>
                </div>

                <div className="neo-box p-8 bg-white">
                    <form onSubmit={handleDevSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold uppercase mb-2">Developer Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={devForm.name}
                                onChange={handleDevChange}
                                required
                                className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium"
                                placeholder="Your Name or Studio Name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold uppercase mb-2">Bio *</label>
                            <textarea
                                name="bio"
                                value={devForm.bio}
                                onChange={handleDevChange}
                                required
                                rows={3}
                                className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium resize-none"
                                placeholder="Tell us about yourself..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold uppercase mb-2">Website (Optional)</label>
                            <input
                                type="url"
                                name="website"
                                value={devForm.website}
                                onChange={handleDevChange}
                                className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium"
                                placeholder="https://your-portfolio.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold uppercase mb-2">Twitter (Optional)</label>
                            <input
                                type="text"
                                name="twitter"
                                value={devForm.twitter}
                                onChange={handleDevChange}
                                className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium"
                                placeholder="@yourhandle"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isDevRegistering}
                            className="w-full px-6 py-4 bg-neo-black text-white border-3 border-neo-black shadow-neo font-black uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#888888] transition-all flex items-center justify-center space-x-2 text-lg disabled:opacity-50"
                        >
                            {isDevRegistering ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Creating Profile...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-6 h-6" />
                                    <span>Register Profile</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- Render dApp Registration Form (Existing Code) ---
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
                <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-neo-yellow border-3 border-neo-black shadow-neo flex items-center justify-center">
                        <Rocket className="w-8 h-8 text-neo-black" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-tighter">Submit Your dApp</h1>
                        <p className="text-xl font-medium text-gray-600 border-l-4 border-neo-cyan pl-4">Get discovered by the Sui community</p>
                    </div>
                </div>
            </div>

            {/* Auto-Register Section (Admin Only) */}
            {account && account.address === ADMIN_ADDRESS && (
                <div className="mb-8">
                    <AutoRegisterButton />
                </div>
            )}

            <div className="neo-box p-8 bg-white">
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info */}
                    <div>
                        <h2 className="text-2xl font-black uppercase mb-6 border-b-3 border-neo-black pb-2">Basic Information</h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    dApp Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500"
                                    placeholder="My Awesome dApp"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Tagline *
                                </label>
                                <input
                                    type="text"
                                    name="tagline"
                                    value={formData.tagline}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500"
                                    placeholder="A short, catchy description"
                                    maxLength={100}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Description *
                                </label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    required
                                    rows={4}
                                    className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500 resize-none"
                                    placeholder="Describe what makes your dApp unique..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Category *
                                </label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Package ID (Optional)
                                </label>
                                <input
                                    type="text"
                                    name="packageId"
                                    value={formData.packageId}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500"
                                    placeholder="0x..."
                                />
                                <p className="text-sm text-gray-600 mt-2">
                                    📦 Enter your dApp's package ID to fetch real blockchain metrics and match with existing data
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Links */}
                    <div>
                        <h2 className="text-2xl font-black uppercase mb-6 border-b-3 border-neo-black pb-2">Links</h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Website URL *
                                </label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="url"
                                        name="website"
                                        value={formData.website}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500"
                                        placeholder="https://yourdapp.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Twitter (optional)
                                </label>
                                <input
                                    type="text"
                                    name="twitter"
                                    value={formData.twitter}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500"
                                    placeholder="@yourdapp"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Discord (optional)
                                </label>
                                <input
                                    type="text"
                                    name="discord"
                                    value={formData.discord}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500"
                                    placeholder="discord.gg/yourdapp"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    GitHub (optional)
                                </label>
                                <input
                                    type="url"
                                    name="github"
                                    value={formData.github}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500"
                                    placeholder="https://github.com/yourdapp"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Package ID {['DeFi', 'NFT', 'Gaming'].includes(formData.category) && <span className="text-neo-pink">*</span>}
                                    {!['DeFi', 'NFT', 'Gaming'].includes(formData.category) && <span className="text-gray-500 text-xs normal-case">(optional)</span>}
                                </label>
                                <input
                                    type="text"
                                    name="packageId"
                                    value={formData.packageId}
                                    onChange={handleChange}
                                    required={['DeFi', 'NFT', 'Gaming'].includes(formData.category)}
                                    className="w-full px-4 py-3 bg-neo-white border-2 border-neo-black text-neo-black focus:outline-none focus:shadow-neo transition-all font-medium placeholder-gray-500"
                                    placeholder="0x..."
                                />
                                <p className="text-xs text-gray-600 mt-1">
                                    {['DeFi', 'NFT', 'Gaming'].includes(formData.category)
                                        ? '✅ Required for automatic user verification'
                                        : '💡 Optional - helps verify users who interact with your dApp'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Media Upload */}
                    <div>
                        <h2 className="text-2xl font-black uppercase mb-6 border-b-3 border-neo-black pb-2">Media</h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Icon *
                                </label>
                                <div
                                    className="border-3 border-dashed border-neo-black bg-neo-white rounded-none p-8 text-center hover:bg-neo-yellow transition-colors cursor-pointer group relative"
                                    onClick={() => document.getElementById('icon-upload')?.click()}
                                >
                                    <input
                                        type="file"
                                        id="icon-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'icon')}
                                    />
                                    {iconFile ? (
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 mb-2 border-2 border-neo-black overflow-hidden">
                                                <img src={URL.createObjectURL(iconFile)} alt="Icon preview" className="w-full h-full object-cover" />
                                            </div>
                                            <p className="text-sm font-bold text-neo-black">{iconFile.name}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 mx-auto mb-2 text-neo-black group-hover:scale-110 transition-transform" />
                                            <p className="text-sm font-bold uppercase text-neo-black">
                                                Click to upload Icon
                                            </p>
                                            <p className="text-xs font-bold text-gray-500 mt-1 uppercase">
                                                PNG, JPG up to 5MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold uppercase mb-2">
                                    Banner *
                                </label>
                                <div
                                    className="border-3 border-dashed border-neo-black bg-neo-white rounded-none p-8 text-center hover:bg-neo-cyan transition-colors cursor-pointer group relative"
                                    onClick={() => document.getElementById('banner-upload')?.click()}
                                >
                                    <input
                                        type="file"
                                        id="banner-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'banner')}
                                    />
                                    {bannerFile ? (
                                        <div className="flex flex-col items-center">
                                            <div className="w-full h-24 mb-2 border-2 border-neo-black overflow-hidden">
                                                <img src={URL.createObjectURL(bannerFile)} alt="Banner preview" className="w-full h-full object-cover" />
                                            </div>
                                            <p className="text-sm font-bold text-neo-black">{bannerFile.name}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-10 h-10 mx-auto mb-2 text-neo-black group-hover:scale-110 transition-transform" />
                                            <p className="text-sm font-bold uppercase text-neo-black">
                                                Click to upload Banner
                                            </p>
                                            <p className="text-xs font-bold text-gray-500 mt-1 uppercase">
                                                PNG, JPG up to 10MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6 border-t-3 border-neo-black">
                        <button
                            type="submit"
                            disabled={isRegistering}
                            className="w-full px-6 py-4 bg-neo-green text-neo-black border-3 border-neo-black shadow-neo font-black uppercase hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000000] transition-all flex items-center justify-center space-x-2 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRegistering ? (
                                <>
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                    <span>Submitting...</span>
                                </>
                            ) : (
                                <>
                                    <Rocket className="w-6 h-6" />
                                    <span>Submit for Review</span>
                                </>
                            )}
                        </button>
                        <p className="text-sm font-bold uppercase text-gray-500 text-center mt-3">
                            We'll review your submission within 24-48 hours
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
