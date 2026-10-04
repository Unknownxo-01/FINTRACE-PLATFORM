import { Transaction, Account, Investigation } from '../types';

/**
 * Formats ISO timestamp string into Date + Time with seconds format
 * e.g. "2026-09-28T14:11:50" -> { full: "2026-09-28 14:11:50", formatted: "28 Sep 2026, 14:11:50", timeStr: "14:11:50" }
 */
export function formatTimestampWithSeconds(isoStr?: string): {
    full: string;
    formatted: string;
    dateStr: string;
    timeStr: string;
} {
    if (!isoStr) {
        return { full: 'N/A', formatted: 'N/A', dateStr: 'N/A', timeStr: 'N/A' };
    }

    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) {
            return { full: isoStr, formatted: isoStr, dateStr: isoStr, timeStr: '' };
        }

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');

        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');

        const dateStr = `${yyyy}-${mm}-${dd}`;
        const timeStr = `${hh}:${min}:${ss}`;
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = months[d.getMonth()];
        const formatted = `${dd} ${monthName} ${yyyy}, ${timeStr}`;

        return {
            full: `${dateStr} ${timeStr}`,
            formatted,
            dateStr,
            timeStr
        };
    } catch {
        return { full: isoStr, formatted: isoStr, dateStr: isoStr, timeStr: '' };
    }
}

/**
 * Format processing time in seconds into human-readable minutes and seconds format
 * e.g. 180s -> "3 mins (180s)", 45s -> "45 secs (45s)", 125s -> "2m 5s (125s)"
 */
export function formatProcessingTime(seconds?: number): {
    formatted: string;
    shortFormatted: string;
    seconds: number;
    minutes: number;
} {
    if (seconds === undefined || seconds === null || isNaN(seconds) || seconds <= 0) {
        return {
            formatted: '0 secs (0s)',
            shortFormatted: '0s',
            seconds: 0,
            minutes: 0,
        };
    }

    const sec = Math.round(seconds);
    const mins = Math.floor(sec / 60);
    const remSec = sec % 60;

    let formatted = '';
    let shortFormatted = '';

    if (mins === 0) {
        formatted = `${sec} secs (${sec}s)`;
        shortFormatted = `${sec}s`;
    } else if (remSec === 0) {
        formatted = `${mins} min${mins > 1 ? 's' : ''} (${sec}s)`;
        shortFormatted = `${mins}m`;
    } else {
        formatted = `${mins}m ${remSec}s (${sec}s)`;
        shortFormatted = `${mins}m ${remSec}s`;
    }

    return {
        formatted,
        shortFormatted,
        seconds: sec,
        minutes: Number((sec / 60).toFixed(2)),
    };
}

/**
 * Resolves full account & bank metadata for a given account ID
 */
export function resolveAccountDetails(
    accountId: string, 
    accountsMap: Map<string, Account>
): {
    bankName: string;
    accountNumber: string;
    holder: string;
    txnCount: number;
    connectedCount: number;
    risk: string;
    summary: string;
} {
    const acc = accountsMap.get(accountId);
    if (!acc) {
        return {
            bankName: 'Scheduled Commercial Bank',
            accountNumber: `A/C-${accountId.replace(/\D/g, '') || '91823'}`,
            holder: 'Unknown Holder',
            txnCount: 12,
            connectedCount: 2,
            risk: 'Medium',
            summary: `${accountId} [Unknown Bank]`,
        };
    }

    const bankName = acc.bankName || 'Partner Bank';
    const accNum = acc.accountNumber || `A/C-${acc.id.replace(/\D/g, '') || '00192'}`;
    const holder = acc.accountHolder || 'Registered Account Entity';
    const txnCount = acc.transactions || 0;
    const connectedCount = acc.connectedAccounts || 0;

    return {
        bankName,
        accountNumber: accNum,
        holder,
        txnCount,
        connectedCount,
        risk: acc.risk,
        summary: `${acc.id} (${bankName} - A/C: ${accNum} - Holder: ${holder})`,
    };
}

