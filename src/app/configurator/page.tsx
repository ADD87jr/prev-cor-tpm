import { Metadata } from "next";
import { Suspense } from "react";
import ConfiguratorPage from "./ConfiguratorPage";

export const metadata: Metadata = {
  title: "Configurator PLC | PREV-COR TPM",
  description:
    "Configurează-ți sistemul PLC complet: CPU, module I/O, comunicație și HMI. Unitronics, Delta, Siemens și alte mărci.",
  openGraph: {
    title: "Configurator PLC | PREV-COR TPM",
    description:
      "Configurează-ți sistemul PLC complet cu opțiuni interactive.",
  },
};

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
      <ConfiguratorPage />
    </Suspense>
  );
}
