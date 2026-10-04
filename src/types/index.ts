export interface Transaction {
    transactionId: string;
    sender: string;
    receiver: string;
    amount: number;
    timestamp: string;
    institution: string;
    receiverInstitution?: string;
    senderAccountNumber?: string;
    receiverAccountNumber?: string;
    senderHolder?: string;
    receiverHolder?: string;
    status: 'Completed' | 'Flagged' | 'Pending' | 'Failed';
    processingTime?: number; // seconds it took for money to reach the receiver
    detectedPattern?: string; // e.g., 'Circular Flow', 'Rapid Pass-through', 'Structuring / Smurfing'
    senderTxnCount?: number; // total transactions for sender account
    receiverTxnCount?: number; // total transactions for receiver account
    connectedAccounts?: string[]; // connected accounts in this network/cluster
    connectedBankDetails?: string; // full details of connected accounts & banks
    investigationId?: string; // Linked investigation ID if any
}

export interface Account {
    id: string;
    bankName?: string;
    accountNumber?: string;
    accountHolder?: string;
    risk: 'Low' | 'Medium' | 'High';
    transactions: number;
    incoming: number;
    outgoing: number;
    connectedAccounts: number;
    detectedPatterns: string[];
    lastActivity: string;
    status: 'Active' | 'Under Investigation' | 'Suspended';
    connectedAccountList?: string[];
}

export interface Investigation {
    id: string;
    pattern: string;
    risk: 'Low' | 'Medium' | 'High';
    accounts: string[];
    amount: number;
    status: 'Open' | 'Under Investigation' | 'Closed';
    date: string;
}

export interface Alert {
    id: string;
    pattern: string;
    accounts: string[];
    amount: number;
    velocity: string;
    risk: 'Low' | 'Medium' | 'High';
    time: string;
    status: 'New' | 'Investigating' | 'Resolved';
}
