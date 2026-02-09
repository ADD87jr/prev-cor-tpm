import InvoiceForm from "../../../components/InvoiceForm";

export default function AdminFacturarePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Titlu eliminat la cerere */}
        <InvoiceForm />
        {/* Eliminat link către lista comenzi manuale */}
        {/* Vezi comenzile mele manuale salvate */}
      </div>
    </div>
  );
}
