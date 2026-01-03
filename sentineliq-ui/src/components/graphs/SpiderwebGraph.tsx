import React, { useEffect, useRef, useState } from 'react'
import cytoscape from 'cytoscape'
import { Card, Badge } from '@tremor/react'
import { GraphNode, GraphEdge, RiskLevel } from '@/types'

interface SpiderwebGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  onNodeClick?: (nodeId: string) => void
  onExpandNode?: (nodeId: string, nodeType: string) => void
  selectedNodes?: string[]
  onSelectionChange?: (nodeIds: string[]) => void
}

export const SpiderwebGraph: React.FC<SpiderwebGraphProps> = ({
  nodes,
  edges,
  onNodeClick,
  onExpandNode,
  selectedNodes = [],
  onSelectionChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<any>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [multiSelect, setMultiSelect] = useState<string[]>([])

  useEffect(() => {
    if (!containerRef.current) return

    // Create cytoscape instance
    const cy = cytoscape({
      container: containerRef.current,
      headless: false,
      styleEnabled: true,
      wheelSensitivity: 0.1,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': function (ele: any) {
              const riskScore = ele.data('riskScore') || 0
              if (riskScore > 80) return '#ef4444'
              if (riskScore > 60) return '#f97316'
              if (riskScore > 40) return '#eab308'
              return '#22c55e'
            },
            'border-width': function (ele: any) {
              return String(selectedNodes.includes(ele.id()) ? 4 : 2)
            },
            'border-color': function (ele: any) {
              return selectedNodes.includes(ele.id()) ? '#3b82f6' : '#d1d5db'
            },
            width: function (ele: any) {
              return String(ele.data('type') === 'user' ? 40 : 35)
            },
            height: function (ele: any) {
              return String(ele.data('type') === 'user' ? 40 : 35)
            },
            label: 'data(label)',
            'font-size': '10px',
            color: '#ffffff',
            'text-halign': 'center',
            'text-valign': 'center',
            'overlay-padding': '5px',
            'z-index': 10
          }
        },
        {
          selector: 'edge',
          style: {
            'line-color': '#94a3b8',
            'target-arrow-color': '#94a3b8',
            'target-arrow-shape': 'triangle',
            width: function (ele: any) {
              const weight = ele.data('weight') || 1
              return String(Math.min(weight / 2, 5))
            },
            'curve-style': 'bezier',
            label: 'data(connectionCount)',
            'font-size': '8px',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.8,
            'text-background-padding': '2px'
          }
        }
      ],
      elements: [
        ...nodes.map((node) => ({
          data: {
            id: node.id,
            label: node.label,
            type: node.type,
            riskScore: node.riskScore,
            ...node.metadata
          }
        })),
        ...edges.map((edge) => ({
          data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            weight: String(edge.weight),
            connectionCount: String(edge.connectionCount)
          }
        }))
      ],
      layout: {
        name: 'cose',
        padding: 10,
        animate: true,
        animationDuration: 500,
        avoidOverlap: true
      }
    })

    cyRef.current = cy

    // Handle node clicks
    cy.on('tap', 'node', (evt: any) => {
      const nodeId = evt.target.id()
      
      if (evt.originalEvent.ctrlKey || evt.originalEvent.metaKey) {
        // Multi-select
        const newSelection = selectedNodes.includes(nodeId)
          ? selectedNodes.filter((id) => id !== nodeId)
          : [...selectedNodes, nodeId]
        onSelectionChange?.(newSelection)
      } else {
        onNodeClick?.(nodeId)
      }
    })

    // Handle node hover
    cy.on('mouseover', 'node', (evt: any) => {
      setHoveredNode(evt.target.id())
    })

    cy.on('mouseout', 'node', () => {
      setHoveredNode(null)
    })

    // Fit to window
    setTimeout(() => cy.fit(), 100)

    return () => {
      cy.destroy()
    }
  }, [nodes, edges, selectedNodes, onNodeClick, onSelectionChange])

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Spiderweb Analysis - Fraud Ring Detection</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Click nodes to inspect. Ctrl+Click for multi-select. Edge thickness = connection frequency.
        </p>
      </div>

      <div
        ref={containerRef}
        className="w-full h-96 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
      />

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Low Risk (&lt;40)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>Medium Risk (40-60)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>High Risk (60-80)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Critical (&gt;80)</span>
        </div>
      </div>

      {/* Selected Nodes Info */}
      {selectedNodes.length > 0 && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm font-semibold mb-2">
            Selected {selectedNodes.length} nodes for batch action
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
            Investigate All
          </button>
        </div>
      )}
    </Card>
  )
}