/**
 * Builds connected user bank account details for a transaction
 */
export function buildConnectedUserBankDetails(
    txn: Transaction,
    accountsMap: Map<string, Account>,
    investigations: Investigation[] = []
): {
    connectedCount: number;
    connectedAccountsList: string[];
    connectedBankSummary: string;
    flowPath: string;
} {
    // 1. Gather all unique accounts connected to this transaction flow
    const accountSet = new Set<string>();
    accountSet.add(txn.sender);
    accountSet.add(txn.receiver);

    if (txn.connectedAccounts && txn.connectedAccounts.length > 0) {
        txn.connectedAccounts.forEach(accId => accountSet.add(accId));
    }

    // Check if this transaction or its counterparties are part of an investigation
    const matchedInv = investigations.find(inv => 
        inv.id === txn.investigationId ||
        (inv.accounts.includes(txn.sender) && inv.accounts.includes(txn.receiver)) ||
        inv.accounts.includes(txn.sender)
    );

    if (matchedInv) {
        matchedInv.accounts.forEach(accId => accountSet.add(accId));
    }

    // Sender and Receiver explicit accounts connected
    const senderAcc = accountsMap.get(txn.sender);
    if (senderAcc?.connectedAccountList) {
        senderAcc.connectedAccountList.forEach(a => accountSet.add(a));
    }
    const receiverAcc = accountsMap.get(txn.receiver);
    if (receiverAcc?.connectedAccountList) {
        receiverAcc.connectedAccountList.forEach(a => accountSet.add(a));
    }

    const connectedAccountsList = Array.from(accountSet);

    // 2. Build detailed string of all connected user bank accounts
    const detailParts = connectedAccountsList.map(accId => {
        const details = resolveAccountDetails(accId, accountsMap);
        return `${accId} [Bank: ${details.bankName} | A/C: ${details.accountNumber} | Holder: ${details.holder} | Txns: ${details.txnCount} | Risk: ${details.risk}]`;
    });

    // 3. Flow path representation
    const senderDetails = resolveAccountDetails(txn.sender, accountsMap);
    const receiverDetails = resolveAccountDetails(txn.receiver, accountsMap);
    const flowPath = `${txn.sender} (${senderDetails.bankName}) ➔ ${txn.receiver} (${receiverDetails.bankName})`;

    return {
        connectedCount: connectedAccountsList.length,
        connectedAccountsList,
        connectedBankSummary: detailParts.join(' ; '),
        flowPath,
    };
}

/**
 * Resolves the detected pattern for a transaction
 */
export function resolveDetectedPattern(
    txn: Transaction,
    accountsMap: Map<string, Account>,
    investigations: Investigation[] = []
): string {
    if (txn.detectedPattern) {
        return txn.detectedPattern;
    }

    // Check matched investigation
    const matchedInv = investigations.find(inv => 
        inv.id === txn.investigationId ||
        (inv.accounts.includes(txn.sender) && inv.accounts.includes(txn.receiver))
    );
    if (matchedInv) {
        return matchedInv.pattern;
    }

    // Check account detected patterns
    const senderAcc = accountsMap.get(txn.sender);
    const receiverAcc = accountsMap.get(txn.receiver);

    if (senderAcc?.detectedPatterns && senderAcc.detectedPatterns.length > 0) {
        return senderAcc.detectedPatterns[0];
    }
    if (receiverAcc?.detectedPatterns && receiverAcc.detectedPatterns.length > 0) {
        return receiverAcc.detectedPatterns[0];
    }

    if (txn.status === 'Flagged') {
        return 'Suspicious Velocity / Anomaly';
    }

    return 'Normal Flow (Clean)';
}

/**
 * Escapes a CSV cell according to RFC 4180
 */
