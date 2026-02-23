# TaskAgent - CLI Task Manager for Agents

Use this skill when coordinating work across agents or humans, tracking tasks with dependencies, managing blocking/blocked status, or when the user asks to manage project tasks.

## Setup

Install globally via npm:

```bash
npm install -g taskagent
```

Or run directly with npx (no install needed):

```bash
npx taskagent --help
```

Or use the install script:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/brunoqgalvao/taskagent/main/install.sh)
```

Verify installation: `taskagent --help`

## Quick Start

Before using tasks, always initialize and register yourself:

```bash
taskagent init                          # Creates .taskagent/ in current directory
taskagent agent register claude --type agent
```

## Core Workflow

### 1. Register agents involved in the project

```bash
taskagent agent register claude --type agent
taskagent agent register bruno --type human
```

### 2. Create tasks with metadata

```bash
taskagent add "Build auth API" --desc "JWT-based auth endpoints" --priority high --tags backend,auth --deadline 2026-03-01 --estimate 120 --assignee claude
```

Options:
- `--desc` : Description of what needs to be done
- `--priority` : low | medium | high | critical
- `--tags` : Comma-separated tags for categorization
- `--deadline` : ISO date (YYYY-MM-DD)
- `--estimate` : Estimated minutes to complete
- `--assignee` : Registered agent/person name
- `--depends-on` : Comma-separated task IDs this depends on

### 3. Manage task status

```bash
taskagent status <id> in_progress    # I'm working on this
taskagent status <id> blocked        # Something is blocking me
taskagent status <id> completed      # Done!
taskagent status <id> failed         # Couldn't complete
taskagent status <id> cancelled      # No longer needed
```

Valid status flow: pending → in_progress → blocked/completed/failed/cancelled

### 4. Set up dependencies

```bash
taskagent dep add <task-id> <depends-on-id>   # task depends on another
taskagent dep rm <task-id> <depends-on-id>     # remove dependency
taskagent dep blockers <task-id>               # what's blocking this task?
taskagent dep blocking <task-id>               # what does this task block?
```

Important: A task cannot move to `in_progress` if its dependencies aren't `completed`.

### 5. View and filter tasks

```bash
taskagent list                          # All tasks
taskagent list --status in_progress     # Only active tasks
taskagent list --assignee claude        # My tasks
taskagent list --tag backend            # By tag
taskagent list --priority critical      # By priority
taskagent show <id>                     # Full task details
taskagent list --verbose                # Detailed view
```

### 6. Reassign and update tasks

```bash
taskagent assign <id> bruno             # Reassign to someone else
taskagent update <id> --title "New name" --priority critical --deadline 2026-04-01
```

### 7. Check history and dashboard

```bash
taskagent dashboard                     # Summary of all tasks
taskagent history                       # Full changelog
taskagent history <id>                  # History for one task
```

### 8. JSON output for programmatic use

All commands support `--json` flag for machine-readable output:

```bash
taskagent list --json                   # JSON array of tasks
taskagent show <id> --json              # JSON task object
taskagent dashboard --json              # JSON summary
```

## Agent Best Practices

1. **Always register yourself** at the start of a session: `taskagent agent register <your-name> --type agent`
2. **Mark tasks in_progress** before you start working on them
3. **Mark tasks blocked** if you hit a dependency or need input, and explain in a task update
4. **Mark tasks completed** immediately when done - don't batch
5. **Use dependencies** to express task ordering. The system prevents starting tasks with unmet deps
6. **Use tags** for cross-cutting concerns (e.g., `backend`, `urgent`, `bug`)
7. **Check the dashboard** at the start of a session to understand project state
8. **Use --json** when you need to parse output programmatically
9. **All changes are versioned** - use `taskagent history <id>` to see the full audit trail

## Data Storage

- All data lives in `.taskagent/` in the project root
- `tasks.json` - Current state of all tasks and agents
- `history.jsonl` - Append-only changelog with full snapshots
- Safe to commit to git for collaboration
