// lib/walrusPublisherService.ts - Enhanced service for querying specific publisher
import { EnhancedInvestigation, InvestigationType, SeverityLevel, GeographicScope } from '../types/enhanced-investigation'

const WALRUS_SERVER_URL = process.env.NEXT_PUBLIC_WALRUS_SERVER_URL || 'http://localhost:3000'
const WALRUS_API_KEY = process.env.NEXT_PUBLIC_WALRUS_API_KEY || 'dev-key-123'

// The specific publisher address to query
const TARGET_PUBLISHER = '0x7b005829a1305a3ebeea7cff0dd200bbe7e2f42d1adce0d9045dd57ef12f52c9'

export interface WalrusQueryFilters {
  investigationType?: InvestigationType
  severityLevel?: SeverityLevel
  status?: string
  geographicScope?: GeographicScope
  authorWallet?: string
  tags?: string[]
  limit?: number
  offset?: number
}

export interface WalrusBlobData {
  title: string
  content: string
  tags: string[]
  evidence: string[]
  author: {
    wallet: string
    userId: string
  }
  bridgeTransaction?: any
  metadata: {
    createdAt: string
    version: string
    protocol: string
    contentType: string
    aiProcessed?: boolean
    entitiesExtracted?: string
  }
  aiExtractedEntities?: {
    investigationType: InvestigationType
    severityLevel: SeverityLevel
    geographicScope: GeographicScope
    involvedEntities: {
      people: string[]
      organizations: string[]
      locations: string[]
      platforms: string[]
      walletAddresses: string[]
      websites: string[]
    }
    timeframe: {
      startDate?: string
      endDate?: string
      duration?: string
    }
    financialImpact?: {
      amount?: string
      currency?: string
      affectedUsers?: number
    }
    content: string
  }
}

export class WalrusPublisherService {
  private static instance: WalrusPublisherService
  private cache: Map<string, any> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds
  
  // Track known blob IDs from the target publisher
  private publisherBlobIds: Set<string> = new Set()
  private blobMetadata: Map<string, { id: string; createdAt: string; author: string }> = new Map()

  static getInstance(): WalrusPublisherService {
    if (!WalrusPublisherService.instance) {
      WalrusPublisherService.instance = new WalrusPublisherService()
    }
    return WalrusPublisherService.instance
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
   * Query investigations published by the target publisher address
   * First checks Walrus blobs, then falls back to GRC-20
   */
  async getPublisherInvestigations(filters: WalrusQueryFilters = {}): Promise<{
    success: boolean
    investigations: EnhancedInvestigation[]
    count: number
    error?: string
    source: 'walrus' | 'grc20' | 'combined'
  }> {
    try {
      const cacheKey = `publisher_investigations_${JSON.stringify(filters)}`
      
      if (this.isValidCache(cacheKey)) {
        return this.cache.get(cacheKey)
      }

      console.log(`🔍 Querying investigations from publisher: ${TARGET_PUBLISHER}`)

      // Step 1: Query Walrus blobs first
      const walrusResult = await this.queryWalrusBlobs(filters)
      console.log(`📦 Found ${walrusResult.investigations.length} investigations from Walrus blobs`)

      // Step 2: Query GRC-20 knowledge graph
      const grc20Result = await this.queryGRC20Graph(filters)
      console.log(`🕸️ Found ${grc20Result.investigations.length} investigations from GRC-20`)

      // Step 3: Combine and deduplicate results
      const combinedInvestigations = this.combineAndDeduplicateResults(
        walrusResult.investigations,
        grc20Result.investigations
      )

      console.log(`✅ Combined total: ${combinedInvestigations.length} unique investigations`)

      const result = {
        success: true,
        investigations: combinedInvestigations,
        count: combinedInvestigations.length,
        source: this.determineSource(walrusResult, grc20Result)
      }

      this.setCache(cacheKey, result)
      return result

    } catch (error: any) {
      console.error('❌ Error querying publisher investigations:', error)
      return {
        success: false,
        investigations: [],
        count: 0,
        error: error.message,
        source: 'combined'
      }
    }
  }

  /**
   * Query Walrus blobs for the target publisher
   */
  private async queryWalrusBlobs(filters: WalrusQueryFilters): Promise<{
    success: boolean
    investigations: EnhancedInvestigation[]
  }> {
    try {
      // First, try to get known blob IDs for this publisher
      await this.discoverPublisherBlobs()

      const blobPromises = Array.from(this.publisherBlobIds).map(blobId => 
        this.fetchBlobFromWalrus(blobId)
      )

      if (blobPromises.length === 0) {
        console.log('📦 No known Walrus blobs for publisher, trying server query...')
        return await this.queryWalrusServer(filters)
      }

      const blobResults = await Promise.allSettled(blobPromises)
      const investigations: EnhancedInvestigation[] = []

      for (const result of blobResults) {
        if (result.status === 'fulfilled' && result.value.success && result.value.data) {
          try {
            // Verify this blob is from our target publisher
            if (result.value.data.author?.wallet === TARGET_PUBLISHER) {
              const investigation = await this.transformBlobToInvestigation(result.value.data)
              if (this.matchesFilters(investigation, filters)) {
                investigations.push(investigation)
              }
            }
          } catch (error) {
            console.warn('Failed to transform blob to investigation:', error)
          }
        }
      }

      return {
        success: true,
        investigations: investigations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      }

    } catch (error) {
      console.error('❌ Error querying Walrus blobs:', error)
      return { success: false, investigations: [] }
    }
  }

  /**
   * Query Walrus server for publisher investigations
   */
  private async queryWalrusServer(filters: WalrusQueryFilters): Promise<{
    success: boolean
    investigations: EnhancedInvestigation[]
  }> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('authorWallet', TARGET_PUBLISHER)
      
      if (filters.investigationType) queryParams.append('investigationType', filters.investigationType)
      if (filters.severityLevel) queryParams.append('severityLevel', filters.severityLevel)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.geographicScope) queryParams.append('geographicScope', filters.geographicScope)

