import{j as t}from"./index-3rWi14TQ.js";import{C as x,b as l,m as f}from"./CapabilityStoryHarness-SHE3IjZG.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./index-CTXTNBUN.js";const y=[{id:"risk",header:"Risk",width:96,after:"status",editable:!0,renderCell:({task:e})=>e.risk??"low",renderEditor:({task:e,updateTask:s,closeEditor:n})=>t.jsxs("select",{autoFocus:!0,defaultValue:e.risk??"low",onChange:a=>{s({risk:a.target.value}),n()},children:[t.jsx("option",{value:"low",children:"low"}),t.jsx("option",{value:"medium",children:"medium"}),t.jsx("option",{value:"high",children:"high"})]})},{id:"ownerNotes",header:"Owner notes",width:180,after:"risk",editable:!0,renderCell:({task:e})=>`${e.owner??"Unassigned"} / ${e.statusLabel??"Pending"}`,renderEditor:({task:e,updateTask:s,closeEditor:n})=>t.jsxs("button",{type:"button",onClick:()=>{s({owner:e.owner?`${e.owner} + QA`:"QA",statusLabel:"Reviewed"}),n()},children:["save-",e.id]})}],E=[{id:"group-checkpoint",label:"Mark group checkpoint",scope:"group",onSelect:()=>{}},{id:"linear-review",label:"Request linear review",scope:"linear",onSelect:()=>{}},{id:"milestone-signoff",label:"Prepare milestone sign-off",scope:"milestone",onSelect:()=>{}}],M={title:"Capabilities/Extensions",component:x,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Extension stories cover package-local additionalColumns editors and taskListMenuCommands scopes using only the public gantt-lib API surface."}}}},i={args:{title:"Extensions / additional task-list columns",description:"Minimal editable columns demonstrate `renderCell` and `renderEditor` without reaching into website code or introducing scenario-specific chrome.",initialTasks:l(),taskListWidth:760,additionalColumns:y}},o={args:{title:"Extensions / task-list menu command scopes",description:"Scope-specific row commands show how group, linear, and milestone actions can be declared from public types while remaining package-local and deterministic.",initialTasks:l(),taskListMenuCommands:E,renderToolbar:({announce:e})=>t.jsx("button",{type:"button",onClick:()=>e("Task-list menu commands are visible on matching row scopes only."),children:"Explain command scopes"})}},r={render:e=>{var d,c;const s=l(),n=[{...s[1],risk:"high",statusLabel:"Reviewed"}],a=f(s,n);return t.jsx(x,{...e,title:"Extensions / editor close-path contract",description:`Demonstrates the update-and-close path used by custom editors. Sample merge result: ${(d=a[1])==null?void 0:d.risk} / ${(c=a[1])==null?void 0:c.statusLabel}.`,initialTasks:s,taskListWidth:760,additionalColumns:y})}};var m,u,p;i.parameters={...i.parameters,docs:{...(m=i.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    title: 'Extensions / additional task-list columns',
    description: 'Minimal editable columns demonstrate \`renderCell\` and \`renderEditor\` without reaching into website code or introducing scenario-specific chrome.',
    initialTasks: createCapabilityTasks(),
    taskListWidth: 760,
    additionalColumns: editableColumns
  }
}`,...(p=(u=i.parameters)==null?void 0:u.docs)==null?void 0:p.source}}};var h,g,k;o.parameters={...o.parameters,docs:{...(h=o.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    title: 'Extensions / task-list menu command scopes',
    description: 'Scope-specific row commands show how group, linear, and milestone actions can be declared from public types while remaining package-local and deterministic.',
    initialTasks: createCapabilityTasks(),
    taskListMenuCommands: menuCommands,
    renderToolbar: ({
      announce
    }) => <button type="button" onClick={() => announce('Task-list menu commands are visible on matching row scopes only.')}>\r
        Explain command scopes\r
      </button>
  }
}`,...(k=(g=o.parameters)==null?void 0:g.docs)==null?void 0:k.source}}};var b,C,w;r.parameters={...r.parameters,docs:{...(b=r.parameters)==null?void 0:b.docs,source:{originalSource:`{
  render: args => {
    const tasks = createCapabilityTasks();
    const changed = [{
      ...tasks[1],
      risk: 'high' as const,
      statusLabel: 'Reviewed'
    }];
    const merged = mergeChangedTasks(tasks, changed);
    return <CapabilityStoryHarness {...args} title="Extensions / editor close-path contract" description={\`Demonstrates the update-and-close path used by custom editors. Sample merge result: \${merged[1]?.risk} / \${merged[1]?.statusLabel}.\`} initialTasks={tasks} taskListWidth={760} additionalColumns={editableColumns} />;
  }
}`,...(w=(C=r.parameters)==null?void 0:C.docs)==null?void 0:w.source}}};const $=["AdditionalColumns","TaskListMenuCommandScopes","EditorClosePath"];export{i as AdditionalColumns,r as EditorClosePath,o as TaskListMenuCommandScopes,$ as __namedExportsOrder,M as default};
