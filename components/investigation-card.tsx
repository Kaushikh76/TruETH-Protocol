// components/investigation-card.tsx
"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { EnhancedInvestigation } from "../types/enhanced-investigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  HelpCircle,
  MoreHorizontal,
  MessageCircle,
  Share,
  Bookmark,
  Database,
  Brain,
  MapPin,
  Wallet,
  AlertTriangle,
  Globe
} from "lucide-react"

interface InvestigationCardProps {
  investigation: EnhancedInvestigation
  onVote?: (investigationId: string, vote: "correct" | "false" | "maybe") => void
  showVoting?: boolean
  isDetailView?: boolean
}

export function InvestigationCard({
  investigation,
  onVote,
  showVoting = true,
  isDetailView = false,
}: InvestigationCardProps) {
  const router = useRouter()
  const totalVotes = investigation.votes.correct + investigation.votes.incorrect + investigation.votes.needsMoreEvidence
  const timeRemaining = investigation.verificationDeadline 
    ? Math.max(0, investigation.verificationDeadline.getTime() - Date.now())
    : 0
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    if ((e.target as HTMLElement).closest("button") || isDetailView) {
      return
    }
    router.push(`/investigation/${investigation.id}`)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-500/20 text-red-300 border-red-400/30'
      case 'High': return 'bg-orange-500/20 text-orange-300 border-orange-400/30'
      case 'Medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30'
      case 'Low': return 'bg-gray-500/20 text-gray-300 border-gray-400/30'
      default: return 'bg-blue-500/20 text-blue-300 border-blue-400/30'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Financial': return '💰'
      case 'Social': return '📱'
      case 'Technical': return '🔒'
      case 'Legal': return '⚖️'
      case 'Environmental': return '🌱'
      case 'Corporate': return '🏢'
      case 'Political': return '🗳️'
      default: return '📋'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified': return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
      case 'Disputed': return 'bg-red-500/20 text-red-300 border-red-400/30'
      case 'Resolved': return 'bg-blue-500/20 text-blue-300 border-blue-400/30'
      default: return 'bg-amber-500/20 text-amber-300 border-amber-400/30'
    }
  }

  return (
    <div
      className={`bg-black border border-white/20 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 ${!isDetailView ? "cursor-pointer hover:border-white/30" : ""}`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-white/20">
            <span className="text-xs font-bold text-white">
              {investigation.author ? investigation.author.slice(2, 4).toUpperCase() : investigation.authorAddress.slice(2, 4).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">
              {investigation.author || `${investigation.authorAddress.slice(0, 6)}...${investigation.authorAddress.slice(-4)}`}
            </span>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>
                {investigation.status === "Pending" && timeRemaining > 0 
                  ? `${hoursRemaining}h ${minutesRemaining}m left`
                  : investigation.createdAt.toLocaleDateString()
                }
              </span>
              {investigation.blobId && (
                <>
                  <span>•</span>
                  <Database className="w-3 h-3 text-purple-400" />
                  <span>Walrus</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-white/10 rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="p-4">
        <h3 className="font-bold text-white text-base mb-2 leading-tight">{investigation.title}</h3>
        <p className={`text-gray-200 text-sm leading-relaxed mb-4 ${!isDetailView ? "line-clamp-3" : ""}`}>
          {investigation.content}
        </p>

        {/* Enhanced Status and Metadata */}
        <div className="flex items-center space-x-2 mb-3 flex-wrap gap-1">
          {/* Investigation Type */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm bg-purple-500/20 text-purple-300 border-purple-400/30">
            <span>{getTypeIcon(investigation.investigationType)}</span>
            <span>{investigation.investigationType}</span>
          </div>

          {/* Severity Level */}
          <div className={`px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${getSeverityColor(investigation.severityLevel)}`}>
            {investigation.severityLevel === 'Critical' && <AlertTriangle className="w-3 h-3 inline mr-1" />}
            {investigation.severityLevel}
          </div>

          {/* Status */}
          <div className={`px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${getStatusColor(investigation.status)}`}>
            {investigation.status}
          </div>

          {/* Geographic Scope */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm bg-blue-500/20 text-blue-300 border-blue-400/30">
            <MapPin className="w-3 h-3" />
            <span>{investigation.geographicScope}</span>
          </div>

          {/* Reward Pool */}
          <div className="flex items-center space-x-1 text-emerald-300 px-2 py-1 bg-emerald-500/15 rounded-full border border-emerald-400/20 backdrop-blur-sm">
            <DollarSign className="w-3 h-3" />
            <span className="text-xs font-medium">{investigation.rewardPool} USDC</span>
          </div>
        </div>

        {/* AI-Extracted Entity Highlights */}
        {investigation.involvedEntities && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-400">AI-Extracted Entities</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {investigation.involvedEntities.walletAddresses.slice(0, 2).map((address, index) => (
                <div key={index} className="flex items-center gap-1 px-2 py-1 bg-orange-500/10 rounded text-xs border border-orange-400/20">
                  <Wallet className="w-3 h-3 text-orange-400" />
                  <span className="text-orange-300 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</span>
                </div>
              ))}
              {investigation.involvedEntities.organizations.slice(0, 1).map((org, index) => (
                <div key={index} className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded text-xs border border-blue-400/20">
                  <Globe className="w-3 h-3 text-blue-400" />
                  <span className="text-blue-300">{org}</span>
                </div>
              ))}
              {investigation.involvedEntities.locations.slice(0, 1).map((location, index) => (
                <div key={index} className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 rounded text-xs border border-emerald-400/20">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-300">{location}</span>
                </div>
              ))}
              
              {/* Show count if there are more entities */}
              {(investigation.involvedEntities.walletAddresses.length > 2 ||
                investigation.involvedEntities.organizations.length > 1 ||
                investigation.involvedEntities.locations.length > 1) && (
                <div className="px-2 py-1 bg-gray-500/10 rounded text-xs border border-gray-400/20">
                  <span className="text-gray-400">
                    +{Math.max(0, 
                      investigation.involvedEntities.walletAddresses.length - 2 +
                      investigation.involvedEntities.organizations.length - 1 +
                      investigation.involvedEntities.locations.length - 1
                    )} more
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {investigation.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-blue-300 text-xs bg-blue-500/10 px-2 py-1 rounded-full border border-blue-400/20"
            >
              #{tag.toLowerCase().replace(/\s+/g, "")}
            </span>
          ))}
          {investigation.tags.length > 3 && (
            <span className="text-gray-400 text-xs bg-gray-500/10 px-2 py-1 rounded-full border border-gray-400/20">
              +{investigation.tags.length - 3} more
            </span>
          )}
        </div>

        {/* Evidence Section (only in detail view) */}
        {isDetailView && investigation.evidence.length > 0 && (
          <div className="mb-4 p-3 bg-gray-900/30 rounded-lg border border-white/10">
            <h4 className="text-sm font-semibold text-white mb-2">Evidence & Sources</h4>
            <ul className="space-y-1">
              {investigation.evidence.map((evidence, index) => (
                <li key={index} className="text-xs text-gray-300 flex items-center gap-2">
                  <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
                  {evidence}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center space-x-3">
            {showVoting && investigation.status === "Pending" && onVote ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto text-white hover:bg-emerald-500/10 rounded-full transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote(investigation.id, "correct")
                  }}
                >
                  <CheckCircle className="w-5 h-5 text-emerald-400 hover:text-emerald-300" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto text-white hover:bg-red-500/10 rounded-full transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote(investigation.id, "false")
                  }}
                >
                  <XCircle className="w-5 h-5 text-red-400 hover:text-red-300" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto text-white hover:bg-amber-500/10 rounded-full transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote(investigation.id, "maybe")
                  }}
                >
                  <HelpCircle className="w-5 h-5 text-amber-400 hover:text-amber-300" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-1 text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-medium">{investigation.votes.correct}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-white font-medium">{investigation.votes.incorrect}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-medium">{investigation.votes.needsMoreEvidence}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-white/10 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageCircle className="w-4 h-4 text-gray-400 hover:text-white" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-white/10 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Share className="w-4 h-4 text-gray-400 hover:text-white" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-white/10 rounded-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Bookmark className="w-4 h-4 text-gray-400 hover:text-white" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="text-xs text-gray-400 flex items-center justify-between">
            <div>
              <span className="font-medium text-white">{totalVotes} votes</span> •{" "}
              {investigation.createdAt.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              {investigation.blobId && (
                <>
                  {" "}• <span className="text-purple-400">Stored on Walrus</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              {investigation.involvedEntities?.walletAddresses.length > 0 && (
                <div className="flex items-center gap-1">
                  <Wallet className="w-3 h-3 text-orange-400" />
                  <span className="text-orange-400">{investigation.involvedEntities.walletAddresses.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}