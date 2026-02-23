const STATUS_ICONS = {
  pending: '○',
  in_progress: '◉',
  blocked: '⊘',
  completed: '●',
  failed: '✗',
  cancelled: '—',
};

const PRIORITY_COLORS = {
  low: '\x1b[90m',
  medium: '\x1b[0m',
  high: '\x1b[33m',
  critical: '\x1b[31m',
};

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const MAGENTA = '\x1b[35m';

export function formatTask(task, { verbose = false } = {}) {
  const icon = STATUS_ICONS[task.status] || '?';
  const pc = PRIORITY_COLORS[task.priority] || '';
  const id = `${DIM}${task.id}${RESET}`;
  const title = `${pc}${BOLD}${task.title}${RESET}`;
  const status = `[${task.status}]`;

  let line = `  ${icon} ${id}  ${title}  ${DIM}${status}${RESET}`;

  if (task.assignee) line += `  ${CYAN}@${task.assignee}${RESET}`;
  if (task.priority === 'critical') line += `  ${RED}!!CRITICAL${RESET}`;
  else if (task.priority === 'high') line += `  ${YELLOW}!high${RESET}`;
  if (task.deadline) {
    const dl = new Date(task.deadline);
    const now = new Date();
    const overdue = dl < now && !['completed', 'cancelled'].includes(task.status);
    line += `  ${overdue ? RED : DIM}due:${task.deadline}${RESET}`;
  }
  if (task.tags.length > 0) line += `  ${MAGENTA}${task.tags.map(t => '#' + t).join(' ')}${RESET}`;

  if (verbose) {
    if (task.description) line += `\n      ${DIM}${task.description}${RESET}`;
    if (task.dependsOn.length > 0) line += `\n      ${DIM}depends on: ${task.dependsOn.join(', ')}${RESET}`;
    if (task.estimatedMinutes) line += `\n      ${DIM}estimate: ${task.estimatedMinutes}min${RESET}`;
    line += `\n      ${DIM}created: ${task.createdAt}  updated: ${task.updatedAt}${RESET}`;
  }

  return line;
}

export function formatTaskList(tasks, opts = {}) {
  if (tasks.length === 0) return '  No tasks found.';
  return tasks.map(t => formatTask(t, opts)).join('\n');
}

export function formatSummary(summary) {
  let out = `\n${BOLD}Dashboard${RESET}\n`;
  out += `  Total: ${summary.total}  Agents: ${summary.agents}\n`;
  out += `  ${GREEN}●${RESET} completed: ${summary.counts.completed}`;
  out += `  ${CYAN}◉${RESET} in_progress: ${summary.counts.in_progress}`;
  out += `  blocked: ${summary.counts.blocked}`;
  out += `  pending: ${summary.counts.pending}`;
  out += `  failed: ${summary.counts.failed}\n`;

  if (summary.overdue.length > 0) {
    out += `\n  ${RED}${BOLD}Overdue:${RESET}\n`;
    for (const t of summary.overdue) {
      out += `    ${RED}${t.id}${RESET} ${t.title} (due ${t.deadline})\n`;
    }
  }
  return out;
}

export function formatHistory(entries) {
  if (entries.length === 0) return '  No history found.';
  return entries.map(e => {
    let line = `  ${DIM}${e.timestamp}${RESET}  ${BOLD}${e.action}${RESET}`;
    if (e.taskId) line += `  ${DIM}task:${e.taskId}${RESET}`;
    if (e.agentName) line += `  ${CYAN}@${e.agentName}${RESET}`;
    if (e.changes) {
      const keys = Object.keys(e.changes);
      line += `  ${keys.map(k => `${k}: ${JSON.stringify(e.changes[k].from)} → ${JSON.stringify(e.changes[k].to)}`).join(', ')}`;
    }
    return line;
  }).join('\n');
}

export function formatAgents(agents) {
  if (agents.length === 0) return '  No agents registered.';
  return agents.map(a => {
    return `  ${CYAN}@${a.name}${RESET}  ${DIM}type:${a.type}  registered:${a.registeredAt}${RESET}`;
  }).join('\n');
}

// JSON output for machine consumption
export function formatJSON(data) {
  return JSON.stringify(data, null, 2);
}
