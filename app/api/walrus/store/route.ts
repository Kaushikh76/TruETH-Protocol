// api/walrus/store/route.ts
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

    // Create investigation content for Walrus storage
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
        version: '1.0.0',
        protocol: 'TruETH',
        contentType: 'investigation'
      }
    }

    // Store on Walrus via your server
    const walrusResponse = await storeOnWalrus(investigationContent)

    if (!walrusResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to store data on Walrus',
          details: walrusResponse.error
        },
        { status: 500 }
      )
    }

    // Generate unique post ID
    const postId = generatePostId()

    // Store metadata locally (for quick access)
    const postMetadata = {
      postId,
      blobId: walrusResponse.blobId,
      title: postData.title,
      author: postData.userWallet,
      userId: postData.userId,
      createdAt: new Date().toISOString(),
      bridgeTxHash: postData.bridgeTx.hash,
      wormholeSequence: postData.bridgeTx.wormholeSequence,
      tags: postData.tags,
      status: 'stored'
    }

    // Log successful storage
    console.log('Investigation stored on Walrus:', {
      postId,
      blobId: walrusResponse.blobId,
      author: postData.userWallet,
      bridgeTx: postData.bridgeTx.hash
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Investigation stored successfully on Walrus',
        data: {
          postId,
          blobId: walrusResponse.blobId,
          suiObjectId: walrusResponse.suiObjectId,
          size: walrusResponse.size,
          epochs: walrusResponse.epochs,
          metadata: postMetadata
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error storing investigation on Walrus:', error)
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

async function storeOnWalrus(content: any) {
  try {
    // Call your Node.js server's Walrus storage endpoint
    const serverUrl = process.env.WALRUS_SERVER_URL || 'http://localhost:3000'
    
    const response = await fetch(`${serverUrl}/api/walrus/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.WALRUS_API_KEY || 'dev-key-123'
      },
      body: JSON.stringify(content)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Walrus server error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    return result

  } catch (error) {
    console.error('Failed to store on Walrus:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Walrus storage error'
    }
  }
}

function generatePostId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `inv-${timestamp}-${random}`
}

// GET endpoint to retrieve investigation data from Walrus
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const blobId = searchParams.get('blobId')
    const postId = searchParams.get('postId')

    if (!blobId && !postId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Either blobId or postId is required' 
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

    // Retrieve from Walrus via your server
    const walrusResponse = await retrieveFromWalrus(targetBlobId!)

    if (!walrusResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to retrieve data from Walrus',
          details: walrusResponse.error
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: walrusResponse.data
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error retrieving from Walrus:', error)
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

async function retrieveFromWalrus(blobId: string) {
  try {
    const serverUrl = process.env.WALRUS_SERVER_URL || 'http://localhost:3000'
    
    const response = await fetch(`${serverUrl}/api/walrus/retrieve/${blobId}`, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.WALRUS_API_KEY || 'dev-key-123'
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Walrus server error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    return result

  } catch (error) {
    console.error('Failed to retrieve from Walrus:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Walrus retrieval error'
    }
  }
}