---
name: taskagent
description: CLI task manager for AI agents and humans. Use when coordinating work, tracking tasks with dependencies, managing blocking/blocked status, priorities, deadlines, or when the user asks to manage project tasks.
---

# TaskAgent — CLI Task Manager for Agents

Use this skill when coordinating work across agents or humans, tracking tasks with dependencies, managing blocking/blocked status, or when the user asks to manage project tasks.

## Prerequisites

taskagent must be installed globally (`npm install -g taskagent`) or available via npx.

Verify: `taskagent --help`

## Initialization

Always initialize with a project name and register before using:

```bash
taskagent init --name "My Project" --desc "What it does"
taskagent agent register claude --type agent
```

## Core Commands

### Create a task

```bash
taskagent add "Build auth API" --desc "JWT endpoints" --priority high --tags backend,auth --deadline 2026-03-01 --estimate 120 --assignee claude --depends-on <id,id>
```

### Manage status

```bash
taskagent status <id> in_progress
taskagent status <id> completed
taskagent status <id> blocked
taskagent status <id> failed
taskagent status <id> cancelled
```

### Query tasks

```bash
taskagent list                          # all tasks
taskagent list --status in_progress     # filter by status
taskagent list --assignee claude        # filter by agent
taskagent list --tag backend            # filter by tag
taskagent list --priority critical      # filter by priority
taskagent show <id>                     # single task details
taskagent agent tasks claude            # my assigned tasks
```

### Dependencies

```bash
taskagent dep add <id> <depends-on-id>  # add dependency
taskagent dep rm <id> <depends-on-id>   # remove dependency
taskagent dep blockers <id>             # unmet dependencies
taskagent dep blocking <id>             # what this blocks
```

A task cannot start (`in_progress`) until all its dependencies are `completed`. Cycles are detected and rejected.

### Update and reassign

```bash
taskagent update <id> --title "New title" --priority critical --deadline 2026-04-01
taskagent assign <id> bruno
taskagent delete <id>
```

### Project info

```bash
taskagent project                       # show project name/desc
taskagent project --name "New Name"     # update project
```

### Overview

```bash
taskagent dashboard                     # summary stats
taskagent ui                            # rich kanban board
taskagent webui                         # web dashboard on localhost:3000
taskagent history                       # full audit trail
taskagent history <id>                  # single task history
```

### JSON output

All commands support `--json` for programmatic parsing:

```bash
taskagent list --json
taskagent show <id> --json
taskagent dashboard --json
```

## Workflow

1. `taskagent init --name "Project Name"` + register yourself
2. `taskagent dashboard` to understand current state
3. `taskagent list --assignee claude` to see your tasks
4. `taskagent status <id> in_progress` before starting work
5. Do the work
6. `taskagent status <id> completed` when done
7. Move to the next task

## Rules

- Always mark `in_progress` before starting, `completed` when done
- Check `taskagent dep blockers <id>` before starting a task
- Use `--json` when you need to parse output
- Register agents before assigning tasks to them
- Use tags for cross-cutting concerns (bug, frontend, urgent)
- The audit trail in `taskagent history` tracks every change
