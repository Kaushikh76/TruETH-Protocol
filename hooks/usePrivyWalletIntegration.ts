// hooks/usePrivyWalletIntegration.ts
import { useState, useEffect, useCallback } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { ethers } from 'ethers'

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
  
  const [ethBalance, setEthBalance] = useState<string>('0')
  const [usdcBalance, setUsdcBalance] = useState<string>('0')
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<string>('')

  // Get the primary wallet (embedded or external)
  const primaryWallet = wallets.find(wallet => 
    wallet.walletClientType === 'privy' || 
    wallet.connectorType === 'injected'
  ) || wallets[0]

  // Chain ID - should always be Arbitrum Sepolia (421614)
  const currentChainId = primaryWallet?.chainId?.split(':')[1] // Remove 'eip155:' prefix
  const isArbitrumSepolia = currentChainId === '421614'

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

  const switchToArbitrumSepolia = useCallback(async () => {
    if (!primaryWallet || isArbitrumSepolia) return

    try {
      // Switch to Arbitrum Sepolia (chain ID 421614)
      await primaryWallet.switchChain(421614)
    } catch (switchError: any) {
      console.error('Failed to switch to Arbitrum Sepolia:', switchError)
      throw switchError
    }
  }, [primaryWallet, isArbitrumSepolia])

  const getBalances = useCallback(async (address: string) => {
    if (!primaryWallet) return

    try {
      // Get ethers provider from Privy wallet
      const provider = await primaryWallet.getEthereumProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      
      // Get ETH balance
      const ethBal = await ethersProvider.getBalance(address)
      const ethBalanceInEth = ethers.formatEther(ethBal)
      setEthBalance(parseFloat(ethBalanceInEth).toFixed(4))

      // Get USDC balance (testnet USDC contract address for Arbitrum Sepolia)
      const USDC_CONTRACT = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
      const usdcInterface = new ethers.Interface([
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ])
      
      const usdcContract = new ethers.Contract(USDC_CONTRACT, usdcInterface, ethersProvider)
      const usdcBal = await usdcContract.balanceOf(address)
      const usdcBalanceInUsdc = ethers.formatUnits(usdcBal, 6) // USDC has 6 decimals
      setUsdcBalance(parseFloat(usdcBalanceInUsdc).toFixed(2))
      
    } catch (error) {
      console.error('Failed to get balances:', error)
      // Set default values on error
      setEthBalance('0')
      setUsdcBalance('0')
    }
  }, [primaryWallet])

  // Process payment for posting (1 USDC payment on Arbitrum Sepolia)
  const processPayment = useCallback(async (
    postData: any
  ): Promise<PaymentConfirmation> => {
    if (!primaryWallet || !authenticated) {
      throw new Error('Wallet not connected')
    }

    if (!isArbitrumSepolia) {
      await switchToArbitrumSepolia()
      // Wait for chain switch to complete
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    setIsProcessingPayment(true)
    setPaymentStatus('Initiating payment...')

    try {
      // USDC contract address on Arbitrum Sepolia (testnet)
      const USDC_CONTRACT = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
      // Use a proper Ethereum address format that you control
      // You can bridge from this address to Sui later using Sui Bridge or other cross-chain bridges
      const COLLECTION_WALLET = '0x742d35cc6634c0532925a3b8d45d9652b395e906'
      
      // Convert 1 USDC to proper decimals (USDC has 6 decimals)
      const usdcAmount = ethers.parseUnits('1', 6) // Fixed 1 USDC per post

      setPaymentStatus('Requesting transaction approval...')

      // Create ERC-20 transfer transaction data
      const transferInterface = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)'
      ])
      
      const transferData = transferInterface.encodeFunctionData('transfer', [
        COLLECTION_WALLET,
        usdcAmount
      ])

      // Send transaction using the wallet provider directly
      const provider = await primaryWallet.getEthereumProvider()
      const ethersProvider = new ethers.BrowserProvider(provider)
      const signer = await ethersProvider.getSigner()

      // Create the transaction object
      const transaction = {
        to: USDC_CONTRACT,
        data: transferData,
        value: '0x0', // No ETH value for ERC-20 transfer
      }

      // Send transaction using ethers signer
      const txResult = await signer.sendTransaction(transaction)

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
            amount: 1, // Fixed 1 USDC
            from: primaryWallet.address,
            to: COLLECTION_WALLET,
            timestamp: Date.now(),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit post')
      }

      const result = await response.json()
      
      setPaymentStatus('Payment confirmed! USDC will be bridged to Sui.')
      
      // Refresh balances after successful payment
      setTimeout(() => {
        if (primaryWallet?.address) {
          getBalances(primaryWallet.address)
        }
      }, 2000)
      
      return {
        success: true,
        transactionHash: txResult.hash,
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
  }, [primaryWallet, authenticated, isArbitrumSepolia, switchToArbitrumSepolia, getBalances])

  // Bridge to Sui functionality (simplified)
  const bridgeToSui = useCallback(async (amount: number) => {
    if (!primaryWallet || !authenticated) {
      throw new Error('Wallet not connected')
    }

    try {
      setPaymentStatus('Opening Sui Bridge...')
      
      // Open Sui Bridge in new window
      const bridgeUrl = `https://bridge.sui.io/?from=arbitrum&to=sui&token=ETH&amount=${amount}`
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
    if (authenticated && primaryWallet?.address && isArbitrumSepolia) {
      getBalances(primaryWallet.address)
      
      // Refresh balances every 30 seconds
      const interval = setInterval(() => {
        getBalances(primaryWallet.address)
      }, 30000)
      
      return () => clearInterval(interval)
    }
  }, [authenticated, primaryWallet?.address, isArbitrumSepolia, getBalances])

  return {
    // Connection state
    ready,
    connected: authenticated && !!primaryWallet,
    connecting: !ready,
    account: primaryWallet?.address,
    user,
    balance: ethBalance, // Keep for backward compatibility
    ethBalance,
    usdcBalance,
    chainId: currentChainId,
    isArbitrumSepolia,
    wallets,
    primaryWallet,
    
    // Actions
    connectWallet,
    logout,
    switchToArbitrumSepolia,
    processPayment,
    bridgeToSui,
    signMessage,
    
    // Payment state
    isProcessingPayment,
    paymentStatus,
  }
}