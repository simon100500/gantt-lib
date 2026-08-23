// Демонстрация scaleTaskSubtreeDuration по сценариям PRD §7.
// Запуск: node .dev-demo-subtree-scaling.mjs (из корня репо, после npm run build -w packages/gantt-lib)
import {
  scaleTaskSubtreeDuration,
  getTaskDuration,
} from './packages/gantt-lib/dist/core/scheduling/index.mjs';

const mk = (o) => ({ name: o.id, startDate: '2026-01-01', endDate: '2026-01-05', ...o });
const fmt = (t) => `${t.startDate}..${t.endDate} (${getTaskDuration(t.startDate, t.endDate)}д)`;
const show = (label, r) => {
  console.log(`\n=== ${label} ===`);
  if (!r.ok) { console.log(`ok: false, code: ${r.code}`, r.details ?? ''); return; }
  console.log(`ok: true, requested: ${r.requestedDuration}, applied: ${r.appliedDuration}, clamped: ${r.clamped}`);
  if (r.warnings.length) console.log('warnings:', JSON.stringify(r.warnings));
  for (const t of r.changedTasks) console.log(`  ${t.id.padEnd(3)} ${fmt(t)}`);
};

// 7.1 Растяжение: A=4, B=6, C=8, два лага по 1 => родитель 20 дней
const chain = [
  mk({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-20' }),
  mk({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-04', parentId: 'P' }),
  mk({ id: 'B', startDate: '2026-01-06', endDate: '2026-01-11', parentId: 'P', dependencies: [{ taskId: 'A', type: 'FS', lag: 1 }] }),
  mk({ id: 'C', startDate: '2026-01-13', endDate: '2026-01-20', parentId: 'P', dependencies: [{ taskId: 'B', type: 'FS', lag: 1 }] }),
];
show('7.1 растяжение 20 -> 30', scaleTaskSubtreeDuration('P', 30, chain));

// 7.2 Сжатие достижимое: 30 -> 24
const plain = [
  mk({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-30' }),
  mk({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-10', parentId: 'P' }),
  mk({ id: 'B', startDate: '2026-01-11', endDate: '2026-01-20', parentId: 'P', dependencies: [{ taskId: 'A', type: 'FS', lag: 0 }] }),
  mk({ id: 'C', startDate: '2026-01-21', endDate: '2026-01-30', parentId: 'P', dependencies: [{ taskId: 'B', type: 'FS', lag: 0 }] }),
];
show('7.2 сжатие 30 -> 24', scaleTaskSubtreeDuration('P', 24, plain));

// 7.3 Сжатие дальше минимумов: сначала длительности, потом лаги
const withLag = [
  mk({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-10' }),
  mk({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-03', parentId: 'P' }),
  mk({ id: 'B', startDate: '2026-01-08', endDate: '2026-01-10', parentId: 'P', dependencies: [{ taskId: 'A', type: 'FS', lag: 4 }] }),
];
show('7.3 сжатие 10 -> 4 (лаги сжимаются)', scaleTaskSubtreeDuration('P', 4, withLag));

// 7.4 Запрос ниже физического минимума: clamp + warning, не ошибка
const heavy = [
  mk({ id: 'P', startDate: '2026-01-01', endDate: '2026-01-14' }),
  mk({ id: 'A', startDate: '2026-01-01', endDate: '2026-01-06', parentId: 'P' }),
  mk({ id: 'B', startDate: '2026-01-09', endDate: '2026-01-14', parentId: 'P', dependencies: [{ taskId: 'A', type: 'FS', lag: 2 }] }),
];
show('7.4 запрос 10 при минимуме 14', scaleTaskSubtreeDuration('P', 10, heavy, { getMinDuration: () => 7 }));

// Ошибки контракта
console.log('\n=== ошибки ===');
console.log('лист:', JSON.stringify(scaleTaskSubtreeDuration('A', 5, chain).code)); // NOT_A_PARENT
console.log('нет родителя:', JSON.stringify(scaleTaskSubtreeDuration('X', 5, chain).code)); // TASK_NOT_FOUND
console.log('target 0:', JSON.stringify(scaleTaskSubtreeDuration('P', 0, chain).code)); // INVALID_TARGET_DURATION
