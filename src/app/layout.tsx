import { Fraunces, Manrope } from 'next/font/google'
import './globals.css'
import './solicita-theme.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display',
})

export const metadata = {
  title: 'PREV-COR TPM',
  description: 'Solicitare oferta PREV-COR TPM',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <body className={`${manrope.variable} ${fraunces.variable}`}>{children}</body>
    </html>
  )
}
