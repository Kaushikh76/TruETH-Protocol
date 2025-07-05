// components/wallet/PrivyPaymentModal.tsx
"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePrivyWalletIntegration } from '@/hooks/usePrivyWalletIntegration'
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Mail,
  Shield,
  Globe,
  ArrowRight
} from 'lucide-react'

interface PrivyPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  postData: any
  onSuccess: (result: any) => void
}

export function PrivyPaymentModal({ 
  isOpen, 
  onClose, 
  postData, 
  onSuccess 
}: PrivyPaymentModalProps) {
  const {
    ready,
    connected,
    account,
    user,
    usdcBalance,
    isArbitrumSepolia,
    connectWallet,
    processPayment,
    bridgeToSui,
    isProcessingPayment,
    paymentStatus,
  } = usePrivyWalletIntegration()

  const [showBridgeOption, setShowBridgeOption] = useState(false)

  if (!isOpen) return null

  const handlePayment = async () => {
    try {
      const result = await processPayment(postData)
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

  const canPayment = connected && isArbitrumSepolia && parseFloat(usdcBalance) >= 1

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white/20 rounded-xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Post Investigation</h2>
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

        {/* Network Status */}
        {connected && (
          <div className="mb-6">
            <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">Arbitrum Sepolia</p>
                  <p className="text-gray-400 text-xs">Testnet network</p>
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-white/10">
          <h3 className="text-white font-semibold mb-3">Post Investigation</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Investigation Title:</span>
              <span className="text-white text-sm">{postData.title?.slice(0, 30)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Posting Fee:</span>
              <span className="text-white font-semibold">1.00 USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Source Network:</span>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                Arbitrum Sepolia
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Final Destination:</span>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                Sui Network
              </Badge>
            </div>
          </div>
          <div className="mt-3 p-2 bg-purple-500/10 rounded border border-purple-400/20">
            <p className="text-purple-300 text-xs">
              💡 Your USDC will be collected on Arbitrum and automatically bridged to Sui via Portal Bridge (Wormhole).
            </p>
          </div>
        </div>

        {/* Balance Check */}
        {connected && (
          <div className="mb-6 p-3 bg-gray-900/30 rounded-lg border border-white/5">
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Your USDC Balance:</span>
              <span className="text-white text-sm font-medium">{usdcBalance} USDC</span>
            </div>
            {parseFloat(usdcBalance) < 1 && (
              <div className="mt-2 flex items-center gap-2 text-amber-400 text-xs">
                <AlertTriangle className="w-3 h-3" />
                <span>Insufficient USDC balance. You need at least 1 USDC to post.</span>
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
            disabled={!canPayment || isProcessingPayment}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-gray-600 disabled:text-gray-400"
          >
            {isProcessingPayment ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing Payment...
              </>
            ) : !connected ? (
              'Connect Wallet First'
            ) : parseFloat(usdcBalance) < 1 ? (
              'Insufficient USDC Balance'
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay 1 USDC to Post
              </>
            )}
          </Button>

          {parseFloat(usdcBalance) < 1 && connected && (
            <div className="p-3 bg-amber-500/10 border border-amber-400/20 rounded-lg">
              <p className="text-amber-300 text-sm font-medium mb-2">Need USDC?</p>
              <p className="text-amber-400 text-xs mb-3">
                You can get testnet USDC from faucets or bridge from other testnets.
              </p>
              <Button
                onClick={() => window.open('https://faucet.circle.com/', '_blank')}
                variant="outline"
                size="sm"
                className="w-full border-amber-400/50 text-amber-300 hover:text-amber-200 hover:border-amber-400/70"
              >
                Get Testnet USDC
              </Button>
            </div>
          )}

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
            🔒 Powered by Privy's secure embedded wallets. The 1 USDC fee covers blockchain posting costs and platform maintenance.
          </p>
        </div>
      </div>
    </div>
  )
}