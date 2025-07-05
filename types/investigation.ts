export interface Investigation {
  id: string
  title: string
  content: string
  author: string
  authorAddress: string
  createdAt: Date
  verificationDeadline: Date
  status: "pending" | "verified" | "false" | "extended"
  votes: {
    correct: number
    false: number
    maybe: number
  }
  userVotes: Record<string, "correct" | "false" | "maybe">
  tags: string[]
  evidence: string[]
  rewardPool: number
}

export interface Reply {
  id: string
  investigationId: string
  content: string
  author: string
  authorAddress: string
  createdAt: Date
  votes: {
    correct: number
    false: number
    maybe: number
  }
  userVotes: Record<string, "correct" | "false" | "maybe">
  type: "evidence" | "analysis" | "question"
}

export interface User {
  address: string
  username: string
  avatar: string
  reputation: number
  totalEarned: number
  investigationsCreated: number
  verificationsCompleted: number
}
