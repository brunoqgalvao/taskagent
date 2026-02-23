# taskagent — Agent Usage Guide

This document teaches AI agents how to use taskagent effectively. If you are an AI agent reading this, follow these instructions precisely.

## Setup

Before doing anything, initialize with a project name and register yourself:

```bash
taskagent init --name "My API" --desc "Backend services for the platform"
taskagent agent register <your-name> --type agent
```

The `--name` and `--desc` flags are optional but recommended — they show up in dashboards and help identify which project you're working in.

If there are human collaborators, register them too:

```bash
taskagent agent register bruno --type human
```

Check who's already registered:

```bash
taskagent agent list
```

## Creating Tasks

```bash
taskagent add "Build auth API" \
  --desc "JWT-based authentication with refresh tokens" \
  --priority high \
  --tags backend,auth \
  --deadline 2026-03-01 \
  --estimate 120 \
  --assignee claude
```

All flags are optional except the title (first argument).

| Flag | Values | Default |
|------|--------|---------|
| `--desc` | Free text | empty |
| `--priority` | low, medium, high, critical | medium |
| `--tags` | Comma-separated strings | none |
| `--deadline` | YYYY-MM-DD | none |
| `--estimate` | Minutes (integer) | none |
| `--assignee` | Registered agent name | none |
| `--depends-on` | Comma-separated task IDs | none |

The command prints the new task ID. Save it — you'll need it for status updates.

## Task Lifecycle

Every task moves through statuses:

```
pending → in_progress → completed
                      → failed
                      → cancelled
         blocked ↔ in_progress
```

Update status:

```bash
taskagent status <id> in_progress    # starting work
taskagent status <id> blocked        # waiting on something
taskagent status <id> completed      # done
taskagent status <id> failed         # couldn't finish
taskagent status <id> cancelled      # no longer needed
```

**Rule**: A task cannot move to `in_progress` if it has unmet dependencies. Complete the dependencies first.

## Dependencies

Tasks can depend on other tasks. The system enforces ordering and detects cycles.

```bash
taskagent dep add <task-id> <depends-on-id>     # task depends on another
taskagent dep rm <task-id> <depends-on-id>       # remove dependency
taskagent dep blockers <task-id>                 # what's blocking this?
taskagent dep blocking <task-id>                 # what does this block?
```

You can also set dependencies at creation time:

```bash
taskagent add "Deploy" --depends-on abc123,def456
```

Cycle detection is automatic. If adding a dependency would create a circular chain (A→B→C→A), the command fails.

## Querying Tasks

### List with filters

```bash
taskagent list                          # everything
taskagent list --status pending         # only pending
taskagent list --status in_progress     # only active
taskagent list --assignee claude        # my tasks
taskagent list --tag backend            # by tag
taskagent list --priority critical      # by priority
taskagent list --verbose                # full details
```

### Show a single task

```bash
taskagent show <id>
```

### Get your assigned tasks

```bash
taskagent agent tasks <your-name>
```

## Updating Tasks

Change any field on an existing task:

```bash
taskagent update <id> --title "New title"
taskagent update <id> --priority critical --deadline 2026-04-01
taskagent update <id> --tags backend,urgent --desc "Updated scope"
```

Reassign:

```bash
taskagent assign <id> bruno
```

Delete:

```bash
taskagent delete <id>
```

Deleting a task automatically removes it from other tasks' dependency lists.

## History & Audit Trail

Every mutation is recorded in an append-only log with full before/after snapshots.

```bash
taskagent history              # full project history
taskagent history <id>         # history for one task
```

History entries include:
- Timestamp
- Action (task_created, task_updated, task_deleted, dependency_added, agent_registered, etc.)
- Task ID
- Changes diff (field: from → to)
- Full snapshot of the task at that point

## Project Info

View current project:

```bash
taskagent project
```

Update project name or description:

```bash
taskagent project --name "New Name" --desc "Updated description"
```

JSON output:

```bash
taskagent project --json
```

### Project Object Shape

```json
{
  "name": "My API",
  "description": "Backend services for the platform",
  "createdAt": "2026-02-23T10:00:00.000Z",
  "updatedAt": "2026-02-23T11:30:00.000Z"
}
```

## Dashboard

Quick summary:

```bash
taskagent dashboard
```

