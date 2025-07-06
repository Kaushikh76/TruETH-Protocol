// app/profile/page.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InvestigationCard } from "../../components/investigation-card"
import { useWalrusUserData } from "../../hooks/useWalrusBlobs"
import { usePrivyWalletIntegration } from "../../hooks/usePrivyWalletIntegration"
import { 
  User, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Trophy, 
  Settings,
  Loader2,
  AlertTriangle,
  Database,
  Wallet,
  Copy,
  ExternalLink,
  Brain,
  Globe
} from "lucide-react"

export default function ProfilePage() {
  const { account, user, usdcBalance } = usePrivyWalletIntegration()
  
  const { 
    userInvestigations, 
    userStats, 
    loading, 
    error, 
    refetch 
  } = useWalrusUserData(account || '')

  const [activeTab, setActiveTab] = useState("investigations")

  const handleVote = async (investigationId: string, voteType: "correct" | "false" | "maybe") => {
    if (!account) {
      alert('Please connect your wallet to vote')
      return
    }
    // Note: Vote functionality would need to be implemented in profile context
    alert('Voting from profile coming soon. Please open the investigation to vote.')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getUserLoginMethod = () => {
    if (!user) return null
    
    if (user.email) return { 
      type: 'email', 
      value: user.email.address,
      display: user.email.address.length > 20 ? 
        `${user.email.address.slice(0, 15)}...` : 
        user.email.address
    }
    if (user.google) return { 
      type: 'google', 
      value: user.google.email,
      display: user.google.name || user.google.email
    }
    if (user.twitter) return { 
      type: 'twitter', 
      value: user.twitter.username,
      display: `@${user.twitter.username}`
    }
    if (user.discord) return { 
      type: 'discord', 
      value: user.discord.username,
      display: user.discord.username
    }
    
    return { 
      type: 'anonymous', 
      value: 'Anonymous',
      display: 'Anonymous'
    }
  }

  const loginMethod = getUserLoginMethod()

  if (!account) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-6">Please connect your wallet to view your profile</p>
          <Button
            onClick={() => window.location.href = '/'}
            className="bg-purple-500 hover:bg-purple-600 text-white"
          >
            Go to Home
          </Button>
        </div>
      </div>
    )
  }

  const stats = [
    { 
      label: "Earned", 
      value: userStats ? `${userStats.totalEarned.toFixed(2)} USDC` : "0 USDC", 
      icon: DollarSign,
      loading: loading 
    },
    { 
      label: "Created", 
      value: userStats ? userStats.totalInvestigations.toString() : "0", 
      icon: FileText,
      loading: loading 
    },
    { 
      label: "Votes", 
      value: userStats ? userStats.totalVotes.toString() : "0", 
      icon: CheckCircle,
      loading: loading 
    },
    { 
      label: "Reputation", 
      value: userStats ? userStats.reputation.toString() : "0", 
      icon: Trophy,
      loading: loading 
    },
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-black border border-white/10 rounded-xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-4 ring-white/20">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {loginMethod?.display || 'Anonymous User'}
                </h1>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-gray-400 text-sm font-mono">{formatAddress(account)}</p>
                    <button
                      onClick={() => copyToClipboard(account)}
                      className="text-gray-400 hover:text-white"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  {loginMethod && (
                    <p className="text-purple-400 text-xs">
                      Signed in via {loginMethod.type}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-gray-400 hover:text-white bg-transparent hover:bg-white/10"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* Balance Display */}
          <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">USDC Balance</h3>
                <p className="text-gray-400 text-sm">Available for investigations</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-400">{usdcBalance} USDC</p>
                <p className="text-gray-400 text-sm">Arbitrum Sepolia</p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center">
                  <div className="bg-gray-900/50 border border-white/10 rounded-xl p-4 mb-2">
                    <Icon className="w-5 h-5 text-white mx-auto mb-2" />
                    {stat.loading ? (
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin mx-auto" />
                    ) : (
                      <p className="text-lg font-bold text-white">{stat.value}</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              )
            })}
          </div>

          {/* Data Source Indicator */}
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Database className="w-3 h-3" />
              <span>Walrus Storage</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>GRC-20 Graph</span>
            </div>
            <div className="flex items-center gap-1">
              <Brain className="w-3 h-3" />
              <span>AI Analytics</span>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-400/20 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <div className="flex-1">
                <h3 className="text-red-300 font-medium">Failed to load profile data</h3>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
              <Button
                onClick={refetch}
                variant="outline"
                size="sm"
                className="border-red-400/50 text-red-300 hover:text-red-200 hover:border-red-400/70"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border border-white/10">
            <TabsTrigger
              value="investigations"
              className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-gray-400 text-sm"
            >
              My Investigations ({userInvestigations.length})
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-gray-400 text-sm"
            >
              Activity Feed
            </TabsTrigger>
          </TabsList>

          <TabsContent value="investigations">
            {loading && userInvestigations.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                  <p className="text-white">Loading your investigations...</p>
                  <p className="text-gray-400 text-sm">Querying Walrus storage</p>
                </div>
              </div>
            ) : userInvestigations.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No investigations yet</p>
                <p className="text-gray-600 text-sm mb-4">
                  Create your first investigation to get started
                </p>
                <Button
                  onClick={() => window.location.href = '/post'}
                  className="bg-purple-500 hover:bg-purple-600 text-white"
                >
                  Create Investigation
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {userInvestigations.map((investigation) => (
                  <InvestigationCard 
                    key={investigation.id} 
                    investigation={investigation} 
                    onVote={handleVote}
                    showVoting={false}
                  />
                ))}
                
                {loading && userInvestigations.length > 0 && (
                  <div className="flex items-center justify-center py-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Refreshing...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            <div className="space-y-4">
              {/* Recent Activity Placeholder */}
              <div className="bg-black border border-white/10 rounded-xl p-6 shadow-xl">
                <h3 className="text-white font-medium mb-4">Recent Activity</h3>
                
                {userInvestigations.length > 0 ? (
                  <div className="space-y-4">
                    {userInvestigations.slice(0, 3).map((investigation, index) => (
                      <div key={investigation.id} className="flex items-center space-x-3 p-3 bg-gray-900/30 rounded-lg">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">Created investigation</p>
                          <p className="text-gray-400 text-xs">"{investigation.title}"</p>
                          <p className="text-gray-500 text-xs">
                            {investigation.createdAt.toLocaleDateString()} • 
                            {investigation.investigationType} • 
                            {investigation.severityLevel} severity
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            investigation.status === 'Verified' ? 'bg-emerald-400' :
                            investigation.status === 'Disputed' ? 'bg-red-400' :
                            investigation.status === 'Resolved' ? 'bg-blue-400' :
                            'bg-amber-400'
                          }`} />
                          <span className="text-xs text-gray-400">{investigation.status}</span>
                        </div>
                      </div>
                    ))}
                    
                    {userInvestigations.length > 3 && (
                      <div className="text-center pt-2">
                        <Button
                          onClick={() => setActiveTab("investigations")}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-gray-400 hover:text-white hover:border-white/30"
                        >
                          View all {userInvestigations.length} investigations
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">No activity yet</p>
                    <p className="text-gray-600 text-sm">
                      Your investigation and voting activity will appear here
                    </p>
                  </div>
                )}
              </div>

              {/* Stats Summary */}
              <div className="bg-black border border-white/10 rounded-xl p-6 shadow-xl">
                <h3 className="text-white font-medium mb-4">Profile Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <h4 className="text-gray-400 mb-2">Investigation Stats</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Created:</span>
                        <span className="text-white">{userStats?.totalInvestigations || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Votes Received:</span>
                        <span className="text-white">{userStats?.totalVotes || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Reputation Score:</span>
                        <span className="text-white">{userStats?.reputation || 0}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-gray-400 mb-2">Earnings & Balance</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Earned:</span>
                        <span className="text-emerald-400">{userStats?.totalEarned.toFixed(2) || '0.00'} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Current Balance:</span>
                        <span className="text-emerald-400">{usdcBalance} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Network:</span>
                        <span className="text-white">Arbitrum Sepolia</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Details */}
              <div className="bg-black border border-white/10 rounded-xl p-6 shadow-xl">
                <h3 className="text-white font-medium mb-4">Technical Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Wallet Address:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{formatAddress(account)}</span>
                      <button
                        onClick={() => copyToClipboard(account)}
                        className="text-gray-400 hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => window.open(`https://sepolia.arbiscan.io/address/${account}`, '_blank')}
                        className="text-gray-400 hover:text-white"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  
                  {user?.id && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Privy User ID:</span>
                      <span className="text-white font-mono text-xs">{user.id.slice(0, 20)}...</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Data Sources:</span>
                    <div className="flex items-center gap-2">
                      <Database className="w-3 h-3 text-purple-400" />
                      <Globe className="w-3 h-3 text-blue-400" />
                      <Brain className="w-3 h-3 text-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}