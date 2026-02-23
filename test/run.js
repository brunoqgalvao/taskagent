import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TaskManager } from '../src/tasks.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'taskagent-test-'));
  try {
    fn(new TaskManager(dir));
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}: ${err.message}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion failed'); }
function assertThrows(fn, match) {
  try { fn(); throw new Error('Expected error but none thrown'); }
  catch (e) { if (match && !e.message.includes(match)) throw new Error(`Expected "${match}" but got "${e.message}"`); }
}

console.log('\n  taskagent tests\n');

// ── Task CRUD ──

test('create task with minimal fields', (tm) => {
  const t = tm.createTask({ title: 'Hello' });
  assert(t.id, 'should have id');
  assert(t.title === 'Hello');
  assert(t.status === 'pending');
  assert(t.priority === 'medium');
});

test('create task with all fields', (tm) => {
  tm.registerAgent('bot');
  const t = tm.createTask({
    title: 'Full task',
    description: 'desc',
    priority: 'high',
    tags: ['backend', 'urgent'],
    deadline: '2026-03-01',
    estimatedMinutes: 30,
    assignee: 'bot',
  });
  assert(t.description === 'desc');
  assert(t.priority === 'high');
  assert(t.tags.length === 2);
  assert(t.deadline === '2026-03-01');
  assert(t.estimatedMinutes === 30);
  assert(t.assignee === 'bot');
});

test('get task by id', (tm) => {
  const t = tm.createTask({ title: 'Find me' });
  const found = tm.getTask(t.id);
  assert(found.title === 'Find me');
});

test('get nonexistent task throws', (tm) => {
  assertThrows(() => tm.getTask('nope'), 'not found');
});

test('list tasks with filters', (tm) => {
  tm.registerAgent('a1');
  tm.createTask({ title: 'A', priority: 'high', assignee: 'a1', tags: ['x'] });
  tm.createTask({ title: 'B', priority: 'low', tags: ['y'] });

  assert(tm.listTasks().length === 2);
  assert(tm.listTasks({ priority: 'high' }).length === 1);
  assert(tm.listTasks({ assignee: 'a1' }).length === 1);
  assert(tm.listTasks({ tag: 'y' }).length === 1);
});

test('update task fields', (tm) => {
  const t = tm.createTask({ title: 'Old' });
  const updated = tm.updateTask(t.id, { title: 'New', priority: 'critical' });
  assert(updated.title === 'New');
  assert(updated.priority === 'critical');
});

test('update task status', (tm) => {
  const t = tm.createTask({ title: 'Work' });
  tm.updateTask(t.id, { status: 'in_progress' });
  const task = tm.getTask(t.id);
  assert(task.status === 'in_progress');
});

test('invalid status throws', (tm) => {
  const t = tm.createTask({ title: 'X' });
  assertThrows(() => tm.updateTask(t.id, { status: 'yolo' }), 'Invalid status');
});

test('invalid priority throws', (tm) => {
  assertThrows(() => tm.createTask({ title: 'X', priority: 'super' }), 'Invalid priority');
});

test('delete task', (tm) => {
  const t = tm.createTask({ title: 'Bye' });
  tm.deleteTask(t.id);
  assertThrows(() => tm.getTask(t.id), 'not found');
});

test('delete removes from dependencies', (tm) => {
  const a = tm.createTask({ title: 'A' });
  const b = tm.createTask({ title: 'B', dependsOn: [a.id] });
  tm.deleteTask(a.id);
  const bNow = tm.getTask(b.id);
  assert(bNow.dependsOn.length === 0);
});

// ── Dependencies ──

test('add dependency', (tm) => {
  const a = tm.createTask({ title: 'A' });
  const b = tm.createTask({ title: 'B' });
  tm.addDependency(b.id, a.id);
  const task = tm.getTask(b.id);
  assert(task.dependsOn.includes(a.id));
});

test('self-dependency throws', (tm) => {
  const a = tm.createTask({ title: 'A' });
  assertThrows(() => tm.addDependency(a.id, a.id), 'cannot depend on itself');
});

