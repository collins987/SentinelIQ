import React, { useEffect, useState } from 'react'
import { DashboardLayout } from '../../../layouts'
import { SpiderwebGraph } from '../../../components/graphs/SpiderwebGraph'
import { useIncidentStore } from '../../../stores/incidentStore'
import { mockGraphNodes, mockGraphEdges, mockTransactions } from '../../../mockData'
import { Card } from '@tremor/react'

export const AnalystGraphPage: React.FC = () => {
  const { selectedIncident } = useIncidentStore()
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [graphData, setGraphData] = useState({
    nodes: mockGraphNodes,
    edges: mockGraphEdges
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Link Analysis - Spiderweb</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Visualize fraud rings and connected entities
          </p>
        </div>

        {/* Main Graph */}
        <SpiderwebGraph
          nodes={graphData.nodes}
          edges={graphData.edges}
          selectedNodes={selectedNodes}
          onSelectionChange={setSelectedNodes}
          onNodeClick={(nodeId) => {
            console.log('Node clicked:', nodeId)
          }}
        />

        {/* Selected Node Details */}
        {selectedNodes.length > 0 && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">
              Investigation Summary ({selectedNodes.length} selected)
            </h3>
            
            <div className="space-y-4">
              {selectedNodes.map((nodeId) => {
                const node = graphData.nodes.find((n) => n.id === nodeId)
                if (!node) return null

                return (
                  <div key={nodeId} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{node.label}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Type: {node.type.toUpperCase()}
                        </p>
                      </div>
                      {node.riskScore && (
                        <span className="text-lg font-bold text-red-600">
                          {node.riskScore}% Risk
                        </span>
                      )}
                    </div>

                    {node.metadata && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {Object.entries(node.metadata).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key}:</span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                Flag All Nodes
              </button>
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                Export Network
              </button>
            </div>
          </Card>
        )}

        {/* Legend & Instructions */}
        <Card>
          <h4 className="font-semibold mb-3">How to Use</h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li>• <strong>Click</strong> a node to select it and view details</li>
            <li>• <strong>Ctrl/Cmd + Click</strong> for multi-select</li>
            <li>• <strong>Drag</strong> nodes to reorganize the graph</li>
            <li>• <strong>Scroll</strong> to zoom in/out</li>
            <li>• Node size indicates entity type (Users: circles, IPs: squares, Devices: triangles)</li>
            <li>• Color indicates risk level: Green (low) → Red (critical)</li>
            <li>• Edge thickness shows connection frequency</li>
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  )
}
