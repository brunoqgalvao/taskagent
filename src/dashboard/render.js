// ANSI escape codes
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Box drawing characters
const BOX = {
  h: '─',
  v: '│',
  tl: '┌',
  tr: '┐',
  bl: '└',
  br: '┘',
  ml: '├',
  mr: '┤',
  mt: '┬',
  mb: '┴',
  cross: '┼',
};

// Status icons
const STATUS_ICONS = {
  pending: '○',
  in_progress: '◉',
  completed: '●',
  blocked: '⊘',
  failed: '✗',
  cancelled: '·',
};

// Priority icons
const PRIORITY_ICONS = {
  critical: '!!',
  high: '!',
  medium: '·',
  low: '○',
};

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len - 1) + '…' : str.padEnd(len);
}

function repeat(char, count) {
  return char.repeat(Math.max(0, count));
}

function buildHeader(data) {
  const { stats } = data;
  const overdueCount = data.overdue?.length || 0;
  const width = process.stdout.columns || 80;

  let lines = [];
  lines.push(ANSI.bold + ANSI.cyan + repeat(BOX.h, width) + ANSI.reset);

  const title = '  TASKAGENT DASHBOARD  ';
  const statsText = `Total: ${stats.total} | Done: ${stats.percentComplete}% | Overdue: ${overdueCount}`;
  const padding = Math.max(0, Math.floor((width - title.length - statsText.length) / 2));

  lines.push(
    ANSI.bold + ANSI.cyan + title + ANSI.reset +
    repeat(' ', padding) +
    (overdueCount > 0 ? ANSI.red : ANSI.green) + statsText + ANSI.reset
  );

  lines.push(ANSI.cyan + repeat(BOX.h, width) + ANSI.reset);
  lines.push('');

  return lines.join('\n');
}

function buildKanbanBoard(data) {
  const { columns } = data;
  const width = process.stdout.columns || 80;
  const colWidth = Math.floor((width - 6) / 3); // 3 columns with borders
  const maxTasks = 8;

  const cols = [
    { key: 'pending', title: 'PENDING', color: ANSI.yellow },
    { key: 'in_progress', title: 'IN PROGRESS', color: ANSI.blue },
    { key: 'completed', title: 'DONE', color: ANSI.green },
  ];

  let lines = [];
  lines.push(ANSI.bold + '📋 KANBAN BOARD' + ANSI.reset);
  lines.push('');

  // Header row
  let header = cols.map(col =>
    col.color + BOX.tl + repeat(BOX.h, colWidth - 2) + BOX.tr + ANSI.reset
  ).join('');
  lines.push(header);

  // Title row
  let titleRow = cols.map(col =>
    col.color + BOX.v + ANSI.bold + truncate(col.title, colWidth - 2) + ANSI.reset + col.color + BOX.v + ANSI.reset
  ).join('');
  lines.push(titleRow);

  // Separator
  let sep = cols.map(col =>
    col.color + BOX.ml + repeat(BOX.h, colWidth - 2) + BOX.mr + ANSI.reset
  ).join('');
  lines.push(sep);

  // Task rows
  const maxRows = Math.max(...cols.map(col => Math.min(maxTasks, (columns[col.key] || []).length)));

  for (let i = 0; i < maxRows; i++) {
    let row = cols.map(col => {
      const tasks = columns[col.key] || [];
      const task = tasks[i];

      if (!task) {
        return col.color + BOX.v + repeat(' ', colWidth - 2) + BOX.v + ANSI.reset;
      }

      const priorityIcon = PRIORITY_ICONS[task.priority] || '';
      const taskText = `${priorityIcon} ${task.title}`;
      const assignee = task.assignee ? ANSI.dim + ` @${task.assignee}` + ANSI.reset : '';
      const content = truncate(taskText, colWidth - 4) + assignee;

      return col.color + BOX.v + ' ' + ANSI.reset + content + col.color + repeat(' ', colWidth - 2 - stripAnsi(content).length) + BOX.v + ANSI.reset;
    }).join('');
    lines.push(row);
  }

  // Show overflow count
  let overflow = cols.map(col => {
    const tasks = columns[col.key] || [];
    const extra = tasks.length - maxTasks;
    const text = extra > 0 ? ANSI.dim + `+${extra} more` + ANSI.reset : '';
    return col.color + BOX.v + ' ' + ANSI.reset + truncate(text, colWidth - 4) + col.color + repeat(' ', colWidth - 2 - stripAnsi(text).length) + BOX.v + ANSI.reset;
  }).join('');
  lines.push(overflow);

  // Footer
  let footer = cols.map(col =>
    col.color + BOX.bl + repeat(BOX.h, colWidth - 2) + BOX.br + ANSI.reset
  ).join('');
  lines.push(footer);
  lines.push('');

  return lines.join('\n');
}

