import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politica de retur | PREV-COR TPM",
  description: "Informații complete despre politica de retur și returnare produse la PREV-COR TPM. Dreptul de retragere în 14 zile.",
};

export default function PoliticaReturPage() {
  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-blue-700 mb-3">Politica de retur</h1>
        <p className="text-gray-600">
          Informații despre drepturile tale de returnare a produselor achiziționate de la PREV-COR TPM.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-8 space-y-8">
        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">1. Dreptul de retragere</h2>
          <p className="text-gray-600 leading-relaxed">
            Conform OUG 34/2014, ai dreptul de a te retrage din contractul de vânzare la distanță, fără a invoca vreun motiv, 
            în termen de <strong>14 zile calendaristice</strong> de la data primirii produsului. Termenul de retragere expiră 
            după 14 zile de la ziua în care ai intrat în posesia fizică a bunurilor.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">2. Cum se returnează un produs?</h2>
          <div className="text-gray-600 leading-relaxed space-y-3">
            <p>Pentru a exercita dreptul de retragere, trebuie să ne informezi printr-o declarație clară:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Email: <a href="mailto:office@prevcortpm.ro" className="text-blue-600 hover:underline">office@prevcortpm.ro</a></li>
              <li>Telefon: la numărul afișat pe <Link href="/contact" className="text-blue-600 hover:underline">pagina de contact</Link></li>
              <li>Poștă: la adresa sediului social indicată pe site</li>
            </ul>
            <p>
              Declarația trebuie să conțină: numele complet, adresa, numărul comenzii, data primirii coletului 
              și produsul/produsele pe care dorești să le returnezi.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">3. Condiții pentru returnare</h2>
          <div className="text-gray-600 leading-relaxed space-y-3">
            <p>Produsele returnate trebuie să îndeplinească următoarele condiții:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Să fie în starea originală, nefolosite și nedeteriorare</li>
              <li>Să fie în ambalajul original, complet și intact</li>
              <li>Să fie însoțite de toate accesoriile și documentele incluse</li>
              <li>Să fie trimise în maximum 14 zile de la comunicarea deciziei de retragere</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">4. Costurile returnării</h2>
          <p className="text-gray-600 leading-relaxed">
            Costurile directe ale returnării bunurilor sunt suportate de client. Recomandăm utilizarea unui serviciu 
            de curierat cu confirmare de primire pentru a evita eventualele probleme.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">5. Rambursarea</h2>
          <div className="text-gray-600 leading-relaxed space-y-3">
            <p>
              Vom rambursa toate sumele plătite, inclusiv costurile de livrare inițiale (cu excepția costurilor suplimentare 
              generate de alegerea unui alt mod de livrare decât cel standard), fără întârzieri nejustificate și în orice 
              caz nu mai târziu de <strong>14 zile</strong> de la data la care am fost informați despre decizia de retragere.
            </p>
            <p>
              Rambursarea se va efectua utilizând aceeași metodă de plată ca în tranzacția inițială, cu excepția cazului 
              în care convinți în mod expres altfel.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">6. Produse care nu pot fi returnate</h2>
          <div className="text-gray-600 leading-relaxed">
            <p>Conform legislației, nu pot fi returnate:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Produsele confecționate la comandă sau personalizate conform specificațiilor clientului</li>
              <li>Produsele sigilate care nu pot fi returnate din motive de igienă sau protecție a sănătății și care au fost desigilate</li>
              <li>Produsele care, prin natura lor, sunt inseparabil amestecate cu alte articole</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">7. Reclamații și garanție</h2>
          <p className="text-gray-600 leading-relaxed">
            Toate produsele comercializate beneficiază de garanția producătorului conform legislației în vigoare. 
            Pentru reclamații în garanție, contactează-ne cu dovada achiziției (factură sau confirmare comandă) 
            și descrierea problemei întâmpinate.
          </p>
        </section>

        <div className="border-t pt-6 mt-6 text-sm text-gray-500">
          <p>Ultima actualizare: Februarie 2026</p>
          <p className="mt-2">
            Pentru orice întrebări suplimentare, consultă <Link href="/faq" className="text-blue-600 hover:underline">pagina de FAQ</Link> sau 
            contactează-ne la <a href="mailto:office@prevcortpm.ro" className="text-blue-600 hover:underline">office@prevcortpm.ro</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
