import { PlanTaskNode } from '../types/brain';

/**
 * Chamber 9: Directed Acyclic Graph (DAG) Engine
 * Performs cycle detection, topological sorting, and critical path identification.
 */
export function analyzePlanDAG(nodes: PlanTaskNode[]): {
  sortedOrder: string[];
  hasCycle: boolean;
  criticalPath: string[];
  totalEstimatedDurationMs: number;
} {
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  const nodeMap = new Map<string, PlanTaskNode>();

  nodes.forEach((n) => {
    inDegree[n.id] = 0;
    adj[n.id] = [];
    nodeMap.set(n.id, n);
  });

  nodes.forEach((n) => {
    n.dependencies.forEach((dep) => {
      if (!adj[dep]) adj[dep] = [];
      adj[dep].push(n.id);
      inDegree[n.id] = (inDegree[n.id] || 0) + 1;
    });
  });

  // Kahn's Algorithm for Topological Sort
  const queue: string[] = [];
  Object.keys(inDegree).forEach((id) => {
    if (inDegree[id] === 0) queue.push(id);
  });

  const sortedOrder: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    sortedOrder.push(curr);

    (adj[curr] || []).forEach((next) => {
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    });
  }

  const hasCycle = sortedOrder.length !== nodes.length;

  // Critical Path calculation (longest path through DAG)
  const dist: Record<string, number> = {};
  const parent: Record<string, string | null> = {};

  nodes.forEach((n) => {
    dist[n.id] = n.estimatedMs;
    parent[n.id] = null;
  });

  sortedOrder.forEach((u) => {
    const uDist = dist[u] || 0;
    (adj[u] || []).forEach((v) => {
      const vNode = nodeMap.get(v);
      const vDuration = vNode ? vNode.estimatedMs : 0;
      if (uDist + vDuration > (dist[v] || 0)) {
        dist[v] = uDist + vDuration;
        parent[v] = u;
      }
    });
  });

  // Find node with max distance
  let maxNodeId = sortedOrder[0] || '';
  let maxDist = 0;
  Object.entries(dist).forEach(([id, d]) => {
    if (d > maxDist) {
      maxDist = d;
      maxNodeId = id;
    }
  });

  const criticalPath: string[] = [];
  let curr: string | null = maxNodeId;
  while (curr) {
    criticalPath.unshift(curr);
    curr = parent[curr];
  }

  const totalEstimatedDurationMs = nodes.reduce((acc, n) => acc + n.estimatedMs, 0);

  return {
    sortedOrder,
    hasCycle,
    criticalPath,
    totalEstimatedDurationMs: Math.max(maxDist, totalEstimatedDurationMs),
  };
}
