import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ShieldAlert, Network, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { Account } from '../types';
import { api } from '../services/api';
import { cn } from '../utils/cn';

export default function SuspiciousAccounts() {
    const navigate = useNavigate();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [riskFilter, setRiskFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

    const fetchAccounts = () => {
        api.getAccounts().then(data => {
            setAccounts(data);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchAccounts();
        const unsubscribe = api.subscribe(() => {
            fetchAccounts();
        });
        return unsubscribe;
    }, []);

    const filtered = useMemo(() => {
        return accounts.filter(a => {
            const matchRisk = riskFilter === 'All' || a.risk === riskFilter;
            const q = searchQuery.toLowerCase();
            const matchQ = !searchQuery || a.id.toLowerCase().includes(q) || a.status.toLowerCase().includes(q);
            return matchRisk && matchQ;
        });
    }, [accounts, riskFilter, searchQuery]);

    const highCount = accounts.filter(a => a.risk === 'High').length;
    const medCount = accounts.filter(a => a.risk === 'Medium').length;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-mono uppercase tracking-widest text-danger">ENTITY RISK MATRIX</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-text">Suspicious Accounts</h2>
                    <p className="text-muted text-xs mt-0.5">
                        Risk-stratified entity profiles generated from topology & velocity signal analysis.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/network')}
                    className="px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-mono font-medium transition-all flex items-center gap-2 self-start md:self-auto"
                >
                    <Network className="w-3.5 h-3.5" />
                    <span>Graph All Entities</span>
                </button>
            </div>

            {/* Stat Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Entities', value: accounts.length, color: 'text-text', bg: 'border-white/[0.08]' },
                    { label: 'High Risk', value: highCount, color: 'text-danger', bg: 'border-danger/30' },
                    { label: 'Medium Risk', value: medCount, color: 'text-warning', bg: 'border-warning/30' },
                    { label: 'Under Investigation', value: accounts.filter(a => a.status === 'Under Investigation').length, color: 'text-primary', bg: 'border-primary/30' },
                ].map(stat => (
                    <div key={stat.label} className={`glass-panel p-4 rounded-xl border ${stat.bg}`}>
                        <div className="text-2xl font-bold font-mono tabular-nums text-text">{stat.value}</div>
                        <div className={`text-[11px] font-mono mt-0.5 ${stat.color}`}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="glass-panel p-6 rounded-2xl space-y-5">
                {/* Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5 p-1 bg-background/80 rounded-xl border border-white/[0.06] w-fit">
                        {(['All', 'High', 'Medium', 'Low'] as const).map(r => (
                            <button
                                key={r}
                                onClick={() => setRiskFilter(r)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-mono transition-all",
                                    riskFilter === r
                                        ? r === 'High' ? 'bg-danger text-white font-bold'
                                        : r === 'Medium' ? 'bg-warning text-[#050D1A] font-bold'
                                        : r === 'Low' ? 'bg-success text-[#050D1A] font-bold'
                                        : 'bg-primary text-[#050D1A] font-bold'
                                        : 'text-muted hover:text-text'
                                )}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search Account ID or status..."
                            className="w-full bg-background/80 border border-white/[0.08] hover:border-white/[0.14] focus:border-primary/50 rounded-xl pl-9 pr-4 py-2 text-xs text-text placeholder:text-muted/60 focus:outline-none transition-colors font-sans"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-card-subtle/40">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[10px] font-mono text-muted uppercase tracking-wider">
                                <th className="py-3 px-4 font-semibold">Account Entity</th>
                                <th className="py-3 px-4 font-semibold">Risk Tier</th>
                                <th className="py-3 px-4 font-semibold">Total Txns</th>
                                <th className="py-3 px-4 font-semibold">Inflow</th>
                                <th className="py-3 px-4 font-semibold">Outflow</th>
                                <th className="py-3 px-4 font-semibold">Linked Nodes</th>
                                <th className="py-3 px-4 font-semibold">Detected Patterns</th>
                                <th className="py-3 px-4 font-semibold text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-muted font-mono text-xs">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                            <span>Loading entity risk profiles...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filtered.map((acc) => (
                                <tr
                                    key={acc.id}
                                    onClick={() => navigate('/network')}
                                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                >
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold text-primary group-hover:underline">{acc.id}</span>
                                            <ExternalLink className="w-3 h-3 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border",
                                            acc.risk === 'High' ? 'bg-danger/15 text-danger border-danger/30'
                                            : acc.risk === 'Medium' ? 'bg-warning/15 text-warning border-warning/30'
                                            : 'bg-success/15 text-success border-success/30'
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full", acc.risk === 'High' ? 'bg-danger' : acc.risk === 'Medium' ? 'bg-warning' : 'bg-success')} />
                                            {acc.risk}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-xs font-mono font-semibold text-text tabular-nums">{acc.transactions}</td>
                                    <td className="py-3.5 px-4 text-xs font-mono">
                                        <span className="flex items-center gap-1 text-success">
                                            <TrendingUp className="w-3 h-3" />
                                            ₹{(acc.incoming / 100000).toFixed(1)}L
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-xs font-mono">
                                        <span className="flex items-center gap-1 text-danger">
                                            <TrendingDown className="w-3 h-3" />
                                            ₹{(acc.outgoing / 100000).toFixed(1)}L
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-xs font-mono font-semibold text-text tabular-nums text-center">{acc.connectedAccounts}</td>
                                    <td className="py-3.5 px-4">
                                        {acc.detectedPatterns.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {acc.detectedPatterns.map(p => (
                                                    <span key={p} className="text-[10px] font-mono bg-warning/10 text-warning border border-warning/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <ShieldAlert className="w-2.5 h-2.5" />
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-[11px] font-mono text-muted/40">No anomaly</span>
                                        )}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <span className={cn(
                                            "text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border",
                                            acc.status === 'Under Investigation' ? 'bg-primary/15 text-primary border-primary/30'
                                            : acc.status === 'Suspended' ? 'bg-danger/15 text-danger border-danger/30'
                                            : 'bg-white/[0.04] text-muted border-white/[0.08]'
                                        )}>
                                            {acc.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
