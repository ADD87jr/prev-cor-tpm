"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "./LanguageContext";

interface RecommendedProduct {
  id: number;
  name: string;
  price: number;
  image: string;
  stock: number;
  onDemand: boolean;
}

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  recommendedProducts?: RecommendedProduct[];
}

export default function AIChatbot() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const txt = {
    title: language === "en" ? "AI Assistant" : "Asistent AI",
    subtitle: language === "en" ? "Product & Service Advisor" : "Consilier Produse & Servicii",
    placeholder: language === "en" ? "Ask me about products..." : "Întreabă-mă despre produse...",
    welcome: language === "en"
      ? "Hello! I'm the PREV-COR TPM AI assistant. I can help you:\n\n• **Choose the right products** for your project\n• **Get technical details** about our products\n• **Find the best solutions** for industrial automation\n\nWhat do you need?"
      : "Bună ziua! Sunt asistentul AI PREV-COR TPM. Vă pot ajuta cu:\n\n• **Alegerea produselor potrivite** pentru proiectul dvs.\n• **Detalii tehnice** despre produsele noastre\n• **Soluții optime** de automatizare industrială\n\nCu ce vă pot ajuta?",
    send: language === "en" ? "Send" : "Trimite",
    thinking: language === "en" ? "Thinking..." : "Se gândește...",
    errorMsg: language === "en" ? "Sorry, an error occurred. Please try again." : "Scuze, a apărut o eroare. Încearcă din nou.",
    poweredBy: language === "en" ? "AI Assistant PREV-COR TPM" : "Asistent AI PREV-COR TPM",
  };

  // Adaugă mesajul de bun venit la deschidere
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: Date.now(),
          text: txt.welcome,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }
  }, [isOpen]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input la deschidere
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setHasNewMessage(false);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          language,
        }),
      });

      const data = await res.json();

      const botMsg: Message = {
        id: Date.now() + 1,
        text: data.reply || data.error || txt.errorMsg,
        isUser: false,
        timestamp: new Date(),
        recommendedProducts: data.recommendedProducts || [],
      };

      setMessages((prev) => [...prev, botMsg]);

      if (!isOpen) setHasNewMessage(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: txt.errorMsg,
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Parsare simplă markdown: **bold**, [text](url), \n → <br>
  function renderMarkdown(text: string) {
    const parts = text.split("\n").map((line, i) => {
      // Bold
      let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Links  
      processed = processed.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-blue-600 underline hover:text-blue-800">$1</a>'
      );
      // Bullet points
      if (processed.startsWith("• ")) {
        processed = `<span class="ml-2">${processed}</span>`;
      }
      return processed;
    });

    return (
      <span
        dangerouslySetInnerHTML={{
          __html: parts.join("<br/>"),
        }}
      />
    );
  }

  return (
    <>
      {/* Buton flotant AI */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 group"
        aria-label="Asistent AI"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
            )}
          </>
        )}
      </button>

      {/* Label mic */}
      {!isOpen && (
        <div className="fixed bottom-[5.8rem] right-[5.2rem] z-40 bg-white text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow-md border pointer-events-none animate-bounce-subtle">
          AI ✨
        </div>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "min(550px, calc(100vh - 160px))" }}>
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">{txt.title}</div>
              <div className="text-xs text-blue-100">{txt.subtitle}</div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.isUser
                        ? "bg-blue-600 text-white rounded-br-md"
                        : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md"
                    }`}
                  >
                    {msg.isUser ? msg.text : renderMarkdown(msg.text)}
                  </div>
                </div>
                
                {/* Carduri produse recomandate */}
                {!msg.isUser && msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {msg.recommendedProducts.map((prod) => (
                      <a
                        key={prod.id}
                        href={`/shop/${prod.id}`}
                        className="bg-white rounded-lg border border-gray-200 p-2 hover:shadow-md transition-shadow block"
                      >
                        <div className="aspect-square bg-gray-100 rounded overflow-hidden mb-1.5">
                          <img
                            src={prod.image}
                            alt={prod.name}
                            className="w-full h-full object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/products/placeholder.webp"; }}
                          />
                        </div>
                        <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2 mb-1">{prod.name}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-blue-600">{prod.price} RON</span>
                          <span className={`text-[10px] ${prod.stock > 0 ? "text-green-600" : "text-orange-500"}`}>
                            {prod.stock > 0 ? `${prod.stock} buc` : prod.onDemand ? "cerere" : "stoc 0"}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-500 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100 text-sm flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                  <span className="text-xs">{txt.thinking}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t bg-white px-3 py-3 flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={txt.placeholder}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputText.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-[10px] text-gray-400 py-1 bg-gray-50 border-t flex-shrink-0">
            {txt.poweredBy}
          </div>
        </div>
      )}
    </>
  );
}
