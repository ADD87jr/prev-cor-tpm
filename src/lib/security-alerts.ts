/**
 * Security email alerts for suspicious events
 * Sends email notifications to admin for security-relevant events
 */

import { sendEmail } from "@/app/utils/email";

const SECURITY_EMAIL = process.env.SECURITY_ALERT_EMAIL || process.env.CONTACT_EMAIL || "admin@example.com";

interface SecurityAlertOptions {
  type: "login_failed" | "login_success" | "password_change" | "backup" | "restore" | "reset_data" | "rate_limit" | "suspicious_activity";
  details: string;
  ipAddress?: string;
  userAgent?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Send security alert email to admin
 */
export async function sendSecurityAlert(options: SecurityAlertOptions): Promise<void> {
  const { type, details, ipAddress, userAgent, additionalInfo } = options;

  const alertTitles: Record<string, string> = {
    login_failed: "⚠️ Încercare eșuată de autentificare admin",
    login_success: "✅ Autentificare admin reușită",
    password_change: "🔐 Parolă schimbată",
    backup: "💾 Backup creat",
    restore: "🔄 Date restaurate din backup",
    reset_data: "🗑️ Date resetate",
    rate_limit: "🚫 Rate limit depășit",
    suspicious_activity: "🚨 Activitate suspectă detectată",
  };

  const subject = `[SECURITATE] ${alertTitles[type] || "Alertă securitate"}`;
  
  const timestamp = new Date().toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" });
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa; border-radius: 8px;">
      <h2 style="color: ${type.includes("failed") || type === "suspicious_activity" ? "#dc3545" : "#28a745"}; margin-bottom: 20px;">
        ${alertTitles[type] || "Alertă securitate"}
      </h2>
      
      <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="margin: 0 0 10px 0;"><strong>Detalii:</strong></p>
        <p style="margin: 0; color: #333;">${details}</p>
      </div>
      
      <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
        <p style="margin: 0 0 5px 0;"><strong>Timestamp:</strong> ${timestamp}</p>
        ${ipAddress ? `<p style="margin: 0 0 5px 0;"><strong>IP Address:</strong> ${ipAddress}</p>` : ""}
        ${userAgent ? `<p style="margin: 0 0 5px 0;"><strong>User Agent:</strong> ${userAgent}</p>` : ""}
      </div>
      
      ${additionalInfo ? `
        <div style="background: white; padding: 15px; border-radius: 6px;">
          <p style="margin: 0 0 10px 0;"><strong>Informații suplimentare:</strong></p>
          <pre style="margin: 0; background: #f1f1f1; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(additionalInfo, null, 2)}
          </pre>
        </div>
      ` : ""}
      
      <p style="margin-top: 20px; color: #666; font-size: 12px;">
        Acest email a fost trimis automat de sistemul de securitate PREV-COR TPM.
      </p>
    </div>
  `;

  try {
    await sendEmail({
      to: SECURITY_EMAIL,
      subject,
      html,
      text: `${alertTitles[type]}\n\nDetalii: ${details}\nTimestamp: ${timestamp}\nIP: ${ipAddress || "N/A"}\nUser Agent: ${userAgent || "N/A"}`,
    });
    console.log(`[SECURITY ALERT] Email sent: ${type}`);
  } catch (error) {
    console.error("[SECURITY ALERT] Failed to send email:", error);
  }
}

/**
 * Alert for multiple failed login attempts
 */
export async function alertMultipleFailedLogins(ip: string, attempts: number, userAgent?: string): Promise<void> {
  if (attempts >= 3) {
    await sendSecurityAlert({
      type: "login_failed",
      details: `${attempts} încercări eșuate de autentificare de la IP: ${ip}`,
      ipAddress: ip,
      userAgent,
      additionalInfo: { attempts, threshold: 3 },
    });
  }
}

/**
 * Alert for successful admin login
 */
export async function alertAdminLogin(ip: string, userAgent?: string): Promise<void> {
  await sendSecurityAlert({
    type: "login_success",
    details: "Autentificare admin reușită",
    ipAddress: ip,
    userAgent,
  });
}

/**
 * Alert for password change
 */
export async function alertPasswordChange(userEmail: string, ip: string): Promise<void> {
  await sendSecurityAlert({
    type: "password_change",
    details: `Parola a fost schimbată pentru utilizatorul: ${userEmail}`,
    ipAddress: ip,
    additionalInfo: { userEmail },
  });
}

/**
 * Alert for backup/restore operations
 */
export async function alertBackupOperation(operation: "backup" | "restore" | "reset_data", ip: string, details?: string): Promise<void> {
  await sendSecurityAlert({
    type: operation,
    details: details || `Operațiune ${operation} executată`,
    ipAddress: ip,
  });
}

/**
 * Alert for rate limit exceeded
 */
export async function alertRateLimitExceeded(ip: string, endpoint: string): Promise<void> {
  await sendSecurityAlert({
    type: "rate_limit",
    details: `Rate limit depășit pe endpoint: ${endpoint}`,
    ipAddress: ip,
    additionalInfo: { endpoint },
  });
}
