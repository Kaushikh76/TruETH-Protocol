// lib/suiBlockchainService.ts - Service to fetch blobs from Sui blockchain
import { EnhancedInvestigation } from '../types/enhanced-investigation'

const SUI_RPC_URL = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'
const WALRUS_SERVER_URL = process.env.NEXT_PUBLIC_WALRUS_SERVER_URL || 'http://localhost:3000'
const WALRUS_API_KEY = process.env.NEXT_PUBLIC_WALRUS_API_KEY || 'dev-key-123'

// The specific publisher address to query
const TARGET_PUBLISHER = '0x7b005829a1305a3ebeea7cff0dd200bbe7e2f42d1adce0d9045dd57ef12f52c9'

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

interface WalrusBlobEvent {
  blobId: string
  registeredEpoch: number
  objectId: string
  sender: string
  timestamp: string
}

export class SuiBlockchainService {
  private static instance: SuiBlockchainService
  private cache: Map<string, any> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_DURATION = 60000 // 1 minute

  static getInstance(): SuiBlockchainService {
    if (!SuiBlockchainService.instance) {
      SuiBlockchainService.instance = new SuiBlockchainService()
    }
    return SuiBlockchainService.instance
  }

  private isValidCache(key: string): boolean {
    const expiry = this.cacheExpiry.get(key)
    return expiry ? Date.now() < expiry : false
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, data)
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION)
  }

  /**
   * Get all blob events from the publisher's transactions on Sui
   */
  async getPublisherBlobEvents(): Promise<{
    success: boolean
    blobEvents: WalrusBlobEvent[]
    error?: string
  }> {
    try {
      const cacheKey = `sui_blobs_${TARGET_PUBLISHER}`
      
      if (this.isValidCache(cacheKey)) {
        return this.cache.get(cacheKey)
      }

      console.log(`🔍 Querying Sui blockchain for blobs from: ${TARGET_PUBLISHER}`)

      // Get transactions from the publisher address
      const transactions = await this.getAddressTransactions(TARGET_PUBLISHER)
      
      if (!transactions.success) {
        throw new Error(transactions.error)
      }

      console.log(`📦 Found ${transactions.data.length} transactions from publisher`)

      // Extract blob events from transactions
      const blobEvents: WalrusBlobEvent[] = []
      
      for (const tx of transactions.data) {
        const events = await this.extractBlobEventsFromTransaction(tx)
        blobEvents.push(...events)
      }

      console.log(`✅ Extracted ${blobEvents.length} blob events`)

      const result = {
        success: true,
        blobEvents: blobEvents.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      }

      this.setCache(cacheKey, result)
      return result

    } catch (error: any) {
      console.error('❌ Error getting publisher blob events:', error)
      return {
        success: false,
        blobEvents: [],
        error: error.message
      }
    }
  }

  /**
   * Get all transactions for an address from Sui RPC
   */
  private async getAddressTransactions(address: string): Promise<{
    success: boolean
    data: SuiTransaction[]
    error?: string
  }> {
    try {
      // Query Sui RPC for transactions from this address
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
            50,   // limit - get recent 50 transactions
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

  /**
   * Extract blob events from a transaction
   */
  private async extractBlobEventsFromTransaction(tx: SuiTransaction): Promise<WalrusBlobEvent[]> {
    const blobEvents: WalrusBlobEvent[] = []

    try {
      // Check if transaction was successful
      if (tx.effects?.status?.status !== 'success') {
        return blobEvents
      }

      // Look for Walrus-related events in the transaction
      if (tx.events) {
        for (const event of tx.events) {
          // Look for Walrus blob creation events
          // The exact event structure may vary, but typically includes blob info
          if (this.isWalrusBlobEvent(event)) {
            const blobEvent = this.parseWalrusBlobEvent(event, tx)
            if (blobEvent) {
              blobEvents.push(blobEvent)
            }
          }
        }
      }

      // Also check object changes for Walrus objects
      const objectChanges = await this.getTransactionObjectChanges(tx.digest)
      for (const change of objectChanges) {
        const blobEvent = this.extractBlobFromObjectChange(change, tx)
        if (blobEvent) {
          blobEvents.push(blobEvent)
        }
      }

    } catch (error) {
      console.warn(`Failed to extract blob events from tx ${tx.digest}:`, error)
    }

    return blobEvents
  }

  /**
   * Check if an event is a Walrus blob event
   */
  private isWalrusBlobEvent(event: any): boolean {
    // Check for common Walrus event patterns
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

  /**
   * Parse a Walrus blob event
   */
  private parseWalrusBlobEvent(event: any, tx: SuiTransaction): WalrusBlobEvent | null {
    try {
      const eventData = event.parsedJson || {}
      
      // Extract blob ID from various possible field names
      const blobId = eventData.blob_id || 
                    eventData.blobId || 
                    eventData.id ||
                    this.extractBlobIdFromEventType(event.type)

      if (!blobId) {
        return null
      }

      return {
        blobId: blobId,
        registeredEpoch: eventData.registered_epoch || 0,
        objectId: eventData.object_id || eventData.objectId || '',
        sender: TARGET_PUBLISHER,
        timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : new Date().toISOString()
      }

    } catch (error) {
      console.warn('Failed to parse Walrus blob event:', error)
      return null
    }
  }

  /**
   * Extract blob ID from event type string
   */
  private extractBlobIdFromEventType(eventType: string): string | null {
    // Sometimes blob ID is embedded in the event type
    const match = eventType.match(/blob[_-]?id[:\s]*([a-zA-Z0-9_-]+)/i)
    return match ? match[1] : null
  }

  /**
   * Get object changes for a transaction
   */
  private async getTransactionObjectChanges(digest: string): Promise<any[]> {
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

  /**
   * Extract blob info from object changes
   */
  private extractBlobFromObjectChange(change: any, tx: SuiTransaction): WalrusBlobEvent | null {
    try {
      // Look for created objects that might be Walrus blobs
      if (change.type === 'created' && change.objectType) {
        const objectType = change.objectType.toLowerCase()
        
        if (objectType.includes('walrus') || objectType.includes('blob')) {
          // Extract potential blob ID from object ID or digest
          const objectId = change.objectId
          const blobId = this.deriveBlobIdFromObjectId(objectId)
          
          if (blobId) {
            return {
              blobId: blobId,
              registeredEpoch: 0,
              objectId: objectId,
              sender: TARGET_PUBLISHER,
              timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : new Date().toISOString()
            }
          }
        }
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Derive blob ID from Sui object ID
   * This is a heuristic - the actual mapping might be different
   */
  private deriveBlobIdFromObjectId(objectId: string): string | null {
    try {
      // Remove 0x prefix and take a portion that might represent the blob ID
      const cleaned = objectId.replace('0x', '')
      
      // Walrus blob IDs are typically base64-like strings
      // This is a rough conversion - in practice you'd need the actual mapping
      if (cleaned.length >= 40) {
        // Take middle portion and convert to base64-like format
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

  /**
   * Get investigations from blob events
   */
  async getInvestigationsFromBlobEvents(): Promise<{
    success: boolean
    investigations: EnhancedInvestigation[]
    blobEvents: WalrusBlobEvent[]
    error?: string
  }> {
    try {
      // Get blob events from Sui
      const blobEventsResult = await this.getPublisherBlobEvents()
      
      if (!blobEventsResult.success) {
        return {
          success: false,
          investigations: [],
          blobEvents: [],
          error: blobEventsResult.error
        }
      }

      console.log(`📦 Processing ${blobEventsResult.blobEvents.length} blob events`)

      // Fetch investigation data for each blob
      const investigations: EnhancedInvestigation[] = []
      
      for (const blobEvent of blobEventsResult.blobEvents) {
        try {
          const investigation = await this.fetchInvestigationFromBlob(blobEvent)
          if (investigation) {
            investigations.push(investigation)
          }
        } catch (error) {
          console.warn(`Failed to fetch investigation from blob ${blobEvent.blobId}:`, error)
        }
      }

      console.log(`✅ Successfully loaded ${investigations.length} investigations`)

      return {
        success: true,
        investigations: investigations.sort((a, b) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        ),
        blobEvents: blobEventsResult.blobEvents
      }

    } catch (error: any) {
      console.error('❌ Error getting investigations from blob events:', error)
      return {
        success: false,
        investigations: [],
        blobEvents: [],
        error: error.message
      }
    }
  }

  /**
   * Fetch investigation data from a specific blob
   */
  private async fetchInvestigationFromBlob(blobEvent: WalrusBlobEvent): Promise<EnhancedInvestigation | null> {
    try {
      console.log(`📥 Fetching investigation from blob: ${blobEvent.blobId}`)

      const response = await fetch(`${WALRUS_SERVER_URL}/api/investigations/retrieve/${blobEvent.blobId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (!response.ok) {
        console.warn(`Failed to fetch blob ${blobEvent.blobId}: ${response.status}`)
        return null
      }

      const result = await response.json()
      
      if (!result.success || !result.data?.investigation) {
        console.warn(`No investigation data in blob ${blobEvent.blobId}`)
        return null
      }

      // Transform the blob data to an Enhanced Investigation
      return this.transformBlobToInvestigation(result.data.investigation, blobEvent)

    } catch (error) {
      console.warn(`Error fetching blob ${blobEvent.blobId}:`, error)
      return null
    }
  }

  /**
   * Transform blob data to Enhanced Investigation
   */
  private transformBlobToInvestigation(blobData: any, blobEvent: WalrusBlobEvent): EnhancedInvestigation {
    const investigationId = `sui_${blobEvent.blobId.slice(0, 10)}`
    
    return {
      id: investigationId,
      title: blobData.title || 'Untitled Investigation',
      content: blobData.content || 'No content available',
      author: blobData.author?.wallet || TARGET_PUBLISHER,
      authorAddress: blobData.author?.wallet || TARGET_PUBLISHER,
      createdAt: new Date(blobEvent.timestamp),
      verificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      
      investigationType: blobData.aiExtractedEntities?.investigationType || 'Technical',
      severityLevel: blobData.aiExtractedEntities?.severityLevel || 'Medium',
      geographicScope: blobData.aiExtractedEntities?.geographicScope || 'Regional',
      status: 'Pending',
      
      involvedEntities: {
        people: blobData.aiExtractedEntities?.involvedEntities?.people || [],
        organizations: blobData.aiExtractedEntities?.involvedEntities?.organizations || [],
        locations: blobData.aiExtractedEntities?.involvedEntities?.locations || [],
        platforms: blobData.aiExtractedEntities?.involvedEntities?.platforms || [],
        walletAddresses: blobData.aiExtractedEntities?.involvedEntities?.walletAddresses || [],
        websites: blobData.aiExtractedEntities?.involvedEntities?.websites || []
      },
      
      timeframe: {
        startDate: blobData.aiExtractedEntities?.timeframe?.startDate,
        endDate: blobData.aiExtractedEntities?.timeframe?.endDate,
        duration: blobData.aiExtractedEntities?.timeframe?.duration
      },
      
      financialImpact: blobData.aiExtractedEntities?.financialImpact,
      
      votes: { correct: 0, incorrect: 0, needsMoreEvidence: 0 },
      userVotes: {},
      tags: Array.isArray(blobData.tags) ? blobData.tags : [],
      evidence: Array.isArray(blobData.evidence) ? blobData.evidence : [],
      rewardPool: 1,
      
      blobId: blobEvent.blobId,
      grc20EntityId: blobEvent.objectId
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
    this.cacheExpiry.clear()
  }

  /**
   * Get target publisher address
   */
  getTargetPublisher(): string {
    return TARGET_PUBLISHER
  }
}