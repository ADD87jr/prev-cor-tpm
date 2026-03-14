/**
 * Generator XML e-Factura (UBL 2.1) conform ANAF/SPV
 * Format: CIUS-RO (Romanian UBL extension)
 */

import { COMPANY_CONFIG } from "@/lib/companyConfig";

interface EFacturaItem {
  name: string;
  quantity: number;
  um: string;
  unitPrice: number; // fără TVA
  tvaPercent: number;
}

interface EFacturaData {
  invoiceNumber: string; // ex: PCT-0001
  invoiceDate: string;   // yyyy-mm-dd
  dueDate: string;       // yyyy-mm-dd
  currencyCode: string;  // RON
  client: {
    name: string;
    cui?: string;
    regCom?: string;
    address?: string;
    city?: string;
    county?: string;
    country?: string;
    email?: string;
    phone?: string;
  };
  items: EFacturaItem[];
  courierCost?: number;
  tvaPercent: number;
}

function escapeXml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatAmount(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

export function generateEFacturaXml(data: EFacturaData): string {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    currencyCode = "RON",
    client,
    items,
    courierCost = 0,
    tvaPercent,
  } = data;

  // Calculează totaluri
  const lineItems = items.map((item, idx) => {
    const lineTotal = item.unitPrice * item.quantity;
    const lineTva = lineTotal * (item.tvaPercent / 100);
    return { ...item, idx: idx + 1, lineTotal, lineTva };
  });

  // Adaugă transport ca linie separată (dacă > 0)
  if (courierCost > 0) {
    const transportTva = courierCost * (tvaPercent / 100);
    lineItems.push({
      name: "Transport",
      quantity: 1,
      um: "buc",
      unitPrice: courierCost,
      tvaPercent,
      idx: lineItems.length + 1,
      lineTotal: courierCost,
      lineTva: transportTva,
    });
  }

  const subtotalFaraTva = lineItems.reduce((s, l) => s + l.lineTotal, 0);
  const totalTva = lineItems.reduce((s, l) => s + l.lineTva, 0);
  const totalCuTva = subtotalFaraTva + totalTva;

  const supplierCountry = "RO";
  const clientCountry = client.country === "Romania" || !client.country ? "RO" : client.country;

  // Mapare UM la UN/ECE cod
  function umToUncefact(um: string): string {
    const map: Record<string, string> = {
      buc: "EA",
      kg: "KGM",
      l: "LTR",
      m: "MTR",
      set: "SET",
      pachet: "PK",
    };
    return map[um?.toLowerCase()] || "EA";
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1</cbc:CustomizationID>
  <cbc:ID>${escapeXml(invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${invoiceDate}</cbc:IssueDate>
  <cbc:DueDate>${dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currencyCode}</cbc:DocumentCurrencyCode>
  
  <!-- Furnizor -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(COMPANY_CONFIG.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(COMPANY_CONFIG.address.street + " " + COMPANY_CONFIG.address.number)}</cbc:StreetName>
        <cbc:CityName>${escapeXml(COMPANY_CONFIG.address.city)}</cbc:CityName>
        <cbc:PostalZone>${escapeXml(COMPANY_CONFIG.address.postalCode)}</cbc:PostalZone>
        <cbc:CountrySubentity>${escapeXml(COMPANY_CONFIG.address.county)}</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>${supplierCountry}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(COMPANY_CONFIG.cui)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(COMPANY_CONFIG.name)}</cbc:RegistrationName>
        <cbc:CompanyID>${escapeXml(COMPANY_CONFIG.regCom)}</cbc:CompanyID>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>${escapeXml(COMPANY_CONFIG.phone)}</cbc:Telephone>
        <cbc:ElectronicMail>${escapeXml(COMPANY_CONFIG.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Client -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(client.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(client.address || "")}</cbc:StreetName>
        <cbc:CityName>${escapeXml(client.city || "")}</cbc:CityName>
        <cbc:CountrySubentity>${escapeXml(client.county || "")}</cbc:CountrySubentity>
        <cac:Country>
          <cbc:IdentificationCode>${clientCountry}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>${client.cui ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(client.cui)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>` : ""}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(client.name)}</cbc:RegistrationName>${client.regCom ? `
        <cbc:CompanyID>${escapeXml(client.regCom)}</cbc:CompanyID>` : ""}
      </cac:PartyLegalEntity>${client.email || client.phone ? `
      <cac:Contact>${client.phone ? `
        <cbc:Telephone>${escapeXml(client.phone)}</cbc:Telephone>` : ""}${client.email ? `
        <cbc:ElectronicMail>${escapeXml(client.email)}</cbc:ElectronicMail>` : ""}
      </cac:Contact>` : ""}
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Plata -->
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escapeXml(COMPANY_CONFIG.iban)}</cbc:ID>
      <cbc:Name>${escapeXml(COMPANY_CONFIG.name)}</cbc:Name>
      <cac:FinancialInstitutionBranch>
        <cbc:ID>${escapeXml(COMPANY_CONFIG.bank)}</cbc:ID>
      </cac:FinancialInstitutionBranch>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>

  <!-- TVA -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${currencyCode}">${formatAmount(totalTva)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${currencyCode}">${formatAmount(subtotalFaraTva)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${currencyCode}">${formatAmount(totalTva)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${tvaPercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Totaluri -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${currencyCode}">${formatAmount(subtotalFaraTva)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${currencyCode}">${formatAmount(subtotalFaraTva)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${currencyCode}">${formatAmount(totalCuTva)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${currencyCode}">${formatAmount(totalCuTva)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Linii factură -->
${lineItems
  .map(
    (item) => `  <cac:InvoiceLine>
    <cbc:ID>${item.idx}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${umToUncefact(item.um)}">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currencyCode}">${formatAmount(item.lineTotal)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXml(item.name)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${item.tvaPercent}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currencyCode}">${formatAmount(item.unitPrice)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
  )
  .join("\n")}
</Invoice>`;

  return xml;
}
