import{C as m,f as b,b as y,g as L}from"./CapabilityStoryHarness-SHE3IjZG.js";import"./index-3rWi14TQ.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./index-CTXTNBUN.js";const W={title:"Capabilities/Layout",component:m,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Layout capability stories isolate split, chart-only, task-list-only, collapsed hierarchy, and alternate view-mode surfaces without importing website runtime helpers."}}}},t={args:{title:"Layout / split chart + task list",description:"Baseline capability surface with both panes visible, baseline markers enabled, and the default daily grid for quick visual parity checks.",initialTasks:y(),showTaskList:!0,showChart:!0,taskListWidth:420,viewMode:"day"}},e={args:{title:"Layout / chart only month view",description:"Boundary condition for reviewers who want the timeline without task-list chrome; uses month mode so spacing shifts are visible in isolation.",initialTasks:b(),showTaskList:!1,showChart:!0,showBaseline:!0,viewMode:"month"}},s={args:{title:"Layout / task list only collapsed hierarchy",description:"Task-list-only boundary surface with the parent row collapsed so hierarchy visibility can be reviewed without chart rendering noise.",initialTasks:L(),showTaskList:!0,showChart:!1,taskListWidth:560,initiallyCollapsedParentIds:["cap-program"]}},a={args:{title:"Layout / week view with wider task list",description:"Alternative week-scale layout surface to verify that custom columns and the task-list width still coexist with denser timeline blocks.",initialTasks:y(),showTaskList:!0,showChart:!0,taskListWidth:540,viewMode:"week"}};var i,r,o;t.parameters={...t.parameters,docs:{...(i=t.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    title: 'Layout / split chart + task list',
    description: 'Baseline capability surface with both panes visible, baseline markers enabled, and the default daily grid for quick visual parity checks.',
    initialTasks: createCapabilityTasks(),
    showTaskList: true,
    showChart: true,
    taskListWidth: 420,
    viewMode: 'day'
  }
}`,...(o=(r=t.parameters)==null?void 0:r.docs)==null?void 0:o.source}}};var n,l,c;e.parameters={...e.parameters,docs:{...(n=e.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    title: 'Layout / chart only month view',
    description: 'Boundary condition for reviewers who want the timeline without task-list chrome; uses month mode so spacing shifts are visible in isolation.',
    initialTasks: createChartOnlyCapabilityTasks(),
    showTaskList: false,
    showChart: true,
    showBaseline: true,
    viewMode: 'month'
  }
}`,...(c=(l=e.parameters)==null?void 0:l.docs)==null?void 0:c.source}}};var h,d,p;s.parameters={...s.parameters,docs:{...(h=s.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    title: 'Layout / task list only collapsed hierarchy',
    description: 'Task-list-only boundary surface with the parent row collapsed so hierarchy visibility can be reviewed without chart rendering noise.',
    initialTasks: createTaskListOnlyCapabilityTasks(),
    showTaskList: true,
    showChart: false,
    taskListWidth: 560,
    initiallyCollapsedParentIds: ['cap-program']
  }
}`,...(p=(d=s.parameters)==null?void 0:d.docs)==null?void 0:p.source}}};var u,w,k;a.parameters={...a.parameters,docs:{...(u=a.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    title: 'Layout / week view with wider task list',
    description: 'Alternative week-scale layout surface to verify that custom columns and the task-list width still coexist with denser timeline blocks.',
    initialTasks: createCapabilityTasks(),
    showTaskList: true,
    showChart: true,
    taskListWidth: 540,
    viewMode: 'week'
  }
}`,...(k=(w=a.parameters)==null?void 0:w.docs)==null?void 0:k.source}}};const O=["SplitView","ChartOnlyMonthView","TaskListOnlyCollapsed","WeekViewWithWiderList"];export{e as ChartOnlyMonthView,t as SplitView,s as TaskListOnlyCollapsed,a as WeekViewWithWiderList,O as __namedExportsOrder,W as default};
