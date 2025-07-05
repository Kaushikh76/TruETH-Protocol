// api/posts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'

interface BridgeTransaction {
  hash: string
  amount: number
  from: string
  suiRecipient: string
  wormholeSequence: string
  vaa?: string
  timestamp: number
}

interface PostData {
  title: string
  content: string
  tags: string[]
  evidence: string[]
  files: any[]
  userWallet: string
  userId: string
  bridgeTx: BridgeTransaction
}

// Arbitrum Sepolia RPC for verification
const ARBITRUM_SEPOLIA_RPC = 'https://sepolia-rollup.arbitrum.io/rpc'
const WORMHOLE_CCTP_CONTRACT = '0x2703483B1a5a7c577e8680de9Df8Be03c6f30e3c'
const USDC_CONTRACT = '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d'

export async function POST(request: NextRequest) {
  try {
    const postData: PostData = await request.json()

    // Validate required fields
    if (!postData.title || !postData.content || !postData.bridgeTx) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the bridge transaction on-chain
    const isValidBridge = await verifyBridgeTransaction(postData.bridgeTx)
    
    if (!isValidBridge) {
      return NextResponse.json(
        { error: 'Invalid bridge transaction' },
        { status: 400 }
      )
    }

    // Create investigation post
    const investigationId = generateInvestigationId()
    
    // In a real implementation, you would save this to a database
    const investigation = {
      id: investigationId,
      title: postData.title,
      content: postData.content,
      author: postData.userId || 'Anonymous',
      authorAddress: postData.userWallet,
      createdAt: new Date(),
      verificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      status: 'pending',
      votes: { correct: 0, false: 0, maybe: 0 },
      userVotes: {},
      tags: postData.tags,
      evidence: postData.evidence,
      rewardPool: postData.bridgeTx.amount,
      bridgeDetails: {
        sourceChain: 'arbitrum-sepolia',
        destinationChain: 'sui-testnet',
        bridgeProtocol: 'wormhole-cctp',
        transactionHash: postData.bridgeTx.hash,
        wormholeSequence: postData.bridgeTx.wormholeSequence,
        suiRecipient: postData.bridgeTx.suiRecipient,
        timestamp: postData.bridgeTx.timestamp
      }
    }

    // Log the successful bridge for monitoring
    console.log('CCTP Bridge Transaction Processed:', {
      investigationId,
      txHash: postData.bridgeTx.hash,
      amount: postData.bridgeTx.amount,
      from: postData.bridgeTx.from,
      suiRecipient: postData.bridgeTx.suiRecipient,
      wormholeSequence: postData.bridgeTx.wormholeSequence
    })

    // Initiate monitoring of Wormhole bridge completion
    monitorWormholeBridge(postData.bridgeTx.wormholeSequence, investigationId)

    return NextResponse.json(
      {
        success: true,
        message: 'Investigation posted successfully with CCTP bridge',
        data: {
          postId: investigationId,
          bridgeStatus: 'initiated',
          investigation
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error processing post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function verifyBridgeTransaction(bridgeTx: BridgeTransaction): Promise<boolean> {
  try {
    // Connect to Arbitrum Sepolia
    const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC)
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(bridgeTx.hash)
    
    if (!receipt) {
      console.error('Transaction not found:', bridgeTx.hash)
      return false
    }

    // Verify transaction was successful
    if (receipt.status !== 1) {
      console.error('Transaction failed:', bridgeTx.hash)
      return false
    }

    // Verify the transaction is to Wormhole CCTP contract
    if (receipt.to?.toLowerCase() !== WORMHOLE_CCTP_CONTRACT.toLowerCase()) {
      console.error('Transaction not to Wormhole CCTP contract')
      return false
    }

    // Parse logs to verify USDC transfer and Wormhole message
    let usdcTransferFound = false
    let wormholeMessageFound = false

    const transferInterface = new ethers.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)'
    ])

    const wormholeInterface = new ethers.Interface([
      'event LogMessagePublished(address indexed sender, uint64 sequence, uint32 nonce, bytes payload, uint8 consistencyLevel)'
    ])

    for (const log of receipt.logs) {
      try {
        // Check for USDC transfer
        if (log.address.toLowerCase() === USDC_CONTRACT.toLowerCase()) {
          const parsed = transferInterface.parseLog({
            topics: log.topics,
            data: log.data
          })
          
          if (parsed?.name === 'Transfer') {
            const transferAmount = ethers.formatUnits(parsed.args.value, 6)
            if (parseFloat(transferAmount) >= bridgeTx.amount) {
              usdcTransferFound = true
            }
          }
        }

        // Check for Wormhole message
        const parsed = wormholeInterface.parseLog({
          topics: log.topics,
          data: log.data
        })
        
        if (parsed?.name === 'LogMessagePublished') {
          const sequence = parsed.args.sequence.toString()
          if (sequence === bridgeTx.wormholeSequence) {
            wormholeMessageFound = true
          }
        }
      } catch (e) {
        // Continue parsing other logs
      }
    }

    if (!usdcTransferFound) {
      console.error('USDC transfer not found in transaction')
      return false
    }

    if (!wormholeMessageFound) {
      console.error('Wormhole message not found in transaction')
      return false
    }

    console.log('Bridge transaction verified successfully:', bridgeTx.hash)
    return true

  } catch (error) {
    console.error('Error verifying bridge transaction:', error)
    return false
  }
}

function generateInvestigationId(): string {
  return 'inv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
}

async function monitorWormholeBridge(sequence: string, investigationId: string) {
  // This would typically be handled by a background job
  // For now, just log that monitoring has started
  console.log(`Starting Wormhole bridge monitoring for sequence ${sequence}, investigation ${investigationId}`)
  
  // In a real implementation, you would:
  // 1. Poll Wormhole API for VAA completion
  // 2. Monitor Sui network for the USDC mint transaction
  // 3. Update investigation status when bridge is complete
  // 4. Notify users of completion
}

export async function GET(request: NextRequest) {
  // Get investigations endpoint
  try {
    // In a real implementation, fetch from database
    // For now, return empty array
    return NextResponse.json({
      success: true,
      data: {
        investigations: [],
        total: 0
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch investigations' },
      { status: 500 }
    )
  }
}