import{C as g,h as t}from"./CapabilityStoryHarness-B61ZXIOI.js";import"./index-3rWi14TQ.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./index-CTXTNBUN.js";const T={title:"Capabilities/Task states",component:g,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Task-state capability stories focus on accepted/review/blocked/locked/milestone surfaces plus baseline visibility and highlight-driven inspection."}}}},e={args:{title:"Task states / accepted, review, blocked, milestone",description:"Shows accepted progress, review state, blocked status, milestone rendering, and baseline variance inside one package-local dataset.",initialTasks:t(),showBaseline:!0}},s={args:{title:"Task states / highlighted review and blocked rows",description:"Uses highlight-driven inspection to keep all rows visible while drawing attention to risky states instead of hiding surrounding context.",initialTasks:t(),highlightedTaskIds:new Set(["cap-states","cap-deps"])}},a={args:{title:"Task states / same dataset without baseline",description:"Boundary condition proving the same stateful dataset still mounts cleanly when baseline visuals are disabled.",initialTasks:t(),showBaseline:!1}};var i,n,o;e.parameters={...e.parameters,docs:{...(i=e.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    title: 'Task states / accepted, review, blocked, milestone',
    description: 'Shows accepted progress, review state, blocked status, milestone rendering, and baseline variance inside one package-local dataset.',
    initialTasks: createTaskStateCapabilityTasks(),
    showBaseline: true
  }
}`,...(o=(n=e.parameters)==null?void 0:n.docs)==null?void 0:o.source}}};var r,l,c;s.parameters={...s.parameters,docs:{...(r=s.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    title: 'Task states / highlighted review and blocked rows',
    description: 'Uses highlight-driven inspection to keep all rows visible while drawing attention to risky states instead of hiding surrounding context.',
    initialTasks: createTaskStateCapabilityTasks(),
    highlightedTaskIds: new Set(['cap-states', 'cap-deps'])
  }
}`,...(c=(l=s.parameters)==null?void 0:l.docs)==null?void 0:c.source}}};var d,p,h;a.parameters={...a.parameters,docs:{...(d=a.parameters)==null?void 0:d.docs,source:{originalSource:`{
  args: {
    title: 'Task states / same dataset without baseline',
    description: 'Boundary condition proving the same stateful dataset still mounts cleanly when baseline visuals are disabled.',
    initialTasks: createTaskStateCapabilityTasks(),
    showBaseline: false
  }
}`,...(h=(p=a.parameters)==null?void 0:p.docs)==null?void 0:h.source}}};const v=["BaselineAndAcceptance","HighlightedRiskRows","WithoutBaseline"];export{e as BaselineAndAcceptance,s as HighlightedRiskRows,a as WithoutBaseline,v as __namedExportsOrder,T as default};
