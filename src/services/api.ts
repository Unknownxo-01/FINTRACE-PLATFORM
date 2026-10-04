import { mockTransactions, mockAccounts, mockInvestigations, mockAlerts } from '../data/mockData';
import { Transaction, Account, Investigation, Alert } from '../types';
import { deriveAccountsFromTransactions } from '../utils/csvParser';

// Internal dynamic state
let currentTransactions: Transaction[] = [...mockTransactions];
let currentAccounts: Account[] = [...mockAccounts];
let currentInvestigations: Investigation[] = [...mockInvestigations];
let currentAlerts: Alert[] = [...mockAlerts];

// Event listeners for reactive state updates
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
    listeners.forEach(fn => {
        try {
            fn();
        } catch (e) {
            console.error('Error notifying listener:', e);
        }
    });
}

function deriveInvestigationsFromData(txns: Transaction[], _accs?: Account[]): Investigation[] {
    const flagged = txns.filter(t => t.status === 'Flagged');
    if (flagged.length === 0) {
        return [];
    }

    // Group by pattern
    const patternMap = new Map<string, { txns: Transaction[]; accounts: Set<string>; amount: number }>();
    flagged.forEach(t => {
        const p = t.detectedPattern || 'Suspicious Activity';
        if (!patternMap.has(p)) {
            patternMap.set(p, { txns: [], accounts: new Set(), amount: 0 });
        }
        const g = patternMap.get(p)!;
        g.txns.push(t);
        g.accounts.add(t.sender);
        g.accounts.add(t.receiver);
        g.amount += t.amount;
    });

    let index = 1;
    const invs: Investigation[] = [];
    patternMap.forEach((val, pattern) => {
        invs.push({
            id: `INV-2026-${String(420 + index).padStart(5, '0')}`,
            pattern,
            risk: val.amount > 1000000 ? 'High' : 'Medium',
            accounts: Array.from(val.accounts),
            amount: val.amount,
            status: 'Under Investigation',
            date: new Date().toISOString().split('T')[0],
        });
        index++;
    });

    return invs;
}

function deriveAlertsFromData(txns: Transaction[]): Alert[] {
    const flagged = txns.filter(t => t.status === 'Flagged');
    return flagged.slice(0, 5).map((t, idx) => ({
        id: `ALT-${900 + idx + 1}`,
        pattern: t.detectedPattern || 'Anomalous Transfer',
        accounts: [t.sender, t.receiver],
        amount: t.amount,
        velocity: t.processingTime ? `${Math.round(t.processingTime / 60)} mins` : 'Immediate',
        risk: t.amount > 1000000 ? 'High' : 'Medium',
        time: t.timestamp,
        status: 'Investigating'
    }));
}

export const api = {
    subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },

    setTransactions: (newTxns: Transaction[], customAccounts?: Account[]) => {
        currentTransactions = [...newTxns];
        if (customAccounts && customAccounts.length > 0) {
            currentAccounts = [...customAccounts];
        } else {
            currentAccounts = deriveAccountsFromTransactions(newTxns);
        }
        currentInvestigations = deriveInvestigationsFromData(currentTransactions, currentAccounts);
        currentAlerts = deriveAlertsFromData(currentTransactions);
        notifyListeners();
    },

    resetToSample: () => {
        currentTransactions = [...mockTransactions];
        currentAccounts = [...mockAccounts];
        currentInvestigations = [...mockInvestigations];
        currentAlerts = [...mockAlerts];
        notifyListeners();
    },

    getDashboardSummary: async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        const totalAmount = currentTransactions.reduce((acc, t) => acc + t.amount, 0);
        const flaggedAmount = currentTransactions
            .filter(t => t.status === 'Flagged')
            .reduce((acc, t) => acc + t.amount, 0);

        let potentialFlowFormatted = `₹${(flaggedAmount || totalAmount).toLocaleString('en-IN')}`;
        if ((flaggedAmount || totalAmount) >= 10000000) {
            potentialFlowFormatted = `₹${((flaggedAmount || totalAmount) / 10000000).toFixed(2)} Cr`;
        } else if ((flaggedAmount || totalAmount) >= 100000) {
            potentialFlowFormatted = `₹${((flaggedAmount || totalAmount) / 100000).toFixed(2)} Lakh`;
        }

        const patternsCount = new Set(
            currentTransactions
                .filter(t => t.detectedPattern && !t.detectedPattern.includes('Clean'))
                .map(t => t.detectedPattern)
        ).size;

        return {
            totalTransactions: currentTransactions.length,
            flaggedTransactions: currentTransactions.filter(t => t.status === 'Flagged').length,
            suspiciousAccounts: currentAccounts.filter(a => a.risk === 'High' || a.risk === 'Medium').length,
            suspiciousNetworks: patternsCount ? `${patternsCount} Cluster${patternsCount > 1 ? 's' : ''}` : '1 Ring',
            potentialFlowValue: potentialFlowFormatted
        };
    },

    getTransactions: async (): Promise<Transaction[]> => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return currentTransactions;
    },

    getAccounts: async (): Promise<Account[]> => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return currentAccounts;
    },

    getAccount: async (id: string): Promise<Account | undefined> => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return currentAccounts.find(a => a.id === id);
    },

    getInvestigations: async (): Promise<Investigation[]> => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return currentInvestigations;
    },

    getInvestigation: async (id: string): Promise<Investigation | undefined> => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return currentInvestigations.find(i => i.id === id);
    },

    getAlerts: async (): Promise<Alert[]> => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return currentAlerts;
    },

    addInvestigation: (inv: Investigation) => {
        currentInvestigations = [inv, ...currentInvestigations];
        notifyListeners();
    },

    deleteInvestigation: (id: string) => {
        currentInvestigations = currentInvestigations.filter(i => i.id !== id);
        notifyListeners();
    },

    getNetworkData: async () => {
        await new Promise(resolve => setTimeout(resolve, 50));

        const nodes = currentAccounts.map(account => ({
            data: {
                id: account.id,
                label: account.id,
                risk: account.risk,
                type: 'account',
                incoming: account.incoming,
                outgoing: account.outgoing,
                transactions: account.transactions,
                connectedAccounts: account.connectedAccounts,
                detectedPatterns: account.detectedPatterns,
                status: account.status,
            }
        }));

        const edges = currentTransactions.map(txn => ({
            data: {
                id: txn.transactionId,
                source: txn.sender,
                target: txn.receiver,
                amount: txn.amount,
                formattedAmount: txn.amount >= 100000 ? `₹${(txn.amount / 100000).toFixed(1)}L` : `₹${txn.amount.toLocaleString()}`,
                time: txn.timestamp,
                status: txn.status,
            }
        }));

        return { nodes, edges };
    }
};
