import { NavLink } from 'react-router-dom';
import { 
    LayoutDashboard, 
    FileText, 
    Network, 
    Users, 
    AlertTriangle, 
    FileBarChart, 
    Settings as SettingsIcon, 
    ShieldAlert,
    Radio
} from 'lucide-react';
import { cn } from '../utils/cn';

interface NavItem {
    name: string;
    to: string;
    icon: any;
    badge?: string;
    badgeColor?: string;
}

interface NavSection {
    category: string;
    items: NavItem[];
}

const navSections: NavSection[] = [
    {
        category: 'MONITORING',
        items: [
            { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
            { name: 'Transactions', to: '/transactions', icon: FileText, badge: '6 Flagged', badgeColor: 'bg-warning/15 text-warning border-warning/30' },
        ]
    },
    {
        category: 'FORENSIC ANALYSIS',
        items: [
            { name: 'Network Graph', to: '/network', icon: Network },
            { name: 'Suspicious Accounts', to: '/accounts', icon: Users, badge: 'High Risk', badgeColor: 'bg-danger/15 text-danger border-danger/30' },
            { name: 'Investigations', to: '/investigations', icon: AlertTriangle, badge: '2 Active', badgeColor: 'bg-primary/15 text-primary border-primary/30' },
        ]
    },
    {
        category: 'COMPLIANCE & OPS',
        items: [
            { name: 'Dossier Reports', to: '/reports', icon: FileBarChart },
            { name: 'System Settings', to: '/settings', icon: SettingsIcon },
        ]
    }
];

export default function Sidebar() {
    return (
        <aside className="flex h-full w-72 flex-col bg-card/95 backdrop-blur-2xl border-r border-white/[0.07] shrink-0 select-none z-30">
            {/* Brand Logo & Telemetry */}
            <div className="h-20 shrink-0 px-6 flex items-center justify-between border-b border-white/[0.07] bg-card-subtle/50">
                <div className="flex items-center gap-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 via-primary/5 to-secondary/20 border border-primary/40 shadow-panel-glow">
                        <ShieldAlert className="w-5 h-5 text-primary" />
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-base font-bold tracking-wider text-text font-sans">FINTRACE</span>
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/25">
                                AML-X
                            </span>
                        </div>
                        <p className="text-[10px] text-muted tracking-tight font-mono">FINANCIAL FORENSICS OS</p>
                    </div>
                </div>
            </div>

            {/* Live Sentinel Status Strip */}
            <div className="px-5 py-2.5 bg-background/50 border-b border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-muted">
                <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-success animate-pulse" />
                    <span className="text-text font-medium">SENTINEL FEED</span>
                </div>
                <span className="text-success font-semibold tracking-wide">ONLINE • 99.9%</span>
            </div>

            {/* Navigation Sections */}
            <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
                {navSections.map((section) => (
                    <div key={section.category}>
                        <div className="px-3 pb-2 text-[10px] font-mono font-semibold tracking-widest text-muted/70 uppercase">
                            {section.category}
                        </div>
                        <ul className="space-y-1">
                            {section.items.map((item) => (
                                <li key={item.name}>
                                    <NavLink
                                        to={item.to}
                                        className={({ isActive }) =>
                                            cn(
                                                'group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                                                isActive
                                                    ? 'bg-gradient-to-r from-primary/15 via-primary/5 to-transparent text-primary font-semibold border-l-2 border-primary shadow-sm'
                                                    : 'text-muted hover:bg-white/[0.04] hover:text-text'
                                            )
                                        }
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                                            <span className="tracking-tight">{item.name}</span>
                                        </div>
                                        {item.badge && (
                                            <span className={cn(
                                                'text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border',
                                                item.badgeColor || 'bg-white/5 text-muted border-white/10'
                                            )}>
                                                {item.badge}
                                            </span>
                                        )}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            {/* User Clearance Card */}
            <div className="p-3.5 border-t border-white/[0.07] bg-card-subtle/80">
                <div className="p-3 rounded-xl bg-background/60 border border-white/[0.06] flex items-center gap-3">
                    <div className="relative">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-900 to-blue-900 border border-primary/30 flex items-center justify-center text-primary font-mono text-xs font-bold shadow-inner">
                            AN-09
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-background"></span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-text truncate">Agent Sharma</p>
                            <span className="text-[9px] font-mono text-primary bg-primary/10 px-1 rounded">L4</span>
                        </div>
                        <p className="text-[10px] font-mono text-muted truncate">Lead AML Investigator</p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
