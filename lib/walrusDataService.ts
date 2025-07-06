// lib/walrusDataService.ts
import { EnhancedInvestigation, VoteData, InvestigationType, SeverityLevel, GeographicScope } from '../types/enhanced-investigation'

const WALRUS_SERVER_URL = process.env.NEXT_PUBLIC_WALRUS_SERVER_URL || 'http://localhost:3000'
const WALRUS_API_KEY = process.env.NEXT_PUBLIC_WALRUS_API_KEY || 'dev-key-123'
const PUBLISHER_ADDRESS = '0x7b005829a1305a3ebeea7cff0dd200bbe7e2f42d1adce0d9045dd57ef12f52c9'

export interface WalrusInvestigation {
  id: string
  title: string
  content: string
  investigationType: InvestigationType
  severityLevel: SeverityLevel
  status: 'Pending' | 'Verified' | 'Disputed' | 'Resolved'
  geographicScope: GeographicScope
  authorWallet: string
  authorUserId: string
  evidence: string[]
  tags: string[]
  createdAt: string
  blobId: string
  entityType: string
  indexedAt: string
  aiEntities?: any
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

export class WalrusDataService {
  private static instance: WalrusDataService
  private cache: Map<string, any> = new Map()
  private cacheExpiry: Map<string, number> = new Map()
  private readonly CACHE_DURATION = 30000 // 30 seconds

  static getInstance(): WalrusDataService {
    if (!WalrusDataService.instance) {
      WalrusDataService.instance = new WalrusDataService()
    }
    return WalrusDataService.instance
  }

