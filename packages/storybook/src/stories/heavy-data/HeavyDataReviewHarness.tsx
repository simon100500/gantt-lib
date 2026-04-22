import { useMemo } from 'react';
import {
  CapabilityStoryHarness,
  type CapabilityStoryHarnessProps,
  type CapabilityToolbarContext,
} from '../CapabilityStoryHarness';
import {
  createHeavyDataFixture,
  getHeavyDataTaskCounts,
  getHeavyDataVisibleRowCount,
  type HeavyDataDensityTier,
} from '../fixtures/createHeavyDataTasks';

export interface HeavyDataReviewHarnessProps {
  tier: HeavyDataDensityTier;
  title?: string;
  description?: string;
  reviewFocus?: string;
  viewMode?: CapabilityStoryHarnessProps['viewMode'];
  taskListWidth?: number;
  initialTasks?: CapabilityStoryHarnessProps['initialTasks'];
  initiallyCollapsedParentIds?: string[];
}

export function HeavyDataReviewHarness({
  tier,
  title,
  description,
  reviewFocus,
  viewMode = 'week',
  taskListWidth = 520,
  initialTasks,
  initiallyCollapsedParentIds,
}: HeavyDataReviewHarnessProps) {
  const fixture = useMemo(() => createHeavyDataFixture(tier), [tier]);
  const resolvedTasks = initialTasks ?? fixture.tasks;
  const resolvedCollapsedParentIds = initiallyCollapsedParentIds ?? fixture.initiallyCollapsedParentIds;

  return (
    <CapabilityStoryHarness
      title={title ?? `Heavy data / ${fixture.approxLabel}`}
      description={
        description ??
        `Dense-data review seam for ${fixture.approxLabel} datasets built from deterministic Storybook-local fixtures.`
      }
      initialTasks={resolvedTasks}
      initiallyCollapsedParentIds={resolvedCollapsedParentIds}
      viewMode={viewMode}
      taskListWidth={taskListWidth}
      enableAutoSchedule
      renderToolbar={(context) => (
        <HeavyDataDiagnostics
          context={context}
          tier={fixture.tier}
          approxLabel={fixture.approxLabel}
          expectedRowCount={fixture.exactRowCount}
          focusTaskId={fixture.focusTaskId}
          reviewFocus={reviewFocus}
          reviewNotes={fixture.reviewNotes}
        />
      )}
    />
  );
}

function HeavyDataDiagnostics({
  context,
  tier,
  approxLabel,
  expectedRowCount,
  focusTaskId,
  reviewFocus,
  reviewNotes,
}: {
  context: CapabilityToolbarContext;
  tier: HeavyDataDensityTier;
  approxLabel: string;
  expectedRowCount: number;
  focusTaskId: string;
  reviewFocus?: string;
  reviewNotes: string[];
}) {
  const counts = useMemo(() => getHeavyDataTaskCounts(context.tasks), [context.tasks]);
  const visibleRows = useMemo(
    () => getHeavyDataVisibleRowCount(context.tasks, context.collapsedParentIds),
    [context.collapsedParentIds, context.tasks],
  );
  const collapsedGroups = context.collapsedParentIds.size;
  const renderedTaskTotals = `${visibleRows} visible / ${counts.totalRows} total / ${counts.groupRows} groups / ${counts.milestoneRows} milestones`;
  const reviewFocusLabel = reviewFocus ?? `Inspect dense board readability around ${focusTaskId}.`;
  const driftDetected = counts.totalRows !== expectedRowCount;

  return (
    <div
      style={{
        display: 'grid',
        gap: '12px',
        width: '100%',
      }}
    >
      <div
        style={{
          display: 'grid',
          gap: '8px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        }}
      >
        <DiagnosticCard label="Density tier" value={`${tier} · ${approxLabel}`} />
        <DiagnosticCard
          label="Total rows"
          value={`${counts.totalRows} rows`}
          tone={driftDetected ? 'warning' : 'neutral'}
        />
        <DiagnosticCard label="Visible rows" value={`${visibleRows} visible rows`} />
        <DiagnosticCard label="Collapsed groups" value={`${collapsedGroups} collapsed groups`} />
        <DiagnosticCard label="Rendered task totals" value={renderedTaskTotals} />
        <DiagnosticCard label="Review focus" value={reviewFocusLabel} />
      </div>

      <div
        style={{
          borderRadius: '14px',
          border: `1px solid ${driftDetected ? '#f59e0b' : '#cbd5e1'}`,
          background: driftDetected ? '#fffbeb' : 'rgba(255,255,255,0.92)',
          padding: '14px 16px',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: driftDetected ? '#b45309' : '#64748b',
            marginBottom: '8px',
          }}
        >
          Review notes
        </div>
        <ul style={{ margin: 0, paddingLeft: '18px', color: '#0f172a' }}>
          {reviewNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
          <li>Expected row count: {expectedRowCount}.</li>
          <li>Focused review task: {focusTaskId}.</li>
          <li>Last event: {context.lastEvent}</li>
        </ul>
      </div>
    </div>
  );
}

function DiagnosticCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'warning';
}) {
  return (
    <div
      style={{
        borderRadius: '14px',
        padding: '12px 14px',
        border: `1px solid ${tone === 'warning' ? '#f59e0b' : '#cbd5e1'}`,
        background: tone === 'warning' ? '#fffbeb' : 'rgba(255,255,255,0.92)',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: tone === 'warning' ? '#b45309' : '#64748b',
          marginBottom: '6px',
        }}
      >
        {label}
      </div>
      <div style={{ color: '#0f172a', fontSize: '13px', lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}
