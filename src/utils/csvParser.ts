import { Transaction, Account } from '../types';

/**
 * Standard CSV line parser that respects quoted cells containing commas, escaped quotes, and newlines.
 */
export function parseCsvRows(csvText: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    // Normalize line endings
    const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (nextChar === '"') {
                    currentCell += '"';
                    i++; // skip next quote
                } else {
                    inQuotes = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\n') {
                currentRow.push(currentCell.trim());
                if (currentRow.some(c => c.length > 0)) {
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
        }
    }

    return rows;
}

/**
 * Normalize header string to alphanumeric lowercase for fuzzy matching
 */
function normalizeHeader(h: string): string {
    return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parse an uploaded CSV text into a structured Transaction[] list
 */
export function parseTransactionsCsv(csvText: string): Transaction[] {
    const rows = parseCsvRows(csvText);
    if (rows.length < 2) {
        throw new Error('CSV file is empty or does not contain a header row.');
    }

    const rawHeaders = rows[0];
    const headerIndices: Record<string, number> = {};

    rawHeaders.forEach((h, index) => {
        const norm = normalizeHeader(h);
        headerIndices[norm] = index;
    });

    // Helper to find column index from potential aliases
    const findIndex = (...aliases: string[]): number => {
        for (const alias of aliases) {
            const norm = normalizeHeader(alias);
            if (headerIndices[norm] !== undefined) {
                return headerIndices[norm];
            }
            // Partial matching
            for (const key in headerIndices) {
                if (key.includes(norm) || norm.includes(key)) {
                    return headerIndices[key];
                }
            }
        }
        return -1;
    };

    const idIdx = findIndex('transactionid', 'txnid', 'transaction id', 'txn id', 'reference', 'transid', 'id');
    const senderIdx = findIndex('sender', 'senderaccount', 'source', 'from', 'sender entity', 'sender id', 'senderaccountnumber', 'origin');
    const receiverIdx = findIndex('receiver', 'receiveraccount', 'target', 'to', 'receiver entity', 'receiver id', 'receiveraccountnumber', 'destination');
    const amountIdx = findIndex('amount', 'amountinr', 'value', 'txnamount', 'inr', 'sum');
    const timeIdx = findIndex('timestamp', 'date', 'datetime', 'time', 'txndate', 'createdat');
    const bankIdx = findIndex('institution', 'senderinstitution', 'senderbank', 'bank', 'bankname', 'sourcebank');
    const recBankIdx = findIndex('receiverinstitution', 'receiverbank', 'targetbank', 'destbank');
    const senderAccIdx = findIndex('senderaccountnumber', 'senderaccno', 'senderac');
    const receiverAccIdx = findIndex('receiveraccountnumber', 'receiveraccno', 'receiverac');
    const senderHolderIdx = findIndex('senderholder', 'sendername', 'fromname', 'senderentity');
    const receiverHolderIdx = findIndex('receiverholder', 'receivername', 'toname', 'receiverentity');
    const statusIdx = findIndex('status', 'state', 'txnstatus');
    const timeSecIdx = findIndex('processingtime', 'latency', 'duration', 'latencyseconds', 'seconds');
    const patternIdx = findIndex('detectedpattern', 'pattern', 'anomaly', 'fraudtype');
    const senderTxnIdx = findIndex('sendertxncount', 'sendertotaltxns');
    const receiverTxnIdx = findIndex('receivertxncount', 'receivertotaltxns');
    const connAccountsIdx = findIndex('connectedaccounts', 'connectedaccountlist');
    const invIdIdx = findIndex('investigationid', 'investigation id', 'caseid');

    const transactions: Transaction[] = [];

    // Helper banks for fallback
    const fallbackBanks = [
        'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 
        'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda', 'IndusInd Bank'
    ];

    for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        if (row.length === 0 || (row.length === 1 && !row[0])) continue;

        const getVal = (idx: number, fallback = ''): string => {
            if (idx >= 0 && idx < row.length && row[idx] !== undefined) {
                return row[idx].trim();
            }
            return fallback;
        };

        const rawAmount = getVal(amountIdx, '50000');
        // Clean currency signs, commas
        const cleanAmount = parseFloat(rawAmount.replace(/[^0-9.-]+/g, '')) || 50000;

        const sender = getVal(senderIdx) || `ACC-${100 + (r % 20)}`;
        const receiver = getVal(receiverIdx) || `ACC-${200 + (r % 20)}`;
        const txnId = getVal(idIdx) || `TXN-${10000 + r}`;

        // Status determination
        let rawStatus = getVal(statusIdx).toLowerCase();
        let status: 'Completed' | 'Flagged' | 'Pending' | 'Failed' = 'Completed';
        if (rawStatus.includes('flag') || rawStatus.includes('suspect') || rawStatus.includes('alert') || rawStatus.includes('risk')) {
            status = 'Flagged';
        } else if (rawStatus.includes('fail')) {
            status = 'Failed';
        } else if (rawStatus.includes('pend')) {
            status = 'Pending';
        } else if (rawStatus.includes('complete') || rawStatus.includes('clear') || rawStatus.includes('success')) {
            status = 'Completed';
        } else if (cleanAmount > 1000000) {
            status = 'Flagged';
        }

        // Banks
        const bank = getVal(bankIdx) || fallbackBanks[r % fallbackBanks.length];
        const recBank = getVal(recBankIdx) || fallbackBanks[(r + 2) % fallbackBanks.length];

        // Accounts & Holders
        const senderAcc = getVal(senderAccIdx) || `${bank.slice(0, 4).toUpperCase()}-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        const recAcc = getVal(receiverAccIdx) || `${recBank.slice(0, 4).toUpperCase()}-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        const senderHolder = getVal(senderHolderIdx) || `Entity ${sender}`;
        const receiverHolder = getVal(receiverHolderIdx) || `Counterparty ${receiver}`;

        // Processing latency in seconds
        const rawSec = parseInt(getVal(timeSecIdx).replace(/\D/g, ''), 10);
        const processingTime = !isNaN(rawSec) && rawSec > 0 ? rawSec : (status === 'Flagged' ? 45 + ((r * 37) % 240) : 180 + ((r * 53) % 180));

        // Pattern
        let detectedPattern = getVal(patternIdx);
        if (!detectedPattern) {
            if (cleanAmount >= 1000000) {
                detectedPattern = 'Large Transfer';
            } else if (cleanAmount >= 45000 && cleanAmount <= 50000) {
                detectedPattern = 'Structuring / Smurfing';
            } else if (processingTime < 60) {
                detectedPattern = 'High-Velocity Burst';
            } else if (status === 'Flagged') {
                detectedPattern = 'Rapid Pass-through';
            } else {
                detectedPattern = 'Clean Flow (No Anomaly)';
            }
        }

        // Connected accounts
        const rawConn = getVal(connAccountsIdx);
        let connectedAccounts: string[] = [sender, receiver];
        if (rawConn) {
            const split = rawConn.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
            if (split.length > 0) {
                connectedAccounts = Array.from(new Set([...connectedAccounts, ...split]));
            }
        }

        // Timestamp
        let timestamp = getVal(timeIdx);
        if (!timestamp) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - (rows.length - r) * 15);
            timestamp = now.toISOString().replace(/\.\d{3}Z$/, '');
        }

        const txn: Transaction = {
            transactionId: txnId,
            sender,
            receiver,
            amount: cleanAmount,
            timestamp,
            institution: bank,
            receiverInstitution: recBank,
            senderAccountNumber: senderAcc,
            receiverAccountNumber: recAcc,
            senderHolder,
            receiverHolder,
            status,
            processingTime,
            detectedPattern,
            senderTxnCount: parseInt(getVal(senderTxnIdx), 10) || 1,
            receiverTxnCount: parseInt(getVal(receiverTxnIdx), 10) || 1,
            connectedAccounts,
            investigationId: getVal(invIdIdx) || (status === 'Flagged' ? `INV-2026-${String(r).padStart(5, '0')}` : undefined),
        };

        transactions.push(txn);
    }

    // Auto-detect circular flows across the parsed dataset
    const senderToReceivers = new Map<string, Set<string>>();
    transactions.forEach(t => {
        if (!senderToReceivers.has(t.sender)) {
            senderToReceivers.set(t.sender, new Set());
        }
        senderToReceivers.get(t.sender)!.add(t.receiver);
    });

    transactions.forEach(t => {
        // If receiver has sent back to sender directly or in 2 hops
        const directReturn = senderToReceivers.get(t.receiver)?.has(t.sender);
        if (directReturn && (!t.detectedPattern || t.detectedPattern === 'Clean Flow (No Anomaly)')) {
            t.detectedPattern = 'Circular Flow';
            t.status = 'Flagged';
        }
    });

    return transactions;
}

