import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Search, 
    Bell, 
    Clock, 
    Plus, 
    Command,
    Terminal
} from 'lucide-react';

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

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setTime(now.toTimeString().split(' ')[0] + ' UTC');
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    const path = location.pathname;
    const currentMeta = routeTitles[path] || {
        title: 'Forensic Workspace',
        subtitle: 'Secure intelligence platform'
    };

    return (
        <header className="h-20 shrink-0 border-b border-white/[0.07] bg-card-subtle/80 backdrop-blur-xl px-8 flex items-center justify-between z-20">
            {/* Left: Active Module & Breadcrumb */}
            <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5" />
                        FINTRACE FORENSICS
                    </span>
                    <span className="text-white/20">/</span>
                    <span className="text-xs font-mono text-muted">{path.replace('/', '') || 'root'}</span>
                </div>
                <h1 className="text-lg font-semibold tracking-tight text-text font-sans">
                    {currentMeta.title}
                </h1>
            </div>

            {/* Middle: Universal Search Bar */}
            <div className="hidden lg:flex items-center w-80 xl:w-96 relative">
                <Search className="w-4 h-4 absolute left-3.5 text-muted pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search accounts, TXN IDs, or patterns..."
                    className="w-full bg-background/80 border border-white/[0.08] hover:border-white/[0.16] focus:border-primary/50 rounded-xl pl-10 pr-12 py-2 text-xs text-text placeholder:text-muted/60 transition-all focus:outline-none focus:ring-1 focus:ring-primary/20 font-sans"
                />
                <div className="absolute right-3 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-muted">
                    <Command className="w-2.5 h-2.5" />
                    <span>K</span>
                </div>
            </div>

            {/* Right: Telemetry & Actions */}
            <div className="flex items-center gap-4">
                {/* Live System Time */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/60 border border-white/[0.06] text-xs font-mono text-muted">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span className="tabular-nums text-text font-medium">{time || 'LIVE CLOCK'}</span>
                </div>

                {/* Threat Level Indicator */}
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-warning/10 border border-warning/25 text-warning text-xs font-mono">
                    <span className="w-2 h-2 rounded-full bg-warning animate-ping"></span>
                    <span className="font-semibold tracking-wide">THREAT: ELEVATED</span>
                </div>

                {/* Notification Bell */}
                <button 
                    onClick={() => navigate('/investigations')}
                    className="relative p-2 rounded-xl bg-background/60 hover:bg-card-hover border border-white/[0.08] hover:border-white/[0.16] text-muted hover:text-text transition-all"
                    title="4 Flagged Alerts"
                >
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger ring-2 ring-background"></span>
                </button>

                {/* Quick Action Button */}
                <button 
                    onClick={() => navigate('/investigations')}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#050D1A] font-semibold text-xs transition-all shadow-panel-glow active:scale-[0.98]"
                >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>New Case</span>
                </button>
            </div>
        </header>
    );
}
