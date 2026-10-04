import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    X, 
    Users, 
    ArrowRight, 
    ExternalLink, 
    ShieldAlert, 
    Building2, 
    Activity, 
    Clock, 
    Download,
    CheckCircle2
} from 'lucide-react';
import { Account, Transaction } from '../types';
import { exportToCSV } from '../utils/csvExport';

export interface PatternInfo {
    id: string;
    title: string;
    subtitle: string;
    nodeCount: number;
    amount: number;
    risk: 'High' | 'Medium' | 'Critical';
    badge: string;
    icon: React.ElementType;
    color: string;
    borderColor: string;
    glowColor: string;
    bgGradient: string;
    accentColor: string;
    description: string;
    nodes: Account[];
    transactions: Transaction[];
}

interface PatternDetailModalProps {
    pattern: PatternInfo | null;
    onClose: () => void;
}

export default function PatternDetailModal({ pattern, onClose }: PatternDetailModalProps) {
    const navigate = useNavigate();

    if (!pattern) return null;

    const Icon = pattern.icon;

    const formatINR = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
        return `₹${val.toLocaleString('en-IN')}`;
    };

    const handleExport = () => {
        if (pattern.transactions.length > 0) {
            exportToCSV(pattern.transactions, { filename: `Pattern_${pattern.id}_Report.csv` });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div 
                className="relative w-full max-w-4xl glass-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Banner */}
                <div className={`p-6 border-b border-white/[0.08] relative ${pattern.bgGradient}`}>
                    {/* Top hair accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${pattern.accentColor}`} />

                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-2xl border ${pattern.borderColor} ${pattern.color} bg-background/80 shadow-lg`}>
                                <Icon className="w-7 h-7" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[11px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/10 text-text border border-white/10 font-semibold">
                                        {pattern.badge}
                                    </span>
                                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-danger/20 text-danger border border-danger/30 font-bold">
                                        {pattern.risk} RISK PATTERN
                                    </span>
                                </div>
                                <h2 className="text-2xl font-extrabold text-text tracking-tight">
                                    {pattern.title}
                                </h2>
                                <p className="text-xs text-muted mt-1 max-w-2xl font-sans leading-relaxed">
                                    {pattern.description}
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-muted hover:text-text transition-all border border-white/10"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Quick Metrics Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                        <div className="p-3.5 rounded-xl bg-background/70 border border-white/[0.08]">
                            <div className="text-[10px] font-mono text-muted uppercase">Involved Nodes</div>
                            <div className="text-xl font-bold font-mono text-text mt-0.5 flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-primary" />
                                <span>{pattern.nodeCount} Accounts</span>
                            </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-background/70 border border-white/[0.08]">
                            <div className="text-[10px] font-mono text-muted uppercase">Total Volume / Exposure</div>
                            <div className="text-xl font-bold font-mono text-text mt-0.5 text-danger">
                                {formatINR(pattern.amount)}
                            </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-background/70 border border-white/[0.08]">
                            <div className="text-[10px] font-mono text-muted uppercase">Transaction Count</div>
                            <div className="text-xl font-bold font-mono text-text mt-0.5 text-warning flex items-center gap-1.5">
                                <Activity className="w-4 h-4" />
                                <span>{pattern.transactions.length} Transfers</span>
                            </div>
                        </div>
                        <div className="p-3.5 rounded-xl bg-background/70 border border-white/[0.08]">
                            <div className="text-[10px] font-mono text-muted uppercase">Detection Status</div>
                            <div className="text-xl font-bold font-mono text-success mt-0.5 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Topology Flagged</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Area - Involved Nodes List */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-text flex items-center gap-2">
                                <Users className="w-4 h-4 text-primary" />
                                <span>Total Node Breakdown ({pattern.nodes.length} Accounts Identified)</span>
                            </h3>
                            <button 
                                onClick={handleExport}
                                className="text-xs font-mono text-primary hover:underline flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export Node & Txn List</span>
                            </button>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-background/60">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] font-mono uppercase text-muted tracking-wider">
                                            <th className="p-3 font-semibold">Node ID</th>
                                            <th className="p-3 font-semibold">Account Holder</th>
                                            <th className="p-3 font-semibold">Bank / Entity</th>
                                            <th className="p-3 font-semibold">Role in Topology</th>
                                            <th className="p-3 font-semibold">Exposure</th>
                                            <th className="p-3 font-semibold text-right">Risk</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {pattern.nodes.map((node) => (
                                            <tr key={node.id} className="hover:bg-white/[0.02] transition-colors text-xs">
                                                <td className="p-3 font-mono font-bold text-primary">{node.id}</td>
                                                <td className="p-3 font-medium text-text">{node.accountHolder || 'Counterparty'}</td>
                                                <td className="p-3 text-muted flex items-center gap-1.5">
                                                    <Building2 className="w-3.5 h-3.5 text-muted/70" />
                                                    <span>{node.bankName || 'Partner Bank'}</span>
                                                </td>
                                                <td className="p-3">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.06] text-muted border border-white/10">
                                                        {node.id.includes('MULE-101') ? 'Chain Origin' :
                                                         node.id.includes('MULE-106') ? 'Offramp Vault' :
                                                         node.id.includes('HUB') ? 'Smurf Liquidity Hub' :
                                                         node.id.includes('SMURF') ? 'Structured Feeder' :
                                                         node.id.includes('WASH-101') ? 'Loop Origin & Return' : 'Topology Node'}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-mono text-text font-semibold">
                                                    {formatINR(node.outgoing || node.incoming || pattern.amount)}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                                        node.risk === 'High' 
                                                            ? 'bg-danger/20 text-danger border-danger/30' 
                                                            : 'bg-warning/20 text-warning border-warning/30'
                                                    }`}>
                                                        {node.risk}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Step-by-Step Transaction Hop Timeline */}
                    {pattern.transactions.length > 0 && (
                        <div>
                            <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-warning" />
                                <span>Topology Execution Sequence</span>
                            </h3>

                            <div className="space-y-2.5">
                                {pattern.transactions.map((txn, idx) => (
                                    <div 
                                        key={txn.transactionId || idx}
                                        className="p-3.5 rounded-xl bg-background/80 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary/30 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center text-xs font-mono font-bold">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <div className="flex items-center gap-2 text-xs font-mono">
                                                    <span className="text-text font-semibold">{txn.sender}</span>
                                                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-text font-semibold">{txn.receiver}</span>
                                                </div>
                                                <p className="text-[11px] text-muted font-sans mt-0.5">
                                                    {txn.senderHolder || txn.sender} ➔ {txn.receiverHolder || txn.receiver}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-right self-end sm:self-center">
                                            <div>
                                                <div className="text-xs font-mono font-bold text-text">{formatINR(txn.amount)}</div>
                                                <div className="text-[10px] font-mono text-muted">{new Date(txn.timestamp).toLocaleTimeString()}</div>
                                            </div>
                                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-danger/10 text-danger border border-danger/30 font-semibold">
                                                Flagged
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action Bar */}
                <div className="p-4 border-t border-white/[0.08] bg-background/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button 
                        onClick={() => {
                            onClose();
                            navigate('/network');
                        }}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary text-[#080C14] hover:bg-primary-hover font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span>Inspect Full Topology in Network Graph</span>
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => {
                                onClose();
                                navigate('/investigations');
                            }}
                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-text font-mono text-xs border border-white/10 transition-all flex items-center justify-center gap-2"
                        >
                            <ShieldAlert className="w-4 h-4 text-warning" />
                            <span>View Cases</span>
                        </button>

                        <button 
                            onClick={onClose}
                            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted hover:text-text font-mono text-xs border border-white/10 transition-all"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
