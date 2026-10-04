import { 
    UploadCloud, 
    Search, 
    ArrowRight, 
    Download, 
    Copy, 
    Calendar, 
    Clock, 
    Building2,
    FileSpreadsheet,
    ShieldAlert,
    Timer,
    Users,
    ChevronDown,
    ChevronUp,
    Check,
    RotateCcw,
    AlertCircle,
    FileDown,
    Sparkles
} from 'lucide-react';
import { useEffect, useState, useRef, useMemo, Fragment } from 'react';
import { Transaction, Account, Investigation } from '../types';
import { api } from '../services/api';
import { cn } from '../utils/cn';
import { 
    exportTransactionsToCsv, 
    formatProcessingTime, 
    buildConnectedUserBankDetails, 
    resolveDetectedPattern,
    resolveAccountDetails 
} from '../utils/csvExport';
import { parseTransactionsCsv, deriveAccountsFromTransactions } from '../utils/csvParser';

export default function Transactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Flagged'>('All');
    const [patternFilter, setPatternFilter] = useState<string>('All');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [exportNotice, setExportNotice] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadedFileInfo, setUploadedFileInfo] = useState<{
        name: string;
        count: number;
        flagged: number;
        total: number;
    } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [expandedTxnId, setExpandedTxnId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleBrowseClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
        }
    };

    const copyTxnId = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const loadData = () => {
        Promise.all([
            api.getTransactions(),
            api.getAccounts(),
            api.getInvestigations()
        ]).then(([txns, accs, invs]) => {
            setTransactions(txns);
            setAccounts(accs);
            setInvestigations(invs);
            setLoading(false);
        });
    };

    useEffect(() => {
        loadData();
        const unsubscribe = api.subscribe(() => {
            loadData();
        });
        return unsubscribe;
    }, []);

    const accountsMap = useMemo(() => {
        return new Map<string, Account>(accounts.map(a => [a.id, a]));
    }, [accounts]);

    // Unique detected patterns list for filter dropdown
    const availablePatterns = useMemo(() => {
        const set = new Set<string>();
        transactions.forEach(t => {
            const p = resolveDetectedPattern(t, accountsMap, investigations);
            if (p) set.add(p);
        });
        return ['All', ...Array.from(set)];
    }, [transactions, accountsMap, investigations]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
            const detectedPattern = resolveDetectedPattern(t, accountsMap, investigations);
            const matchesPattern = patternFilter === 'All' || detectedPattern === patternFilter;

            const q = searchQuery.toLowerCase();
            const senderAcc = accountsMap.get(t.sender);
            const receiverAcc = accountsMap.get(t.receiver);

            const matchesQuery = !searchQuery || 
                t.transactionId.toLowerCase().includes(q) ||
                t.sender.toLowerCase().includes(q) ||
                t.receiver.toLowerCase().includes(q) ||
                t.institution.toLowerCase().includes(q) ||
                (t.receiverInstitution && t.receiverInstitution.toLowerCase().includes(q)) ||
                (senderAcc?.bankName && senderAcc.bankName.toLowerCase().includes(q)) ||
                (receiverAcc?.bankName && receiverAcc.bankName.toLowerCase().includes(q)) ||
                (senderAcc?.accountHolder && senderAcc.accountHolder.toLowerCase().includes(q)) ||
                (receiverAcc?.accountHolder && receiverAcc.accountHolder.toLowerCase().includes(q)) ||
                detectedPattern.toLowerCase().includes(q) ||
                t.amount.toString().includes(q);

            return matchesStatus && matchesPattern && matchesQuery;
        });
    }, [transactions, statusFilter, patternFilter, searchQuery, accountsMap, investigations]);

    const flaggedCount = transactions.filter(t => t.status === 'Flagged').length;
    const completedCount = transactions.filter(t => t.status === 'Completed').length;

    // Handle File Process
    const processFile = (file: File) => {
        if (!file) return;
        setUploadError(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                if (!text || text.trim().length === 0) {
                    throw new Error('The selected CSV file is empty.');
                }

                const parsed = parseTransactionsCsv(text);
                if (parsed.length === 0) {
                    throw new Error('No valid transaction rows found in the CSV file.');
                }

                const derivedAccounts = deriveAccountsFromTransactions(parsed);
                api.setTransactions(parsed, derivedAccounts);

                setTransactions(parsed);
                setAccounts(derivedAccounts);
                setUploadedFileInfo({
                    name: file.name,
                    count: parsed.length,
                    flagged: parsed.filter(t => t.status === 'Flagged').length,
                    total: parsed.reduce((sum, t) => sum + t.amount, 0),
                });
                setExportNotice(`Loaded ${parsed.length} transactions from ${file.name}`);
                setTimeout(() => setExportNotice(null), 5000);
            } catch (err: any) {
                console.error('CSV Parsing Error:', err);
                setUploadError(err.message || 'Failed to parse the uploaded CSV file. Please check column format.');
            }
        };
        reader.onerror = () => {
            setUploadError('Failed to read the file from disk.');
        };
        reader.readAsText(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleResetExample = () => {
        api.resetToSample();
        loadData();
        setUploadedFileInfo(null);
        setUploadError(null);
        setExportNotice('Reset to 1 example transaction record.');
        setTimeout(() => setExportNotice(null), 4000);
    };

    const handleDownloadTemplate = (e: React.MouseEvent) => {
        e.stopPropagation();
        const sampleHeaders = "Transaction ID,Sender Account,Receiver Account,Amount (INR),Timestamp,Sender Bank,Receiver Bank,Sender A/C Number,Receiver A/C Number,Sender Name,Receiver Name,Status,Latency Seconds,Detected Pattern\n";
        const sampleRows = [
            "TXN-20001,ACC-101,ACC-202,350000,2026-09-22T11:00:00,State Bank of India,HDFC Bank,SBIN-1122334455,HDFC-9988776655,Vikram Malhotra,Alpha Logistics,Flagged,120,Circular Flow",
            "TXN-20002,ACC-202,ACC-303,340000,2026-09-22T11:04:00,HDFC Bank,ICICI Bank,HDFC-9988776655,ICIC-4455667788,Alpha Logistics,Zenith Trading,Flagged,240,Rapid Pass-through",
            "TXN-20003,ACC-303,ACC-101,335000,2026-09-22T11:09:00,ICICI Bank,State Bank of India,ICIC-4455667788,SBIN-1122334455,Zenith Trading,Vikram Malhotra,Flagged,300,Circular Flow",
            "TXN-20004,ACC-404,ACC-505,75000,2026-09-22T12:30:00,Axis Bank,Kotak Mahindra Bank,UTIB-7788990011,KKBK-2233445566,Rohan Sharma,Pooja Enterprises,Completed,25,Clean Flow (No Anomaly)"
        ].join('\n');

        const blob = new Blob([sampleHeaders + sampleRows], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'fintrace_sample_transactions_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleExportCsv = () => {
        const result = exportTransactionsToCsv(filteredTransactions, {
            accounts,
            investigations,
            filename: `fintrace_forensic_transactions_${new Date().toISOString().slice(0, 10)}.csv`
        });

        setExportNotice(`Exported ${result.totalExported} transactions to ${result.filename}`);
        setTimeout(() => setExportNotice(null), 5000);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-mono uppercase tracking-widest text-primary">AUDIT TRAIL LEDGER</span>
                        {uploadedFileInfo ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-success/15 text-success border border-success/30 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" /> Live Ingested Dataset ({uploadedFileInfo.count} txns)
                            </span>
                        ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                1 Example Record
                            </span>
                        )}
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-text">
                        Transaction Forensic Records
                    </h2>
                    <p className="text-muted text-xs mt-0.5">
                        {uploadedFileInfo 
                            ? `Showing current output of ${uploadedFileInfo.count} transactions imported from ${uploadedFileInfo.name}.`
                            : "Showing 1 sample transaction detail for example. Upload your transaction CSV file below to view the current dataset output."
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {uploadedFileInfo && (
                        <button
                            onClick={handleResetExample}
                            className="px-3.5 py-2 rounded-xl bg-background/80 hover:bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-muted hover:text-text transition-all flex items-center gap-1.5"
                            title="Reset back to single example transaction"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Example</span>
                        </button>
                    )}
                    <button 
                        onClick={handleExportCsv}
                        className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#050D1A] text-xs font-semibold transition-all flex items-center gap-2 shadow-panel-glow"
                        title="Export current transactions dataset to CSV"
                    >
                        <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Export CSV</span>
                    </button>
                    <button 
                        onClick={handleBrowseClick}
                        className="px-3.5 py-2 rounded-xl bg-background/80 hover:bg-card-hover border border-white/[0.08] text-xs font-mono text-muted hover:text-text transition-all flex items-center gap-2"
                    >
                        <UploadCloud className="w-3.5 h-3.5 text-primary" />
                        <span>Ingest Batch Feed</span>
                    </button>
                </div>
            </div>

            {/* Notification / Alert Toasts */}
            {exportNotice && (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-3.5 text-xs text-primary flex items-center justify-between gap-3 animate-fade-in shadow-panel-glow">
                    <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 shrink-0 stroke-[2.5]" />
                        <span className="font-mono">{exportNotice}</span>
                    </div>
                    <button 
                        onClick={() => setExportNotice(null)}
                        className="text-primary/70 hover:text-primary font-mono text-[11px]"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {uploadError && (
                <div className="bg-danger/10 border border-danger/30 rounded-xl p-3.5 text-xs text-danger flex items-center justify-between gap-3 animate-fade-in">
                    <div className="flex items-center gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{uploadError}</span>
                    </div>
                    <button 
                        onClick={() => setUploadError(null)}
                        className="text-danger/70 hover:text-danger font-mono text-[11px]"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Ingestion Dropzone */}
            <div
                className={cn(
                    "glass-panel border border-dashed rounded-2xl p-6 md:p-7 flex flex-col md:flex-row items-center justify-between text-left cursor-pointer transition-all group",
                    isDragging
                        ? "border-primary bg-primary/[0.08] scale-[1.01]"
                        : "border-primary/30 hover:border-primary/60 hover:bg-primary/[0.02]"
                )}
                onClick={handleBrowseClick}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".csv,text/csv,text/plain"
                    onChange={handleFileChange}
                />
                <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/10 border border-primary/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-panel-glow">
                        <FileSpreadsheet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-text">Ingest Financial Ledger Feed</h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                CSV DATASET
                            </span>
                            {uploadedFileInfo && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-success/15 text-success border border-success/30">
                                    Active: {uploadedFileInfo.name}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted mt-0.5 font-sans">
                            Drag & drop your transactions CSV file here, or click to browse. The table below will immediately display your current uploaded dataset output.
                        </p>
                    </div>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                        className="px-3 py-2 rounded-xl bg-background/80 hover:bg-card-hover border border-white/[0.08] text-xs font-mono text-muted hover:text-text transition-colors flex items-center gap-1.5"
                        onClick={handleDownloadTemplate}
                        title="Download sample CSV template for formatting"
                    >
                        <FileDown className="w-3.5 h-3.5 text-secondary" />
                        <span>Sample CSV</span>
                    </button>
                    <button
                        className="px-4 py-2 rounded-xl bg-card border border-white/[0.1] hover:border-primary/50 text-xs font-mono text-text transition-colors flex items-center gap-2 shadow-sm"
                        onClick={handleBrowseClick}
                    >
                        <UploadCloud className="w-3.5 h-3.5 text-primary" />
                        <span>Select CSV File</span>
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="glass-panel rounded-2xl p-6 space-y-5">
                {/* Search & Status Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-background/80 rounded-xl border border-white/[0.06] w-fit">
                        <button
                            onClick={() => setStatusFilter('All')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-mono transition-all",
                                statusFilter === 'All' 
                                    ? "bg-primary text-[#050D1A] font-bold shadow-sm" 
                                    : "text-muted hover:text-text"
                            )}
                        >
                            All ({transactions.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('Flagged')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all",
                                statusFilter === 'Flagged' 
                                    ? "bg-warning text-[#050D1A] font-bold shadow-sm" 
                                    : "text-warning hover:bg-warning/10"
                            )}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                            Flagged ({flaggedCount})
                        </button>
                        <button
                            onClick={() => setStatusFilter('Completed')}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-all",
                                statusFilter === 'Completed' 
                                    ? "bg-success text-[#050D1A] font-bold shadow-sm" 
                                    : "text-success hover:bg-success/10"
                            )}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                            Cleared ({completedCount})
                        </button>
                    </div>

                    {/* Pattern filter & Search Input */}
                    <div className="flex items-center gap-3">
                        <select
                            value={patternFilter}
                            onChange={(e) => setPatternFilter(e.target.value)}
                            aria-label="Filter by Detected Pattern"
                            className="bg-background/80 border border-white/[0.08] hover:border-white/[0.14] focus:border-primary/50 rounded-xl px-3 py-2 text-xs text-text focus:outline-none transition-colors font-mono cursor-pointer"
                        >
                            {availablePatterns.map(p => (
                                <option key={p} value={p} className="bg-[#0A1220] text-text">
                                    {p === 'All' ? 'All Patterns' : p}
                                </option>
                            ))}
                        </select>

                        <div className="relative w-full md:w-72">
                            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter TXN, bank, pattern..."
                                className="w-full bg-background/80 border border-white/[0.08] hover:border-white/[0.14] focus:border-primary/50 rounded-xl pl-9 pr-4 py-2 text-xs text-text placeholder:text-muted/60 focus:outline-none transition-colors font-sans"
                            />
                        </div>
                    </div>
                </div>

                {/* Ledger Data Table */}
                <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-card-subtle/40">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[10px] font-mono text-muted uppercase tracking-wider">
                                <th className="py-3 px-4 font-semibold">Transaction ID</th>
                                <th className="py-3 px-4 font-semibold">Sender Entity & Bank</th>
                                <th className="py-3 px-4 font-semibold">Receiver Entity & Bank</th>
                                <th className="py-3 px-4 font-semibold">Amount (INR)</th>
                                <th className="py-3 px-4 font-semibold">Detected Pattern</th>
                                <th className="py-3 px-4 font-semibold">Transfer Latency</th>
                                <th className="py-3 px-4 font-semibold">Connected Banks</th>
                                <th className="py-3 px-4 font-semibold text-right">AML Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-muted font-mono text-xs">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                            <span>Loading transaction records...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-muted font-mono text-xs">
                                        <p>No transactions match the specified filter criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((txn) => {
                                    const senderDetails = resolveAccountDetails(txn.sender, accountsMap);
                                    const receiverDetails = resolveAccountDetails(txn.receiver, accountsMap);
                                    const detectedPattern = resolveDetectedPattern(txn, accountsMap, investigations);
                                    const timing = formatProcessingTime(txn.processingTime);
                                    const connectedInfo = buildConnectedUserBankDetails(txn, accountsMap, investigations);
                                    const isExpanded = expandedTxnId === txn.transactionId;

                                    const senderTxnCount = txn.senderTxnCount !== undefined 
                                        ? txn.senderTxnCount 
                                        : senderDetails.txnCount;

                                    const receiverTxnCount = txn.receiverTxnCount !== undefined 
                                        ? txn.receiverTxnCount 
                                        : receiverDetails.txnCount;

                                    return (
                                        <Fragment key={txn.transactionId}>
                                        <tr
                                            onClick={() => setExpandedTxnId(isExpanded ? null : txn.transactionId)}
                                            className={cn(
                                                "hover:bg-white/[0.02] transition-colors group cursor-pointer",
                                                isExpanded && "bg-white/[0.03]"
                                            )}
                                        >
                                            {/* Transaction ID */}
                                            <td className="py-3.5 px-4 text-xs font-mono font-medium text-text align-top">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-primary font-bold">{txn.transactionId}</span>
                                                    <button
                                                        onClick={(e) => copyTxnId(txn.transactionId, e)}
                                                        className="text-muted/60 hover:text-text transition-colors"
                                                        title="Copy Transaction ID"
                                                    >
                                                        {copiedId === txn.transactionId ? (
                                                            <Check className="w-3 h-3 text-success" />
                                                        ) : (
                                                            <Copy className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </div>
                                                <div className="text-[10px] text-muted mt-1 flex items-center gap-1 font-sans">
                                                    <Clock className="w-3 h-3 text-muted/60" />
                                                    <span>{txn.timestamp.replace('T', ' ')}</span>
                                                </div>
                                            </td>

                                            {/* Sender Entity & Bank */}
                                            <td className="py-3.5 px-4 text-xs font-mono align-top">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-semibold">
                                                        {txn.sender}
                                                    </span>
                                                    <span className="text-[10px] text-muted/80 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]" title="Total transactions recorded for sender account">
                                                        {senderTxnCount} txns
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-text/80 mt-1 font-sans flex items-center gap-1">
                                                    <Building2 className="w-3 h-3 text-primary/70 shrink-0" />
                                                    <span className="truncate max-w-[150px]">{txn.institution || senderDetails.bankName}</span>
                                                </div>
                                            </td>

                                            {/* Receiver Entity & Bank */}
                                            <td className="py-3.5 px-4 text-xs font-mono align-top">
                                                <div className="flex items-center gap-1.5">
                                                    <ArrowRight className="w-3 h-3 text-muted/60" />
                                                    <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary border border-secondary/20 font-semibold">
                                                        {txn.receiver}
                                                    </span>
                                                    <span className="text-[10px] text-muted/80 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.05]" title="Total transactions recorded for receiver account">
                                                        {receiverTxnCount} txns
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-muted mt-1 font-sans flex items-center gap-1 pl-4">
                                                    <Building2 className="w-3 h-3 text-secondary/70 shrink-0" />
                                                    <span className="truncate max-w-[150px]">{txn.receiverInstitution || receiverDetails.bankName}</span>
                                                </div>
                                            </td>

                                            {/* Amount */}
                                            <td className="py-3.5 px-4 text-xs font-mono font-bold text-text tabular-nums align-top">
                                                ₹{txn.amount.toLocaleString()}
                                                <div className="text-[10px] text-muted font-normal">
                                                    {txn.amount >= 100000 
                                                        ? `₹${(txn.amount / 100000).toFixed(2)} Lakh` 
                                                        : `₹${txn.amount.toLocaleString()}`}
                                                </div>
                                            </td>

                                            {/* Detected Pattern */}
                                            <td className="py-3.5 px-4 text-xs align-top">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border",
                                                    detectedPattern.includes('Circular') 
                                                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                                        : detectedPattern.includes('Mule') || detectedPattern.includes('Pass')
                                                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                                        : detectedPattern.includes('Burst') || detectedPattern.includes('Structuring')
                                                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                )}>
                                                    <ShieldAlert className="w-3 h-3 shrink-0" />
                                                    <span className="truncate max-w-[120px]" title={detectedPattern}>{detectedPattern}</span>
                                                </span>
                                            </td>

                                            {/* Transfer Duration (Seconds & Minutes) */}
                                            <td className="py-3.5 px-4 text-xs font-mono tabular-nums align-top">
                                                <div className="flex items-center gap-1.5 text-text">
                                                    <Timer className={cn(
                                                        "w-3.5 h-3.5",
                                                        timing.seconds < 60 ? "text-amber-400" : "text-primary"
                                                    )} />
                                                    <span className="font-semibold">{timing.shortFormatted}</span>
                                                </div>
                                                <div className="text-[10px] text-muted mt-0.5">
                                                    {timing.seconds}s elapsed
                                                </div>
                                            </td>

                                            {/* Connected Bank Accounts */}
                                            <td className="py-3.5 px-4 text-xs align-top">
                                                <div className="flex items-center gap-1 text-[11px] font-mono text-muted">
                                                    <Users className="w-3 h-3 text-primary/70 shrink-0" />
                                                    <span className="font-semibold text-text">{connectedInfo.connectedCount}</span>
                                                    <span>banks linked</span>
                                                    {isExpanded ? (
                                                        <ChevronUp className="w-3.5 h-3.5 ml-1 text-primary" />
                                                    ) : (
                                                        <ChevronDown className="w-3.5 h-3.5 ml-1 text-muted hover:text-text" />
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted/70 truncate max-w-[130px] font-sans mt-0.5">
                                                    {txn.sender} ➔ {txn.receiver}
                                                </div>
                                            </td>

                                            {/* AML Status */}
                                            <td className="py-3.5 px-4 text-xs text-right align-top">
                                                <span className={cn(
                                                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold",
                                                    txn.status === 'Completed' 
                                                        ? 'bg-success/15 text-success border border-success/30' 
                                                        : 'bg-warning/15 text-warning border border-warning/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                                                )}>
                                                    <span className={cn(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        txn.status === 'Completed' ? 'bg-success' : 'bg-warning animate-pulse'
                                                    )} />
                                                    {txn.status === 'Completed' ? 'Cleared' : 'Flagged Anomaly'}
                                                </span>
                                            </td>
                                        </tr>
                                        {/* Expanded Detailed Breakdown for Connected User Bank Accounts */}
                                        {isExpanded && (
                                            <tr key={`${txn.transactionId}-expanded`} className="bg-white/[0.02] border-b border-white/[0.08]">
                                                <td colSpan={8} className="p-4">
                                                    <div className="rounded-xl bg-background/90 border border-white/[0.08] p-4 space-y-3.5 shadow-inner">
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                                                            <div className="flex items-center gap-2 text-xs font-mono">
                                                                <span className="text-primary font-bold">Counterparty Flow Details:</span>
                                                                <span className="text-text">{connectedInfo.flowPath}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs font-mono text-muted">
                                                                <span className="flex items-center gap-1">
                                                                    <Calendar className="w-3.5 h-3.5 text-primary/70" />
                                                                    <span>{txn.timestamp}</span>
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <Clock className="w-3.5 h-3.5 text-warning/70" />
                                                                    <span>Latency: {timing.formatted}</span>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Connected entities summary list */}
                                                        <div>
                                                            <div className="flex items-center justify-between text-xs font-mono text-muted mb-2">
                                                                <span className="flex items-center gap-1.5">
                                                                    <Users className="w-3 h-3 text-primary" />
                                                                    <span>All Connected User Bank Account Details ({connectedInfo.connectedCount} Entities Linked):</span>
                                                                </span>
                                                            </div>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                                                                {connectedInfo.connectedAccountsList.map(accId => {
                                                                    const details = resolveAccountDetails(accId, accountsMap);
                                                                    return (
                                                                        <div key={accId} className="p-3 rounded-lg bg-card/60 border border-white/[0.06] text-xs space-y-1.5 hover:border-primary/30 transition-colors">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="font-mono font-bold text-text">{accId}</span>
                                                                                <span className={cn(
                                                                                    "text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold",
                                                                                    details.risk === 'High' ? 'bg-danger/20 text-danger border border-danger/30' :
                                                                                    details.risk === 'Medium' ? 'bg-warning/20 text-warning border border-warning/30' :
                                                                                    'bg-success/20 text-success border border-success/30'
                                                                                )}>
                                                                                    {details.risk} Risk
                                                                                </span>
                                                                            </div>
                                                                            <div className="text-[11px] text-primary flex items-center gap-1 font-medium">
                                                                                <Building2 className="w-3 h-3 shrink-0" />
                                                                                <span className="truncate">{details.bankName}</span>
                                                                            </div>
                                                                            <div className="text-[10px] font-mono text-muted">
                                                                                A/C: {details.accountNumber}
                                                                            </div>
                                                                            <div className="text-[10px] text-muted/90 truncate font-sans">
                                                                                {details.holder}
                                                                            </div>
                                                                            <div className="text-[10px] font-mono text-muted/70 pt-1.5 border-t border-white/[0.04] flex justify-between">
                                                                                <span>Total Txns: {details.txnCount}</span>
                                                                                <span>Links: {details.connectedCount}</span>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </Fragment>
                                    );
                            })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer Pagination */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 text-xs font-mono text-muted">
                    <div>
                        Showing <span className="text-text font-semibold">{filteredTransactions.length}</span> of <span className="text-text font-semibold">{transactions.length}</span> transaction {transactions.length === 1 ? 'record' : 'records'}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <button className="px-3 py-1 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] disabled:opacity-40 transition-colors">
                                Previous
                            </button>
                            <button className="px-3 py-1 rounded-lg border border-primary/40 bg-primary/10 text-primary font-bold">
                                1
                            </button>
                            <button className="px-3 py-1 rounded-lg border border-white/[0.08] hover:bg-white/[0.04] disabled:opacity-40 transition-colors">
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
