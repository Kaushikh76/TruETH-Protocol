// hooks/useWalrusData.ts
import { useState, useEffect, useCallback } from 'react'
import { WalrusDataService, WalrusQueryFilters } from '../lib/walrusDataService'
import { EnhancedInvestigation } from '../types/enhanced-investigation'

export function useWalrusInvestigations(filters: WalrusQueryFilters = {}) {
  const [investigations, setInvestigations] = useState<EnhancedInvestigation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refetchCount, setRefetchCount] = useState(0)

  const walrusService = WalrusDataService.getInstance()

  const fetchInvestigations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await walrusService.getAllInvestigations(filters)
      
      if (result.success) {
        setInvestigations(result.investigations)
      } else {
        setError(result.error || 'Failed to fetch investigations')
        setInvestigations([])
      }
    } catch (err: any) {
      console.error('Error fetching investigations:', err)
      setError(err.message)
      setInvestigations([])
    } finally {
      setLoading(false)
    }
  }, [filters, refetchCount])

  const refetch = useCallback(() => {
    setRefetchCount(prev => prev + 1)
  }, [])

  const vote = useCallback(async (investigationId: string, voteType: 'Correct' | 'Incorrect' | 'NeedsMoreEvidence', voter: string, reasoning?: string) => {
    try {
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
        
        return { success: true, voteEntityId: result.voteEntityId }
      } else {
        throw new Error(result.error || 'Vote failed')
      }
    } catch (err: any) {
      console.error('Error voting:', err)
      return { success: false, error: err.message }
    }
  }, [walrusService])

  useEffect(() => {
    fetchInvestigations()
  }, [fetchInvestigations])

  return {
    investigations,
    loading,
    error,
    refetch,
    vote
  }
}

export function useWalrusInvestigation(investigationId: string) {
  const [investigation, setInvestigation] = useState<EnhancedInvestigation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [votes, setVotes] = useState<{ [key: string]: number }>({})
  const [votesLoading, setVotesLoading] = useState(false)

  const walrusService = WalrusDataService.getInstance()

  const fetchInvestigation = useCallback(async () => {
    if (!investigationId) return

    try {
      setLoading(true)
      setError(null)
      
      const result = await walrusService.getInvestigationById(investigationId)
      
      if (result.success && result.investigation) {
        setInvestigation(result.investigation)
        
        // Also fetch votes
        setVotesLoading(true)
        const votesResult = await walrusService.getInvestigationVotes(investigationId)
        if (votesResult.success && votesResult.votes) {
          setVotes(votesResult.votes)
        }
        setVotesLoading(false)
      } else {
        setError(result.error || 'Investigation not found')
        setInvestigation(null)
      }
    } catch (err: any) {
      console.error('Error fetching investigation:', err)
      setError(err.message)
      setInvestigation(null)
    } finally {
      setLoading(false)
    }
  }, [investigationId, walrusService])

  const vote = useCallback(async (voteType: 'Correct' | 'Incorrect' | 'NeedsMoreEvidence', voter: string, reasoning?: string) => {
    try {
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
        
        // Update vote counts
        setVotes(prev => ({
          ...prev,
          [voteType]: (prev[voteType] || 0) + 1
        }))
        
        return { success: true, voteEntityId: result.voteEntityId }
      } else {
        throw new Error(result.error || 'Vote failed')
      }
    } catch (err: any) {
      console.error('Error voting:', err)
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
    votes,
    votesLoading,
    refetch: fetchInvestigation,
    vote
  }
}

export function useWalrusSearch() {
  const [results, setResults] = useState<EnhancedInvestigation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const walrusService = WalrusDataService.getInstance()

  const search = useCallback(async (query: string, filters: WalrusQueryFilters = {}) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const result = await walrusService.searchInvestigations(query, filters)
      
      if (result.success) {
        setResults(result.investigations)
      } else {
        setError(result.error || 'Search failed')
        setResults([])
      }
    } catch (err: any) {
      console.error('Error searching:', err)
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

  const walrusService = WalrusDataService.getInstance()

  const fetchUserData = useCallback(async () => {
    if (!userAddress) return

    try {
      setLoading(true)
      setError(null)
      
      // Fetch user investigations
      const investigationsResult = await walrusService.getUserInvestigations(userAddress)
      
      if (investigationsResult.success) {
        setUserInvestigations(investigationsResult.investigations)
      }
      
      // Fetch user stats
      const statsResult = await walrusService.getUserStats(userAddress)
      
      if (statsResult.success && statsResult.stats) {
        setUserStats(statsResult.stats)
      }
      
      if (!investigationsResult.success && !statsResult.success) {
        setError('Failed to fetch user data')
      }
    } catch (err: any) {
      console.error('Error fetching user data:', err)
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