import{j as e}from"./index-3rWi14TQ.js";import{E as t,c as r}from"./createExampleScenarioTasks-Jj6m4M-Q.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./CapabilityStoryHarness-B61ZXIOI.js";import"./index-CTXTNBUN.js";const u={title:"Examples/Extension workspace",component:t,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Integration-focused workspace that demonstrates additional columns, row-scoped menu commands, dependency visibility, and hide-mode filtering."}}}},n={args:{title:"Examples / extension workspace",description:"Shows how a host can combine custom task-list columns, scoped menu commands, dependency-focused filtering, and ref feedback without touching internal sources.",scenario:r(),extraToolbarContent:e.jsxs(e.Fragment,{children:[e.jsx("span",{children:"taskFilterQuery: 'dependency'"}),e.jsx("span",{children:"filterMode: 'hide'"}),e.jsx("span",{children:"additionalColumns: extensionWorkspaceColumns"}),e.jsx("span",{children:"taskListMenuCommands: extensionWorkspaceCommands"}),e.jsx("span",{children:"Run host command audit"})]})}};var s,o,a;n.parameters={...n.parameters,docs:{...(s=n.parameters)==null?void 0:s.docs,source:{originalSource:`{
  args: {
    title: 'Examples / extension workspace',
    description: 'Shows how a host can combine custom task-list columns, scoped menu commands, dependency-focused filtering, and ref feedback without touching internal sources.',
    scenario: createExtensionWorkspaceScenario(),
    extraToolbarContent: <>\r
        <span>taskFilterQuery: 'dependency'</span>\r
        <span>filterMode: 'hide'</span>\r
        <span>additionalColumns: extensionWorkspaceColumns</span>\r
        <span>taskListMenuCommands: extensionWorkspaceCommands</span>\r
        <span>Run host command audit</span>\r
      </>
  }
}`,...(a=(o=n.parameters)==null?void 0:o.docs)==null?void 0:a.source}}};const x=["IntegrationCommandCenter"];export{n as IntegrationCommandCenter,x as __namedExportsOrder,u as default};
