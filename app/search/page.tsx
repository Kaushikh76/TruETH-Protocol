"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { InvestigationCard } from "../../components/investigation-card"
import { mockInvestigations } from "../../lib/mock-data"
import type { Investigation } from "../../types/investigation"
import { Search, Filter, X } from "lucide-react"

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [investigations] = useState<Investigation[]>(mockInvestigations)

  const allTags = Array.from(new Set(investigations.flatMap((inv) => inv.tags)))

  const filteredInvestigations = investigations.filter((inv) => {
    const matchesSearch =
      searchQuery === "" ||
      inv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.author.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTags = selectedTags.length === 0 || selectedTags.some((tag) => inv.tags.includes(tag))
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter

    return matchesSearch && matchesTags && matchesStatus
  })

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedTags([])
    setStatusFilter("all")
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Search
        </h1>
        <p className="text-gray-400 text-sm mb-6">Find investigations by keywords, tags, or status</p>

        {/* Search Filters Container */}
        <div className="bg-black border border-white/10 rounded-xl p-4 mb-6 shadow-xl">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search investigations..."
              className="pl-10 bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-900/50 border border-white/10 rounded px-2 py-1 text-sm text-white focus:border-white/20"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="false">False</option>
              <option value="extended">Extended</option>
            </select>
            {(searchQuery || selectedTags.length > 0 || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-400 hover:text-white h-8 px-2 hover:bg-white/10 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {allTags.map((tag) => (
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

        <div className="mb-4">
          <p className="text-gray-400 text-sm">
            {filteredInvestigations.length} investigation{filteredInvestigations.length !== 1 ? "s" : ""} found
          </p>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-lg mx-auto px-4">
        {filteredInvestigations.map((investigation) => (
          <InvestigationCard key={investigation.id} investigation={investigation} showVoting={false} />
        ))}
      </div>

      {filteredInvestigations.length === 0 && (
        <div className="text-center py-12 max-w-lg mx-auto">
          <p className="text-gray-500 mb-4">No investigations found matching your criteria.</p>
          <Button
            variant="outline"
            onClick={clearFilters}
            className="border-white/20 text-gray-400 hover:text-white hover:border-white/30 bg-transparent hover:bg-white/10"
          >
            Clear all filters
          </Button>
        </div>
      )}
    </div>
  )
}
