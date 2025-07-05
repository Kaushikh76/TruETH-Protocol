"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Upload, File, ImageIcon, FileText } from "lucide-react"

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
}

export default function PostPage() {
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")
  const [evidence, setEvidence] = useState<string[]>([""])
  const [rewardPool, setRewardPool] = useState(50)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log({
      title,
      content,
      tags,
      evidence: evidence.filter((e) => e.trim()),
      rewardPool,
      files: uploadedFiles,
    })
    alert("Investigation submitted for verification!")
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-white mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Create Investigation
        </h1>
        <p className="text-gray-400 text-sm mb-6">Submit your findings for community verification</p>

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

            <div>
              <label htmlFor="reward" className="block text-sm font-medium text-white mb-2">
                Reward Pool (USDC)
              </label>
              <Input
                id="reward"
                type="number"
                value={rewardPool}
                onChange={(e) => setRewardPool(Number(e.target.value))}
                min="10"
                max="1000"
                step="10"
                className="bg-gray-900/50 border-white/10 text-white focus:border-white/20"
              />
              <p className="text-sm text-gray-500 mt-1">This amount will be distributed among verifiers.</p>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/20 text-gray-400 hover:text-white hover:border-white/30 bg-transparent hover:bg-white/10"
              >
                Save Draft
              </Button>
              <Button type="submit" className="flex-1 bg-white/20 text-white hover:bg-white/30 border border-white/20">
                Submit Investigation
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
