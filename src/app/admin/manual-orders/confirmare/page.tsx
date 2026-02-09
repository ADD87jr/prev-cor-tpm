export default function ConfirmareComandaManuala() {
  return (
    <main className="max-w-xl mx-auto py-20 px-4 text-center">
      <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Comanda a fost procesată cu succes!</h1>
        <p className="text-lg mb-2">Veți primi un email de confirmare cu toate detaliile comenzii.</p>
        <p className="text-gray-600">Vă mulțumim pentru încredere!<br/>Echipa PREV-COR TPM</p>
      </div>
      <a href="/admin/manual-orders" className="inline-block mt-8 text-blue-700 hover:underline text-lg">← Înapoi la lista de comenzi manuale</a>
    </main>
  );
}
