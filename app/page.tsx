"use client"

import { useState } from "react"
import { InvestigationCard } from "../components/investigation-card"
import { KnowledgeGraph } from "../components/knowledge-graph"
import { mockInvestigations } from "../lib/mock-data"
import type { Investigation } from "../types/investigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, Clock, CheckCircle } from "lucide-react"

export default function FeedPage() {
  const [investigations, setInvestigations] = useState<Investigation[]>(mockInvestigations)
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("all")

  const handleVote = (investigationId: string, vote: "correct" | "false" | "maybe") => {
    setInvestigations((prev) =>
      prev.map((inv) => {
        if (inv.id === investigationId) {
          return {
            ...inv,
            votes: {
              ...inv.votes,
              [vote]: inv.votes[vote] + 1,
            },
          }
        }
        return inv
      }),
    )
  }

  const filteredInvestigations = investigations.filter((inv) => {
    if (filter === "all") return true
    if (filter === "pending") return inv.status === "pending"
    if (filter === "verified") return inv.status === "verified"
    return true
  })

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <h1 className="text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          TruETH Protocol
        </h1>
        <p className="text-gray-400 text-sm">Discover and verify community investigations</p>
      </div>

      {/* Two Column Layout */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Posts Feed */}
        <div className="lg:col-span-2">
          {/* Bento Box Container for Feed */}
          <div className="bg-black border border-white/10 rounded-xl p-6 shadow-xl">
            {/* Filter Tabs */}
            <div className="mb-6">
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
            </div>

            {/* Feed Content */}
            <div className="space-y-6 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredInvestigations.map((investigation) => (
                <InvestigationCard key={investigation.id} investigation={investigation} onVote={handleVote} />
              ))}

              {filteredInvestigations.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">No investigations found for this filter.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Knowledge Graph */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 h-[800px]">
            <KnowledgeGraph />
          </div>
        </div>
      </div>
    </div>
  )
}
