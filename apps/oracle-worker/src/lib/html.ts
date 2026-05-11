import type { ReserveReport } from "./types";

const WARNING_TEXT =
  "Prototype dashboard. No authentication is enabled. Anyone with the URL can edit this data.";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toDisplayReport = (report: ReserveReport | null): ReserveReport =>
  report ?? {
    reportId: "uninitialized",
    grossAssetValueUSD: "0",
    liabilitiesUSD: "0",
    feesUSD: "0",
    adjustedOffchainReserveUSD: "0",
    grossAssetValueUSD18: "0",
    liabilitiesUSD18: "0",
    feesUSD18: "0",
    adjustedOffchainReserveUSD18: "0",
    reserveValid: false,
    note: "No report has been initialized yet.",
    currency: "USD",
    decimals: 18,
    updatedAt: 0,
    attestationHash: "-",
  };

const renderAdminPage = (
  report: ReserveReport | null,
  message?: string,
): string => {
  const displayReport = toDisplayReport(report);
  const formReportId = report?.reportId ?? "manual-rwa-report-001";
  const isError = message?.toLowerCase().startsWith("update failed");
  const messageBlock = message
    ? `<div class="message ${isError ? "message--error" : "message--success"}">${escapeHtml(
        message,
      )}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>RWA Oracle Admin</title>
    <style>
      body { font-family: "IBM Plex Sans", "Segoe UI", sans-serif; margin: 0; background: #18181b; color: #e4e4e7; }
      main { max-width: 960px; margin: 0 auto; padding: 40px 24px 64px; }
      h1 { font-size: 32px; margin-bottom: 8px; }
      .warning { color: #fca5a5; font-weight: 600; margin-top: 32px; }
      .card { background: #27272a; border: 1px solid #3f3f46; border-radius: 12px; padding: 24px; margin-top: 24px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); column-gap: 24px; row-gap: 8px; }
      label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; color: #a1a1aa; }
      input, textarea, select { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #52525b; background: #18181b; color: #e4e4e7; }
      textarea { min-height: 90px; }
      .form-grid { column-gap: 28px; row-gap: 10px; }
      .field { display: flex; flex-direction: column; gap: 8px; }
      button { padding: 12px 18px; border-radius: 8px; border: none; background: #d4d4d8; color: #18181b; font-weight: 700; cursor: pointer; }
      button:hover { background: #fafafa; }
      .meta { font-size: 14px; color: #a1a1aa; }
      .key { font-family: "IBM Plex Mono", "SFMono-Regular", monospace; font-size: 13px; }
      .message { margin-top: 16px; padding: 12px 16px; border-radius: 8px; font-weight: 600; }
      .message--success { background: #14532d; color: #dcfce7; }
      .message--error { background: #7f1d1d; color: #fee2e2; }
    </style>
  </head>
  <body>
    <main>
      <h1>RWA Oracle Admin</h1>
      <p class="meta">Latest reserve report and update form.</p>
      ${messageBlock}
      <section class="card">
        <h2>Latest Report</h2>
        <div class="grid">
          <div><label>Report ID</label><div class="key">${escapeHtml(displayReport.reportId)}</div></div>
          <div><label>Updated At</label><div class="key">${escapeHtml(displayReport.updatedAt.toString())}</div></div>
          <div><label>Reserve Valid</label><div class="key">${escapeHtml(displayReport.reserveValid ? "true" : "false")}</div></div>
          <div><label>Currency</label><div class="key">${escapeHtml(displayReport.currency)}</div></div>
          <div><label>Gross Asset Value (USD)</label><div class="key">${escapeHtml(displayReport.grossAssetValueUSD)}</div></div>
          <div><label>Liabilities (USD)</label><div class="key">${escapeHtml(displayReport.liabilitiesUSD)}</div></div>
          <div><label>Fees (USD)</label><div class="key">${escapeHtml(displayReport.feesUSD)}</div></div>
          <div><label>Adjusted Offchain Reserve (USD)</label><div class="key">${escapeHtml(displayReport.adjustedOffchainReserveUSD)}</div></div>
        </div>
        <div style="margin-top: 16px;"><label>Note</label><div class="key">${escapeHtml(displayReport.note)}</div></div>
        <div style="margin-top: 16px;"><label>Attestation Hash</label><div class="key">${escapeHtml(displayReport.attestationHash)}</div></div>
      </section>
      <section class="card">
        <h2>Update Report</h2>
        <form method="post" action="/admin/update">
          <div class="grid form-grid">
            <div class="field">
              <label for="reportId">Report ID</label>
              <input id="reportId" name="reportId" value="${escapeHtml(formReportId)}" required />
            </div>
            <div class="field">
              <label for="grossAssetValueUSD">Gross Asset Value (USD)</label>
              <input id="grossAssetValueUSD" name="grossAssetValueUSD" value="${escapeHtml(
                displayReport.grossAssetValueUSD,
              )}" required />
            </div>
            <div class="field">
              <label for="liabilitiesUSD">Liabilities (USD)</label>
              <input id="liabilitiesUSD" name="liabilitiesUSD" value="${escapeHtml(
                displayReport.liabilitiesUSD,
              )}" required />
            </div>
            <div class="field">
              <label for="feesUSD">Fees (USD)</label>
              <input id="feesUSD" name="feesUSD" value="${escapeHtml(displayReport.feesUSD)}" required />
            </div>
            <div class="field">
              <label for="reserveValid">Reserve Valid</label>
              <select id="reserveValid" name="reserveValid" required>
                <option value="true" ${displayReport.reserveValid ? "selected" : ""}>true</option>
                <option value="false" ${displayReport.reserveValid ? "" : "selected"}>false</option>
              </select>
            </div>
          </div>
          <div style="margin-top: 16px;">
            <label for="note">Note</label>
            <textarea id="note" name="note">${escapeHtml(displayReport.note)}</textarea>
          </div>
          <div style="margin-top: 20px;">
            <button type="submit">Save report</button>
          </div>
        </form>
      </section>
      <div class="warning">${escapeHtml(WARNING_TEXT)}</div>
    </main>
  </body>
</html>`;
};

export { renderAdminPage };
