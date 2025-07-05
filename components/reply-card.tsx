"use client"

import type { Reply } from "../types/investigation"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle, XCircle, HelpCircle, MoreHorizontal, MessageCircle, Share, Bookmark } from "lucide-react"

interface ReplyCardProps {
  reply: Reply
  onVote?: (replyId: string, vote: "correct" | "false" | "maybe") => void
}

export function ReplyCard({ reply, onVote }: ReplyCardProps) {
  const totalVotes = reply.votes.correct + reply.votes.false + reply.votes.maybe

  return (
    <div className="bg-black border border-white/20 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/30">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center ring-2 ring-white/20">
            <span className="text-xs font-bold text-white">{reply.author[0]}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-white">{reply.author}</span>
            <div className="flex items-center space-x-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
              <span>•</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs border ${
                  reply.type === "evidence"
                    ? "bg-green-500/20 text-green-300 border-green-400/30"
                    : reply.type === "analysis"
                      ? "bg-blue-500/20 text-blue-300 border-blue-400/30"
                      : "bg-yellow-500/20 text-yellow-300 border-yellow-400/30"
                }`}
              >
                {reply.type.toUpperCase()}
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
        <p className="text-gray-200 text-sm leading-relaxed mb-4">{reply.content}</p>

        {/* Action Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <div className="flex items-center space-x-3">
            {onVote ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto text-white hover:bg-emerald-500/10 rounded-full transition-all duration-200"
                  onClick={() => onVote(reply.id, "correct")}
                >
                  <CheckCircle className="w-5 h-5 text-emerald-400 hover:text-emerald-300" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto text-white hover:bg-red-500/10 rounded-full transition-all duration-200"
                  onClick={() => onVote(reply.id, "false")}
                >
                  <XCircle className="w-5 h-5 text-red-400 hover:text-red-300" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 h-auto text-white hover:bg-amber-500/10 rounded-full transition-all duration-200"
                  onClick={() => onVote(reply.id, "maybe")}
                >
                  <HelpCircle className="w-5 h-5 text-amber-400 hover:text-amber-300" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-1 text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-medium">{reply.votes.correct}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-white font-medium">{reply.votes.false}</span>
                </div>
                <div className="flex items-center space-x-1 text-xs">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-medium">{reply.votes.maybe}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-1 hover:bg-white/10 rounded-full">
              <MessageCircle className="w-4 h-4 text-gray-400 hover:text-white" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1 hover:bg-white/10 rounded-full">
              <Share className="w-4 h-4 text-gray-400 hover:text-white" />
            </Button>
            <Button variant="ghost" size="sm" className="p-1 hover:bg-white/10 rounded-full">
              <Bookmark className="w-4 h-4 text-gray-400 hover:text-white" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-2 pt-2 border-t border-white/5">
          <div className="text-xs text-gray-400">
            <span className="font-medium text-white">{totalVotes} votes</span> •{" "}
            {new Date(reply.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
