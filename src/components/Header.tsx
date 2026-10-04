import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Search, 
    Bell, 
    Clock, 
    Command, 
    Terminal, 
    X, 
    User, 
    ArrowRight, 
    ShieldAlert, 
    ChevronDown, 
    Settings as SettingsIcon, 
    ShieldCheck 
} from 'lucide-react';
import { api } from '../services/api';
import { Account, Transaction, Investigation } from '../types';
import ForensicDetailModal, { ForensicItem } from './ForensicDetailModal';
import { cn } from '../utils/cn';

const routeTitles: Record<string, { title: string; subtitle: string }> = {
    '/dashboard': { title: 'Executive Overview', subtitle: 'Live telemetry & threat intelligence stream' },
    '/transactions': { title: 'Transaction Forensic Ledger', subtitle: 'Audit, trace, and inspect raw transaction flows' },
    '/network': { title: 'Graph Network Investigation', subtitle: 'Interactive topological link analysis of accounts' },
    '/accounts': { title: 'Suspicious Accounts Matrix', subtitle: 'Risk-stratified entity profiles and mule detection' },
    '/investigations': { title: 'Case Management Dossiers', subtitle: 'Active investigative cases & evidence chains' },
    '/reports': { title: 'Regulatory Compliance Reports', subtitle: 'Formal SAR filings & audit trail dossiers' },
    '/settings': { title: 'Platform & Security Config', subtitle: 'System parameters, analyst access & credentials' }
};

