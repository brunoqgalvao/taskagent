import { randomUUID } from 'crypto';
import { Store } from './store.js';

const VALID_STATUSES = ['pending', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];

export class TaskManager {
  constructor(rootDir) {
    this.store = new Store(rootDir).init();
  }

  // ── Tasks ──────────────────────────────────────────────

  createTask({ title, description, priority, tags, deadline, estimatedMinutes, assignee, dependsOn }) {
    const data = this.store._read();
    const id = randomUUID().slice(0, 8);

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      throw new Error(`Invalid priority "${priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    if (dependsOn) {
      for (const depId of dependsOn) {
        if (!data.tasks[depId]) throw new Error(`Dependency task "${depId}" not found`);
      }
    }

    if (assignee && !data.agents[assignee]) {
      throw new Error(`Agent "${assignee}" not registered. Use "taskagent agent register" first.`);
    }

    const task = {
      id,
      title,
      description: description || '',
      status: 'pending',
      priority: priority || 'medium',
      tags: tags || [],
      deadline: deadline || null,
      estimatedMinutes: estimatedMinutes || null,
      assignee: assignee || null,
      dependsOn: dependsOn || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.tasks[id] = task;
    this.store._write(data);
    this.store._appendHistory({ action: 'task_created', taskId: id, snapshot: { ...task } });
    return task;
  }

  getTask(id) {
    const data = this.store._read();
    const task = data.tasks[id];
    if (!task) throw new Error(`Task "${id}" not found`);
    return task;
  }

  listTasks({ status, assignee, tag, priority } = {}) {
    const data = this.store._read();
    let tasks = Object.values(data.tasks);

    if (status) tasks = tasks.filter(t => t.status === status);
    if (assignee) tasks = tasks.filter(t => t.assignee === assignee);
    if (tag) tasks = tasks.filter(t => t.tags.includes(tag));
    if (priority) tasks = tasks.filter(t => t.priority === priority);

    return tasks;
  }

  updateTask(id, updates) {
    const data = this.store._read();
    const task = data.tasks[id];
    if (!task) throw new Error(`Task "${id}" not found`);

    const before = { ...task };

    if (updates.status !== undefined) {
      if (!VALID_STATUSES.includes(updates.status)) {
        throw new Error(`Invalid status "${updates.status}". Must be one of: ${VALID_STATUSES.join(', ')}`);
      }
      // Check if dependencies are met before moving to in_progress
      if (updates.status === 'in_progress') {
        const unmet = task.dependsOn.filter(depId => {
          const dep = data.tasks[depId];
          return dep && dep.status !== 'completed';
        });
        if (unmet.length > 0) {
          throw new Error(`Cannot start task: dependencies not met: ${unmet.join(', ')}`);
        }
      }
    }

    if (updates.priority !== undefined && !VALID_PRIORITIES.includes(updates.priority)) {
      throw new Error(`Invalid priority "${updates.priority}". Must be one of: ${VALID_PRIORITIES.join(', ')}`);
    }

    if (updates.assignee !== undefined && updates.assignee !== null && !data.agents[updates.assignee]) {
      throw new Error(`Agent "${updates.assignee}" not registered.`);
    }

    if (updates.dependsOn) {
      for (const depId of updates.dependsOn) {
        if (!data.tasks[depId]) throw new Error(`Dependency task "${depId}" not found`);
        if (depId === id) throw new Error('A task cannot depend on itself');
      }
    }

    const allowed = ['title', 'description', 'status', 'priority', 'tags', 'deadline', 'estimatedMinutes', 'assignee', 'dependsOn'];
    for (const key of allowed) {
      if (updates[key] !== undefined) task[key] = updates[key];
    }
    task.updatedAt = new Date().toISOString();

    data.tasks[id] = task;
    this.store._write(data);

    // Build a diff for history
    const changes = {};
    for (const key of allowed) {
      if (updates[key] !== undefined && JSON.stringify(before[key]) !== JSON.stringify(updates[key])) {
        changes[key] = { from: before[key], to: updates[key] };
      }
    }

    this.store._appendHistory({ action: 'task_updated', taskId: id, changes, snapshot: { ...task } });
    return task;
  }

  deleteTask(id) {
    const data = this.store._read();
    const task = data.tasks[id];
    if (!task) throw new Error(`Task "${id}" not found`);

    // Remove from other tasks' dependencies
    for (const t of Object.values(data.tasks)) {
      t.dependsOn = t.dependsOn.filter(d => d !== id);
    }

    delete data.tasks[id];
    this.store._write(data);
    this.store._appendHistory({ action: 'task_deleted', taskId: id, snapshot: { ...task } });
    return task;
  }

  // ── Dependencies ───────────────────────────────────────

  addDependency(taskId, dependsOnId) {
    if (taskId === dependsOnId) throw new Error('A task cannot depend on itself');
    const data = this.store._read();
    if (!data.tasks[taskId]) throw new Error(`Task "${taskId}" not found`);
    if (!data.tasks[dependsOnId]) throw new Error(`Task "${dependsOnId}" not found`);

    // Cycle detection
    if (this._wouldCycle(data, taskId, dependsOnId)) {
      throw new Error('Adding this dependency would create a cycle');
    }

    const task = data.tasks[taskId];
    if (!task.dependsOn.includes(dependsOnId)) {
      task.dependsOn.push(dependsOnId);
      task.updatedAt = new Date().toISOString();
      data.tasks[taskId] = task;
      this.store._write(data);
      this.store._appendHistory({ action: 'dependency_added', taskId, dependsOnId });
    }
    return task;
  }

  removeDependency(taskId, dependsOnId) {
    const data = this.store._read();
    const task = data.tasks[taskId];
    if (!task) throw new Error(`Task "${taskId}" not found`);

    task.dependsOn = task.dependsOn.filter(d => d !== dependsOnId);
    task.updatedAt = new Date().toISOString();
    data.tasks[taskId] = task;
    this.store._write(data);
    this.store._appendHistory({ action: 'dependency_removed', taskId, dependsOnId });
    return task;
  }

  getBlockers(taskId) {
    const data = this.store._read();
    const task = data.tasks[taskId];
    if (!task) throw new Error(`Task "${taskId}" not found`);

    return task.dependsOn
      .map(id => data.tasks[id])
      .filter(t => t && t.status !== 'completed');
  }

  getBlocking(taskId) {
    const data = this.store._read();
    if (!data.tasks[taskId]) throw new Error(`Task "${taskId}" not found`);

    return Object.values(data.tasks).filter(t => t.dependsOn.includes(taskId));
  }

  _wouldCycle(data, taskId, newDepId) {
    const visited = new Set();
    const walk = (id) => {
      if (id === taskId) return true;
      if (visited.has(id)) return false;
      visited.add(id);
      const task = data.tasks[id];
      if (!task) return false;
      return task.dependsOn.some(d => walk(d));
    };
    return walk(newDepId);
  }

  // ── Agents ─────────────────────────────────────────────

  registerAgent(name, meta = {}) {
    const data = this.store._read();
    if (data.agents[name]) throw new Error(`Agent "${name}" already registered`);

    data.agents[name] = {
      name,
      type: meta.type || 'agent',
      registeredAt: new Date().toISOString(),
      ...meta,
    };
    this.store._write(data);
    this.store._appendHistory({ action: 'agent_registered', agentName: name, meta });
    return data.agents[name];
  }

  listAgents() {
    const data = this.store._read();
    return Object.values(data.agents);
  }

  getAgentTasks(agentName) {
    return this.listTasks({ assignee: agentName });
  }

  // ── History ────────────────────────────────────────────

  getHistory(taskId) {
    return this.store.readHistory(taskId);
  }

  getFullHistory() {
    return this.store.readHistory();
  }

  // ── Summary / Dashboard ────────────────────────────────

  summary() {
    const data = this.store._read();
    const tasks = Object.values(data.tasks);
    const counts = {};
    for (const s of ['pending', 'in_progress', 'blocked', 'completed', 'failed', 'cancelled']) {
      counts[s] = tasks.filter(t => t.status === s).length;
    }

    const overdue = tasks.filter(t => {
      if (!t.deadline || t.status === 'completed' || t.status === 'cancelled') return false;
      return new Date(t.deadline) < new Date();
    });

    return {
      total: tasks.length,
      counts,
      overdue: overdue.map(t => ({ id: t.id, title: t.title, deadline: t.deadline })),
      agents: Object.keys(data.agents).length,
    };
  }
}
