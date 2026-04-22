import{j as e}from"./index-3rWi14TQ.js";import{E as i,a as r}from"./createExampleScenarioTasks-Jj6m4M-Q.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./CapabilityStoryHarness-B61ZXIOI.js";import"./index-CTXTNBUN.js";const g={title:"Examples/Management overview",component:i,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Host-like management overview that combines filters, highlights, additional columns, and scoped menu commands through the reusable example wrapper."}}}},a={args:{title:"Examples / management overview",description:"Combines PM-style host chrome, query diagnostics, highlight state, task-list extensions, and menu command feedback in a single review board.",scenario:r(),extraToolbarContent:e.jsxs(e.Fragment,{children:[e.jsx("span",{children:"taskFilterQuery: 'Capability'"}),e.jsx("span",{children:"filterMode: 'highlight'"}),e.jsx("span",{children:"highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])"}),e.jsx("span",{children:"additionalColumns: managementOverviewColumns"}),e.jsx("span",{children:"taskListMenuCommands: managementOverviewCommands"}),e.jsx("span",{children:"Capture management pulse"})]})}};var n,s,t;a.parameters={...a.parameters,docs:{...(n=a.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    title: 'Examples / management overview',
    description: 'Combines PM-style host chrome, query diagnostics, highlight state, task-list extensions, and menu command feedback in a single review board.',
    scenario: createManagementOverviewScenario(),
    extraToolbarContent: <>\r
        <span>taskFilterQuery: 'Capability'</span>\r
        <span>filterMode: 'highlight'</span>\r
        <span>highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])</span>\r
        <span>additionalColumns: managementOverviewColumns</span>\r
        <span>taskListMenuCommands: managementOverviewCommands</span>\r
        <span>Capture management pulse</span>\r
      </>
  }
}`,...(t=(s=a.parameters)==null?void 0:s.docs)==null?void 0:t.source}}};const h=["PortfolioReviewBoard"];export{a as PortfolioReviewBoard,h as __namedExportsOrder,g as default};
