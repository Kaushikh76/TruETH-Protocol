// components/wallet/PrivyPaymentModal.tsx
"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePrivyWalletIntegration } from '@/hooks/usePrivyWalletIntegration'
import { 
  Wallet, 
  CreditCard, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  ArrowRight,
  Mail,
  Shield,
  Globe
} from 'lucide-react'

interface PrivyPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  rewardPool: number
  postData: any
  onSuccess: (result: any) => void
}

export function PrivyPaymentModal({ 
  isOpen, 
  onClose, 
  rewardPool, 
  postData, 
  onSuccess 
}: PrivyPaymentModalProps) {
  const {
    ready,
    connected,
    account,
    user,
    balance,
    chainId,
    isArbitrumSepolia,
    primaryWallet,
    connectWallet,
    logout,
    switchToArbitrumSepolia,
    processPayment,
    bridgeToSui,
    isProcessingPayment,
    paymentStatus,
  } = usePrivyWalletIntegration()

  const [showBridgeOption, setShowBridgeOption] = useState(false)

  if (!isOpen) return null

  const handlePayment = async () => {
    try {
      const result = await processPayment(rewardPool, postData)
      if (result.success) {
        onSuccess(result)
        onClose()
      }
    } catch (error) {
      console.error('Payment error:', error)
    }
  }

  const handleBridge = async () => {
    await bridgeToSui(0.01) // Bridge a small amount to Sui for gas
  }

  const getWalletTypeIcon = () => {
    if (!primaryWallet) return <Wallet className="w-5 h-5 text-blue-400" />
    
    switch (primaryWallet.walletClientType) {
      case 'privy':
        return <Shield className="w-5 h-5 text-purple-400" />
      case 'metamask':
        return <Wallet className="w-5 h-5 text-orange-400" />
      default:
        return <Globe className="w-5 h-5 text-blue-400" />
    }
  }

  const getWalletTypeName = () => {
    if (!primaryWallet) return 'No Wallet'
    
    switch (primaryWallet.walletClientType) {
      case 'privy':
        return 'Privy Embedded Wallet'
      case 'metamask':
        return 'MetaMask'
      case 'coinbase_wallet':
        return 'Coinbase Wallet'
      case 'wallet_connect':
        return 'WalletConnect'
      default:
        return primaryWallet.walletClientType || 'External Wallet'
    }
  }

  const getUserLoginMethod = () => {
    if (!user) return null
    
    if (user.email) return { type: 'email', value: user.email.address, icon: Mail }
    if (user.google) return { type: 'google', value: user.google.email, icon: Globe }
    if (user.twitter) return { type: 'twitter', value: user.twitter.username, icon: Globe }
    
    return null
  }

  const loginMethod = getUserLoginMethod()

  if (!ready) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-black border border-white/20 rounded-xl max-w-md w-full p-6 shadow-2xl">
          <div className="flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <span className="ml-3 text-white">Loading Privy...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white/20 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Payment Confirmation</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* User Authentication Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-white/10">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-white text-sm font-medium">
                  {connected ? 'Authenticated with Privy' : 'Connect to Continue'}
                </p>
                {loginMethod && (
                  <p className="text-gray-400 text-xs flex items-center gap-1">
                    <loginMethod.icon className="w-3 h-3" />
                    {loginMethod.value}
                  </p>
                )}
              </div>
            </div>
            {connected ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <Button onClick={connectWallet} size="sm" className="bg-purple-500 hover:bg-purple-600">
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Wallet Connection Status */}
        {connected && (
          <div className="mb-6">
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                {getWalletTypeIcon()}
                <div>
                  <p className="text-white text-sm font-medium">
                    {getWalletTypeName()}
                  </p>
                  {account && (
                    <p className="text-gray-400 text-xs font-mono">
                      {account.slice(0, 6)}...{account.slice(-4)}
                    </p>
                  )}
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        )}

        {/* Network Status */}
        {connected && (
          <div className="mb-6">
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {isArbitrumSepolia ? 'Arbitrum Sepolia' : 'Switch to Arbitrum Sepolia'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {isArbitrumSepolia ? 'Ready for testnet USDC payment' : 'Required for testnet payment'}
                  </p>
                </div>
              </div>
              {isArbitrumSepolia ? (
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              ) : (
                <Button onClick={switchToArbitrumSepolia} size="sm" className="bg-orange-500 hover:bg-orange-600">
                  Switch
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-white/10">
          <h3 className="text-white font-semibold mb-3">Payment Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Investigation Title:</span>
              <span className="text-white text-sm">{postData.title?.slice(0, 30)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Reward Pool:</span>
              <span className="text-white font-semibold">{rewardPool} USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Network:</span>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                Arbitrum Sepolia (Testnet)
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Wallet Type:</span>
              <span className="text-purple-300 text-sm">{getWalletTypeName()}</span>
            </div>
          </div>
        </div>

        {/* Balance Check */}
        {connected && (
          <div className="mb-6 p-3 bg-gray-900/30 rounded-lg border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Your Balance:</span>
              <span className="text-white text-sm font-medium">{balance} ETH</span>
            </div>
            {parseFloat(balance) < 0.001 && (
              <div className="mt-2 flex items-center gap-2 text-amber-400 text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>Low balance. Consider bridging more ETH.</span>
              </div>
            )}
          </div>
        )}

        {/* Status Display */}
        {paymentStatus && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg">
            <div className="flex items-center gap-2">
              {isProcessingPayment ? (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 text-blue-400" />
              )}
              <span className="text-blue-300 text-sm">{paymentStatus}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handlePayment}
            disabled={!connected || !isArbitrumSepolia || isProcessingPayment}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay {rewardPool} USDC
              </>
            )}
          </Button>

          {!showBridgeOption ? (
            <Button
              onClick={() => setShowBridgeOption(true)}
              variant="outline"
              className="w-full border-white/20 text-gray-300 hover:text-white hover:border-white/30"
            >
              Need to bridge assets to Sui?
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleBridge}
                variant="outline"
                className="w-full border-purple-400/50 text-purple-300 hover:text-purple-200 hover:border-purple-400/70"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Bridge to Sui Network
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Bridge ETH to Sui for future cross-chain investigations
              </p>
            </div>
          )}

          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-gray-400 hover:text-white hover:bg-white/10"
          >
            Cancel
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-gray-900/30 rounded-lg border border-white/5">
          <p className="text-xs text-gray-500">
            💡 Powered by Privy's secure embedded wallets. Your payment secures the investigation reward pool.
          </p>
        </div>
      </div>
    </div>
  )
}