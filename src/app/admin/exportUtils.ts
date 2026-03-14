// Utilitar pentru export CSV/Excel
// Folosim import dinamic pentru a evita problemele cu SSR/client

export async function exportToCSV(data: any[], filename: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename.endsWith('.csv') ? filename : filename + ".csv", { bookType: "csv" });
}

export async function exportToExcel(data: any[], filename: string) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + ".xlsx", { bookType: "xlsx" });
}