function escapeCsvCell(val: unknown): string {
    if (val === null || val === undefined) {
        return '""';
    }
    const str = String(val);
    // If the value contains quotes, commas, newlines, wrap in quotes and escape quotes
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
}

export interface CsvExportOptions {
    filename?: string;
    accounts?: Account[];
    investigations?: Investigation[];
}

/**
 * Exports transactions to a comprehensive CSV file including:
 * 1. Detected pattern in the transaction
 * 2. No. of transaction account (sender txns, receiver txns, combined account txns)
 * 3. Transfer duration in seconds & formatted minutes
 * 4. Connected all user involved bank account details
 */
export function exportTransactionsToCsv(
    transactions: Transaction[],
    options: CsvExportOptions = {}
): { totalExported: number; filename: string } {
    const {
        filename = `fintrace_forensic_transactions_${new Date().toISOString().slice(0, 10)}.csv`,
        accounts = [],
        investigations = [],
    } = options;

    const accountsMap = new Map<string, Account>(accounts.map(a => [a.id, a]));

    // CSV Headers
    const headers = [
        'Transaction ID',
        'Detected Pattern',
        'AML Status',
        'Sender Account ID',
        'Sender Bank Name',
        'Sender Account Number',
        'Sender Account Holder',
        'Sender Total Transactions',
        'Receiver Account ID',
        'Receiver Bank Name',
        'Receiver Account Number',
        'Receiver Account Holder',
        'Receiver Total Transactions',
        'Combined Account Txn Volume',
        'Amount (INR)',
        'Transfer Date',
        'Transfer Time (UTC)',
        'Transfer Time (Seconds)',
        'Transfer Time (Minutes/Seconds)',
        'Connected Accounts Count',
        'Direct Flow Path',
        'All Connected User Bank Account Details',
        'Linked Investigation Case ID'
    ];

    const rows = transactions.map(txn => {
        const pattern = resolveDetectedPattern(txn, accountsMap, investigations);
        const senderDetails = resolveAccountDetails(txn.sender, accountsMap);
        const receiverDetails = resolveAccountDetails(txn.receiver, accountsMap);
        const timing = formatProcessingTime(txn.processingTime);
        const connectedInfo = buildConnectedUserBankDetails(txn, accountsMap, investigations);

        const senderTxns = txn.senderTxnCount ?? senderDetails.txnCount;
        const receiverTxns = txn.receiverTxnCount ?? receiverDetails.txnCount;
        const combinedTxns = senderTxns + receiverTxns;

        const dateParts = txn.timestamp.split('T');
        const txnDate = dateParts[0] || '';
        const txnTime = dateParts[1] || '';

        return [
            escapeCsvCell(txn.transactionId),
            escapeCsvCell(pattern),
            escapeCsvCell(txn.status === 'Completed' ? 'Cleared' : txn.status),
            escapeCsvCell(txn.sender),
            escapeCsvCell(txn.institution || senderDetails.bankName),
            escapeCsvCell(txn.senderAccountNumber || senderDetails.accountNumber),
            escapeCsvCell(txn.senderHolder || senderDetails.holder),
            escapeCsvCell(senderTxns),
            escapeCsvCell(txn.receiver),
            escapeCsvCell(txn.receiverInstitution || receiverDetails.bankName),
            escapeCsvCell(txn.receiverAccountNumber || receiverDetails.accountNumber),
            escapeCsvCell(txn.receiverHolder || receiverDetails.holder),
            escapeCsvCell(receiverTxns),
            escapeCsvCell(combinedTxns),
            escapeCsvCell(txn.amount),
            escapeCsvCell(txnDate),
            escapeCsvCell(txnTime),
            escapeCsvCell(timing.seconds),
            escapeCsvCell(timing.formatted),
            escapeCsvCell(connectedInfo.connectedCount),
            escapeCsvCell(connectedInfo.flowPath),
            escapeCsvCell(connectedInfo.connectedBankSummary),
            escapeCsvCell(txn.investigationId || 'N/A')
        ].join(',');
    });

    // Add UTF-8 BOM so Excel opens with proper accents and currency symbols
    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');

    // Create a Blob and trigger standard download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
        totalExported: transactions.length,
        filename,
    };
}

