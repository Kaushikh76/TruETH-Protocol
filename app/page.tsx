// app/page.tsx
"use client"

import { useState } from "react"
import { InvestigationCard } from "../components/investigation-card"
import { KnowledgeGraph } from "../components/knowledge-graph"
import { useWalrusInvestigations } from "../hooks/useWalrusBlobs"
import { usePrivyWalletIntegration } from "../hooks/usePrivyWalletIntegration"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Loader2, 
  AlertTriangle,
  RefreshCw,
  Database,
  Globe,
  Plus
} from "lucide-react"

export default function FeedPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all")
  const [investigationType, setInvestigationType] = useState<string>("")
  const [severityLevel, setSeverityLevel] = useState<string>("")
  
  const { account } = usePrivyWalletIntegration()
  
  // Build filters for Walrus query
  const walrusFilters = {
    ...(filter !== "all" && { status: filter === "pending" ? "Pending" : "Verified" }),
    ...(investigationType && { investigationType: investigationType as any }),
    ...(severityLevel && { severityLevel: severityLevel as any })
  }
  
  const { 
    investigations, 
    loading, 
    error, 
    refetch, 
    vote,
    addKnownBlobId 
  } = useWalrusInvestigations(walrusFilters)

  const handleVote = async (investigationId: string, voteType: "correct" | "false" | "maybe") => {
    if (!account) {
      alert('Please connect your wallet to vote')
      return
    }

    // Map vote types to match backend
    const mappedVoteType = voteType === "correct" ? "Correct" : 
                          voteType === "false" ? "Incorrect" : "NeedsMoreEvidence"

    const result = await vote(investigationId, mappedVoteType, account)
    
    if (!result.success) {
      alert(`Failed to vote: ${result.error}`)
    }
  }

  const handleRefresh = () => {
    refetch()
  }

  const clearFilters = () => {
    setFilter("all")
    setInvestigationType("")
    setSeverityLevel("")
  }

  const handleAddBlobId = () => {
    const blobId = prompt('Enter a Walrus blob ID to add:')
    if (blobId?.trim()) {
      addKnownBlobId(blobId.trim(), {
        createdAt: new Date().toISOString(),
        author: 'manual-add'
      })
    }
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              TruETH Protocol
            </h1>
            <p className="text-gray-400 text-sm">Discover and verify investigations stored directly on Walrus</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddBlobId}
              variant="outline"
              size="sm"
              className="border-white/20 text-gray-300 hover:text-white hover:border-white/30"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Blob
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="border-white/20 text-gray-300 hover:text-white hover:border-white/30"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400" />
            <span className="text-gray-400">
              {loading ? 'Loading...' : `${investigations.length} investigations from Walrus blobs`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-gray-400">Direct Blob Access</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Posts Feed */}
        <div className="lg:col-span-2">
          {/* Bento Box Container for Feed */}
          <div className="bg-black border border-white/10 rounded-xl p-6 shadow-xl">
            {/* Filter Controls */}
            <div className="mb-6 space-y-4">
              {/* Status Tabs */}
              <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
                <TabsList className="grid w-full grid-cols-3 bg-gray-900/50 border border-white/10">
                  <TabsTrigger
                    value="all"
                    className="flex items-center gap-2 data-[state=active]:bg-white/15 data-[state=active]:text-white text-gray-400 text-xs"
                  >
                    <TrendingUp className="w-3 h-3" />
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="pending"
                    className="flex items-center gap-2 data-[state=active]:bg-white/15 data-[state=active]:text-white text-gray-400 text-xs"
                  >
                    <Clock className="w-3 h-3" />
                    Pending
                  </TabsTrigger>
                  <TabsTrigger
                    value="verified"
                    className="flex items-center gap-2 data-[state=active]:bg-white/15 data-[state=active]:text-white text-gray-400 text-xs"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Additional Filters */}
              <div className="flex gap-2 flex-wrap">
                <select
                  value={investigationType}
                  onChange={(e) => setInvestigationType(e.target.value)}
                  className="bg-gray-900/50 border border-white/10 rounded px-3 py-1 text-sm text-white focus:border-white/20"
                >
                  <option value="">All Types</option>
                  <option value="Financial">Financial</option>
                  <option value="Social">Social</option>
                  <option value="Technical">Technical</option>
                  <option value="Legal">Legal</option>
                  <option value="Environmental">Environmental</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Political">Political</option>
                </select>

                <select
                  value={severityLevel}
                  onChange={(e) => setSeverityLevel(e.target.value)}
                  className="bg-gray-900/50 border border-white/10 rounded px-3 py-1 text-sm text-white focus:border-white/20"
                >
                  <option value="">All Severity</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>

                {(investigationType || severityLevel || filter !== "all") && (
                  <Button
                    onClick={clearFilters}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white h-8 px-2 hover:bg-white/10 rounded-full"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-400/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <h3 className="text-red-300 font-medium">Failed to load investigations</h3>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    className="border-red-400/50 text-red-300 hover:text-red-200 hover:border-red-400/70"
                  >
                    Retry
                  </Button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && investigations.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                  <p className="text-white">Loading investigations from Walrus...</p>
                  <p className="text-gray-400 text-sm">Querying GRC-20 knowledge graph</p>
                </div>
              </div>
            )}

            {/* Feed Content */}
            {!loading || investigations.length > 0 ? (
              <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                {investigations.map((investigation) => (
                  <InvestigationCard 
                    key={investigation.id} 
                    investigation={investigation} 
                    onVote={handleVote} 
                  />
                ))}

                {!loading && investigations.length === 0 && !error && (
                  <div className="text-center py-12">
                    <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No investigations found</p>
                    <p className="text-gray-600 text-sm mb-4">
                      {filter !== "all" || investigationType || severityLevel
                        ? "Try adjusting your filters or create the first investigation"
                        : "Be the first to create an investigation"}
                    </p>
                    <Button
                      onClick={() => window.location.href = '/post'}
                      className="bg-purple-500 hover:bg-purple-600 text-white"
                    >
                      Create Investigation
                    </Button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Loading indicator when refreshing with existing data */}
            {loading && investigations.length > 0 && (
              <div className="flex items-center justify-center py-4 border-t border-white/10 mt-6">
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Refreshing...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Knowledge Graph */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 h-[800px]">
            <KnowledgeGraph investigations={investigations} />
          </div>
        </div>
      </div>
    </div>
  )
}