  private isValidCache(key: string): boolean {
    const expiry = this.cacheExpiry.get(key)
    return expiry ? Date.now() < expiry : false
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, data)
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION)
  }

  async getAllInvestigations(filters: WalrusQueryFilters = {}): Promise<{
    success: boolean
    investigations: EnhancedInvestigation[]
    count: number
    error?: string
  }> {
    try {
      const cacheKey = `investigations_${JSON.stringify(filters)}`
      
      if (this.isValidCache(cacheKey)) {
        return this.cache.get(cacheKey)
      }

      console.log('🔍 Fetching investigations from Walrus...')

      // Try Hypergraph direct query first
      const hypergraphResult = await this.queryHypergraphInvestigations(filters)
      
      if (hypergraphResult.success && hypergraphResult.investigations.length > 0) {
        const transformedData = await this.transformToEnhancedInvestigations(hypergraphResult.investigations)
        const result = {
          success: true,
          investigations: transformedData,
          count: transformedData.length
        }
        this.setCache(cacheKey, result)
        return result
      }

      // Fallback to GRC-20 query
      console.log('🔄 Trying GRC-20 fallback...')
      const grc20Result = await this.queryGRC20Investigations(filters)
      
      if (grc20Result.success && grc20Result.investigations.length > 0) {
        const transformedData = await this.transformToEnhancedInvestigations(grc20Result.investigations)
        const result = {
          success: true,
          investigations: transformedData,
          count: transformedData.length
        }
        this.setCache(cacheKey, result)
        return result
      }

      // Return empty but successful result
      const emptyResult = {
        success: true,
        investigations: [],
        count: 0
      }
      this.setCache(cacheKey, emptyResult)
      return emptyResult

    } catch (error: any) {
      console.error('❌ Error fetching investigations:', error)
      return {
        success: false,
        investigations: [],
        count: 0,
        error: error.message
      }
    }
  }

  private async queryHypergraphInvestigations(filters: WalrusQueryFilters): Promise<{
    success: boolean
    investigations: WalrusInvestigation[]
  }> {
    try {
      const queryParams = new URLSearchParams()
      
      if (filters.investigationType) queryParams.append('investigationType', filters.investigationType)
      if (filters.severityLevel) queryParams.append('severityLevel', filters.severityLevel)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.geographicScope) queryParams.append('geographicScope', filters.geographicScope)
      if (filters.authorWallet) queryParams.append('authorWallet', filters.authorWallet)

      const response = await fetch(`${WALRUS_SERVER_URL}/api/hypergraph/investigations?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (!response.ok) {
        throw new Error(`Hypergraph query failed: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: result.success,
        investigations: result.data?.investigations || []
      }
    } catch (error) {
      console.error('Hypergraph query failed:', error)
      return { success: false, investigations: [] }
    }
  }

  private async queryGRC20Investigations(filters: WalrusQueryFilters): Promise<{
    success: boolean
    investigations: WalrusInvestigation[]
  }> {
    try {
      const queryParams = new URLSearchParams()
      
      if (filters.investigationType) queryParams.append('investigationType', filters.investigationType)
      if (filters.severityLevel) queryParams.append('severityLevel', filters.severityLevel)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.geographicScope) queryParams.append('geographicScope', filters.geographicScope)
      if (filters.authorWallet) queryParams.append('authorWallet', filters.authorWallet)

      const response = await fetch(`${WALRUS_SERVER_URL}/api/grc20/investigations?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (!response.ok) {
        throw new Error(`GRC-20 query failed: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: result.success,
        investigations: result.data?.investigations || []
      }
    } catch (error) {
      console.error('GRC-20 query failed:', error)
      return { success: false, investigations: [] }
    }
  }

  async getInvestigationById(id: string): Promise<{
    success: boolean
    investigation?: EnhancedInvestigation
    error?: string
  }> {
    try {
      const cacheKey = `investigation_${id}`
      
      if (this.isValidCache(cacheKey)) {
        return this.cache.get(cacheKey)
      }

      console.log(`🔍 Fetching investigation ${id}...`)

      // Try to get by entity ID first
      const entityResult = await this.getInvestigationByEntityId(id)
      if (entityResult.success && entityResult.investigation) {
        const result = {
          success: true,
          investigation: entityResult.investigation
        }
        this.setCache(cacheKey, result)
        return result
      }

      // Try to get by blob ID
      const blobResult = await this.getInvestigationByBlobId(id)
      if (blobResult.success && blobResult.investigation) {
        const result = {
          success: true,
          investigation: blobResult.investigation
        }
        this.setCache(cacheKey, result)
        return result
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

  private async getInvestigationByEntityId(entityId: string): Promise<{
    success: boolean
    investigation?: EnhancedInvestigation
  }> {
    try {
      const response = await fetch(`${WALRUS_SERVER_URL}/api/grc20/investigation/${entityId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (!response.ok) {
        return { success: false }
      }

      const result = await response.json()
      if (result.success && result.data) {
        const enhanced = await this.transformSingleToEnhanced(result.data)
        return {
          success: true,
          investigation: enhanced
        }
      }

      return { success: false }
    } catch (error) {
      console.error('Error getting by entity ID:', error)
      return { success: false }
    }
  }

  private async getInvestigationByBlobId(blobId: string): Promise<{
    success: boolean
    investigation?: EnhancedInvestigation
  }> {
    try {
      const response = await fetch(`${WALRUS_SERVER_URL}/api/investigations/retrieve/${blobId}`, {
        method: 'GET',
        headers: {
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (!response.ok) {
        return { success: false }
      }

      const result = await response.json()
      if (result.success && result.data?.investigation) {
        const enhanced = await this.transformWalrusToEnhanced(result.data.investigation, result.data.metadata)
        return {
          success: true,
          investigation: enhanced
        }
      }

      return { success: false }
    } catch (error) {
      console.error('Error getting by blob ID:', error)
      return { success: false }
    }
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
      console.log(`🗳️ Voting on investigation ${investigationId}...`)

      const response = await fetch(`${WALRUS_SERVER_URL}/api/investigations/${investigationId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': WALRUS_API_KEY
        },
        body: JSON.stringify(voteData)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Vote failed: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      
      if (result.success) {
        // Clear cache for this investigation
        this.clearInvestigationCache(investigationId)
        return {
          success: true,
          voteEntityId: result.data?.voteEntityId
        }
      } else {
        throw new Error(result.error || 'Vote failed')
      }

    } catch (error: any) {
      console.error('❌ Error voting:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  async getInvestigationVotes(investigationId: string): Promise<{
    success: boolean
    votes?: { [key: string]: number }
    error?: string
  }> {
    try {
      const cacheKey = `votes_${investigationId}`
      
      if (this.isValidCache(cacheKey)) {
        return this.cache.get(cacheKey)
      }

      const response = await fetch(`${WALRUS_SERVER_URL}/api/investigations/${investigationId}/votes`, {
        method: 'GET',
        headers: {
          'X-API-Key': WALRUS_API_KEY
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to get votes: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        this.setCache(cacheKey, result)
        return result
      } else {
        throw new Error(result.error || 'Failed to get votes')
      }

    } catch (error: any) {
      console.error('❌ Error getting votes:', error)
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
          inv.tags.some(tag => tag.toLowerCase().includes(searchLower))
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

      // Calculate stats from investigations
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

  private async transformToEnhancedInvestigations(walrusInvestigations: WalrusInvestigation[]): Promise<EnhancedInvestigation[]> {
    const enhanced = await Promise.all(
      walrusInvestigations.map(inv => this.transformSingleToEnhanced(inv))
    )
    return enhanced.filter(Boolean)
  }

  private async transformSingleToEnhanced(walrusInv: any): Promise<EnhancedInvestigation> {
    // Handle both raw investigation data and wrapped investigation data
    const investigation = walrusInv.investigation || walrusInv

    return {
      id: investigation.id || walrusInv.id || `walrus-${Date.now()}`,
      title: investigation.title || 'Untitled Investigation',
      content: investigation.content || 'No content available',
      author: investigation.authorWallet || investigation.author?.wallet || 'Anonymous',
      authorAddress: investigation.authorWallet || investigation.author?.wallet || PUBLISHER_ADDRESS,
      createdAt: new Date(investigation.createdAt || Date.now()),
      verificationDeadline: investigation.verificationDeadline 
        ? new Date(investigation.verificationDeadline) 
        : new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      
      // Enhanced fields with defaults
      investigationType: investigation.investigationType || 'Technical',
      severityLevel: investigation.severityLevel || 'Medium',
      geographicScope: investigation.geographicScope || 'Regional',
      status: investigation.status || 'Pending',
      
      // AI Extracted entities with defaults
      involvedEntities: {
        people: investigation.aiEntities?.involvedEntities?.people || [],
        organizations: investigation.aiEntities?.involvedEntities?.organizations || [],
        locations: investigation.aiEntities?.involvedEntities?.locations || [],
        platforms: investigation.aiEntities?.involvedEntities?.platforms || [],
        walletAddresses: investigation.aiEntities?.involvedEntities?.walletAddresses || [],
        websites: investigation.aiEntities?.involvedEntities?.websites || []
      },
      
      timeframe: {
        startDate: investigation.aiEntities?.timeframe?.startDate,
        endDate: investigation.aiEntities?.timeframe?.endDate,
        duration: investigation.aiEntities?.timeframe?.duration
      },
      
      financialImpact: investigation.aiEntities?.financialImpact ? {
        amount: investigation.aiEntities.financialImpact.amount,
        currency: investigation.aiEntities.financialImpact.currency,
        affectedUsers: investigation.aiEntities.financialImpact.affectedUsers
      } : undefined,
      
      // Convert vote format
      votes: {
        correct: 0,
        incorrect: 0,
        needsMoreEvidence: 0
      },
      
      userVotes: {},
      tags: Array.isArray(investigation.tags) ? investigation.tags : [],
      evidence: Array.isArray(investigation.evidence) ? investigation.evidence : [],
      rewardPool: investigation.rewardPool || 1,
      
      // GRC-20 fields
      grc20EntityId: investigation.entityId || investigation.id,
      grc20SpaceId: investigation.spaceId,
      blobId: investigation.blobId
    }
  }

  private async transformWalrusToEnhanced(walrusData: any, metadata: any): Promise<EnhancedInvestigation> {
    return {
      id: metadata?.investigationId || `walrus-${Date.now()}`,
      title: walrusData.title || 'Untitled Investigation',
      content: walrusData.content || 'No content available',
      author: walrusData.author?.wallet || metadata?.author || 'Anonymous',
      authorAddress: walrusData.author?.wallet || metadata?.author || PUBLISHER_ADDRESS,
      createdAt: new Date(walrusData.metadata?.createdAt || metadata?.createdAt || Date.now()),
      verificationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
      
      // Use AI extracted entities
      investigationType: walrusData.aiExtractedEntities?.investigationType || 'Technical',
      severityLevel: walrusData.aiExtractedEntities?.severityLevel || 'Medium',
      geographicScope: walrusData.aiExtractedEntities?.geographicScope || 'Regional',
      status: 'Pending',
      
      involvedEntities: {
        people: walrusData.aiExtractedEntities?.involvedEntities?.people || [],
        organizations: walrusData.aiExtractedEntities?.involvedEntities?.organizations || [],
        locations: walrusData.aiExtractedEntities?.involvedEntities?.locations || [],
        platforms: walrusData.aiExtractedEntities?.involvedEntities?.platforms || [],
        walletAddresses: walrusData.aiExtractedEntities?.involvedEntities?.walletAddresses || [],
        websites: walrusData.aiExtractedEntities?.involvedEntities?.websites || []
      },
      
      timeframe: {
        startDate: walrusData.aiExtractedEntities?.timeframe?.startDate,
        endDate: walrusData.aiExtractedEntities?.timeframe?.endDate,
        duration: walrusData.aiExtractedEntities?.timeframe?.duration
      },
      
      financialImpact: walrusData.aiExtractedEntities?.financialImpact,
      
      votes: {
        correct: 0,
        incorrect: 0,
        needsMoreEvidence: 0
      },
      
      userVotes: {},
      tags: Array.isArray(walrusData.tags) ? walrusData.tags : [],
      evidence: Array.isArray(walrusData.evidence) ? walrusData.evidence : [],
      rewardPool: 1,
      
      grc20EntityId: metadata?.grc20EntityId,
      grc20SpaceId: metadata?.grc20SpaceId,
      blobId: metadata?.blobId
    }
  }

  private clearInvestigationCache(investigationId: string): void {
    // Clear related cache entries
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(investigationId) || key.startsWith('investigations_')
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
}