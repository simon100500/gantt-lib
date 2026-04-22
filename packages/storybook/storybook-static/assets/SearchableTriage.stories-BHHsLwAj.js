import{j as e}from"./index-3rWi14TQ.js";import{E as i,d as n}from"./createExampleScenarioTasks-Jj6m4M-Q.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./CapabilityStoryHarness-B61ZXIOI.js";import"./index-CTXTNBUN.js";const g={title:"Examples/Searchable triage",component:i,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Search-oriented triage flow that keeps the active query, highlighted ids, and no-match status visible through Storybook-local host chrome."}}}},a={args:{title:"Examples / searchable triage",description:"Simulates a searchable triage queue with tracked query state, highlight diagnostics, and explicit malformed-input coverage via the host query controls.",scenario:n(),extraToolbarContent:e.jsxs(e.Fragment,{children:[e.jsx("span",{children:"taskFilterQuery: 'Critical'"}),e.jsx("span",{children:"filterMode: 'highlight'"}),e.jsx("span",{children:"highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])"}),e.jsx("span",{children:"businessDays: true"}),e.jsx("span",{children:"Clear query for no-match coverage"})]})}};var r,t,s;a.parameters={...a.parameters,docs:{...(r=a.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    title: 'Examples / searchable triage',
    description: 'Simulates a searchable triage queue with tracked query state, highlight diagnostics, and explicit malformed-input coverage via the host query controls.',
    scenario: createSearchableTriageScenario(),
    extraToolbarContent: <>\r
        <span>taskFilterQuery: 'Critical'</span>\r
        <span>filterMode: 'highlight'</span>\r
        <span>highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])</span>\r
        <span>businessDays: true</span>\r
        <span>Clear query for no-match coverage</span>\r
      </>
  }
}`,...(s=(t=a.parameters)==null?void 0:t.docs)==null?void 0:s.source}}};const u=["HighlightDrivenQueue"];export{a as HighlightDrivenQueue,u as __namedExportsOrder,g as default};
