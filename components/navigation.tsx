// components/navigation.tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Plus, Search, User, Wallet, ExternalLink, Shield, LogOut, Mail, Globe, ChevronDown } from "lucide-react"
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
    balance, 
    chainId, 
    isArbitrumSepolia,
    primaryWallet,
    connectWallet,
    logout,
    switchToArbitrumSepolia,
    bridgeToSui 
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

  const getNetworkName = (chainId: string) => {
    switch (chainId) {
      case '421614': return 'Arbitrum Sepolia'
      case '11155111': return 'Ethereum Sepolia'
      case '84532': return 'Base Sepolia'
      case '80001': return 'Polygon Mumbai'
      case '42161': return 'Arbitrum One'
      case '1': return 'Ethereum'
      case '8453': return 'Base'
      case '137': return 'Polygon'
      case '10': return 'Optimism'
      case '56': return 'BSC'
      default: return 'Unknown'
    }
  }

  const getWalletTypeIcon = () => {
    if (!primaryWallet) return <Wallet className="w-3 h-3" />
    
    switch (primaryWallet.walletClientType) {
      case 'privy':
        return <Shield className="w-3 h-3 text-purple-400" />
      case 'metamask':
        return <Wallet className="w-3 h-3 text-orange-400" />
      case 'coinbase_wallet':
        return <Wallet className="w-3 h-3 text-blue-400" />
      case 'wallet_connect':
        return <Globe className="w-3 h-3 text-blue-400" />
      case 'rainbow':
        return <Wallet className="w-3 h-3 text-rainbow-400" />
      default:
        return <Wallet className="w-3 h-3 text-gray-400" />
    }
  }

  const getWalletTypeName = () => {
    if (!primaryWallet) return 'No Wallet'
    
    switch (primaryWallet.walletClientType) {
      case 'privy':
        return 'Privy Embedded'
      case 'metamask':
        return 'MetaMask'
      case 'coinbase_wallet':
        return 'Coinbase Wallet'
      case 'wallet_connect':
        return 'WalletConnect'
      case 'rainbow':
        return 'Rainbow'
      default:
        return primaryWallet.walletClientType || 'External Wallet'
    }
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
              <span>Loading Privy...</span>
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
                {connecting ? 'Connecting...' : 'Connect Privy'}
              </Button>
            ) : (
              <>
                {/* User Authentication Info */}
                {loginMethod && (
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-full backdrop-blur-sm border border-white/10 hover:bg-gray-800/50 transition-all duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <loginMethod.icon className="w-3 h-3 text-gray-300" />
                        <span className="text-xs font-medium text-white">
                          {loginMethod.display}
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
                            <p className="text-sm font-medium text-white">{loginMethod.value}</p>
                            <p className="text-xs text-purple-400">via {loginMethod.type}</p>
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
                )}

                {/* Wallet Info */}
                {account && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 rounded-full backdrop-blur-sm border border-white/10">
                    <div className="flex items-center gap-2">
                      {getWalletTypeIcon()}
                      <span className="text-xs font-medium text-white font-mono">
                        {formatAddress(account)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Network Indicator */}
                {chainId && (
                  <div className={`px-2 py-1 rounded-full text-xs border transition-all duration-200 ${
                    isArbitrumSepolia 
                      ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' 
                      : 'bg-amber-500/20 text-amber-300 border-amber-400/30 animate-pulse'
                  }`}>
                    {getNetworkName(chainId)}
                  </div>
                )}

                {/* Balance Display */}
                {balance && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 rounded-full backdrop-blur-sm border border-emerald-400/20">
                    <span className="text-xs font-medium text-white">{balance}</span>
                    <span className="text-xs text-emerald-400">ETH</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                  {/* Network Switch Button */}
                  {!isArbitrumSepolia && chainId && (
                    <Button
                      onClick={switchToArbitrumSepolia}
                      size="sm"
                      className="bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-400/20 rounded-full px-3 py-1 text-xs transition-all duration-200"
                    >
                      Switch to Arbitrum Sepolia
                    </Button>
                  )}

                  {/* Sui Bridge Button */}
                  <Button
                    onClick={() => bridgeToSui(0.01)}
                    size="sm"
                    className="bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-400/20 rounded-full px-3 py-1 transition-all duration-200"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    <span className="text-xs">Bridge to Sui</span>
                  </Button>
                </div>

                {/* Wallet Type Indicator */}
                <div className="flex items-center gap-1 px-2 py-1 bg-gray-900/30 rounded-full border border-white/5">
                  {getWalletTypeIcon()}
                  <span className="text-xs text-gray-400">{getWalletTypeName()}</span>
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