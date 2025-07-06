// lib/enhancedSuiBlockchainService.ts - Better blob content fetching
import { EnhancedInvestigation } from '../types/enhanced-investigation'

const SUI_RPC_URL = process.env.NEXT_PUBLIC_SUI_RPC_URL || 'https://fullnode.testnet.sui.io:443'
const WALRUS_SERVER_URL = process.env.NEXT_PUBLIC_WALRUS_SERVER_URL || 'http://localhost:3000'
const WALRUS_API_KEY = process.env.NEXT_PUBLIC_WALRUS_API_KEY || 'dev-key-123'

// Alternative Walrus endpoints to try
const WALRUS_ENDPOINTS = [
  'https://publisher-devnet.walrus.space',
  'https://aggregator-devnet.walrus.space',
  'https://blobscan.com',
  WALRUS_SERVER_URL
]

// The specific publisher address to query
const TARGET_PUBLISHER = '0x7b005829a1305a3ebeea7cff0dd200bbe7e2f42d1adce0d9045dd57ef12f52c9'

interface SuiTransaction {
  digest: string
  timestampMs: string
  checkpoint: string
  effects: {
    status: {
      status: string
    }
  }
  events?: Array<{
    type: string
    parsedJson?: any
  }>
  objectChanges?: Array<{
    type: string
    objectType?: string
    objectId?: string
    version?: string
    digest?: string
  }>
}

interface WalrusBlobEvent {
  blobId: string
  registeredEpoch: number
  objectId: string
  sender: string
  timestamp: string
  transactionDigest: string
  size?: number
  storageId?: string
  endEpoch?: number
}

export class EnhancedSuiBlockchainService {
  private static instance: EnhancedSuiBlockchainService
  private cache: Map<string, any> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_DURATION = 300000 // 5 minutes
  
  // Track successful blob fetches
  private successfulBlobs: Set<string> = new Set()
  private failedBlobs: Set<string> = new Set()

  static getInstance(): EnhancedSuiBlockchainService {
    if (!EnhancedSuiBlockchainService.instance) {
      EnhancedSuiBlockchainService.instance = new EnhancedSuiBlockchainService()
    }
    return EnhancedSuiBlockchainService.instance
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
   * Get all blob events and convert them to investigations
   */
  async getPublisherInvestigations(): Promise<{
    success: boolean
    investigations: EnhancedInvestigation[]
    blobEvents: WalrusBlobEvent[]
    stats: {
      totalTransactions: number
      totalBlobEvents: number
      successfulFetches: number
      failedFetches: number
    }
    error?: string
  }> {
    try {
      const cacheKey = `sui_investigations_${TARGET_PUBLISHER}`
      
      if (this.isValidCache(cacheKey)) {
        return this.cache.get(cacheKey)
      }

      console.log(`🔍 Getting publisher investigations from Sui blockchain: ${TARGET_PUBLISHER}`)

      // Step 1: Get blob events from Sui blockchain
      const blobEventsResult = await this.getPublisherBlobEvents()
      
      if (!blobEventsResult.success) {
        throw new Error(blobEventsResult.error)
      }

      console.log(`📦 Found ${blobEventsResult.blobEvents.length} blob events`)

      // Step 2: Convert blob events to investigations
      const investigations = await this.convertBlobEventsToInvestigations(blobEventsResult.blobEvents)
      
      console.log(`✅ Successfully converted ${investigations.length} blob events to investigations`)

      const result = {
        success: true,
        investigations: investigations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
        blobEvents: blobEventsResult.blobEvents,
        stats: {
          totalTransactions: blobEventsResult.totalTransactions || 0,
          totalBlobEvents: blobEventsResult.blobEvents.length,
          successfulFetches: this.successfulBlobs.size,
          failedFetches: this.failedBlobs.size
        }
      }

      this.setCache(cacheKey, result)
      return result

    } catch (error: any) {
      console.error('❌ Error getting publisher investigations:', error)
      return {
        success: false,
        investigations: [],
        blobEvents: [],
        stats: {
          totalTransactions: 0,
          totalBlobEvents: 0,
          successfulFetches: 0,
          failedFetches: 0
        },
        error: error.message
      }
    }
  }

  /**
   * Get all blob events from the publisher's transactions on Sui
   */
  async getPublisherBlobEvents(): Promise<{
    success: boolean
    blobEvents: WalrusBlobEvent[]
    totalTransactions: number
    error?: string
  }> {
    try {
      console.log(`🔍 Querying Sui blockchain for transactions from: ${TARGET_PUBLISHER}`)

      // Get transactions from the publisher address
      const transactions = await this.getAddressTransactions(TARGET_PUBLISHER, 100) // Increased limit
      
      if (!transactions.success) {
        throw new Error(transactions.error)
      }

      console.log(`📦 Found ${transactions.data.length} transactions from publisher`)

      // Extract blob events from all transactions
      const allBlobEvents: WalrusBlobEvent[] = []
      
      for (const tx of transactions.data) {
        const events = await this.extractBlobEventsFromTransaction(tx)
        allBlobEvents.push(...events)
      }

      // Deduplicate blob events by blob ID
      const uniqueBlobEvents = this.deduplicateBlobEvents(allBlobEvents)

      console.log(`✅ Extracted ${uniqueBlobEvents.length} unique blob events from ${allBlobEvents.length} total events`)

      return {
        success: true,
        blobEvents: uniqueBlobEvents.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ),
        totalTransactions: transactions.data.length
      }

    } catch (error: any) {
      console.error('❌ Error getting publisher blob events:', error)
      return {
        success: false,
        blobEvents: [],
        totalTransactions: 0,
        error: error.message
      }
    }
  }