Rich terminal UI with kanban board, dependency graph, agent workload bars, and overdue warnings:

```bash
taskagent ui
```

Web dashboard in the browser (auto-refreshes every 5 seconds):

```bash
taskagent webui                         # opens http://localhost:3000
taskagent webui --port 8080             # custom port
taskagent webui --no-open               # don't auto-open browser
```

## JSON Output

Every command supports `--json` for machine-readable output:

```bash
taskagent list --json                   # JSON array of task objects
taskagent show <id> --json              # single task object
taskagent dashboard --json              # summary stats
taskagent ui --json                     # full dashboard view model
taskagent agent list --json             # agent array
taskagent history --json                # history entries
```

### Task Object Shape

```json
{
  "id": "a1b2c3d4",
  "title": "Build auth API",
  "description": "JWT-based auth endpoints",
  "status": "in_progress",
  "priority": "high",
  "tags": ["backend", "auth"],
  "deadline": "2026-03-01",
  "estimatedMinutes": 120,
  "assignee": "claude",
  "dependsOn": ["f5e6d7c8"],
  "createdAt": "2026-02-23T10:00:00.000Z",
  "updatedAt": "2026-02-23T11:30:00.000Z"
}
```

### Dashboard JSON Shape

```json
{
  "columns": {
    "pending": [...tasks],
    "in_progress": [...tasks],
    "blocked": [...tasks],
    "completed": [...tasks],
    "failed": [...tasks],
    "cancelled": [...tasks]
  },
  "agents": [
    { "name": "claude", "type": "agent", "total": 5, "inProgress": 2, "completed": 1, "pending": 2 }
  ],
  "graph": {
    "nodes": [{ "id": "...", "title": "...", "status": "...", "layer": 0 }],
    "edges": [{ "from": "...", "to": "..." }],
    "layers": [["id1", "id2"], ["id3"]]
  },
  "overdue": [
    { "id": "...", "title": "...", "deadline": "...", "assignee": "...", "daysOverdue": 3 }
  ],
  "stats": {
    "total": 10,
    "completed": 3,
    "inProgress": 2,
    "blocked": 1,
    "pending": 3,
    "failed": 1,
    "cancelled": 0,
    "percentComplete": 30
  }
}
```

## Agent Best Practices

1. **Always `taskagent init --name "Project Name"` and register yourself** at the start of a session
2. **Check the dashboard first** — run `taskagent dashboard` or `taskagent list` to understand project state before doing anything
3. **Mark tasks `in_progress` before starting** — this signals to other agents and humans what you're working on
4. **Mark tasks `completed` immediately when done** — don't batch completions
5. **Mark tasks `blocked` with a reason** — if you can't proceed, update the description to explain why
6. **Use dependencies to express ordering** — the system prevents starting tasks with unmet deps, so use this to enforce workflow
7. **Use `--json` when parsing output programmatically** — the human-readable format contains ANSI color codes
8. **Use tags for cross-cutting concerns** — `bug`, `frontend`, `backend`, `urgent`, etc.
9. **Check `taskagent dep blockers <id>`** before starting a task — even if the system allows it, understanding the dependency chain helps planning
10. **Use `taskagent history <id>`** to understand what changed and why — the audit trail is your memory

## Data Storage

All data lives in `.taskagent/` relative to where you ran `taskagent init`:

- `tasks.json` — current state (tasks + agents)
- `history.jsonl` — append-only changelog

Both files are plain JSON/JSONL. Safe to commit to git. The store uses synchronous file I/O, so concurrent writes from multiple processes could conflict — coordinate through task status rather than parallel writes.

## Error Handling

Common errors and what they mean:

| Error | Cause | Fix |
|-------|-------|-----|
| `Task "X" not found` | Invalid task ID | Run `taskagent list` to get valid IDs |
| `Agent "X" not registered` | Assigning to unknown agent | Run `taskagent agent register X` first |
| `Dependencies not met` | Starting a task with incomplete deps | Complete the dependency tasks first |
| `Would create a cycle` | Circular dependency chain | Restructure your dependency graph |
| `Invalid status` | Typo in status name | Use: pending, in_progress, blocked, completed, failed, cancelled |
| `Invalid priority` | Typo in priority name | Use: low, medium, high, critical |
| `Already registered` | Duplicate agent name | Agent exists, you're good |
