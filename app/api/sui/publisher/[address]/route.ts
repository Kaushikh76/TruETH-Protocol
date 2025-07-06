// app/api/sui/publisher/[address]/route.ts
import { NextRequest, NextResponse } from 'next/server'

const SUI_RPC_URL = process.env.SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'
const WALRUS_SERVER_URL = process.env.WALRUS_SERVER_URL || 'http://localhost:3000'
const WALRUS_API_KEY = process.env.WALRUS_API_KEY || 'dev-key-123'

interface SuiTransaction {
  digest: string
  timestampMs: string
  effects: {
    status: {
      status: string
    }
  }
  events?: Array<{
    type: string
    parsedJson?: any
  }>
}

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const publisherAddress = params.address
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const includeInvestigations = searchParams.get('include_investigations') === 'true'
    
    console.log(`🔍 Fetching Sui transactions for: ${publisherAddress}`)

    // Get transactions from Sui RPC
    const transactionsResult = await getAddressTransactions(publisherAddress, limit)
    
    if (!transactionsResult.success) {
      return NextResponse.json({
        success: false,
        error: transactionsResult.error
      }, { status: 500 })
    }

    // Extract blob events from transactions
    const blobEvents = []
    for (const tx of transactionsResult.data) {
      const events = await extractBlobEventsFromTransaction(tx)
      blobEvents.push(...events)
    }

    console.log(`📦 Found ${blobEvents.length} blob events from ${transactionsResult.data.length} transactions`)

    let investigations = []
    if (includeInvestigations && blobEvents.length > 0) {
      // Fetch investigation data for each blob
      investigations = await fetchInvestigationsFromBlobs(blobEvents)
      console.log(`✅ Loaded ${investigations.length} investigations`)
    }

    return NextResponse.json({
      success: true,
      data: {
        publisherAddress,
        transactions: transactionsResult.data.length,
        blobEvents: blobEvents.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        investigations: investigations.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        source: 'sui-blockchain',
        queriedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching Sui data:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch Sui data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getAddressTransactions(address: string, limit: number = 50): Promise<{
  success: boolean
  data: SuiTransaction[]
  error?: string
}> {
  try {
    const response = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'suix_queryTransactionBlocks',
        params: [
          {
            filter: {
              FromAddress: address
            },
            options: {
              showInput: true,
              showEffects: true,
              showEvents: true,
              showObjectChanges: true,
              showBalanceChanges: true
            }
          },
          null, // cursor
          limit,
          true  // descending order (newest first)
        ]
      })
    })

    if (!response.ok) {
      throw new Error(`Sui RPC error: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.error) {
      throw new Error(`Sui RPC error: ${result.error.message}`)
    }

    return {
      success: true,
      data: result.result?.data || []
    }

  } catch (error: any) {
    console.error('❌ Error querying Sui transactions:', error)
    return {
      success: false,
      data: [],
      error: error.message
    }
  }
}

async function extractBlobEventsFromTransaction(tx: SuiTransaction): Promise<any[]> {
  const blobEvents = []

  try {
    // Check if transaction was successful
    if (tx.effects?.status?.status !== 'success') {
      return blobEvents
    }

    // Look for Walrus-related events in the transaction
    if (tx.events) {
      for (const event of tx.events) {
        if (isWalrusBlobEvent(event)) {
          const blobEvent = parseWalrusBlobEvent(event, tx)
          if (blobEvent) {
            blobEvents.push(blobEvent)
          }
        }
      }
    }

    // Also check object changes for potential Walrus objects
    const objectChanges = await getTransactionObjectChanges(tx.digest)
    for (const change of objectChanges) {
      const blobEvent = extractBlobFromObjectChange(change, tx)
      if (blobEvent) {
        blobEvents.push(blobEvent)
      }
    }

  } catch (error) {
    console.warn(`Failed to extract blob events from tx ${tx.digest}:`, error)
  }

  return blobEvents
}

function isWalrusBlobEvent(event: any): boolean {
  const eventType = event.type?.toLowerCase() || ''
  const eventData = event.parsedJson || {}

  return (
    eventType.includes('walrus') ||
    eventType.includes('blob') ||
    eventData.blob_id ||
    eventData.blobId ||
    eventData.object_id
  )
}

function parseWalrusBlobEvent(event: any, tx: SuiTransaction): any {
  try {
    const eventData = event.parsedJson || {}
    
    const blobId = eventData.blob_id || 
                  eventData.blobId || 
                  eventData.id ||
                  extractBlobIdFromEventType(event.type)

    if (!blobId) {
      return null
    }

    return {
      blobId: blobId,
      registeredEpoch: eventData.registered_epoch || 0,
      objectId: eventData.object_id || eventData.objectId || '',
      transactionDigest: tx.digest,
      timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : new Date().toISOString(),
      eventType: event.type
    }

  } catch (error) {
    console.warn('Failed to parse Walrus blob event:', error)
    return null
  }
}

function extractBlobIdFromEventType(eventType: string): string | null {
  const match = eventType.match(/blob[_-]?id[:\s]*([a-zA-Z0-9_-]+)/i)
  return match ? match[1] : null
}

async function getTransactionObjectChanges(digest: string): Promise<any[]> {
  try {
    const response = await fetch(SUI_RPC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'sui_getTransactionBlock',
        params: [
          digest,
          {
            showObjectChanges: true
          }
        ]
      })
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json()
    return result.result?.objectChanges || []

  } catch (error) {
    console.warn(`Failed to get object changes for ${digest}:`, error)
    return []
  }
}

function extractBlobFromObjectChange(change: any, tx: SuiTransaction): any {
  try {
    if (change.type === 'created' && change.objectType) {
      const objectType = change.objectType.toLowerCase()
      
      if (objectType.includes('walrus') || objectType.includes('blob')) {
        const objectId = change.objectId
        const blobId = deriveBlobIdFromObjectId(objectId)
        
        if (blobId) {
          return {
            blobId: blobId,
            registeredEpoch: 0,
            objectId: objectId,
            transactionDigest: tx.digest,
            timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : new Date().toISOString(),
            source: 'object_change'
          }
        }
      }
    }
    return null
  } catch (error) {
    return null
  }
}

function deriveBlobIdFromObjectId(objectId: string): string | null {
  try {
    const cleaned = objectId.replace('0x', '')
    if (cleaned.length >= 40) {
      const portion = cleaned.slice(8, 40)
      return Buffer.from(portion, 'hex').toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
    }
    return null
  } catch (error) {
    return null
  }
}

async function fetchInvestigationsFromBlobs(blobEvents: any[]): Promise<any[]> {
  const investigations = []
  
  for (const blobEvent of blobEvents) {
    try {
      const response = await fetch(`${WALRUS_SERVER_URL}/api/investigations/retrieve/${blobEvent.blobId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.investigation) {
          investigations.push({
            ...result.data.investigation,
            blobId: blobEvent.blobId,
            transactionDigest: blobEvent.transactionDigest,
            createdAt: blobEvent.timestamp
          })
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch investigation for blob ${blobEvent.blobId}:`, error)
    }
  }

  return investigations
}