// hooks/usePrivyWalletIntegration.ts
import { useState, useEffect, useCallback } from 'react'
import { usePrivy, useWallets, useSendTransaction } from '@privy-io/react-auth'
import { ethers } from 'ethers'

interface TransactionResult {
  hash: string
  blockNumber?: number
  status: 'pending' | 'confirmed' | 'failed'
}

interface PaymentConfirmation {
  success: boolean
  transactionHash: string
  postId?: string
  error?: string
}

export function usePrivyWalletIntegration() {
  const { 
    ready, 
    authenticated, 
    user, 
    login, 
    logout, 
    createWallet 
  } = usePrivy()
  
  const { wallets } = useWallets()
  const { sendTransaction } = useSendTransaction()
  
  const [balance, setBalance] = useState<string>('0')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<string>('')

  // Get the primary wallet (embedded or external)
  const primaryWallet = wallets.find(wallet => 
    wallet.walletClientType === 'privy' || 
    wallet.connectorType === 'injected'
  ) || wallets[0]

  // Check if we're on Arbitrum (chain ID 42161 for mainnet, 421614 for sepolia)
  const currentChainId = primaryWallet?.chainId?.split(':')[1] // Remove 'eip155:' prefix
  const isArbitrum = currentChainId === '42161' || currentChainId === '421614'

  const connectWallet = useCallback(async () => {
    try {
      if (!authenticated) {
        await login()
      }
      
      // If user doesn't have a wallet, create an embedded one
      if (authenticated && wallets.length === 0) {
        await createWallet()
      }
    } catch (err) {
      console.warn('Failed to connect wallet:', err)
    }
  }, [login, createWallet, authenticated, wallets.length])

  const switchToArbitrum = useCallback(async () => {
    if (!primaryWallet) return

    try {
      // Switch to Arbitrum One (chain ID 42161)
      await primaryWallet.switchChain(42161)
    } catch (switchError: any) {
      console.error('Failed to switch to Arbitrum:', switchError)
      throw switchError
    }
  }, [primaryWallet])

  const getBalance = useCallback(async (address: string) => {
    if (!primaryWallet) return

    try {
      // Get ethers provider from Privy wallet
      const provider = await primaryWallet.getEthereumProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      
      const balance = await ethersProvider.getBalance(address)
      const balanceInEth = ethers.formatEther(balance)
      setBalance(parseFloat(balanceInEth).toFixed(4))
    } catch (error) {
      console.error('Failed to get balance:', error)
    }
  }, [primaryWallet])

  // Process payment for posting (USDC payment on Arbitrum)
  const processPayment = useCallback(async (
    rewardPool: number,
    postData: any
  ): Promise<PaymentConfirmation> => {
    if (!primaryWallet || !authenticated) {
      throw new Error('Wallet not connected')
    }

    if (!isArbitrum) {
      await switchToArbitrum()
      // Wait for chain switch to complete
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    setIsProcessingPayment(true)
    setPaymentStatus('Initiating payment...')

    try {
      // USDC contract address on Arbitrum One
      const USDC_CONTRACT = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'
      const SERVER_WALLET = process.env.NEXT_PUBLIC_SERVER_WALLET || '0x742d35Cc6634C0532925a3b8D45D9652B395e906'
      
      // Convert USDC amount to proper decimals (USDC has 6 decimals)
      const usdcAmount = ethers.parseUnits(rewardPool.toString(), 6)

      setPaymentStatus('Requesting transaction approval...')

      // Create ERC-20 transfer transaction data
      const transferInterface = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)'
      ])
      
      const transferData = transferInterface.encodeFunctionData('transfer', [
        SERVER_WALLET,
        usdcAmount
      ])

      // Send transaction using Privy's sendTransaction
      const txResult = await sendTransaction({
        to: USDC_CONTRACT,
        data: transferData,
        value: '0', // No ETH value for ERC-20 transfer
      })

      setPaymentStatus('Transaction sent. Confirming payment...')

      // Send transaction details to backend for confirmation
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...postData,
          paymentTx: {
            hash: txResult.transactionHash,
            amount: rewardPool,
            from: primaryWallet.address,
            timestamp: Date.now(),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit post')
      }

      const result = await response.json()
      
      setPaymentStatus('Payment confirmed!')
      
      return {
        success: true,
        transactionHash: txResult.transactionHash,
        postId: result.data?.postId,
      }

    } catch (error: any) {
      console.error('Payment failed:', error)
      setPaymentStatus('Payment failed')
      return {
        success: false,
        transactionHash: '',
        error: error.message,
      }
    } finally {
      setIsProcessingPayment(false)
      setTimeout(() => setPaymentStatus(''), 3000)
    }
  }, [primaryWallet, authenticated, isArbitrum, switchToArbitrum, sendTransaction])

  // Bridge to Sui functionality
  const bridgeToSui = useCallback(async (amount: number) => {
    if (!primaryWallet || !authenticated) {
      throw new Error('Wallet not connected')
    }

    try {
      setPaymentStatus('Initiating bridge to Sui...')
      
      // Open Sui Bridge in new window
      const bridgeUrl = `https://bridge.sui.io/?from=ethereum&to=sui&token=ETH&amount=${amount}`
      window.open(bridgeUrl, '_blank', 'width=800,height=600')
      
      setPaymentStatus('Bridge window opened. Complete the bridge transaction.')
      
    } catch (error: any) {
      console.error('Bridge failed:', error)
      setPaymentStatus('Bridge failed')
    }
  }, [primaryWallet, authenticated])

  // Sign message functionality
  const signMessage = useCallback(async (message: string) => {
    if (!primaryWallet || !authenticated) {
      throw new Error('Wallet not connected')
    }

    try {
      const provider = await primaryWallet.getEthereumProvider()
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, primaryWallet.address],
      })
      return signature
    } catch (error) {
      console.error('Failed to sign message:', error)
      throw error
    }
  }, [primaryWallet, authenticated])

  useEffect(() => {
    if (authenticated && primaryWallet?.address) {
      getBalance(primaryWallet.address)
    }
  }, [authenticated, primaryWallet?.address, currentChainId, getBalance])

  return {
    // Connection state
    ready,
    connected: authenticated && !!primaryWallet,
    connecting: !ready,
    account: primaryWallet?.address,
    user,
    balance,
    chainId: currentChainId,
    isArbitrum,
    wallets,
    primaryWallet,
    
    // Actions
    connectWallet,
    logout,
    switchToArbitrum,
    processPayment,
    bridgeToSui,
    signMessage,
    
    // Payment state
    isProcessingPayment,
    paymentStatus,
  }
}