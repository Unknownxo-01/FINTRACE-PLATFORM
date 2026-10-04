import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Download, 
    FileText, 
    Calendar, 
    Search, 
    FileBadge, 
    Shield, 
    Plus, 
    ArrowRight, 
    CheckCircle2, 
    Loader2, 
    X,
    FileSpreadsheet
} from 'lucide-react';
import { Investigation, Account, Transaction } from '../types';
import { api } from '../services/api';
import { cn } from '../utils/cn';
import { generatePdfReport, generateMasterSarReport } from '../utils/generatePdfReport';

const riskColor = (risk: string) =>
    risk === 'High' ? 'bg-danger/15 text-danger border-danger/30'
    : risk === 'Medium' ? 'bg-warning/15 text-warning border-warning/30'
    : 'bg-success/15 text-success border-success/30';

export default function Reports() {
    const navigate = useNavigate();
    const [investigations, setInvestigations] = useState<Investigation[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [isGeneratingMaster, setIsGeneratingMaster] = useState(false);
    const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
    const [isSarModalOpen, setIsSarModalOpen] = useState(false);
    const [submittedCount, setSubmittedCount] = useState<number>(0);

    const loadData = () => {
        Promise.all([
            api.getInvestigations(),
            api.getAccounts(),
            api.getTransactions()
        ]).then(([invs, accs, txns]) => {
            setInvestigations(invs);
            setAccounts(accs);
            setTransactions(txns);
        });
    };

    useEffect(() => {
        loadData();
        const unsubscribe = api.subscribe(loadData);
        return unsubscribe;
    }, []);

    const showToast = (text: string, type: 'success' | 'info' = 'success') => {
        setToastMessage({ text, type });
        setTimeout(() => setToastMessage(null), 4000);
    };

    const handleGeneratePdf = async (inv: Investigation) => {
        setGeneratingId(inv.id);
        try {
            // Fresh data query
            const [accs, txns] = await Promise.all([
                api.getAccounts(),
                api.getTransactions()
            ]);

            const involvedAccounts = accs.filter(a => inv.accounts.includes(a.id));
            const existingIds = new Set(involvedAccounts.map(a => a.id));
            inv.accounts.forEach(accId => {
                if (!existingIds.has(accId)) {
                    involvedAccounts.push({
                        id: accId,
                        bankName: 'Associated Institution',
                        risk: inv.risk,
                        transactions: 1,
                        incoming: 0,
                        outgoing: 0,
                        connectedAccounts: 1,
                        detectedPatterns: [inv.pattern],
                        lastActivity: inv.date,
                        status: 'Under Investigation'
                    });
                }
            });

            const involvedTransactions = txns.filter(t => 
                inv.accounts.includes(t.sender) || 
                inv.accounts.includes(t.receiver) ||
                t.investigationId === inv.id ||
                (t.detectedPattern && t.detectedPattern.toLowerCase().includes(inv.pattern.toLowerCase()))
            );

            generatePdfReport(inv, involvedAccounts, involvedTransactions);
            showToast(`Official SAR Forensic Dossier PDF generated for ${inv.id}!`);
        } catch (err) {
            console.error('Error generating PDF dossier:', err);
            showToast(`Failed to generate PDF for ${inv.id}`, 'info');
        } finally {
            setGeneratingId(null);
        }
    };

    const handleGenerateMasterSar = () => {
        setIsGeneratingMaster(true);
        setTimeout(() => {
            try {
                generateMasterSarReport(investigations, accounts, transactions);
                showToast('Consolidated Master Regulatory SAR Report generated!');
                setIsSarModalOpen(false);
            } catch (err) {
                console.error('Error generating master SAR:', err);
            } finally {
                setIsGeneratingMaster(false);
            }
        }, 150);
    };

    const handleSubmitAllForReview = () => {
        setSubmittedCount(investigations.length);
        showToast(`All ${investigations.length} dossiers queued and submitted for RBI regulatory review.`);
    };

    const filtered = investigations.filter(i => 
        !searchQuery || 
        i.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
        i.pattern.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6">
            {/* Toast Feedback */}
            {toastMessage && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-primary/40 shadow-2xl shadow-primary/20 text-xs font-mono text-text animate-in fade-in slide-in-from-top-4 duration-200">
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <span>{toastMessage.text}</span>
                    <button onClick={() => setToastMessage(null)} className="ml-2 text-muted hover:text-text">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

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
                <div className="flex items-center gap-3 self-start md:self-auto">
                    <button 
                        onClick={() => setIsSarModalOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#050D1A] text-xs font-semibold transition-all flex items-center gap-2 shadow-panel-glow active:scale-[0.98]"
                    >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Generate SAR Dossier</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Reports', value: investigations.length, color: 'text-text', border: 'border-white/[0.08]' },
                    { label: 'High Risk', value: investigations.filter(i => i.risk === 'High').length, color: 'text-danger', border: 'border-danger/30' },
                    { label: 'Submitted to RBI', value: submittedCount, color: 'text-success', border: 'border-success/30' },
                    { label: 'Pending Review', value: Math.max(0, investigations.length - submittedCount), color: 'text-warning', border: 'border-warning/30' },
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
                                            <span className={cn(
                                                "text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border",
                                                submittedCount > 0 
                                                    ? "bg-success/10 text-success border-success/25" 
                                                    : "bg-warning/10 text-warning border-warning/25"
                                            )}>
                                                {submittedCount > 0 ? "Submitted to RBI" : "Official Draft"}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => navigate(`/investigations/${inv.id}`)}
                                                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-primary text-xs font-mono hover:underline flex items-center gap-1 transition-all"
                                                    title="View Dossier Details"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    <span>View</span>
                                                </button>
                                                <button
                                                    disabled={generatingId === inv.id}
                                                    onClick={() => handleGeneratePdf(inv)}
                                                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary hover:text-primary-hover text-[11px] font-mono font-medium transition-all shadow-sm active:scale-[0.98] disabled:opacity-50"
                                                    title="Generate & Save Printable PDF Dossier"
                                                >
                                                    {generatingId === inv.id ? (
                                                        <>
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                            <span>Building...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Download className="w-3.5 h-3.5" />
                                                            <span>Generate PDF</span>
                                                        </>
                                                    )}
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
                        {investigations.length} dossier(s) on record — <span className="text-warning">{submittedCount === 0 ? "awaiting RBI clearance" : "filed with authorities"}</span>
                    </div>
                    <button 
                        onClick={handleSubmitAllForReview}
                        className="flex items-center gap-1.5 text-primary hover:underline hover:text-primary-hover font-medium transition-colors"
                    >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Submit All for Review</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Modal: Generate SAR Dossier */}
            {isSarModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="fixed inset-0 -z-10" onClick={() => setIsSarModalOpen(false)} />
                    <div className="relative w-full max-w-xl bg-card border border-white/[0.12] rounded-2xl shadow-2xl p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-primary/10 border border-primary/25 text-primary">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-text">Generate Regulatory SAR Filing</h3>
                                    <p className="text-xs text-muted">Export certified print-ready forensic dossiers for authorities</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsSarModalOpen(false)}
                                className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-white/[0.08]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Master Option */}
                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/40 transition-colors space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                                    PRIMARY REGULATORY SUBMISSION
                                </span>
                                <span className="text-[10px] font-mono text-muted">
                                    {investigations.length} Cases Included
                                </span>
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-text">Consolidated Master SAR Dossier</h4>
                                <p className="text-xs text-muted mt-0.5">
                                    Aggregates all active syndicates (Rapid Mule Pass, Smurfing Ring, Circular Wash) into an authenticated FIU-IND regulatory report.
                                </p>
                            </div>
                            <button
                                disabled={isGeneratingMaster}
                                onClick={handleGenerateMasterSar}
                                className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-[#050D1A] font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-panel-glow disabled:opacity-50"
                            >
                                {isGeneratingMaster ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Compiling Master SAR Dossier...</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        <span>Generate Consolidated SAR Dossier PDF</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Individual Cases List */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-mono text-muted uppercase tracking-wider block">
                                Or Select Individual Case Dossier:
                            </span>
                            <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                                {investigations.map((inv) => (
                                    <div 
                                        key={inv.id}
                                        className="p-3 rounded-xl bg-card-subtle border border-white/[0.06] flex items-center justify-between gap-3 hover:bg-white/[0.04] transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-bold text-text">{inv.id}</span>
                                                <span className={cn(
                                                    "text-[9px] font-mono px-1.5 py-0.2 rounded border uppercase font-medium",
                                                    inv.risk === 'High' ? "bg-danger/15 text-danger border-danger/30" : "bg-warning/15 text-warning border-warning/30"
                                                )}>
                                                    {inv.risk}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-muted truncate mt-0.5">
                                                {inv.pattern} • ₹{(inv.amount / 100000).toFixed(2)}L
                                            </p>
                                        </div>
                                        <button
                                            disabled={generatingId === inv.id}
                                            onClick={() => {
                                                handleGeneratePdf(inv);
                                                setIsSarModalOpen(false);
                                            }}
                                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono text-text flex items-center gap-1.5 shrink-0 transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5 text-primary" />
                                            <span>Generate</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
