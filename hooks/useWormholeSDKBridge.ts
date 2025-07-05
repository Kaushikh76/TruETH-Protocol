// hooks/useWormholeSDKBridge.ts
import {
  Wormhole,
  chainToPlatform,
  encoding,
  amount,
  CircleTransfer,
  TokenTransfer,
  wormhole,
} from '@wormhole-foundation/sdk'
import { EvmPlatform } from '@wormhole-foundation/sdk-evm'
import { SuiPlatform } from '@wormhole-foundation/sdk-sui'
import { ethers } from 'ethers'
import { useState, useCallback } from 'react'

// Initialize Wormhole SDK
const wh = new Wormhole('Testnet', [EvmPlatform, SuiPlatform])

export function useWormholeSDKBridge() {
  const [isBridging, setIsBridging] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<string>('')

  const bridgeUSDCToSui = useCallback(async (
    amountToSend: string,
    signer: ethers.Signer,
    suiRecipientAddress: string
  ) => {
    setIsBridging(true)
    setBridgeStatus('Initializing Wormhole SDK bridge...')

    try {
      // Get chains
      const sourceChain = wh.getChain('ArbitrumSepolia')
      const destinationChain = wh.getChain('Sui')

      // Convert amount
      const sendAmount = amount.units(amount.parse(amountToSend, 6)) // USDC has 6 decimals

      setBridgeStatus('Creating Circle transfer...')

      // Create Circle transfer (CCTP)
      const circleTransfer = await CircleTransfer.from(
        wh,
        {
          token: 'USDC',
          amount: sendAmount,
          from: sourceChain.config.contracts.cctp?.tokenMessenger,
          to: {
            chain: destinationChain,
            address: encoding.bytes.encode(suiRecipientAddress)
          }
        }
      )

      setBridgeStatus('Initiating transfer...')

      // Get source signer
      const sourceSigner = await sourceChain.getSigner(signer)

      // Initiate the transfer
      const srcTxIds = await circleTransfer.initiateTransfer(sourceSigner)
      
      setBridgeStatus('Waiting for attestation...')

      // Wait for attestation
      const attestIds = await circleTransfer.fetchAttestation(60_000) // 60 second timeout

      setBridgeStatus('Transfer complete!')

      return {
        success: true,
        sourceTransactionId: srcTxIds[0],
        attestation: attestIds[0]
      }

    } catch (error: any) {
      console.error('Wormhole SDK bridge failed:', error)
      setBridgeStatus('Bridge failed')
      return {
        success: false,
        error: error.message
      }
    } finally {
      setIsBridging(false)
      setTimeout(() => setBridgeStatus(''), 5000)
    }
  }, [])

  return {
    bridgeUSDCToSui,
    isBridging,
    bridgeStatus
  }
}