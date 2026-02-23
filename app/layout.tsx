import type { Metadata } from 'next'
import { Inter, Noto_Nastaliq_Urdu } from 'next/font/google'
import './globals.css'

// The exact font initialization required by Next.js
const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap',
})

const nastaliq = Noto_Nastaliq_Urdu({ 
  subsets: ['arabic'], 
  weight: ['400', '700'], 
  variable: '--font-nastaliq',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Freundlier Clinical Workspace',
  description: 'AI-Powered Triage and Mental Health Support',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${nastaliq.variable}`}>
      <body className="font-sans bg-[#F8FAFC] text-gray-900 antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}