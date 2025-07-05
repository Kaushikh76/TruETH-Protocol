// types/enhanced-investigation.ts
export type InvestigationType = 
  | 'Financial' 
  | 'Social' 
  | 'Technical' 
  | 'Legal' 
  | 'Environmental' 
  | 'Corporate' 
  | 'Political'

export type SeverityLevel = 'Low' | 'Medium' | 'High' | 'Critical'

export type GeographicScope = 'Local' | 'Regional' | 'National' | 'International'

export type InvestigationStatus = 'Pending' | 'Verified' | 'Disputed' | 'Resolved'

export type VoteType = 'Correct' | 'Incorrect' | 'NeedsMoreEvidence'

export interface EnhancedInvestigation {
  id: string
  title: string
  content: string
  author: string
  authorAddress: string
  createdAt: Date
  verificationDeadline?: Date
  
  // Enhanced fields
  investigationType: InvestigationType
  severityLevel: SeverityLevel
  geographicScope: GeographicScope
  status: InvestigationStatus
  
  // AI Extracted entities
  involvedEntities: {
    people: string[]
    organizations: string[]
    locations: string[]
    platforms: string[]
    walletAddresses: string[]
    websites: string[]
  }
  
  timeframe: {
    startDate?: string
    endDate?: string
    duration?: string
  }
  
  financialImpact?: {
    amount?: string
    currency?: string
    affectedUsers?: number
  }
  
  votes: {
    correct: number
    incorrect: number
    needsMoreEvidence: number
  }
  
  userVotes: Record<string, VoteType>
  tags: string[]
  evidence: string[]
  rewardPool: number
  
  // GRC-20 fields
  grc20EntityId?: string
  grc20SpaceId?: string
  blobId?: string
}

export interface VoteData {
  investigationId: string
  voter: string
  voteType: VoteType
  reasoning?: string
  timestamp: string
}

// Constants for the enhanced system
export const INVESTIGATION_TYPES: Record<InvestigationType, {
  label: string
  description: string
  icon: string
  color: string
  examples: string[]
}> = {
  Financial: {
    label: 'Financial',
    description: 'Money-related crimes and fraud',
    icon: '💰',
    color: 'emerald',
    examples: ['Investment scams', 'Money laundering', 'Market manipulation', 'Ponzi schemes']
  },
  Social: {
    label: 'Social Media',
    description: 'Online misinformation and social engineering',
    icon: '📱',
    color: 'blue',
    examples: ['Fake accounts', 'Misinformation campaigns', 'Social engineering', 'Privacy violations']
  },
  Technical: {
    label: 'Technical',
    description: 'Cybersecurity and technology-related issues',
    icon: '🔒',
    color: 'purple',
    examples: ['Data breaches', 'Software vulnerabilities', 'Cyber attacks', 'System exploits']
  },
  Legal: {
    label: 'Legal',
    description: 'Regulatory violations and compliance issues',
    icon: '⚖️',
    color: 'amber',
    examples: ['Regulatory violations', 'IP theft', 'Compliance issues', 'Contract violations']
  },
  Environmental: {
    label: 'Environmental',
    description: 'Environmental crimes and sustainability fraud',
    icon: '🌱',
    color: 'green',
    examples: ['Illegal dumping', 'Pollution', 'Greenwashing', 'Climate fraud']
  },
  Corporate: {
    label: 'Corporate',
    description: 'Corporate misconduct and business fraud',
    icon: '🏢',
    color: 'slate',
    examples: ['Insider trading', 'Accounting fraud', 'Labor violations', 'Antitrust violations']
  },
  Political: {
    label: 'Political',
    description: 'Political corruption and election interference',
    icon: '🗳️',
    color: 'red',
    examples: ['Election interference', 'Corruption', 'Lobbying violations', 'Censorship']
  }
}

export const SEVERITY_LEVELS: Record<SeverityLevel, {
  label: string
  description: string
  color: string
  urgency: number
}> = {
  Low: {
    label: 'Low',
    description: 'Minor impact, limited scope',
    color: 'gray',
    urgency: 1
  },
  Medium: {
    label: 'Medium', 
    description: 'Moderate impact, regional scope',
    color: 'yellow',
    urgency: 2
  },
  High: {
    label: 'High',
    description: 'Significant impact, wide scope',
    color: 'orange',
    urgency: 3
  },
  Critical: {
    label: 'Critical',
    description: 'Severe impact, immediate action required',
    color: 'red',
    urgency: 4
  }
}

