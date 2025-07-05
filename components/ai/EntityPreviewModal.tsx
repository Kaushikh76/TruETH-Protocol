// components/ai/EntityPreviewModal.tsx
"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Brain, 
  Calendar, 
  MapPin, 
  Wallet, 
  AlertTriangle, 
  Globe, 
  DollarSign,
  Clock,
  X,
  CheckCircle,
  Loader2
} from 'lucide-react'

export interface ExtractedEntities {
  day?: string;
  date?: string;
  time?: string;
  location?: string;
  walletAddresses: string[];
  suspectAddresses: string[];
  eventType: string;
  amount?: string;
  currency?: string;
  platform?: string;
  urls?: string[];
  content: string;
}

interface EntityPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  entities: ExtractedEntities | null
  isLoading: boolean
}

export function EntityPreviewModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  entities, 
  isLoading 
}: EntityPreviewModalProps) {
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
              {/* Event Classification */}
              <div className="p-4 bg-purple-500/10 border border-purple-400/20 rounded-lg">
                <h3 className="text-purple-300 font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Event Classification
                </h3>
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-base px-3 py-1">
                  {entities.eventType}
                </Badge>
              </div>

              {/* Time & Location */}
              {(entities.date || entities.day || entities.time || entities.location) && (
                <div className="p-4 bg-blue-500/10 border border-blue-400/20 rounded-lg">
                  <h3 className="text-blue-300 font-semibold mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Time & Location
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {entities.day && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Day:</span>
                        <span className="text-white text-sm">{entities.day}</span>
                      </div>
                    )}
                    {entities.date && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Date:</span>
                        <span className="text-white text-sm">{entities.date}</span>
                      </div>
                    )}
                    {entities.time && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-white text-sm">{entities.time}</span>
                      </div>
                    )}
                    {entities.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-white text-sm">{entities.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Details */}
              {(entities.amount || entities.currency) && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-lg">
                  <h3 className="text-emerald-300 font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Financial Details
                  </h3>
                  <div className="flex items-center gap-4">
                    {entities.amount && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Amount:</span>
                        <span className="text-white text-sm font-medium">{entities.amount}</span>
                      </div>
                    )}
                    {entities.currency && (
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30">
                        {entities.currency}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Wallet Addresses */}
              {entities.walletAddresses.length > 0 && (
                <div className="p-4 bg-orange-500/10 border border-orange-400/20 rounded-lg">
                  <h3 className="text-orange-300 font-semibold mb-3 flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Wallet Addresses ({entities.walletAddresses.length})
                  </h3>
                  <div className="space-y-2">
                    {entities.walletAddresses.map((address, index) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-black/30 rounded">
                        <span className="text-orange-400 font-mono text-sm">
                          {address.slice(0, 6)}...{address.slice(-4)}
                        </span>
                        {entities.suspectAddresses.includes(address) && (
                          <Badge className="bg-red-500/20 text-red-300 border-red-400/30 text-xs">
                            Suspect
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform & URLs */}
              {(entities.platform || (entities.urls && entities.urls.length > 0)) && (
                <div className="p-4 bg-gray-500/10 border border-gray-400/20 rounded-lg">
                  <h3 className="text-gray-300 font-semibold mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Platform & Links
                  </h3>
                  <div className="space-y-2">
                    {entities.platform && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">Platform:</span>
                        <Badge className="bg-gray-500/20 text-gray-300 border-gray-400/30">
                          {entities.platform}
                        </Badge>
                      </div>
                    )}
                    {entities.urls && entities.urls.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-gray-400 text-sm">URLs found:</span>
                        {entities.urls.map((url, index) => (
                          <div key={index} className="text-blue-400 text-sm font-mono break-all">
                            {url}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              <div className="p-4 bg-gray-900/50 border border-white/10 rounded-lg">
                <h3 className="text-white font-semibold mb-2">AI Analysis Summary</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Found {entities.walletAddresses.length} wallet address{entities.walletAddresses.length !== 1 ? 'es' : ''}, 
                  {entities.suspectAddresses.length > 0 && ` ${entities.suspectAddresses.length} marked as suspect${entities.suspectAddresses.length !== 1 ? 's' : ''}, `}
                  categorized as "{entities.eventType}".
                  {entities.date && ` Occurred on ${entities.date}.`}
                  {entities.platform && ` Platform: ${entities.platform}.`}
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