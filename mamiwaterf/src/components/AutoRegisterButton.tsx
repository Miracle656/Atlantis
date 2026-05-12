import { useState } from 'react';
import { Database, Loader2, CheckCircle, AlertCircle, Key } from 'lucide-react';
import { useBulkAutoRegister } from '../hooks/useBulkAutoRegister';

export default function AutoRegisterButton() {
    const { registerAllWithPrivateKey, isRegistering, progress, results, successCount, failureCount } = useBulkAutoRegister();
    const [privateKey, setPrivateKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [error, setError] = useState('');

    const handleRegisterAll = async () => {
        if (!privateKey.trim()) {
            setError('Please enter your private key');
            return;
        }

        setError('');
        try {
            await registerAllWithPrivateKey(privateKey);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
        }
    };

    return (
        <div className="bg-neo-white border-3 border-neo-black p-6 shadow-neo">
            <div className="flex items-center gap-3 mb-4">
                <Database className="w-6 h-6" />
                <h3 className="text-xl font-black uppercase">Auto-Register DApps</h3>
            </div>

            <p className="text-sm mb-4 text-gray-600">
                Register all 176 Blockberry dApps to the contract so users can review them.
            </p>

            {/* Private Key Input */}
            <div className="mb-4">
                <label className="block text-sm font-bold mb-2">
                    <Key className="w-4 h-4 inline mr-1" />
                    Private Key (suiprivkey...)
                </label>
                <div className="relative">
                    <input
                        type={showKey ? "text" : "password"}
                        value={privateKey}
                        onChange={(e) => setPrivateKey(e.target.value)}
                        placeholder="suiprivkey1..."
                        className="w-full border-3 border-neo-black px-4 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-neo-pink"
                        disabled={isRegistering}
                    />
                    <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold hover:text-neo-pink"
                    >
                        {showKey ? 'HIDE' : 'SHOW'}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                    ⚠️ Your private key is used locally to sign transactions. It is never sent to any server.
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-4 bg-neo-red border-2 border-neo-black p-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-bold text-sm">{error}</span>
                </div>
            )}

            {/* Progress Bar */}
            {isRegistering && (
                <div className="mb-4 bg-neo-cyan border-2 border-neo-black p-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-bold text-sm">
                            Registering {progress.current} / {progress.total}
                        </span>
                    </div>
                    <div className="w-full bg-neo-white border-2 border-neo-black h-2">
                        <div
                            className="bg-neo-pink h-full transition-all duration-300"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs mt-2 text-gray-600">
                        ✓ Success: {successCount} | ✗ Failed: {failureCount}
                    </p>
                </div>
            )}

            {/* Results */}
            {!isRegistering && results.length > 0 && (
                <div className="mb-4 bg-neo-green border-2 border-neo-black p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="w-4 h-4" />
                        <span className="font-bold text-sm">Registration Complete</span>
                    </div>
                    <p className="text-sm">
                        ✓ Successful: {successCount} | ✗ Failed: {failureCount}
                    </p>
                </div>
            )}

            {/* Register Button */}
            <button
                onClick={handleRegisterAll}
                disabled={isRegistering || !privateKey.trim()}
                className="w-full bg-neo-pink border-3 border-neo-black px-6 py-3 font-black uppercase shadow-neo hover:shadow-neo-lg active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isRegistering ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Registering...
                    </>
                ) : (
                    <>
                        <Database className="w-5 h-5" />
                        Register All DApps
                    </>
                )}
            </button>

            <p className="text-xs text-gray-500 mt-3">
                Note: This will register each dApp one by one. Already registered dApps will be skipped by the contract.
            </p>
        </div>
    );
}
