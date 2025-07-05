// app/post/page.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { PrivyPaymentModal } from "@/components/wallet/PrivyPaymentModal"
import { usePrivyWalletIntegration } from "@/hooks/usePrivyWalletIntegration"
import { Plus, X, Upload, File, ImageIcon, FileText, Shield, CreditCard, AlertTriangle } from "lucide-react"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
}

export default function PostPage() {
  const router = useRouter()
  const { connected, account, user, usdcBalance } = usePrivyWalletIntegration()
  
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")
  const [evidence, setEvidence] = useState<string[]>([""])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const addEvidenceField = () => {
    setEvidence([...evidence, ""])
  }

  const updateEvidence = (index: number, value: string) => {
    const newEvidence = [...evidence]
    newEvidence[index] = value
    setEvidence(newEvidence)
  }

  const removeEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index))
  }

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach((file) => {
      const fileUrl = URL.createObjectURL(file)
      const uploadedFile: UploadedFile = {
        id: `file-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
      }
      setUploadedFiles((prev) => [...prev, uploadedFile])
    })
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.url)
      }
      return prev.filter((f) => f.id !== fileId)
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="w-4 h-4" />
    if (type.includes("pdf")) return <FileText className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const validateForm = () => {
    if (!title.trim()) {
      alert('Please enter a title')
      return false
    }
    if (!content.trim()) {
      alert('Please enter content')
      return false
    }
    if (!connected) {
      alert('Please connect with Privy first')
      return false
    }
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    const postData = {
      title,
      content,
      tags,
      evidence: evidence.filter((e) => e.trim()),
      files: uploadedFiles,
      userWallet: account,
      userId: user?.id,
    }

    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = (result: any) => {
    console.log('Payment successful:', result)
    
    // Show success message
    alert(`Investigation submitted successfully! Transaction: ${result.transactionHash}`)
    
    // Redirect to the feed or post detail page
    if (result.postId) {
      router.push(`/investigation/${result.postId}`)
    } else {
      router.push('/')
    }
  }

  const getUserDisplayName = () => {
    if (!user) return 'Anonymous'
    if (user.email) return user.email.address
    if (user.google) return user.google.email
    if (user.twitter) return `@${user.twitter.username}`
    return 'Anonymous User'
  }

  const hasInsufficientBalance = parseFloat(usdcBalance) < 1

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Create Investigation
        </h1>
        <p className="text-gray-400 text-sm mb-6">Submit your findings for community verification</p>

        {/* Authentication Status */}
        {!connected ? (
          <div className="mb-6 p-4 bg-purple-500/10 border border-purple-400/20 rounded-xl">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-purple-300 font-medium">Privy Authentication Required</p>
                <p className="text-purple-400 text-sm">Connect with email, social login, or wallet to submit investigations</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-400/20 rounded-xl">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-emerald-300 font-medium">Authenticated as {getUserDisplayName()}</p>
                <p className="text-emerald-400 text-sm">Ready to submit investigations with secure payment</p>
              </div>
            </div>
          </div>
        )}

        {/* Balance Warning */}
        {connected && hasInsufficientBalance && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-400/20 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-amber-300 font-medium">Insufficient USDC Balance</p>
                <p className="text-amber-400 text-sm">
                  You have {usdcBalance} USDC. You need at least 1 USDC to post an investigation.
                </p>
                <Button
                  onClick={() => window.open('https://faucet.circle.com/', '_blank')}
                  size="sm"
                  className="mt-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-400/20"
                >
                  Get Testnet USDC
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-black border border-white/10 rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-white mb-2">
                Investigation Title
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a clear, descriptive title"
                className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20"
                required
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-white mb-2">
                Investigation Content
              </label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Provide detailed information about your investigation..."
                rows={6}
                className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Tags</label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  placeholder="Add a tag"
                  className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20"
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                />
                <Button
                  type="button"
                  onClick={addTag}
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30 border border-white/20"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} className="bg-gray-900/50 text-white flex items-center gap-1 border border-white/20">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Evidence & Sources</label>
              {evidence.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={item}
                    onChange={(e) => updateEvidence(index, e.target.value)}
                    placeholder="Add evidence link or description"
                    className="bg-gray-900/50 border-white/10 text-white placeholder:text-gray-500 focus:border-white/20"
                  />
                  {evidence.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeEvidence(index)}
                      className="border-white/20 text-gray-400 hover:text-red-400 hover:border-red-500/50 bg-transparent"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEvidenceField}
                className="border-white/20 text-gray-400 hover:text-white hover:border-white/30 bg-transparent hover:bg-white/10"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Evidence
              </Button>
            </div>

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Upload Files</label>

              {/* Drag & Drop Area */}
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
                  isDragging
                    ? "border-blue-400/50 bg-blue-500/10"
                    : "border-white/20 hover:border-white/30 hover:bg-white/5"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400 text-sm mb-2">
                  Drag and drop files here, or{" "}
                  <label className="text-blue-400 hover:text-blue-300 cursor-pointer underline">
                    browse
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => handleFileUpload(e.target.files)}
                      accept="image/*,.pdf,.doc,.docx,.txt"
                    />
                  </label>
                </p>
                <p className="text-gray-500 text-xs">Supports: Images, PDFs, Documents (Max 10MB each)</p>
              </div>

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-white">Uploaded Files ({uploadedFiles.length})</p>
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 bg-gray-900/50 border border-white/10 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-gray-400">{getFileIcon(file.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Preview */}
            <div className="p-4 bg-gray-900/50 rounded-lg border border-white/10">
              <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Posting Fee
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Investigation Posting:</span>
                  <span className="text-white font-medium">1.00 USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network:</span>
                  <span className="text-blue-300">Arbitrum Sepolia</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Payment Method:</span>
                  <span className="text-purple-300">Privy Embedded Wallet</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Your Balance:</span>
                  <span className="text-white">{usdcBalance} USDC</span>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            {connected && (
              <div className="p-3 bg-purple-500/10 border border-purple-400/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-purple-400 mt-0.5" />
                  <div>
                    <p className="text-purple-300 text-sm font-medium">Secure Payment with Privy</p>
                    <p className="text-purple-400 text-xs mt-1">
                      Your embedded wallet is secured with TEE technology and distributed key sharding. 
                      Only you can authorize transactions.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/20 text-gray-400 hover:text-white hover:border-white/30 bg-transparent hover:bg-white/10"
                onClick={() => {
                  // Save as draft functionality
                  localStorage.setItem('investigation_draft', JSON.stringify({
                    title, content, tags, evidence, files: uploadedFiles
                  }))
                  alert('Draft saved locally!')
                }}
              >
                Save Draft
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-400/20"
                disabled={isSubmitting || !connected || hasInsufficientBalance}
              >
                {connected ? (
                  hasInsufficientBalance ? (
                    'Insufficient USDC'
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Pay 1 USDC & Post
                    </>
                  )
                ) : (
                  'Connect Privy First'
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Privy Payment Modal */}
        <PrivyPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          postData={{
            title,
            content,
            tags,
            evidence: evidence.filter((e) => e.trim()),
            files: uploadedFiles,
            userWallet: account,
            userId: user?.id,
          }}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    </div>
  )
}