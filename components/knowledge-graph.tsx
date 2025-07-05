"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Search, Zap, Users, FileText } from "lucide-react"

interface Node {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  type: "investigation" | "user" | "tag"
  label: string
  connections: string[]
  color: string
}

interface Edge {
  from: string
  to: string
}

export function KnowledgeGraph() {
  /* ---------- 1. simulation data lives in refs ---------- */
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const edgesRef = useRef<Edge[]>([])
  const animationRef = useRef<number>()

  /* ---------- 2. state only for UI things ---------- */
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  /* ---------- 3. initialise once ---------- */
  useEffect(() => {
    nodesRef.current = [
      {
        id: "inv1",
        x: 150,
        y: 100,
        vx: 0,
        vy: 0,
        type: "investigation",
        label: "DeFi Exploit",
        connections: ["user1", "tag1"],
        color: "#3B82F6",
      },
      {
        id: "inv2",
        x: 250,
        y: 200,
        vx: 0,
        vy: 0,
        type: "investigation",
        label: "Bot Network",
        connections: ["user2", "tag2"],
        color: "#8B5CF6",
      },
      {
        id: "inv3",
        x: 100,
        y: 250,
        vx: 0,
        vy: 0,
        type: "investigation",
        label: "Smart Contract",
        connections: ["user1", "tag1"],
        color: "#10B981",
      },
      {
        id: "user1",
        x: 50,
        y: 150,
        vx: 0,
        vy: 0,
        type: "user",
        label: "Detective",
        connections: ["inv1", "inv3"],
        color: "#F59E0B",
      },
      {
        id: "user2",
        x: 300,
        y: 120,
        vx: 0,
        vy: 0,
        type: "user",
        label: "Analyst",
        connections: ["inv2"],
        color: "#F59E0B",
      },
      {
        id: "tag1",
        x: 200,
        y: 50,
        vx: 0,
        vy: 0,
        type: "tag",
        label: "Security",
        connections: ["inv1", "inv3"],
        color: "#EF4444",
      },
      {
        id: "tag2",
        x: 350,
        y: 180,
        vx: 0,
        vy: 0,
        type: "tag",
        label: "Social",
        connections: ["inv2"],
        color: "#EF4444",
      },
    ]

    edgesRef.current = [
      { from: "inv1", to: "user1" },
      { from: "inv1", to: "tag1" },
      { from: "inv2", to: "user2" },
      { from: "inv2", to: "tag2" },
      { from: "inv3", to: "user1" },
      { from: "inv3", to: "tag1" },
    ]

    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!

    /* resize helper */
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width * devicePixelRatio
      canvas.height = height * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    window.addEventListener("resize", resize)

    /* ------------ animation loop (no setState) ------------ */
    const animate = () => {
      const nodes = nodesRef.current
      const edges = edgesRef.current

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      /* draw edges */
      ctx.strokeStyle = "rgba(255,255,255,0.08)"
      ctx.lineWidth = 1
      edges.forEach(({ from, to }) => {
        const a = nodes.find((n) => n.id === from)
        const b = nodes.find((n) => n.id === to)
        if (a && b) {
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      })

      /* draw + update nodes */
      nodes.forEach((node) => {
        const isHovered = hoveredNode === node.id
        const r = isHovered ? 12 : 8

        /* glow */
        if (isHovered) {
          ctx.beginPath()
          ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2)
          ctx.fillStyle = `${node.color}33`
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.fillStyle = node.color
        ctx.fill()
        ctx.strokeStyle = "rgba(255,255,255,0.3)"
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = "white"
        ctx.font = "12px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        const icon = node.type === "investigation" ? "●" : node.type === "user" ? "◆" : "▲"
        ctx.fillText(icon, node.x, node.y)

        /* physics update */
        let fx = 0,
          fy = 0
        nodes.forEach((other) => {
          if (other.id !== node.id) {
            const dx = node.x - other.x
            const dy = node.y - other.y
            const dist = Math.hypot(dx, dy) || 1
            const repulse = 500 / (dist * dist)
            fx += (dx / dist) * repulse
            fy += (dy / dist) * repulse
          }
        })
        node.connections.forEach((id) => {
          const target = nodes.find((n) => n.id === id)
          if (target) {
            const dx = target.x - node.x
            const dy = target.y - node.y
            const dist = Math.hypot(dx, dy) || 1
            const spring = (dist - 80) * 0.01
            fx += (dx / dist) * spring
            fy += (dy / dist) * spring
          }
        })
        const centerX = canvas.clientWidth / 2
        const centerY = canvas.clientHeight / 2
        fx += (centerX - node.x) * 0.001
        fy += (centerY - node.y) * 0.001

        node.vx = (node.vx + fx) * 0.9
        node.vy = (node.vy + fy) * 0.9
        node.x = Math.max(20, Math.min(canvas.clientWidth - 20, node.x + node.vx))
        node.y = Math.max(20, Math.min(canvas.clientHeight - 20, node.y + node.vy))
      })

      animationRef.current = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      window.removeEventListener("resize", resize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, []) // ← empty dependency array (runs only once)

  /* ---------- 4. mouse hover handling (cheap) ---------- */
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const found = nodesRef.current.find((n) => Math.hypot(n.x - x, n.y - y) < 15)
    setHoveredNode(found?.id ?? null)
  }

  return (
    <div className="bg-black border border-white/10 rounded-xl p-4 h-full flex flex-col shadow-xl">
      {/* header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold text-sm">Knowledge Graph</h3>
        </div>
        <Button
          size="sm"
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full px-4 py-1 text-xs backdrop-blur-sm"
        >
          <Search className="w-3 h-3 mr-1" />
          Search
        </Button>
      </div>

      {/* canvas */}
      <div className="flex-1 relative bg-gray-900/30 rounded-lg border border-white/5 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
        />

        {/* legend */}
        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-xs">
          <div className="flex flex-col gap-1 text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              Investigations
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              Users
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Tags
            </div>
          </div>
        </div>

        {/* stats */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-xs text-gray-300">
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />3 Investigations
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />2 Users
          </div>
        </div>
      </div>
    </div>
  )
}
