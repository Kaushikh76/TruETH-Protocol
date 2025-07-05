"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Plus, Search, User, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mockUser } from "../lib/mock-data"

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", icon: Home, label: "Feed" },
    { href: "/post", icon: Plus, label: "Post" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/profile", icon: User, label: "Profile" },
  ]

  return (
    <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
      <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl">
        <div className="flex items-center space-x-2">
          {/* Logo */}
          <Link href="/" className="text-white font-bold text-sm mr-4 hover:text-gray-300 transition-colors">
            TruETH
          </Link>

          {/* Navigation Items */}
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`
                    relative px-4 py-2 rounded-full transition-all duration-200 hover:scale-105
                    ${
                      isActive
                        ? "bg-white/15 text-white shadow-lg backdrop-blur-sm"
                        : "text-gray-300 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  <span className="text-xs font-medium">{item.label}</span>
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 -z-10" />
                  )}
                </Button>
              </Link>
            )
          })}

          {/* Wallet Section */}
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/20">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 rounded-full backdrop-blur-sm border border-emerald-400/20">
              <Wallet className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-medium text-white">{mockUser.totalEarned}</span>
              <span className="text-xs text-emerald-400">USDC</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
