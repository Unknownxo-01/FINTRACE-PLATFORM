import { useEffect, useState, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Filter,
    Search,
    Maximize2,
    ZoomIn,
    ZoomOut,
    RefreshCw,
    FileText,
    AlertOctagon,
    X,
    ChevronLeft,
    ChevronRight,
    ArrowUpRight,
    ArrowDownLeft,
    ShieldAlert,
    Copy,
    Check,
    FolderPlus,
    Activity,
    ExternalLink
} from 'lucide-react';
import CytoscapeGraph, { CytoscapeGraphRef } from '../components/CytoscapeGraph';
import { api } from '../services/api';
import { Account, Investigation, Transaction } from '../types';
import { formatTimestampWithSeconds } from '../utils/csvExport';

export default function NetworkInvestigation() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const graphRef = useRef<CytoscapeGraphRef>(null);

    // Data states
    const [networkData, setNetworkData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
    const [allAccounts, setAllAccounts] = useState<Account[]>([]);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [loading, setLoading] = useState(true);

    // Selected states
    const [selectedInvestigationId, setSelectedInvestigationId] = useState<string>('ALL');
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRisk, setSelectedRisk] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');
    const [selectedPattern, setSelectedPattern] = useState<string>('ALL');
    const [layoutName, setLayoutName] = useState<string>('cose');

    // UI Drawer / Sidebar states
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
    const [copiedAccount, setCopiedAccount] = useState(false);
    const [actionToast, setActionToast] = useState<string | null>(null);

    const loadData = () => {
        Promise.all([
            api.getNetworkData(),
            api.getAccounts(),
            api.getTransactions(),
            api.getInvestigations()
        ]).then(([net, accs, txns, invs]) => {
            setNetworkData(net);
            setAllAccounts(accs);
            setAllTransactions(txns);
            setInvestigations(invs);
            setLoading(false);
        });
    };

    // Fetch initial data & subscribe to updates
    useEffect(() => {
        loadData();
        const unsubscribe = api.subscribe(() => {
            loadData();
        });
        return unsubscribe;
    }, []);

    // Handle URL search params on mount or param changes
    useEffect(() => {
        const caseParam = searchParams.get('case');
        const accountParam = searchParams.get('account');
        const patternParam = searchParams.get('pattern');

        if (caseParam) {
            setSelectedInvestigationId(caseParam);
        }
        if (accountParam) {
            setSelectedAccountId(accountParam);
        }
        if (patternParam) {
            setSelectedPattern(patternParam);
        }
    }, [searchParams]);

    // Fetch account details when selectedAccountId changes
    useEffect(() => {
        if (!selectedAccountId) {
            setSelectedAccount(null);
            return;
        }

        // Fast-path: find in cached accounts
        const cached = allAccounts.find(a => a.id === selectedAccountId);
        if (cached) {
            setSelectedAccount(cached);
        } else {
            api.getAccount(selectedAccountId).then(acc => {
                if (acc) setSelectedAccount(acc);
            });
        }
    }, [selectedAccountId, allAccounts]);

    // Active investigation object
    const activeInvestigation = useMemo(() => {
        if (selectedInvestigationId === 'ALL') return null;
        return investigations.find(i => i.id === selectedInvestigationId) || null;
    }, [selectedInvestigationId, investigations]);

    // Strict Filter nodes and edges based on selected investigation, risk, and pattern
    const filteredElements = useMemo(() => {
        if (loading || networkData.nodes.length === 0) return [];

        let nodes = [...networkData.nodes];
        let edges = [...networkData.edges];

        // 1. Filter by Investigation Case
        if (activeInvestigation) {
            const allowedAccountIds = new Set(activeInvestigation.accounts);
            nodes = nodes.filter(n => allowedAccountIds.has(n.data.id));
            edges = edges.filter(e => allowedAccountIds.has(e.data.source) && allowedAccountIds.has(e.data.target));
        }

        // 2. Filter by Risk level
        if (selectedRisk !== 'ALL') {
            const validNodeIds = new Set(nodes.filter(n => n.data.risk === selectedRisk).map(n => n.data.id));
            nodes = nodes.filter(n => validNodeIds.has(n.data.id));
            edges = edges.filter(e => validNodeIds.has(e.data.source) && validNodeIds.has(e.data.target));
        }

        // 3. Strict Pattern Filtering: Show ONLY nodes and edges matching the selected pattern
        if (selectedPattern !== 'ALL') {
            const pKey = selectedPattern.toLowerCase();
            
            const isRapid = pKey.includes('rapid') || pKey.includes('pass') || pKey.includes('mule');
            const isSmurf = pKey.includes('smurf') || pKey.includes('structur');
            const isCircular = pKey.includes('circular') || pKey.includes('wash') || pKey.includes('loop');

            const patternNodeIds = new Set<string>();
            const patternEdgeIds = new Set<string>();

            // Match transactions
            allTransactions.forEach(t => {
                const tPat = (t.detectedPattern || '').toLowerCase();
                const tId = t.transactionId.toLowerCase();
                const match = 
                    (isRapid && (tPat.includes('rapid') || tPat.includes('pass') || tId.includes('mp'))) ||
                    (isSmurf && (tPat.includes('smurf') || tPat.includes('structur') || tId.includes('smf'))) ||
                    (isCircular && (tPat.includes('circular') || tPat.includes('wash') || tId.includes('wash')));
                
                if (match) {
                    patternEdgeIds.add(t.transactionId);
                    patternNodeIds.add(t.sender);
                    patternNodeIds.add(t.receiver);
                }
            });

            // Match accounts
            allAccounts.forEach(a => {
                const aId = a.id.toLowerCase();
                const aPats = (a.detectedPatterns || []).map(p => p.toLowerCase());
                const match = 
                    (isRapid && (aId.includes('mule') || aPats.some(p => p.includes('rapid') || p.includes('pass')))) ||
                    (isSmurf && (aId.includes('smurf') || aId.includes('hub') || aPats.some(p => p.includes('smurf') || p.includes('structur')))) ||
                    (isCircular && (aId.includes('wash') || aPats.some(p => p.includes('circular') || p.includes('wash'))));
                
                if (match) {
                    patternNodeIds.add(a.id);
                }
            });

            nodes = nodes.filter(n => patternNodeIds.has(n.data.id));
            edges = edges.filter(e => 
                patternEdgeIds.has(e.data.id) || 
                (patternNodeIds.has(e.data.source) && patternNodeIds.has(e.data.target))
            );
        }

        return [...nodes, ...edges];
    }, [networkData, activeInvestigation, selectedRisk, selectedPattern, allAccounts, allTransactions, loading]);

    // Search matches for live autocomplete / quick jump
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return allAccounts.filter(a =>
            a.id.toLowerCase().includes(q) ||
            a.detectedPatterns.some(p => p.toLowerCase().includes(q))
        );
    }, [searchQuery, allAccounts]);

    // Accounts currently in the active filtered view
    const visibleAccounts = useMemo(() => {
        const visibleNodeIds = new Set(
            filteredElements
                .filter(el => !el.data.source) // node elements only
                .map(el => el.data.id)
        );
        return allAccounts.filter(a => visibleNodeIds.has(a.id));
    }, [filteredElements, allAccounts]);

    // Transactions associated with selected account
    const selectedAccountTransactions = useMemo(() => {
        if (!selectedAccountId) return [];
        return allTransactions.filter(
            t => t.sender === selectedAccountId || t.receiver === selectedAccountId
        );
    }, [selectedAccountId, allTransactions]);

    // Handle selecting a node from canvas or sidebar
    const handleSelectAccount = (accountId: string) => {
        setSelectedAccountId(accountId);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('account', accountId);
            return next;
        });
    };

    // Close right sidebar
    const handleCloseAccountSidebar = () => {
        setSelectedAccountId(null);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('account');
            return next;
        });
    };

    // Switch investigation case
    const handleSelectInvestigation = (caseId: string) => {
        setSelectedInvestigationId(caseId);
        setSelectedAccountId(null);
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (caseId === 'ALL') {
                next.delete('case');
            } else {
                next.set('case', caseId);
            }
            next.delete('account');
            return next;
        });
    };

    // Copy Account ID with toast
    const handleCopyAccountId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedAccount(true);
        setTimeout(() => setCopiedAccount(false), 2000);
    };

    // Show temporary toast message
    const triggerToast = (msg: string) => {
        setActionToast(msg);
        setTimeout(() => setActionToast(null), 3000);
    };

    // Add account to investigation handler
    const handleAddToInvestigation = () => {
        triggerToast(`Account ${selectedAccountId} added to Case ${selectedInvestigationId !== 'ALL' ? selectedInvestigationId : 'INV-2026-00101'}`);
    };

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background relative select-none">
            {/* Toast Notification */}
            {actionToast && (
                <div className="fixed top-6 right-1/2 translate-x-1/2 z-50 bg-primary/20 text-primary border border-primary/40 px-5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-4 duration-200">
                    <Check className="w-4 h-4 text-primary" />
                    <span>{actionToast}</span>
                </div>
            )}

            {/* ========================================================= */}
            {/* LEFT SIDEBAR: Investigation & Filters Rail                */}
            {/* ========================================================= */}
            <div
                className={`border-r border-white/10 bg-card/60 backdrop-blur-md flex flex-col z-20 transition-all duration-300 ease-in-out shrink-0 ${
                    isLeftSidebarOpen ? 'w-80' : 'w-14'
                }`}
            >
                {/* Header with collapse toggle */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between min-h-[64px]">
                    {isLeftSidebarOpen ? (
                        <div className="flex items-center gap-2 overflow-hidden">
                            <Activity className="w-5 h-5 text-primary shrink-0" />
                            <div>
                                <h2 className="text-sm font-semibold text-text tracking-wide uppercase">Investigation Desk</h2>
                                <p className="text-[11px] text-muted truncate">Network Forensics & Graph</p>
                            </div>
                        </div>
                    ) : (
                        <Activity className="w-5 h-5 text-primary mx-auto" />
                    )}
                    <button
                        onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
                        className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-white/5 transition-colors"
                        title={isLeftSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
                    >
                        {isLeftSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>

                {/* Collapsed icon bar */}
                {!isLeftSidebarOpen && (
                    <div className="flex-1 py-4 flex flex-col items-center gap-4">
                        <button
                            onClick={() => setIsLeftSidebarOpen(true)}
                            className="p-2.5 rounded-lg text-muted hover:text-text hover:bg-white/5 transition-colors"
                            title="Investigation Cases"
                        >
                            <FileText className="w-5 h-5 text-primary" />
                        </button>
                        <button
                            onClick={() => setIsLeftSidebarOpen(true)}
                            className="p-2.5 rounded-lg text-muted hover:text-text hover:bg-white/5 transition-colors"
                            title="Search & Filters"
                        >
                            <Filter className="w-5 h-5 text-muted" />
                        </button>
                    </div>
                )}

                {/* Expanded Sidebar Content */}
                {isLeftSidebarOpen && (
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
                        {/* 1. Investigation Case Selector */}
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 flex items-center justify-between">
                                <span>Active Case</span>
                                <span className="text-[10px] text-primary">{investigations.length} Cases</span>
                            </label>
                            <select
                                value={selectedInvestigationId}
                                onChange={(e) => handleSelectInvestigation(e.target.value)}
                                className="w-full bg-background/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-primary/50 transition-colors"
                            >
                                <option value="ALL">🌐 All Networks (Master Graph)</option>
                                {investigations.map(inv => (
                                    <option key={inv.id} value={inv.id}>
                                        {inv.id} — {inv.pattern} (₹{(inv.amount / 100000).toFixed(1)}L)
                                    </option>
                                ))}
                            </select>

                            {/* Active Case Dossier Card */}
                            {activeInvestigation && (
                                <div className="mt-3 p-3.5 bg-primary/5 border border-primary/20 rounded-xl relative group">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                                            <ShieldAlert className="w-3.5 h-3.5 text-warning" />
                                            {activeInvestigation.id}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-danger/20 text-danger border border-danger/30">
                                            {activeInvestigation.risk} Risk
                                        </span>
                                    </div>
                                    <div className="text-xs text-text font-medium mb-1">{activeInvestigation.pattern}</div>
                                    <div className="text-[11px] text-muted flex justify-between mb-2">
                                        <span>Value: <strong className="text-danger">₹{(activeInvestigation.amount / 100000).toFixed(1)}L</strong></span>
                                        <span>Nodes: <strong className="text-text">{activeInvestigation.accounts.length}</strong></span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/investigations/${activeInvestigation.id}`)}
                                        className="w-full mt-1 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        <ExternalLink className="w-3 h-3" /> View Dossier
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2. Account Search with Live Dropdown */}
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 block">
                                Account Quick Search
                            </label>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search ACC-102..."
                                    className="w-full bg-background/80 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-text focus:outline-none focus:border-primary/50 transition-colors"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {searchResults.length > 0 && (
                                <div className="mt-2 bg-card border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                                    {searchResults.map(acc => (
                                        <button
                                            key={acc.id}
                                            onClick={() => {
                                                handleSelectAccount(acc.id);
                                                setSearchQuery('');
                                            }}
                                            className="w-full px-3 py-2 text-left hover:bg-white/5 flex items-center justify-between text-xs border-b border-white/5 last:border-0 transition-colors"
                                        >
                                            <span className="font-semibold text-text">{acc.id}</span>
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                acc.risk === 'High' ? 'text-danger bg-danger/10' : acc.risk === 'Medium' ? 'text-warning bg-warning/10' : 'text-success bg-success/10'
                                            }`}>
                                                {acc.risk}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 3. Filters Section */}
                        <div className="space-y-4 pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                                    <Filter className="w-3.5 h-3.5 text-primary" /> Filters
                                </span>
                                {(selectedRisk !== 'ALL' || selectedPattern !== 'ALL') && (
                                    <button
                                        onClick={() => {
                                            setSelectedRisk('ALL');
                                            setSelectedPattern('ALL');
                                            setSearchParams(prev => {
                                                const next = new URLSearchParams(prev);
                                                next.delete('pattern');
                                                return next;
                                            });
                                        }}
                                        className="text-[11px] text-primary hover:underline font-mono"
                                    >
                                        Reset Filters
                                    </button>
                                )}
                            </div>

                            {/* Pattern Type Filter */}
                            <div>
                                <label className="text-[11px] text-muted block mb-1.5 font-mono">Fraud Pattern Topology</label>
                                <select
                                    value={selectedPattern}
                                    onChange={(e) => {
                                        const pVal = e.target.value;
                                        setSelectedPattern(pVal);
                                        setSearchParams(prev => {
                                            const next = new URLSearchParams(prev);
                                            if (pVal === 'ALL') next.delete('pattern');
                                            else next.set('pattern', pVal);
                                            return next;
                                        });
                                    }}
                                    className="w-full bg-background/80 border border-white/10 rounded-lg px-2.5 py-2 text-xs text-text focus:outline-none focus:border-primary/50 font-mono"
                                >
                                    <option value="ALL">🌐 All Patterns (Full Master Network)</option>
                                    <option value="Rapid Pass-through">⚡ Rapid Pass (Mule Chains)</option>
                                    <option value="Smurfing Rings">👥 Smurfing Rings (Structuring)</option>
                                    <option value="Circular Wash Routes">🔄 Circular Wash Routes (Loop)</option>
                                </select>
                            </div>

                            {/* Risk Level Filter Buttons */}
                            <div>
                                <label className="text-[11px] text-muted block mb-1.5 font-mono">Risk Level</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {(['ALL', 'High', 'Medium', 'Low'] as const).map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setSelectedRisk(r)}
                                            className={`py-1 rounded text-[11px] font-medium transition-all border ${
                                                selectedRisk === r
                                                    ? 'bg-primary/20 text-primary border-primary/50 font-bold'
                                                    : 'bg-background/50 border-white/5 text-muted hover:text-text hover:border-white/20'
                                            }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 4. Visible Accounts List */}
                        <div className="pt-2 border-t border-white/5">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                                    Network Accounts ({visibleAccounts.length})
                                </span>
                            </div>
                            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                                {visibleAccounts.map(acc => {
                                    const isSelected = selectedAccountId === acc.id;
                                    return (
                                        <div
                                            key={acc.id}
                                            onClick={() => handleSelectAccount(acc.id)}
                                            className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                                                isSelected
                                                    ? 'bg-primary/15 border-primary text-text shadow-lg'
                                                    : 'bg-background/40 border-white/5 hover:bg-white/5 hover:border-white/15'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-text'}`}>
                                                    {acc.id}
                                                </span>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                    acc.risk === 'High' ? 'text-danger bg-danger/10' : acc.risk === 'Medium' ? 'text-warning bg-warning/10' : 'text-success bg-success/10'
                                                }`}>
                                                    {acc.risk}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-muted">
                                                <span className="text-success font-medium">In: ₹{(acc.incoming / 100000).toFixed(1)}L</span>
                                                <span className="text-danger font-medium">Out: ₹{(acc.outgoing / 100000).toFixed(1)}L</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* CENTER CANVAS: Cytoscape Graph & Controls                 */}
            {/* ========================================================= */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-background">
                {/* Floating Canvas Toolbar */}
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-card/80 backdrop-blur-md p-1.5 rounded-xl border border-white/10 shadow-2xl">
                    <button
                        onClick={() => graphRef.current?.zoomIn()}
                        className="p-2 rounded-lg text-muted hover:text-text hover:bg-white/10 transition-colors"
                        title="Zoom In"
                    >
                        <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => graphRef.current?.zoomOut()}
                        className="p-2 rounded-lg text-muted hover:text-text hover:bg-white/10 transition-colors"
                        title="Zoom Out"
                    >
                        <ZoomOut className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => graphRef.current?.fit()}
                        className="p-2 rounded-lg text-muted hover:text-text hover:bg-white/10 transition-colors"
                        title="Fit View"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>

                    <div className="h-4 w-px bg-white/10 mx-1" />

                    {/* Layout switcher dropdown */}
                    <select
                        value={layoutName}
                        onChange={(e) => {
                            const newLayout = e.target.value;
                            setLayoutName(newLayout);
                            graphRef.current?.resetLayout(newLayout);
                        }}
                        className="bg-background/80 text-text text-xs border border-white/10 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary/50 font-mono"
                    >
                        <option value="cose">Layout: CoSE Organic</option>
                        <option value="circle">Layout: Circular Loop</option>
                        <option value="grid">Layout: Matrix Grid</option>
                        <option value="concentric">Layout: Concentric Hubs</option>
                        <option value="breadthfirst">Layout: Hierarchical Tree</option>
                    </select>

                    <button
                        onClick={() => graphRef.current?.resetLayout()}
                        className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 text-xs font-mono"
                        title="Reset Graph Layout"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Re-layout</span>
                    </button>
                </div>

                {/* Graph Summary Badge Pill */}
                <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
                    {selectedPattern !== 'ALL' && (
                        <div className="px-3 py-1.5 rounded-xl bg-primary/15 border border-primary/40 backdrop-blur-md text-xs font-mono text-primary font-bold flex items-center gap-2 shadow-lg">
                            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                            <span>FILTERED PATTERN: {selectedPattern.toUpperCase()}</span>
                        </div>
                    )}
                    <div className="px-3.5 py-1.5 rounded-xl bg-card/80 backdrop-blur-md border border-white/10 text-xs font-mono text-muted shadow-2xl flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success"></span>
                        <span>{filteredElements.filter(e => !e.data.source).length} Accounts</span>
                        <span className="text-white/20">•</span>
                        <span>{filteredElements.filter(e => e.data.source).length} Transfers</span>
                    </div>
                </div>

                {/* Main Graph Component */}
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted space-y-3 font-mono">
                        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                        <div className="text-xs uppercase tracking-wider">Rendering topological graph...</div>
                    </div>
                ) : filteredElements.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted space-y-3 font-mono">
                        <AlertOctagon className="w-10 h-10 text-warning opacity-60" />
                        <div className="text-sm font-semibold text-text">No Matching Entities Found</div>
                        <p className="text-xs text-muted max-w-sm text-center">
                            No account nodes or transfer edges match the selected filter criteria. Try resetting risk level or pattern filters.
                        </p>
                        <button
                            onClick={() => {
                                setSelectedRisk('ALL');
                                setSelectedPattern('ALL');
                                setSearchParams({});
                            }}
                            className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-xs font-bold transition-colors border border-primary/30 mt-2"
                        >
                            Reset All Filters
                        </button>
                    </div>
                ) : (
                    <CytoscapeGraph
                        ref={graphRef}
                        elements={filteredElements}
                        selectedNodeId={selectedAccountId}
                        onNodeClick={handleSelectAccount}
                        onBackgroundClick={handleCloseAccountSidebar}
                        layoutName={layoutName}
                    />
                )}
            </div>

            {/* ========================================================= */}
            {/* RIGHT SIDEBAR: Selected Account Inspector Drawer          */}
            {/* ========================================================= */}
            {selectedAccountId && selectedAccount && (
                <div className="w-96 border-l border-white/10 bg-card/90 backdrop-blur-xl flex flex-col z-20 shadow-2xl animate-in slide-in-from-right duration-200">
                    {/* Drawer Header */}
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${
                                selectedAccount.risk === 'High' ? 'bg-danger' : selectedAccount.risk === 'Medium' ? 'bg-warning' : 'bg-success'
                            }`} />
                            <h3 className="text-sm font-bold text-text font-mono">{selectedAccount.id}</h3>
                        </div>
                        <button
                            onClick={handleCloseAccountSidebar}
                            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-white/5 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Drawer Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {/* Account Overview Card */}
                        <div className="p-4 rounded-2xl bg-background/60 border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-mono text-muted uppercase">Risk Profile</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                    selectedAccount.risk === 'High' 
                                        ? 'bg-danger/20 text-danger border-danger/40' 
                                        : selectedAccount.risk === 'Medium'
                                        ? 'bg-warning/20 text-warning border-warning/40'
                                        : 'bg-success/20 text-success border-success/40'
                                }`}>
                                    {selectedAccount.risk} Risk Tier
                                </span>
                            </div>

                            <div>
                                <div className="text-xs text-muted font-mono">Account Holder</div>
                                <div className="text-sm font-bold text-text mt-0.5">{selectedAccount.accountHolder || 'Registered Entity'}</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-xs font-mono">
                                <div>
                                    <span className="text-muted block text-[10px]">Bank Institution</span>
                                    <span className="text-text font-semibold">{selectedAccount.bankName || 'Partner Bank'}</span>
                                </div>
                                <div>
                                    <span className="text-muted block text-[10px]">Account Number</span>
                                    <span className="text-text font-semibold">{selectedAccount.accountNumber || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Flow Volumes */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3.5 rounded-xl bg-success/5 border border-success/20">
                                <div className="flex items-center gap-1.5 text-success text-xs font-mono mb-1">
                                    <ArrowDownLeft className="w-3.5 h-3.5" />
                                    <span>Total Inflow</span>
                                </div>
                                <div className="text-base font-bold font-mono text-text">
                                    ₹{(selectedAccount.incoming / 100000).toFixed(2)}L
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-danger/5 border border-danger/20">
                                <div className="flex items-center gap-1.5 text-danger text-xs font-mono mb-1">
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    <span>Total Outflow</span>
                                </div>
                                <div className="text-base font-bold font-mono text-text">
                                    ₹{(selectedAccount.outgoing / 100000).toFixed(2)}L
                                </div>
                            </div>
                        </div>

                        {/* Detected Signatures */}
                        <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 font-mono">
                                Detected Topology Signatures
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedAccount.detectedPatterns?.map(pat => (
                                    <span key={pat} className="px-2.5 py-1 rounded-lg text-xs font-mono bg-warning/10 text-warning border border-warning/30 flex items-center gap-1">
                                        <ShieldAlert className="w-3 h-3" />
                                        {pat}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Related Transactions */}
                        <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 font-mono">
                                Related Transfers ({selectedAccountTransactions.length})
                            </h4>
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                {selectedAccountTransactions.map(t => {
                                    const isOut = t.sender === selectedAccount.id;
                                    const ts = formatTimestampWithSeconds(t.timestamp);
                                    return (
                                        <div key={t.transactionId} className="p-3 rounded-xl bg-background/50 border border-white/[0.06] hover:border-primary/20 transition-all text-xs">
                                            {/* Top row: direction + amount */}
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="font-mono text-text font-bold flex items-center gap-1.5">
                                                    {isOut ? <ArrowUpRight className="w-3.5 h-3.5 text-danger" /> : <ArrowDownLeft className="w-3.5 h-3.5 text-success" />}
                                                    <span className={isOut ? 'text-danger' : 'text-success'}>{isOut ? `To ${t.receiver}` : `From ${t.sender}`}</span>
                                                </div>
                                                <div className="font-bold font-mono text-text">₹{(t.amount / 100000).toFixed(2)}L</div>
                                            </div>

                                            {/* Middle: TXN ID + Status */}
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] text-muted font-mono">{t.transactionId}</span>
                                                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                                                    t.status === 'Flagged'
                                                        ? 'bg-danger/10 text-danger border-danger/30'
                                                        : t.status === 'Completed'
                                                        ? 'bg-success/10 text-success border-success/30'
                                                        : 'bg-muted/10 text-muted border-muted/30'
                                                }`}>{t.status}</span>
                                            </div>

                                            {/* Bottom: Date + Time with seconds */}
                                            <div className="pt-1.5 border-t border-white/[0.05] flex items-center gap-2 text-[10px] font-mono text-muted">
                                                <span className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">{ts.dateStr}</span>
                                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold tabular-nums">{ts.timeStr}</span>
                                                {t.processingTime !== undefined && (
                                                    <span className="text-muted">• {t.processingTime}s transit</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Drawer Footer Actions */}
                    <div className="p-4 border-t border-white/10 bg-card flex gap-2">
                        <button
                            onClick={() => handleCopyAccountId(selectedAccount.id)}
                            className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-text text-xs font-mono border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                        >
                            {copiedAccount ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedAccount ? 'Copied ID' : 'Copy ID'}</span>
                        </button>
                        <button
                            onClick={handleAddToInvestigation}
                            className="flex-1 py-2 rounded-xl bg-primary text-[#080C14] hover:bg-primary-hover text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                            <FolderPlus className="w-3.5 h-3.5" />
                            <span>Add to Case</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