export const GEOGRAPHIC_SCOPES: Record<GeographicScope, {
  label: string
  description: string
  icon: string
}> = {
  Local: {
    label: 'Local',
    description: 'City or community level',
    icon: '🏘️'
  },
  Regional: {
    label: 'Regional',
    description: 'State or province level',
    icon: '🗺️'
  },
  National: {
    label: 'National',
    description: 'Country-wide impact',
    icon: '🌎'
  },
  International: {
    label: 'International',
    description: 'Multiple countries affected',
    icon: '🌍'
  }
}

export const VOTE_TYPES: Record<VoteType, {
  label: string
  description: string
  color: string
  icon: string
}> = {
  Correct: {
    label: 'Correct',
    description: 'Evidence strongly supports the investigation',
    color: 'emerald',
    icon: '✅'
  },
  Incorrect: {
    label: 'Incorrect',
    description: 'Evidence contradicts the investigation',
    color: 'red',
    icon: '❌'
  },
  NeedsMoreEvidence: {
    label: 'Needs More Evidence',
    description: 'Insufficient evidence to make a determination',
    color: 'amber',
    icon: '❓'
  }
}

// Helper functions
export function getInvestigationTypeColor(type: InvestigationType): string {
  return INVESTIGATION_TYPES[type]?.color || 'gray'
}

export function getSeverityColor(severity: SeverityLevel): string {
  return SEVERITY_LEVELS[severity]?.color || 'gray'
}

export function getVoteColor(voteType: VoteType): string {
  return VOTE_TYPES[voteType]?.color || 'gray'
}

export function formatInvestigationType(type: InvestigationType): string {
  return INVESTIGATION_TYPES[type]?.label || type
}

export function getInvestigationIcon(type: InvestigationType): string {
  return INVESTIGATION_TYPES[type]?.icon || '📋'
}

export function getSeverityUrgency(severity: SeverityLevel): number {
  return SEVERITY_LEVELS[severity]?.urgency || 1
}

export function isHighPriority(investigation: EnhancedInvestigation): boolean {
  return getSeverityUrgency(investigation.severityLevel) >= 3
}

export function getTimeframeDuration(timeframe: EnhancedInvestigation['timeframe']): string {
  if (timeframe.duration) return timeframe.duration
  if (timeframe.startDate && timeframe.endDate) {
    const start = new Date(timeframe.startDate)
    const end = new Date(timeframe.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 30) return `${diffDays} days`
    if (diffDays < 365) return `${Math.round(diffDays / 30)} months`
    return `${Math.round(diffDays / 365)} years`
  }
  return 'Unknown duration'
}

export function getTotalVotes(investigation: EnhancedInvestigation): number {
  return investigation.votes.correct + investigation.votes.incorrect + investigation.votes.needsMoreEvidence
}

export function getVotePercentage(investigation: EnhancedInvestigation, voteType: keyof EnhancedInvestigation['votes']): number {
  const total = getTotalVotes(investigation)
  if (total === 0) return 0
  return Math.round((investigation.votes[voteType] / total) * 100)
}

export function getConsensusLevel(investigation: EnhancedInvestigation): {
  type: 'strong' | 'moderate' | 'weak' | 'none'
  percentage: number
  leadingVote: VoteType
} {
  const total = getTotalVotes(investigation)
  if (total < 3) return { type: 'none', percentage: 0, leadingVote: 'NeedsMoreEvidence' }
  
  const correctPct = getVotePercentage(investigation, 'correct')
  const incorrectPct = getVotePercentage(investigation, 'incorrect')
  const needsMorePct = getVotePercentage(investigation, 'needsMoreEvidence')
  
  const max = Math.max(correctPct, incorrectPct, needsMorePct)
  let leadingVote: VoteType = 'NeedsMoreEvidence'
  
  if (correctPct === max) leadingVote = 'Correct'
  else if (incorrectPct === max) leadingVote = 'Incorrect'
  
  if (max >= 80) return { type: 'strong', percentage: max, leadingVote }
  if (max >= 60) return { type: 'moderate', percentage: max, leadingVote }
  if (max >= 40) return { type: 'weak', percentage: max, leadingVote }
  return { type: 'none', percentage: max, leadingVote }
}