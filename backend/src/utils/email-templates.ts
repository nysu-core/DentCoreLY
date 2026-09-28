import { config } from "../config/env";

const { clinicName, appUrl } = { clinicName: config.email.clinicName, appUrl: config.appUrl };

function base(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body { margin:0; padding:0; background:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width:560px; margin:32px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header  { background:#07080b; padding:28px 32px; }
    .header h1 { color:#ffffff; margin:0; font-size:22px; font-weight:700; }
    .header p  { color:#94a3b8; margin:4px 0 0; font-size:13px; }
    .accent  { height:4px; background:#d7b735; }
    .body    { padding:32px; color:#0f172a; }
    .body h2 { font-size:18px; margin:0 0 12px; }
    .body p  { font-size:14px; line-height:1.6; color:#475569; margin:0 0 16px; }
    .btn     { display:inline-block; padding:12px 28px; background:#e4c43d; color:#171307 !important;
               border-radius:8px; text-decoration:none; font-weight:600; font-size:14px; margin:8px 0 20px; }
    .notice  { background:#fffcf0; border-left:3px solid #d7b735; padding:12px 16px; border-radius:0 6px 6px 0;
               font-size:13px; color:#475569; margin:20px 0; }
    .footer  { padding:20px 32px; background:#f8fafc; border-top:1px solid #e2e8f0;
               font-size:12px; color:#94a3b8; text-align:center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${clinicName}</h1>
      <p>Patient Management System</p>
    </div>
    <div class="accent"></div>
    <div class="body">${body}</div>
    <div class="footer">
      This email was sent by ${clinicName}.<br/>
      Please do not reply to this email.
    </div>
  </div>
</body>
</html>`;
}

// ── Registration received (sent immediately on self-register) ─────────────

export function registrationReceivedEmail(opts: { fullName: string; role: string }): string {
  return base(
    "Registration Received",
    `<h2>Hi ${opts.fullName},</h2>
    <p>Thank you for registering with <strong>${clinicName}</strong>.</p>
     <p>Your account request for the <strong>${opts.role}</strong> role is now pending administrator review. You will receive another email once your account has been reviewed.</p>
     <div class="notice">ℹ️ This process typically takes 1–2 business days. You will not be able to log in until your account is approved.</div>
     <p>If you did not register for this system, please ignore this email.</p>`
  );
}

// ── Account approved ──────────────────────────────────────────────────────

export function accountApprovedEmail(opts: { fullName: string; role: string; note?: string | null }): string {
  return base(
    "Account Approved — Orthodontics Department - Faculty of Dentistry - Benghazi",
    `<h2>Welcome, ${opts.fullName}! 🎉</h2>
    <p>Your <strong>${clinicName}</strong> account has been <strong style="color:#16a34a">approved</strong>. You can now log in and access the system.</p>
     ${opts.note ? `<div class="notice">💬 <strong>Note from administrator:</strong> ${opts.note}</div>` : ""}
     <p>Your assigned role is <strong>${opts.role}</strong>.</p>
    <a href="${appUrl}/login" class="btn">Log In to Orthodontics Department - Faculty of Dentistry - Benghazi →</a>
     <p style="font-size:12px;color:#94a3b8">If the button above does not work, copy this URL into your browser:<br/>${appUrl}/login</p>`
  );
}

// ── Account denied ────────────────────────────────────────────────────────

export function accountDeniedEmail(opts: { fullName: string; reason?: string | null }): string {
  return base(
    "Registration Update — Orthodontics Department - Faculty of Dentistry - Benghazi",
    `<h2>Hi ${opts.fullName},</h2>
    <p>We have reviewed your registration request for <strong>${clinicName}</strong> and unfortunately we are unable to approve your account at this time.</p>
     ${opts.reason ? `<div class="notice">💬 <strong>Reason:</strong> ${opts.reason}</div>` : ""}
     <p>If you believe this is a mistake or would like to discuss further, please contact your system administrator directly.</p>`
  );
}