  /**
   * Convert blob events to investigations by fetching content
   */
  async convertBlobEventsToInvestigations(blobEvents: WalrusBlobEvent[]): Promise<EnhancedInvestigation[]> {
    const investigations: EnhancedInvestigation[] = []
    
    console.log(`🔄 Converting ${blobEvents.length} blob events to investigations...`)
    
    // Process blobs in parallel but with limited concurrency
    const batchSize = 5
    for (let i = 0; i < blobEvents.length; i += batchSize) {
      const batch = blobEvents.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (blobEvent) => {
        try {
          const investigation = await this.fetchInvestigationFromBlobEvent(blobEvent)
          if (investigation) {
            this.successfulBlobs.add(blobEvent.blobId)
            return investigation
          } else {
            this.failedBlobs.add(blobEvent.blobId)
            // Create a minimal investigation from blob metadata if content fetch fails
            return this.createMinimalInvestigationFromBlobEvent(blobEvent)
          }
        } catch (error) {
          console.warn(`Failed to process blob ${blobEvent.blobId}:`, error)
          this.failedBlobs.add(blobEvent.blobId)
          return this.createMinimalInvestigationFromBlobEvent(blobEvent)
        }
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          investigations.push(result.value)
        }
      }
      
      // Log progress
      console.log(`📊 Processed ${Math.min(i + batchSize, blobEvents.length)}/${blobEvents.length} blob events`)
    }
    
