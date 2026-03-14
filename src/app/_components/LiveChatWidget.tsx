"use client";

import { useState, useEffect, useRef } from "react";
import { COMPANY_CONFIG_CLIENT, fetchCompanyConfig } from "@/lib/companyConfigClient";

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [companyConfig, setCompanyConfig] = useState(COMPANY_CONFIG_CLIENT);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Bună ziua! Cum vă putem ajuta? Suntem aici pentru orice întrebare despre produsele sau serviciile noastre.",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", phone: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Încarcă datele companiei din API
  useEffect(() => {
    fetchCompanyConfig().then(setCompanyConfig);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show notification only when there's a new bot response (not the initial welcome message)
  // This only triggers when user sent a message and received a response while chat is minimized
  const [initialMessageCount] = useState(1); // Welcome message count
  
  useEffect(() => {
    if (!isOpen && messages.length > initialMessageCount) {
      const lastMessage = messages[messages.length - 1];
      // Only show notification for bot responses, not user messages
      if (!lastMessage.isUser) {
        setHasNewMessage(true);
      }
    }
    if (isOpen) {
      setHasNewMessage(false);
    }
  }, [isOpen, messages, initialMessageCount]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      setIsTyping(false);
      const botResponses = [
        "Mulțumim pentru mesaj! Un reprezentant vă va contacta în cel mai scurt timp.",
        `Pentru urgențe, ne puteți contacta la telefon: ${companyConfig.phone}.`,
        "Dacă doriți să discutați cu un operator, vă rugăm să lăsați datele de contact.",
      ];

      // After 2 messages, ask for contact info
      if (messages.filter((m) => m.isUser).length >= 1 && !showContactForm) {
        setShowContactForm(true);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: "Pentru a vă putea ajuta mai bine, vă rugăm să ne lăsați datele de contact și vă vom suna noi.",
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      } else {
        const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            text: randomResponse,
            isUser: false,
            timestamp: new Date(),
          },
        ]);
      }
    }, 1500);
  };

  const handleContactSubmit = async () => {
    if (!contactForm.name || !contactForm.phone) return;

    // Send contact request to API
    try {
      await fetch("/api/contact-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...contactForm,
          messages: messages.filter((m) => m.isUser).map((m) => m.text),
          source: "live-chat",
        }),
      });
    } catch (error) {
      console.error("Error sending contact request:", error);
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: `Mulțumim, ${contactForm.name}! Vă vom contacta în curând la numărul ${contactForm.phone}.`,
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    setShowContactForm(false);
    setContactForm({ name: "", email: "", phone: "" });
  };

  const openWhatsApp = () => {
    window.open(companyConfig.whatsapp, "_blank");
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        {/* WhatsApp button */}
        <button
          onClick={openWhatsApp}
          className="absolute -left-16 bottom-0 bg-green-500 text-white p-3 rounded-full shadow-lg hover:bg-green-600 transition-all"
          title="WhatsApp"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>

        {/* Chat button */}
        <button
          onClick={() => setIsOpen(true)}
          className="relative bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {hasNewMessage && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
              1
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <div className="font-bold">PREV-COR TPM</div>
              <div className="text-xs opacity-75 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                Online acum
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="h-80 overflow-y-auto p-4 bg-gray-50 space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.isUser
                    ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-white text-gray-800 rounded-bl-md shadow-sm border"
                }`}
              >
                {msg.text}
                <div className={`text-xs mt-1 ${msg.isUser ? "text-blue-200" : "text-gray-400"}`}>
                  {msg.timestamp.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-2xl rounded-bl-md shadow-sm border">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Contact form */}
        {showContactForm && (
          <div className="p-3 bg-blue-50 border-t border-blue-100">
            <div className="text-xs text-blue-700 font-semibold mb-2">Date de contact:</div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Nume *"
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                className="px-3 py-2 text-sm border rounded-lg"
              />
              <input
                type="tel"
                placeholder="Telefon *"
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                className="px-3 py-2 text-sm border rounded-lg"
              />
              <input
                type="email"
                placeholder="Email (opțional)"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                className="px-3 py-2 text-sm border rounded-lg"
              />
              <button
                onClick={handleContactSubmit}
                className="bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
              >
                Trimite datele
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Scrie un mesaj..."
              className="flex-1 px-4 py-2 border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs text-gray-500">
            <button
              onClick={openWhatsApp}
              className="flex items-center gap-1 text-green-600 hover:underline"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>
            <span>|</span>
            <a href={`tel:+${companyConfig.phoneClean}`} className="hover:underline">📞 {companyConfig.phone}</a>
          </div>
        </div>
      </div>
    </div>
  );
}
