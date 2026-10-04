import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Activity, 
    AlertOctagon, 
    ArrowRight, 
    ActivityIcon, 
    Network,
    ExternalLink,
    Filter,
    Zap,
    Users,
    Repeat,
    Layers,
    ShieldAlert,
    BarChart3,
    GitBranch,
    Wallet
} from 'lucide-react';
import { api } from '../services/api';
import CytoscapeGraph from '../components/CytoscapeGraph';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { Account, Transaction } from '../types';
import cytoscape from 'cytoscape';
import PatternDetailModal, { PatternInfo } from '../components/PatternDetailModal';

const velocityData = [
    { time: '09:00', amount: 4000, risk: 2400 },
    { time: '10:00', amount: 3000, risk: 1398 },
    { time: '11:00', amount: 2000, risk: 9800 },
    { time: '12:00', amount: 2780, risk: 3908 },
    { time: '13:00', amount: 1890, risk: 4800 },
    { time: '14:00', amount: 2390, risk: 3800 },
    { time: '15:00', amount: 3490, risk: 4300 },
];

// Tiny sparkline data per KPI
const sparklines: Record<string, { v: number }[]> = {
    total:   [{ v: 14 }, { v: 16 }, { v: 18 }, { v: 15 }, { v: 19 }, { v: 20 }, { v: 22 }],
    flagged: [{ v: 8  }, { v: 11 }, { v: 14 }, { v: 12 }, { v: 18 }, { v: 20 }, { v: 22 }],
    risk:    [{ v: 18 }, { v: 20 }, { v: 22 }, { v: 21 }, { v: 23 }, { v: 24 }, { v: 24 }],
    subgraph:[{ v: 1  }, { v: 1  }, { v: 2  }, { v: 2  }, { v: 3  }, { v: 3  }, { v: 3  }],
    exposure:[{ v: 30 }, { v: 35 }, { v: 40 }, { v: 38 }, { v: 44 }, { v: 47 }, { v: 50 }],
};

