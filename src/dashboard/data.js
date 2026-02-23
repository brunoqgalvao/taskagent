/**
 * Pure data transformation functions for dashboard views.
 * Takes raw taskagent data and produces view models.
 */

const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_KEYS = ['pending', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled'];

/**
 * Sort tasks by priority (critical first, then high, medium, low)
 */
function sortByPriority(tasks) {
  return [...tasks].sort((a, b) => {
    const aPrio = PRIORITY_ORDER[a.priority] ?? 999;
    const bPrio = PRIORITY_ORDER[b.priority] ?? 999;
    return aPrio - bPrio;
  });
}

/**
 * Groups tasks by status, each group sorted by priority.
 * @param {Object} tasks - Task map keyed by id
 * @returns {Object} Status columns with sorted task arrays
 */
export function groupTasksByStatus(tasks) {
  const columns = {
    pending: [],
    in_progress: [],
    blocked: [],
    completed: [],
    failed: [],
    cancelled: []
  };

  const taskArray = Object.values(tasks);

  for (const task of taskArray) {
    const status = task.status || 'pending';
    if (columns[status]) {
      columns[status].push(task);
    }
  }

  // Sort each column by priority
  for (const key of STATUS_KEYS) {
    columns[key] = sortByPriority(columns[key]);
  }

  return columns;
}

/**
 * Calculate workload metrics per agent.
 * @param {Object} tasks - Task map
 * @param {Object} agents - Agent map
 * @returns {Array} Agent workload objects sorted by total tasks desc
 */
export function getAgentWorkload(tasks, agents) {
  const workload = {};

  // Initialize all registered agents
  for (const [name, agent] of Object.entries(agents)) {
    workload[name] = {
      name,
      type: agent.type || 'agent',
      total: 0,
      inProgress: 0,
      completed: 0,
      pending: 0
    };
  }

  // Aggregate task counts
  for (const task of Object.values(tasks)) {
    const assignee = task.assignee;
    if (!assignee) continue;

    // Create entry if agent not registered
    if (!workload[assignee]) {
      workload[assignee] = {
        name: assignee,
        type: 'agent',
        total: 0,
        inProgress: 0,
        completed: 0,
        pending: 0
      };
    }

    workload[assignee].total++;

    if (task.status === 'in_progress') {
      workload[assignee].inProgress++;
    } else if (task.status === 'completed') {
      workload[assignee].completed++;
    } else if (task.status === 'pending') {
      workload[assignee].pending++;
    }
  }

  // Convert to array and sort by total descending
  return Object.values(workload).sort((a, b) => b.total - a.total);
}

/**
 * Topological sort to assign layers (depth levels) to tasks.
 * @param {Object} tasks - Task map
 * @returns {Object} Graph with nodes, edges, and layers
 */
export function buildDependencyGraph(tasks) {
  const taskArray = Object.values(tasks);
  const nodes = [];
  const edges = [];

  // Build adjacency list and in-degree counts
  const adjacency = {};
  const inDegree = {};

  for (const task of taskArray) {
    adjacency[task.id] = [];
    inDegree[task.id] = 0;
  }

  // Build edges (reverse direction: if A depends on B, edge is B -> A)
  for (const task of taskArray) {
    if (task.dependsOn && Array.isArray(task.dependsOn)) {
      for (const depId of task.dependsOn) {
        if (adjacency[depId]) {
          adjacency[depId].push(task.id);
          edges.push({ from: depId, to: task.id });
          inDegree[task.id]++;
        }
      }
    }
  }

  // Topological sort using Kahn's algorithm
  const layers = [];
  const taskToLayer = {};
  let currentLayer = [];

  // Start with nodes that have no dependencies (in-degree = 0)
  for (const task of taskArray) {
    if (inDegree[task.id] === 0) {
      currentLayer.push(task.id);
      taskToLayer[task.id] = 0;
    }
  }

  let layerIndex = 0;
  while (currentLayer.length > 0) {
    layers.push([...currentLayer]);
    const nextLayer = [];

    for (const taskId of currentLayer) {
      for (const neighborId of adjacency[taskId]) {
        inDegree[neighborId]--;
        if (inDegree[neighborId] === 0) {
          nextLayer.push(neighborId);
          taskToLayer[neighborId] = layerIndex + 1;
        }
      }
    }

    currentLayer = nextLayer;
    layerIndex++;
  }

  // Build node array with layer information
  for (const task of taskArray) {
    nodes.push({
      id: task.id,
      title: task.title,
      status: task.status,
      layer: taskToLayer[task.id] ?? 0
    });
  }

  return { nodes, edges, layers };
}

/**
 * Find tasks past their deadline that aren't complete.
 * @param {Object} tasks - Task map
 * @returns {Array} Overdue task warnings
 */
export function getOverdueWarnings(tasks) {
  const now = new Date();
  const warnings = [];

  for (const task of Object.values(tasks)) {
    // Skip if no deadline or if completed/cancelled
    if (!task.deadline) continue;
    if (task.status === 'completed' || task.status === 'cancelled') continue;

    const deadline = new Date(task.deadline);
    if (deadline < now) {
      const diffMs = now - deadline;
      const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      warnings.push({
        id: task.id,
        title: task.title,
        deadline: task.deadline,
        assignee: task.assignee,
        daysOverdue
      });
    }
  }

  // Sort by days overdue descending
  return warnings.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Calculate overall progress statistics.
 * @param {Object} tasks - Task map
 * @returns {Object} Progress stats
 */
export function getProgressStats(tasks) {
  const stats = {
    total: 0,
    completed: 0,
    inProgress: 0,
    blocked: 0,
    pending: 0,
    failed: 0,
    cancelled: 0,
    percentComplete: 0
  };

  const taskArray = Object.values(tasks);
  stats.total = taskArray.length;

  for (const task of taskArray) {
    switch (task.status) {
      case 'completed':
        stats.completed++;
        break;
      case 'in_progress':
        stats.inProgress++;
        break;
      case 'blocked':
        stats.blocked++;
        break;
      case 'pending':
        stats.pending++;
        break;
      case 'failed':
        stats.failed++;
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
    }
  }

  stats.percentComplete = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  return stats;
}

/**
 * Master function that computes the full dashboard view model.
 * @param {Object} data - Raw taskagent data { tasks, agents }
 * @returns {Object} Complete dashboard data
 */
export function computeDashboardData(data) {
  const tasks = data.tasks || {};
  const agents = data.agents || {};

  return {
    project: data.project || null,
    columns: groupTasksByStatus(tasks),
    agents: getAgentWorkload(tasks, agents),
    graph: buildDependencyGraph(tasks),
    overdue: getOverdueWarnings(tasks),
    stats: getProgressStats(tasks)
  };
}
