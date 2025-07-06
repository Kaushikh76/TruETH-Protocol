// hooks/useWalrusBlobs.ts
import { useState, useEffect, useCallback } from 'react'
import { WalrusBlobService, WalrusQueryFilters } from '../lib/walrusBlobService'
import { EnhancedInvestigation } from '../types/enhanced-investigation'

export function useWalrusInvestigations(filters: WalrusQueryFilters = {}) {
  const [investigations, setInvestigations] = useState<EnhancedInvestigation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchCount, setRefetchCount] = useState(0)

  const walrusService = WalrusBlobService.getInstance()

  const fetchInvestigations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching investigations from Walrus blobs...', filters)
      
      const result = await walrusService.getAllInvestigations(filters)
      
      if (result.success) {
        console.log(`✅ Found ${result.investigations.length} investigations`)
        setInvestigations(result.investigations)
      } else {
        console.warn('⚠️ Failed to fetch investigations:', result.error)
        setError(result.error || 'Failed to fetch investigations')
        setInvestigations([])
      }
    } catch (err: any) {
      console.error('❌ Error fetching investigations:', err)
      setError(err.message)
      setInvestigations([])
    } finally {
      setLoading(false)
    }
  }, [filters, refetchCount, walrusService])

  const refetch = useCallback(() => {
    console.log('🔄 Refetching investigations...')
    setRefetchCount(prev => prev + 1)
  }, [])

  const vote = useCallback(async (investigationId: string, voteType: 'Correct' | 'Incorrect' | 'NeedsMoreEvidence', voter: string, reasoning?: string) => {
    try {
      console.log(`🗳️ Voting ${voteType} on investigation ${investigationId}`)
      
      const result = await walrusService.voteOnInvestigation(investigationId, {
        voteType,
        voter,
        reasoning
      })
      
      if (result.success) {
        // Optimistically update the investigation in state
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
        return { success: true, voteEntityId: result.voteEntityId }
      } else {
        throw new Error(result.error || 'Vote failed')
      }
    } catch (err: any) {
      console.error('❌ Error voting:', err)
      return { success: false, error: err.message }
    }
  }, [walrusService])

  const addKnownBlobId = useCallback((blobId: string, metadata?: { createdAt: string; author: string }) => {
    console.log(`📝 Registering new blob ID: ${blobId}`)
    walrusService.registerBlobId(blobId, metadata)
    
    // Trigger a refetch to include the new blob
    refetch()
  }, [walrusService, refetch])

  useEffect(() => {
    fetchInvestigations()
  }, [fetchInvestigations])

  return {
    investigations,
    loading,
    error,
    refetch,
    vote,
    addKnownBlobId
  }
}

export function useWalrusInvestigation(investigationId: string) {
  const [investigation, setInvestigation] = useState<EnhancedInvestigation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const walrusService = WalrusBlobService.getInstance()

  const fetchInvestigation = useCallback(async () => {
    if (!investigationId) return

    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔍 Fetching investigation from Walrus: ${investigationId}`)
      
      const result = await walrusService.getInvestigationById(investigationId)
      
      if (result.success && result.investigation) {
        console.log('✅ Investigation found')
        setInvestigation(result.investigation)
      } else {
        console.warn('⚠️ Investigation not found:', result.error)
        setError(result.error || 'Investigation not found')
        setInvestigation(null)
      }
    } catch (err: any) {
      console.error('❌ Error fetching investigation:', err)
      setError(err.message)
      setInvestigation(null)
    } finally {
      setLoading(false)
    }
  }, [investigationId, walrusService])

  const vote = useCallback(async (voteType: 'Correct' | 'Incorrect' | 'NeedsMoreEvidence', voter: string, reasoning?: string) => {
    try {
      console.log(`🗳️ Voting ${voteType} on investigation ${investigationId}`)
      
      const result = await walrusService.voteOnInvestigation(investigationId, {
        voteType,
        voter,
        reasoning
      })
      
      if (result.success) {
        // Update local state optimistically
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
        return { success: true, voteEntityId: result.voteEntityId }
      } else {
        throw new Error(result.error || 'Vote failed')
      }
    } catch (err: any) {
      console.error('❌ Error voting:', err)
      return { success: false, error: err.message }
    }
  }, [investigationId, investigation, walrusService])

  useEffect(() => {
    fetchInvestigation()
  }, [fetchInvestigation])

  return {
    investigation,
    loading,
    error,
    refetch: fetchInvestigation,
    vote
  }
}

export function useWalrusSearch() {
  const [results, setResults] = useState<EnhancedInvestigation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const walrusService = WalrusBlobService.getInstance()

  const search = useCallback(async (query: string, filters: WalrusQueryFilters = {}) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔍 Searching Walrus blobs for: "${query}"`, filters)
      
      const result = await walrusService.searchInvestigations(query, filters)
      
      if (result.success) {
        console.log(`✅ Found ${result.investigations.length} matching investigations`)
        setResults(result.investigations)
      } else {
        console.warn('⚠️ Search failed:', result.error)
        setError(result.error || 'Search failed')
        setResults([])
      }
    } catch (err: any) {
      console.error('❌ Error searching:', err)
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [walrusService])

  const clearResults = useCallback(() => {
    setResults([])
    setError(null)
  }, [])

  return {
    results,
    loading,
    error,
    search,
    clearResults
  }
}

