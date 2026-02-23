import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TaskManager } from '../tasks.js';
import { computeDashboardData } from '../dashboard/data.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function startServer({ port = 3000, open = true } = {}) {
  const tm = new TaskManager();
  const html = readFileSync(join(__dirname, 'index.html'), 'utf8');

  const server = http.createServer((req, res) => {
    if (req.url === '/api/dashboard') {
      const raw = tm.store._read();
      const data = computeDashboardData(raw);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(data));
    } else if (req.url === '/api/project') {
      const project = tm.getProject();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(project));
    } else if (req.url === '/api/tasks') {
      const tasks = tm.listTasks();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(tasks));
    } else if (req.url === '/api/agents') {
      const agents = tm.listAgents();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(agents));
    } else if (req.url === '/api/history') {
      const history = tm.getFullHistory();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(history));
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`  taskagent webui running at ${url}`);
    console.log('  Press Ctrl+C to stop\n');

    if (open) {
      import('node:child_process').then(({ exec }) => {
        const cmd = process.platform === 'darwin' ? 'open' :
                    process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${cmd} ${url}`);
      });
    }
  });

  return server;
}