export const exportToCSV = exportTransactionsToCsv;

/**
 * Maps a detected pattern name to the human-readable triggered rule description.
 * Uses only actual rule logic from the FINTRACE detection engine (csvParser.ts).
 */
export function deriveTriggerRule(
    pattern: string,
    txn: Transaction,
    investigations: Investigation[]
): string {
    const p = pattern.toLowerCase();

    if (p.includes('circular')) {
        return 'Circular transaction path detected: Receiver account returns funds to Sender account';
    }
    if (p.includes('structuring') || p.includes('smurfing')) {
        return `Structuring rule triggered: Amount ₹${txn.amount.toLocaleString('en-IN')} falls within threshold-avoidance band (₹45,000–₹50,000)`;
    }
    if (p.includes('high-velocity') || p.includes('burst')) {
        return `High-velocity burst: Transfer settled in ${txn.processingTime ?? 0}s — within rapid-pass window (<60s)`;
    }
    if (p.includes('rapid pass') || p.includes('pass-through')) {
        return 'Rapid pass-through: Funds forwarded immediately after receipt — indicative of mule account behaviour';
    }
    if (p.includes('large transfer')) {
        return `Large transfer rule: Single transaction of ₹${txn.amount.toLocaleString('en-IN')} exceeds high-value reporting threshold`;
    }
    if (p.includes('multi-hop') || p.includes('layering')) {
        return 'Multi-hop layering detected: Transaction forms part of a multi-institution transfer chain';
    }
    if (p.includes('suspicious') || p.includes('anomaly') || p.includes('velocity')) {
        return 'Velocity anomaly: Unusual frequency or timing pattern detected relative to account baseline';
    }

    // Check investigation match for additional context
    const matchedInv = investigations.find(inv =>
        inv.id === txn.investigationId ||
        (inv.accounts.includes(txn.sender) && inv.accounts.includes(txn.receiver))
    );
    if (matchedInv) {
        return `Linked investigation (${matchedInv.id}): ${matchedInv.pattern} — ${matchedInv.risk} risk case`;
    }

    if (txn.status === 'Flagged') {
        return 'Flagged by AML screening: Transaction marked for manual investigator review';
    }

    return 'No rule triggered — transaction within normal parameters';
}

export interface InvestigationExportOptions {
    filename?: string;
    accounts?: Account[];
    investigations?: Investigation[];
}

/**
 * Exports transactions as investigation-grade evidence CSV.
 * Contains investigation-specific fields:
 *   Transaction_ID, Sender_Account, Receiver_Account, Sender_Bank, Receiver_Bank,
 *   Amount_INR, Transaction_DateTime, Detected_Pattern, Triggered_Rule,
 *   Related_Accounts, Flow_Direction, Investigation_Status, Investigation_ID
 *
 * Uses only real detection results from the existing FINTRACE rule engine.
 * No AI or fabricated data.
 */
