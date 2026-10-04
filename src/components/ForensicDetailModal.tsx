import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    X, 
    Copy, 
    Check, 
    ArrowRight, 
    ShieldAlert, 
    Building2, 
    Calendar, 
    Clock, 
    User, 
    ExternalLink, 
    Network, 
    FileText, 
    AlertTriangle,
    Zap,
    ChevronRight
} from 'lucide-react';
import { Account, Transaction, Investigation } from '../types';
import { cn } from '../utils/cn';

export type ForensicItem = 
    | { type: 'account'; data: Account }
    | { type: 'transaction'; data: Transaction }
    | { type: 'investigation'; data: Investigation };

interface ForensicDetailModalProps {
    item: ForensicItem | null;
    isOpen: boolean;
    onClose: () => void;
    onSelectAccount?: (accountId: string) => void;
}

export default function ForensicDetailModal({
    item,
    isOpen,
    onClose,
    onSelectAccount
}: ForensicDetailModalProps) {
    const navigate = useNavigate();
    const [copiedText, setCopiedText] = useState<string | null>(null);

    if (!isOpen || !item) return null;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 2000);
    };

    const formatINR = (val: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            {/* Backdrop Dismiss */}
            <div className="fixed inset-0 -z-10" onClick={onClose} />

            {/* Modal Container */}
            <div className="relative w-full max-w-2xl bg-card border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden flex flex-col my-auto animate-in zoom-in-95 duration-200">
                {/* Header Strip */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-card-subtle/80">
                    <div className="flex items-center gap-2.5">
                        <div className={cn(
                            "p-2 rounded-xl border flex items-center justify-center",
                            item.type === 'account' ? "bg-primary/10 border-primary/30 text-primary" :
                            item.type === 'transaction' ? "bg-warning/10 border-warning/30 text-warning" :
                            "bg-danger/10 border-danger/30 text-danger"
                        )}>
                            {item.type === 'account' && <User className="w-5 h-5" />}
                            {item.type === 'transaction' && <ArrowRight className="w-5 h-5" />}
                            {item.type === 'investigation' && <ShieldAlert className="w-5 h-5" />}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
                                    {item.type === 'account' ? 'Entity Intelligence Record' :
                                     item.type === 'transaction' ? 'Transaction Forensic Detail' :
                                     'Investigation Case Dossier'}
                                </span>
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border",
                                    item.type === 'account' 
                                        ? (item.data.risk === 'High' ? "bg-danger/15 text-danger border-danger/30" : "bg-warning/15 text-warning border-warning/30") :
                                    item.type === 'transaction'
                                        ? (item.data.status === 'Flagged' ? "bg-danger/15 text-danger border-danger/30" : "bg-success/15 text-success border-success/30") :
                                    "bg-danger/15 text-danger border-danger/30"
                                )}>
                                    {item.type === 'account' ? `${item.data.risk} Risk` :
                                     item.type === 'transaction' ? item.data.status :
                                     `${item.data.risk} Risk`}
                                </span>
                            </div>
                            <h2 className="text-base font-bold text-text font-mono flex items-center gap-2 mt-0.5">
                                {item.type === 'account' && item.data.id}
                                {item.type === 'transaction' && item.data.transactionId}
                                {item.type === 'investigation' && item.data.id}
                                
                                <button
                                    onClick={() => {
                                        const val = item.type === 'account' ? item.data.id :
                                                    item.type === 'transaction' ? item.data.transactionId :
                                                    item.data.id;
                                        copyToClipboard(val, 'ID');
                                    }}
                                    className="p-1 rounded hover:bg-white/10 text-muted hover:text-text transition-colors"
                                    title="Copy ID"
                                >
                                    {copiedText === 'ID' ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </h2>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-muted hover:text-text hover:bg-white/[0.08] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                    {/* ACCOUNT DETAIL VIEW */}
                    {item.type === 'account' && (
                        <div className="space-y-6">
                            {/* Entity Primary Info */}
                            <div className="p-4 rounded-xl bg-background/60 border border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[11px] font-mono text-muted block">ACCOUNT HOLDER</span>
                                    <p className="text-sm font-semibold text-text mt-0.5 flex items-center gap-2">
                                        <User className="w-4 h-4 text-primary shrink-0" />
                                        <span>{item.data.accountHolder || 'Undisclosed Entity'}</span>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[11px] font-mono text-muted block">FINANCIAL INSTITUTION</span>
                                    <p className="text-sm font-medium text-text mt-0.5 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-warning shrink-0" />
                                        <span>{item.data.bankName || 'Unknown Bank'}</span>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[11px] font-mono text-muted block">ACCOUNT NUMBER</span>
                                    <p className="text-xs font-mono text-text/90 mt-0.5 flex items-center gap-2">
                                        <span>{item.data.accountNumber || item.data.id}</span>
                                        <button
                                            onClick={() => copyToClipboard(item.data.accountNumber || item.data.id, 'accNo')}
                                            className="p-1 rounded hover:bg-white/10 text-muted"
                                        >
                                            {copiedText === 'accNo' ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[11px] font-mono text-muted block">INVESTIGATION STATUS</span>
                                    <p className="text-xs font-medium text-warning mt-0.5 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
                                        <span>{item.data.status}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Financial Velocity Metrics */}
                            <div>
                                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted mb-3">
                                    Ledger Exposure & Velocity
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-xl bg-card-subtle border border-white/[0.06]">
                                        <span className="text-[10px] font-mono text-muted block">TOTAL INCOMING</span>
                                        <span className="text-sm font-mono font-bold text-success mt-1 block">
                                            {formatINR(item.data.incoming)}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-card-subtle border border-white/[0.06]">
                                        <span className="text-[10px] font-mono text-muted block">TOTAL OUTGOING</span>
                                        <span className="text-sm font-mono font-bold text-danger mt-1 block">
                                            {formatINR(item.data.outgoing)}
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-card-subtle border border-white/[0.06]">
                                        <span className="text-[10px] font-mono text-muted block">TXN COUNT</span>
                                        <span className="text-sm font-mono font-bold text-text mt-1 block">
                                            {item.data.transactions} Transfers
                                        </span>
                                    </div>
                                    <div className="p-3 rounded-xl bg-card-subtle border border-white/[0.06]">
                                        <span className="text-[10px] font-mono text-muted block">CONNECTED NODES</span>
                                        <span className="text-sm font-mono font-bold text-primary mt-1 block">
                                            {item.data.connectedAccounts} Accounts
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Detected AML Patterns */}
                            {item.data.detectedPatterns && item.data.detectedPatterns.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted mb-2">
                                        Flagged Topologies & Behavioral Patterns
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {item.data.detectedPatterns.map((pattern, idx) => (
                                            <div 
                                                key={idx}
                                                className="px-3 py-1.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-medium flex items-center gap-2"
                                            >
                                                <Zap className="w-3.5 h-3.5 text-danger" />
                                                <span>{pattern}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Connected Accounts */}
                            {item.data.connectedAccountList && item.data.connectedAccountList.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted mb-2">
                                        Immediate Counterparty Links ({item.data.connectedAccountList.length})
                                    </h3>
                                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                        {item.data.connectedAccountList.map((accId) => (
                                            <div
                                                key={accId}
                                                onClick={() => {
                                                    if (onSelectAccount) {
                                                        onSelectAccount(accId);
                                                    }
                                                }}
                                                className="flex items-center justify-between px-3 py-2 rounded-lg bg-background/50 hover:bg-white/[0.06] border border-white/[0.05] cursor-pointer transition-colors group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <span className="text-xs font-mono text-text group-hover:text-primary transition-colors font-medium">
                                                        {accId}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-muted group-hover:text-text flex items-center gap-1 font-mono">
                                                    Inspect Node <ChevronRight className="w-3.5 h-3.5" />
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="pt-2 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/network?account=${item.data.id}`);
                                    }}
                                    className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-[#050D1A] font-semibold text-xs transition-all shadow-panel-glow"
                                >
                                    <Network className="w-4 h-4" />
                                    <span>Trace in Graph Network</span>
                                </button>
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/transactions?search=${item.data.id}`);
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card-subtle hover:bg-white/[0.08] border border-white/[0.1] text-text text-xs font-medium transition-all"
                                >
                                    <FileText className="w-4 h-4 text-warning" />
                                    <span>Ledger Transactions</span>
                                </button>
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/accounts?search=${item.data.id}`);
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card-subtle hover:bg-white/[0.08] border border-white/[0.1] text-text text-xs font-medium transition-all"
                                >
                                    <User className="w-4 h-4 text-primary" />
                                    <span>Entity Profile</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TRANSACTION DETAIL VIEW */}
                    {item.type === 'transaction' && (
                        <div className="space-y-6">
                            {/* Prominent Amount & Latency Banner */}
                            <div className="p-4 rounded-xl bg-gradient-to-r from-card-subtle to-background border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <span className="text-[11px] font-mono text-muted uppercase">TRANSACTION AMOUNT</span>
                                    <div className="text-2xl font-bold font-mono text-primary mt-0.5">
                                        {formatINR(item.data.amount)}
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <span className="text-[11px] font-mono text-muted uppercase">TRANSFER LATENCY</span>
                                    <div className="text-sm font-mono text-warning font-semibold mt-0.5 flex items-center sm:justify-end gap-1.5">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                            {item.data.processingTime 
                                                ? `${item.data.processingTime} seconds (Rapid Hop)` 
                                                : 'Real-time transit'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Origin to Destination Hop Flow */}
                            <div>
                                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted mb-2">
                                    Forensic Path (Origin → Destination)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                                    {/* Sender Card */}
                                    <div className="p-4 rounded-xl bg-background/60 border border-white/[0.06] space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-danger font-semibold uppercase px-1.5 py-0.5 rounded bg-danger/10 border border-danger/25">
                                                ORIGIN SENDER
                                            </span>
                                            <button
                                                onClick={() => {
                                                    if (onSelectAccount) onSelectAccount(item.data.sender);
                                                }}
                                                className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
                                            >
                                                Inspect <ExternalLink className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                        <p className="text-sm font-bold font-mono text-text">
                                            {item.data.sender}
                                        </p>
                                        <p className="text-xs text-muted flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-muted" />
                                            <span>{item.data.senderHolder || 'Holder info unavailable'}</span>
                                        </p>
                                        <p className="text-xs text-muted flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-muted" />
                                            <span>{item.data.institution}</span>
                                        </p>
                                    </div>

                                    {/* Receiver Card */}
                                    <div className="p-4 rounded-xl bg-background/60 border border-white/[0.06] space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono text-success font-semibold uppercase px-1.5 py-0.5 rounded bg-success/10 border border-success/25">
                                                DESTINATION RECEIVER
                                            </span>
                                            <button
                                                onClick={() => {
                                                    if (onSelectAccount) onSelectAccount(item.data.receiver);
                                                }}
                                                className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1"
                                            >
                                                Inspect <ExternalLink className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                        <p className="text-sm font-bold font-mono text-text">
                                            {item.data.receiver}
                                        </p>
                                        <p className="text-xs text-muted flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-muted" />
                                            <span>{item.data.receiverHolder || 'Holder info unavailable'}</span>
                                        </p>
                                        <p className="text-xs text-muted flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-muted" />
                                            <span>{item.data.receiverInstitution || item.data.institution}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Detected Pattern & Investigation Info */}
                            <div className="p-4 rounded-xl bg-danger/10 border border-danger/25 space-y-2">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-danger shrink-0" />
                                    <span className="text-xs font-mono font-bold text-danger uppercase tracking-wider">
                                        ANOMALY PATTERN: {item.data.detectedPattern || 'Suspicious Mule Pass-Through'}
                                    </span>
                                </div>
                                <p className="text-xs text-text/80 leading-relaxed">
                                    This transfer matches high-velocity pass-through mule patterns with rapid withdrawal/layering intervals.
                                    {item.data.investigationId && ` Linked to formal case dossier ${item.data.investigationId}.`}
                                </p>
                                <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-muted">
                                    <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        {new Date(item.data.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/network?account=${item.data.sender}`);
                                    }}
                                    className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-[#050D1A] font-semibold text-xs transition-all shadow-panel-glow"
                                >
                                    <Network className="w-4 h-4" />
                                    <span>Visualize Flow in Graph</span>
                                </button>
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/transactions?search=${item.data.transactionId}`);
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card-subtle hover:bg-white/[0.08] border border-white/[0.1] text-text text-xs font-medium transition-all"
                                >
                                    <FileText className="w-4 h-4 text-warning" />
                                    <span>Inspect in Ledger</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* INVESTIGATION DETAIL VIEW */}
                    {item.type === 'investigation' && (
                        <div className="space-y-6">
                            <div className="p-4 rounded-xl bg-background/60 border border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[11px] font-mono text-muted block">DETECTED SCHEME</span>
                                    <p className="text-sm font-bold text-danger mt-0.5 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                                        <span>{item.data.pattern}</span>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[11px] font-mono text-muted block">TOTAL CLUSTER EXPOSURE</span>
                                    <p className="text-base font-bold font-mono text-primary mt-0.5">
                                        {formatINR(item.data.amount)}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[11px] font-mono text-muted block">CASE STATUS</span>
                                    <p className="text-xs font-semibold text-warning mt-0.5 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
                                        <span>{item.data.status}</span>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[11px] font-mono text-muted block">FLAG DATE</span>
                                    <p className="text-xs font-mono text-text/80 mt-0.5 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-muted" />
                                        <span>{item.data.date}</span>
                                    </p>
                                </div>
                            </div>

                            {/* Involved Nodes */}
                            <div>
                                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-muted mb-2">
                                    Participating Syndicate Accounts ({item.data.accounts.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                    {item.data.accounts.map((accId) => (
                                        <div
                                            key={accId}
                                            onClick={() => {
                                                if (onSelectAccount) onSelectAccount(accId);
                                            }}
                                            className="flex items-center justify-between p-2.5 rounded-lg bg-card-subtle hover:bg-white/[0.08] border border-white/[0.05] cursor-pointer transition-colors group"
                                        >
                                            <span className="text-xs font-mono text-text group-hover:text-primary transition-colors font-semibold">
                                                {accId}
                                            </span>
                                            <span className="text-[10px] font-mono text-muted group-hover:text-text flex items-center gap-1">
                                                Inspect <ChevronRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/network?case=${item.data.id}`);
                                    }}
                                    className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-[#050D1A] font-semibold text-xs transition-all shadow-panel-glow"
                                >
                                    <Network className="w-4 h-4" />
                                    <span>Open Graph Cluster</span>
                                </button>
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate('/investigations');
                                    }}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card-subtle hover:bg-white/[0.08] border border-white/[0.1] text-text text-xs font-medium transition-all"
                                >
                                    <ShieldAlert className="w-4 h-4 text-danger" />
                                    <span>Case Dossier</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
