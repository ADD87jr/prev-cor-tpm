// Log simplu în memorie pentru acțiuni admin
let adminLog: { time: string; action: string; details?: string }[] = [];

export function addAdminLog(action: string, details?: string) {
  adminLog.unshift({ time: new Date().toISOString(), action, details });
  if (adminLog.length > 1000) adminLog.pop();
}

export function getAdminLog() {
  return adminLog;
}
