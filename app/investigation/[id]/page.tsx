"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { InvestigationCard } from "../../../components/investigation-card"
import { ReplyCard } from "../../../components/reply-card"
import { mockInvestigations, mockReplies } from "../../../lib/mock-data"
import type { Investigation, Reply } from "../../../types/investigation"
import { ArrowLeft, MessageCircle, Send } from "lucide-react"

export default function InvestigationPage() {
  const params = useParams()
  const router = useRouter()
  const investigationId = params.id as string

  const [investigation] = useState<Investigation | undefined>(
    mockInvestigations.find((inv) => inv.id === investigationId),
  )
  const [replies, setReplies] = useState<Reply[]>(
    mockReplies.filter((reply) => reply.investigationId === investigationId),
  )
  const [newReply, setNewReply] = useState("")

  if (!investigation) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Investigation Not Found</h1>
          <Button onClick={() => router.back()} className="bg-white/20 text-white hover:bg-white/30">
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  const handleVote = (investigationId: string, vote: "correct" | "false" | "maybe") => {
    // Handle voting logic
    console.log("Vote:", vote, "for investigation:", investigationId)
  }

  const handleReplyVote = (replyId: string, vote: "correct" | "false" | "maybe") => {
    setReplies((prev) =>
      prev.map((reply) => {
        if (reply.id === replyId) {
          return {
            ...reply,
            votes: {
              ...reply.votes,
              [vote]: reply.votes[vote] + 1,
            },
          }
        }
        return reply
      }),
    )
  }

  const handleReplySubmit = () => {
    if (!newReply.trim()) return

    const reply: Reply = {
      id: `reply-${Date.now()}`,
      investigationId: investigation.id,
      content: newReply,
      author: "CurrentUser",
      authorAddress: "0x1234...5678",
      createdAt: new Date(),
      votes: { correct: 0, false: 0, maybe: 0 },
      userVotes: {},
      type: "analysis",
    }

    setReplies([...replies, reply])
    setNewReply("")
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-white/10 rounded-full p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{investigation.title}</h1>
            <p className="text-gray-400 text-sm">{replies.length} replies</p>
          </div>
        </div>

        {/* Main Investigation Post */}
        <div className="mb-6">
          <InvestigationCard investigation={investigation} onVote={handleVote} isDetailView={true} />
        </div>

        {/* Reply Composer */}
        <div className="bg-black border border-white/10 rounded-xl p-4 mb-6 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-white/20">
              <span className="text-xs font-bold text-white">U</span>
            </div>
            <div className="flex-1">
              <Textarea
                value={newReply}
                onChange={(e) => setNewReply(e.target.value)}
                placeholder="Add your analysis or evidence..."
                className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 resize-none"
                rows={3}
              />
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <MessageCircle className="w-4 h-4" />
                  <span>Reply to investigation</span>
                </div>
                <Button
                  onClick={handleReplySubmit}
                  disabled={!newReply.trim()}
                  size="sm"
                  className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-400/20"
                >
                  <Send className="w-4 h-4 mr-1" />
                  Reply
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Replies as Investigation Cards */}
        <div className="space-y-6">
          {replies.map((reply) => (
            <ReplyCard key={reply.id} reply={reply} onVote={handleReplyVote} />
          ))}
        </div>

        {replies.length === 0 && (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No replies yet</p>
            <p className="text-gray-600 text-sm">Be the first to add your analysis or evidence</p>
          </div>
        )}
      </div>
    </div>
  )
}
