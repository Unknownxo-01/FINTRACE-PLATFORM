import { Investigation, Account, Transaction } from '../types';

/* ─────────────────────────────────────────────────────────────────
   FINTRACE – PDF Report Generator
   Opens a styled print-ready HTML page in a new window and
   triggers window.print() so the user can save as PDF.
───────────────────────────────────────────────────────────────── */

function fmt(n: number) {
    return `₹${(n / 100000).toFixed(2)}L`;
}

function riskColor(risk: string): string {
    if (risk === 'High') return '#ef4444';
    if (risk === 'Medium') return '#f59e0b';
    return '#22c55e';
}

function statusColor(status: string): string {
    if (status === 'Flagged') return '#ef4444';
    if (status === 'Pending') return '#f59e0b';
    if (status === 'Completed') return '#22c55e';
    return '#94a3b8';
}

function escapeHtml(str: string): string {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function generatePdfReport(
    investigation: Investigation,
    involvedAccounts: Account[],
    involvedTransactions: Transaction[]
): void {
    const now = new Date();
    const reportDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    const reportTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const highRiskAccounts = involvedAccounts.filter(a => a.risk === 'High');
    const totalIncoming = involvedAccounts.reduce((s, a) => s + a.incoming, 0);
    const totalOutgoing = involvedAccounts.reduce((s, a) => s + a.outgoing, 0);
    const netFlow = totalIncoming - totalOutgoing;

    /* ── Account Rows are inlined in the template below ── */

    /* ── Transaction Rows ── */
    const txnRows = involvedTransactions.map((txn, i) => {
        const ts = new Date(txn.timestamp);
        const dateStr = ts.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        return `
        <tr>
            <td class="small mono">${i + 1}</td>
            <td class="mono small">${escapeHtml(txn.transactionId)}</td>
            <td class="mono">${escapeHtml(txn.sender)}</td>
            <td class="center">→</td>
            <td class="mono">${escapeHtml(txn.receiver)}</td>
            <td class="num">${escapeHtml(String(txn.amount.toLocaleString('en-IN')))}</td>
            <td class="small">${dateStr}</td>
            <td class="small mono">${timeStr}</td>
            <td><span class="badge" style="background:${statusColor(txn.status)}22;color:${statusColor(txn.status)};border:1px solid ${statusColor(txn.status)}44">${escapeHtml(txn.status)}</span></td>
            <td class="small">${escapeHtml(txn.detectedPattern || '—')}</td>
        </tr>`;
    }).join('');

    /* ── Risk Indicator Bullets ── */
    const riskIndicators: string[] = [];
    if (highRiskAccounts.length > 0) {
        riskIndicators.push(`<li><strong>High-risk accounts present:</strong> ${highRiskAccounts.map(a => a.id).join(', ')} flagged as High Risk.</li>`);
    }
    if (totalOutgoing > totalIncoming) {
        riskIndicators.push(`<li><strong>Net outflow detected:</strong> Outgoing exceeds incoming by ${fmt(totalOutgoing - totalIncoming)}.</li>`);
    }
    if (involvedTransactions.length > 0) {
        riskIndicators.push(`<li><strong>Active transaction links:</strong> ${involvedTransactions.length} transaction(s) found connecting these nodes.</li>`);
    }
    if (investigation.accounts.length >= 3) {
        riskIndicators.push(`<li><strong>Multi-hop network:</strong> ${investigation.accounts.length} accounts form a multi-hop cluster — indicative of layering.</li>`);
    }
    const riskListHtml = riskIndicators.length > 0 ? `<ul>${riskIndicators.join('')}</ul>` : '<p>No automatic risk signals detected. Review accounts manually.</p>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>FINTRACE Forensic Report – ${escapeHtml(investigation.id)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --primary: #00d4ff;
    --danger:  #ef4444;
    --warning: #f59e0b;
    --success: #22c55e;
    --dark:    #07111f;
    --mid:     #0d1e30;
    --border:  #1e3048;
    --text:    #e2e8f0;
    --muted:   #64748b;
  }

  body {
    font-family: 'Inter', sans-serif;
    background: #ffffff;
    color: #1e293b;
    font-size: 10pt;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  /* ── Page Layout ── */
  .page { max-width: 900px; margin: 0 auto; padding: 32px 36px; }

  /* ── Cover Header ── */
  .cover-header {
    background: linear-gradient(135deg, #07111f 0%, #0d2137 50%, #07111f 100%);
    color: white;
    padding: 36px 40px;
    border-radius: 12px;
    margin-bottom: 28px;
    position: relative;
    overflow: hidden;
  }
  .cover-header::before {
    content: '';
    position: absolute; top: 0; right: 0; width: 280px; height: 100%;
    background: radial-gradient(ellipse at top right, rgba(0,212,255,0.12) 0%, transparent 70%);
  }
  .cover-header .brand {
    font-size: 11pt; font-weight: 600; color: #00d4ff;
    letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 16px;
    display: flex; align-items: center; gap: 8px;
  }
  .cover-header .brand::before {
    content: '■';
    font-size: 8pt; color: #00d4ff;
  }
  .cover-header h1 {
    font-size: 26pt; font-weight: 300; color: #ffffff; letter-spacing: -0.02em;
    margin-bottom: 6px;
  }
  .cover-header .subtitle {
    font-size: 10pt; color: rgba(255,255,255,0.5); font-weight: 400;
  }
  .cover-header .meta-row {
    display: flex; gap: 28px; margin-top: 20px; flex-wrap: wrap;
  }
  .cover-header .meta-item { font-size: 9pt; color: rgba(255,255,255,0.6); }
  .cover-header .meta-item strong { color: rgba(255,255,255,0.9); display: block; font-size: 10pt; }
  .cover-header .status-chip {
    display: inline-block; padding: 4px 14px; border-radius: 20px;
    background: rgba(0,212,255,0.15); border: 1px solid rgba(0,212,255,0.3);
    color: #00d4ff; font-size: 9pt; font-weight: 600; letter-spacing: 0.04em;
    margin-top: 4px;
  }

  /* ── KPI Grid ── */
  .kpi-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;
    margin-bottom: 28px;
  }
  .kpi-card {
    border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px;
    background: #f8fafc;
  }
  .kpi-card .kpi-label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
  .kpi-card .kpi-value { font-size: 18pt; font-weight: 700; line-height: 1.1; }
  .kpi-card .kpi-sub   { font-size: 8pt; color: #94a3b8; margin-top: 2px; }

  /* ── Section ── */
  .section { margin-bottom: 28px; }
  .section-title {
    font-size: 12pt; font-weight: 600; color: #0f172a;
    padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;
    margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
  }
  .section-title .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #00d4ff; flex-shrink: 0;
  }

  /* ── Summary Box ── */
  .summary-box {
    background: #f8fafc; border: 1px solid #e2e8f0;
    border-left: 4px solid #00d4ff;
    border-radius: 8px; padding: 18px 20px;
    font-size: 10pt; line-height: 1.75; color: #334155;
  }
  .summary-box .highlight { color: #0f172a; font-weight: 600; }
  .summary-box .pattern   { color: #d97706; font-weight: 600; }
  .summary-box .danger    { color: #dc2626; font-weight: 600; }

  /* ── Flow Stats ── */
  .flow-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 14px; }
  .flow-item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; background: #fff; }
  .flow-item .fl-label { font-size: 8pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .flow-item .fl-value { font-size: 14pt; font-weight: 700; }

  /* ── Risk Indicators ── */
  .risk-box {
    background: #fefce8; border: 1px solid #fde68a;
    border-left: 4px solid #f59e0b;
    border-radius: 8px; padding: 16px 20px;
  }
  .risk-box ul { padding-left: 18px; }
  .risk-box ul li { font-size: 9.5pt; color: #451a03; line-height: 1.7; }

  /* ── Tables ── */
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  thead tr { background: #0f172a; color: #ffffff; }
  thead th { padding: 9px 10px; text-align: left; font-weight: 600; font-size: 8pt;
    text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tbody tr:hover { background: #f1f5f9; }
  td { padding: 8px 10px; vertical-align: middle; }
  .mono  { font-family: 'JetBrains Mono', monospace; font-size: 8.5pt; }
  .num   { text-align: right; font-family: 'JetBrains Mono', monospace; }
  .center { text-align: center; color: #94a3b8; }
  .small { font-size: 8pt; color: #475569; }
  .green { color: #16a34a; }
  .red   { color: #dc2626; }

  .badge {
    display: inline-block; padding: 2px 8px;
    border-radius: 4px; font-size: 8pt; font-weight: 600;
    white-space: nowrap;
  }

  /* ── Footer ── */
  .report-footer {
    margin-top: 32px; padding-top: 16px;
    border-top: 1px solid #e2e8f0;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 8pt; color: #94a3b8;
  }
  .report-footer .brand-stamp { font-weight: 700; color: #64748b; letter-spacing: 0.05em; }

  /* ── Watermark (appears on print only) ── */
  @media print {
    body { background: #fff; }
    .page { padding: 20px 28px; }
    .cover-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    @page {
      size: A4;
      margin: 12mm 14mm;
    }
    h2, .section { page-break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }

  /* ── Print Button ── */
  .print-btn-bar {
    position: fixed; top: 16px; right: 16px; z-index: 999;
    display: flex; gap: 10px;
  }
  .btn {
    padding: 10px 22px; border-radius: 8px; font-size: 10pt; font-weight: 600;
    cursor: pointer; border: none; transition: all 0.15s;
  }
  .btn-primary { background: #00d4ff; color: #07111f; }
  .btn-primary:hover { background: #38e8ff; }
  .btn-ghost { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
  .btn-ghost:hover { background: #e2e8f0; }
</style>
</head>
<body>

<!-- Print Controls (hidden on print) -->
<div class="print-btn-bar no-print">
  <button class="btn btn-ghost" onclick="window.close()">✕ Close</button>
  <button class="btn btn-primary" onclick="window.print()">⬇ Save as PDF / Print</button>
</div>

<div class="page">

  <!-- ─── COVER HEADER ─── -->
  <div class="cover-header">
    <div class="brand">FINTRACE · Financial Forensics OS</div>
    <h1>${escapeHtml(investigation.id)}</h1>
    <div class="subtitle">AML Forensic Investigation Report &nbsp;·&nbsp; Confidential</div>
    <div class="meta-row">
      <div class="meta-item">
        <strong>Case Status</strong>
        <span class="status-chip">${escapeHtml(investigation.status)}</span>
      </div>
      <div class="meta-item">
        <strong>Detected Pattern</strong>
        ${escapeHtml(investigation.pattern)}
      </div>
      <div class="meta-item">
        <strong>Risk Level</strong>
        <span style="color:${riskColor(investigation.risk)};font-weight:700;font-size:11pt">${escapeHtml(investigation.risk)}</span>
      </div>
      <div class="meta-item">
        <strong>Report Generated</strong>
        ${reportDate} &nbsp; ${reportTime}
      </div>
      <div class="meta-item">
        <strong>Investigator</strong>
        Agent Sharma – Lead AML Investigator
      </div>
    </div>
  </div>

  <!-- ─── KPI GRID ─── -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Risk Level</div>
      <div class="kpi-value" style="color:${riskColor(investigation.risk)}">${escapeHtml(investigation.risk)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Involved Nodes</div>
      <div class="kpi-value">${investigation.accounts.length}</div>
      <div class="kpi-sub">accounts in cluster</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Value at Risk</div>
      <div class="kpi-value" style="color:#dc2626">${fmt(investigation.amount)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Transactions Traced</div>
      <div class="kpi-value">${involvedTransactions.length}</div>
      <div class="kpi-sub">linked transfers</div>
    </div>
  </div>

  <!-- ─── INVESTIGATION SUMMARY ─── -->
  <div class="section">
    <div class="section-title"><span class="dot"></span>Investigation Summary</div>
    <div class="summary-box">
      Anomalous network activity detected on <span class="highlight">${escapeHtml(investigation.date)}</span>.
      The system identified a potential <span class="pattern">${escapeHtml(investigation.pattern)}</span> pattern
      involving <span class="highlight">${investigation.accounts.length}</span> connected accounts.
      ${highRiskAccounts.length > 0 ? `Of these, <span class="danger">${highRiskAccounts.length}</span> account(s) are flagged as <strong>High Risk</strong>.` : ''}
      The total estimated value of suspicious activity across all nodes amounts to
      <span class="danger">${fmt(investigation.amount)}</span>.
    </div>

    <div class="flow-grid">
      <div class="flow-item">
        <div class="fl-label">Total Incoming</div>
        <div class="fl-value" style="color:#16a34a">${fmt(totalIncoming)}</div>
      </div>
      <div class="flow-item">
        <div class="fl-label">Total Outgoing</div>
        <div class="fl-value" style="color:#dc2626">${fmt(totalOutgoing)}</div>
      </div>
      <div class="flow-item">
        <div class="fl-label">Net Flow</div>
        <div class="fl-value" style="color:${netFlow >= 0 ? '#16a34a' : '#dc2626'}">${netFlow >= 0 ? '+' : ''}${fmt(Math.abs(netFlow))}</div>
      </div>
    </div>
  </div>

  <!-- ─── RISK INDICATORS ─── -->
  <div class="section">
    <div class="section-title"><span class="dot" style="background:#f59e0b"></span>Risk Indicators</div>
    <div class="risk-box">
      ${riskListHtml}
    </div>
  </div>

  <!-- ─── ACCOUNT NODES TABLE ─── -->
  ${involvedAccounts.length > 0 ? `
  <div class="section">
    <div class="section-title"><span class="dot" style="background:#a855f7"></span>Involved Account Nodes (${involvedAccounts.length})</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Account ID</th>
          <th>Risk</th>
          <th style="text-align:right">Incoming</th>
          <th style="text-align:right">Outgoing</th>
          <th style="text-align:right">Txns</th>
          <th>Status</th>
          <th>Detected Patterns</th>
        </tr>
      </thead>
      <tbody>
        ${involvedAccounts.map((acc, i) => `
        <tr>
          <td class="small" style="color:#94a3b8">${i + 1}</td>
          <td class="mono">${escapeHtml(acc.id)}</td>
          <td><span class="badge" style="background:${riskColor(acc.risk)}22;color:${riskColor(acc.risk)};border:1px solid ${riskColor(acc.risk)}44">${escapeHtml(acc.risk)}</span></td>
          <td class="num green">${fmt(acc.incoming)}</td>
          <td class="num red">${fmt(acc.outgoing)}</td>
          <td class="num">${acc.transactions}</td>
          <td class="small">${escapeHtml(acc.status || 'Active')}</td>
          <td class="small">${(acc.detectedPatterns || []).join(', ') || '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>` : ''}

  <!-- ─── TRANSACTION LOG TABLE ─── -->
  ${involvedTransactions.length > 0 ? `
  <div class="section">
    <div class="section-title"><span class="dot" style="background:#22c55e"></span>Transaction Log (${involvedTransactions.length} Records)</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>TXN ID</th>
          <th>Sender</th>
          <th></th>
          <th>Receiver</th>
          <th style="text-align:right">Amount (₹)</th>
          <th>Date</th>
          <th>Time (24h)</th>
          <th>Status</th>
          <th>Pattern</th>
        </tr>
      </thead>
      <tbody>
        ${txnRows}
      </tbody>
    </table>
  </div>` : ''}

  <!-- ─── LEGAL FOOTER ─── -->
  <div class="report-footer">
    <div>
      <span class="brand-stamp">FINTRACE AML-X</span> &nbsp;|&nbsp;
      Financial Forensics OS &nbsp;|&nbsp; Confidential – For Authorized Personnel Only
    </div>
    <div>
      Report ID: RPT-${escapeHtml(investigation.id)}-${Date.now().toString(36).toUpperCase()} &nbsp;|&nbsp; ${reportDate}
    </div>
  </div>

</div><!-- /page -->

<script>
  // Auto-focus the print dialog on load (can be removed if too aggressive)
  // window.addEventListener('load', () => window.print());
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1050,height=820,scrollbars=yes');
    if (!win) {
        alert('Popup blocked. Please allow pop-ups for this site and try again.');
        return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
}
