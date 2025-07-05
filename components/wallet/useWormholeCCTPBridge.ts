// hooks/useWormholeCCTPBridge.ts
import { useState, useCallback } from 'react'
import { ethers } from 'ethers'

// Wormhole CCTP contracts for Arbitrum Sepolia -> Sui
const WORMHOLE_CCTP_CONTRACTS = {
  ARBITRUM_SEPOLIA: {
    CORE_BRIDGE: '0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35',
    TOKEN_BRIDGE: '0xC7A204bDBFe983FCD8d8E61D02b475D4073fF97e',
    CCTP_INTEGRATION: '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c',
    USDC_TOKEN: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'
  }
}

const CHAIN_IDS = {
  ARBITRUM_SEPOLIA: 23,
  SUI_TESTNET: 21
}

interface WormholeBridgeResult {
  success: boolean
  txHash?: string
  wormholeSequence?: string
  vaa?: string
  error?: string
}

export function useWormholeCCTPBridge() {
  const [isBridging, setIsBridging] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<string>('')

  const bridgeUSDCToSui = useCallback(async (
    amount: string,
    signer: ethers.Signer,
    suiRecipientAddress: string
  ): Promise<WormholeBridgeResult> => {
    setIsBridging(true)
    setBridgeStatus('Initiating Wormhole CCTP bridge to Sui...')

    try {
      const amountInUnits = ethers.parseUnits(amount, 6) // USDC has 6 decimals

      // Step 1: Approve USDC to Wormhole CCTP Integration contract
      setBridgeStatus('Approving USDC for Wormhole bridge...')
      const usdcContract = new ethers.Contract(
        WORMHOLE_CCTP_CONTRACTS.ARBITRUM_SEPOLIA.USDC_TOKEN,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signer
      )

      const currentAllowance = await usdcContract.allowance(
        await signer.getAddress(),
        WORMHOLE_CCTP_CONTRACTS.ARBITRUM_SEPOLIA.CCTP_INTEGRATION
      )

      if (currentAllowance < amountInUnits) {
        const approveTx = await usdcContract.approve(
          WORMHOLE_CCTP_CONTRACTS.ARBITRUM_SEPOLIA.CCTP_INTEGRATION,
          amountInUnits
        )
        await approveTx.wait()
      }

      // Step 2: Call transferTokensWithRelay for CCTP bridge to Sui
      setBridgeStatus('Initiating CCTP burn and Wormhole transfer...')
      
      const cctpIntegrationContract = new ethers.Contract(
        WORMHOLE_CCTP_CONTRACTS.ARBITRUM_SEPOLIA.CCTP_INTEGRATION,
        [
          'function transferTokensWithRelay(address token, uint256 amount, uint256 toNativeTokenAmount, uint16 targetChain, bytes32 targetRecipientWallet) payable returns (uint64 sequence)'
        ],
        signer
      )

      // Convert Sui address to bytes32 format
      const suiAddressBytes32 = convertSuiAddressToBytes32(suiRecipientAddress)

      // Calculate relay fee (for gas on destination chain)
      const relayerFee = ethers.parseEther('0.01') // 0.01 ETH for gas

      const bridgeTx = await cctpIntegrationContract.transferTokensWithRelay(
        WORMHOLE_CCTP_CONTRACTS.ARBITRUM_SEPOLIA.USDC_TOKEN,
        amountInUnits,
        0, // No native token amount needed
        CHAIN_IDS.SUI_TESTNET,
        suiAddressBytes32,
        { value: relayerFee }
      )

      const receipt = await bridgeTx.wait()
      
      // Extract Wormhole sequence from logs
      const sequence = extractWormholeSequence(receipt)
      
      setBridgeStatus('Getting Wormhole VAA (Signed message)...')
      
      // Step 3: Get VAA from Wormhole Guardian Network
      const vaa = await getWormholeVAA(CHAIN_IDS.ARBITRUM_SEPOLIA, sequence)
      
      setBridgeStatus('Bridge initiated! USDC will arrive on Sui in ~15 minutes.')

      // The actual redemption on Sui will be handled automatically by relayers
      return {
        success: true,
        txHash: receipt.hash,
        wormholeSequence: sequence,
        vaa
      }

    } catch (error: any) {
      console.error('Wormhole CCTP bridge failed:', error)
      setBridgeStatus('Bridge failed')
      return {
        success: false,
        error: error.message
      }
    } finally {
      setIsBridging(false)
      setTimeout(() => setBridgeStatus(''), 10000)
    }
  }, [])

  const convertSuiAddressToBytes32 = (suiAddress: string): string => {
    // Sui addresses are 32 bytes, but in hex format with 0x prefix
    // Remove 0x prefix and ensure it's 64 characters (32 bytes)
    const cleanAddress = suiAddress.replace('0x', '').padStart(64, '0')
    return '0x' + cleanAddress
  }

  const extractWormholeSequence = (receipt: ethers.TransactionReceipt): string => {
    // Look for LogMessagePublished event
    const wormholeInterface = new ethers.Interface([
      'event LogMessagePublished(address indexed sender, uint64 sequence, uint32 nonce, bytes payload, uint8 consistencyLevel)'
    ])

    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() === WORMHOLE_CCTP_CONTRACTS.ARBITRUM_SEPOLIA.CORE_BRIDGE.toLowerCase()) {
          const parsed = wormholeInterface.parseLog({
            topics: log.topics,
            data: log.data
          })
          if (parsed?.name === 'LogMessagePublished') {
            return parsed.args.sequence.toString()
          }
        }
      } catch (e) {
        // Continue to next log
      }
    }
    throw new Error('Wormhole sequence not found in logs')
  }

  const getWormholeVAA = async (chainId: number, sequence: string): Promise<string> => {
    // Poll Wormhole API for VAA
    const maxAttempts = 30
    const delay = 10000 // 10 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(
          `https://wormhole-v2-testnet-api.certus.one/v1/signed_vaa/${chainId}/${WORMHOLE_CCTP_CONTRACTS.ARBITRUM_SEPOLIA.CORE_BRIDGE}/${sequence}`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (data.vaaBytes) {
            return data.vaaBytes
          }
        }
        
        if (attempt < maxAttempts - 1) {
          setBridgeStatus(`Waiting for Wormhole VAA... (${attempt + 1}/${maxAttempts})`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      } catch (error) {
        console.error('Error fetching VAA:', error)
      }
    }
    
    throw new Error('Failed to get VAA from Wormhole')
  }

  return {
    bridgeUSDCToSui,
    isBridging,
    bridgeStatus
  }
}