export function useWalrusUserData(userAddress: string) {
  const [userInvestigations, setUserInvestigations] = useState<EnhancedInvestigation[]>([])
  const [userStats, setUserStats] = useState<{
    totalInvestigations: number
    totalVotes: number
    reputation: number
    totalEarned: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const walrusService = WalrusBlobService.getInstance()

  const fetchUserData = useCallback(async () => {
    if (!userAddress) return

    try {
      setLoading(true)
      setError(null)
      
      console.log(`👤 Fetching user data for: ${userAddress}`)
      
      // Fetch user investigations
      const investigationsResult = await walrusService.getUserInvestigations(userAddress)
      
      if (investigationsResult.success) {
        console.log(`✅ Found ${investigationsResult.investigations.length} user investigations`)
        setUserInvestigations(investigationsResult.investigations)
      }
      
      // Fetch user stats
      const statsResult = await walrusService.getUserStats(userAddress)
      
      if (statsResult.success && statsResult.stats) {
        console.log('✅ User stats calculated:', statsResult.stats)
        setUserStats(statsResult.stats)
      }
      
      if (!investigationsResult.success && !statsResult.success) {
        setError('Failed to fetch user data')
      }
    } catch (err: any) {
      console.error('❌ Error fetching user data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userAddress, walrusService])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  return {
    userInvestigations,
    userStats,
    loading,
    error,
    refetch: fetchUserData
  }
}

// Hook to manually add blob IDs (useful for when new investigations are created)
export function useWalrusBlobRegistry() {
  const walrusService = WalrusBlobService.getInstance()

  const registerBlob = useCallback((blobId: string, metadata?: { createdAt: string; author: string }) => {
    console.log(`📝 Manually registering blob: ${blobId}`)
    walrusService.registerBlobId(blobId, metadata)
  }, [walrusService])

  const getKnownBlobs = useCallback(() => {
    return walrusService.getKnownBlobIds()
  }, [walrusService])

  const clearCache = useCallback(() => {
    console.log('🗑️ Clearing Walrus cache...')
    walrusService.clearCache()
  }, [walrusService])

  return {
    registerBlob,
    getKnownBlobs,
    clearCache
  }
}

// Hook for monitoring newly created investigations
export function useWalrusInvestigationMonitor() {
  const [lastCreatedBlobId, setLastCreatedBlobId] = useState<string | null>(null)
  const { registerBlob } = useWalrusBlobRegistry()

  const handleNewInvestigation = useCallback((result: {
    blobId?: string
    investigationId?: string
    data?: any
  }) => {
    if (result.blobId) {
      console.log(`🆕 New investigation created: ${result.blobId}`)
      
      // Register the new blob
      registerBlob(result.blobId, {
        createdAt: new Date().toISOString(),
        author: result.data?.author?.wallet || 'unknown'
      })
      
      setLastCreatedBlobId(result.blobId)
    }
  }, [registerBlob])

  return {
    lastCreatedBlobId,
    handleNewInvestigation
  }
}