    return investigations
  }

  /**
   * Fetch investigation content from a blob event
   */
  async fetchInvestigationFromBlobEvent(blobEvent: WalrusBlobEvent): Promise<EnhancedInvestigation | null> {
    // Try multiple methods to fetch blob content
    
    // Method 1: Try our Walrus server
    let content = await this.fetchBlobFromWalrusServer(blobEvent.blobId)
    
    // Method 2: Try direct Walrus aggregator
    if (!content) {
      content = await this.fetchBlobFromWalrusAggregator(blobEvent.blobId)
    }
    
    // Method 3: Try Walrus publisher endpoint
    if (!content) {
      content = await this.fetchBlobFromWalrusPublisher(blobEvent.blobId)
    }
    
    if (content) {
      return this.transformBlobContentToInvestigation(content, blobEvent)
    }
    
    return null
  }

  /**
   * Fetch blob from our Walrus server
   */
  async fetchBlobFromWalrusServer(blobId: string): Promise<any> {
    try {
      console.log(`📥 Fetching blob from server: ${blobId}`)
      
      const response = await fetch(`${WALRUS_SERVER_URL}/api/investigations/retrieve/${blobId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.investigation) {
          console.log(`✅ Successfully fetched blob ${blobId} from server`)
          return result.data.investigation
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch blob ${blobId} from server:`, error)
    }
    
    return null
  }

  /**
   * Fetch blob from Walrus aggregator
   */
  async fetchBlobFromWalrusAggregator(blobId: string): Promise<any> {
    try {
      console.log(`📥 Fetching blob from aggregator: ${blobId}`)
      
      const response = await fetch(`https://aggregator-devnet.walrus.space/v1/${blobId}`, {
        method: 'GET'
      })

      if (response.ok) {
        const text = await response.text()
        try {
          const parsed = JSON.parse(text)
          console.log(`✅ Successfully fetched blob ${blobId} from aggregator`)
          return parsed
        } catch {
          // If not JSON, create a simple investigation from the text
          return {
            title: `Investigation ${blobId.slice(0, 8)}`,
            content: text.slice(0, 500) + (text.length > 500 ? '...' : ''),
            metadata: {
              createdAt: new Date().toISOString(),
              source: 'walrus-aggregator'
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch blob ${blobId} from aggregator:`, error)
    }
    
    return null
  }

  /**
   * Fetch blob from Walrus publisher
   */
  async fetchBlobFromWalrusPublisher(blobId: string): Promise<any> {
    try {
      console.log(`📥 Fetching blob from publisher: ${blobId}`)
      
      const response = await fetch(`https://publisher-devnet.walrus.space/v1/store?id=${blobId}`, {
        method: 'GET'
      })

      if (response.ok) {
        const text = await response.text()
        try {
          const parsed = JSON.parse(text)
          console.log(`✅ Successfully fetched blob ${blobId} from publisher`)
          return parsed
        } catch {
          return {
            title: `Investigation ${blobId.slice(0, 8)}`,
            content: text.slice(0, 500) + (text.length > 500 ? '...' : ''),
            metadata: {
              createdAt: new Date().toISOString(),
              source: 'walrus-publisher'
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch blob ${blobId} from publisher:`, error)
    }
    
    return null
  }

  /**
   * Create minimal investigation from blob event when content fetch fails
   */
  createMinimalInvestigationFromBlobEvent(blobEvent: WalrusBlobEvent): EnhancedInvestigation {
    const investigationId = `sui_${blobEvent.blobId.slice(0, 10)}`
    
    return {
      id: investigationId,
      title: `Investigation ${blobEvent.blobId.slice(0, 8)}...`,
      content: `Investigation stored as blob ${blobEvent.blobId}. Content retrieval pending from Walrus network.`,
      author: TARGET_PUBLISHER.slice(0, 10) + '...',
      authorAddress: TARGET_PUBLISHER,
      createdAt: new Date(blobEvent.timestamp),
      verificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      
      investigationType: 'Technical',
      severityLevel: 'Medium',
      geographicScope: 'Regional',
      status: 'Pending',
      
      involvedEntities: {
        people: [],
        organizations: [],
        locations: [],
        platforms: ['Sui', 'Walrus'],
        walletAddresses: [TARGET_PUBLISHER],
        websites: []
      },
      
      timeframe: {},
      
      votes: { correct: 0, incorrect: 0, needsMoreEvidence: 0 },
      userVotes: {},
      tags: ['blockchain', 'walrus', 'sui'],
      evidence: [`Sui Transaction: ${blobEvent.transactionDigest}`, `Blob ID: ${blobEvent.blobId}`],
      rewardPool: 1,
      
      blobId: blobEvent.blobId,
      grc20EntityId: blobEvent.objectId
    }
  }

  /**
   * Transform blob content to Enhanced Investigation
   */
  transformBlobContentToInvestigation(blobContent: any, blobEvent: WalrusBlobEvent): EnhancedInvestigation {
    const investigationId = `sui_${blobEvent.blobId.slice(0, 10)}`
    
    return {
      id: investigationId,
      title: blobContent.title || `Investigation ${blobEvent.blobId.slice(0, 8)}`,
      content: blobContent.content || 'No content available',
      author: blobContent.author?.wallet || TARGET_PUBLISHER.slice(0, 10) + '...',
      authorAddress: blobContent.author?.wallet || TARGET_PUBLISHER,
      createdAt: new Date(blobEvent.timestamp),
      verificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      
      investigationType: blobContent.aiExtractedEntities?.investigationType || 'Technical',
      severityLevel: blobContent.aiExtractedEntities?.severityLevel || 'Medium',
      geographicScope: blobContent.aiExtractedEntities?.geographicScope || 'Regional',
      status: 'Pending',
      
      involvedEntities: {
        people: blobContent.aiExtractedEntities?.involvedEntities?.people || [],
        organizations: blobContent.aiExtractedEntities?.involvedEntities?.organizations || [],
        locations: blobContent.aiExtractedEntities?.involvedEntities?.locations || [],
        platforms: blobContent.aiExtractedEntities?.involvedEntities?.platforms || ['Sui', 'Walrus'],
        walletAddresses: blobContent.aiExtractedEntities?.involvedEntities?.walletAddresses || [TARGET_PUBLISHER],
        websites: blobContent.aiExtractedEntities?.involvedEntities?.websites || []
      },
      
      timeframe: {
        startDate: blobContent.aiExtractedEntities?.timeframe?.startDate,
        endDate: blobContent.aiExtractedEntities?.timeframe?.endDate,
        duration: blobContent.aiExtractedEntities?.timeframe?.duration
      },
      
      financialImpact: blobContent.aiExtractedEntities?.financialImpact,
      
      votes: { correct: 0, incorrect: 0, needsMoreEvidence: 0 },
      userVotes: {},
      tags: Array.isArray(blobContent.tags) ? blobContent.tags : ['blockchain', 'walrus', 'sui'],
      evidence: Array.isArray(blobContent.evidence) ? blobContent.evidence : [`Sui Transaction: ${blobEvent.transactionDigest}`, `Blob ID: ${blobEvent.blobId}`],
      rewardPool: 1,
      
      blobId: blobEvent.blobId,
      grc20EntityId: blobEvent.objectId
    }
  }

  /**
   * Get transactions for an address from Sui RPC
   */
  private async getAddressTransactions(address: string, limit: number = 100): Promise<{
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

  /**
   * Extract blob events from a transaction with better parsing
   */
  private async extractBlobEventsFromTransaction(tx: SuiTransaction): Promise<WalrusBlobEvent[]> {
    const blobEvents: WalrusBlobEvent[] = []

    try {
      // Check if transaction was successful
      if (tx.effects?.status?.status !== 'success') {
        return blobEvents
      }

      // Method 1: Parse events for Walrus blob creation
      if (tx.events) {
        for (const event of tx.events) {
          if (this.isWalrusBlobEvent(event)) {
            const blobEvent = this.parseWalrusBlobEvent(event, tx)
            if (blobEvent) {
              blobEvents.push(blobEvent)
            }
          }
        }
      }

      // Method 2: Parse object changes for Walrus objects
      if (tx.objectChanges) {
        for (const change of tx.objectChanges) {
          const blobEvent = this.extractBlobFromObjectChange(change, tx)
          if (blobEvent) {
            blobEvents.push(blobEvent)
          }
        }
      }

      // Method 3: If no events found, try to extract from transaction digest/structure
      if (blobEvents.length === 0) {
        const derivedBlobEvent = this.deriveBlobEventFromTransaction(tx)
        if (derivedBlobEvent) {
          blobEvents.push(derivedBlobEvent)
        }
      }

    } catch (error) {
      console.warn(`Failed to extract blob events from tx ${tx.digest}:`, error)
    }

    return blobEvents
  }

  /**
   * Check if an event is a Walrus blob event with better detection
   */
  private isWalrusBlobEvent(event: any): boolean {
    const eventType = event.type?.toLowerCase() || ''
    const eventData = event.parsedJson || {}

    return (
      eventType.includes('walrus') ||
      eventType.includes('blob') ||
      eventType.includes('store') ||
      eventData.blob_id ||
      eventData.blobId ||
      eventData.object_id ||
      eventData.stored_epoch ||
      eventData.end_epoch
    )
  }

  /**
   * Parse Walrus blob event with better field extraction
   */
  private parseWalrusBlobEvent(event: any, tx: SuiTransaction): WalrusBlobEvent | null {
    try {
      const eventData = event.parsedJson || {}
      
      // Try multiple field names for blob ID
      const blobId = eventData.blob_id || 
                    eventData.blobId || 
                    eventData.id ||
                    eventData.stored_blob_id ||
                    this.extractBlobIdFromEventType(event.type)

      if (!blobId) {
        return null
      }

      return {
        blobId: blobId,
        registeredEpoch: eventData.stored_epoch || eventData.registered_epoch || 0,
        objectId: eventData.object_id || eventData.objectId || '',
        sender: TARGET_PUBLISHER,
        timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : new Date().toISOString(),
        transactionDigest: tx.digest,
        size: eventData.size || 0,
        storageId: eventData.storage_id || eventData.storageId,
        endEpoch: eventData.end_epoch || eventData.endEpoch
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
    const match = eventType.match(/blob[_-]?id[:\s]*([a-zA-Z0-9_-]+)/i)
    return match ? match[1] : null
  }

  /**
   * Extract blob info from object changes with better detection
   */
  private extractBlobFromObjectChange(change: any, tx: SuiTransaction): WalrusBlobEvent | null {
    try {
      if (change.type === 'created' && change.objectType) {
        const objectType = change.objectType.toLowerCase()
        
        if (objectType.includes('walrus') || objectType.includes('blob') || objectType.includes('store')) {
          const objectId = change.objectId
          
          // Try to derive blob ID from object ID or use object ID directly
          const blobId = this.deriveBlobIdFromObjectId(objectId) || objectId
          
          if (blobId) {
            return {
              blobId: blobId,
              registeredEpoch: 0,
              objectId: objectId,
              sender: TARGET_PUBLISHER,
              timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : new Date().toISOString(),
              transactionDigest: tx.digest
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
   * Derive blob event from transaction when no explicit events found
   */
  private deriveBlobEventFromTransaction(tx: SuiTransaction): WalrusBlobEvent | null {
    try {
      // Use transaction digest as a fallback blob ID
      const potentialBlobId = tx.digest.replace('0x', '').slice(0, 43) // Base64-like length
      
      return {
        blobId: potentialBlobId,
        registeredEpoch: 0,
        objectId: tx.digest,
        sender: TARGET_PUBLISHER,
        timestamp: tx.timestampMs ? new Date(parseInt(tx.timestampMs)).toISOString() : new Date().toISOString(),
        transactionDigest: tx.digest
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Derive blob ID from Sui object ID with multiple methods
   */
  private deriveBlobIdFromObjectId(objectId: string): string | null {
    try {
      const cleaned = objectId.replace('0x', '')
      
      if (cleaned.length >= 40) {
        // Method 1: Take middle portion and convert to base64-like
        const portion = cleaned.slice(8, 40)
        const base64Like = Buffer.from(portion, 'hex').toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '')
        
        if (base64Like.length > 10) {
          return base64Like
        }
      }
      
      // Method 2: Use the object ID directly if it looks like a blob ID
      if (cleaned.length > 20 && !cleaned.startsWith('000000')) {
        return cleaned
      }

      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Deduplicate blob events by blob ID
   */
  private deduplicateBlobEvents(blobEvents: WalrusBlobEvent[]): WalrusBlobEvent[] {
    const seen = new Set<string>()
    const unique: WalrusBlobEvent[] = []

    for (const event of blobEvents) {
      if (!seen.has(event.blobId)) {
        seen.add(event.blobId)
        unique.push(event)
      }
    }

    return unique
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
    this.cacheExpiry.clear()
    this.successfulBlobs.clear()
    this.failedBlobs.clear()
  }

  /**
   * Get target publisher address
   */
  getTargetPublisher(): string {
    return TARGET_PUBLISHER
  }
}