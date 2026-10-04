import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertOctagon, CheckCircle2, ShieldAlert, Users, Calendar, Activity, FileText, TrendingUp, AlertTriangle, Clock, Loader2 } from 'lucide-react';
import CytoscapeGraph from '../components/CytoscapeGraph';
import { Investigation, Account, Transaction } from '../types';
import { api } from '../services/api';
import { generatePdfReport } from '../utils/generatePdfReport';

export default function InvestigationDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [investigation, setInvestigation] = useState<Investigation | null>(null);
    const [involvedAccounts, setInvolvedAccounts] = useState<Account[]>([]);
    const [involvedTransactions, setInvolvedTransactions] = useState<Transaction[]>([]);
    const [networkData, setNetworkData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (!id) return;
        Promise.all([
            api.getInvestigation(id),
            api.getAccounts(),
            api.getTransactions(),
            api.getNetworkData(),
        ]).then(([inv, allAccounts, allTransactions, net]) => {
            if (inv) {
                setInvestigation(inv);
                setInvolvedAccounts((allAccounts as Account[]).filter(a => inv.accounts.includes(a.id)));
                setInvolvedTransactions(
                    (allTransactions as Transaction[])
                        .filter(t => inv.accounts.includes(t.sender) || inv.accounts.includes(t.receiver))
                        .slice(0, 10)
                );
            }
            setNetworkData(net);
            setLoading(false);
        });
    }, [id]);

    if (loading) return <div className="p-8 text-center text-muted">Loading investigation dossier...</div>;
    if (!investigation) return <div className="p-8 text-center text-danger">Investigation not found.</div>;

    const highRiskAccounts = involvedAccounts.filter(a => a.risk === 'High');
    const totalIncoming = involvedAccounts.reduce((s, a) => s + a.incoming, 0);
    const totalOutgoing = involvedAccounts.reduce((s, a) => s + a.outgoing, 0);

    const handleGenerateReport = () => {
        setGenerating(true);
        // Short timeout so the button state updates before the new window opens
        setTimeout(() => {
            generatePdfReport(investigation!, involvedAccounts, involvedTransactions);
            setGenerating(false);
        }, 150);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 pb-20">
            <button onClick={() => navigate('/investigations')} className="flex items-center gap-2 text-sm text-muted hover:text-text transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Investigations
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-3xl font-light text-text">{investigation.id}</h1>
                        <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full border border-primary/20">
                            {investigation.status}
                        </span>
                    </div>
                    <p className="text-muted text-sm flex items-center gap-4">
                        <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {investigation.date}</span>
                        <span className="flex items-center gap-1 text-warning"><ShieldAlert className="w-4 h-4" /> {investigation.pattern} Pattern</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleGenerateReport}
                        disabled={generating}
                        className="px-4 py-2 border border-white/10 bg-background hover:bg-white/5 rounded-lg text-sm text-text transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {generating
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                            : <><FileText className="w-4 h-4" /> Generate Report</>
                        }
                    </button>
                    <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-[#07111F] rounded-lg text-sm font-medium transition-colors">
                        Update Status
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                <div className="glass-panel p-4 rounded-xl">
                    <div className="text-xs text-muted mb-1 flex items-center gap-1"><AlertOctagon className="w-3.5 h-3.5 text-danger" /> Risk Level</div>
                    <div className={`text-xl font-bold ${investigation.risk === 'High' ? 'text-danger' : investigation.risk === 'Medium' ? 'text-warning' : 'text-success'}`}>{investigation.risk}</div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="text-xs text-muted mb-1 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary" /> Nodes</div>
                    <div className="text-xl font-bold text-text">{investigation.accounts.length}</div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="text-xs text-muted mb-1 flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-warning" /> Involved Value</div>
                    <div className="text-xl font-bold text-danger">&#8377;{(investigation.amount / 100000).toFixed(2)}L</div>
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <div className="text-xs text-muted mb-1 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-success" /> Transactions</div>
                    <div className="text-xl font-bold text-text">{involvedTransactions.length}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Summary */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-lg font-medium text-text mb-4 border-b border-white/5 pb-2">Investigation Summary</h2>
                        <p className="text-sm text-muted leading-relaxed mb-6">
                            Anomalous network activity detected on <span className="text-text font-medium">{investigation.date}</span>. The system identified a potential{' '}
                            <span className="text-warning font-medium">{investigation.pattern}</span> pattern involving{' '}
                            <span className="text-text font-medium">{investigation.accounts.length}</span> connected accounts.
                            {highRiskAccounts.length > 0 && (
                                <> Of these, <span className="text-danger font-medium">{highRiskAccounts.length}</span> account(s) are flagged as High Risk.</>
                            )}
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-background border border-white/5 rounded-xl">
                                <div className="text-xs text-muted mb-1">Total Incoming (Nodes)</div>
                                <div className="text-lg font-medium text-success">&#8377;{(totalIncoming / 100000).toFixed(2)}L</div>
                            </div>
                            <div className="p-4 bg-background border border-white/5 rounded-xl">
                                <div className="text-xs text-muted mb-1">Total Outgoing (Nodes)</div>
                                <div className="text-lg font-medium text-danger">&#8377;{(totalOutgoing / 100000).toFixed(2)}L</div>
                            </div>
                        </div>
                    </div>

                    {/* Network Graph */}
                    <div className="glass-panel p-6 rounded-2xl flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-text border-b border-white/5 pb-2 flex-grow">Transaction Network Subset</h2>
                            <button onClick={() => navigate(`/network?case=${investigation.id}`)} className="text-xs text-primary hover:underline ml-4">
                                Open in Workspace &rarr;
                            </button>
                        </div>
                        <div className="bg-background rounded-xl border border-white/5 h-[400px] overflow-hidden">
                            <CytoscapeGraph
                                elements={[
                                    ...networkData.nodes.filter((n: any) => investigation.accounts.includes(n.data.id)),
                                    ...networkData.edges.filter((e: any) =>
                                        investigation.accounts.includes(e.data.source) &&
                                        investigation.accounts.includes(e.data.target)
                                    )
                                ]}
                                layoutName="circle"
                                height="100%"
                                onNodeClick={(nodeId: string) => navigate(`/network?case=${investigation.id}&account=${nodeId}`)}
                            />
                        </div>
                    </div>

                    {/* Involved Accounts Table */}
                    {involvedAccounts.length > 0 && (
                        <div className="glass-panel p-6 rounded-2xl">
                            <h2 className="text-lg font-medium text-text mb-4 border-b border-white/5 pb-2">Involved Account Nodes</h2>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-muted text-xs border-b border-white/5">
                                            <th className="pb-3 pr-4">Account ID</th>
                                            <th className="pb-3 pr-4">Risk</th>
                                            <th className="pb-3 pr-4">Incoming</th>
                                            <th className="pb-3 pr-4">Outgoing</th>
                                            <th className="pb-3 pr-4">Txns</th>
                                            <th className="pb-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {involvedAccounts.map(acc => (
                                            <tr key={acc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                <td className="py-3 pr-4 font-mono text-primary">{acc.id}</td>
                                                <td className="py-3 pr-4">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${acc.risk === 'High' ? 'bg-danger/20 text-danger' : acc.risk === 'Medium' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}`}>
                                                        {acc.risk}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 text-success">&#8377;{(acc.incoming / 100000).toFixed(2)}L</td>
                                                <td className="py-3 pr-4 text-danger">&#8377;{(acc.outgoing / 100000).toFixed(2)}L</td>
                                                <td className="py-3 pr-4 text-text">{acc.transactions}</td>
                                                <td className="py-3 text-muted">{acc.status || 'Active'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column */}
                <div className="space-y-8">

                    {/* Dynamic Risk Indicators */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-lg font-medium text-text mb-4 border-b border-white/5 pb-2">Risk Indicators</h2>
                        <ul className="space-y-4">
                            {highRiskAccounts.length > 0 && (
                                <li className="flex gap-3 text-sm">
                                    <CheckCircle2 className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-text mb-1">High-risk accounts present</div>
                                        <div className="text-xs text-muted">{highRiskAccounts.map(a => a.id).join(', ')} flagged as High Risk.</div>
                                    </div>
                                </li>
                            )}
                            {totalOutgoing > totalIncoming && (
                                <li className="flex gap-3 text-sm">
                                    <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-text mb-1">Net outflow detected</div>
                                        <div className="text-xs text-muted">Outgoing exceeds incoming by &#8377;{((totalOutgoing - totalIncoming) / 100000).toFixed(2)}L.</div>
                                    </div>
                                </li>
                            )}
                            {involvedTransactions.length > 0 && (
                                <li className="flex gap-3 text-sm">
                                    <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-text mb-1">Active transaction links</div>
                                        <div className="text-xs text-muted">{involvedTransactions.length} transaction(s) found connecting these nodes.</div>
                                    </div>
                                </li>
                            )}
                            {investigation.accounts.length >= 3 && (
                                <li className="flex gap-3 text-sm">
                                    <CheckCircle2 className="w-5 h-5 text-danger shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-medium text-text mb-1">Multi-hop network</div>
                                        <div className="text-xs text-muted">{investigation.accounts.length} accounts form a multi-hop cluster — indicative of layering.</div>
                                    </div>
                                </li>
                            )}
                            {highRiskAccounts.length === 0 && totalOutgoing <= totalIncoming && involvedTransactions.length === 0 && investigation.accounts.length < 3 && (
                                <li className="flex gap-3 text-sm text-muted">
                                    <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div>No automatic risk signals detected. Review accounts manually.</div>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Dynamic Transaction Timeline */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h2 className="text-lg font-medium text-text mb-4 border-b border-white/5 pb-2">Transaction Timeline</h2>
                        {involvedTransactions.length === 0 ? (
                            <p className="text-sm text-muted">No transactions found between the selected accounts.</p>
                        ) : (
                            <div className="space-y-0 relative before:absolute before:inset-0 before:ml-2 before:h-full before:w-px before:bg-white/10 mt-6">
                                {involvedTransactions.map(txn => (
                                    <div key={txn.transactionId} className="relative flex items-start group mb-6">
                                        <div className={`flex items-center justify-center w-4 h-4 rounded-full bg-background border-2 shrink-0 z-10 box-content mt-1 ${txn.status === 'Flagged' ? 'border-danger' : txn.status === 'Pending' ? 'border-warning' : 'border-success'}`}></div>
                                        <div className="ml-6 w-full">
                                            <div className="text-xs text-muted flex justify-between">
                                                <span>{new Date(txn.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>&#8377;{txn.amount.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="text-sm font-medium text-text mt-1">{txn.sender} &rarr; {txn.receiver}</div>
                                            <div className={`text-xs mt-1 ${txn.status === 'Flagged' ? 'text-danger' : txn.status === 'Pending' ? 'text-warning' : 'text-muted'}`}>
                                                {txn.status}{txn.detectedPattern ? ` · ${txn.detectedPattern}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
