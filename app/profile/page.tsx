"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { mockUser, mockInvestigations } from "../../lib/mock-data"
import { InvestigationCard } from "../../components/investigation-card"
import { User, DollarSign, FileText, CheckCircle, Trophy, Settings } from "lucide-react"

export default function ProfilePage() {
  const [user] = useState(mockUser)
  const [userInvestigations] = useState(mockInvestigations.slice(0, 2))

  const stats = [
    { label: "Earned", value: `$${user.totalEarned}`, icon: DollarSign },
    { label: "Created", value: user.investigationsCreated, icon: FileText },
    { label: "Verified", value: user.verificationsCompleted, icon: CheckCircle },
    { label: "Reputation", value: user.reputation, icon: Trophy },
  ]

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-black border border-white/10 rounded-xl p-6 mb-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center ring-4 ring-white/20">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{user.username}</h1>
                <p className="text-gray-400 text-sm font-mono">{user.address}</p>
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

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center">
                  <div className="bg-gray-900/50 border border-white/10 rounded-xl p-3 mb-2">
                    <Icon className="w-5 h-5 text-white mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{stat.value}</p>
                  </div>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="investigations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-900/50 border border-white/10">
            <TabsTrigger
              value="investigations"
              className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-gray-400 text-sm"
            >
              Investigations
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-white/15 data-[state=active]:text-white text-gray-400 text-sm"
            >
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="investigations">
            <div className="space-y-4">
              {userInvestigations.map((investigation) => (
                <InvestigationCard key={investigation.id} investigation={investigation} showVoting={false} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="space-y-4">
              <div className="bg-black border border-white/10 rounded-xl p-4 shadow-xl">
                <div className="flex items-center space-x-3 mb-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-white text-sm">Verified investigation</p>
                    <p className="text-gray-400 text-xs">2 hours ago • +2.5 USDC</p>
                  </div>
                </div>
              </div>
              <div className="bg-black border border-white/10 rounded-xl p-4 shadow-xl">
                <div className="flex items-center space-x-3 mb-2">
                  <FileText className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white text-sm">Created investigation</p>
                    <p className="text-gray-400 text-xs">1 day ago • Pending</p>
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
