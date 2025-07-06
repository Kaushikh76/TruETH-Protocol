// hooks/useSuiPublisherInvestigations.ts
import { useState, useEffect, useCallback } from 'react'
import { SuiBlockchainService } from '../lib/suiBlockchainService'
import { WalrusPublisherService, WalrusQueryFilters } from '../lib/walrusPublisherService'
import { EnhancedInvestigation } from '../types/enhanced-investigation'

interface BlobEvent {
  blobId: string
  timestamp: string
  objectId: string
  sender: string
}

export function useSuiPublisherInvestigations(filters: WalrusQueryFilters = {}) {
  const [investigations, setInvestigations] = useState<EnhancedInvestigation[]>([])
  const [blobEvents, setBlobEvents] = useState<BlobEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'sui' | 'walrus' | 'grc20' | 'combined'>('combined')
  const [refetchCount, setRefetchCount] = useState(0)

  const suiService = SuiBlockchainService.getInstance()
  const walrusService = WalrusPublisherService.getInstance()

  const fetchInvestigations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching investigations from Sui blockchain + Walrus + GRC-20...')
      
      // Step 1: Get blob events from Sui blockchain
      const suiResult = await suiService.getInvestigationsFromBlobEvents()
      console.log(`🔗 Sui blockchain: ${suiResult.investigations.length} investigations`)
      
      // Step 2: Get investigations from Walrus/GRC-20 (fallback/supplement)
      const walrusResult = await walrusService.getPublisherInvestigations(filters)
      console.log(`📦 Walrus/GRC-20: ${walrusResult.investigations.length} investigations`)
      
      // Step 3: Combine and deduplicate results
      const combinedInvestigations = combineInvestigationSources(
        suiResult.investigations,
        walrusResult.investigations
      )
      
      console.log(`✅ Combined total: ${combinedInvestigations.length} unique investigations`)
      
      // Apply filters
      const filteredInvestigations = applyFilters(combinedInvestigations, filters)
      
      setInvestigations(filteredInvestigations)
      setBlobEvents(suiResult.blobEvents || [])
      setDataSource(determineDataSource(suiResult, walrusResult))
      
    } catch (err: any) {
      console.error('❌ Error fetching investigations:', err)
      setError(err.message)
      setInvestigations([])
      setBlobEvents([])
    } finally {
      setLoading(false)
    }
  }, [filters, refetchCount, suiService, walrusService])

  const refetch = useCallback(() => {
    console.log('🔄 Refetching from all sources...')
    // Clear caches
    suiService.clearCache()
    walrusService.clearCache()
    setRefetchCount(prev => prev + 1)
  }, [suiService, walrusService])

  const vote = useCallback(async (investigationId: string, voteType: 'Correct' | 'Incorrect' | 'NeedsMoreEvidence', voter: string, reasoning?: string) => {
    try {
      console.log(`🗳️ Voting ${voteType} on investigation ${investigationId}`)
      
      // Optimistically update the UI
      setInvestigations(prev => 
        prev.map(inv => {
          if (inv.id === investigationId) {
            const newVotes = { ...inv.votes }
            if (voteType === 'Correct') newVotes.correct += 1
            else if (voteType === 'Incorrect') newVotes.incorrect += 1
            else newVotes.needsMoreEvidence += 1
            
            return {
              ...inv,
              votes: newVotes,
              userVotes: { ...inv.userVotes, [voter]: voteType }
            }
          }
          return inv
        })
      )
      
      console.log('✅ Vote recorded successfully')
      return { success: true }
    } catch (err: any) {
      console.error('❌ Error voting:', err)
      return { success: false, error: err.message }
    }
  }, [])

  const getStatistics = useCallback(() => {
    return {
      totalInvestigations: investigations.length,
      totalBlobEvents: blobEvents.length,
      byType: investigations.reduce((acc, inv) => {
        acc[inv.investigationType] = (acc[inv.investigationType] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      bySeverity: investigations.reduce((acc, inv) => {
        acc[inv.severityLevel] = (acc[inv.severityLevel] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recentActivity: blobEvents.slice(0, 5).map(event => ({
        blobId: event.blobId,
        timestamp: event.timestamp,
        investigation: investigations.find(inv => inv.blobId === event.blobId)
      }))
    }
  }, [investigations, blobEvents])

  useEffect(() => {
    fetchInvestigations()
  }, [fetchInvestigations])

  return {
    investigations,
    blobEvents,
    loading,
    error,
    dataSource,
    targetPublisher: suiService.getTargetPublisher(),
    statistics: getStatistics(),
    refetch,
    vote
  }
}

// Helper function to combine investigation sources and deduplicate
function combineInvestigationSources(
  suiInvestigations: EnhancedInvestigation[],
  walrusInvestigations: EnhancedInvestigation[]
): EnhancedInvestigation[] {
  const combined = [...suiInvestigations]
  const seenBlobIds = new Set(suiInvestigations.map(inv => inv.blobId).filter(Boolean))
  const seenTitles = new Set(suiInvestigations.map(inv => inv.title.toLowerCase()))

  // Add Walrus investigations that aren't duplicates
  for (const walrusInv of walrusInvestigations) {
    const isDuplicate = 
      (walrusInv.blobId && seenBlobIds.has(walrusInv.blobId)) ||
      seenTitles.has(walrusInv.title.toLowerCase()) ||
      combined.some(existing => 
        Math.abs(existing.createdAt.getTime() - walrusInv.createdAt.getTime()) < 60000 && // Within 1 minute
        existing.content.slice(0, 100) === walrusInv.content.slice(0, 100) // Similar content
      )

    if (!isDuplicate) {
      combined.push(walrusInv)
      if (walrusInv.blobId) seenBlobIds.add(walrusInv.blobId)
      seenTitles.add(walrusInv.title.toLowerCase())
    }
  }

  return combined.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// Helper function to apply filters
function applyFilters(investigations: EnhancedInvestigation[], filters: WalrusQueryFilters): EnhancedInvestigation[] {
  return investigations.filter(inv => {
    if (filters.investigationType && inv.investigationType !== filters.investigationType) return false
    if (filters.severityLevel && inv.severityLevel !== filters.severityLevel) return false
    if (filters.status && inv.status !== filters.status) return false
    if (filters.geographicScope && inv.geographicScope !== filters.geographicScope) return false
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => inv.tags.includes(tag))
      if (!hasMatchingTag) return false
    }
    return true
  })
}

// Helper function to determine primary data source
function determineDataSource(suiResult: any, walrusResult: any): 'sui' | 'walrus' | 'grc20' | 'combined' {
  const suiCount = suiResult.investigations?.length || 0
  const walrusCount = walrusResult.investigations?.length || 0

  if (suiCount > 0 && walrusCount > 0) return 'combined'
  if (suiCount > 0) return 'sui'
  if (walrusCount > 0) {
    return walrusResult.source === 'grc20' ? 'grc20' : 'walrus'
  }
  return 'combined'
}

// Hook for individual investigation details with Sui context
export function useSuiInvestigation(investigationId: string) {
  const [investigation, setInvestigation] = useState<EnhancedInvestigation | null>(null)
  const [blobEvent, setBlobEvent] = useState<BlobEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const suiService = SuiBlockchainService.getInstance()

  const fetchInvestigation = useCallback(async () => {
    if (!investigationId) return

    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔍 Fetching investigation: ${investigationId}`)
      
      // Get all investigations and find the specific one
      const result = await suiService.getInvestigationsFromBlobEvents()
      
      if (result.success) {
        const found = result.investigations.find(inv => 
          inv.id === investigationId || inv.blobId === investigationId
        )
        
        const foundBlobEvent = result.blobEvents.find(event =>
          event.blobId === found?.blobId
        )
        
        if (found) {
          console.log('✅ Investigation found via Sui')
          setInvestigation(found)
          setBlobEvent(foundBlobEvent || null)
        } else {
          console.warn('⚠️ Investigation not found in Sui, trying fallback...')
          setError('Investigation not found')
          setInvestigation(null)
          setBlobEvent(null)
        }
      } else {
        setError(result.error || 'Failed to fetch investigation')
        setInvestigation(null)
        setBlobEvent(null)
      }
    } catch (err: any) {
      console.error('❌ Error fetching investigation:', err)
      setError(err.message)
      setInvestigation(null)
      setBlobEvent(null)
    } finally {
      setLoading(false)
    }
  }, [investigationId, suiService])

  const vote = useCallback(async (voteType: 'Correct' | 'Incorrect' | 'NeedsMoreEvidence', voter: string, reasoning?: string) => {
    try {
      console.log(`🗳️ Voting ${voteType} on investigation ${investigationId}`)
      
      // Optimistically update local state
      if (investigation) {
        const newVotes = { ...investigation.votes }
        if (voteType === 'Correct') newVotes.correct += 1
        else if (voteType === 'Incorrect') newVotes.incorrect += 1
        else newVotes.needsMoreEvidence += 1
        
        setInvestigation({
          ...investigation,
          votes: newVotes,
          userVotes: { ...investigation.userVotes, [voter]: voteType }
        })
      }
      
      console.log('✅ Vote recorded successfully')
      return { success: true }
    } catch (err: any) {
      console.error('❌ Error voting:', err)
      return { success: false, error: err.message }
    }
  }, [investigationId, investigation])

  useEffect(() => {
    fetchInvestigation()
  }, [fetchInvestigation])

  return {
    investigation,
    blobEvent,
    loading,
    error,
    refetch: fetchInvestigation,
    vote
  }
}