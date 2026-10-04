import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FolderOpen,
    AlertTriangle,
    Plus,
    X,
    Search,
    ShieldAlert,
    AlertOctagon,
    Users,
    ArrowRight,
    CheckCircle2,
    Clock,
    FileText,
    ChevronDown,
    ChevronUp,
    Zap,
    TrendingUp,
    Check,
    Trash2
} from 'lucide-react';
import { Investigation, Account, Alert, Transaction } from '../types';
import { api } from '../services/api';

export default function Investigations() {
    const navigate = useNavigate();
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [loading, setLoading] = useState(true);

    // New Investigation Modal state
    const [showNewModal, setShowNewModal] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);

    // New Investigation Form state
    const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
    const [selectedPattern, setSelectedPattern] = useState<string>('');
    const [selectedRisk, setSelectedRisk] = useState<'Low' | 'Medium' | 'High'>('High');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'accounts' | 'alerts' | 'transactions'>('accounts');
    const [showSuccess, setShowSuccess] = useState(false);
    const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

    // Filter state
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Delete confirmation state: stores the inv.id pending deletion
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Delete handler
    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        api.deleteInvestigation(id);
        setInvestigations(prev => prev.filter(inv => inv.id !== id));
        setConfirmDeleteId(null);
    };

    const loadInvestigations = () => {
        api.getInvestigations().then(data => {
            setInvestigations(data);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadInvestigations();
        const unsubscribe = api.subscribe(() => {
            loadInvestigations();
        });
        return unsubscribe;
    }, []);

    // Load supporting data when modal opens
    useEffect(() => {
        if (showNewModal && !dataLoaded) {
            Promise.all([
                api.getAccounts(),
                api.getAlerts(),
                api.getTransactions(),
            ]).then(([accs, alts, txns]) => {
                setAccounts(accs);
                setAlerts(alts);
                setTransactions(txns);
                setDataLoaded(true);
            });
        }
    }, [showNewModal, dataLoaded]);

    // Filtered and searched accounts
    const filteredAccounts = useMemo(() => {
        let result = accounts;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.id.toLowerCase().includes(q) ||
                a.detectedPatterns.some(p => p.toLowerCase().includes(q)) ||
                a.status.toLowerCase().includes(q)
            );
        }
        return result;
    }, [accounts, searchQuery]);

    // Flagged transactions only
    const flaggedTransactions = useMemo(() => {
        return transactions.filter(t => t.status === 'Flagged');
    }, [transactions]);

    // Suspicious accounts (High or Medium risk, not yet under investigation in existing cases)
    const suspiciousAccounts = useMemo(() => {
        const existingAccountIds = new Set(investigations.flatMap(inv => inv.accounts));
        return accounts.filter(a =>
            (a.risk === 'High' || a.risk === 'Medium') &&
            !existingAccountIds.has(a.id)
        );
    }, [accounts, investigations]);

    // Computed stats for the selected accounts in the form
    const selectionStats = useMemo(() => {
        const selected = accounts.filter(a => selectedAccounts.has(a.id));
        const totalIncoming = selected.reduce((sum, a) => sum + a.incoming, 0);
        const totalOutgoing = selected.reduce((sum, a) => sum + a.outgoing, 0);
        const totalTxns = selected.reduce((sum, a) => sum + a.transactions, 0);
        const patterns = [...new Set(selected.flatMap(a => a.detectedPatterns))];
        const maxRisk = selected.some(a => a.risk === 'High') ? 'High' : selected.some(a => a.risk === 'Medium') ? 'Medium' : 'Low';
        return { totalIncoming, totalOutgoing, totalTxns, patterns, maxRisk, count: selected.length };
    }, [selectedAccounts, accounts]);

    // Toggle account selection
    const toggleAccount = (id: string) => {
        setSelectedAccounts(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Select all accounts from an alert
    const selectAlertAccounts = (alert: Alert) => {
        setSelectedAccounts(prev => {
            const next = new Set(prev);
            alert.accounts.forEach(id => next.add(id));
            return next;
        });
        if (!selectedPattern) {
            setSelectedPattern(alert.pattern);
        }
    };

    // Create investigation handler
    const handleCreateInvestigation = () => {
        if (selectedAccounts.size === 0) return;

        const newId = `INV-2026-${String(investigations.length + 423).padStart(5, '0')}`;
        const totalAmount = accounts
            .filter(a => selectedAccounts.has(a.id))
            .reduce((sum, a) => sum + a.outgoing, 0);

        const newInv: Investigation = {
            id: newId,
            pattern: selectedPattern || 'Suspicious Activity',
            risk: selectedRisk,
            accounts: [...selectedAccounts],
            amount: totalAmount,
            status: 'Open',
            date: new Date().toISOString().split('T')[0],
        };

        // Persist to central API store so InvestigationDetails can find it
        api.addInvestigation(newInv);
        setInvestigations(prev => [newInv, ...prev]);
        setShowSuccess(true);

        setTimeout(() => {
            setShowSuccess(false);
            setShowNewModal(false);
            setSelectedAccounts(new Set());
            setSelectedPattern('');
            setSelectedRisk('High');
            setSearchQuery('');
        }, 2000);
    };

    // Reset modal state
    const handleCloseModal = () => {
        setShowNewModal(false);
        setSelectedAccounts(new Set());
        setSelectedPattern('');
        setSelectedRisk('High');
        setSearchQuery('');
        setActiveTab('accounts');
        setShowSuccess(false);
    };

    // Filtered investigations for the main list
    const filteredInvestigations = useMemo(() => {
        if (filterStatus === 'all') return investigations;
        return investigations.filter(inv => inv.status === filterStatus);
    }, [investigations, filterStatus]);

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-3xl font-light text-text mb-2">Active Investigations</h1>
                    <p className="text-muted text-sm">Manage and review ongoing money laundering cases.</p>
                </div>
                <button
                    onClick={() => setShowNewModal(true)}
                    className="bg-primary hover:bg-primary/90 text-[#07111F] px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Investigation
                </button>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                <div className="glass-panel rounded-xl p-4">
                    <div className="text-xs text-muted mb-1 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary" /> Total Cases</div>
                    <div className="text-2xl font-bold text-text">{investigations.length}</div>
                </div>
                <div className="glass-panel rounded-xl p-4">
                    <div className="text-xs text-muted mb-1 flex items-center gap-1.5"><AlertOctagon className="w-3.5 h-3.5 text-danger" /> High Risk</div>
                    <div className="text-2xl font-bold text-danger">{investigations.filter(i => i.risk === 'High').length}</div>
                </div>
                <div className="glass-panel rounded-xl p-4">
                    <div className="text-xs text-muted mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-warning" /> Open</div>
                    <div className="text-2xl font-bold text-warning">{investigations.filter(i => i.status === 'Open').length}</div>
                </div>
                <div className="glass-panel rounded-xl p-4">
                    <div className="text-xs text-muted mb-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-success" /> Total Value</div>
                    <div className="text-2xl font-bold text-text">₹{(investigations.reduce((s, i) => s + i.amount, 0) / 10000000).toFixed(1)}Cr</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 mb-2">
                {['all', 'Open', 'Under Investigation', 'Closed'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                            filterStatus === status
                                ? 'bg-primary/15 text-primary border-primary/40'
                                : 'bg-transparent text-muted border-white/5 hover:border-white/20 hover:text-text'
                        }`}
                    >
                        {status === 'all' ? 'All Cases' : status}
                    </button>
                ))}
            </div>

            {/* Investigation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="text-muted col-span-3 text-center py-10">Loading investigations...</div>
                ) : filteredInvestigations.length === 0 ? (
                    <div className="text-muted col-span-3 text-center py-10">No investigations match the selected filter.</div>
                ) : (
                    filteredInvestigations.map((inv) => (
                        <div
                            key={inv.id}
                            onClick={() => navigate(`/investigations/${inv.id}`)}
                            className="glass-panel rounded-2xl p-6 cursor-pointer hover:border-primary/30 transition-all group relative hover:shadow-lg hover:shadow-primary/5"
                        >
                            {/* Top-right action icons */}
                            <div
                                className="absolute top-5 right-5 flex items-center gap-1.5"
                                onClick={e => e.stopPropagation()}
                            >
                                {confirmDeleteId === inv.id ? (
                                    // Inline confirmation
                                    <div className="flex items-center gap-1 bg-danger/10 border border-danger/30 rounded-lg px-2 py-1">
                                        <span className="text-[10px] font-mono text-danger mr-1">Delete?</span>
                                        <button
                                            onClick={(e) => handleDelete(e, inv.id)}
                                            className="text-[10px] font-bold text-danger hover:text-white bg-danger/20 hover:bg-danger px-2 py-0.5 rounded transition-all"
                                        >
                                            Yes
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                            className="text-[10px] font-bold text-muted hover:text-text bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded transition-all"
                                        >
                                            No
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Delete button – visible on hover */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(inv.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-danger/0 hover:bg-danger/15 border border-transparent hover:border-danger/30 text-muted hover:text-danger transition-all"
                                            title="Delete investigation"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {/* Open button */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); navigate(`/investigations/${inv.id}`); }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-primary/0 hover:bg-primary/15 border border-transparent hover:border-primary/30 text-muted hover:text-primary transition-all"
                                            title="Open investigation"
                                        >
                                            <FolderOpen className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                            <div className="mb-4">
                                <div className="text-xs text-muted mb-1">{inv.date}</div>
                                <h3 className="text-lg font-medium text-text group-hover:text-primary transition-colors">{inv.id}</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs text-muted mb-1">Detected Pattern</div>
                                    <div className="flex items-center gap-2 text-sm font-medium text-warning">
                                        <AlertTriangle className="w-4 h-4" />
                                        {inv.pattern}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs text-muted mb-1">Involved Accounts</div>
                                        <div className="text-sm text-text">{inv.accounts.length} Nodes</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted mb-1">Potential Value</div>
                                        <div className="text-sm text-danger font-medium">₹{(inv.amount / 100000).toFixed(2)}L</div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                    <div className={`px-2 py-1 rounded text-xs font-medium ${inv.risk === 'High' ? 'bg-danger/20 text-danger' : inv.risk === 'Medium' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                                        {inv.risk} Risk
                                    </div>
                                    <div className="text-xs font-medium text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                        {inv.status}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ============================================================ */}
            {/* NEW INVESTIGATION MODAL                                      */}
            {/* ============================================================ */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0b1726] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

                        {/* Success Overlay */}
                        {showSuccess && (
                            <div className="absolute inset-0 z-50 bg-[#0b1726]/95 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl">
                                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-success" />
                                </div>
                                <h3 className="text-xl font-bold text-text mb-2">Investigation Created</h3>
                                <p className="text-sm text-muted">Case has been opened with {selectedAccounts.size} accounts.</p>
                            </div>
                        )}

                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-text flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-primary" />
                                    </div>
                                    Create New Investigation
                                </h2>
                                <p className="text-xs text-muted mt-1 ml-[42px]">
                                    Select suspicious accounts, review flagged alerts, and open a new AML case.
                                </p>
                            </div>
                            <button
                                onClick={handleCloseModal}
                                className="p-2 rounded-lg text-muted hover:text-text hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex flex-1 overflow-hidden">
                            {/* Left Panel: Data Explorer */}
                            <div className="flex-1 flex flex-col border-r border-white/10 overflow-hidden">
                                {/* Tab Navigation */}
                                <div className="flex border-b border-white/10 shrink-0">
                                    {[
                                        { key: 'accounts' as const, label: 'Suspicious Accounts', icon: Users, count: suspiciousAccounts.length },
                                        { key: 'alerts' as const, label: 'Active Alerts', icon: AlertOctagon, count: alerts.length },
                                        { key: 'transactions' as const, label: 'Flagged Txns', icon: Zap, count: flaggedTransactions.length },
                                    ].map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex-1 px-4 py-3 text-xs font-medium flex items-center justify-center gap-2 transition-all border-b-2 ${
                                                activeTab === tab.key
                                                    ? 'text-primary border-primary bg-primary/5'
                                                    : 'text-muted border-transparent hover:text-text hover:bg-white/[0.02]'
                                            }`}
                                        >
                                            <tab.icon className="w-3.5 h-3.5" />
                                            {tab.label}
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                                activeTab === tab.key ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Search Bar */}
                                {activeTab === 'accounts' && (
                                    <div className="px-4 py-3 border-b border-white/5 shrink-0">
                                        <div className="relative">
                                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search accounts, patterns..."
                                                className="w-full bg-background/60 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs text-text focus:outline-none focus:border-primary/50 transition-colors"
                                            />
                                            {searchQuery && (
                                                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Tab Content */}
                                <div className="flex-1 overflow-y-auto">
                                    {!dataLoaded ? (
                                        <div className="flex items-center justify-center h-full text-muted text-sm">Loading data...</div>
                                    ) : (
                                        <>
                                            {/* ACCOUNTS TAB */}
                                            {activeTab === 'accounts' && (
                                                <div className="p-4 space-y-2">
                                                    {/* Quick-select suspicious */}
                                                    {suspiciousAccounts.length > 0 && !searchQuery && (
                                                        <div className="mb-3 p-3 bg-danger/5 border border-danger/20 rounded-xl">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-xs font-semibold text-danger flex items-center gap-1.5">
                                                                    <ShieldAlert className="w-3.5 h-3.5" />
                                                                    {suspiciousAccounts.length} Uninvestigated Suspicious Accounts
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedAccounts(new Set(suspiciousAccounts.map(a => a.id)));
                                                                    }}
                                                                    className="text-[11px] text-primary hover:underline font-medium"
                                                                >
                                                                    Select All
                                                                </button>
                                                            </div>
                                                            <p className="text-[11px] text-muted">
                                                                These accounts have elevated risk and are not part of any existing investigation.
                                                            </p>
                                                        </div>
                                                    )}

                                                    {filteredAccounts.map(acc => {
                                                        const isSelected = selectedAccounts.has(acc.id);
                                                        return (
                                                            <div
                                                                key={acc.id}
                                                                onClick={() => toggleAccount(acc.id)}
                                                                className={`p-3.5 rounded-xl cursor-pointer transition-all border flex items-start gap-3 ${
                                                                    isSelected
                                                                        ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/5'
                                                                        : 'bg-background/40 border-white/5 hover:bg-white/[0.03] hover:border-white/15'
                                                                }`}
                                                            >
                                                                {/* Checkbox */}
                                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                                                    isSelected ? 'bg-primary border-primary' : 'border-white/20'
                                                                }`}>
                                                                    {isSelected && <Check className="w-3 h-3 text-[#07111F]" />}
                                                                </div>

                                                                {/* Account Details */}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between mb-1.5">
                                                                        <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-text'}`}>{acc.id}</span>
                                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                                                            acc.risk === 'High' ? 'bg-danger/20 text-danger' : acc.risk === 'Medium' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'
                                                                        }`}>
                                                                            {acc.risk} Risk
                                                                        </span>
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-2 text-[11px] text-muted mb-1.5">
                                                                        <span>Txns: <strong className="text-text">{acc.transactions}</strong></span>
                                                                        <span className="text-success">In: ₹{(acc.incoming / 100000).toFixed(1)}L</span>
                                                                        <span className="text-danger">Out: ₹{(acc.outgoing / 100000).toFixed(1)}L</span>
                                                                    </div>
                                                                    {acc.detectedPatterns.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {acc.detectedPatterns.map(p => (
                                                                                <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-warning/10 text-warning border border-warning/20 font-medium">
                                                                                    {p}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-[10px] text-muted mt-1">
                                                                        Status: <span className={acc.status === 'Under Investigation' ? 'text-primary' : 'text-text'}>{acc.status}</span>
                                                                        {' • '}{acc.connectedAccounts} connections
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {filteredAccounts.length === 0 && (
                                                        <div className="text-sm text-muted text-center py-8">No accounts match your search.</div>
                                                    )}
                                                </div>
                                            )}

                                            {/* ALERTS TAB */}
                                            {activeTab === 'alerts' && (
                                                <div className="p-4 space-y-3">
                                                    <p className="text-[11px] text-muted mb-2">
                                                        Click an alert to auto-select its associated accounts for the investigation.
                                                    </p>
                                                    {alerts.map(alert => {
                                                        const isExpanded = expandedAlert === alert.id;
                                                        return (
                                                            <div
                                                                key={alert.id}
                                                                className="bg-background/40 border border-white/5 rounded-xl overflow-hidden hover:border-white/15 transition-all"
                                                            >
                                                                <div
                                                                    className="p-4 cursor-pointer flex items-start justify-between"
                                                                    onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                                                                >
                                                                    <div>
                                                                        <div className="flex items-center gap-2 mb-1.5">
                                                                            <AlertOctagon className={`w-4 h-4 ${alert.risk === 'High' ? 'text-danger' : 'text-warning'}`} />
                                                                            <span className="text-sm font-bold text-text">{alert.id}</span>
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                                                alert.risk === 'High' ? 'bg-danger/20 text-danger' : 'bg-warning/20 text-warning'
                                                                            }`}>
                                                                                {alert.risk}
                                                                            </span>
                                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                                                                alert.status === 'New' ? 'bg-primary/20 text-primary' : 'bg-white/10 text-muted'
                                                                            }`}>
                                                                                {alert.status}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-xs text-warning font-medium">{alert.pattern}</div>
                                                                        <div className="text-[11px] text-muted mt-1">
                                                                            ₹{(alert.amount / 100000).toFixed(1)}L • Velocity: {alert.velocity} • {alert.accounts.length} accounts
                                                                        </div>
                                                                    </div>
                                                                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted shrink-0" />}
                                                                </div>

                                                                {isExpanded && (
                                                                    <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-3">
                                                                        <div>
                                                                            <span className="text-[11px] text-muted block mb-1.5">Involved Accounts:</span>
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                {alert.accounts.map(accId => (
                                                                                    <span
                                                                                        key={accId}
                                                                                        className={`text-xs px-2 py-1 rounded-lg font-medium border ${
                                                                                            selectedAccounts.has(accId)
                                                                                                ? 'bg-primary/15 text-primary border-primary/30'
                                                                                                : 'bg-background text-text border-white/10'
                                                                                        }`}
                                                                                    >
                                                                                        {accId}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-[11px] text-muted">
                                                                            Triggered: {new Date(alert.time).toLocaleString()}
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                selectAlertAccounts(alert);
                                                                            }}
                                                                            className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                                                                        >
                                                                            <Plus className="w-3.5 h-3.5" />
                                                                            Use Alert Accounts for Investigation
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* TRANSACTIONS TAB */}
                                            {activeTab === 'transactions' && (
                                                <div className="p-4 space-y-2">
                                                    <p className="text-[11px] text-muted mb-2">
                                                        Flagged transactions that may warrant investigation. Click to add sender & receiver.
                                                    </p>
                                                    {flaggedTransactions.length === 0 ? (
                                                        <div className="text-sm text-muted text-center py-8">No flagged transactions found.</div>
                                                    ) : (
                                                        flaggedTransactions.map(txn => (
                                                            <div
                                                                key={txn.transactionId}
                                                                onClick={() => {
                                                                    setSelectedAccounts(prev => {
                                                                        const next = new Set(prev);
                                                                        next.add(txn.sender);
                                                                        next.add(txn.receiver);
                                                                        return next;
                                                                    });
                                                                }}
                                                                className="p-3.5 rounded-xl bg-background/40 border border-white/5 hover:border-warning/30 cursor-pointer transition-all"
                                                            >
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <span className="text-xs font-bold text-text">{txn.transactionId}</span>
                                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-danger/20 text-danger font-medium border border-danger/30">
                                                                        ⚑ Flagged
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs mb-1.5">
                                                                    <span className={`font-semibold ${selectedAccounts.has(txn.sender) ? 'text-primary' : 'text-text'}`}>{txn.sender}</span>
                                                                    <ArrowRight className="w-3.5 h-3.5 text-muted" />
                                                                    <span className={`font-semibold ${selectedAccounts.has(txn.receiver) ? 'text-primary' : 'text-text'}`}>{txn.receiver}</span>
                                                                </div>
                                                                <div className="text-[11px] text-muted flex justify-between items-center">
                                                                    <span>₹{(txn.amount / 100000).toFixed(1)}L via {txn.institution}</span>
                                                                    <span className="flex items-center gap-1.5">
                                                                        <span>{new Date(txn.timestamp).toLocaleDateString()}</span>
                                                                        <span className="opacity-40">•</span>
                                                                        <span>{new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Right Panel: Case Configuration */}
                            <div className="w-[320px] shrink-0 flex flex-col bg-white/[0.01] overflow-y-auto">
                                <div className="p-5 space-y-5 flex-1">
                                    {/* Case Configuration Header */}
                                    <div>
                                        <h3 className="text-sm font-bold text-text mb-1">Case Configuration</h3>
                                        <p className="text-[11px] text-muted">Configure and finalize the new investigation dossier.</p>
                                    </div>

                                    {/* Selected Accounts Summary */}
                                    <div className="p-3.5 bg-background/60 border border-white/10 rounded-xl">
                                        <div className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                                            <span>Selected Nodes</span>
                                            {selectedAccounts.size > 0 && (
                                                <button
                                                    onClick={() => setSelectedAccounts(new Set())}
                                                    className="text-[10px] text-primary hover:underline normal-case"
                                                >
                                                    Clear All
                                                </button>
                                            )}
                                        </div>
                                        {selectedAccounts.size === 0 ? (
                                            <div className="text-xs text-muted text-center py-3">
                                                No accounts selected. Use the left panel to add accounts.
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {[...selectedAccounts].map(id => {
                                                    const acc = accounts.find(a => a.id === id);
                                                    return (
                                                        <span
                                                            key={id}
                                                            className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium"
                                                        >
                                                            {id}
                                                            {acc && (
                                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                                    acc.risk === 'High' ? 'bg-danger' : acc.risk === 'Medium' ? 'bg-warning' : 'bg-success'
                                                                }`} />
                                                            )}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleAccount(id);
                                                                }}
                                                                className="ml-0.5 text-primary/60 hover:text-primary"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Selection Stats */}
                                    {selectedAccounts.size > 0 && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2.5 bg-background/40 border border-white/5 rounded-lg">
                                                <div className="text-[10px] text-muted">Accounts</div>
                                                <div className="text-sm font-bold text-text">{selectionStats.count} Nodes</div>
                                            </div>
                                            <div className="p-2.5 bg-background/40 border border-white/5 rounded-lg">
                                                <div className="text-[10px] text-muted">Total Outflow</div>
                                                <div className="text-sm font-bold text-danger">₹{(selectionStats.totalOutgoing / 100000).toFixed(1)}L</div>
                                            </div>
                                            <div className="p-2.5 bg-background/40 border border-white/5 rounded-lg">
                                                <div className="text-[10px] text-muted">Transactions</div>
                                                <div className="text-sm font-bold text-text">{selectionStats.totalTxns}</div>
                                            </div>
                                            <div className="p-2.5 bg-background/40 border border-white/5 rounded-lg">
                                                <div className="text-[10px] text-muted">Max Risk</div>
                                                <div className={`text-sm font-bold ${selectionStats.maxRisk === 'High' ? 'text-danger' : selectionStats.maxRisk === 'Medium' ? 'text-warning' : 'text-success'}`}>
                                                    {selectionStats.maxRisk}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Pattern Selector */}
                                    <div>
                                        <label className="text-xs font-semibold text-muted block mb-1.5">Detected Pattern</label>
                                        <select
                                            value={selectedPattern}
                                            onChange={(e) => setSelectedPattern(e.target.value)}
                                            className="w-full bg-background/60 border border-white/10 rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-primary/50"
                                        >
                                            <option value="">Select Pattern...</option>
                                            <option value="Circular Flow">Circular Flow</option>
                                            <option value="Rapid Mule Chain">Rapid Mule Chain</option>
                                            <option value="Smurfing">Smurfing</option>
                                            <option value="Rapid Pass-through">Rapid Pass-through</option>
                                            <option value="Large Transfer">Large Transfer</option>
                                            <option value="Suspicious Activity">Suspicious Activity</option>
                                        </select>

                                        {/* Auto-detected patterns */}
                                        {selectionStats.patterns.length > 0 && (
                                            <div className="mt-2">
                                                <div className="text-[10px] text-muted mb-1">Auto-detected from selected accounts:</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {selectionStats.patterns.map(p => (
                                                        <button
                                                            key={p}
                                                            onClick={() => setSelectedPattern(p)}
                                                            className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                                                                selectedPattern === p
                                                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                                                    : 'bg-warning/10 text-warning border border-warning/20 hover:bg-warning/20'
                                                            }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Risk Level */}
                                    <div>
                                        <label className="text-xs font-semibold text-muted block mb-1.5">Risk Classification</label>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {(['High', 'Medium', 'Low'] as const).map(risk => (
                                                <button
                                                    key={risk}
                                                    onClick={() => setSelectedRisk(risk)}
                                                    className={`py-2 rounded-lg text-xs font-medium transition-all border ${
                                                        selectedRisk === risk
                                                            ? risk === 'High'
                                                                ? 'bg-danger/20 text-danger border-danger/40'
                                                                : risk === 'Medium'
                                                                ? 'bg-warning/20 text-warning border-warning/40'
                                                                : 'bg-success/20 text-success border-success/40'
                                                            : 'bg-background/40 text-muted border-white/5 hover:border-white/20'
                                                    }`}
                                                >
                                                    {risk}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Create Button */}
                                <div className="p-5 border-t border-white/10 shrink-0 bg-white/[0.02]">
                                    <button
                                        onClick={handleCreateInvestigation}
                                        disabled={selectedAccounts.size === 0 || !selectedPattern}
                                        className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                            selectedAccounts.size > 0 && selectedPattern
                                                ? 'bg-primary hover:bg-primary/90 text-[#07111F] shadow-lg shadow-primary/25'
                                                : 'bg-white/5 text-muted cursor-not-allowed'
                                        }`}
                                    >
                                        <ShieldAlert className="w-4 h-4" />
                                        {selectedAccounts.size === 0
                                            ? 'Select Accounts to Proceed'
                                            : !selectedPattern
                                            ? 'Select a Pattern'
                                            : `Open Case with ${selectedAccounts.size} Nodes`
                                        }
                                    </button>
                                    {selectedAccounts.size > 0 && selectedPattern && (
                                        <p className="text-[10px] text-muted text-center mt-2">
                                            Investigation will be created as "{selectedPattern}" — {selectedRisk} Risk
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
