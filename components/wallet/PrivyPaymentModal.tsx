// components/wallet/PrivyPaymentModal.tsx (Permanent Sui Address)
"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { usePrivyWalletIntegration } from '@/hooks/usePrivyWalletIntegration'
import { useWormholeCCTPBridge } from '@/hooks/useWormholeCCTPBridge'
import { ethers } from 'ethers'
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Loader2,
  AlertTriangle,
  Mail,
  Shield,
  Globe,
  ExternalLink,
  Copy
} from 'lucide-react'

// Permanent Sui destination address
const PERMANENT_SUI_ADDRESS = '0x7b005829a1305a3ebeea7cff0dd200bbe7e2f42d1adce0d9045dd57ef12f52c9'

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
    primaryWallet
  } = usePrivyWalletIntegration()

  const {
    bridgeUSDCToSui,
    isBridging,
    bridgeStatus
  } = useWormholeCCTPBridge()

  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'payment' | 'bridge' | 'complete'>('payment')
  const [txResults, setTxResults] = useState<any>(null)

  if (!isOpen) return null

  const handlePaymentAndBridge = async () => {
    if (!primaryWallet || !connected) {
      alert('Please connect your wallet first')
      return
    }

    setIsProcessing(true)
    setCurrentStep('payment')

    try {
      // Get ethers signer from Privy wallet
      const provider = await primaryWallet.getEthereumProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()

      // Step 1: Bridge USDC to Sui via Wormhole (using permanent address)
      setCurrentStep('bridge')
      
      const bridgeResult = await bridgeUSDCToSui('1.0', signer, PERMANENT_SUI_ADDRESS)

      if (bridgeResult.success) {
        setTxResults(bridgeResult)
        setCurrentStep('complete')

        // Submit post data to backend
        const response = await fetch('/api/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...postData,
            bridgeTx: {
              hash: bridgeResult.txHash,
              amount: 1,
              from: account,
              suiRecipient: PERMANENT_SUI_ADDRESS,
              wormholeSequence: bridgeResult.wormholeSequence,
              timestamp: Date.now(),
            },
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to submit post')
        }

        const result = await response.json()
        
        onSuccess({
          success: true,
          transactionHash: bridgeResult.txHash,
          postId: result.data?.postId,
          bridgeDetails: bridgeResult
        })

      } else {
        throw new Error(bridgeResult.error || 'Bridge failed')
      }

    } catch (error: any) {
      console.error('Payment and bridge failed:', error)
      alert(`Transaction failed: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
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

  const canProcess = connected && isArbitrumSepolia && parseFloat(usdcBalance) >= 1

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white/20 rounded-xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Post Investigation</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 ${currentStep === 'payment' ? 'text-blue-400' : currentStep === 'bridge' || currentStep === 'complete' ? 'text-emerald-400' : 'text-gray-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${currentStep === 'payment' ? 'border-blue-400 bg-blue-400/20' : currentStep === 'bridge' || currentStep === 'complete' ? 'border-emerald-400 bg-emerald-400/20' : 'border-gray-500'}`}>
                {currentStep === 'bridge' || currentStep === 'complete' ? <CheckCircle className="w-4 h-4" /> : '1'}
              </div>
              <span className="text-xs font-medium">Setup</span>
            </div>
            <div className={`flex items-center gap-2 ${currentStep === 'bridge' ? 'text-blue-400' : currentStep === 'complete' ? 'text-emerald-400' : 'text-gray-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${currentStep === 'bridge' ? 'border-blue-400 bg-blue-400/20' : currentStep === 'complete' ? 'border-emerald-400 bg-emerald-400/20' : 'border-gray-500'}`}>
                {currentStep === 'complete' ? <CheckCircle className="w-4 h-4" /> : '2'}
              </div>
              <span className="text-xs font-medium">Bridge</span>
            </div>
            <div className={`flex items-center gap-2 ${currentStep === 'complete' ? 'text-emerald-400' : 'text-gray-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${currentStep === 'complete' ? 'border-emerald-400 bg-emerald-400/20' : 'border-gray-500'}`}>
                {currentStep === 'complete' ? <CheckCircle className="w-4 h-4" /> : '3'}
              </div>
              <span className="text-xs font-medium">Complete</span>
            </div>
          </div>
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

        {/* Sui Destination Address (Fixed) */}
        {connected && (
          <div className="mb-6">
            <div className="p-4 bg-gray-900/50 rounded-lg border border-white/10">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                Sui Destination Address
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                  Fixed
                </Badge>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-gray-800 border border-white/10 rounded-lg">
                  <span className="text-white text-sm font-mono flex-1 break-all">
                    {PERMANENT_SUI_ADDRESS}
                  </span>
                  <button
                    onClick={() => copyToClipboard(PERMANENT_SUI_ADDRESS)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open(`https://suiexplorer.com/address/${PERMANENT_SUI_ADDRESS}?network=testnet`, '_blank')}
                    size="sm"
                    variant="outline"
                    className="border-blue-400/50 text-blue-300 hover:text-blue-200 hover:border-blue-400/70"
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View on Sui Explorer
                  </Button>
                </div>
                <p className="text-gray-500 text-xs">
                  💡 All USDC will be sent to this secure TruETH Protocol address on Sui.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-white/10">
          <h3 className="text-white font-semibold mb-3">Bridge Transaction Details</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Investigation Title:</span>
              <span className="text-white text-sm">{postData.title?.slice(0, 30)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Amount:</span>
              <span className="text-white font-semibold">1.00 USDC</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Source Chain:</span>
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                Arbitrum Sepolia
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Destination Chain:</span>
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                Sui Testnet
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bridge Protocol:</span>
              <Badge className="bg-orange-500/20 text-orange-300 border-orange-400/30">
                Wormhole
              </Badge>
            </div>
          </div>
          <div className="mt-3 p-2 bg-purple-500/10 rounded border border-purple-400/20">
            <p className="text-purple-300 text-xs">
              💡 Simplified Wormhole bridge with fixed destination. USDC will be locked on Arbitrum and minted on Sui automatically.
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
        {(isProcessing || bridgeStatus) && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-400/20 rounded-lg">
            <div className="flex items-center gap-2">
              {isProcessing || isBridging ? (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 text-blue-400" />
              )}
              <span className="text-blue-300 text-sm">
                {bridgeStatus || 'Processing transaction...'}
              </span>
            </div>
          </div>
        )}

        {/* Success Results */}
        {currentStep === 'complete' && txResults && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-lg">
            <h4 className="text-emerald-300 font-semibold mb-2">🎉 Bridge Successful!</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Transaction:</span>
                <button
                  onClick={() => copyToClipboard(txResults.txHash)}
                  className="text-emerald-300 hover:text-emerald-200 flex items-center gap-1"
                >
                  {txResults.txHash?.slice(0, 10)}...
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Wormhole Sequence:</span>
                <span className="text-emerald-300 font-mono">{txResults.wormholeSequence}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Destination:</span>
                <span className="text-emerald-300 font-mono text-xs">{PERMANENT_SUI_ADDRESS.slice(0, 20)}...</span>
              </div>
              <p className="text-emerald-400 text-xs mt-2">
                USDC will arrive on Sui automatically in ~15 minutes. Track on Wormhole Explorer.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {currentStep !== 'complete' && (
            <Button
              onClick={handlePaymentAndBridge}
              disabled={!canProcess || isProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-gray-600 disabled:text-gray-400"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentStep === 'payment' ? 'Setting up...' : 'Bridging via Wormhole...'}
                </>
              ) : !connected ? (
                'Connect Wallet First'
              ) : parseFloat(usdcBalance) < 1 ? (
                'Insufficient USDC Balance'
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Bridge 1 USDC to Sui
                </>
              )}
            </Button>
          )}

          {currentStep === 'complete' && (
            <Button
              onClick={onClose}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Close & View Investigation
            </Button>
          )}

          {parseFloat(usdcBalance) < 1 && connected && (
            <div className="p-3 bg-amber-500/10 border border-amber-400/20 rounded-lg">
              <p className="text-amber-300 text-sm font-medium mb-2">Need USDC?</p>
              <p className="text-amber-400 text-xs mb-3">
                You can get testnet USDC from Circle's faucet.
              </p>
              <Button
                onClick={() => window.open('https://faucet.circle.com/', '_blank')}
                variant="outline"
                size="sm"
                className="w-full border-amber-400/50 text-amber-300 hover:text-amber-200 hover:border-amber-400/70"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Get Testnet USDC
              </Button>
            </div>
          )}

          {currentStep !== 'complete' && (
            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full text-gray-400 hover:text-white hover:bg-white/10"
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-gray-900/30 rounded-lg border border-white/5">
          <p className="text-xs text-gray-500">
            🔗 Powered by Wormhole with secure fixed destination. All USDC goes to the TruETH Protocol treasury on Sui.
          </p>
        </div>
      </div>
    </div>
  )
}