export default function Header() {
    const location = useLocation();
    const navigate = useNavigate();
    const [time, setTime] = useState<string>('');

    // Search and data states
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACCOUNTS' | 'TRANSACTIONS' | 'INVESTIGATIONS'>('ALL');
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [investigations, setInvestigations] = useState<Investigation[]>([]);

    // Detail modal state
    const [selectedItem, setSelectedItem] = useState<ForensicItem | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Profile dropdown state
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    // Live UTC clock
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setTime(now.toTimeString().split(' ')[0] + ' UTC');
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Load data and subscribe
    const loadForensicData = () => {
        Promise.all([
            api.getAccounts(),
            api.getTransactions(),
            api.getInvestigations()
        ]).then(([accs, txns, invs]) => {
            setAccounts(accs);
            setTransactions(txns);
            setInvestigations(invs);
        });
    };

    useEffect(() => {
        loadForensicData();
        const unsubscribe = api.subscribe(() => {
            loadForensicData();
        });
        return unsubscribe;
    }, []);

    // Global keyboard shortcuts (Cmd+K / Ctrl+K, Escape)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                setIsSearchOpen(true);
            }
            if (e.key === 'Escape') {
                setIsSearchOpen(false);
                setIsProfileMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setIsSearchOpen(false);
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const path = location.pathname;
    const currentMeta = routeTitles[path] || {
        title: 'Forensic Workspace',
        subtitle: 'Secure intelligence platform'
    };

    // Filter results across accounts, transactions, and investigations
    const searchResults = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) {
            return { accounts: [], transactions: [], investigations: [], total: 0 };
        }

        const matchedAccounts = accounts.filter(a => {
            return a.id.toLowerCase().includes(q) ||
                (a.accountHolder && a.accountHolder.toLowerCase().includes(q)) ||
                (a.bankName && a.bankName.toLowerCase().includes(q)) ||
                (a.accountNumber && a.accountNumber.toLowerCase().includes(q)) ||
                a.risk.toLowerCase().includes(q) ||
                a.status.toLowerCase().includes(q) ||
                (a.detectedPatterns && a.detectedPatterns.some(p => p.toLowerCase().includes(q)));
        });

        const matchedTransactions = transactions.filter(t => {
            return t.transactionId.toLowerCase().includes(q) ||
                t.sender.toLowerCase().includes(q) ||
                t.receiver.toLowerCase().includes(q) ||
                (t.senderHolder && t.senderHolder.toLowerCase().includes(q)) ||
                (t.receiverHolder && t.receiverHolder.toLowerCase().includes(q)) ||
                t.institution.toLowerCase().includes(q) ||
                (t.receiverInstitution && t.receiverInstitution.toLowerCase().includes(q)) ||
                (t.detectedPattern && t.detectedPattern.toLowerCase().includes(q)) ||
                t.amount.toString().includes(q);
        });

        const matchedInvestigations = investigations.filter(i => {
            return i.id.toLowerCase().includes(q) ||
                i.pattern.toLowerCase().includes(q) ||
                i.risk.toLowerCase().includes(q) ||
                i.status.toLowerCase().includes(q) ||
                i.accounts.some(acc => acc.toLowerCase().includes(q));
        });

        const total = matchedAccounts.length + matchedTransactions.length + matchedInvestigations.length;

        return {
            accounts: matchedAccounts,
            transactions: matchedTransactions,
            investigations: matchedInvestigations,
            total
        };
    }, [searchQuery, accounts, transactions, investigations]);

    const handleSelectResult = (item: ForensicItem) => {
        setSelectedItem(item);
        setIsDetailModalOpen(true);
        setIsSearchOpen(false);
    };

    const handleInspectAccountFromModal = (accId: string) => {
        const target = accounts.find(a => a.id === accId);
        if (target) {
            setSelectedItem({ type: 'account', data: target });
        } else {
            // Minimal synthetic record if not fully matched
            setSelectedItem({
                type: 'account',
                data: {
                    id: accId,
                    bankName: 'Associated Network Institution',
                    risk: 'High',
                    transactions: 2,
                    incoming: 0,
                    outgoing: 0,
                    connectedAccounts: 1,
                    detectedPatterns: ['Network Counterparty'],
                    lastActivity: new Date().toISOString(),
                    status: 'Under Investigation'
                }
            });
        }
    };

    return (
        <>
            <header className="h-16 shrink-0 border-b border-white/[0.07] bg-card-subtle/90 backdrop-blur-xl px-5 sm:px-7 flex items-center gap-4 z-20 relative">

                {/* Left: Page Title only — compact */}
                <div className="flex flex-col justify-center min-w-0 shrink-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Terminal className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-primary leading-none">
                            {path.replace('/', '') || 'root'}
                        </span>
                    </div>
                    <h1 className="text-sm font-bold tracking-tight text-text font-sans leading-tight truncate max-w-[200px]">
                        {currentMeta.title}
                    </h1>
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-white/[0.08] shrink-0 hidden sm:block" />

                {/* Middle: Universal Search Bar — flex-1 so it takes available space */}
                <div ref={searchRef} className="relative flex-1 min-w-0 max-w-[480px]">
                    <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 absolute left-3 text-muted pointer-events-none" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchOpen(true);
                            }}
                            onFocus={() => {
                                if (searchQuery.trim().length > 0) setIsSearchOpen(true);
                            }}
                            placeholder="Search accounts, TXN IDs, patterns..."
                            className="w-full bg-background/70 border border-white/[0.08] hover:border-white/[0.16] focus:border-primary/50 rounded-xl pl-9 pr-14 py-2 text-xs text-text placeholder:text-muted/50 transition-all focus:outline-none focus:ring-1 focus:ring-primary/20 font-sans"
                        />
                        <div className="absolute right-2.5 flex items-center gap-1.5">
                            {searchQuery ? (
                                <button
                                    onClick={() => { setSearchQuery(''); setIsSearchOpen(false); }}
                                    className="p-1 rounded-md text-muted hover:text-text hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            ) : (
                                <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-muted/70 pointer-events-none">
                                    <Command className="w-2.5 h-2.5" />
                                    <span>K</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Search Results Dropdown */}
                    {isSearchOpen && searchQuery.trim().length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-card/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="px-4 py-2.5 border-b border-white/[0.08] bg-card-subtle/90 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 overflow-x-auto">
                                    {(['ALL', 'ACCOUNTS', 'TRANSACTIONS', 'INVESTIGATIONS'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setActiveFilter(f)}
                                            className={cn(
                                                "px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition-all whitespace-nowrap",
                                                activeFilter === f
                                                    ? "bg-primary text-[#050D1A] font-semibold"
                                                    : "text-muted hover:text-text hover:bg-white/[0.06]"
                                            )}
                                        >
                                            {f === 'ALL' && `All (${searchResults.total})`}
                                            {f === 'ACCOUNTS' && `Accounts (${searchResults.accounts.length})`}
                                            {f === 'TRANSACTIONS' && `Transactions (${searchResults.transactions.length})`}
                                            {f === 'INVESTIGATIONS' && `Cases (${searchResults.investigations.length})`}
                                        </button>
                                    ))}
                                </div>
                                <span className="text-[10px] font-mono text-muted hidden sm:inline shrink-0 ml-3">Click to view</span>
                            </div>

                            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
                                {searchResults.total === 0 ? (
                                    <div className="py-8 text-center px-4">
                                        <ShieldAlert className="w-7 h-7 text-muted mx-auto mb-2 opacity-40" />
                                        <p className="text-xs text-text font-medium">No results for "{searchQuery}"</p>
                                        <p className="text-[11px] text-muted mt-1 font-mono">Try ACC-MULE, HDFC, Smurfing or TXN-MP</p>
                                    </div>
                                ) : (
                                    <>
                                        {(activeFilter === 'ALL' || activeFilter === 'ACCOUNTS') && searchResults.accounts.length > 0 && (
                                            <div className="pt-1">
                                                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted font-semibold">
                                                    Accounts ({searchResults.accounts.length})
                                                </div>
                                                {searchResults.accounts.map(acc => (
                                                    <div key={acc.id} onClick={() => handleSelectResult({ type: 'account', data: acc })}
                                                        className="p-2.5 rounded-xl hover:bg-white/[0.06] cursor-pointer transition-all flex items-center justify-between group border border-transparent hover:border-white/[0.08]">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
                                                                <User className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-mono font-bold text-text group-hover:text-primary">{acc.id}</span>
                                                                    <span className={cn("text-[9px] font-mono px-1.5 rounded border uppercase font-medium",
                                                                        acc.risk === 'High' ? "bg-danger/15 text-danger border-danger/30" : "bg-warning/15 text-warning border-warning/30"
                                                                    )}>{acc.risk}</span>
                                                                </div>
                                                                <p className="text-[11px] text-muted truncate">{acc.accountHolder || 'Undisclosed'} • {acc.bankName || 'Institution'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0 ml-3">
                                                            <span className="text-[11px] font-mono text-text/80 block">₹{acc.outgoing.toLocaleString('en-IN')}</span>
                                                            <span className="text-[9px] font-mono text-muted">{acc.transactions} txns</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {(activeFilter === 'ALL' || activeFilter === 'TRANSACTIONS') && searchResults.transactions.length > 0 && (
                                            <div className="pt-1">
                                                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted font-semibold">
                                                    Transactions ({searchResults.transactions.length})
                                                </div>
                                                {searchResults.transactions.map(txn => (
                                                    <div key={txn.transactionId} onClick={() => handleSelectResult({ type: 'transaction', data: txn })}
                                                        className="p-2.5 rounded-xl hover:bg-white/[0.06] cursor-pointer transition-all flex items-center justify-between group border border-transparent hover:border-white/[0.08]">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/25 flex items-center justify-center text-warning shrink-0">
                                                                <ArrowRight className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-mono font-bold text-text group-hover:text-warning">{txn.transactionId}</span>
                                                                    <span className={cn("text-[9px] font-mono px-1.5 rounded border uppercase font-medium",
                                                                        txn.status === 'Flagged' ? "bg-danger/15 text-danger border-danger/30" : "bg-success/15 text-success border-success/30"
                                                                    )}>{txn.status}</span>
                                                                </div>
                                                                <p className="text-[11px] text-muted truncate">{txn.sender} → {txn.receiver}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0 ml-3">
                                                            <span className="text-xs font-mono font-bold text-primary block">₹{txn.amount.toLocaleString('en-IN')}</span>
                                                            <span className="text-[9px] font-mono text-muted">{txn.detectedPattern || 'Transfer'}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {(activeFilter === 'ALL' || activeFilter === 'INVESTIGATIONS') && searchResults.investigations.length > 0 && (
                                            <div className="pt-1">
                                                <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-muted font-semibold">
                                                    Cases ({searchResults.investigations.length})
                                                </div>
                                                {searchResults.investigations.map(inv => (
                                                    <div key={inv.id} onClick={() => handleSelectResult({ type: 'investigation', data: inv })}
                                                        className="p-2.5 rounded-xl hover:bg-white/[0.06] cursor-pointer transition-all flex items-center justify-between group border border-transparent hover:border-white/[0.08]">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/25 flex items-center justify-center text-danger shrink-0">
                                                                <ShieldAlert className="w-4 h-4" />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs font-mono font-bold text-text group-hover:text-danger">{inv.id}</span>
                                                                    <span className="text-[9px] font-mono px-1.5 rounded bg-danger/15 text-danger border border-danger/30 uppercase font-medium">{inv.risk}</span>
                                                                </div>
                                                                <p className="text-[11px] text-muted truncate">{inv.pattern} • {inv.accounts.length} Nodes</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0 ml-3">
                                                            <span className="text-xs font-mono font-bold text-primary block">₹{inv.amount.toLocaleString('en-IN')}</span>
                                                            <span className="text-[9px] font-mono text-warning">{inv.status}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Telemetry & Profile — pushed to right via ml-auto */}
                <div className="flex items-center gap-2 ml-auto shrink-0">

                    {/* Live Clock */}
                    <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-background/60 border border-white/[0.06] text-xs font-mono text-muted">
                        <Clock className="w-3 h-3 text-primary" />
                        <span className="tabular-nums text-text text-[11px]">{time || '--:--:-- UTC'}</span>
                    </div>

                    {/* Threat Level */}
                    <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-warning/10 border border-warning/25 text-warning text-[11px] font-mono font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning animate-ping shrink-0"></span>
                        <span className="tracking-wide">ELEVATED</span>
                    </div>

                    {/* Notification Bell */}
                    <button
                        onClick={() => navigate('/investigations')}
                        className="relative p-2 rounded-xl bg-background/60 hover:bg-card-hover border border-white/[0.08] hover:border-white/[0.16] text-muted hover:text-text transition-all"
                        title="Flagged Alerts"
                    >
                        <Bell className="w-4 h-4" />
                        <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger ring-2 ring-background"></span>
                    </button>

                    {/* User Profile */}
                    <div ref={profileRef} className="relative">
                        <button
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-background/70 hover:bg-card-hover border border-white/[0.08] hover:border-primary/40 transition-all group shadow-sm active:scale-[0.98]"
                            title="Analyst Profile"
                        >
                            <div className="relative shrink-0">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-900 to-blue-900 border border-primary/30 flex items-center justify-center text-primary font-mono text-[10px] font-bold group-hover:border-primary transition-colors">
                                    AN-09
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success ring-2 ring-background"></span>
                            </div>
                            <div className="hidden sm:block text-left min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="text-[11px] font-semibold text-text truncate group-hover:text-primary transition-colors">Agent Sharma</span>
                                    <span className="text-[8px] font-mono text-primary bg-primary/10 px-1 rounded border border-primary/25 shrink-0">L4</span>
                                </div>
                                <p className="text-[9px] font-mono text-muted truncate">Lead AML Investigator</p>
                            </div>
                            <ChevronDown className="w-3 h-3 text-muted group-hover:text-text hidden sm:block shrink-0" />
                        </button>

                        {isProfileMenuOpen && (
                            <div className="absolute right-0 mt-2 w-60 bg-card/95 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/80 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="p-3 border-b border-white/[0.07] bg-card-subtle/80 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-900 to-blue-900 border border-primary/30 flex items-center justify-center text-primary font-mono text-xs font-bold shrink-0">
                                        AN-09
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-xs font-bold text-text truncate">Agent Sharma</p>
                                            <span className="text-[9px] font-mono text-primary bg-primary/10 px-1 rounded border border-primary/20 shrink-0">L4</span>
                                        </div>
                                        <p className="text-[10px] font-mono text-muted">Lead AML Investigator</p>
                                        <p className="text-[9px] font-mono text-success flex items-center gap-1 mt-0.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0"></span>
                                            Active · TLS 1.3
                                        </p>
                                    </div>
                                </div>
                                <div className="p-2 space-y-0.5 text-xs">
                                    <button onClick={() => { setIsProfileMenuOpen(false); navigate('/settings'); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-text hover:bg-white/[0.06] hover:text-primary transition-colors text-left">
                                        <SettingsIcon className="w-3.5 h-3.5 text-muted" />
                                        <span>Platform Settings</span>
                                    </button>
                                    <button onClick={() => { setIsProfileMenuOpen(false); navigate('/investigations'); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-text hover:bg-white/[0.06] hover:text-primary transition-colors text-left">
                                        <ShieldCheck className="w-3.5 h-3.5 text-muted" />
                                        <span>Assigned Cases</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <ForensicDetailModal
                item={selectedItem}
                isOpen={isDetailModalOpen}
                onClose={() => { setIsDetailModalOpen(false); setSelectedItem(null); }}
                onSelectAccount={handleInspectAccountFromModal}
            />
        </>
    );
}
