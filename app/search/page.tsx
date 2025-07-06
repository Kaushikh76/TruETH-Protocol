// app/search/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InvestigationCard } from "../../components/investigation-card"
import { useWalrusSearch } from "../../hooks/useWalrusBlobs"
import { usePrivyWalletIntegration } from "../../hooks/usePrivyWalletIntegration"
import { EnhancedInvestigation } from "../../types/enhanced-investigation"
import { Search, Filter, X, Loader2, Database, Globe } from "lucide-react"

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [investigationType, setInvestigationType] = useState<string>("")
  const [severityLevel, setSeverityLevel] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  const { account } = usePrivyWalletIntegration()
  const { results, loading, error, search, clearResults } = useWalrusSearch()

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Perform search when debounced query or filters change
  useEffect(() => {
    if (debouncedQuery.trim()) {
      const filters = {
        ...(investigationType && { investigationType: investigationType as any }),
        ...(severityLevel && { severityLevel: severityLevel as any }),
        ...(statusFilter !== "all" && { status: statusFilter === "pending" ? "Pending" : "Verified" })
      }
      search(debouncedQuery, filters)
    } else {
      clearResults()
    }
  }, [debouncedQuery, investigationType, severityLevel, statusFilter, search, clearResults])

  // Get unique tags from results for tag filtering
  const availableTags = Array.from(new Set(results.flatMap((inv) => inv.tags)))

  const filteredResults = results.filter((inv) => {
    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => inv.tags.includes(tag))
    return matchesTags
  })

  const handleVote = async (investigationId: string, voteType: "correct" | "false" | "maybe") => {
    if (!account) {
      alert('Please connect your wallet to vote')
      return
    }
    // Note: Vote functionality would need to be implemented in search context
    // For now, just show an alert
    alert('Voting from search results coming soon. Please open the investigation to vote.')
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedTags([])
    setInvestigationType("")
    setSeverityLevel("")
    setStatusFilter("all")
    clearResults()
  }

  const hasActiveFilters = searchQuery || selectedTags.length > 0 || investigationType || severityLevel || statusFilter !== "all"

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Search Investigations
          </h1>
          <div className="flex items-center gap-4 text-sm">
            <p className="text-gray-400">Find investigations by searching Walrus blobs directly</p>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              <span className="text-gray-400">Direct Blob Search</span>
            </div>
          </div>
        </div>

        {/* Search Filters Container */}
        <div className="bg-black border border-white/10 rounded-xl p-6 mb-6 shadow-xl">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search investigations, descriptions, authors..."
              className="pl-10 bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4 animate-spin" />
            )}
          </div>

          {/* Filter Controls */}
          <div className="space-y-4">
            {/* Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400" />
              
              <select
                value={investigationType}
                onChange={(e) => setInvestigationType(e.target.value)}
                className="bg-gray-900/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-white/20"
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
                className="bg-gray-900/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-white/20"
              >
                <option value="">All Severity</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-900/50 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-white/20"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="disputed">Disputed</option>
                <option value="resolved">Resolved</option>
              </select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-gray-400 hover:text-white h-8 px-2 hover:bg-white/10 rounded-full"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Tags Filter */}
            {availableTags.length > 0 && (
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Filter by tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className={`cursor-pointer text-xs border transition-all duration-200 ${
                        selectedTags.includes(tag)
                          ? "bg-white/20 text-white border-white/30"
                          : "border-white/20 text-gray-400 hover:text-white hover:border-white/30 bg-transparent hover:bg-white/10"
                      }`}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="mb-4">
          {searchQuery ? (
            <div className="flex items-center gap-4">
              <p className="text-gray-400 text-sm">
                {loading 
                  ? 'Searching...' 
                  : `${filteredResults.length} investigation${filteredResults.length !== 1 ? 's' : ''} found for "${searchQuery}"`
                }
              </p>
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <span>Search error: {error}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              Start typing to search investigations stored on Walrus
            </p>
          )}
        </div>

        {/* Search Results */}
        <div className="space-y-6">
          {loading && searchQuery && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                <p className="text-white">Searching Walrus investigations...</p>
                <p className="text-gray-400 text-sm">Query: "{searchQuery}"</p>
              </div>
            </div>
          )}

          {!loading && searchQuery && filteredResults.length === 0 && !error && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No investigations found</p>
              <p className="text-gray-600 text-sm mb-4">
                Try adjusting your search terms or filters
              </p>
              <Button
                variant="outline"
                onClick={clearFilters}
                className="border-white/20 text-gray-400 hover:text-white hover:border-white/30 bg-transparent hover:bg-white/10"
              >
                Clear all filters
              </Button>
            </div>
          )}

          {!loading && !searchQuery && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Search Walrus Investigations</p>
              <p className="text-gray-600 text-sm mb-4">
                Enter keywords to search through investigations stored on the decentralized Walrus network
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  <span>Walrus Storage</span>
                </div>
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span>GRC-20 Graph</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="bg-red-500/10 border border-red-400/20 rounded-xl p-6">
                <p className="text-red-400 mb-2">Search Error</p>
                <p className="text-red-300 text-sm mb-4">{error}</p>
                <Button
                  onClick={() => search(searchQuery)}
                  className="bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-400/20"
                >
                  Retry Search
                </Button>
              </div>
            </div>
          )}

          {filteredResults.map((investigation) => (
            <InvestigationCard 
              key={investigation.id} 
              investigation={investigation} 
              onVote={handleVote}
              showVoting={false} // Disable voting in search results for now
            />
          ))}
        </div>

        {/* Search Tips */}
        {!searchQuery && (
          <div className="mt-12 bg-gray-900/30 rounded-xl p-6 border border-white/5">
            <h3 className="text-white font-medium mb-3">Search Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
              <div>
                <h4 className="text-white font-medium mb-2">Search by:</h4>
                <ul className="space-y-1">
                  <li>• Investigation titles</li>
                  <li>• Content descriptions</li>
                  <li>• Author addresses</li>
                  <li>• Tags and categories</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white font-medium mb-2">Filter by:</h4>
                <ul className="space-y-1">
                  <li>• Investigation type</li>
                  <li>• Severity level</li>
                  <li>• Status and tags</li>
                  <li>• Multiple criteria</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}