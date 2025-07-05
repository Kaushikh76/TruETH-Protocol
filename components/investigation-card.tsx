"use client"

import type React from "react"

import { useRouter } from "next/navigation"
import type { Investigation } from "../types/investigation"
import { Button } from "@/components/ui/button"
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
} from "lucide-react"

interface InvestigationCardProps {
  investigation: Investigation
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
  const totalVotes = investigation.votes.correct + investigation.votes.false + investigation.votes.maybe
  const timeRemaining = Math.max(0, investigation.verificationDeadline.getTime() - Date.now())
  const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60))
  const minutesRemaining = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60))

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    if ((e.target as HTMLElement).closest("button") || isDetailView) {
      return
    }
    router.push(`/investigation/${investigation.id}`)
  }

  return (
    <div
      className={`bg-black border border-white/20 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200 ${!isDetailView ? "cursor-pointer hover:border-white/30" : ""}`}
      onClick={handleCardClick}
    >
      {/* Header - Instagram style */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-white/20">
            <span className="text-xs font-bold text-white">{investigation.author[0]}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{investigation.author}</span>
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>
                {investigation.status === "pending" ? `${hoursRemaining}h ${minutesRemaining}m left` : "Completed"}
              </span>
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

        {/* Status and Reward */}
        <div className="flex items-center space-x-2 mb-3">
          <div
            className={`px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${
              investigation.status === "verified"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                : investigation.status === "false"
                  ? "bg-red-500/20 text-red-300 border-red-400/30"
                  : investigation.status === "extended"
                    ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                    : "bg-blue-500/20 text-blue-300 border-blue-400/30"
            }`}
          >
            {investigation.status.toUpperCase()}
          </div>
          <div className="flex items-center space-x-1 text-emerald-300 px-2 py-1 bg-emerald-500/15 rounded-full border border-emerald-400/20 backdrop-blur-sm">
            <DollarSign className="w-3 h-3" />
            <span className="text-xs font-medium">{investigation.rewardPool} USDC</span>
          </div>
        </div>

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
            {showVoting && investigation.status === "pending" && onVote ? (
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
                  <span className="text-white font-medium">{investigation.votes.false}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-medium">{investigation.votes.maybe}</span>
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
          <div className="text-xs text-gray-400">
            <span className="font-medium text-white">{totalVotes} votes</span> •{" "}
            {new Date(investigation.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
