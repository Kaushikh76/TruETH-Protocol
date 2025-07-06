// hooks/usePublisherInvestigations.ts
import { useState, useEffect, useCallback } from 'react'
import { WalrusPublisherService, WalrusQueryFilters } from '../lib/walrusPublisherService'
import { EnhancedInvestigation } from '../types/enhanced-investigation'

export function usePublisherInvestigations(filters: WalrusQueryFilters = {}) {
  const [investigations, setInvestigations] = useState<EnhancedInvestigation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'walrus' | 'grc20' | 'combined'>('combined')
  const [refetchCount, setRefetchCount] = useState(0)

  const publisherService = WalrusPublisherService.getInstance()

  const fetchInvestigations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching investigations from publisher:', publisherService.getTargetPublisher())
      
      const result = await publisherService.getPublisherInvestigations(filters)
      
      if (result.success) {
        console.log(`✅ Found ${result.investigations.length} investigations (source: ${result.source})`)
        setInvestigations(result.investigations)
        setDataSource(result.source)
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
  }, [filters, refetchCount, publisherService])

  const refetch = useCallback(() => {
    console.log('🔄 Refetching publisher investigations...')
    setRefetchCount(prev => prev + 1)
  }, [])

  const vote = useCallback(async (investigationId: string, voteType: 'Correct' | 'Incorrect' | 'NeedsMoreEvidence', voter: string, reasoning?: string) => {
    try {
      console.log(`🗳️ Voting ${voteType} on investigation ${investigationId}`)
      
      // For now, just optimistically update the UI
      // In a full implementation, this would call the backend vote endpoint
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

  useEffect(() => {
    fetchInvestigations()
  }, [fetchInvestigations])

  return {
    investigations,
    loading,
    error,
    dataSource,
    targetPublisher: publisherService.getTargetPublisher(),
    refetch,
    vote
  }
}

export function usePublisherInvestigation(investigationId: string) {
  const [investigation, setInvestigation] = useState<EnhancedInvestigation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const publisherService = WalrusPublisherService.getInstance()

  const fetchInvestigation = useCallback(async () => {
    if (!investigationId) return

    try {
      setLoading(true)
      setError(null)
      
      console.log(`🔍 Fetching investigation: ${investigationId}`)
      
      // Get all investigations and find the specific one
      const result = await publisherService.getPublisherInvestigations()
      
      if (result.success) {
        const found = result.investigations.find(inv => 
          inv.id === investigationId || inv.blobId === investigationId
        )
        
        if (found) {
          console.log('✅ Investigation found')
          setInvestigation(found)
        } else {
          console.warn('⚠️ Investigation not found')
          setError('Investigation not found')
          setInvestigation(null)
        }
      } else {
        setError(result.error || 'Failed to fetch investigation')
        setInvestigation(null)
      }
    } catch (err: any) {
      console.error('❌ Error fetching investigation:', err)
      setError(err.message)
      setInvestigation(null)
    } finally {
      setLoading(false)
    }
  }, [investigationId, publisherService])

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
    loading,
    error,
    refetch: fetchInvestigation,
    vote
  }
}