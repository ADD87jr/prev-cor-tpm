"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ro">
      <body>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          fontFamily: "system-ui, sans-serif"
        }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <h1 style={{ fontSize: "6rem", fontWeight: "bold", color: "#ef4444", marginBottom: "1rem" }}>
              500
            </h1>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#1f2937", marginBottom: "1rem" }}>
              Eroare de server
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
              Ne pare rău, a apărut o eroare neașteptată. Te rugăm să încerci din nou.
            </p>
            
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => reset()}
                style={{
                  backgroundColor: "#2563eb",
                  color: "white",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.5rem",
                  fontWeight: "600",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Încearcă din nou
              </button>
              <a 
                href="/"
                style={{
                  backgroundColor: "#e5e7eb",
                  color: "#1f2937",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.5rem",
                  fontWeight: "600",
                  textDecoration: "none"
                }}
              >
                Pagina principală
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
