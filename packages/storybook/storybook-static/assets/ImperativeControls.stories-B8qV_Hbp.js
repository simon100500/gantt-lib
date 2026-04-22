import{j as e}from"./index-3rWi14TQ.js";import{C as g,b as l}from"./CapabilityStoryHarness-B61ZXIOI.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./index-CTXTNBUN.js";const C={title:"Capabilities/Imperative controls",component:g,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Imperative control stories focus on the documented safe GanttChartHandle subset — scrolling and hierarchy controls — and intentionally avoid mandatory document-export side effects."}}}},r={args:{title:"Imperative controls / safe ref actions",description:"Toolbar buttons call the documented safe handle methods: `scrollToToday`, `scrollToTask`, `scrollToRow`, `collapseAll`, and `expandAll`.",initialTasks:l(),renderToolbar:({chartHandle:o,announce:t})=>e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",onClick:()=>{o==null||o.scrollToToday(),t("Triggered scrollToToday().")},children:"Scroll to today"}),e.jsx("button",{type:"button",onClick:()=>{o==null||o.scrollToTask("cap-interaction"),t("Triggered scrollToTask(cap-interaction).")},children:"Scroll to task"}),e.jsx("button",{type:"button",onClick:()=>{o==null||o.scrollToRow("cap-deps"),t("Triggered scrollToRow(cap-deps).")},children:"Scroll to row"}),e.jsx("button",{type:"button",onClick:()=>{o==null||o.collapseAll(),t("Triggered collapseAll().")},children:"Collapse all"}),e.jsx("button",{type:"button",onClick:()=>{o==null||o.expandAll(),t("Triggered expandAll().")},children:"Expand all"})]})}},s={args:{title:"Imperative controls / invalid task ids are no-op safe",description:"Boundary check for invalid task IDs: scroll commands should remain safe no-ops and surface status through the Storybook toolbar instead of throwing.",initialTasks:l(),renderToolbar:({chartHandle:o,announce:t})=>e.jsxs(e.Fragment,{children:[e.jsx("button",{type:"button",onClick:()=>{o==null||o.scrollToTask("missing-task-id"),t("Triggered scrollToTask(missing-task-id) — safe no-op expected.")},children:"Scroll to missing task"}),e.jsx("button",{type:"button",onClick:()=>{o==null||o.scrollToRow("missing-row-id"),t("Triggered scrollToRow(missing-row-id) — safe no-op expected.")},children:"Scroll to missing row"})]})}},n={args:{title:"Imperative controls / ref-ready wrapper",description:"Reference harness keeps the ref surface visible for reviewer inspection while deliberately excluding document export from the default control set.",initialTasks:l(),renderToolbar:({announce:o})=>e.jsx("button",{type:"button",onClick:()=>o("Document export is intentionally left out of the default safe controls."),children:"Why no export action?"})}};var i,a,c;r.parameters={...r.parameters,docs:{...(i=r.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    title: 'Imperative controls / safe ref actions',
    description: 'Toolbar buttons call the documented safe handle methods: \`scrollToToday\`, \`scrollToTask\`, \`scrollToRow\`, \`collapseAll\`, and \`expandAll\`.',
    initialTasks: createCapabilityTasks(),
    renderToolbar: ({
      chartHandle,
      announce
    }) => <>\r
        <button type="button" onClick={() => {
        chartHandle?.scrollToToday();
        announce('Triggered scrollToToday().');
      }}>\r
          Scroll to today\r
        </button>\r
        <button type="button" onClick={() => {
        chartHandle?.scrollToTask('cap-interaction');
        announce('Triggered scrollToTask(cap-interaction).');
      }}>\r
          Scroll to task\r
        </button>\r
        <button type="button" onClick={() => {
        chartHandle?.scrollToRow('cap-deps');
        announce('Triggered scrollToRow(cap-deps).');
      }}>\r
          Scroll to row\r
        </button>\r
        <button type="button" onClick={() => {
        chartHandle?.collapseAll();
        announce('Triggered collapseAll().');
      }}>\r
          Collapse all\r
        </button>\r
        <button type="button" onClick={() => {
        chartHandle?.expandAll();
        announce('Triggered expandAll().');
      }}>\r
          Expand all\r
        </button>\r
      </>
  }
}`,...(c=(a=r.parameters)==null?void 0:a.docs)==null?void 0:c.source}}};var p,d,u;s.parameters={...s.parameters,docs:{...(p=s.parameters)==null?void 0:p.docs,source:{originalSource:`{
  args: {
    title: 'Imperative controls / invalid task ids are no-op safe',
    description: 'Boundary check for invalid task IDs: scroll commands should remain safe no-ops and surface status through the Storybook toolbar instead of throwing.',
    initialTasks: createCapabilityTasks(),
    renderToolbar: ({
      chartHandle,
      announce
    }) => <>\r
        <button type="button" onClick={() => {
        chartHandle?.scrollToTask('missing-task-id');
        announce('Triggered scrollToTask(missing-task-id) — safe no-op expected.');
      }}>\r
          Scroll to missing task\r
        </button>\r
        <button type="button" onClick={() => {
        chartHandle?.scrollToRow('missing-row-id');
        announce('Triggered scrollToRow(missing-row-id) — safe no-op expected.');
      }}>\r
          Scroll to missing row\r
        </button>\r
      </>
  }
}`,...(u=(d=s.parameters)==null?void 0:d.docs)==null?void 0:u.source}}};var T,b,m;n.parameters={...n.parameters,docs:{...(T=n.parameters)==null?void 0:T.docs,source:{originalSource:`{
  args: {
    title: 'Imperative controls / ref-ready wrapper',
    description: 'Reference harness keeps the ref surface visible for reviewer inspection while deliberately excluding document export from the default control set.',
    initialTasks: createCapabilityTasks(),
    renderToolbar: ({
      announce
    }) => <button type="button" onClick={() => announce('Document export is intentionally left out of the default safe controls.')}>\r
        Why no export action?\r
      </button>
  }
}`,...(m=(b=n.parameters)==null?void 0:b.docs)==null?void 0:m.source}}};const h=["SafeRefActions","InvalidTaskIdsAreSafe","RefReadyHarness"];export{s as InvalidTaskIdsAreSafe,n as RefReadyHarness,r as SafeRefActions,h as __namedExportsOrder,C as default};
