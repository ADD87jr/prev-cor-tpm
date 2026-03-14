import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politica de Cookies | PREV-COR TPM",
  description: "Informații despre cookie-urile utilizate pe site-ul PREV-COR TPM și cum le puteți gestiona.",
};

export default function CookiePolicyPage() {
  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Politica de Cookies</h1>
      <p className="text-gray-500 text-sm mb-6">Ultima actualizare: 27 februarie 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Ce sunt cookie-urile?</h2>
        <p className="text-gray-700 leading-relaxed">
          Cookie-urile sunt fișiere text mici stocate pe dispozitivul dumneavoastră de către browser-ul web
          atunci când vizitați un site. Acestea permit site-ului să funcționeze eficient și să vă ofere
          o experiență personalizată.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Cookie-uri utilizate pe acest site</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left border-b">Cookie</th>
                <th className="p-3 text-left border-b">Tip</th>
                <th className="p-3 text-left border-b">Scop</th>
                <th className="p-3 text-left border-b">Durată</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3 font-mono text-xs">cookieConsent</td>
                <td className="p-3">Necesar</td>
                <td className="p-3">Stochează preferința de consimțământ pentru cookie-uri</td>
                <td className="p-3">365 zile</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-mono text-xs">next-auth.session-token</td>
                <td className="p-3">Necesar</td>
                <td className="p-3">Autentificarea utilizatorului (cont client)</td>
                <td className="p-3">Sesiune</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-mono text-xs">adminSession</td>
                <td className="p-3">Necesar</td>
                <td className="p-3">Sesiune administrator</td>
                <td className="p-3">30 zile</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-mono text-xs">_ga, _ga_*</td>
                <td className="p-3">Analitice</td>
                <td className="p-3">Google Analytics — statistici anonime despre folosirea site-ului</td>
                <td className="p-3">2 ani</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-mono text-xs">cart (localStorage)</td>
                <td className="p-3">Funcțional</td>
                <td className="p-3">Produsele adăugate în coșul de cumpărături</td>
                <td className="p-3">Persistent</td>
              </tr>
              <tr className="border-b">
                <td className="p-3 font-mono text-xs">wishlist (localStorage)</td>
                <td className="p-3">Funcțional</td>
                <td className="p-3">Lista de produse favorite</td>
                <td className="p-3">Persistent</td>
              </tr>
              <tr>
                <td className="p-3 font-mono text-xs">recentlyViewed (localStorage)</td>
                <td className="p-3">Funcțional</td>
                <td className="p-3">Produse vizualizate recent</td>
                <td className="p-3">Persistent</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Tipuri de cookie-uri</h2>
        <ul className="list-disc pl-6 text-gray-700 space-y-2">
          <li><strong>Cookie-uri necesare</strong> — esențiale pentru funcționarea site-ului (autentificare, consimțământ). Nu pot fi dezactivate.</li>
          <li><strong>Cookie-uri analitice</strong> — ne ajută să înțelegem cum utilizați site-ul (Google Analytics). Se activează doar cu acordul dumneavoastră.</li>
          <li><strong>Cookie-uri funcționale</strong> — îmbunătățesc experiența (coș, favorite). Stocate local pe dispozitivul dvs.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Cum puteți gestiona cookie-urile?</h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          La prima vizitare a site-ului veți vedea un banner de consimțământ care vă permite să alegeți
          ce categorii de cookie-uri acceptați.
        </p>
        <p className="text-gray-700 leading-relaxed mb-3">
          Puteți oricând să modificați sau să revocați consimțământul dat, ștergând cookie-urile din browser:
        </p>
        <ul className="list-disc pl-6 text-gray-700 space-y-1 text-sm">
          <li><strong>Chrome:</strong> Setări → Confidențialitate și securitate → Cookie-uri</li>
          <li><strong>Firefox:</strong> Setări → Confidențialitate și securitate → Cookie-uri și date de site</li>
          <li><strong>Safari:</strong> Preferințe → Confidențialitate → Gestionare date site</li>
          <li><strong>Edge:</strong> Setări → Cookie-uri și permisiuni site</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Google Analytics</h2>
        <p className="text-gray-700 leading-relaxed">
          Folosim Google Analytics 4 pentru a analiza traficul pe site. Datele sunt anonimizate și
          nu permit identificarea personală. Cookie-urile Google Analytics se activează doar dacă
          acceptați cookie-urile analitice în banner-ul de consimțământ. Mai multe informații:{" "}
          <a href="https://policies.google.com/technologies/cookies" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Politica Google privind cookie-urile
          </a>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Contact</h2>
        <p className="text-gray-700 leading-relaxed">
          Pentru întrebări legate de cookie-uri sau confidențialitate, ne puteți contacta la:{" "}
          <a href="mailto:office@prevcortpm.ro" className="text-blue-600 hover:underline">office@prevcortpm.ro</a>
          {" "}sau la telefon <a href="tel:0732935623" className="text-blue-600 hover:underline">0732 935 623</a>.
        </p>
      </section>
    </main>
  );
}
