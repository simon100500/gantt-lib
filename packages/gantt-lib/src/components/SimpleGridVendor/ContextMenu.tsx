// START_MODULE_CONTRACT
//   PURPOSE: Accessible portalled cell context menu with viewport placement and dismissal.
//   SCOPE: Presentation, focus and keyboard behavior; actions and target context belong to the grid.
//   DEPENDS: M-GRID-TYPES
//   LINKS: M-GRID-RUNTIME, V-M-GRID-CONTEXT-MENU
//   ROLE: UI
//   MAP_MODE: EXPORTS
// END_MODULE_CONTRACT
// START_MODULE_MAP
//   ContextMenu - place menu, focus commands, dismiss and dispatch selected actions
// END_MODULE_MAP
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SimpleGridContextMenuItem } from './types';

export function ContextMenu<T>({ x, y, items, onClose, onSelect, ariaLabel = "Действия с ячейками" }: {
  ariaLabel?: string;
  x: number; y: number; items: SimpleGridContextMenuItem<T>[];
  onClose: (restoreFocus: boolean) => void;
  onSelect: (item: Exclude<SimpleGridContextMenuItem<T>, { separator: true }>) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const [submenu,setSubmenu]=useState<{id:string;left:number;top:number}|null>(null);
  const openSubmenu=(item:Exclude<SimpleGridContextMenuItem<T>,{separator:true}>,element:HTMLElement,focus=false)=>{
    if(!item.submenu)return;
    const rect=element.getBoundingClientRect(),width=item.submenuLayout==='palette'?166:210;
    const left=rect.right+width<=window.innerWidth-8?rect.right-2:Math.max(8,rect.left-width+2);
    const height=item.submenuLayout==='grid'?136:item.submenuLayout==='palette'?132:Math.min(item.submenu.length*40+16,window.innerHeight-16);
    setSubmenu({id:item.id,left,top:Math.max(8,Math.min(rect.top-4,window.innerHeight-height-8))});
    if(focus)requestAnimationFrame(()=>subRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus());
  };
  useLayoutEffect(() => {
    const panel = ref.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    panel.style.left = `${Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))}px`;
    panel.style.top = `${Math.max(8, Math.min(y, window.innerHeight - rect.height - 8))}px`;
    panel.focus({preventScroll:true});
  }, [x, y]);
  useEffect(() => {
    const outside = (event: MouseEvent) => {
      if (!(event.target instanceof Node) || !ref.current?.contains(event.target) && !subRef.current?.contains(event.target)) onClose(false);
    };
    const dismiss = (event: Event) => {
      if (!(event.target instanceof Node) || !ref.current?.contains(event.target) && !subRef.current?.contains(event.target)) onClose(false);
    };
    document.addEventListener('mousedown', outside);
    window.addEventListener('resize', dismiss);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('blur', dismiss);
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('blur', dismiss);
    };
  }, [onClose]);
  if (!items.some((item) => !('separator' in item))) return null;
  return createPortal(<div ref={ref} data-sg-portal="" className="sg-context-menu" role="menu" aria-label={ariaLabel}
    tabIndex={-1} style={{ left: x, top: y }}
    onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}
    onContextMenu={(event) => event.preventDefault()}
    onKeyDown={(event) => {
      event.stopPropagation();
      if (event.key === 'Escape' || event.key === 'Tab') {
        event.preventDefault(); onClose(true); return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1
        : index<0?(event.key==='ArrowDown'?0:buttons.length-1):(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next].focus();
    }}>
    {items.map((item) => 'separator' in item
      ? <div key={item.id} role="separator" className="sg-context-separator" />
      : <div key={item.id} className={`sg-context-entry${item.submenu?' sg-context-entry-submenu':''}`} onMouseEnter={event=>item.submenu?openSubmenu(item,event.currentTarget):setSubmenu(null)}>
        <button type="button" role="menuitem" tabIndex={-1} disabled={item.disabled}
          className={`sg-context-action${item.danger ? ' sg-context-danger' : ''}`} data-submenu-trigger={item.submenu?item.id:undefined} aria-haspopup={item.submenu?'menu':undefined} aria-expanded={item.submenu?submenu?.id===item.id:undefined}
          onKeyDown={event=>{if(item.submenu&&event.key==='ArrowRight'){event.preventDefault();event.stopPropagation();openSubmenu(item,event.currentTarget.parentElement!,true);}}}
          onClick={event=>item.submenu?openSubmenu(item,event.currentTarget.parentElement!,true):onSelect(item)}>
          <span className="sg-context-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
          {item.shortcut && <span className="sg-context-shortcut">{item.shortcut}</span>}
          {item.submenu&&<span className="sg-context-submenu-arrow" aria-hidden="true">›</span>}
        </button>
        {item.submenu&&submenu?.id===item.id&&createPortal(<div ref={subRef} data-sg-portal="" className={`sg-context-submenu${item.submenuLayout==='grid'?' sg-context-submenu-grid':item.submenuLayout==='palette'?' sg-context-submenu-palette':''}`} role="menu" aria-label={item.label} style={{left:submenu.left,top:submenu.top}}
         onMouseDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}
         onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'||event.key==='ArrowLeft'){event.preventDefault();setSubmenu(null);ref.current?.querySelector<HTMLButtonElement>(`[data-submenu-trigger="${item.id}"]`)?.focus();return;}if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const buttons=Array.from(subRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')||[]);const index=buttons.indexOf(document.activeElement as HTMLButtonElement);const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:index<0?(event.key==='ArrowDown'?0:buttons.length-1):(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next]?.focus();}}>
          {item.submenu.map(child=>'separator' in child?<div key={child.id} role="separator" className="sg-context-separator"/>:<div className="sg-context-entry" key={child.id}><button type="button" role="menuitem" tabIndex={-1} disabled={child.disabled} className={`sg-context-action${child.danger?' sg-context-danger':''}`} onClick={()=>onSelect(child)}><span className="sg-context-icon" aria-hidden="true">{child.icon}</span><span>{child.label}</span></button></div>)}
        </div>,document.body)}
      </div>)}
  </div>, document.body);
}
