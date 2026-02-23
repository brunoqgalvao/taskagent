# taskagent

A CLI task manager built for AI agents and humans to collaborate on projects.

Track tasks with dependencies, priorities, deadlines, assignments, and full version history. Zero dependencies. Pure Node.js.

## Install

```bash
npm install -g taskagent
```

Or run with npx:

```bash
npx taskagent --help
```

Or install from source:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/brunoqgalvao/taskagent/main/install.sh)
```

## Quick Start

```bash
taskagent init --name "My Project" --desc "What this project is about"

taskagent agent register bruno --type human
taskagent agent register claude --type agent

taskagent add "Build auth API" --desc "JWT endpoints" --priority high --assignee claude
taskagent add "Write tests" --priority medium --assignee bruno

taskagent status <id> in_progress
taskagent status <id> completed

taskagent dashboard
taskagent ui
```

## Features

- **Project scope** — name your project on init, view/update with `taskagent project`
- **Task lifecycle** — pending, in_progress, blocked, completed, failed, cancelled
- **Dependencies** — tasks depend on other tasks, with cycle detection
- **Priorities** — low, medium, high, critical
- **Agent registry** — register humans and AI agents with identity tracking
- **Tags & deadlines** — categorize and time-bound work
- **Full history** — append-only changelog with snapshots for every mutation
- **JSON output** — `--json` on every command for programmatic use
- **Dashboard** — summary view and rich TUI kanban board (`taskagent ui`)
- **Web UI** — browser-based dashboard on localhost (`taskagent webui`)
- **Zero dependencies** — just Node.js >= 18

## Commands

```
taskagent init [--name <n>] [--desc <d>] Initialize .taskagent/ in current directory
taskagent project [--name <n>] [--desc <d>]  Show or update project info
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
taskagent ui                            Rich terminal dashboard with kanban, deps, workload
taskagent webui [--port <n>] [--no-open] Web dashboard on localhost
```

### Options

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

## Data Storage

All data lives in `.taskagent/` in your project root:

- `tasks.json` — current state of all tasks and agents
- `history.jsonl` — append-only audit trail with full snapshots

Safe to commit to git for team collaboration.

## For AI Agents

See [docs.md](docs.md) for detailed usage instructions written for AI agents, covering workflows, best practices, and the `--json` interface.

## License

MIT