test('cycle detection', (tm) => {
  const a = tm.createTask({ title: 'A' });
  const b = tm.createTask({ title: 'B' });
  const c = tm.createTask({ title: 'C' });
  tm.addDependency(b.id, a.id);
  tm.addDependency(c.id, b.id);
  assertThrows(() => tm.addDependency(a.id, c.id), 'cycle');
});

test('cannot start task with unmet deps', (tm) => {
  const a = tm.createTask({ title: 'A' });
  const b = tm.createTask({ title: 'B', dependsOn: [a.id] });
  assertThrows(() => tm.updateTask(b.id, { status: 'in_progress' }), 'dependencies not met');
});

test('can start task after deps completed', (tm) => {
  const a = tm.createTask({ title: 'A' });
  const b = tm.createTask({ title: 'B', dependsOn: [a.id] });
  tm.updateTask(a.id, { status: 'in_progress' });
  tm.updateTask(a.id, { status: 'completed' });
  tm.updateTask(b.id, { status: 'in_progress' });
  assert(tm.getTask(b.id).status === 'in_progress');
});

test('get blockers returns unmet deps', (tm) => {
  const a = tm.createTask({ title: 'A' });
  const b = tm.createTask({ title: 'B', dependsOn: [a.id] });
  const blockers = tm.getBlockers(b.id);
  assert(blockers.length === 1);
  assert(blockers[0].id === a.id);
});

test('get blocking returns downstream tasks', (tm) => {
  const a = tm.createTask({ title: 'A' });
  const b = tm.createTask({ title: 'B', dependsOn: [a.id] });
  const blocking = tm.getBlocking(a.id);
  assert(blocking.length === 1);
  assert(blocking[0].id === b.id);
});

// ── Agents ──

test('register and list agents', (tm) => {
  tm.registerAgent('claude', { type: 'agent' });
  tm.registerAgent('bruno', { type: 'human' });
  const agents = tm.listAgents();
  assert(agents.length === 2);
});

test('duplicate agent throws', (tm) => {
  tm.registerAgent('x');
  assertThrows(() => tm.registerAgent('x'), 'already registered');
});

test('assign to unregistered agent throws', (tm) => {
  assertThrows(() => tm.createTask({ title: 'X', assignee: 'ghost' }), 'not registered');
});

test('agent tasks', (tm) => {
  tm.registerAgent('worker');
  tm.createTask({ title: 'T1', assignee: 'worker' });
  tm.createTask({ title: 'T2', assignee: 'worker' });
  tm.createTask({ title: 'T3' });
  assert(tm.getAgentTasks('worker').length === 2);
});

// ── History ──

test('history tracks creation', (tm) => {
  const t = tm.createTask({ title: 'Track me' });
  const h = tm.getHistory(t.id);
  assert(h.length === 1);
  assert(h[0].action === 'task_created');
});

test('history tracks updates with diff', (tm) => {
  const t = tm.createTask({ title: 'V1' });
  tm.updateTask(t.id, { title: 'V2', status: 'in_progress' });
  const h = tm.getHistory(t.id);
  assert(h.length === 2);
  assert(h[1].changes.title.from === 'V1');
  assert(h[1].changes.title.to === 'V2');
});

test('full history includes everything', (tm) => {
  tm.registerAgent('bot');
  tm.createTask({ title: 'A' });
  tm.createTask({ title: 'B' });
  const h = tm.getFullHistory();
  assert(h.length >= 3); // agent + 2 tasks
});

// ── Summary ──

test('dashboard summary', (tm) => {
  tm.createTask({ title: 'A' });
  const b = tm.createTask({ title: 'B', deadline: '2020-01-01' });
  tm.updateTask(b.id, { status: 'in_progress' });
  const s = tm.summary();
  assert(s.total === 2);
  assert(s.counts.pending === 1);
  assert(s.counts.in_progress === 1);
  assert(s.overdue.length === 1);
});

// ── Results ──

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
