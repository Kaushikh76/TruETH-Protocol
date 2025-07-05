// app/api/investigations/[id]/vote/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface VoteRequest {
  voteType: 'Correct' | 'Incorrect' | 'NeedsMoreEvidence'
  voter: string // wallet address
  reasoning?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const investigationId = params.id
    const voteData: VoteRequest = await request.json()

    // Validate required fields
    if (!voteData.voteType || !voteData.voter) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: voteType and voter' 
        },
        { status: 400 }
      )
    }

    // Validate vote type
    const validVoteTypes = ['Correct', 'Incorrect', 'NeedsMoreEvidence']
    if (!validVoteTypes.includes(voteData.voteType)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid vote type. Must be: Correct, Incorrect, or NeedsMoreEvidence' 
        },
        { status: 400 }
      )
    }

    // Validate wallet address format (basic check)
    if (!voteData.voter.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid wallet address format' 
        },
        { status: 400 }
      )
    }

    console.log(`🗳️ Recording vote for investigation ${investigationId}:`, {
      voter: voteData.voter,
      voteType: voteData.voteType,
      hasReasoning: !!voteData.reasoning
    })

    // Submit vote to enhanced backend
    const backendResponse = await recordVoteOnBackend(investigationId, voteData)

    if (!backendResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to record vote on backend',
          details: backendResponse.error
        },
        { status: 500 }
      )
    }

    // Log successful vote
    console.log('✅ Vote recorded successfully:', {
      investigationId,
      voteEntityId: backendResponse.voteEntityId,
      voter: voteData.voter,
      voteType: voteData.voteType
    })

    return NextResponse.json(
      {
        success: true,
        message: 'Vote recorded successfully in GRC-20 knowledge graph',
        data: {
          investigationId,
          voteEntityId: backendResponse.voteEntityId,
          voteType: voteData.voteType,
          voter: voteData.voter,
          reasoning: voteData.reasoning,
          timestamp: new Date().toISOString(),
          grc20: {
            spaceId: backendResponse.grc20?.spaceId,
            stored: backendResponse.grc20?.stored,
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error recording vote:', error)
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

// GET method to retrieve votes for an investigation
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const investigationId = params.id

    console.log(`📊 Retrieving votes for investigation: ${investigationId}`)

    // Get votes from enhanced backend
    const backendResponse = await getVotesFromBackend(investigationId)

    if (!backendResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to retrieve votes from backend',
          details: backendResponse.error
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          investigationId,
          votes: backendResponse.votes,
          summary: {
            total: Object.values(backendResponse.votes || {}).reduce((sum: number, count: any) => sum + (count || 0), 0),
            breakdown: backendResponse.votes
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error retrieving votes:', error)
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

async function recordVoteOnBackend(investigationId: string, voteData: VoteRequest) {
  try {
    const serverUrl = process.env.WALRUS_SERVER_URL || 'http://localhost:3000'
    
    const response = await fetch(`${serverUrl}/api/investigations/${investigationId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.WALRUS_API_KEY || 'dev-key-123'
      },
      body: JSON.stringify(voteData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Backend error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    return result

  } catch (error) {
    console.error('Failed to record vote on backend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown backend vote recording error'
    }
  }
}

async function getVotesFromBackend(investigationId: string) {
  try {
    const serverUrl = process.env.WALRUS_SERVER_URL || 'http://localhost:3000'
    
    const response = await fetch(`${serverUrl}/api/investigations/${investigationId}/votes`, {
      method: 'GET',
      headers: {
        'X-API-Key': process.env.WALRUS_API_KEY || 'dev-key-123'
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Backend error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    return result

  } catch (error) {
    console.error('Failed to get votes from backend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown backend vote retrieval error'
    }
  }
}