// hooks/usePrivyWalletIntegration.ts
import { useState, useEffect, useCallback } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { ethers } from 'ethers'

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
    signMessage,
    getBalances,
  }
}