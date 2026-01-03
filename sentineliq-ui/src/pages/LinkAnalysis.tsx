// ============================================================================
// Link Analysis Page - Fraud Ring Detection & Network Visualization
// ============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface GraphNode {
  id: string;
  label: string;
  type: 'user' | 'device' | 'ip' | 'email_domain';
  risk_score: number;
  is_flagged: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

// Mock graph data
const mockGraphData = {
  nodes: [
    { id: 'user-1', label: 'john.doe@acme.com', type: 'user' as const, risk_score: 85, is_flagged: true },
    { id: 'user-2', label: 'jane.smith@acme.com', type: 'user' as const, risk_score: 72, is_flagged: false },
    { id: 'user-3', label: 'bob.wilson@corp.io', type: 'user' as const, risk_score: 45, is_flagged: false },
    { id: 'user-4', label: 'alice.brown@corp.io', type: 'user' as const, risk_score: 91, is_flagged: true },
    { id: 'user-5', label: 'charlie@tech.co', type: 'user' as const, risk_score: 38, is_flagged: false },
    { id: 'ip-1', label: '185.220.101.42', type: 'ip' as const, risk_score: 95, is_flagged: true },
    { id: 'ip-2', label: '72.229.28.185', type: 'ip' as const, risk_score: 20, is_flagged: false },
    { id: 'device-1', label: 'iPhone 15 Pro', type: 'device' as const, risk_score: 30, is_flagged: false },
    { id: 'device-2', label: 'Samsung Galaxy S24', type: 'device' as const, risk_score: 55, is_flagged: false },
    { id: 'domain-1', label: '@acme.com', type: 'email_domain' as const, risk_score: 25, is_flagged: false },
    { id: 'domain-2', label: '@corp.io', type: 'email_domain' as const, risk_score: 60, is_flagged: false },
  ],
  edges: [
    { source: 'user-1', target: 'ip-1', type: 'shared_ip', weight: 0.9 },
    { source: 'user-2', target: 'ip-1', type: 'shared_ip', weight: 0.8 },
    { source: 'user-4', target: 'ip-1', type: 'shared_ip', weight: 0.95 },
    { source: 'user-1', target: 'device-1', type: 'shared_device', weight: 0.7 },
    { source: 'user-2', target: 'device-1', type: 'shared_device', weight: 0.6 },
    { source: 'user-3', target: 'ip-2', type: 'shared_ip', weight: 0.4 },
    { source: 'user-5', target: 'ip-2', type: 'shared_ip', weight: 0.3 },
    { source: 'user-3', target: 'device-2', type: 'shared_device', weight: 0.5 },
    { source: 'user-1', target: 'domain-1', type: 'shared_email_domain', weight: 0.3 },
    { source: 'user-2', target: 'domain-1', type: 'shared_email_domain', weight: 0.3 },
    { source: 'user-3', target: 'domain-2', type: 'shared_email_domain', weight: 0.3 },
    { source: 'user-4', target: 'domain-2', type: 'shared_email_domain', weight: 0.3 },
  ],
};

const NODE_COLORS = {
  user: { fill: '#6366f1', stroke: '#818cf8' },
  device: { fill: '#8b5cf6', stroke: '#a78bfa' },
  ip: { fill: '#ec4899', stroke: '#f472b6' },
  email_domain: { fill: '#14b8a6', stroke: '#2dd4bf' },
};

const EDGE_COLORS = {
  shared_ip: '#ef4444',
  shared_device: '#f97316',
  shared_email_domain: '#22c55e',
};

