"use client";
import React, { useState, useEffect } from "react";
import { useLanguage } from "../_components/LanguageContext";
import { fetchCompanyConfig } from "@/lib/companyConfigClient";

interface ContactData {
  titlu: string;
  telefon: string;
  email: string;
  adresa: string;
  codPostal: string;
  program: string;
}

export default function ContactPage() {
  const { language } = useLanguage();
  
  // Traduceri
  const txt = {
    pageTitle: language === "en" ? "Let's Talk About Your Project" : "Să Discutăm Despre Proiectul Tău",
    pageSubtitle: language === "en" ? "We're here to offer you the perfect solution for industrial automation. Contact us for a free consultation." : "Suntem aici să-ți oferim soluția perfectă pentru automatizarea industrială. Contactează-ne pentru o consultație gratuită.",
    contactInfo: language === "en" ? "Contact Information" : "Informații de Contact",
    phone: language === "en" ? "Phone" : "Telefon",
    email: "Email",
    address: language === "en" ? "Address" : "Adresă",
    postalCode: language === "en" ? "Postal code" : "Cod poștal",
    schedule: language === "en" ? "Schedule" : "Program",
    sendMessage: language === "en" ? "Send Us a Message" : "Trimite-ne un Mesaj",
    firstName: language === "en" ? "First name" : "Prenume",
    lastName: language === "en" ? "Last name" : "Nume",
    company: language === "en" ? "Company" : "Companie",
    serviceWanted: language === "en" ? "Service wanted" : "Serviciul dorit",
    yourMessage: language === "en" ? "Your message" : "Mesajul tău",
    sending: language === "en" ? "Sending..." : "Se trimite...",
    sendBtn: language === "en" ? "Send Message" : "Trimite Mesajul",
    successMsg: language === "en" ? "Message sent successfully!" : "Mesajul a fost trimis cu succes!",
    errorMsg: language === "en" ? "Error sending message." : "Eroare la trimiterea mesajului.",
    allRightsReserved: language === "en" ? "All rights reserved." : "Toate drepturile rezervate.",
  };

  const [contactInfo, setContactInfo] = useState<ContactData>({
    titlu: "Informații de Contact",
    telefon: "",
    email: "",
    adresa: "",
    codPostal: "",
    program: "Luni - Vineri: 08:00 - 17:00",
  });
  const [companyName, setCompanyName] = useState("PREV-COR TPM");

  // Încarcă datele companiei din API
  useEffect(() => {
    fetchCompanyConfig().then((config) => {
      setCompanyName(config.shortName || config.name || "PREV-COR TPM");
      setContactInfo((prev) => ({
        ...prev,
        telefon: config.phone,
        email: config.email,
        adresa: `Strada ${config.address.street}, nr.${config.address.number}, ${config.address.city}, ${config.address.county}, România`,
        codPostal: config.address.postalCode,
      }));
    });
  }, []);

  // Funcție pentru traducerea programului
  const translateSchedule = (schedule: string) => {
    if (language === "en") {
      return schedule
        .replace("Luni", "Monday")
        .replace("Marti", "Tuesday")
        .replace("Miercuri", "Wednesday")
        .replace("Joi", "Thursday")
        .replace("Vineri", "Friday")
        .replace("Sambata", "Saturday")
        .replace("Duminica", "Sunday");
    }
    return schedule;
  };

  // Funcție pentru traducerea adresei
  const translateAddress = (address: string) => {
    if (language === "en") {
      return address
        .replace("Strada", "Street")
        .replace("nr.", "no.")
        .replace("nr", "no.")
        .replace("România", "Romania");
    }
    return address;
  };

  useEffect(() => {
    fetch("/api/pages?pagina=contact")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.telefon) {
          setContactInfo(data);
        }
      })
      .catch(() => {});
  }, []);

  const [form, setForm] = useState({
    prenume: "",
    nume: "",
    email: "",
    companie: "",
    serviciu: "",
    mesaj: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Mesajul a fost trimis cu succes!");
        setForm({ prenume: "", nume: "", email: "", companie: "", serviciu: "", mesaj: "" });
      } else {
        setError(data.error || "Eroare la trimiterea mesajului.");
      }
    } catch {
      setError("Eroare la trimiterea mesajului.");
    }
    setLoading(false);
  }

  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-2 text-blue-700 text-center">{txt.pageTitle}</h1>
      <div className="text-center text-lg text-gray-700 mb-8">{txt.pageSubtitle}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
        {/* Informații de contact */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col gap-4 justify-center">
          <h2 className="text-xl font-semibold text-blue-700 mb-2">{txt.contactInfo}</h2>
          <div className="flex items-center gap-3"><span className="text-2xl">🏢</span> <span className="font-bold text-lg text-blue-800">{companyName}</span></div>
          <div className="flex items-center gap-3"><span className="text-2xl">📞</span> <span className="font-medium">{txt.phone}:</span> <a href={`tel:${contactInfo.telefon.replace(/\s/g, '')}`} className="text-blue-600 hover:underline">{contactInfo.telefon}</a></div>
          <div className="flex items-center gap-3"><span className="text-2xl">✉️</span> <span className="font-medium">{txt.email}:</span> <a href={`mailto:${contactInfo.email}`} className="text-blue-600 hover:underline">{contactInfo.email}</a></div>
          <div className="flex items-center gap-3"><span className="text-2xl">🌐</span> <span className="font-medium">Website:</span> <a href="https://www.prevcortpm.ro" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.prevcortpm.ro</a></div>
          <div className="flex items-center gap-3"><span className="text-2xl">📘</span> <span className="font-medium">Facebook:</span> <a href="https://www.facebook.com/profile.php?id=61587323746589" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">PREV-COR TPM</a></div>
          <div className="flex items-center gap-3"><span className="text-2xl">📍</span> <span className="font-medium">{txt.address}:</span> <span>{translateAddress(contactInfo.adresa)}{contactInfo.codPostal ? `, ${contactInfo.codPostal}` : ""}</span></div>
          <div className="flex items-center gap-3"><span className="text-2xl">⏰</span> <span className="font-medium">{txt.schedule}:</span> <span>{translateSchedule(contactInfo.program)}</span></div>
        </div>
        {/* Formular de contact */}
        <form className="bg-blue-50 rounded-xl shadow p-6 flex flex-col gap-4" autoComplete="off" onSubmit={handleSubmit}>
          <h2 className="text-xl font-semibold text-blue-700 mb-2">{txt.sendMessage}</h2>
          <div className="flex gap-4">
            <div className="w-1/2">
              <label htmlFor="prenume" className="block font-medium mb-1">{txt.firstName}</label>
              <input id="prenume" name="prenume" className="w-full border p-2 rounded" type="text" placeholder={txt.firstName} required autoComplete="given-name"
                value={form.prenume} onChange={e => setForm(f => ({ ...f, prenume: e.target.value }))} />
            </div>
            <div className="w-1/2">
              <label htmlFor="nume" className="block font-medium mb-1">{txt.lastName}</label>
              <input id="nume" name="nume" className="w-full border p-2 rounded" type="text" placeholder={txt.lastName} required autoComplete="family-name"
                value={form.nume} onChange={e => setForm(f => ({ ...f, nume: e.target.value }))} />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block font-medium mb-1">{txt.email}</label>
            <input id="email" name="email" className="w-full border p-2 rounded" type="email" placeholder={txt.email} required autoComplete="email"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="companie" className="block font-medium mb-1">{txt.company}</label>
            <input id="companie" name="companie" className="w-full border p-2 rounded" type="text" placeholder={txt.company} autoComplete="organization"
              value={form.companie} onChange={e => setForm(f => ({ ...f, companie: e.target.value }))} />
          </div>
          <div>
            <label htmlFor="serviciu" className="block font-medium mb-1">{txt.serviceWanted}</label>
            <select id="serviciu" name="serviciu" className="w-full border p-2 rounded" required value={form.serviciu}
              onChange={e => setForm(f => ({ ...f, serviciu: e.target.value }))}>
              <option value="" disabled hidden>{txt.serviceWanted}</option>
              <option value="Consultanță tehnică, proiectare și instruire personal">{language === "en" ? "Technical consulting and training" : "Consultanță tehnică, proiectare și instruire personal"}</option>
              <option value="Proiectare și execuție stații și linii industriale">{language === "en" ? "Industrial line design and execution" : "Proiectare și execuție stații și linii industriale"}</option>
              <option value="Modernizare instalații și retrofit echipamente">{language === "en" ? "Installation modernization and retrofit" : "Modernizare instalații și retrofit echipamente"}</option>
              <option value="Integrarea Roboților Industriali">{language === "en" ? "Industrial Robot Integration" : "Integrarea Roboților Industriali"}</option>
              <option value="Relocare Linii Producție">{language === "en" ? "Production Line Relocation" : "Relocare Linii Producție"}</option>
              <option value="Mentenanță preventivă, predictivă și service echipamente industriale">{language === "en" ? "Preventive maintenance and service" : "Mentenanță preventivă, predictivă și service echipamente industriale"}</option>
              <option value="Proiectare componente mecanice custom">{language === "en" ? "Custom mechanical component design" : "Proiectare componente mecanice custom"}</option>
              <option value="Producție tablouri electrice">{language === "en" ? "Electric panel production" : "Producție tablouri electrice"}</option>
            </select>
          </div>
          <div>
            <label htmlFor="mesaj" className="block font-medium mb-1">{txt.yourMessage}</label>
            <textarea id="mesaj" name="mesaj" className="w-full border p-2 rounded" placeholder={txt.yourMessage} rows={4} required
              value={form.mesaj} onChange={e => setForm(f => ({ ...f, mesaj: e.target.value }))} />
          </div>
          <button className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-60" type="submit" disabled={loading}>{loading ? txt.sending : txt.sendBtn}</button>
          {success && <div className="text-green-600 font-medium mt-2">{txt.successMsg}</div>}
          {error && <div className="text-red-600 font-medium mt-2">{txt.errorMsg}</div>}
        </form>
      </div>
      {/* Hartă */}
      <div className="rounded-xl overflow-hidden shadow mb-8">
        <iframe
          title={language === "en" ? "Company location" : "Harta companiei"}
          src="https://www.google.com/maps?q=Strada+Principala+70,+Stroesti,+Mehedinti,+Romania&output=embed"
          width="100%"
          height="300"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
        ></iframe>
      </div>
      <div className="text-center text-gray-500 text-sm">© {new Date().getFullYear()} PREV-COR TPM. {txt.allRightsReserved}</div>
    </main>
  );
}