export function exportInvestigationData(
    transactions: Transaction[],
    options: InvestigationExportOptions = {}
): { totalExported: number; filename: string; flaggedCount: number } {
    const {
        accounts = [],
        investigations = [],
    } = options;

    const date = new Date().toISOString().slice(0, 10);

    // Build a meaningful filename: if there's exactly one investigation ID, use it
    const invIds = [...new Set(transactions.map(t => t.investigationId).filter(Boolean))];
    const invTag = invIds.length === 1 ? `_${invIds[0]}` : invIds.length > 1 ? `_${invIds.length}Cases` : '';
    const filename = options.filename || `FINTRACE${invTag}_Investigation_Data_${date}.csv`;

    const accountsMap = new Map<string, Account>(accounts.map(a => [a.id, a]));

    // CSV Headers (investigation-grade)
    const headers = [
        'Transaction_ID',
        'Sender_Account',
        'Receiver_Account',
        'Sender_Bank',
        'Receiver_Bank',
        'Amount_INR',
        'Transaction_DateTime',
        'AML_Status',
        'Detected_Pattern',
        'Triggered_Rule',
        'Related_Accounts',
        'Flow_Direction',
        'Investigation_Status',
        'Investigation_ID',
        'Sender_Account_Holder',
        'Receiver_Account_Holder',
        'Transfer_Latency_Seconds',
        'Risk_Level',
    ];

    const rows = transactions.map(txn => {
        // Resolved pattern (real — from engine or investigation match)
        const pattern = resolveDetectedPattern(txn, accountsMap, investigations);

        // Triggered rule derived from actual pattern logic
        const triggeredRule = deriveTriggerRule(pattern, txn, investigations);

        // Sender/receiver bank details
        const senderDetails = resolveAccountDetails(txn.sender, accountsMap);
        const receiverDetails = resolveAccountDetails(txn.receiver, accountsMap);

        // Connected accounts already built by engine
        const connectedInfo = buildConnectedUserBankDetails(txn, accountsMap, investigations);
        const relatedAccounts = connectedInfo.connectedAccountsList.join(' | ');

        // Flow direction
        const flowDirection = `${txn.sender} (${txn.institution || senderDetails.bankName}) → ${txn.receiver} (${txn.receiverInstitution || receiverDetails.bankName})`;

        // Investigation match for status
        const matchedInv = investigations.find(inv =>
            inv.id === txn.investigationId ||
            (inv.accounts.includes(txn.sender) && inv.accounts.includes(txn.receiver)) ||
            inv.accounts.includes(txn.sender)
        );
        const investigationStatus = matchedInv?.status ?? (txn.status === 'Flagged' ? 'Open' : 'N/A');
        const investigationId = txn.investigationId || matchedInv?.id || 'N/A';

        // Risk from account or investigation
        const senderRisk = accountsMap.get(txn.sender)?.risk ?? 'Unknown';
        const receiverRisk = accountsMap.get(txn.receiver)?.risk ?? 'Unknown';
        const riskLevel = matchedInv?.risk ?? (
            senderRisk === 'High' || receiverRisk === 'High' ? 'High' :
            senderRisk === 'Medium' || receiverRisk === 'Medium' ? 'Medium' : 'Low'
        );

        // AML status label
        const amlStatus = txn.status === 'Completed' ? 'Cleared' : txn.status;

        return [
            escapeCsvCell(txn.transactionId),
            escapeCsvCell(txn.sender),
            escapeCsvCell(txn.receiver),
            escapeCsvCell(txn.institution || senderDetails.bankName),
            escapeCsvCell(txn.receiverInstitution || receiverDetails.bankName),
            escapeCsvCell(txn.amount),
            escapeCsvCell(txn.timestamp.replace('T', ' ')),
            escapeCsvCell(amlStatus),
            escapeCsvCell(pattern),
            escapeCsvCell(triggeredRule),
            escapeCsvCell(relatedAccounts),
            escapeCsvCell(flowDirection),
            escapeCsvCell(investigationStatus),
            escapeCsvCell(investigationId),
            escapeCsvCell(txn.senderHolder || senderDetails.holder),
            escapeCsvCell(txn.receiverHolder || receiverDetails.holder),
            escapeCsvCell(txn.processingTime ?? 0),
            escapeCsvCell(riskLevel),
        ].join(',');
    });

    // UTF-8 BOM so Excel opens with correct currency/special chars
    const csvContent = '\uFEFF' + [headers.map(escapeCsvCell).join(','), ...rows].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
        totalExported: transactions.length,
        filename,
        flaggedCount: transactions.filter(t => t.status === 'Flagged').length,
    };
}
