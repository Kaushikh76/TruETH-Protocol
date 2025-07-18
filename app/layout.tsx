// app/layout.tsx
import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Navigation } from "../components/navigation"
import { PrivyWalletProvider } from "../components/wallet/PrivyProvider"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "TruETH Protocol",
  description: "Decentralized investigation verification platform with Privy authentication and Sui Bridge integration",
  generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <PrivyWalletProvider>
          <div className="min-h-screen bg-black">
            <Navigation />
            <main className="pt-20">{children}</main>
          </div>
        </PrivyWalletProvider>
      </body>
    </html>
  )
}