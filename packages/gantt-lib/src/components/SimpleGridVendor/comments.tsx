// START_MODULE_CONTRACT
//   PURPOSE: Host-owned cell notes shown as an Excel-like corner marker with a hover card.
//   SCOPE: Presentation and hover/focus behaviour only; storage, authorship, editing and
//          the full comment panel belong to the host through onCellCommentOpen.
//   DEPENDS: M-GRID-TYPES
//   LINKS: M-GRID-RUNTIME, M-GRID-STYLES, V-M-GRID-COMMENTS
//   ROLE: RUNTIME
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT
//
// START_MODULE_MAP
//   commentTime - short HH:MM for today, a date otherwise
//   commentMarkerLabel - accessible marker label with count and open-task state
//   CommentMarker - corner triangle, hover card and open callback for one cell
// END_MODULE_MAP

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SimpleGridCellComment, SimpleGridCommentTarget } from './types';

const HOVER_DELAY = 180;
const CLOSE_DELAY = 160;
const CARD_WIDTH = 300;
const CARD_GAP = 6;

export function commentTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  return date.toDateString() === now.toDateString()
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ru-RU');
}

export function commentMarkerLabel(comments: readonly SimpleGridCellComment[]): string {
  const open = comments.filter((comment) => !comment.resolved).length;
  const tasks = comments.filter((comment) => comment.task && !comment.resolved).length;
  const count = `${comments.length} ${comments.length % 10 === 1 && comments.length % 100 !== 11 ? 'комментарий' : comments.length % 10 >= 2 && comments.length % 10 <= 4 && (comments.length % 100 < 10 || comments.length % 100 >= 20) ? 'комментария' : 'комментариев'}`;
  return `Комментарии к ячейке: ${count}${open ? '' : ', все выполнены'}${tasks ? `, открытых задач: ${tasks}` : ''}`;
}

interface Position { top: number; left: number; above: boolean }

export function CommentMarker<T>({
  comments,
  target,
  testId,
  onOpen,
}: {
  comments: readonly SimpleGridCellComment[];
  target: SimpleGridCommentTarget<T>;
  testId: string;
  onOpen?: (target: SimpleGridCommentTarget<T>, comment?: SimpleGridCellComment) => void;
}) {
  const marker = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, above: false });

  const clearTimers = () => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  };
  useEffect(() => clearTimers, []);
  useEffect(() => {
    if (!open) return;
    const dismiss = () => setOpen(false);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const outside = (event: PointerEvent) => {
      const node = event.target as Node;
      if (marker.current?.contains(node) || card.current?.contains(node)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
    };
  }, [open]);
  useLayoutEffect(() => {
    if (!open || !marker.current) return;
    const anchor = marker.current.getBoundingClientRect();
    const height = card.current?.getBoundingClientRect().height ?? 180;
    const above = anchor.bottom + CARD_GAP + height > window.innerHeight - 8 && anchor.top - CARD_GAP - height > 8;
    setPosition({
      top: above ? Math.max(8, anchor.top - CARD_GAP - height) : anchor.bottom + CARD_GAP,
      left: Math.max(8, Math.min(anchor.right - CARD_WIDTH, window.innerWidth - CARD_WIDTH - 8)),
      above,
    });
  }, [open]);

  const enter = () => {
    clearTimers();
    openTimer.current = setTimeout(() => setOpen(true), HOVER_DELAY);
  };
  const leave = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  const resolved = comments.every((comment) => comment.resolved);
  const hasTask = comments.some((comment) => comment.task && !comment.resolved);
  const visible = comments.slice(0, 3);
  const hidden = comments.length - visible.length;

  return (
    <>
      <button
        ref={marker}
        aria-label={commentMarkerLabel(comments)}
        className="sg-comment-marker"
        data-resolved={resolved ? '' : undefined}
        data-task={hasTask ? '' : undefined}
        data-testid={testId}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          clearTimers();
          setOpen(false);
          onOpen?.(target);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          onOpen?.(target);
        }}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseEnter={enter}
        onMouseLeave={leave}
        tabIndex={-1}
        title={commentMarkerLabel(comments)}
        type="button"
      />
      {open && createPortal(
        <div
          ref={card}
          aria-label={`Комментарии к ячейке ${target.columnTitle || target.columnId}`}
          className="sg-comment-card"
          data-above={position.above ? '' : undefined}
          data-sg-portal=""
          role="dialog"
          style={{ top: position.top, left: position.left, width: CARD_WIDTH }}
          onMouseEnter={clearTimers}
          onMouseLeave={leave}
        >
          <div className="sg-comment-card-heading">
            <strong>Комментарии</strong>
            <span>{comments.length}</span>
          </div>
          <div className="sg-comment-card-list">
            {visible.map((comment) => (
              <article className="sg-comment-card-item" data-resolved={comment.resolved ? '' : undefined} key={comment.id}>
                <div className="sg-comment-card-meta">
                  <strong>{comment.author || 'Участник'}</strong>
                  {comment.createdAt && <time dateTime={comment.createdAt}>{commentTime(comment.createdAt)}</time>}
                </div>
                <p>{comment.text}</p>
                {(comment.task || comment.resolved) && (
                  <div className="sg-comment-card-badges">
                    {comment.task && <span className="sg-comment-badge">{comment.resolved ? 'Задача выполнена' : 'Задача'}</span>}
                    {comment.resolved && !comment.task && <span className="sg-comment-badge is-done">Выполнено</span>}
                  </div>
                )}
              </article>
            ))}
            {hidden > 0 && <div className="sg-comment-card-more">Ещё {hidden}</div>}
          </div>
          {onOpen && <button className="sg-comment-card-action" onClick={() => { setOpen(false); onOpen(target); }} type="button">Открыть</button>}
        </div>,
        document.body,
      )}
    </>
  );
}
