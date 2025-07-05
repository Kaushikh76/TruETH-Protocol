"use client"

import React from 'react'
import { PrivyProvider } from '@privy-io/react-auth'

interface PrivyWalletProviderProps {
  children: React.ReactNode
}

export function PrivyWalletProvider({ children }: PrivyWalletProviderProps) {
  const privyConfig = {
    // Login methods available to users
    loginMethods: ['email', 'wallet', 'google', 'twitter', 'discord'] as const,
    
    // Create embedded wallets for users who don't have external wallets
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const,
      requireUserPasswordOnCreate: false,
      noPromptOnSignature: false,
    },
    
    // External wallet configuration
    externalWallets: {
      metamask: {},
      coinbaseWallet: {},
      walletConnect: {
        projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
      },
      rainbow: {},
    },
    
    // Default chain configuration (Arbitrum Sepolia - Testnet ONLY)
    defaultChain: {
      id: 421614, // Arbitrum Sepolia
      name: 'Arbitrum Sepolia',
      network: 'arbitrum-sepolia',
      nativeCurrency: {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
      },
      rpcUrls: {
        default: {
          http: ['https://sepolia-rollup.arbitrum.io/rpc'],
        },
        public: {
          http: ['https://sepolia-rollup.arbitrum.io/rpc'],
        },
      },
      blockExplorers: {
        default: {
          name: 'Arbiscan Sepolia',
          url: 'https://sepolia.arbiscan.io',
        },
      },
    },
    
    // Only support Arbitrum Sepolia to keep it simple
    supportedChains: [
      {
        id: 421614, // Arbitrum Sepolia
        name: 'Arbitrum Sepolia',
        network: 'arbitrum-sepolia',
        nativeCurrency: {
          name: 'Ethereum',
          symbol: 'ETH',
          decimals: 18,
        },
        rpcUrls: {
          default: {
            http: ['https://sepolia-rollup.arbitrum.io/rpc'],
          },
        },
        blockExplorers: {
          default: {
            name: 'Arbiscan Sepolia',
            url: 'https://sepolia.arbiscan.io',
          },
        },
      },
    ],
    
    // Appearance customization
    appearance: {
      theme: 'dark' as const,
      accentColor: '#676FFF',
      logo: '/favicon.ico',
      showWalletLoginFirst: false,
      
      // Wallet list configuration
      walletList: [
        'metamask',
        'coinbase_wallet',
        'wallet_connect',
        'rainbow',
      ],
      
      // UI customization
      landingHeader: 'Welcome to TruETH Protocol',
      loginMessage: 'Sign in to create and verify investigations',
      
      // Privacy and legal
      privacyPolicyUrl: '/privacy',
      termsAndConditionsUrl: '/terms',
    },
    
    // MFA configuration
    mfa: {
      noPromptOnMfaRequired: false,
    },
    
    // Funding sources for embedded wallets
    fundingMethodConfig: {
      moonpay: {
        useSandbox: process.env.NODE_ENV === 'development',
      },
    },
  }

  const handleLogin = (user: any) => {
    console.log(`✅ User ${user.id} logged in successfully!`)
    console.log('User details:', {
      id: user.id,
      email: user.email?.address,
      wallets: user.linkedAccounts?.filter((acc: any) => acc.type === 'wallet')?.length || 0,
      createdAt: user.createdAt,
    })
  }

  const handleLogout = () => {
    console.log('👋 User logged out')
  }

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      onSuccess={handleLogin}
      onLogout={handleLogout}
      config={privyConfig}
    >
      {children}
    </PrivyProvider>
  )
}