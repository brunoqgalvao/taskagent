import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const STORE_DIR = '.taskagent';
const TASKS_FILE = 'tasks.json';
const HISTORY_FILE = 'history.jsonl';

export class Store {
  constructor(rootDir = process.cwd()) {
    this.dir = join(rootDir, STORE_DIR);
    this.tasksPath = join(this.dir, TASKS_FILE);
    this.historyPath = join(this.dir, HISTORY_FILE);
  }

  init() {
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
    if (!existsSync(this.tasksPath)) {
      writeFileSync(this.tasksPath, JSON.stringify({ project: null, tasks: {}, agents: {} }, null, 2));
    }
    if (!existsSync(this.historyPath)) {
      writeFileSync(this.historyPath, '');
    }
    return this;
  }

  _read() {
    return JSON.parse(readFileSync(this.tasksPath, 'utf8'));
  }

  _write(data) {
    writeFileSync(this.tasksPath, JSON.stringify(data, null, 2));
  }

  _appendHistory(entry) {
    const record = {
      timestamp: new Date().toISOString(),
      ...entry,
    };
    writeFileSync(this.historyPath, JSON.stringify(record) + '\n', { flag: 'a' });
  }

  readHistory(taskId) {
    if (!existsSync(this.historyPath)) return [];
    const lines = readFileSync(this.historyPath, 'utf8').trim().split('\n').filter(Boolean);
    const entries = lines.map(l => JSON.parse(l));
    if (taskId) return entries.filter(e => e.taskId === taskId);
    return entries;
  }
}
