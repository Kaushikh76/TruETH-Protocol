// components/navigation.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Plus, Search, User, Shield, LogOut, Mail, Globe, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePrivyWalletIntegration } from "../hooks/usePrivyWalletIntegration"
import { useState } from "react"

export function Navigation() {
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  
  const { 
    ready,
    connected, 
    connecting, 
    account, 
    user,
    usdcBalance, 
    chainId,
    connectWallet,
    logout,
  } = usePrivyWalletIntegration()

  const navItems = [
    { href: "/", icon: Home, label: "Feed" },
    { href: "/post", icon: Plus, label: "Post" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/profile", icon: User, label: "Profile" },
  ]

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getUserLoginMethod = () => {
    if (!user) return null
    
    if (user.email) return { 
      type: 'email', 
      value: user.email.address, 
      icon: Mail,
      display: user.email.address.length > 20 ? 
        `${user.email.address.slice(0, 15)}...` : 
        user.email.address
    }
    if (user.google) return { 
      type: 'google', 
      value: user.google.email, 
      icon: Globe,
      display: user.google.name || user.google.email
    }
    if (user.twitter) return { 
      type: 'twitter', 
      value: user.twitter.username, 
      icon: Globe,
      display: `@${user.twitter.username}`
    }
    if (user.discord) return { 
      type: 'discord', 
      value: user.discord.username, 
      icon: Globe,
      display: user.discord.username
    }
    
    return { 
      type: 'anonymous', 
      value: 'Anonymous', 
      icon: User,
      display: 'Anonymous'
    }
  }

  const loginMethod = getUserLoginMethod()

  // Loading state
  if (!ready) {
    return (
      <nav className="fixed top-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl">
          <div className="flex items-center space-x-2">
            <Link href="/" className="text-white font-bold text-sm mr-4">
              TruETH
            </Link>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span>Loading...</span>
            </div>
          </div>
        </div>
      </nav>
    )
  }

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
            {!connected ? (
              <Button
                onClick={connectWallet}
                disabled={connecting}
                size="sm"
                className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-400/20 rounded-full px-4 py-2 transition-all duration-200"
              >
                <Shield className="w-3 h-3 mr-2" />
                {connecting ? 'Connecting...' : 'Connect'}
              </Button>
            ) : (
              <>
                {/* Wallet Info - Compact Display */}
                <div className="flex items-center gap-3">
                  {/* USDC Balance */}
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/15 rounded-full backdrop-blur-sm border border-emerald-400/20">
                    <span className="text-xs font-medium text-white">{usdcBalance}</span>
                    <span className="text-xs text-emerald-400">USDC</span>
                  </div>

                  {/* Chain Indicator */}
                  <div className="px-2 py-1 rounded-full text-xs border bg-blue-500/20 text-blue-300 border-blue-400/30">
                    Arbitrum Sepolia
                  </div>

                  {/* User Menu Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-full backdrop-blur-sm border border-white/10 hover:bg-gray-800/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-medium text-white font-mono">
                          {formatAddress(account)}
                        </span>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </div>
                    </button>

                    {/* User Menu Dropdown */}
                    {showUserMenu && (
                      <div className="absolute top-full mt-2 right-0 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-3 min-w-48">
                        <div className="space-y-2">
                          <div className="px-3 py-2 border-b border-white/10">
                            <p className="text-xs text-gray-400">Signed in as</p>
                            {loginMethod && (
                              <>
                                <p className="text-sm font-medium text-white">{loginMethod.display}</p>
                                <p className="text-xs text-purple-400">via {loginMethod.type}</p>
                              </>
                            )}
                          </div>
                          
                          <div className="px-3 py-1">
                            <p className="text-xs text-gray-400">Wallet Address</p>
                            <p className="text-xs font-mono text-gray-300">{formatAddress(account)}</p>
                          </div>

                          {user?.id && (
                            <div className="px-3 py-1">
                              <p className="text-xs text-gray-400">User ID</p>
                              <p className="text-xs font-mono text-gray-300">{user.id.slice(0, 16)}...</p>
                            </div>
                          )}

                          <button
                            onClick={() => {
                              logout()
                              setShowUserMenu(false)
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <LogOut className="w-3 h-3" />
                            <span className="text-xs">Sign Out</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-[-1]" 
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </nav>
  )
}