// lib/walrusBlobService.ts
import { EnhancedInvestigation, InvestigationType, SeverityLevel, GeographicScope } from '../types/enhanced-investigation'

const WALRUS_SERVER_URL = process.env.NEXT_PUBLIC_WALRUS_SERVER_URL || 'http://localhost:3000'
const WALRUS_API_KEY = process.env.NEXT_PUBLIC_WALRUS_API_KEY || 'dev-key-123'
const PUBLISHER_ADDRESS = '0x7b005829a1305a3ebeea7cff0dd200bbe7e2f42d1adce0d9045dd57ef12f52c9'

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

export class WalrusBlobService {
  private static instance: WalrusBlobService
  private cache: Map<string, any> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds
  
  // In-memory blob registry for discovery
  private knownBlobIds: Set<string> = new Set()
  private blobMetadata: Map<string, { id: string; createdAt: string; author: string }> = new Map()

  static getInstance(): WalrusBlobService {
    if (!WalrusBlobService.instance) {
      WalrusBlobService.instance = new WalrusBlobService()
    }
    return WalrusBlobService.instance
  }

  private isValidCache(key: string): boolean {
    const expiry = this.cacheExpiry.get(key)
    return expiry ? Date.now() < expiry : false
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, data)
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION)
  }

  // Register a blob ID when we know about it (from store operations)
  registerBlobId(blobId: string, metadata?: { createdAt: string; author: string }): void {
    this.knownBlobIds.add(blobId)
    if (metadata) {
      this.blobMetadata.set(blobId, {
        id: blobId,
        createdAt: metadata.createdAt,
        author: metadata.author
      })
    }
  }

  // Get all known blob IDs (for discovery)
  getKnownBlobIds(): string[] {
    return Array.from(this.knownBlobIds)
  }

  async fetchBlobFromWalrus(blobId: string): Promise<{
    success: boolean
    data?: WalrusBlobData
    error?: string
  }> {
    try {
      const cacheKey = `blob_${blobId}`
      
      if (this.isValidCache(cacheKey)) {
        return this.cache.get(cacheKey)
      }

      console.log(`📥 Fetching blob from Walrus: ${blobId}`)

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
        const blobData = result.data.investigation as WalrusBlobData
        
        // Register this blob ID for future discovery
        this.registerBlobId(blobId, {
          createdAt: blobData.metadata.createdAt,
          author: blobData.author.wallet
        })

        const cacheResult = {
          success: true,
          data: blobData
        }
        
        this.setCache(cacheKey, cacheResult)
        return cacheResult
      } else {
        throw new Error('Invalid blob data structure')
      }

    } catch (error: any) {
      console.error(`❌ Error fetching blob ${blobId}:`, error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async getAllInvestigations(filters: WalrusQueryFilters = {}): Promise<{
    success: boolean
    investigations: EnhancedInvestigation[]
    count: number
    error?: string
  }> {
    try {
      const cacheKey = `all_investigations_${JSON.stringify(filters)}`
      
      if (this.isValidCache(cacheKey)) {
        return this.cache.get(cacheKey)
      }

      console.log('🔍 Fetching all investigations from known blobs...')

      // Get all known blob IDs
      const blobIds = this.getKnownBlobIds()
      
      if (blobIds.length === 0) {
        // Try to discover some blob IDs from recent activity
        await this.discoverRecentBlobs()
      }

      // Fetch all blobs in parallel
      const blobPromises = this.getKnownBlobIds().map(blobId => 
        this.fetchBlobFromWalrus(blobId)
      )
      
      const blobResults = await Promise.allSettled(blobPromises)
      
      // Convert successful blob fetches to investigations
      const investigations: EnhancedInvestigation[] = []
      
      for (const result of blobResults) {
        if (result.status === 'fulfilled' && result.value.success && result.value.data) {
          try {
            const investigation = await this.transformBlobToInvestigation(result.value.data)
            if (this.matchesFilters(investigation, filters)) {
              investigations.push(investigation)
            }
          } catch (error) {
            console.warn('Failed to transform blob to investigation:', error)
          }
        }
      }

      // Sort by creation date (newest first)
      investigations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      const finalResult = {
        success: true,
        investigations,
        count: investigations.length
      }

      this.setCache(cacheKey, finalResult)
      return finalResult

    } catch (error: any) {
      console.error('❌ Error fetching all investigations:', error)
      return {
        success: false,
        investigations: [],
        count: 0,
        error: error.message
      }
    }
  }

  async getInvestigationById(id: string): Promise<{
    success: boolean
    investigation?: EnhancedInvestigation
    error?: string
  }> {
    try {
      // Try to fetch as blob ID directly
      const blobResult = await this.fetchBlobFromWalrus(id)
      
      if (blobResult.success && blobResult.data) {
        const investigation = await this.transformBlobToInvestigation(blobResult.data)
        return {
          success: true,
          investigation
        }
      }

      // If not found as blob ID, search through known investigations
      const allInvestigations = await this.getAllInvestigations()
      if (allInvestigations.success) {
        const found = allInvestigations.investigations.find(inv => 
          inv.id === id || inv.blobId === id
        )
        
        if (found) {
          return {
            success: true,
            investigation: found
          }
        }
      }

      return {
        success: false,
        error: 'Investigation not found'
      }

    } catch (error: any) {
      console.error('❌ Error fetching investigation:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async searchInvestigations(query: string, filters: WalrusQueryFilters = {}): Promise<{
    success: boolean
    investigations: EnhancedInvestigation[]
    count: number
    error?: string
  }> {
    try {
      // Get all investigations first
      const allInvestigations = await this.getAllInvestigations(filters)
      
      if (!allInvestigations.success) {
        return allInvestigations
      }

      // Filter by search query
      const filteredInvestigations = allInvestigations.investigations.filter(inv => {
        const searchLower = query.toLowerCase()
        return (
          inv.title.toLowerCase().includes(searchLower) ||
          inv.content.toLowerCase().includes(searchLower) ||
          inv.author.toLowerCase().includes(searchLower) ||
          inv.tags.some(tag => tag.toLowerCase().includes(searchLower)) ||
          inv.involvedEntities.walletAddresses.some(addr => 
            addr.toLowerCase().includes(searchLower)
          ) ||
          inv.involvedEntities.organizations.some(org => 
            org.toLowerCase().includes(searchLower)
          )
        )
      })

      return {
        success: true,
        investigations: filteredInvestigations,
        count: filteredInvestigations.length
      }

    } catch (error: any) {
      console.error('❌ Error searching investigations:', error)
      return {
        success: false,
        investigations: [],
        count: 0,
        error: error.message
      }
    }
  }

  async getUserInvestigations(userAddress: string): Promise<{
    success: boolean
    investigations: EnhancedInvestigation[]
    count: number
    error?: string
  }> {
    return this.getAllInvestigations({ authorWallet: userAddress })
  }

  async voteOnInvestigation(investigationId: string, voteData: {
    voteType: 'Correct' | 'Incorrect' | 'NeedsMoreEvidence'
    voter: string
    reasoning?: string
  }): Promise<{
    success: boolean
    voteEntityId?: string
    error?: string
  }> {
    try {
      console.log(`🗳️ Recording vote for investigation ${investigationId}...`)

      // For now, we'll store votes in local memory since we're not using GRC-20
      // In a full implementation, you might want to store votes on Walrus as separate blobs
      
      const voteId = `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Store vote locally (in a real app, you'd want persistent storage)
      const voteRecord = {
        id: voteId,
        investigationId,
        ...voteData,
        timestamp: new Date().toISOString()
      }

      // Clear cache to force refresh
      this.clearInvestigationCache(investigationId)

      return {
        success: true,
        voteEntityId: voteId
      }

    } catch (error: any) {
      console.error('❌ Error voting:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  private async transformBlobToInvestigation(blobData: WalrusBlobData): Promise<EnhancedInvestigation> {
    // Generate a consistent ID from the blob content
    const investigationId = `walrus_${this.hashString(blobData.title + blobData.metadata.createdAt)}`
    
    return {
      id: investigationId,
      title: blobData.title || 'Untitled Investigation',
      content: blobData.content || 'No content available',
      author: blobData.author?.wallet || 'Anonymous',
      authorAddress: blobData.author?.wallet || PUBLISHER_ADDRESS,
      createdAt: new Date(blobData.metadata?.createdAt || Date.now()),
      verificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      
      // Use AI extracted entities or defaults
      investigationType: blobData.aiExtractedEntities?.investigationType || 'Technical',
      severityLevel: blobData.aiExtractedEntities?.severityLevel || 'Medium',
      geographicScope: blobData.aiExtractedEntities?.geographicScope || 'Regional',
      status: 'Pending', // Default status for Walrus-only investigations
      
      // AI extracted entities
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
      
      // Default vote counts (in real app, would aggregate from vote blobs)
      votes: {
        correct: 0,
        incorrect: 0,
        needsMoreEvidence: 0
      },
      
      userVotes: {},
      tags: Array.isArray(blobData.tags) ? blobData.tags : [],
      evidence: Array.isArray(blobData.evidence) ? blobData.evidence : [],
      rewardPool: 1, // Default reward pool
      
      // Walrus specific fields
      blobId: this.findBlobIdForData(blobData)
    }
  }

  private matchesFilters(investigation: EnhancedInvestigation, filters: WalrusQueryFilters): boolean {
    if (filters.investigationType && investigation.investigationType !== filters.investigationType) return false
    if (filters.severityLevel && investigation.severityLevel !== filters.severityLevel) return false
    if (filters.status && investigation.status !== filters.status) return false
    if (filters.geographicScope && investigation.geographicScope !== filters.geographicScope) return false
    if (filters.authorWallet && investigation.authorAddress !== filters.authorWallet) return false
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => investigation.tags.includes(tag))
      if (!hasMatchingTag) return false
    }
    return true
  }

  private async discoverRecentBlobs(): Promise<void> {
    try {
      // Try to get recent blob IDs from server (if available)
      // For now, we'll add some example blob IDs that might exist
      console.log('🔍 Attempting to discover recent blobs...')
      
      // In a real implementation, you might:
      // 1. Query a blockchain indexer for recent Walrus storage events
      // 2. Check a known list of blob IDs
      // 3. Use the Walrus API to list recent blobs (if available)
      
      // For demonstration, let's try a few recent blob IDs from your test
      const potentialBlobIds = [
        '8Ji2XjXGdFJ-Kho-herCmFl-Sv9Sq84a0RyQgmBGl3w' // From your test run
      ]
      
      for (const blobId of potentialBlobIds) {
        const result = await this.fetchBlobFromWalrus(blobId)
        if (result.success) {
          console.log(`✅ Discovered blob: ${blobId}`)
        }
      }
      
    } catch (error) {
      console.warn('Failed to discover recent blobs:', error)
    }
  }

  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private findBlobIdForData(blobData: WalrusBlobData): string | undefined {
    // Try to find the blob ID that corresponds to this data
    for (const [blobId, metadata] of this.blobMetadata.entries()) {
      if (metadata.createdAt === blobData.metadata.createdAt && 
          metadata.author === blobData.author?.wallet) {
        return blobId
      }
    }
    return undefined
  }

  private clearInvestigationCache(investigationId: string): void {
    // Clear related cache entries
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(investigationId) || key.startsWith('all_investigations')
    )
    
    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.cacheExpiry.delete(key)
    })
  }

  clearCache(): void {
    this.cache.clear()
    this.cacheExpiry.clear()
  }

  // Utility method to get stats
  async getUserStats(userAddress: string): Promise<{
    success: boolean
    stats?: {
      totalInvestigations: number
      totalVotes: number
      reputation: number
      totalEarned: number
    }
    error?: string
  }> {
    try {
      const userInvestigations = await this.getUserInvestigations(userAddress)
      
      if (!userInvestigations.success) {
        return {
          success: false,
          error: userInvestigations.error
        }
      }

      const totalInvestigations = userInvestigations.investigations.length
      let totalVotes = 0
      let totalEarned = 0

      userInvestigations.investigations.forEach(inv => {
        totalVotes += inv.votes.correct + inv.votes.incorrect + inv.votes.needsMoreEvidence
        totalEarned += inv.rewardPool || 0
      })

      // Simple reputation calculation
      const reputation = Math.min(1000, totalInvestigations * 50 + totalVotes * 2)

      return {
        success: true,
        stats: {
          totalInvestigations,
          totalVotes,
          reputation,
          totalEarned
        }
      }

    } catch (error: any) {
      console.error('❌ Error getting user stats:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
}