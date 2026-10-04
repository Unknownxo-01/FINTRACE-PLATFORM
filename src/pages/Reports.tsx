import { useEffect, useState } from 'react';
import { Download, FileText, Calendar, Search, FileBadge, Shield, Plus, ArrowRight } from 'lucide-react';
import { Investigation } from '../types';
import { api } from '../services/api';
import { cn } from '../utils/cn';

const riskColor = (risk: string) =>
    risk === 'High' ? 'bg-danger/15 text-danger border-danger/30'
    : risk === 'Medium' ? 'bg-warning/15 text-warning border-warning/30'
    : 'bg-success/15 text-success border-success/30';

export default function Reports() {
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const loadData = () => {
        api.getInvestigations().then(setInvestigations);
    };

    useEffect(() => {
        loadData();
        const unsubscribe = api.subscribe(loadData);
        return unsubscribe;
    }, []);

    const filtered = investigations.filter(i => 
        !searchQuery || 
        i.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        i.pattern.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-mono uppercase tracking-widest text-secondary">REGULATORY COMPLIANCE</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-text">Formal SAR Dossiers</h2>
                    <p className="text-muted text-xs mt-0.5">
                        Suspicious Activity Reports and official investigation dossiers for regulatory submission.
                    </p>
                </div>
                <button className="self-start md:self-auto px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#050D1A] text-xs font-semibold transition-all flex items-center gap-2 shadow-panel-glow active:scale-[0.98]">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Generate New SAR</span>
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Reports', value: investigations.length, color: 'text-text', border: 'border-white/[0.08]' },
                    { label: 'High Risk', value: investigations.filter(i => i.risk === 'High').length, color: 'text-danger', border: 'border-danger/30' },
                    { label: 'Submitted to RBI', value: 0, color: 'text-success', border: 'border-success/30' },
                    { label: 'Pending Review', value: investigations.length, color: 'text-warning', border: 'border-warning/30' },
                ].map(s => (
                    <div key={s.label} className={`glass-panel p-4 rounded-xl border ${s.border}`}>
                        <div className="text-2xl font-bold font-mono tabular-nums text-text">{s.value}</div>
                        <div className={`text-[11px] font-mono mt-0.5 ${s.color}`}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Reports Table */}
            <div className="glass-panel p-6 rounded-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h3 className="text-sm font-bold text-text flex items-center gap-2">
                        <FileBadge className="w-4 h-4 text-secondary" />
                        Investigation Dossier Registry
                    </h3>
                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by case ID or pattern..."
                            className="w-full bg-background/80 border border-white/[0.08] focus:border-primary/50 rounded-xl pl-9 pr-4 py-2 text-xs text-text placeholder:text-muted/60 focus:outline-none transition-colors font-sans"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-card-subtle/40">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[10px] font-mono text-muted uppercase tracking-wider">
                                <th className="py-3 px-4 font-semibold">Case Reference</th>
                                <th className="py-3 px-4 font-semibold">Filed On</th>
                                <th className="py-3 px-4 font-semibold">Pattern Classified</th>
                                <th className="py-3 px-4 font-semibold">Risk Tier</th>
                                <th className="py-3 px-4 font-semibold">Potential Exposure</th>
                                <th className="py-3 px-4 font-semibold">Filing State</th>
                                <th className="py-3 px-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-xs font-mono text-muted">
                                        No dossiers match the query.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-secondary/10 border border-secondary/20">
                                                    <FileText className="w-3.5 h-3.5 text-secondary" />
                                                </div>
                                                <span className="text-xs font-mono font-bold text-text">{inv.id}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs font-mono text-muted">
                                            <span className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-muted/60" />
                                                {inv.date}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs font-sans text-muted">{inv.pattern}</td>
                                        <td className="py-3.5 px-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border",
                                                riskColor(inv.risk)
                                            )}>
                                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                                    inv.risk === 'High' ? 'bg-danger' : inv.risk === 'Medium' ? 'bg-warning' : 'bg-success'
                                                )} />
                                                {inv.risk}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs font-mono font-bold text-text tabular-nums">
                                            ₹{(inv.amount / 100000).toFixed(2)}L
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/25">
                                                Official Draft
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="text-primary text-xs font-mono hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="View Dossier"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <span>View</span>
                                                </button>
                                                <button
                                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-background/80 hover:bg-card-hover border border-white/[0.08] text-muted hover:text-text text-[10px] font-mono transition-all"
                                                    onClick={() => alert('Generating PDF Dossier...')}
                                                    title="Export PDF"
                                                >
                                                    <Download className="w-3.5 h-3.5" />
                                                    <span>PDF</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-muted">
                    <div>
                        {investigations.length} dossier(s) on record — <span className="text-warning">awaiting RBI clearance</span>
                    </div>
                    <button className="flex items-center gap-1.5 text-primary hover:underline">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Submit All for Review</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
