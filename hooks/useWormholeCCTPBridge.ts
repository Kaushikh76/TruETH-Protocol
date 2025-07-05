// hooks/useWormholeCCTPBridge.ts (Simplified Version - No VAA)
import { useState, useCallback } from 'react'
import { ethers } from 'ethers'

// Real Wormhole contracts for Arbitrum Sepolia
const WORMHOLE_CONTRACTS = {
  ARBITRUM_SEPOLIA: {
    CORE_BRIDGE: '0x6b9C8671cdDC8dEab9c719bB87cBd3e782bA6a35',
    TOKEN_BRIDGE: '0xC7A204bDBFe983FCD8d8E61D02b475D4073fF97e',
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
    setBridgeStatus('Initiating Wormhole bridge to Sui...')

    try {
      const amountInUnits = ethers.parseUnits(amount, 6) // USDC has 6 decimals

      // Step 1: Get the exact Wormhole fee from core bridge
      setBridgeStatus('Getting Wormhole bridge fee...')
      const coreBridge = new ethers.Contract(
        WORMHOLE_CONTRACTS.ARBITRUM_SEPOLIA.CORE_BRIDGE,
        ['function messageFee() view returns (uint256)'],
        signer
      )

      const wormholeFee = await coreBridge.messageFee()
      console.log('Wormhole fee:', ethers.formatEther(wormholeFee), 'ETH')

      // Step 2: Approve USDC to Wormhole Token Bridge
      setBridgeStatus('Approving USDC for Wormhole bridge...')
      const usdcContract = new ethers.Contract(
        WORMHOLE_CONTRACTS.ARBITRUM_SEPOLIA.USDC_TOKEN,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        signer
      )

      const currentAllowance = await usdcContract.allowance(
        await signer.getAddress(),
        WORMHOLE_CONTRACTS.ARBITRUM_SEPOLIA.TOKEN_BRIDGE
      )

      if (currentAllowance < amountInUnits) {
        const approveTx = await usdcContract.approve(
          WORMHOLE_CONTRACTS.ARBITRUM_SEPOLIA.TOKEN_BRIDGE,
          amountInUnits
        )
        await approveTx.wait()
      }

      // Step 3: Transfer tokens via Wormhole
      setBridgeStatus('Initiating Wormhole token transfer...')
      
      const tokenBridgeContract = new ethers.Contract(
        WORMHOLE_CONTRACTS.ARBITRUM_SEPOLIA.TOKEN_BRIDGE,
        [
          'function transferTokens(address token, uint256 amount, uint16 recipientChain, bytes32 recipient, uint256 arbiterFee, uint32 nonce) payable returns (uint64 sequence)'
        ],
        signer
      )

      // Convert Sui address to bytes32 format (32 bytes, lowercase, no 0x)
      const suiAddressBytes32 = convertSuiAddressToBytes32(suiRecipientAddress)
      
      // Generate secure random nonce
      const nonce = crypto.getRandomValues(new Uint32Array(1))[0]

      // Create transaction overrides with exact fee
      const overrides = { value: wormholeFee }

      const bridgeTx = await tokenBridgeContract.transferTokens(
        WORMHOLE_CONTRACTS.ARBITRUM_SEPOLIA.USDC_TOKEN,
        amountInUnits,
        CHAIN_IDS.SUI_TESTNET,
        suiAddressBytes32,
        BigInt(0), // No arbiter fee
        nonce,
        overrides
      )

      const receipt = await bridgeTx.wait()
      
      // Extract Wormhole sequence from logs
      const sequence = extractWormholeSequence(receipt)
      
      setBridgeStatus('Bridge completed! Tokens will arrive on Sui automatically via relayers.')

      return {
        success: true,
        txHash: receipt.hash,
        wormholeSequence: sequence
      }

    } catch (error: any) {
      console.error('Wormhole bridge failed:', error)
      setBridgeStatus('Bridge failed: ' + error.message)
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
    // Remove 0x prefix and ensure it's 64 characters (32 bytes), lowercase
    const cleanAddress = suiAddress.replace('0x', '').padStart(64, '0').toLowerCase()
    return '0x' + cleanAddress
  }

  const extractWormholeSequence = (receipt: ethers.TransactionReceipt): string => {
    // Look for LogMessagePublished event
    const wormholeInterface = new ethers.Interface([
      'event LogMessagePublished(address indexed sender, uint64 sequence, uint32 nonce, bytes payload, uint8 consistencyLevel)'
    ])

    for (const log of receipt.logs) {
      try {
        if (log.address.toLowerCase() === WORMHOLE_CONTRACTS.ARBITRUM_SEPOLIA.CORE_BRIDGE.toLowerCase()) {
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

  return {
    bridgeUSDCToSui,
    isBridging,
    bridgeStatus
  }
}