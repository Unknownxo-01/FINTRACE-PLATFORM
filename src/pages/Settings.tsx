import { User, Bell, Shield, Laptop, Briefcase, Save, RefreshCw, Key, LogOut } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';

type SettingsTab = 'profile' | 'organization' | 'notifications' | 'security' | 'appearance';

const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'organization', label: 'Organization', icon: Briefcase },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security & Access', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Laptop },
];

export default function Settings() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="pb-2 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-muted">SYSTEM CONFIGURATION</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-text">Platform Settings</h2>
                <p className="text-muted text-xs mt-0.5">
                    Configure analyst profile, access credentials, and FINTRACE system parameters.
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Left Nav */}
                <nav className="w-full md:w-56 shrink-0 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left',
                                activeTab === tab.id
                                    ? 'bg-gradient-to-r from-primary/15 via-primary/5 to-transparent text-primary font-semibold border-l-2 border-primary'
                                    : 'text-muted hover:bg-white/[0.04] hover:text-text'
                            )}
                        >
                            <tab.icon className="w-4 h-4 shrink-0" />
                            {tab.label}
                        </button>
                    ))}

                    {/* Danger Zone */}
                    <div className="pt-4 mt-4 border-t border-white/[0.06] space-y-1">
                        <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-danger hover:bg-danger/10 transition-all text-left">
                            <LogOut className="w-4 h-4 shrink-0" />
                            Sign Out of Session
                        </button>
                    </div>
                </nav>

                {/* Right Panel */}
                <div className="flex-1 glass-panel p-8 rounded-2xl">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 pb-4 border-b border-white/[0.06]">
                                <h3 className="text-base font-bold text-text">Analyst Identity Profile</h3>
                            </div>

                            {/* Avatar Row */}
                            <div className="flex items-center gap-6">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-900 to-blue-900 border-2 border-primary/40 flex items-center justify-center text-primary text-2xl font-mono font-bold shadow-panel-glow">
                                        RS
                                    </div>
                                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-success ring-2 ring-background"></span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-bold text-text">Agent Sharma</p>
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/25">
                                            Clearance Level 4
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted font-mono mb-3">Lead AML Investigator • FINTRACE Unit</p>
                                    <button className="px-3.5 py-1.5 rounded-xl bg-background border border-white/[0.10] hover:border-white/[0.22] text-text text-xs font-mono transition-colors">
                                        Change Avatar
                                    </button>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {[
                                    { label: 'First Name', value: 'Raj', type: 'text' },
                                    { label: 'Last Name', value: 'Sharma', type: 'text' },
                                    { label: 'Email Address', value: 'r.sharma@fintrace.gov.in', type: 'email' },
                                    { label: 'Badge / Employee ID', value: 'FT-AN-0947', type: 'text' },
                                ].map(field => (
                                    <div key={field.label} className="space-y-1.5">
                                        <label className="text-[11px] font-mono font-semibold text-muted uppercase tracking-wider">
                                            {field.label}
                                        </label>
                                        <input
                                            type={field.type}
                                            defaultValue={field.value}
                                            className="w-full bg-background/80 border border-white/[0.08] hover:border-white/[0.16] focus:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all font-sans"
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Role Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-mono font-semibold text-muted uppercase tracking-wider">
                                    Analyst Role
                                </label>
                                <select className="w-full bg-background/80 border border-white/[0.08] hover:border-white/[0.16] focus:border-primary/50 rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none transition-all font-sans">
                                    <option>Senior AML Investigator</option>
                                    <option>Compliance Officer</option>
                                    <option>Risk Analyst</option>
                                    <option>System Administrator</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="pt-5 border-t border-white/[0.06] flex justify-end gap-3">
                                <button className="px-4 py-2 rounded-xl bg-background/80 border border-white/[0.08] hover:border-white/[0.20] text-xs font-mono text-muted hover:text-text transition-all">
                                    Discard Changes
                                </button>
                                <button className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-[#050D1A] text-xs font-semibold transition-all flex items-center gap-2 shadow-panel-glow active:scale-[0.98]">
                                    <Save className="w-3.5 h-3.5 stroke-[2.5]" />
                                    Save Profile
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="pb-4 border-b border-white/[0.06]">
                                <h3 className="text-base font-bold text-text">Security & Access Control</h3>
                                <p className="text-xs text-muted mt-0.5 font-sans">Manage credentials, MFA, and active session tokens.</p>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-background/60 border border-white/[0.08] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Key className="w-4 h-4 text-primary" />
                                        <div>
                                            <p className="text-sm font-semibold text-text">API Access Token</p>
                                            <p className="text-xs font-mono text-muted">fintrace_•••••••••••••_k7xQ</p>
                                        </div>
                                    </div>
                                    <button className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
                                        <RefreshCw className="w-3 h-3" />
                                        Rotate Key
                                    </button>
                                </div>
                                <div className="p-4 rounded-xl bg-success/5 border border-success/20 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Shield className="w-4 h-4 text-success" />
                                        <div>
                                            <p className="text-sm font-semibold text-text">Multi-Factor Authentication</p>
                                            <p className="text-xs font-mono text-success">TOTP Enabled • Last used 2 hours ago</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-success/15 text-success border border-success/30">
                                        ACTIVE
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'organization' || activeTab === 'notifications' || activeTab === 'appearance') && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-12 h-12 rounded-xl bg-card-subtle border border-white/[0.06] flex items-center justify-center mb-4">
                                {activeTab === 'organization' && <Briefcase className="w-5 h-5 text-muted" />}
                                {activeTab === 'notifications' && <Bell className="w-5 h-5 text-muted" />}
                                {activeTab === 'appearance' && <Laptop className="w-5 h-5 text-muted" />}
                            </div>
                            <p className="text-sm font-semibold text-text capitalize">{activeTab} settings</p>
                            <p className="text-xs text-muted mt-1 font-sans">Configuration panel under implementation by dev team.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
