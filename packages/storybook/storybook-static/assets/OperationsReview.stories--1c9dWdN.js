import{j as e}from"./index-3rWi14TQ.js";import{E as i,b as t}from"./createExampleScenarioTasks-Jj6m4M-Q.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./CapabilityStoryHarness-B61ZXIOI.js";import"./index-CTXTNBUN.js";const h={title:"Examples/Operations review",component:i,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Operations review surface that keeps business-day scheduling, dependency expectations, and safe ref feedback visible in one host-like screen."}}}},s={args:{title:"Examples / operations review",description:"Exercises business-day scheduling with explicit ref controls and dependency review state, including the safe missing-id path through the shared wrapper.",scenario:t(),extraToolbarContent:e.jsxs(e.Fragment,{children:[e.jsx("span",{children:"taskFilterQuery: 'Weekday'"}),e.jsx("span",{children:"filterMode: 'highlight'"}),e.jsx("span",{children:"enableAutoSchedule: true"}),e.jsx("span",{children:"businessDays: true"}),e.jsx("span",{children:"Run focus ref action for missing-task-id"})]})}};var n,r,a;s.parameters={...s.parameters,docs:{...(n=s.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    title: 'Examples / operations review',
    description: 'Exercises business-day scheduling with explicit ref controls and dependency review state, including the safe missing-id path through the shared wrapper.',
    scenario: createOperationsReviewScenario(),
    extraToolbarContent: <>\r
        <span>taskFilterQuery: 'Weekday'</span>\r
        <span>filterMode: 'highlight'</span>\r
        <span>enableAutoSchedule: true</span>\r
        <span>businessDays: true</span>\r
        <span>Run focus ref action for missing-task-id</span>\r
      </>
  }
}`,...(a=(r=s.parameters)==null?void 0:r.docs)==null?void 0:a.source}}};const m=["DependencyAndBusinessDayAudit"];export{s as DependencyAndBusinessDayAudit,m as __namedExportsOrder,h as default};
