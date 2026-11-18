// START_MODULE_CONTRACT
//   PURPOSE: Native viewport anchors below headers and after frozen columns.
//   SCOPE: Snapshot on scroll end/unmount; bounded geometry correction before paint, no persistent polling.
//   DEPENDS: M-GRID-TYPES
//   LINKS: M-GRID-RUNTIME, M-GRID-TYPES, V-M-GRID-TESTS
// END_MODULE_CONTRACT
// START_MODULE_MAP
//   resolveViewCell - map stable selection coordinates to the current projection
//   useGridViewState - capture and restore a native grid viewport
// END_MODULE_MAP
import {useLayoutEffect,useRef,type RefObject} from 'react';
import type {SimpleGridViewState} from './types.js';

type Cell={row:number;navIndex:number};
type Address=NonNullable<SimpleGridViewState['selection']>['active'];
export function resolveViewCell(cell:Address|undefined,keys:string[],ids:string[]):Cell|null {
 if(!cell||!keys.length||!ids.length)return null;
 const row=cell.rowKey===undefined?-1:keys.indexOf(cell.rowKey),column=ids.indexOf(cell.columnId);
 return {row:row<0?Math.max(0,Math.min(cell.rowIndex,keys.length-1)):row,navIndex:column<0?0:column};
}
const own=(root:HTMLElement,selector:string)=>Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(node=>node.closest('[data-sg]')===root);
function owners(root:HTMLElement) {
 const list:HTMLElement[]=[];
 for(let node:HTMLElement|null=root;node&&node!==document.body;node=node.parentElement){
  const style=getComputedStyle(node);if(/auto|scroll|overlay/.test(style.overflow+' '+style.overflowX+' '+style.overflowY))list.push(node);
 }
 return list;
}
function boundary(root:HTMLElement,list:HTMLElement[]) {
 const first=list[0],rect=first?.getBoundingClientRect();
 let top=rect?rect.top+first.clientTop:0,left=rect?rect.left+first.clientLeft:0;
 for(const node of list){const box=node.getBoundingClientRect();top=Math.max(top,box.top+node.clientTop);left=Math.max(left,box.left+node.clientLeft);}
 const headers=own(root,'thead th');
 for(const header of headers){const box=header.getBoundingClientRect();top=Math.max(top,box.bottom);if(header.style.left)left=Math.max(left,box.right);}
 return {top,left};
}
// START_BLOCK_NATIVE_VIEW_STATE
export function useGridViewState(rootRef:RefObject<HTMLDivElement>,options:{state:SimpleGridViewState|null|undefined;onChange:((state:SimpleGridViewState)=>void)|undefined;keys:string[];ids:string[];active:Cell|null;focus:Cell|null}) {
 const latest=useRef(options);latest.current=options;
 const restoring=useRef(Boolean(options.state?.viewport));
 const correctRef=useRef<()=>number>(()=>0);
 useLayoutEffect(()=>{
  const root=rootRef.current;if(!root||(!options.state&&!options.onChange))return;
  const list=owners(root),target=options.state?.viewport;
  const original=list.map(node=>({anchor:node.style.overflowAnchor,behavior:node.style.scrollBehavior}));
  let frame:number|null=null,passes=0,stable=0;
  restoring.current=Boolean(target);
  // Browser scroll anchoring must not fight explicit row anchors during virtual layout changes.
  list.forEach(node=>{node.style.overflowAnchor='none';node.style.scrollBehavior='auto';});
  const stop=()=>{restoring.current=false;if(frame!==null)cancelAnimationFrame(frame);frame=null;};
  const correct=()=>{
   if(!restoring.current||!target)return 0;
   const config=latest.current,index=target.rowKey===undefined?-1:config.keys.indexOf(target.rowKey);
   const rowIndex=index<0?Math.max(0,Math.min(target.rowIndex,config.keys.length-1)):index;
   const row=own(root,`tr[data-row-index="${rowIndex}"]`)[0];
   const column=own(root,'thead th[data-testid^="sg-colheader-"]').find(node=>node.dataset.testid===`sg-colheader-${target.columnId}`);
   const edge=boundary(root,list);
   const dy=row?row.getBoundingClientRect().top-edge.top-target.offsetTop:0;
   const dx=column&&!column.hasAttribute('data-sg-frozen-position')?column.getBoundingClientRect().left-edge.left-target.offsetLeft:0;
   const vertical=list.find(node=>node.scrollHeight>node.clientHeight+1),horizontal=list.find(node=>node.scrollWidth>node.clientWidth+1);
   if(vertical&&Math.abs(dy)>.25)vertical.scrollTop+=dy;
   if(horizontal&&Math.abs(dx)>.25)horizontal.scrollLeft+=dx;
   return Math.max(Math.abs(dy),Math.abs(dx));
  };
  correctRef.current=correct;
  const settle=()=>{frame=null;const error=correct();stable=error<=.5?stable+1:0;if(++passes<6&&stable<2&&restoring.current)frame=requestAnimationFrame(settle);else stop();};
  if(target){correct();frame=requestAnimationFrame(settle);}
  else list.forEach(node=>{node.scrollTop=0;node.scrollLeft=0;});
  const capture=()=>{
   const config=latest.current;if(restoring.current||!config.onChange)return;
   const edge=boundary(root,list),rows=own(root,'tr[data-row-index]');
   // Binary search visits only log(mounted rows) rectangles, including virtual grids.
   let low=0,high=rows.length;
   while(low<high){const mid=(low+high)>>>1;if(rows[mid].getBoundingClientRect().bottom<=edge.top+.25)low=mid+1;else high=mid;}
   const row=rows[low];
   const column=own(root,'thead th[data-testid^="sg-colheader-"]').find(node=>!node.hasAttribute('data-sg-frozen-position')&&node.getBoundingClientRect().right>edge.left+.25);
   const address=(cell:Cell):Address=>({rowIndex:cell.row,rowKey:config.keys[cell.row],columnId:config.ids[cell.navIndex]});
   config.onChange({viewport:row&&column?{rowIndex:Number(row.dataset.rowIndex),rowKey:config.keys[Number(row.dataset.rowIndex)],columnId:column.dataset.testid!.slice('sg-colheader-'.length),offsetTop:row.getBoundingClientRect().top-edge.top,offsetLeft:column.getBoundingClientRect().left-edge.left}:undefined,selection:config.active&&config.focus?{active:address(config.active),focus:address(config.focus)}:null});
  };
  const cancel=()=>stop();
  list.forEach(node=>{node.addEventListener('scrollend',capture,{passive:true});node.addEventListener('wheel',cancel,{passive:true});});
  root.addEventListener('pointerdown',cancel);root.addEventListener('keydown',cancel);
  return ()=>{
   capture();stop();correctRef.current=()=>0;
   list.forEach((node,index)=>{node.removeEventListener('scrollend',capture);node.removeEventListener('wheel',cancel);node.style.overflowAnchor=original[index].anchor;node.style.scrollBehavior=original[index].behavior;});
   root.removeEventListener('pointerdown',cancel);root.removeEventListener('keydown',cancel);
  };
 },[options.state,rootRef]);
 // Row measurements and gutter widths may settle in a second layout pass, still before paint.
 useLayoutEffect(()=>{correctRef.current();});
 const request=options.state?.viewport;
 const keyIndex=request?.rowKey===undefined?-1:options.keys.indexOf(request.rowKey);
 return {restoring,rowIndex:request?(keyIndex<0?request.rowIndex:keyIndex):undefined,columnId:request?.columnId};
}
// END_BLOCK_NATIVE_VIEW_STATE
