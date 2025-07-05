// app/api/grc20/space/route.ts
import { NextRequest, NextResponse } from 'next/server'

interface SpaceInitRequest {
  editorAddress: string
  spaceName?: string
}

interface QueryRequest {
  investigationType?: string
  severityLevel?: string
  status?: string
  geographicScope?: string
  authorWallet?: string
}

// POST - Initialize GRC-20 Space
export async function POST(request: NextRequest) {
  try {
    const spaceData: SpaceInitRequest = await request.json()

    // Validate required fields
    if (!spaceData.editorAddress) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: editorAddress' 
        },
        { status: 400 }
      )
    }

    // Validate wallet address format
    if (!spaceData.editorAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid wallet address format for editorAddress' 
        },
        { status: 400 }
      )
    }

    console.log('🌌 Initializing GRC-20 space for TruETH investigations:', {
      editorAddress: spaceData.editorAddress,
      spaceName: spaceData.spaceName || 'TruETH Investigations'
    })

    // Initialize space on enhanced backend
    const backendResponse = await initializeSpaceOnBackend(spaceData)

    if (!backendResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to initialize GRC-20 space on backend',
          details: backendResponse.error
        },
        { status: 500 }
      )
    }

    // Log successful initialization
    console.log('✅ GRC-20 space initialized successfully:', {
      spaceId: backendResponse.spaceId,
      editorAddress: spaceData.editorAddress,
      network: 'TESTNET'
    })

    return NextResponse.json(
      {
        success: true,
        message: 'GRC-20 space initialized successfully for TruETH investigations',
        data: {
          spaceId: backendResponse.spaceId,
          editorAddress: spaceData.editorAddress,
          spaceName: spaceData.spaceName || 'TruETH Investigations',
          network: 'TESTNET',
          propertyIds: backendResponse.propertyIds,
          typeIds: backendResponse.typeIds,
          browserUrl: `https://www.geobrowser.io/space/${backendResponse.spaceId}`,
          schema: {
            investigationTypes: [
              'Financial', 'Social', 'Technical', 'Legal', 
              'Environmental', 'Corporate', 'Political'
            ],
            severityLevels: ['Low', 'Medium', 'High', 'Critical'],
            geographicScopes: ['Local', 'Regional', 'National', 'International'],
            statusTypes: ['Pending', 'Verified', 'Disputed', 'Resolved'],
            voteTypes: ['Correct', 'Incorrect', 'NeedsMoreEvidence']
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error initializing GRC-20 space:', error)
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

// GET - Query Investigations from GRC-20 Space
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const queryFilters: QueryRequest = {
      investigationType: searchParams.get('investigationType') || undefined,
      severityLevel: searchParams.get('severityLevel') || undefined,
      status: searchParams.get('status') || undefined,
      geographicScope: searchParams.get('geographicScope') || undefined,
      authorWallet: searchParams.get('authorWallet') || undefined,
    }

    // Remove undefined values
    const cleanedFilters = Object.fromEntries(
      Object.entries(queryFilters).filter(([_, value]) => value !== undefined)
    )

    console.log('🔍 Querying GRC-20 investigations with filters:', cleanedFilters)

    // Query investigations from enhanced backend
    const backendResponse = await queryInvestigationsFromBackend(cleanedFilters)

    if (!backendResponse.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to query investigations from backend',
          details: backendResponse.error
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          investigations: backendResponse.investigations,
          count: backendResponse.investigations?.length || 0,
          filters: cleanedFilters,
          availableFilters: {
            investigationTypes: [
              'Financial', 'Social', 'Technical', 'Legal', 
              'Environmental', 'Corporate', 'Political'
            ],
            severityLevels: ['Low', 'Medium', 'High', 'Critical'],
            geographicScopes: ['Local', 'Regional', 'National', 'International'],
            statusTypes: ['Pending', 'Verified', 'Disputed', 'Resolved']
          }
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error querying GRC-20 investigations:', error)
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

async function initializeSpaceOnBackend(spaceData: SpaceInitRequest) {
  try {
    const serverUrl = process.env.WALRUS_SERVER_URL || 'http://localhost:3000'
    
    const response = await fetch(`${serverUrl}/api/grc20/initialize-space`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.WALRUS_API_KEY || 'dev-key-123'
      },
      body: JSON.stringify({
        editorAddress: spaceData.editorAddress,
        spaceName: spaceData.spaceName || 'TruETH Investigations'
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Backend error: ${response.status} - ${errorData}`)
    }

    const result = await response.json()
    return result

  } catch (error) {
    console.error('Failed to initialize space on backend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown backend space initialization error'
    }
  }
}

async function queryInvestigationsFromBackend(filters: any) {
  try {
    const serverUrl = process.env.WALRUS_SERVER_URL || 'http://localhost:3000'
    
    // Build query parameters
    const queryParams = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        queryParams.append(key, value as string)
      }
    })
    
    const response = await fetch(`${serverUrl}/api/investigations/query?${queryParams}`, {
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
    console.error('Failed to query investigations from backend:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown backend query error'
    }
  }
}