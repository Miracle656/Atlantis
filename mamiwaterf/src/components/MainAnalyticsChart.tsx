import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

const data = [
    { date: 'Nov 26', uaw: 24000, volume: 140, transactions: 35000 },
    { date: 'Dec 12', uaw: 28000, volume: 135, transactions: 38000 },
    { date: 'Dec 28', uaw: 22000, volume: 120, transactions: 30000 },
    { date: 'Jan 13', uaw: 35000, volume: 155, transactions: 45000 },
    { date: 'Jan 29', uaw: 32000, volume: 145, transactions: 42000 },
    { date: 'Feb 14', uaw: 45000, volume: 180, transactions: 60000 },
    { date: 'Mar 2', uaw: 42000, volume: 170, transactions: 58000 },
    { date: 'Mar 18', uaw: 55000, volume: 210, transactions: 75000 },
    { date: 'Apr 3', uaw: 52000, volume: 195, transactions: 70000 },
    { date: 'Apr 19', uaw: 65000, volume: 240, transactions: 85000 },
    { date: 'May 5', uaw: 62000, volume: 225, transactions: 82000 },
    { date: 'May 21', uaw: 75000, volume: 280, transactions: 95000 },
];

export default function MainAnalyticsChart() {
    const [metric, setMetric] = useState<'uaw' | 'volume' | 'transactions'>('uaw');

    return (
        <div className="neo-box p-6 bg-white mb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <div className="flex items-center space-x-4 mb-2">
                        <button
                            onClick={() => setMetric('uaw')}
                            className={`flex items-center space-x-2 focus:outline-none px-4 py-2 border-2 transition-all font-bold uppercase ${metric === 'uaw' ? 'bg-neo-black text-white border-neo-black shadow-neo-sm' : 'bg-white text-gray-500 border-transparent hover:border-neo-black'}`}
                        >
                            <div className={`w-3 h-3 border-2 border-white ${metric === 'uaw' ? 'bg-neo-pink' : 'bg-gray-400'}`}></div>
                            <span>UAW</span>
                        </button>
                        <button
                            onClick={() => setMetric('volume')}
                            className={`flex items-center space-x-2 focus:outline-none px-4 py-2 border-2 transition-all font-bold uppercase ${metric === 'volume' ? 'bg-neo-black text-white border-neo-black shadow-neo-sm' : 'bg-white text-gray-500 border-transparent hover:border-neo-black'}`}
                        >
                            <div className={`w-3 h-3 border-2 border-white ${metric === 'volume' ? 'bg-neo-cyan' : 'bg-gray-400'}`}></div>
                            <span>Volume</span>
                        </button>
                        <button
                            onClick={() => setMetric('transactions')}
                            className={`flex items-center space-x-2 focus:outline-none px-4 py-2 border-2 transition-all font-bold uppercase ${metric === 'transactions' ? 'bg-neo-black text-white border-neo-black shadow-neo-sm' : 'bg-white text-gray-500 border-transparent hover:border-neo-black'}`}
                        >
                            <div className={`w-3 h-3 border-2 border-white ${metric === 'transactions' ? 'bg-neo-green' : 'bg-gray-400'}`}></div>
                            <span>Transactions</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-8">
                    <div>
                        <div className="text-sm font-bold uppercase text-gray-500 mb-1">Total 7d UAW</div>
                        <div className="text-2xl font-black text-neo-black">24.25M</div>
                        <div className="text-sm font-bold text-red-600 bg-red-100 px-1 border border-red-600 inline-block">-6.52%</div>
                    </div>
                    <div>
                        <div className="text-sm font-bold uppercase text-gray-500 mb-1">Total 7d volume</div>
                        <div className="text-2xl font-black text-neo-black">$140.35B</div>
                        <div className="text-sm font-bold text-red-600 bg-red-100 px-1 border border-red-600 inline-block">-22.67%</div>
                    </div>
                    <div className="bg-neo-yellow border-2 border-neo-black shadow-neo-sm p-3 flex items-center space-x-3 cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo transition-all">
                        <div className="w-10 h-10 bg-white border-2 border-neo-black flex items-center justify-center text-xl">
                            💧
                        </div>
                        <div>
                            <div className="text-xs font-bold uppercase text-neo-black">Top project</div>
                            <div className="font-black text-neo-black uppercase">SuiSwap</div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-neo-black" />
                    </div>
                </div>
            </div>

            <div className="h-[350px] w-full border-2 border-neo-black p-4 bg-neo-white">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorUaw" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#FF00FF" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#FF00FF" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#CCFF00" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#CCFF00" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#000000" strokeOpacity={0.1} vertical={false} />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#000000', fontSize: 12, fontWeight: 700, fontFamily: 'Space Mono' }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#000000', fontSize: 12, fontWeight: 700, fontFamily: 'Space Mono' }}
                            dx={-10}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#FFFDF5', borderColor: '#000000', borderWidth: '3px', borderRadius: '0px', boxShadow: '4px 4px 0px 0px #000000' }}
                            itemStyle={{ color: '#000000', fontWeight: 700, fontFamily: 'Space Mono' }}
                        />
                        {metric === 'uaw' && (
                            <Area
                                type="monotone"
                                dataKey="uaw"
                                stroke="#FF00FF"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorUaw)"
                                animationDuration={500}
                            />
                        )}
                        {metric === 'volume' && (
                            <Area
                                type="monotone"
                                dataKey="volume"
                                stroke="#06B6D4"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorVolume)"
                                animationDuration={500}
                            />
                        )}
                        {metric === 'transactions' && (
                            <Area
                                type="monotone"
                                dataKey="transactions"
                                stroke="#CCFF00"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorTransactions)"
                                animationDuration={500}
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
