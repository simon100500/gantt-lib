import{C as k,e as y,b}from"./CapabilityStoryHarness-SHE3IjZG.js";import"./index-3rWi14TQ.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./index-CTXTNBUN.js";const v={title:"Capabilities/Interaction",component:k,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Interaction capability stories keep state local to Storybook while demonstrating merge-by-id `onTasksChange`, editability toggles, drag constraints, hierarchy collapse, and business-day scheduling."}}}},e={args:{title:"Interaction / editable merge-by-id surface",description:"Default interactive surface: inline edits, row actions, drag/resize, and hierarchy toggles feed local state through the documented partial-update merge contract.",initialTasks:b(),showTaskList:!0,showChart:!0}},a={args:{title:"Interaction / locked task names and drag disabled",description:"Constrained variant for reviewers who need to compare editable and locked behavior without changing datasets or wrapper semantics.",initialTasks:b(),disableTaskNameEditing:!0,disableTaskDrag:!0}},s={args:{title:"Interaction / business-days schedule semantics",description:"Business-days dataset spans a weekend so reviewers can verify weekday-aware duration semantics and partial-update merges without switching packages.",initialTasks:y(),businessDays:!0}},t={args:{title:"Interaction / calendar-day schedule semantics",description:"Same fixture family with calendar-day math enabled, making it easy to contrast with the business-days variant when editing dates or durations.",initialTasks:y(),businessDays:!1}};var i,r,n;e.parameters={...e.parameters,docs:{...(i=e.parameters)==null?void 0:i.docs,source:{originalSource:`{
  args: {
    title: 'Interaction / editable merge-by-id surface',
    description: 'Default interactive surface: inline edits, row actions, drag/resize, and hierarchy toggles feed local state through the documented partial-update merge contract.',
    initialTasks: createCapabilityTasks(),
    showTaskList: true,
    showChart: true
  }
}`,...(n=(r=e.parameters)==null?void 0:r.docs)==null?void 0:n.source}}};var o,d,c;a.parameters={...a.parameters,docs:{...(o=a.parameters)==null?void 0:o.docs,source:{originalSource:`{
  args: {
    title: 'Interaction / locked task names and drag disabled',
    description: 'Constrained variant for reviewers who need to compare editable and locked behavior without changing datasets or wrapper semantics.',
    initialTasks: createCapabilityTasks(),
    disableTaskNameEditing: true,
    disableTaskDrag: true
  }
}`,...(c=(d=a.parameters)==null?void 0:d.docs)==null?void 0:c.source}}};var l,u,p;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    title: 'Interaction / business-days schedule semantics',
    description: 'Business-days dataset spans a weekend so reviewers can verify weekday-aware duration semantics and partial-update merges without switching packages.',
    initialTasks: createBusinessDayCapabilityTasks(),
    businessDays: true
  }
}`,...(p=(u=s.parameters)==null?void 0:u.docs)==null?void 0:p.source}}};var m,g,h;t.parameters={...t.parameters,docs:{...(m=t.parameters)==null?void 0:m.docs,source:{originalSource:`{
  args: {
    title: 'Interaction / calendar-day schedule semantics',
    description: 'Same fixture family with calendar-day math enabled, making it easy to contrast with the business-days variant when editing dates or durations.',
    initialTasks: createBusinessDayCapabilityTasks(),
    businessDays: false
  }
}`,...(h=(g=t.parameters)==null?void 0:g.docs)==null?void 0:h.source}}};const S=["EditableSurface","LockedMode","BusinessDayScheduling","CalendarDayScheduling"];export{s as BusinessDayScheduling,t as CalendarDayScheduling,e as EditableSurface,a as LockedMode,S as __namedExportsOrder,v as default};
