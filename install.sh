#!/usr/bin/env bash
set -euo pipefail

REPO="https://github.com/brunoqgalvao/taskagent.git"
INSTALL_DIR="${HOME}/.taskagent-cli"

echo "  Installing taskagent..."

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "  Error: Node.js >= 18 is required. Install it first."
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "  Error: Node.js >= 18 required (found v$(node --version))"
  exit 1
fi

# Clone or update
if [ -d "$INSTALL_DIR" ]; then
  echo "  Updating existing installation..."
  cd "$INSTALL_DIR" && git pull --quiet
else
  echo "  Cloning from $REPO..."
  git clone --quiet "$REPO" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# npm link creates the global symlink
npm link --quiet 2>/dev/null || {
  echo "  npm link failed - trying with sudo..."
  sudo npm link --quiet
}

echo "  taskagent installed! Run 'taskagent --help' to get started."
echo ""
echo "  Quick start:"
echo "    cd your-project"
echo "    taskagent init"
echo "    taskagent agent register my-name --type human"
echo "    taskagent add \"My first task\" --priority high"