export default function Dashboard() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState<any>(null);
    const [networkData, setNetworkData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'1H' | '24H' | '7D' | '30D'>('24H');
    const [selectedPattern, setSelectedPattern] = useState<PatternInfo | null>(null);

    useEffect(() => {
        async function loadData() {
            try {
                const [dashSummary, netData, accsData, txnsData] = await Promise.all([
                    api.getDashboardSummary(),
                    api.getNetworkData(),
                    api.getAccounts(),
                    api.getTransactions()
                ]);
                setSummary(dashSummary);
                setNetworkData(netData);
                setAccounts(accsData);
                setTransactions(txnsData);
            } finally {
                setLoading(false);
            }
        }
        loadData();
        const unsubscribe = api.subscribe(() => { loadData(); });
        return unsubscribe;
    }, []);

    const formatINR = (val: number) => {
        if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
        if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
        return `₹${val.toLocaleString('en-IN')}`;
    };

    const patternBoxes: PatternInfo[] = useMemo(() => {
        const rapidPassNodes = accounts.filter(a => 
            a.id.includes('MULE') || 
            a.detectedPatterns?.some(p => p.toLowerCase().includes('rapid') || p.toLowerCase().includes('pass'))
        );
        const rapidPassTxns = transactions.filter(t => 
            t.transactionId.includes('MP') || 
            t.detectedPattern?.toLowerCase().includes('rapid') || 
            t.detectedPattern?.toLowerCase().includes('pass')
        );
        const rapidPassAmount = rapidPassTxns.reduce((acc, t) => acc + t.amount, 0) || 1450000;
        const rapidPassNodeCount = rapidPassNodes.length || 6;

        const smurfingNodes = accounts.filter(a => 
            a.id.includes('SMURF') || a.id.includes('HUB') || 
            a.detectedPatterns?.some(p => p.toLowerCase().includes('smurf') || p.toLowerCase().includes('structur'))
        );
        const smurfingTxns = transactions.filter(t => 
            t.transactionId.includes('SMF') || 
            t.detectedPattern?.toLowerCase().includes('smurf') || 
            t.detectedPattern?.toLowerCase().includes('structur')
        );
        const smurfingAmount = smurfingTxns.reduce((acc, t) => acc + t.amount, 0) || 820000;
        const smurfingNodeCount = smurfingNodes.length || 12;

        const washNodes = accounts.filter(a => 
            a.id.includes('WASH') || 
            a.detectedPatterns?.some(p => p.toLowerCase().includes('circular') || p.toLowerCase().includes('wash'))
        );
        const washTxns = transactions.filter(t => 
            t.transactionId.includes('WASH') || 
            t.detectedPattern?.toLowerCase().includes('circular') || 
            t.detectedPattern?.toLowerCase().includes('wash')
        );
        const washAmount = washTxns.reduce((acc, t) => acc + t.amount, 0) || 2500000;
        const washNodeCount = washNodes.length || 5;

        return [
            {
                id: 'rapid-pass',
                title: 'Rapid Pass',
                subtitle: 'Rapid Pass-through Mule Chains',
                nodeCount: rapidPassNodeCount,
                amount: rapidPassAmount,
                risk: 'High',
                badge: 'PASS-THROUGH CHAIN',
                icon: Zap,
                color: 'text-primary',
                borderColor: 'border-primary/40',
                glowColor: 'group-hover:border-primary/60 group-hover:shadow-[0_0_30px_rgba(0,229,255,0.18)]',
                bgGradient: 'bg-gradient-to-br from-primary/10 via-background/60 to-transparent',
                accentColor: 'bg-primary',
                description: 'Rapid multi-hop pass-through transfers passing through intermediary mule accounts within seconds (< 45s transit time) to evade transaction velocity controls.',
                nodes: rapidPassNodes.length > 0 ? rapidPassNodes : accounts.slice(0, 6),
                transactions: rapidPassTxns.length > 0 ? rapidPassTxns : transactions.slice(0, 5)
            },
            {
                id: 'smurfing-rings',
                title: 'Smurfing Rings',
                subtitle: 'Structuring & Micro-Deposit Pooling',
                nodeCount: smurfingNodeCount,
                amount: smurfingAmount,
                risk: 'Critical',
                badge: 'FAN-IN CONSOLIDATION',
                icon: Users,
                color: 'text-warning',
                borderColor: 'border-warning/40',
                glowColor: 'group-hover:border-warning/60 group-hover:shadow-[0_0_30px_rgba(245,158,11,0.18)]',
                bgGradient: 'bg-gradient-to-br from-warning/10 via-background/60 to-transparent',
                accentColor: 'bg-warning',
                description: 'Multi-source micro deposits below threshold limits (₹50k) originating from 11 feeder smurf nodes and consolidating into a single central liquidity vault.',
                nodes: smurfingNodes.length > 0 ? smurfingNodes : accounts.slice(0, 12),
                transactions: smurfingTxns.length > 0 ? smurfingTxns : transactions.slice(0, 12)
            },
            {
                id: 'circular-wash-routes',
                title: 'Circular Wash Routes',
                subtitle: 'Closed-Loop Round Tripping',
                nodeCount: washNodeCount,
                amount: washAmount,
                risk: 'Critical',
                badge: 'CLOSED LOOP RECYCLING',
                icon: Repeat,
                color: 'text-danger',
                borderColor: 'border-danger/40',
                glowColor: 'group-hover:border-danger/60 group-hover:shadow-[0_0_30px_rgba(239,68,68,0.18)]',
                bgGradient: 'bg-gradient-to-br from-danger/10 via-background/60 to-transparent',
                accentColor: 'bg-danger',
                description: 'Closed-loop money cycling where 100% of origin funds return back to the source entity after routing through 4 intermediary wash trading entities.',
                nodes: washNodes.length > 0 ? washNodes : accounts.slice(0, 5),
                transactions: washTxns.length > 0 ? washTxns : transactions.slice(0, 5)
            }
        ];
    }, [accounts, transactions]);

    if (loading) {
        return (
            <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-muted space-y-3 font-mono">
                <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
                <div className="text-xs tracking-wider uppercase">Loading intelligence feeds...</div>
            </div>
        );
    }

    const elements: cytoscape.ElementDefinition[] = [
        ...networkData.nodes,
        ...networkData.edges
    ];

    const kpiMetrics = [
        { 
            label: 'Total Processed', 
            value: summary?.totalTransactions !== undefined ? summary.totalTransactions.toLocaleString() : '22', 
            sub: 'Active dataset ledger', 
            icon: BarChart3, 
            color: 'text-primary',
            iconBg: 'bg-primary/15 border-primary/25',
            accentLine: 'from-primary to-primary/20',
            sparkKey: 'total',
            sparkColor: '#00E5FF',
            trend: '+14%',
            trendUp: true,
        },
        { 
            label: 'Flagged Transactions', 
            value: summary?.flaggedTransactions !== undefined ? summary.flaggedTransactions.toLocaleString() : '22', 
            sub: summary?.totalTransactions ? `${((summary.flaggedTransactions / summary.totalTransactions) * 100).toFixed(1)}% anomaly rate` : '100.0% anomaly rate', 
            icon: ShieldAlert, 
            color: 'text-warning',
            iconBg: 'bg-warning/15 border-warning/25',
            accentLine: 'from-warning to-warning/20',
            sparkKey: 'flagged',
            sparkColor: '#F59E0B',
            trend: '+8%',
            trendUp: true,
        },
        { 
            label: 'High-Risk Entities', 
            value: summary?.suspiciousAccounts !== undefined ? summary.suspiciousAccounts.toLocaleString() : '24', 
            sub: 'Identified counterparties', 
            icon: AlertOctagon, 
            color: 'text-danger',
            iconBg: 'bg-danger/15 border-danger/25',
            accentLine: 'from-danger to-danger/20',
            sparkKey: 'risk',
            sparkColor: '#EF4444',
            trend: '+2',
            trendUp: true,
        },
        { 
            label: 'Detected Subgraphs', 
            value: summary?.suspiciousNetworks || '3 Clusters', 
            sub: 'Topological clusters', 
            icon: GitBranch, 
            color: 'text-secondary',
            iconBg: 'bg-secondary/15 border-secondary/25',
            accentLine: 'from-secondary to-secondary/20',
            sparkKey: 'subgraph',
            sparkColor: '#3B82F6',
            trend: 'Stable',
            trendUp: false,
        },
        { 
            label: 'Potential Exposure', 
            value: summary?.potentialFlowValue || '₹2.05 Cr', 
            sub: 'AML Review Value', 
            icon: Wallet, 
            color: 'text-danger',
            iconBg: 'bg-danger/15 border-danger/25',
            accentLine: 'from-danger via-warning/60 to-warning/20',
            sparkKey: 'exposure',
            sparkColor: '#EF4444',
            trend: '+₹18L',
            trendUp: true,
        },
    ];

    return (
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-7">
            {/* Modal */}
            <PatternDetailModal 
                pattern={selectedPattern} 
                onClose={() => setSelectedPattern(null)} 
            />

            {/* ── Page Header ─────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]"></span>
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted">Forensic Monitoring Active</span>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-text">
                        Financial Crime Surveillance
                    </h2>
                    <p className="text-muted text-xs mt-0.5 font-sans">
                        Real-time topological fraud graphs, rapid mule chain detection, and AML transaction velocity.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <button 
                        onClick={() => navigate('/transactions')}
                        className="px-3.5 py-2 rounded-xl bg-background/80 hover:bg-card-hover border border-white/[0.08] text-xs font-mono text-muted hover:text-text transition-all flex items-center gap-2"
                    >
                        <Filter className="w-3.5 h-3.5 text-primary" />
                        <span>Filter TXNs</span>
                    </button>
                    <button 
                        onClick={() => navigate('/network')}
                        className="px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-mono font-medium transition-all flex items-center gap-2"
                    >
                        <Network className="w-3.5 h-3.5" />
                        <span>Launch Full Graph</span>
                    </button>
                </div>
            </div>

            {/* ── KPI Cards ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {kpiMetrics.map((kpi, i) => (
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        key={kpi.label}
                        className="kpi-card group relative rounded-2xl overflow-hidden cursor-default"
                    >
                        {/* Gradient top accent bar */}
                        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${kpi.accentLine}`} />

                        {/* Faint glow orb behind the card */}
                        <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 bg-gradient-to-br ${kpi.accentLine}`} />

                        <div className="relative p-5 flex flex-col gap-3">
                            {/* Top row: label + icon */}
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] text-muted/80 leading-tight">
                                    {kpi.label}
                                </span>
                                <div className={`p-2 rounded-xl border ${kpi.iconBg} ${kpi.color} flex-shrink-0 shadow-sm`}>
                                    <kpi.icon className="w-4 h-4" strokeWidth={2} />
                                </div>
                            </div>

                            {/* Big value — bold, coloured, subtle glow */}
                            <div className={`kpi-value text-[34px] leading-none ${kpi.color}`}>
                                {kpi.value}
                            </div>

                            {/* Sparkline */}
                            <div className="h-10 w-full -mx-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={sparklines[kpi.sparkKey]} margin={{ top: 2, right: 4, left: 4, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id={`spark-${i}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={kpi.sparkColor} stopOpacity={0.35} />
                                                <stop offset="95%" stopColor={kpi.sparkColor} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Area 
                                            type="monotone" 
                                            dataKey="v" 
                                            stroke={kpi.sparkColor} 
                                            strokeWidth={1.5} 
                                            fill={`url(#spark-${i})`} 
                                            dot={false} 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Bottom: sub-label + trend */}
                            <div className="flex items-center justify-between pt-0.5 gap-2">
                                <span className="text-[10px] font-mono font-medium text-muted/60 truncate">{kpi.sub}</span>
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                    kpi.trendUp 
                                        ? 'text-success bg-success/10 border-success/25' 
                                        : 'text-muted bg-white/[0.04] border-white/[0.1]'
                                }`}>
                                    {kpi.trend}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* ── Network Graph ────────────────────────────────────────── */}
            <div className="w-full glass-panel rounded-2xl p-6 flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                            <ActivityIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-text">Transaction Network Overview</h3>
                            <p className="text-[11px] text-muted font-mono">Topological graph of high-risk flow clusters</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-muted">
                            {elements.length} Entities
                        </span>
                        <button 
                            onClick={() => navigate('/network')}
                            className="text-xs font-mono text-primary hover:text-primary-hover flex items-center gap-1 transition-colors pl-2"
                        >
                            <span>Interactive View</span>
                            <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                <div className="w-full h-[460px] bg-background/80 rounded-xl border border-white/[0.06] relative overflow-hidden shadow-inner">
                    <CytoscapeGraph
                        elements={elements}
                        layoutName="cose"
                        height="460px"
                        onNodeClick={() => navigate(`/network`)}
                    />
                    {/* Legend */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-3 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/[0.08] text-[10px] font-mono text-muted">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger shadow-[0_0_6px_rgba(239,68,68,0.7)]"></span>High Risk</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning shadow-[0_0_6px_rgba(245,158,11,0.7)]"></span>Medium Risk</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(16,185,129,0.7)]"></span>Clean</span>
                    </div>
                </div>
            </div>

            {/* ── Detected Pattern Cards ───────────────────────────────── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-bold text-text uppercase tracking-wider font-mono">
                            Detected Topology Pattern Cards
                        </h3>
                    </div>
                    <span className="text-[11px] font-mono text-muted hidden sm:block">Click any card to inspect node list & flow details</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {patternBoxes.map((pattern) => {
                        const Icon = pattern.icon;
                        return (
                            <motion.div
                                key={`grid-${pattern.id}`}
                                whileHover={{ y: -5 }}
                                onClick={() => setSelectedPattern(pattern)}
                                className={`glass-panel p-6 rounded-2xl border ${pattern.borderColor} ${pattern.bgGradient} ${pattern.glowColor} cursor-pointer transition-all duration-300 flex flex-col justify-between group relative overflow-hidden`}
                            >
                                <div className={`absolute top-0 left-0 right-0 h-[2px] ${pattern.accentColor}`} />

                                <div>
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-3 rounded-2xl bg-background/80 border border-white/[0.08] ${pattern.color}`}>
                                                <Icon className="w-5 h-5" strokeWidth={1.75} />
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
                                                    {pattern.badge}
                                                </span>
                                                <h4 className="text-base font-bold text-text group-hover:text-primary transition-colors leading-tight">
                                                    {pattern.title}
                                                </h4>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold border flex-shrink-0 ${
                                            pattern.risk === 'Critical' 
                                                ? 'bg-danger/20 text-danger border-danger/30' 
                                                : 'bg-warning/20 text-warning border-warning/30'
                                        }`}>
                                            {pattern.risk}
                                        </span>
                                    </div>

                                    <p className="text-xs text-muted leading-relaxed font-sans line-clamp-2 mb-4">
                                        {pattern.description}
                                    </p>
                                </div>

                                <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2.5 rounded-xl bg-background/70 border border-white/[0.06]">
                                            <div className="text-[10px] font-mono text-muted uppercase mb-1">Nodes</div>
                                            <div className="text-xl font-bold font-mono text-text flex items-center gap-1.5">
                                                <Users className={`w-4 h-4 ${pattern.color}`} strokeWidth={1.75} />
                                                <span>{pattern.nodeCount}</span>
                                            </div>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-background/70 border border-white/[0.06]">
                                            <div className="text-[10px] font-mono text-muted uppercase mb-1">Exposure</div>
                                            <div className={`text-base font-bold font-mono ${pattern.color} leading-tight mt-0.5`}>
                                                {formatINR(pattern.amount)}
                                            </div>
                                        </div>
                                    </div>

                                    <button 
                                        className="w-full py-2.5 rounded-xl bg-primary/10 group-hover:bg-primary text-primary group-hover:text-[#080C14] border border-primary/30 font-mono text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <span>View Node List ({pattern.nodeCount} Accounts)</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ── Velocity Chart ───────────────────────────────────────── */}
            <div className="w-full glass-panel p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-secondary/10 border border-secondary/20 text-secondary">
                            <Activity className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-text">Transaction Velocity & Risk Flow</h3>
                            <p className="text-[11px] text-muted font-mono">Volume comparison vs flagged risk threshold</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Legend pills */}
                        <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono">
                            <span className="flex items-center gap-1.5">
                                <span className="w-6 h-0.5 rounded-full bg-primary inline-block"></span>
                                <span className="text-muted">Total Volume</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-6 h-0.5 rounded-full bg-danger inline-block"></span>
                                <span className="text-muted">Flagged Risk</span>
                            </span>
                        </div>

                        {/* Time range selector */}
                        <div className="flex gap-1 bg-background/80 p-1 rounded-xl border border-white/[0.06]">
                            {(['1H', '24H', '7D', '30D'] as const).map(f => (
                                <button 
                                    key={f} 
                                    onClick={() => setTimeRange(f)}
                                    className={`text-[11px] font-mono px-2.5 py-1 rounded-lg transition-all ${
                                        timeRange === f 
                                            ? 'bg-primary text-[#080C14] font-bold shadow-sm' 
                                            : 'text-muted hover:text-text'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={velocityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" />
                            <XAxis dataKey="time" stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748B" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: '#0F1626', 
                                    borderColor: 'rgba(255,255,255,0.1)', 
                                    borderRadius: '12px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                                    fontSize: '12px'
                                }}
                                itemStyle={{ color: '#F1F5F9' }}
                            />
                            <Area type="monotone" name="Total Volume" dataKey="amount" stroke="#00E5FF" strokeWidth={2} fill="url(#colorVolume)" dot={false} />
                            <Area type="monotone" name="Flagged Risk" dataKey="risk" stroke="#EF4444" strokeWidth={2} fill="url(#colorRisk)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
