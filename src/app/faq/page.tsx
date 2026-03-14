import { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Întrebări frecvente (FAQ) | PREV-COR TPM",
  description: "Răspunsuri la cele mai frecvente întrebări despre produse, livrare, plată și garanție. PREV-COR TPM.",
  openGraph: {
    title: "FAQ | PREV-COR TPM",
    description: "Răspunsuri la cele mai frecvente întrebări despre produse, livrare, plată și garanție.",
  },
};

export default async function FaqPage() {
  let faqs: any[] = [];
  try {
    faqs = await prisma.faq.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    // Tabelul nu există încă — fallback cu FAQ-uri statice
    faqs = getDefaultFaqs();
  }

  if (faqs.length === 0) {
    faqs = getDefaultFaqs();
  }

  const categories = [...new Set(faqs.map((f: any) => f.category).filter(Boolean))];

  // JSON-LD FAQPage
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f: any) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <main className="max-w-4xl mx-auto p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-blue-700 mb-3">Întrebări frecvente</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Găsește răspunsuri rapide la cele mai comune întrebări despre produse, comenzi și livrare.
        </p>
      </div>

      {categories.length > 0 ? (
        categories.map((cat) => (
          <div key={cat} className="mb-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">{cat}</h2>
            <div className="space-y-4">
              {faqs
                .filter((f: any) => f.category === cat)
                .map((faq: any) => (
                  <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
                ))}
            </div>
          </div>
        ))
      ) : (
        <div className="space-y-4">
          {faqs.map((faq: any, i: number) => (
            <FaqItem key={faq.id || i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      )}
    </main>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="bg-white rounded-lg shadow p-5 group">
      <summary className="font-semibold text-gray-900 cursor-pointer flex items-center justify-between">
        {question}
        <span className="text-blue-500 group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="mt-3 text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: answer }} />
    </details>
  );
}

function getDefaultFaqs() {
  return [
    {
      id: 1, category: "Comenzi & Livrare",
      question: "Cum pot plasa o comandă?",
      answer: "Adaugă produsele în coș, apoi mergi la Checkout. Poți plăti cu cardul online, prin transfer bancar sau ramburs la curier.",
    },
    {
      id: 2, category: "Comenzi & Livrare",
      question: "Cât durează livrarea?",
      answer: "Livrarea standard durează 1-3 zile lucrătoare. Pentru produsele pe comandă, termenul este specificat pe pagina produsului.",
    },
    {
      id: 3, category: "Comenzi & Livrare",
      question: "Care sunt costurile de livrare?",
      answer: "Livrarea este gratuită pentru comenzi peste 500 RON. Sub această valoare, costul standard este de 25 RON.",
    },
    {
      id: 4, category: "Plăți",
      question: "Ce metode de plată acceptați?",
      answer: "Acceptăm plata cu cardul online (Visa, Mastercard), transfer bancar, ramburs la curier și plata în rate.",
    },
    {
      id: 5, category: "Plăți",
      question: "Este sigură plata cu cardul?",
      answer: "Da, toate tranzacțiile sunt procesate prin Stripe, platforma certificată PCI-DSS de nivel 1, garantând securitatea maximă a datelor.",
    },
    {
      id: 6, category: "Returnări & Garanție",
      question: "Pot returna un produs?",
      answer: "Da, ai dreptul de a returna produsul în 14 zile de la primire, conform legislației în vigoare. Consultă <a href='/politica-retur' class='text-blue-600 hover:underline'>politica de retur</a>.",
    },
    {
      id: 7, category: "Returnări & Garanție",
      question: "Ce garanție oferă produsele?",
      answer: "Toate produsele beneficiază de garanția producătorului. Perioada variază în funcție de produs și este specificată pe fișa produsului.",
    },
    {
      id: 8, category: "Cont & Confidențialitate",
      question: "Trebuie să am cont pentru a comanda?",
      answer: "Nu, poți plasa o comandă și fără cont. Totuși, un cont îți permite să urmărești comenzile și să faci achiziții mai rapid.",
    },
  ];
}