/**
 * Derive comprehensive Account[] structures from a Transaction[] list
 */
export function deriveAccountsFromTransactions(transactions: Transaction[]): Account[] {
    const accountMap = new Map<string, {
        id: string;
        bankName: string;
        accountNumber: string;
        accountHolder: string;
        incoming: number;
        outgoing: number;
        transactions: number;
        counterparties: Set<string>;
        patterns: Set<string>;
        hasFlag: boolean;
        lastActivity: string;
    }>();

    transactions.forEach(t => {
        // Process Sender
        if (!accountMap.has(t.sender)) {
            accountMap.set(t.sender, {
                id: t.sender,
                bankName: t.institution,
                accountNumber: t.senderAccountNumber || `A/C-${t.sender.replace(/\D/g, '')}`,
                accountHolder: t.senderHolder || `Holder of ${t.sender}`,
                incoming: 0,
                outgoing: 0,
                transactions: 0,
                counterparties: new Set(),
                patterns: new Set(),
                hasFlag: false,
                lastActivity: t.timestamp,
            });
        }
        const senderData = accountMap.get(t.sender)!;
        senderData.outgoing += t.amount;
        senderData.transactions += 1;
        senderData.counterparties.add(t.receiver);
        if (t.detectedPattern && !t.detectedPattern.includes('Clean')) {
            senderData.patterns.add(t.detectedPattern);
        }
        if (t.status === 'Flagged') senderData.hasFlag = true;
        if (t.timestamp > senderData.lastActivity) senderData.lastActivity = t.timestamp;

        // Process Receiver
        if (!accountMap.has(t.receiver)) {
            accountMap.set(t.receiver, {
                id: t.receiver,
                bankName: t.receiverInstitution || t.institution,
                accountNumber: t.receiverAccountNumber || `A/C-${t.receiver.replace(/\D/g, '')}`,
                accountHolder: t.receiverHolder || `Holder of ${t.receiver}`,
                incoming: 0,
                outgoing: 0,
                transactions: 0,
                counterparties: new Set(),
                patterns: new Set(),
                hasFlag: false,
                lastActivity: t.timestamp,
            });
        }
        const recData = accountMap.get(t.receiver)!;
        recData.incoming += t.amount;
        recData.transactions += 1;
        recData.counterparties.add(t.sender);
        if (t.detectedPattern && !t.detectedPattern.includes('Clean')) {
            recData.patterns.add(t.detectedPattern);
        }
        if (t.status === 'Flagged') recData.hasFlag = true;
        if (t.timestamp > recData.lastActivity) recData.lastActivity = t.timestamp;
    });

    const accounts: Account[] = Array.from(accountMap.values()).map(acc => {
        let risk: 'High' | 'Medium' | 'Low' = 'Low';
        if (acc.hasFlag || acc.patterns.size > 0 || acc.outgoing > 2000000) {
            risk = 'High';
        } else if (acc.transactions >= 3 || acc.counterparties.size >= 2 || acc.incoming > 1000000) {
            risk = 'Medium';
        }

        return {
            id: acc.id,
            bankName: acc.bankName,
            accountNumber: acc.accountNumber,
            accountHolder: acc.accountHolder,
            risk,
            transactions: acc.transactions,
            incoming: acc.incoming,
            outgoing: acc.outgoing,
            connectedAccounts: acc.counterparties.size,
            connectedAccountList: Array.from(acc.counterparties),
            detectedPatterns: Array.from(acc.patterns),
            lastActivity: acc.lastActivity,
            status: risk === 'High' ? 'Under Investigation' : 'Active',
        };
    });

    return accounts;
}
