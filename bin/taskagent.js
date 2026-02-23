#!/usr/bin/env node

import { TaskManager } from '../src/tasks.js';
import {
  formatTask, formatTaskList, formatSummary,
  formatHistory, formatAgents, formatJSON,
} from '../src/format.js';
import { computeDashboardData } from '../src/dashboard/data.js';
import { renderDashboard } from '../src/dashboard/render.js';

const args = process.argv.slice(2);
const cmd = args[0];
const sub = args[1];

function flag(name) {
  const i = args.indexOf('--' + name);
  if (i === -1) return undefined;
  return args[i + 1];
}

function flagBool(name) {
  return args.includes('--' + name);
}

function flagList(name) {
  const v = flag(name);
  if (!v) return undefined;
  return v.split(',').map(s => s.trim());
}

const json = flagBool('json');
const verbose = flagBool('verbose') || flagBool('v');

function out(data, formatter) {
  if (json) {
    console.log(formatJSON(data));
  } else {
    console.log(formatter(data));
  }
}

function usage() {
  console.log(`
  taskagent - CLI task manager for agents & humans

  Usage:
    taskagent init                          Initialize .taskagent in current directory
    taskagent add <title> [options]         Create a task
    taskagent list [options]                List tasks (filter by --status, --assignee, --tag, --priority)
    taskagent show <id>                     Show task details
    taskagent update <id> [options]         Update a task
    taskagent status <id> <status>          Set task status (pending|in_progress|blocked|completed|failed|cancelled)
    taskagent assign <id> <agent>           Assign task to agent
    taskagent delete <id>                   Delete a task

    taskagent dep add <id> <depends-on-id>  Add dependency
    taskagent dep rm <id> <depends-on-id>   Remove dependency
    taskagent dep blockers <id>             Show unmet dependencies
    taskagent dep blocking <id>             Show tasks this blocks

    taskagent agent register <name> [--type human|agent]    Register an agent/person
    taskagent agent list                    List registered agents
    taskagent agent tasks <name>            Show agent's tasks

    taskagent history [id]                  Show change history (all or per-task)
    taskagent dashboard                     Show summary dashboard
    taskagent ui                            Rich terminal dashboard with kanban, deps, workload

  Options:
    --title <t>           Task title (for update)
    --desc <d>            Description
    --priority <p>        low|medium|high|critical
    --tags <t1,t2>        Comma-separated tags
    --deadline <date>     ISO date or YYYY-MM-DD
    --estimate <mins>     Estimated minutes
    --assignee <name>     Assign to agent
    --depends-on <id,id>  Dependencies (comma-separated)
    --status <s>          Filter by status
    --tag <t>             Filter by tag
    --json                Output as JSON
    --verbose, --v        Show full details
`);
}

