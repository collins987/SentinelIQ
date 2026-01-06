# Graph Link Analysis Service
# Detect fraud rings using network analysis

import logging
from typing import Dict, List, Set, Tuple, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from fastapi import Depends
from app.models import UserConnection, User
from app.dependencies import get_db
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("[LINK ANALYSIS] NetworkX not available - install with: pip install networkx")

logger = logging.getLogger(__name__)


# ========== LINK ANALYSIS SERVICE ==========

class LinkAnalysisService:
    """
    Graph-based fraud ring detection and visualization support.
    
    Detects how users are connected via:
    - Shared IP address
    - Shared device fingerprint
    - Shared email domain
    - Shared phone number
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    # ========== CONNECTION TRACKING ==========
    
    def record_connection(
        self,
        org_id: str,
        user_a_id: str,
        user_b_id: str,
        connection_type: str,  # ip_address, device, email_domain, phone
        connection_value: str,
        connection_strength: int = 50,  # 0-100
    ):
        """
        Record a connection between two users.
        Example: Two users logged in from the same IP.
        """
        # Ensure consistent ordering (smaller ID first)
        if user_a_id > user_b_id:
            user_a_id, user_b_id = user_b_id, user_a_id
        
        # Check if connection exists
        existing = self.db.query(UserConnection).filter(
            and_(
                UserConnection.organization_id == org_id,
                UserConnection.user_a_id == user_a_id,
                UserConnection.user_b_id == user_b_id,
                UserConnection.connection_type == connection_type,
            )
        ).first()
        
        if existing:
            # Update existing connection
            existing.last_seen = datetime.utcnow()
            existing.event_count += 1
            self.db.commit()
            logger.debug(f"[LINK ANALYSIS] Connection updated: {user_a_id} <-> {user_b_id}")
        else:
            # Create new connection
            connection = UserConnection(
                organization_id=org_id,
                user_a_id=user_a_id,
                user_b_id=user_b_id,
                connection_type=connection_type,
                connection_value=connection_value,
                connection_strength=connection_strength,
                first_seen=datetime.utcnow(),
                last_seen=datetime.utcnow(),
                event_count=1,
            )
            
            self.db.add(connection)
            self.db.commit()
            logger.debug(
                f"[LINK ANALYSIS] New connection: {user_a_id} <-> {user_b_id} "
                f"via {connection_type}"
            )
    
    # ========== NETWORK QUERIES (SQL) ==========
    
    def find_connected_users(
        self,
        org_id: str,
        start_user_id: str,
        max_depth: int = 3,
    ) -> Set[str]:
        """
        Find all users connected to a starting user via recursive query.
        Uses SQL recursive CTEs for efficiency.
        """
        # For simplicity, use iterative approach with database queries
        visited = {start_user_id}
        to_explore = {start_user_id}
        depth = 0
        
        while to_explore and depth < max_depth:
            depth += 1
            next_to_explore = set()
            
            for user_id in to_explore:
                # Find all users connected to this user
                connections = self.db.query(UserConnection).filter(
                    and_(
                        UserConnection.organization_id == org_id,
                        (UserConnection.user_a_id == user_id) |
                        (UserConnection.user_b_id == user_id),
                    )
                ).all()
                
                for conn in connections:
                    other_user = (
                        conn.user_b_id if conn.user_a_id == user_id
                        else conn.user_a_id
                    )
                    
                    if other_user not in visited:
                        visited.add(other_user)
                        next_to_explore.add(other_user)
            
            to_explore = next_to_explore
        
        logger.debug(
            f"[LINK ANALYSIS] Found {len(visited)} users connected to "
            f"{start_user_id} (depth {max_depth})"
        )
        
        return visited
    
    def get_user_connections(
        self,
        org_id: str,
        user_id: str,
        connection_types: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get direct connections for a user.
        """
        query = self.db.query(UserConnection).filter(
            and_(
                UserConnection.organization_id == org_id,
                (UserConnection.user_a_id == user_id) |
                (UserConnection.user_b_id == user_id),
            )
        )
        
        if connection_types:
            query = query.filter(
                UserConnection.connection_type.in_(connection_types)
            )
        
        connections = query.all()
        
        result = []
        for conn in connections:
            other_user_id = (
                conn.user_b_id if conn.user_a_id == user_id
                else conn.user_a_id
            )
            
            result.append({
                "user_id": other_user_id,
                "connection_type": conn.connection_type,
                "connection_value": conn.connection_value,
                "connection_strength": conn.connection_strength,
                "first_seen": conn.first_seen,
                "last_seen": conn.last_seen,
                "event_count": conn.event_count,
                "is_flagged_ring": conn.is_flagged_ring,
            })
        
        return result
    
    # ========== NETWORK ANALYSIS (NetworkX) ==========
    
    def analyze_fraud_ring(
        self,
        org_id: str,
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Analyze a fraud ring using NetworkX.
        Requires NetworkX library.
        """
        if not NETWORKX_AVAILABLE:
            logger.warning("[LINK ANALYSIS] NetworkX not installed")
            return None
        
        # [1] Build graph
        G = nx.Graph()
        
        # Get all users in ring
        connected_users = self.find_connected_users(org_id, user_id, max_depth=5)
        
        # Add nodes
        for u in connected_users:
            G.add_node(u)
        
        # Add edges
        connections = self.db.query(UserConnection).filter(
            and_(
                UserConnection.organization_id == org_id,
                UserConnection.user_a_id.in_(connected_users),
                UserConnection.user_b_id.in_(connected_users),
            )
        ).all()
        
        for conn in connections:
            G.add_edge(
                conn.user_a_id,
                conn.user_b_id,
                weight=conn.connection_strength,
                type=conn.connection_type,
            )
        
        # [2] Analyze ring
        
        # Connected components
        components = list(nx.connected_components(G))
        
        # Centrality (who's the "hub" of the ring?)
        betweenness = nx.betweenness_centrality(G, weight='weight')
        closeness = nx.closeness_centrality(G, distance='weight')
        
        # Community detection
        communities = []
        if len(G.nodes()) > 2:
            try:
                from networkx.algorithms import community
                communities = list(
                    community.greedy_modularity_communities(G)
                )
            except:
                pass
        
        # [3] Format results
        hub_users = sorted(betweenness.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "ring_size": len(connected_users),
            "users": sorted(connected_users),
            "edge_count": len(G.edges()),
            "density": nx.density(G),
            "hub_users": [
                {"user_id": u, "betweenness_centrality": round(c, 4)}
                for u, c in hub_users
            ],
            "communities": [
                {"members": list(c), "size": len(c)}
                for c in communities
            ],
            "is_complete_ring": (
                len(G.edges()) == len(G.nodes()) * (len(G.nodes()) - 1) / 2
            ),
        }
    
    # ========== RING FLAGGING & MANAGEMENT ==========
    
    def flag_ring(
        self,
        org_id: str,
        user_ids: List[str],
        reason: str,
    ):
        """
        Flag a group of users as a fraud ring.
        """
        # Mark all connections between these users as flagged
        for i, user_a in enumerate(user_ids):
            for user_b in user_ids[i+1:]:
                # Ensure consistent ordering
                if user_a > user_b:
                    user_a, user_b = user_b, user_a
                
                connections = self.db.query(UserConnection).filter(
                    and_(
                        UserConnection.organization_id == org_id,
                        UserConnection.user_a_id == user_a,
                        UserConnection.user_b_id == user_b,
                    )
                ).all()
                
                for conn in connections:
                    conn.is_flagged_ring = True
                
                self.db.commit()
        
        logger.info(
            f"[LINK ANALYSIS] Flagged ring of {len(user_ids)} users: {reason}"
        )
    
    def get_top_hubs(
        self,
        org_id: str,
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Get users with most connections (potential ring hubs).
        """
        # Count connections per user
        user_connection_counts = {}
        
        connections = self.db.query(UserConnection).filter(
            UserConnection.organization_id == org_id
        ).all()
        
        for conn in connections:
            user_connection_counts[conn.user_a_id] = (
                user_connection_counts.get(conn.user_a_id, 0) + 1
            )
            user_connection_counts[conn.user_b_id] = (
                user_connection_counts.get(conn.user_b_id, 0) + 1
            )
        
        # Sort and return top
        top_users = sorted(
            user_connection_counts.items(),
            key=lambda x: x[1],
            reverse=True,
        )[:limit]
        
        result = []
        for user_id, count in top_users:
            user = self.db.query(User).filter(User.id == user_id).first()
            result.append({
                "user_id": user_id,
                "user_email": user.email if user else "UNKNOWN",
                "connection_count": count,
            })
        
        return result
    
    # ========== FOR VISUALIZATION ==========
    
    def get_graph_data(
        self,
        org_id: str,
        user_id: str,
        include_risk_scores: bool = True,
    ) -> Dict[str, Any]:
        """
        Get graph data suitable for Cytoscape.js visualization.
        
        Returns:
        {
            "nodes": [
                {"id": "user_123", "label": "john@example.com", "risk": "high", "size": 50}
            ],
            "edges": [
                {"source": "user_123", "target": "user_456", "type": "ip_address", "strength": 85}
            ]
        }
        """
        connected_users = self.find_connected_users(org_id, user_id, max_depth=3)
        
        # Build nodes
        nodes = []
        for uid in connected_users:
            user = self.db.query(User).filter(User.id == uid).first()
            if user:
                nodes.append({
                    "id": uid,
                    "label": user.email,
                    "risk": self._risk_level(user.risk_score),
                    "size": 40 + min(user.risk_score, 60),  # Scale size by risk
                })
        
        # Build edges
        edges = []
        connections = self.db.query(UserConnection).filter(
            and_(
                UserConnection.organization_id == org_id,
                UserConnection.user_a_id.in_(connected_users),
                UserConnection.user_b_id.in_(connected_users),
            )
        ).all()
        
        for conn in connections:
            edges.append({
                "source": conn.user_a_id,
                "target": conn.user_b_id,
                "type": conn.connection_type,
                "strength": conn.connection_strength,
                "label": f"{conn.connection_type} ({conn.event_count}x)",
            })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "node_count": len(nodes),
                "edge_count": len(edges),
            },
        }
    
    @staticmethod
    def _risk_level(risk_score: int) -> str:
        """Convert risk score to level."""
        if risk_score >= 75:
            return "critical"
        elif risk_score >= 50:
            return "high"
        elif risk_score >= 25:
            return "medium"
        else:
            return "low"


# ========== HELPER FUNCTION ==========

def get_link_analysis_service(db: Session = Depends(get_db)) -> LinkAnalysisService:
    """Dependency: Get link analysis service."""
    return LinkAnalysisService(db)