export default function LinkAnalysisPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges] = useState<GraphEdge[]>(mockGraphData.edges);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Initialize node positions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    const initializedNodes = mockGraphData.nodes.map((node, i) => ({
      ...node,
      x: centerX + (Math.random() - 0.5) * 400,
      y: centerY + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
    }));
    
    setNodes(initializedNodes);
  }, []);

  // Force-directed layout simulation
  useEffect(() => {
    if (nodes.length === 0) return;
    
    let animationId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const simulate = () => {
      // Apply forces
      const newNodes = nodes.map((node, i) => {
        let fx = 0, fy = 0;
        
        // Repulsion between nodes
        nodes.forEach((other, j) => {
          if (i === j) return;
          const dx = (node.x || 0) - (other.x || 0);
          const dy = (node.y || 0) - (other.y || 0);
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 2000 / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        });
        
        // Attraction along edges
        edges.forEach((edge) => {
          let other: GraphNode | undefined;
          if (edge.source === node.id) other = nodes.find((n) => n.id === edge.target);
          if (edge.target === node.id) other = nodes.find((n) => n.id === edge.source);
          if (other) {
            const dx = (other.x || 0) - (node.x || 0);
            const dy = (other.y || 0) - (node.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = dist * 0.01 * edge.weight;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });
        
        // Center gravity
        fx += (canvas.width / 2 - (node.x || 0)) * 0.001;
        fy += (canvas.height / 2 - (node.y || 0)) * 0.001;
        
        // Apply velocity with damping
        const vx = ((node.vx || 0) + fx) * 0.8;
        const vy = ((node.vy || 0) + fy) * 0.8;
        
        return {
          ...node,
          x: Math.max(50, Math.min(canvas.width - 50, (node.x || 0) + vx)),
          y: Math.max(50, Math.min(canvas.height - 50, (node.y || 0) + vy)),
          vx,
          vy,
        };
      });
      
      setNodes(newNodes);
      
      // Draw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw edges
      edges.forEach((edge) => {
        const source = newNodes.find((n) => n.id === edge.source);
        const target = newNodes.find((n) => n.id === edge.target);
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x || 0, source.y || 0);
          ctx.lineTo(target.x || 0, target.y || 0);
          ctx.strokeStyle = EDGE_COLORS[edge.type as keyof typeof EDGE_COLORS] || '#4b5563';
          ctx.lineWidth = edge.weight * 3;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      });
      
      // Draw nodes
      newNodes.forEach((node) => {
        const colors = NODE_COLORS[node.type];
        const radius = node.type === 'user' ? 25 : 18;
        
        // Glow for flagged nodes
        if (node.is_flagged) {
          ctx.beginPath();
          ctx.arc(node.x || 0, node.y || 0, radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.fill();
        }
        
        // Node circle
        ctx.beginPath();
        ctx.arc(node.x || 0, node.y || 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = colors.fill;
        ctx.fill();
        ctx.strokeStyle = hoveredNode?.id === node.id ? '#fff' : colors.stroke;
        ctx.lineWidth = hoveredNode?.id === node.id ? 3 : 2;
        ctx.stroke();
        
        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        const label = node.label.length > 15 ? node.label.slice(0, 15) + '...' : node.label;
        ctx.fillText(label, node.x || 0, (node.y || 0) + radius + 15);
      });
      
      animationId = requestAnimationFrame(simulate);
    };
    
    simulate();
    
    return () => cancelAnimationFrame(animationId);
  }, [nodes.length > 0 ? null : nodes, edges, hoveredNode]);

  // Mouse interaction
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedNode = nodes.find((node) => {
      const dx = (node.x || 0) - x;
      const dy = (node.y || 0) - y;
      return Math.sqrt(dx * dx + dy * dy) < (node.type === 'user' ? 25 : 18);
    });
    
    setSelectedNode(clickedNode || null);
  }, [nodes]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const hovered = nodes.find((node) => {
      const dx = (node.x || 0) - x;
      const dy = (node.y || 0) - y;
      return Math.sqrt(dx * dx + dy * dy) < (node.type === 'user' ? 25 : 18);
    });
    
    setHoveredNode(hovered || null);
    canvas.style.cursor = hovered ? 'pointer' : 'default';
  }, [nodes]);

  // Stats
  const stats = {
    totalNodes: nodes.length,
    users: nodes.filter((n) => n.type === 'user').length,
    flaggedNodes: nodes.filter((n) => n.is_flagged).length,
    connections: edges.length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1>Link Analysis</h1>
          <p>Visualize connections and detect fraud rings</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search user or IP..."
            className="input-field w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button className="btn-primary">Analyze Ring</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Total Nodes</p>
          <p className="text-2xl font-bold text-white">{stats.totalNodes}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Users</p>
          <p className="text-2xl font-bold text-indigo-400">{stats.users}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Flagged</p>
          <p className="text-2xl font-bold text-red-400">{stats.flaggedNodes}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Connections</p>
          <p className="text-2xl font-bold text-purple-400">{stats.connections}</p>
        </div>
      </div>

      {/* Graph & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Network Graph */}
        <div className="lg:col-span-3 glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Network Graph</h3>
            <div className="flex items-center gap-4">
              {/* Legend */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.user.fill }} />
                  <span className="text-gray-400">User</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.ip.fill }} />
                  <span className="text-gray-400">IP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.device.fill }} />
                  <span className="text-gray-400">Device</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS.email_domain.fill }} />
                  <span className="text-gray-400">Domain</span>
                </div>
              </div>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            width={900}
            height={500}
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            className="w-full bg-gray-900/50 rounded-xl"
          />
        </div>

        {/* Details Panel */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            {selectedNode ? 'Node Details' : 'Select a Node'}
          </h3>
          
          {selectedNode ? (
            <div className="space-y-4">
              {/* Type Badge */}
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: NODE_COLORS[selectedNode.type].fill }}
                />
                <span className="text-sm text-gray-400 capitalize">{selectedNode.type.replace('_', ' ')}</span>
                {selectedNode.is_flagged && (
                  <span className="stat-badge-critical ml-auto">FLAGGED</span>
                )}
              </div>

              {/* Label */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Identifier</p>
                <p className="text-white font-mono text-sm break-all">{selectedNode.label}</p>
              </div>

              {/* Risk Score */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Risk Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${selectedNode.risk_score}%`,
                        backgroundColor:
                          selectedNode.risk_score >= 80 ? '#ef4444' :
                          selectedNode.risk_score >= 60 ? '#f97316' :
                          selectedNode.risk_score >= 40 ? '#eab308' : '#22c55e'
                      }}
                    />
                  </div>
                  <span className="text-white font-bold">{selectedNode.risk_score}</span>
                </div>
              </div>

              {/* Connections */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Direct Connections</p>
                <div className="space-y-2">
                  {edges
                    .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                    .map((edge, i) => {
                      const otherId = edge.source === selectedNode.id ? edge.target : edge.source;
                      const otherNode = nodes.find((n) => n.id === otherId);
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800"
                          onClick={() => otherNode && setSelectedNode(otherNode)}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: EDGE_COLORS[edge.type as keyof typeof EDGE_COLORS] || '#6b7280' }}
                            />
                            <span className="text-sm text-gray-300 truncate max-w-[120px]">
                              {otherNode?.label}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {edge.type.replace('shared_', '').replace('_', ' ')}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4">
                <button className="btn-primary w-full">Investigate User</button>
                {!selectedNode.is_flagged && (
                  <button className="btn-secondary w-full">Flag as Suspicious</button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-12">
              <p className="text-4xl mb-4">🔍</p>
              <p>Click on a node in the graph to view its details and connections</p>
            </div>
          )}
        </div>
      </div>

      {/* Edge Types Legend */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-center gap-8">
          <span className="text-sm text-gray-400">Connection Types:</span>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded" style={{ backgroundColor: EDGE_COLORS.shared_ip }} />
            <span className="text-sm text-gray-300">Shared IP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded" style={{ backgroundColor: EDGE_COLORS.shared_device }} />
            <span className="text-sm text-gray-300">Shared Device</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded" style={{ backgroundColor: EDGE_COLORS.shared_email_domain }} />
            <span className="text-sm text-gray-300">Same Email Domain</span>
          </div>
        </div>
      </div>
    </div>
  );
}