function buildDependencyGraph(data) {
  const { graph } = data;
  if (!graph || !graph.layers || graph.layers.length === 0) {
    return '';
  }

  let lines = [];
  lines.push(ANSI.bold + '🔗 DEPENDENCY GRAPH' + ANSI.reset);
  lines.push('');

  const nodeMap = new Map();
  (graph.nodes || []).forEach(node => nodeMap.set(node.id, node));

  graph.layers.forEach((layer, layerIdx) => {
    const prefix = repeat('  ', layerIdx);

    layer.forEach((nodeId, idx) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;

      const icon = STATUS_ICONS[node.status] || '○';
      const color = node.status === 'completed' ? ANSI.green :
                    node.status === 'in_progress' ? ANSI.blue :
                    node.status === 'blocked' ? ANSI.red :
                    node.status === 'failed' ? ANSI.red : ANSI.gray;

      const connector = idx === layer.length - 1 ? BOX.bl + BOX.h : BOX.ml + BOX.h;
      const line = prefix + ANSI.gray + connector + ANSI.reset + ' ' + color + icon + ' ' + truncate(node.title, 50) + ANSI.reset;
      lines.push(line);
    });
  });

  lines.push('');
  return lines.join('\n');
}

function buildAgentWorkload(data) {
  const { agents } = data;
  if (!agents || agents.length === 0) {
    return '';
  }

  let lines = [];
  lines.push(ANSI.bold + '👥 AGENT WORKLOAD' + ANSI.reset);
  lines.push('');

  const maxBarWidth = 30;
  const maxTasks = Math.max(...agents.map(a => a.total || 0), 1);

  agents.forEach(agent => {
    const total = agent.total || 0;
    const inProgress = agent.inProgress || 0;

    const barWidth = Math.floor((total / maxTasks) * maxBarWidth);
    const filled = Math.floor((inProgress / maxTasks) * maxBarWidth);

    const color = total > 5 ? ANSI.red : total >= 3 ? ANSI.yellow : ANSI.green;
    const bar = color + repeat('█', filled) + ANSI.dim + repeat('░', barWidth - filled) + ANSI.reset;

    const label = truncate(`${agent.name} (${agent.type})`, 25);
    const stats = ANSI.dim + `${inProgress}/${total} tasks` + ANSI.reset;

    lines.push(`${label} ${bar} ${stats}`);
  });

  lines.push('');
  return lines.join('\n');
}

function buildOverdueWarnings(data) {
  const { overdue } = data;
  if (!overdue || overdue.length === 0) {
    return '';
  }

  let lines = [];
  lines.push(ANSI.bold + ANSI.red + '⚠️  OVERDUE TASKS' + ANSI.reset);
  lines.push('');

  overdue.forEach(task => {
    const daysText = task.daysOverdue === 1 ? '1 day' : `${task.daysOverdue} days`;
    const assigneeText = task.assignee ? ` (@${task.assignee})` : '';
    lines.push(
      ANSI.red + '  • ' + ANSI.reset +
      ANSI.bold + task.title + ANSI.reset +
      ANSI.dim + ` - ${daysText} overdue${assigneeText}` + ANSI.reset
    );
  });

  lines.push('');
  return lines.join('\n');
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function renderDashboard(data) {
  let output = '';

  output += buildHeader(data);
  output += buildKanbanBoard(data);
  output += buildDependencyGraph(data);
  output += buildAgentWorkload(data);
  output += buildOverdueWarnings(data);

  output += ANSI.dim + repeat(BOX.h, process.stdout.columns || 80) + ANSI.reset + '\n';

  process.stdout.write(output);
  return output;
}
