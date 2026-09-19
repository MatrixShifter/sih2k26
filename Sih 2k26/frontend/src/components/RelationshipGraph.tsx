import React, { useState } from "react";
import {
  Users,
  MapPin,
  FileCode,
  Phone,
  Building,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  fullName?: string;
  type: "BIDDER" | "DIRECTOR" | "ADDRESS" | "PHONE" | "DOCUMENT_HASH";
  category?: string;
  bidderId?: number;
  state?: string;
  director?: string;
  hasAlert?: boolean;
  docName?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  color?: string;
}

interface RelationshipGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedAlertId?: string | null;
  onSelectNode?: (nodeId: string) => void;
}

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  nodes,
  edges,
  selectedAlertId,
  onSelectNode,
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  // Compute layout positions for nodes
  // Bidders placed in outer ring or columns, shared entities in center
  const width = 860;
  const height = 480;
  const centerX = width / 2;
  const centerY = height / 2;

  const bidderNodes = nodes.filter((n) => n.type === "BIDDER" && n.hasAlert);
  const entityNodes = nodes.filter((n) => n.type !== "BIDDER");

  // Calculate layout coordinates
  const nodePositions: Record<string, { x: number; y: number }> = {};

  // Left column for bidder A, right column for bidder B if 2 main bidders, or circular layout
  if (bidderNodes.length > 0) {
    const bidderRadius = 260;
    bidderNodes.forEach((node, index) => {
      const angle = (index / bidderNodes.length) * 2 * Math.PI - Math.PI / 2;
      nodePositions[node.id] = {
        x: centerX + bidderRadius * Math.cos(angle),
        y: centerY + bidderRadius * 0.7 * Math.sin(angle),
      };
    });
  }

  if (entityNodes.length > 0) {
    const entityRadius = 110;
    entityNodes.forEach((node, index) => {
      const angle = (index / entityNodes.length) * 2 * Math.PI - Math.PI / 4;
      nodePositions[node.id] = {
        x: centerX + entityRadius * Math.cos(angle),
        y: centerY + entityRadius * 0.65 * Math.sin(angle),
      };
    });
  }

  // Fallback for any unpositioned nodes
  nodes.forEach((node, i) => {
    if (!nodePositions[node.id]) {
      nodePositions[node.id] = {
        x: 60 + (i % 6) * 120,
        y: 60 + Math.floor(i / 6) * 90,
      };
    }
  });

  const getNodeColor = (type: string, hasAlert?: boolean) => {
    switch (type) {
      case "BIDDER":
        return hasAlert ? "#1e293b" : "#475569";
      case "DIRECTOR":
        return "#dc2626"; // red
      case "ADDRESS":
        return "#d97706"; // amber
      case "DOCUMENT_HASH":
        return "#7c3aed"; // purple
      case "PHONE":
        return "#2563eb"; // blue
      default:
        return "#64748b";
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "BIDDER":
        return <Building className="h-4 w-4 text-white" />;
      case "DIRECTOR":
        return <Users className="h-4 w-4 text-white" />;
      case "ADDRESS":
        return <MapPin className="h-4 w-4 text-white" />;
      case "DOCUMENT_HASH":
        return <FileCode className="h-4 w-4 text-white" />;
      case "PHONE":
        return <Phone className="h-4 w-4 text-white" />;
      default:
        return null;
    }
  };

  const activeNode = hoveredNode || selectedNode;

  return (
    <div className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-4 shadow-lg overflow-hidden text-slate-100">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="flex h-2.5 w-2.5 items-center justify-center">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
            Interactive Entity Relationship Graph
          </span>
          <span className="text-[11px] text-slate-400">
            (Cross-Bidder Shared Identifiers &amp; Binary Hashes)
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400 border border-slate-300"></span>
            <span>Bidder</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
            <span>Shared Director</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            <span>Same Address</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500"></span>
            <span>Duplicate File</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
            <span>Shared Phone</span>
          </div>

          <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.1, 1.4))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.1, 0.7))}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
              title="Reset Zoom"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-auto flex justify-center items-center py-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-4xl h-[420px] select-none"
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center" }}
        >
          {/* Subtle Grid Background */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="rgba(255, 255, 255, 0.04)"
                strokeWidth="1"
              />
            </pattern>
            {/* Glow Filter for High Risk */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <rect width={width} height={height} fill="url(#grid)" />

          {/* Edges */}
          {edges.map((edge) => {
            const p1 = nodePositions[edge.source];
            const p2 = nodePositions[edge.target];
            if (!p1 || !p2) return null;

            const isHighlighted =
              activeNode === edge.source || activeNode === edge.target;

            // Compute curved midpoint
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            return (
              <g key={edge.id} className="transition-all duration-200">
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isHighlighted ? "#f43f5e" : edge.color || "#475569"}
                  strokeWidth={isHighlighted ? 3 : 1.8}
                  strokeOpacity={isHighlighted ? 1 : 0.65}
                  strokeDasharray={edge.relationship === "Reused Document" ? "5 4" : undefined}
                />
                {/* Edge Label */}
                {isHighlighted && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-55"
                      y="-11"
                      width="110"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      stroke="#475569"
                      strokeWidth="1"
                    />
                    <text
                      textAnchor="middle"
                      y="3"
                      fill="#e2e8f0"
                      fontSize="9"
                      fontWeight="600"
                    >
                      {edge.relationship}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes
            .filter((n) => n.type !== "BIDDER" || n.hasAlert)
            .map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;

              const isBidder = node.type === "BIDDER";
              const isSelected = selectedNode === node.id;
              const isHovered = hoveredNode === node.id;
              const isConnected =
                activeNode &&
                edges.some(
                  (e) =>
                    (e.source === activeNode && e.target === node.id) ||
                    (e.target === activeNode && e.source === node.id)
                );

              const active = isSelected || isHovered || isConnected;
              const color = getNodeColor(node.type, node.hasAlert);

              if (isBidder) {
                // Bidder Card Node
                const cardW = 175;
                const cardH = 68;
                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x - cardW / 2}, ${pos.y - cardH / 2})`}
                    className="cursor-pointer transition-all duration-150"
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => {
                      setSelectedNode(node.id);
                      onSelectNode?.(node.id);
                    }}
                  >
                    {/* Pulsing ring for alert */}
                    {node.hasAlert && (
                      <rect
                        x="-4"
                        y="-4"
                        width={cardW + 8}
                        height={cardH + 8}
                        rx="12"
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="1.5"
                        strokeOpacity="0.6"
                      />
                    )}

                    {/* Card background */}
                    <rect
                      width={cardW}
                      height={cardH}
                      rx="8"
                      fill="#0f172a"
                      stroke={active ? "#38bdf8" : "#334155"}
                      strokeWidth={active ? 2 : 1}
                      filter={active ? "url(#glow)" : undefined}
                    />

                    {/* Header bar */}
                    <rect
                      width={cardW}
                      height="20"
                      rx="8"
                      fill="#1e293b"
                    />
                    <rect
                      y="14"
                      width={cardW}
                      height="6"
                      fill="#1e293b"
                    />

                    {/* Badge */}
                    <text
                      x="10"
                      y="13"
                      fill="#38bdf8"
                      fontSize="9"
                      fontWeight="bold"
                      letterSpacing="0.5"
                    >
                      BIDDER ENTITY
                    </text>
                    {node.hasAlert && (
                      <text
                        x={cardW - 10}
                        y="13"
                        textAnchor="end"
                        fill="#f43f5e"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        ALERT
                      </text>
                    )}

                    {/* Company Name */}
                    <text
                      x="10"
                      y="37"
                      fill="#f8fafc"
                      fontSize="11"
                      fontWeight="700"
                      clipPath="url(#clip)"
                    >
                      {node.label.length > 22
                        ? `${node.label.substring(0, 20)}...`
                        : node.label}
                    </text>

                    {/* Director / Details */}
                    <text
                      x="10"
                      y="54"
                      fill="#94a3b8"
                      fontSize="9"
                    >
                      Dir: {node.director ? node.director.substring(0, 20) : "N/A"}
                    </text>
                  </g>
                );
              }

              // Shared Entity Circle Node
              const radius = 22;
              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer transition-all duration-150"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => {
                    setSelectedNode(node.id);
                    onSelectNode?.(node.id);
                  }}
                >
                  {/* Outer circle */}
                  <circle
                    r={active ? radius + 5 : radius + 2}
                    fill={color}
                    fillOpacity="0.2"
                    stroke={color}
                    strokeWidth={active ? 2.5 : 1.5}
                    filter={active ? "url(#glow)" : undefined}
                  />
                  {/* Inner solid circle */}
                  <circle r={radius - 4} fill={color} />

                  {/* Icon or glyph */}
                  <g transform="translate(-8, -8)">
                    {getNodeIcon(node.type)}
                  </g>

                  {/* Label below */}
                  <rect
                    x="-65"
                    y={radius + 4}
                    width="130"
                    height="18"
                    rx="4"
                    fill="#0f172a"
                    stroke="#334155"
                    strokeWidth="0.8"
                    fillOpacity="0.95"
                  />
                  <text
                    textAnchor="middle"
                    y={radius + 16}
                    fill="#f1f5f9"
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {node.label.length > 18
                      ? `${node.label.substring(0, 16)}...`
                      : node.label}
                  </text>
                </g>
              );
            })}
        </svg>
      </div>

      {/* Footer Info / Selected Node Preview */}
      <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <span>
            Hover or click nodes and lines to isolate relationships and view linked attributes.
          </span>
        </div>
        <div className="text-slate-500 font-mono text-[10px]">
          Nodes: {nodes.length} | Links: {edges.length}
        </div>
      </div>
    </div>
  );
};