try {
  const tm = (cmd !== 'init') ? new TaskManager() : null;

  switch (cmd) {
    case 'init': {
      new TaskManager();
      console.log('  Initialized .taskagent/');
      break;
    }

    case 'add': {
      const title = sub;
      if (!title) { console.error('  Error: title required. Usage: taskagent add "My task" [options]'); process.exit(1); }
      const task = tm.createTask({
        title,
        description: flag('desc'),
        priority: flag('priority'),
        tags: flagList('tags'),
        deadline: flag('deadline'),
        estimatedMinutes: flag('estimate') ? parseInt(flag('estimate')) : undefined,
        assignee: flag('assignee'),
        dependsOn: flagList('depends-on'),
      });
      if (json) { console.log(formatJSON(task)); }
      else { console.log(`  Created task ${task.id}`); console.log(formatTask(task, { verbose: true })); }
      break;
    }

    case 'list': {
      const tasks = tm.listTasks({
        status: flag('status'),
        assignee: flag('assignee'),
        tag: flag('tag'),
        priority: flag('priority'),
      });
      out(tasks, t => formatTaskList(t, { verbose }));
      break;
    }

    case 'show': {
      if (!sub) { console.error('  Error: task id required'); process.exit(1); }
      const task = tm.getTask(sub);
      if (json) { console.log(formatJSON(task)); }
      else { console.log(formatTask(task, { verbose: true })); }
      break;
    }

    case 'update': {
      if (!sub) { console.error('  Error: task id required'); process.exit(1); }
      const updates = {};
      if (flag('title')) updates.title = flag('title');
      if (flag('desc')) updates.description = flag('desc');
      if (flag('priority')) updates.priority = flag('priority');
      if (flag('status')) updates.status = flag('status');
      if (flagList('tags')) updates.tags = flagList('tags');
      if (flag('deadline')) updates.deadline = flag('deadline');
      if (flag('estimate')) updates.estimatedMinutes = parseInt(flag('estimate'));
      if (flag('assignee')) updates.assignee = flag('assignee');
      if (flagList('depends-on')) updates.dependsOn = flagList('depends-on');

      const task = tm.updateTask(sub, updates);
      if (json) { console.log(formatJSON(task)); }
      else { console.log(`  Updated task ${task.id}`); console.log(formatTask(task, { verbose: true })); }
      break;
    }

    case 'status': {
      if (!sub || !args[2]) { console.error('  Usage: taskagent status <id> <status>'); process.exit(1); }
      const task = tm.updateTask(sub, { status: args[2] });
      if (json) { console.log(formatJSON(task)); }
      else { console.log(`  ${sub} → ${args[2]}`); }
      break;
    }

    case 'assign': {
      if (!sub || !args[2]) { console.error('  Usage: taskagent assign <id> <agent>'); process.exit(1); }
      const task = tm.updateTask(sub, { assignee: args[2] });
      if (json) { console.log(formatJSON(task)); }
      else { console.log(`  ${sub} assigned to @${args[2]}`); }
      break;
    }

    case 'delete': {
      if (!sub) { console.error('  Error: task id required'); process.exit(1); }
      tm.deleteTask(sub);
      console.log(`  Deleted task ${sub}`);
      break;
    }

    case 'dep': {
      switch (sub) {
        case 'add': {
          if (!args[2] || !args[3]) { console.error('  Usage: taskagent dep add <id> <depends-on-id>'); process.exit(1); }
          tm.addDependency(args[2], args[3]);
          console.log(`  ${args[2]} now depends on ${args[3]}`);
          break;
        }
        case 'rm': {
          if (!args[2] || !args[3]) { console.error('  Usage: taskagent dep rm <id> <depends-on-id>'); process.exit(1); }
          tm.removeDependency(args[2], args[3]);
          console.log(`  Removed dependency ${args[2]} → ${args[3]}`);
          break;
        }
        case 'blockers': {
          if (!args[2]) { console.error('  Usage: taskagent dep blockers <id>'); process.exit(1); }
          const blockers = tm.getBlockers(args[2]);
          out(blockers, t => formatTaskList(t, { verbose }));
          break;
        }
        case 'blocking': {
          if (!args[2]) { console.error('  Usage: taskagent dep blocking <id>'); process.exit(1); }
          const blocking = tm.getBlocking(args[2]);
          out(blocking, t => formatTaskList(t, { verbose }));
          break;
        }
        default:
          console.error('  Usage: taskagent dep <add|rm|blockers|blocking> ...');
          process.exit(1);
      }
      break;
    }

    case 'agent': {
      switch (sub) {
        case 'register': {
          const name = args[2];
          if (!name) { console.error('  Usage: taskagent agent register <name> [--type human|agent]'); process.exit(1); }
          const agent = tm.registerAgent(name, { type: flag('type') || 'agent' });
          if (json) { console.log(formatJSON(agent)); }
          else { console.log(`  Registered @${name} (${agent.type})`); }
          break;
        }
        case 'list': {
          const agents = tm.listAgents();
          out(agents, formatAgents);
          break;
        }
        case 'tasks': {
          const name = args[2];
          if (!name) { console.error('  Usage: taskagent agent tasks <name>'); process.exit(1); }
          const tasks = tm.getAgentTasks(name);
          out(tasks, t => formatTaskList(t, { verbose }));
          break;
        }
        default:
          console.error('  Usage: taskagent agent <register|list|tasks> ...');
          process.exit(1);
      }
      break;
    }

    case 'history': {
      const entries = sub ? tm.getHistory(sub) : tm.getFullHistory();
      out(entries, formatHistory);
      break;
    }

    case 'dashboard': {
      const summary = tm.summary();
      if (json) { console.log(formatJSON(summary)); }
      else { console.log(formatSummary(summary)); }
      break;
    }

    case 'ui': {
      const rawData = tm.store._read();
      const viewModel = computeDashboardData(rawData);
      if (json) { console.log(formatJSON(viewModel)); }
      else { renderDashboard(viewModel); }
      break;
    }

    case 'help':
    case '--help':
    case '-h':
    case undefined:
      usage();
      break;

    default:
      console.error(`  Unknown command: ${cmd}`);
      usage();
      process.exit(1);
  }
} catch (err) {
  console.error(`  Error: ${err.message}`);
  process.exit(1);
}
