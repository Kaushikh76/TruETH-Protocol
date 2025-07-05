"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { usePrivyWalletIntegration } from "@/hooks/usePrivyWalletIntegration"
import { PrivyPaymentModal } from "@/components/wallet/PrivyPaymentModal"
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  FileText, 
  DollarSign,
  Brain,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Wallet,
  Globe,
  X
} from "lucide-react"

// Updated interface to match backend structure
interface ExtractedEntities {
  investigationType: 'Financial' | 'Social' | 'Technical' | 'Legal' | 'Environmental' | 'Corporate' | 'Political';
  severityLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  geographicScope: 'Local' | 'Regional' | 'National' | 'International';
  involvedEntities: {
    people: string[];
    organizations: string[];
    locations: string[];
    platforms: string[];
    walletAddresses: string[];
    websites: string[];
  };
  timeframe: {
    startDate?: string;
    endDate?: string;
    duration?: string;
  };
  financialImpact?: {
    amount?: string;
    currency?: string;
    affectedUsers?: number;
  };
  content: string;
}

// Entity Preview Modal Component (updated for new structure)
function EntityPreviewModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  entities, 
  isLoading 
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  entities: ExtractedEntities | null
  isLoading: boolean
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white/20 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-black border-b border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">AI Entity Analysis</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mr-3" />
              <span className="text-white">AI is analyzing your investigation...</span>
            </div>
          ) : entities ? (
            <div className="space-y-6">
              {/* Investigation Classification */}
              <div className="p-4 bg-purple-500/10 border border-purple-400/20 rounded-lg">
                <h3 className="text-purple-300 font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Investigation Classification
                </h3>
                <div className="flex gap-2 flex-wrap">
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-base px-3 py-1">
                    {entities.investigationType}
                  </Badge>
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-400/30">
                    {entities.severityLevel} Severity
                  </Badge>
                  <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30">
                    {entities.geographicScope} Scope
                  </Badge>
                </div>
              </div>

              {/* Time & Financial Impact */}
              {(entities.timeframe?.startDate || entities.timeframe?.endDate || entities.timeframe?.duration || entities.financialImpact) && (
                <div className="p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                  <h3 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Timeline & Financial Impact
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {entities.timeframe?.startDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Start:</span>
                        <span className="text-white text-sm">{entities.timeframe.startDate}</span>
                      </div>
                    )}
                    {entities.timeframe?.endDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">End:</span>
                        <span className="text-white text-sm">{entities.timeframe.endDate}</span>
                      </div>
                    )}
                    {entities.timeframe?.duration && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-white text-sm">{entities.timeframe.duration}</span>
                      </div>
                    )}
                    {entities.financialImpact?.amount && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3 text-gray-400" />
                        <span className="text-white text-sm">{entities.financialImpact.amount} {entities.financialImpact.currency || ''}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Involved Entities */}
              {entities.involvedEntities && (
                <div className="space-y-4">
                  {/* Wallet Addresses */}
                  {entities.involvedEntities.walletAddresses && entities.involvedEntities.walletAddresses.length > 0 && (
                    <div className="p-4 bg-orange-500/10 border border-orange-400/20 rounded-lg">
                      <h3 className="text-orange-300 font-semibold mb-3 flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        Wallet Addresses ({entities.involvedEntities.walletAddresses.length})
                      </h3>
                      <div className="space-y-2">
                        {entities.involvedEntities.walletAddresses.map((address, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-black/30 rounded">
                            <span className="text-orange-400 font-mono text-sm">
                              {address.slice(0, 6)}...{address.slice(-4)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Organizations */}
                  {entities.involvedEntities.organizations && entities.involvedEntities.organizations.length > 0 && (
                    <div className="p-4 bg-slate-500/10 border border-slate-400/20 rounded-lg">
                      <h3 className="text-slate-300 font-semibold mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Organizations ({entities.involvedEntities.organizations.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {entities.involvedEntities.organizations.map((org, index) => (
                          <Badge key={index} className="bg-slate-500/20 text-slate-300 border-slate-400/30">
                            {org}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Platforms & Websites */}
                  {((entities.involvedEntities.platforms && entities.involvedEntities.platforms.length > 0) || 
                    (entities.involvedEntities.websites && entities.involvedEntities.websites.length > 0)) && (
                    <div className="p-4 bg-gray-500/10 border border-gray-400/20 rounded-lg">
                      <h3 className="text-gray-300 font-semibold mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Platforms & Links
                      </h3>
                      <div className="space-y-2">
                        {entities.involvedEntities.platforms && entities.involvedEntities.platforms.length > 0 && (
                          <div>
                            <span className="text-gray-400 text-sm">Platforms:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {entities.involvedEntities.platforms.map((platform, index) => (
                                <Badge key={index} className="bg-gray-500/20 text-gray-300 border-gray-400/30">
                                  {platform}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {entities.involvedEntities.websites && entities.involvedEntities.websites.length > 0 && (
                          <div>
                            <span className="text-gray-400 text-sm">URLs found:</span>
                            {entities.involvedEntities.websites.map((url, index) => (
                              <div key={index} className="text-blue-400 text-sm font-mono break-all">
                                {url}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* People & Locations */}
                  {((entities.involvedEntities.people && entities.involvedEntities.people.length > 0) || 
                    (entities.involvedEntities.locations && entities.involvedEntities.locations.length > 0)) && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-lg">
                      <h3 className="text-emerald-300 font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        People & Locations
                      </h3>
                      <div className="space-y-2">
                        {entities.involvedEntities.people && entities.involvedEntities.people.length > 0 && (
                          <div>
                            <span className="text-gray-400 text-sm">People:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {entities.involvedEntities.people.map((person, index) => (
                                <Badge key={index} className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                                  {person}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {entities.involvedEntities.locations && entities.involvedEntities.locations.length > 0 && (
                          <div>
                            <span className="text-gray-400 text-sm">Locations:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {entities.involvedEntities.locations.map((location, index) => (
                                <Badge key={index} className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                                  {location}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Summary */}
              <div className="p-4 bg-gray-900/50 border border-white/10 rounded-lg">
                <h3 className="text-white font-semibold mb-2">AI Analysis Summary</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Classified as {entities.investigationType} investigation with {entities.severityLevel.toLowerCase()} severity and {entities.geographicScope.toLowerCase()} scope.
                  {entities.involvedEntities.walletAddresses && entities.involvedEntities.walletAddresses.length > 0 && 
                    ` Found ${entities.involvedEntities.walletAddresses.length} wallet address${entities.involvedEntities.walletAddresses.length !== 1 ? 'es' : ''}.`}
                  {entities.involvedEntities.organizations && entities.involvedEntities.organizations.length > 0 &&
                    ` Involves ${entities.involvedEntities.organizations.length} organization${entities.involvedEntities.organizations.length !== 1 ? 's' : ''}.`}
                  {entities.financialImpact?.amount && ` Financial impact: ${entities.financialImpact.amount} ${entities.financialImpact.currency || ''}.`}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={onConfirm}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Continue with AI Analysis
                </Button>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 border-white/20 text-gray-300 hover:text-white hover:border-white/30"
                >
                  Edit Investigation
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No entities extracted. Please try again.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PostPage() {
  const router = useRouter()
  
  // Privy wallet integration
  const {
    ready,
    connected,
    account,
    user,
    usdcBalance,
    connectWallet
  } = usePrivyWalletIntegration()

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
    evidence: "",
  })

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [currentPostData, setCurrentPostData] = useState<any>(null)

  // AI entity extraction state
  const [showEntityPreview, setShowEntityPreview] = useState(false)
  const [extractedEntities, setExtractedEntities] = useState<ExtractedEntities | null>(null)
  const [isExtractingEntities, setIsExtractingEntities] = useState(false)

  // Evidence items state
  const [evidenceItems, setEvidenceItems] = useState<string[]>([])

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Evidence management
  const addEvidenceItem = () => {
    setEvidenceItems([...evidenceItems, ""])
  }

  const updateEvidenceItem = (index: number, value: string) => {
    const updated = [...evidenceItems]
    updated[index] = value
    setEvidenceItems(updated)
  }

  const removeEvidenceItem = (index: number) => {
    setEvidenceItems(evidenceItems.filter((_, i) => i !== index))
  }

  // AI entity extraction
 const extractEntities = async (content: string) => {
  if (!content.trim()) {
    alert('Please provide content to analyze')
    return
  }

  setIsExtractingEntities(true)
  setShowEntityPreview(true)
  
  try {
    // Use the Walrus server URL (port 3000) instead of Next.js API
    const serverUrl = process.env.NEXT_PUBLIC_WALRUS_SERVER_URL || 'http://localhost:3000'
    
    const response = await fetch(`${serverUrl}/api/ai/extract-entities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      throw new Error('Failed to extract entities')
    }

    const result = await response.json()
    if (result.success) {
      setExtractedEntities(result.data.entities)
    } else {
      throw new Error(result.error || 'Failed to extract entities')
    }
  } catch (error) {
    console.error('Entity extraction failed:', error)
    setShowEntityPreview(false)
    alert('Failed to analyze investigation content. Please try again.')
  } finally {
    setIsExtractingEntities(false)
  }
}

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in the title and content')
      return
    }

    if (!connected) {
      alert('Please connect your wallet to post an investigation')
      return
    }

    // First, extract entities using AI
    await extractEntities(formData.content)
  }

  // Handle confirmed submission after AI analysis
  const handleConfirmedSubmit = async () => {
  setShowEntityPreview(false)
  setIsSubmitting(true)

  try {
    // Combine evidence from textarea and individual items
    const allEvidence = [
      ...formData.evidence.split('\n').filter(line => line.trim()),
      ...evidenceItems.filter(item => item.trim())
    ]

    // Create proper data structure
    const postData = {
      title: formData.title,
      content: formData.content,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      evidence: allEvidence,
      files: [],
      userWallet: account,
      userId: user?.id || 'anonymous',
      author: {
        wallet: account,
        userId: user?.id || 'anonymous'
      },
      bridgeTx: {
        hash: '',
        amount: 1,
        from: account,
        suiRecipient: '0x7b005829a1305a3ebeea7cff0dd200bbe7e2f42d1adce0d9045dd57ef12f52c9',
        wormholeSequence: '',
        timestamp: Date.now(),
      },
    }

    // This will trigger the PrivyPaymentModal
    setCurrentPostData(postData)
    setPaymentModalOpen(true)
  } catch (error) {
    console.error('Submission failed:', error)
    alert('Failed to submit investigation. Please try again.')
  } finally {
    setIsSubmitting(false)
  }
}

  // Handle successful payment
  const handlePaymentSuccess = (result: any) => {
    console.log('Investigation posted successfully:', result)
    setPaymentModalOpen(false)
    
    // Reset form
    setFormData({
      title: "",
      content: "",
      tags: "",
      evidence: "",
    })
    setEvidenceItems([])
    setExtractedEntities(null)
    
    // Redirect to home or show success message
    router.push('/')
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          <span className="text-white">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-white/10 rounded-full p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Create Investigation</h1>
            <p className="text-gray-400 text-sm">Powered by AI analysis and stored on Walrus</p>
          </div>
        </div>

        {/* Connection Status */}
        {!connected && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-400/20 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <h3 className="text-amber-300 font-medium">Connect Your Wallet</h3>
                <p className="text-amber-400 text-sm">You need to connect your wallet to post investigations</p>
              </div>
              <Button 
                onClick={connectWallet}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                Connect Wallet
              </Button>
            </div>
          </div>
        )}

        {/* Investigation Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-white font-medium text-sm">Investigation Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Brief, descriptive title for your investigation..."
              className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20"
              required
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="text-white font-medium text-sm">Investigation Details *</label>
            <Textarea
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Describe your investigation in detail. Include dates, addresses, amounts, platforms, and any relevant information..."
              className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 min-h-[120px] resize-none"
              required
            />
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Brain className="w-3 h-3" />
              <span>AI will automatically extract entities like dates, addresses, and event types</span>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-white font-medium text-sm">Tags</label>
            <Input
              value={formData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="defi, scam, hack, fraud (comma-separated)"
              className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20"
            />
          </div>

          {/* Evidence */}
          <div className="space-y-3">
            <label className="text-white font-medium text-sm">Evidence & Sources</label>
            
            {/* Bulk evidence textarea */}
            <Textarea
              value={formData.evidence}
              onChange={(e) => handleInputChange('evidence', e.target.value)}
              placeholder="List evidence, sources, or links (one per line)..."
              className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20 min-h-[80px]"
            />

            {/* Individual evidence items */}
            {evidenceItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateEvidenceItem(index, e.target.value)}
                  placeholder="Additional evidence or source..."
                  className="flex-1 bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEvidenceItem(index)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEvidenceItem}
              className="border-white/20 text-gray-300 hover:text-white hover:border-white/30"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Evidence Item
            </Button>
          </div>

          {/* Reward Pool Info */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-lg">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <div className="flex-1">
                <h3 className="text-emerald-300 font-medium">Investigation Reward</h3>
                <p className="text-emerald-400 text-sm">
                  1.00 USDC will be bridged to Sui as reward pool for verification
                </p>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                1.00 USDC
              </Badge>
            </div>
          </div>

          {/* Balance Check */}
          {connected && (
            <div className="p-3 bg-gray-900/30 rounded-lg border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Your USDC Balance:</span>
                <span className="text-white text-sm font-medium">{usdcBalance} USDC</span>
              </div>
              {parseFloat(usdcBalance) < 1 && (
                <div className="mt-2 flex items-center gap-2 text-amber-400 text-xs">
                  <AlertTriangle className="w-3 h-3" />
                  <span>You need at least 1 USDC to post an investigation</span>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={!connected || isSubmitting || parseFloat(usdcBalance) < 1}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white disabled:bg-gray-600 disabled:text-gray-400 py-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : !connected ? (
                'Connect Wallet to Continue'
              ) : parseFloat(usdcBalance) < 1 ? (
                'Insufficient USDC Balance'
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Analyze with AI & Post Investigation
                </>
              )}
            </Button>
          </div>

          {/* Process Info */}
          <div className="p-4 bg-gray-900/30 rounded-lg border border-white/10">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              How it works
            </h3>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-medium">1</div>
                <span>AI analyzes your investigation to extract key entities (addresses, dates, events)</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center text-xs font-medium">2</div>
                <span>1 USDC is bridged to Sui via Wormhole as investigation reward pool</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-medium">3</div>
                <span>Full investigation stored permanently on Walrus decentralized storage</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-300 flex items-center justify-center text-xs font-medium">4</div>
                <span>Metadata added to knowledge graph for discovery and connections</span>
              </div>
            </div>
          </div>
        </form>

        {/* AI Entity Preview Modal */}
        <EntityPreviewModal
          isOpen={showEntityPreview}
          onClose={() => setShowEntityPreview(false)}
          onConfirm={handleConfirmedSubmit}
          entities={extractedEntities}
          isLoading={isExtractingEntities}
        />

        {/* Payment Modal */}
        {paymentModalOpen && currentPostData && (
          <PrivyPaymentModal
            isOpen={paymentModalOpen}
            onClose={() => setPaymentModalOpen(false)}
            postData={currentPostData}
            onSuccess={handlePaymentSuccess}
          />
        )}
      </div>
    </div>
  )
}