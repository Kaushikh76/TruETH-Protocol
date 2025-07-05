// app/api/walrus/store/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface WalrusStoreRequest {
  title: string
  content: string
  tags: string[]
  evidence: string[]
  files: any[]
  userWallet: string
  userId?: string
  bridgeTx: {
    hash: string
    amount: number
    from: string
    suiRecipient: string
    wormholeSequence: string
    timestamp: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const postData: WalrusStoreRequest = await request.json()

    // Validate required fields
    if (!postData.title || !postData.content || !postData.bridgeTx) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: title, content, and bridgeTx' 
        },
        { status: 400 }
      )
    }

    // Create enhanced investigation content for the new GRC-20 system
    const investigationContent = {
      title: postData.title,
      content: postData.content,
      tags: postData.tags || [],
      evidence: postData.evidence || [],
      files: postData.files || [],
      author: {
        wallet: postData.userWallet,
        userId: postData.userId || 'anonymous'
      },
      bridgeTransaction: postData.bridgeTx,
      metadata: {
        createdAt: new Date().toISOString(),
        version: '2.0.0', // Updated version for GRC-20 integration
        protocol: 'TruETH-GRC20',
        contentType: 'investigation'
      }
    }

    // Store on enhanced backend with GRC-20 integration
    const backendResponse = await storeOnEnhancedBackend(investigationContent)

    if (!backendResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to store data on enhanced backend',
          details: backendResponse.error
        },
        { status: 500 }
      )
    }

    // Generate unique post ID
    const postId = generatePostId()

    // Store enhanced metadata locally (for quick access)
    const postMetadata = {
      postId,
      blobId: backendResponse.blobId,
      title: postData.title,
      author: postData.userWallet,
      userId: postData.userId,
      createdAt: new Date().toISOString(),
      bridgeTxHash: postData.bridgeTx.hash,
      wormholeSequence: postData.bridgeTx.wormholeSequence,
      tags: postData.tags,
      status: 'stored',
      // GRC-20 specific fields
      grc20EntityId: backendResponse.grc20?.entityId,
      grc20SpaceId: backendResponse.grc20?.spaceId,
      investigationType: backendResponse.aiEntities?.investigationType,
      severityLevel: backendResponse.aiEntities?.severityLevel,
      geographicScope: backendResponse.aiEntities?.geographicScope,
    }

    // Log successful storage with enhanced details
    console.log('Investigation stored with GRC-20 integration:', {
      postId,
      blobId: backendResponse.blobId,
      author: postData.userWallet,
      bridgeTx: postData.bridgeTx.hash,
      grc20EntityId: backendResponse.grc20?.entityId,
      investigationType: backendResponse.aiEntities?.investigationType,
      severityLevel: backendResponse.aiEntities?.severityLevel,
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Investigation stored successfully with GRC-20 knowledge graph integration',
        data: {
          postId,
          blobId: backendResponse.blobId,
          suiObjectId: backendResponse.suiObjectId,
          size: backendResponse.size,
          epochs: backendResponse.epochs,
          // AI Analysis Results
          aiAnalysis: {
            investigationType: backendResponse.aiEntities?.investigationType,
            severityLevel: backendResponse.aiEntities?.severityLevel,
            geographicScope: backendResponse.aiEntities?.geographicScope,
            involvedEntities: backendResponse.aiEntities?.involvedEntities,
            timeframe: backendResponse.aiEntities?.timeframe,
            financialImpact: backendResponse.aiEntities?.financialImpact,
          },
          // GRC-20 Integration Results
          grc20: {
            stored: backendResponse.grc20?.stored,
            entityId: backendResponse.grc20?.entityId,
            spaceId: backendResponse.grc20?.spaceId,
            error: backendResponse.grc20?.error,
          },
          metadata: postMetadata
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error storing investigation with GRC-20:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function storeOnEnhancedBackend(content: any) {
  try {
    // Call the enhanced Node.js server's investigation storage endpoint
    const serverUrl = process.env.WALRUS_SERVER_URL || 'http://localhost:3000'
    
    const response = await fetch(`${serverUrl}/api/investigations/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.WALRUS_API_KEY || 'dev-key-123'
      },
      body: JSON.stringify(content)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Enhanced backend error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    return result

  } catch (error) {
    console.error('Failed to store on enhanced backend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown enhanced backend storage error'
    }
  }
}

function generatePostId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `inv-grc20-${timestamp}-${random}`
}

// Enhanced GET endpoint to retrieve investigation data with GRC-20 metadata
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const blobId = searchParams.get('blobId')
    const postId = searchParams.get('postId')
    const investigationId = searchParams.get('investigationId')

    if (!blobId && !postId && !investigationId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Either blobId, postId, or investigationId is required' 
        },
        { status: 400 }
      )
    }

    let targetBlobId = blobId

    // If postId provided, lookup blobId from metadata
    if (postId && !blobId) {
      // You would lookup the blobId from your metadata store
      // For now, return an error asking for blobId directly
      return NextResponse.json(
        { 
          success: false,
          error: 'Please provide blobId directly for data retrieval' 
        },
        { status: 400 }
      )
    }

    // Retrieve from enhanced backend
    const backendResponse = await retrieveFromEnhancedBackend(targetBlobId!)

    if (!backendResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to retrieve data from enhanced backend',
          details: backendResponse.error
        },
        { status: 404 }
      )
    }

    // If investigationId provided, also get voting data
    let votingData = null
    if (investigationId) {
      votingData = await getVotingData(investigationId)
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          investigation: backendResponse.data.investigation,
          metadata: backendResponse.data.metadata,
          blobId: targetBlobId,
          voting: votingData,
          // Additional GRC-20 specific data
          grc20: {
            entityId: backendResponse.data.metadata?.grc20EntityId,
            spaceId: backendResponse.data.metadata?.grc20SpaceId,
          },
          aiAnalysis: {
            investigationType: backendResponse.data.metadata?.investigationType,
            severityLevel: backendResponse.data.metadata?.severityLevel,
            geographicScope: backendResponse.data.metadata?.geographicScope,
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error retrieving from enhanced backend:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function retrieveFromEnhancedBackend(blobId: string) {
  try {
    const serverUrl = process.env.WALRUS_SERVER_URL || 'http://localhost:3000'
    
    const response = await fetch(`${serverUrl}/api/investigations/retrieve/${blobId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.WALRUS_API_KEY || 'dev-key-123'
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Enhanced backend error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    return result

  } catch (error) {
    console.error('Failed to retrieve from enhanced backend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown enhanced backend retrieval error'
    }
  }
}

async function getVotingData(investigationId: string) {
  try {
    const serverUrl = process.env.WALRUS_SERVER_URL || 'http://localhost:3000'
    
    const response = await fetch(`${serverUrl}/api/investigations/${investigationId}/votes`, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.WALRUS_API_KEY || 'dev-key-123'
      }
    })

    if (!response.ok) {
      console.warn(`Failed to get voting data: ${response.status}`)
      return null
    }

    const result = await response.json()
    return result.data

  } catch (error) {
    console.error('Failed to get voting data:', error)
    return null
  }
}