      const response = await fetch(`${WALRUS_SERVER_URL}/api/investigations/query?${queryParams}`, {
        method: 'GET',
        headers: {
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (!response.ok) {
        throw new Error(`Walrus server query failed: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data?.investigations) {
        const investigations = await Promise.all(
          result.data.investigations.map((inv: any) => this.transformServerDataToInvestigation(inv))
        )

        return {
          success: true,
          investigations: investigations.filter(Boolean)
        }
      }

      return { success: false, investigations: [] }

    } catch (error) {
      console.error('❌ Error querying Walrus server:', error)
      return { success: false, investigations: [] }
    }
  }

  /**
   * Query GRC-20 knowledge graph for publisher investigations
   */
  private async queryGRC20Graph(filters: WalrusQueryFilters): Promise<{
    success: boolean
    investigations: EnhancedInvestigation[]
  }> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('authorWallet', TARGET_PUBLISHER)
      
      if (filters.investigationType) queryParams.append('investigationType', filters.investigationType)
      if (filters.severityLevel) queryParams.append('severityLevel', filters.severityLevel)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.geographicScope) queryParams.append('geographicScope', filters.geographicScope)

      const response = await fetch(`${WALRUS_SERVER_URL}/api/grc20/space?${queryParams}`, {
        method: 'GET',
        headers: {
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (!response.ok) {
        console.log(`GRC-20 query failed: ${response.status}, falling back...`)
        return { success: false, investigations: [] }
      }

      const result = await response.json()
      
      if (result.success && result.data?.investigations) {
        const investigations = await Promise.all(
          result.data.investigations.map((inv: any) => this.transformGRC20DataToInvestigation(inv))
        )

        return {
          success: true,
          investigations: investigations.filter(Boolean)
        }
      }

      return { success: false, investigations: [] }

    } catch (error) {
      console.error('❌ Error querying GRC-20:', error)
      return { success: false, investigations: [] }
    }
  }

  /**
   * Fetch individual blob from Walrus
   */
  private async fetchBlobFromWalrus(blobId: string): Promise<{
    success: boolean
    data?: WalrusBlobData
    error?: string
  }> {
    try {
      console.log(`📥 Fetching blob: ${blobId}`)

      const response = await fetch(`${WALRUS_SERVER_URL}/api/investigations/retrieve/${blobId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch blob: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data?.investigation) {
        return {
          success: true,
          data: result.data.investigation as WalrusBlobData
        }
      }

      throw new Error('Invalid blob data structure')

    } catch (error: any) {
      console.error(`❌ Error fetching blob ${blobId}:`, error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Discover blob IDs published by the target publisher
   */
  private async discoverPublisherBlobs(): Promise<void> {
    try {
      console.log(`🔍 Discovering blobs for publisher: ${TARGET_PUBLISHER}`)

      // Try to get publisher's blob IDs from the server
      const response = await fetch(`${WALRUS_SERVER_URL}/api/publisher/${TARGET_PUBLISHER}/blobs`, {
        method: 'GET',
        headers: {
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data?.blobIds) {
          result.data.blobIds.forEach((blobId: string) => {
            this.publisherBlobIds.add(blobId)
          })
          console.log(`✅ Discovered ${result.data.blobIds.length} blobs for publisher`)
        }
      }

      // Add any known blob IDs from previous operations
      const knownBlobIds = [
        '8Ji2XjXGdFJ-Kho-herCmFl-Sv9Sq84a0RyQgmBGl3w', // Example from tests
        // Add more known blob IDs here if available
      ]

      knownBlobIds.forEach(blobId => this.publisherBlobIds.add(blobId))

    } catch (error) {
      console.warn('Failed to discover publisher blobs:', error)
    }
  }

  /**
   * Transform blob data to Enhanced Investigation
   */
  private async transformBlobToInvestigation(blobData: WalrusBlobData): Promise<EnhancedInvestigation> {
    const investigationId = `walrus_${this.hashString(blobData.title + blobData.metadata.createdAt)}`
    
    return {
      id: investigationId,
      title: blobData.title || 'Untitled Investigation',
      content: blobData.content || 'No content available',
      author: blobData.author?.wallet || 'Anonymous',
      authorAddress: blobData.author?.wallet || TARGET_PUBLISHER,
      createdAt: new Date(blobData.metadata?.createdAt || Date.now()),
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
      
      blobId: this.findBlobIdForData(blobData)
    }
  }

  /**
   * Transform server data to Enhanced Investigation
   */
  private async transformServerDataToInvestigation(serverData: any): Promise<EnhancedInvestigation> {
    return {
      id: serverData.id || `server_${Date.now()}`,
      title: serverData.title || 'Untitled Investigation',
      content: serverData.content || 'No content available',
      author: serverData.authorWallet || TARGET_PUBLISHER,
      authorAddress: serverData.authorWallet || TARGET_PUBLISHER,
      createdAt: new Date(serverData.createdAt || Date.now()),
      verificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      
      investigationType: serverData.investigationType || 'Technical',
      severityLevel: serverData.severityLevel || 'Medium',
      geographicScope: serverData.geographicScope || 'Regional',
      status: serverData.status || 'Pending',
      
      involvedEntities: {
        people: serverData.aiEntities?.involvedEntities?.people || [],
        organizations: serverData.aiEntities?.involvedEntities?.organizations || [],
        locations: serverData.aiEntities?.involvedEntities?.locations || [],
        platforms: serverData.aiEntities?.involvedEntities?.platforms || [],
        walletAddresses: serverData.aiEntities?.involvedEntities?.walletAddresses || [],
        websites: serverData.aiEntities?.involvedEntities?.websites || []
      },
      
      timeframe: {
        startDate: serverData.aiEntities?.timeframe?.startDate,
        endDate: serverData.aiEntities?.timeframe?.endDate,
        duration: serverData.aiEntities?.timeframe?.duration
      },
      
      financialImpact: serverData.aiEntities?.financialImpact,
      
      votes: { correct: 0, incorrect: 0, needsMoreEvidence: 0 },
      userVotes: {},
      tags: Array.isArray(serverData.tags) ? serverData.tags : [],
      evidence: Array.isArray(serverData.evidence) ? serverData.evidence : [],
      rewardPool: 1,
      
      blobId: serverData.blobId
    }
  }

  /**
   * Transform GRC-20 data to Enhanced Investigation
   */
  private async transformGRC20DataToInvestigation(grc20Data: any): Promise<EnhancedInvestigation> {
    return {
      id: grc20Data.entityId || `grc20_${Date.now()}`,
      title: grc20Data.title || 'Untitled Investigation',
      content: grc20Data.content || 'No content available',
      author: grc20Data.authorWallet || TARGET_PUBLISHER,
      authorAddress: grc20Data.authorWallet || TARGET_PUBLISHER,
      createdAt: new Date(grc20Data.createdAt || Date.now()),
      verificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      
      investigationType: grc20Data.investigationType || 'Technical',
      severityLevel: grc20Data.severityLevel || 'Medium',
      geographicScope: grc20Data.geographicScope || 'Regional',
      status: grc20Data.status || 'Pending',
      
      involvedEntities: {
        people: grc20Data.aiEntities?.involvedEntities?.people || [],
        organizations: grc20Data.aiEntities?.involvedEntities?.organizations || [],
        locations: grc20Data.aiEntities?.involvedEntities?.locations || [],
        platforms: grc20Data.aiEntities?.involvedEntities?.platforms || [],
        walletAddresses: grc20Data.aiEntities?.involvedEntities?.walletAddresses || [],
        websites: grc20Data.aiEntities?.involvedEntities?.websites || []
      },
      
      timeframe: {
        startDate: grc20Data.aiEntities?.timeframe?.startDate,
        endDate: grc20Data.aiEntities?.timeframe?.endDate,
        duration: grc20Data.aiEntities?.timeframe?.duration
      },
      
      financialImpact: grc20Data.aiEntities?.financialImpact,
      
      votes: { correct: 0, incorrect: 0, needsMoreEvidence: 0 },
      userVotes: {},
      tags: Array.isArray(grc20Data.tags) ? grc20Data.tags : [],
      evidence: Array.isArray(grc20Data.evidence) ? grc20Data.evidence : [],
      rewardPool: 1,
      
      grc20EntityId: grc20Data.entityId,
      grc20SpaceId: grc20Data.spaceId,
      blobId: grc20Data.blobId
    }
  }

  /**
   * Combine and deduplicate results from different sources
   */
  private combineAndDeduplicateResults(
    walrusInvestigations: EnhancedInvestigation[],
    grc20Investigations: EnhancedInvestigation[]
  ): EnhancedInvestigation[] {
    const combined = [...walrusInvestigations]
    const seenIds = new Set(walrusInvestigations.map(inv => inv.id))
    const seenBlobIds = new Set(walrusInvestigations.map(inv => inv.blobId).filter(Boolean))

    // Add GRC-20 investigations that aren't duplicates
    for (const grc20Inv of grc20Investigations) {
      const isDuplicate = seenIds.has(grc20Inv.id) || 
                         (grc20Inv.blobId && seenBlobIds.has(grc20Inv.blobId)) ||
                         combined.some(existing => 
                           existing.title === grc20Inv.title && 
                           Math.abs(existing.createdAt.getTime() - grc20Inv.createdAt.getTime()) < 60000 // Within 1 minute
                         )

      if (!isDuplicate) {
        combined.push(grc20Inv)
        seenIds.add(grc20Inv.id)
        if (grc20Inv.blobId) seenBlobIds.add(grc20Inv.blobId)
      }
    }

    return combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * Determine the primary data source
   */
  private determineSource(walrusResult: any, grc20Result: any): 'walrus' | 'grc20' | 'combined' {
    const walrusCount = walrusResult.investigations?.length || 0
    const grc20Count = grc20Result.investigations?.length || 0

    if (walrusCount > 0 && grc20Count > 0) return 'combined'
    if (walrusCount > 0) return 'walrus'
    if (grc20Count > 0) return 'grc20'
    return 'combined'
  }

  /**
   * Check if investigation matches filters
   */
  private matchesFilters(investigation: EnhancedInvestigation, filters: WalrusQueryFilters): boolean {
    if (filters.investigationType && investigation.investigationType !== filters.investigationType) return false
    if (filters.severityLevel && investigation.severityLevel !== filters.severityLevel) return false
    if (filters.status && investigation.status !== filters.status) return false
    if (filters.geographicScope && investigation.geographicScope !== filters.geographicScope) return false
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => investigation.tags.includes(tag))
      if (!hasMatchingTag) return false
    }
    return true
  }

  /**
   * Hash string for ID generation
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Find blob ID for data
   */
  private findBlobIdForData(blobData: WalrusBlobData): string | undefined {
    for (const [blobId, metadata] of this.blobMetadata.entries()) {
      if (metadata.createdAt === blobData.metadata.createdAt && 
          metadata.author === blobData.author?.wallet) {
        return blobId
      }
    }
    return undefined
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