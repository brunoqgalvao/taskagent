# taskagent

A CLI task manager built for AI agents and humans to collaborate on projects. Track tasks with dependencies, priorities, deadlines, assignments, and full version history.

Zero dependencies. Pure Node.js. Works anywhere.

## Install

```bash
npx taskagent --help
```

Or install globally:

```bash
npm install -g taskagent
```

Or clone and link:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/brunoqgalvao/taskagent/main/install.sh)
```

## Quick Start

```bash
# Initialize in your project
taskagent init

# Register yourself
taskagent agent register bruno --type human
taskagent agent register claude --type agent

# Create tasks
taskagent add "Build auth API" --desc "JWT endpoints" --priority high --assignee claude
taskagent add "Write tests" --priority medium --assignee bruno

# Work on tasks
taskagent status <id> in_progress
taskagent status <id> completed

# See what's happening
taskagent dashboard
taskagent list --status in_progress
```

## Features

- **Task lifecycle**: pending, in_progress, blocked, completed, failed, cancelled
- **Dependencies**: tasks can depend on other tasks, with cycle detection
- **Priorities**: low, medium, high, critical
- **Agent registry**: register humans and AI agents with identity tracking
- **Tags & deadlines**: categorize and time-bound your work
- **Full history**: append-only changelog with snapshots for every change
- **JSON output**: `--json` flag on every command for programmatic use
- **Dashboard**: summary view of project state
- **Zero dependencies**: just Node.js >= 18

## Commands

```
taskagent init                          Initialize .taskagent/ in current directory
taskagent add <title> [options]         Create a task
taskagent list [options]                List tasks (--status, --assignee, --tag, --priority)
taskagent show <id>                     Show full task details
taskagent update <id> [options]         Update a task
taskagent status <id> <status>          Set task status
taskagent assign <id> <agent>           Assign task to agent
taskagent delete <id>                   Delete a task

taskagent dep add <id> <dep-id>         Add dependency
taskagent dep rm <id> <dep-id>          Remove dependency
taskagent dep blockers <id>             Show unmet dependencies
taskagent dep blocking <id>             Show what this task blocks

taskagent agent register <name> [--type human|agent]
taskagent agent list                    List registered agents
taskagent agent tasks <name>            Show agent's tasks

taskagent history [id]                  Show change history
taskagent dashboard                     Summary dashboard
```

### Task Options

| Flag | Description |
|------|-------------|
| `--desc <text>` | Task description |
| `--priority <p>` | low, medium, high, critical |
| `--tags <t1,t2>` | Comma-separated tags |
| `--deadline <date>` | YYYY-MM-DD |
| `--estimate <mins>` | Estimated minutes |
| `--assignee <name>` | Registered agent name |
| `--depends-on <id,id>` | Dependency task IDs |
| `--json` | JSON output |
| `--verbose` | Detailed view |

## Claude Code Skill

To use taskagent as a Claude Code skill, copy the skill file into your project:

```bash
mkdir -p .claude/skills
curl -fsSL https://raw.githubusercontent.com/brunoqgalvao/taskagent/main/.claude/skills/taskagent.md \
  -o .claude/skills/taskagent.md
```

## Data Storage

All data lives in `.taskagent/` in your project root:
- `tasks.json` - current state
- `history.jsonl` - append-only audit trail

Safe to commit to git for team collaboration.

## License

MIT
