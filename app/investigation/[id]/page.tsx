// app/investigation/[id]/page.tsx
"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { InvestigationCard } from "../../../components/investigation-card"
import { useWalrusInvestigation } from "../../../hooks/useWalrusBlobs"
import { usePrivyWalletIntegration } from "../../../hooks/usePrivyWalletIntegration"
import { 
  ArrowLeft, 
  MessageCircle, 
  Send, 
  Loader2, 
  AlertTriangle,
  Database,
  Brain,
  Clock,
  MapPin,
  Wallet,
  Globe,
  DollarSign,
  Copy,
  ExternalLink
} from "lucide-react"

export default function InvestigationPage() {
  const params = useParams()
  const router = useRouter()
  const investigationId = params.id as string

  const { account } = usePrivyWalletIntegration()
  const { investigation, loading, error, vote } = useWalrusInvestigation(investigationId)

  const [newReply, setNewReply] = useState("")
  const [isSubmittingReply, setIsSubmittingReply] = useState(false)

  const handleVote = async (investigationId: string, voteType: "correct" | "false" | "maybe") => {
    if (!account) {
      alert('Please connect your wallet to vote')
      return
    }

    // Map vote types to match backend
    const mappedVoteType = voteType === "correct" ? "Correct" : 
                          voteType === "false" ? "Incorrect" : "NeedsMoreEvidence"

    const result = await vote(mappedVoteType, account)
    
    if (!result.success) {
      alert(`Failed to vote: ${result.error}`)
    }
  }

  const handleReplySubmit = async () => {
    if (!newReply.trim() || !account) return

    setIsSubmittingReply(true)
    try {
      // TODO: Implement reply submission to Walrus as a separate blob
      setNewReply("")
      alert('Reply functionality - store as separate Walrus blob coming soon!')
    } catch (error) {
      console.error('Failed to submit reply:', error)
      alert('Failed to submit reply')
    } finally {
      setIsSubmittingReply(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const openWalrusExplorer = (blobId: string) => {
    // Open in Walrus explorer - adjust URL as needed
    window.open(`https://blobscan.com/blob/${blobId}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Loading Investigation</h1>
          <p className="text-gray-400">Fetching blob directly from Walrus...</p>
        </div>
      </div>
    )
  }

  if (error || !investigation) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Investigation Not Found</h1>
          <p className="text-gray-400 mb-6">
            {error || 'This investigation blob could not be found on Walrus'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => router.back()} 
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={() => router.push('/')}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Browse Investigations
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-6">
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
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>0 replies</span>
              <span>•</span>
              <span>{investigation.votes.correct + investigation.votes.incorrect + investigation.votes.needsMoreEvidence} votes</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>Walrus</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Investigation Post */}
            <InvestigationCard 
              investigation={investigation} 
              onVote={handleVote} 
              isDetailView={true} 
            />

            {/* AI Analysis Section */}
            {investigation.involvedEntities && (
              <div className="bg-black border border-white/10 rounded-xl p-6 shadow-xl">
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  AI Entity Analysis
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wallet Addresses */}
                  {investigation.involvedEntities.walletAddresses.length > 0 && (
                    <div className="p-4 bg-orange-500/10 border border-orange-400/20 rounded-lg">
                      <h3 className="text-orange-300 font-medium mb-2 flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Wallet Addresses ({investigation.involvedEntities.walletAddresses.length})
                      </h3>
                      <div className="space-y-2">
                        {investigation.involvedEntities.walletAddresses.map((address, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-black/30 rounded">
                            <span className="text-orange-400 font-mono text-sm">
                              {address.slice(0, 6)}...{address.slice(-4)}
                            </span>
                            <button
                              onClick={() => copyToClipboard(address)}
                              className="text-gray-400 hover:text-white"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Organizations */}
                  {investigation.involvedEntities.organizations.length > 0 && (
                    <div className="p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                      <h3 className="text-blue-300 font-medium mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Organizations ({investigation.involvedEntities.organizations.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {investigation.involvedEntities.organizations.map((org, index) => (
                          <Badge key={index} className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                            {org}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Locations */}
                  {investigation.involvedEntities.locations.length > 0 && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-lg">
                      <h3 className="text-emerald-300 font-medium mb-2 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Locations ({investigation.involvedEntities.locations.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {investigation.involvedEntities.locations.map((location, index) => (
                          <Badge key={index} className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                            {location}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Platforms */}
                  {investigation.involvedEntities.platforms.length > 0 && (
                    <div className="p-4 bg-purple-500/10 border border-purple-400/20 rounded-lg">
                      <h3 className="text-purple-300 font-medium mb-2 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Platforms ({investigation.involvedEntities.platforms.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {investigation.involvedEntities.platforms.map((platform, index) => (
                          <Badge key={index} className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Impact */}
                {investigation.financialImpact && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-400/20 rounded-lg">
                    <h3 className="text-amber-300 font-medium mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Financial Impact
                    </h3>
                    <div className="flex gap-4 text-sm">
                      {investigation.financialImpact.amount && (
                        <span className="text-white">
                          Amount: {investigation.financialImpact.amount} {investigation.financialImpact.currency}
                        </span>
                      )}
                      {investigation.financialImpact.affectedUsers && (
                        <span className="text-white">
                          Affected Users: {investigation.financialImpact.affectedUsers}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reply Composer */}
            <div className="bg-black border border-white/10 rounded-xl p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-2 ring-white/20">
                  <span className="text-xs font-bold text-white">
                    {account ? account.slice(2, 4).toUpperCase() : 'U'}
                  </span>
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
                      <span>Reply functionality coming soon</span>
                    </div>
                    <Button
                      onClick={handleReplySubmit}
                      disabled={!newReply.trim() || !account || isSubmittingReply}
                      size="sm"
                      className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-400/20"
                    >
                      {isSubmittingReply ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-1" />
                      )}
                      Reply
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Placeholder for future replies */}
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No replies yet</p>
              <p className="text-gray-600 text-sm">Reply system will be integrated with Walrus storage soon</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Investigation Metadata */}
              <div className="bg-black border border-white/10 rounded-xl p-4 shadow-xl">
                <h3 className="text-white font-semibold mb-3">Investigation Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30">
                      {investigation.investigationType}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Severity:</span>
                    <Badge className={`${
                      investigation.severityLevel === 'Critical' ? 'bg-red-500/20 text-red-300 border-red-400/30' :
                      investigation.severityLevel === 'High' ? 'bg-orange-500/20 text-orange-300 border-orange-400/30' :
                      investigation.severityLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30' :
                      'bg-gray-500/20 text-gray-300 border-gray-400/30'
                    }`}>
                      {investigation.severityLevel}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Scope:</span>
                    <span className="text-white">{investigation.geographicScope}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <Badge className={`${
                      investigation.status === 'Verified' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30' :
                      investigation.status === 'Disputed' ? 'bg-red-500/20 text-red-300 border-red-400/30' :
                      investigation.status === 'Resolved' ? 'bg-blue-500/20 text-blue-300 border-blue-400/30' :
                      'bg-amber-500/20 text-amber-300 border-amber-400/30'
                    }`}>
                      {investigation.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white text-xs">
                      {investigation.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Author:</span>
                    <span className="text-white text-xs font-mono">
                      {investigation.authorAddress.slice(0, 6)}...{investigation.authorAddress.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Walrus Storage Info */}
              {investigation.blobId && (
                <div className="bg-black border border-white/10 rounded-xl p-4 shadow-xl">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-purple-400" />
                    Walrus Storage
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-400 block mb-1">Blob ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-mono bg-gray-900/50 px-2 py-1 rounded">
                          {investigation.blobId.slice(0, 20)}...
                        </span>
                        <button
                          onClick={() => copyToClipboard(investigation.blobId!)}
                          className="text-gray-400 hover:text-white"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openInExplorer(investigation.blobId!)}
                          className="text-gray-400 hover:text-white"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {investigation.grc20EntityId && (
                      <div>
                        <span className="text-gray-400 block mb-1">GRC-20 Entity:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs font-mono bg-gray-900/50 px-2 py-1 rounded">
                            {investigation.grc20EntityId.slice(0, 20)}...
                          </span>
                          <button
                            onClick={() => copyToClipboard(investigation.grc20EntityId!)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Voting Stats */}
              <div className="bg-black border border-white/10 rounded-xl p-4 shadow-xl">
                <h3 className="text-white font-semibold mb-3">Voting Results</h3>
                {votesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400 text-sm">Correct</span>
                      <span className="text-white font-semibold">
                        {investigation.votes.correct}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-400 text-sm">Incorrect</span>
                      <span className="text-white font-semibold">
                        {investigation.votes.incorrect}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-amber-400 text-sm">Needs More Evidence</span>
                      <span className="text-white font-semibold">
                        {investigation.votes.needsMoreEvidence}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Total Votes</span>
                        <span className="text-white font-semibold">
                          {investigation.votes.correct + investigation.votes.incorrect + investigation.votes.needsMoreEvidence}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeframe */}
              {investigation.timeframe && (investigation.timeframe.startDate || investigation.timeframe.duration) && (
                <div className="bg-black border border-white/10 rounded-xl p-4 shadow-xl">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Timeline
                  </h3>
                  <div className="space-y-2 text-sm">
                    {investigation.timeframe.startDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Start Date:</span>
                        <span className="text-white">{investigation.timeframe.startDate}</span>
                      </div>
                    )}
                    {investigation.timeframe.endDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">End Date:</span>
                        <span className="text-white">{investigation.timeframe.endDate}</span>
                      </div>
                    )}
                    {investigation.timeframe.duration && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-white">{investigation.timeframe.duration}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}