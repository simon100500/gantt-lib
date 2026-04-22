import{C as f,c as i,a as h}from"./CapabilityStoryHarness-B61ZXIOI.js";import"./index-3rWi14TQ.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./index-CTXTNBUN.js";const T={title:"Capabilities/Dependencies",component:f,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Dependency capability stories cover FS/SS/FF/SF surfaces, validation visibility, hard-mode cascade wiring, and unconstrained debugging using only documented public props."}}}},e={args:{title:"Dependencies / FS, SS, FF, SF semantics",description:"Reference dependency surface with all four public link types represented so reviewers can inspect line routing and milestone adjacency in one place.",initialTasks:i()}},a={args:{title:"Dependencies / hard-mode cascade via onCascade",description:"Auto-schedule hard mode routes drag completion through `onCascade` instead of `onTasksChange`, matching the documented separation of concerns.",initialTasks:i(),enableAutoSchedule:!0,disableConstraints:!1}},s={args:{title:"Dependencies / unconstrained debug surface",description:"Debug variant disables dependency constraints while keeping dependency rows visible, useful for layout inspection and manual what-if edits.",initialTasks:i(),disableConstraints:!0}},n={args:{title:"Dependencies / invalid predecessor visibility",description:"Negative fixture deliberately references a missing predecessor so dependency validation warnings remain observable from the Storybook surface.",initialTasks:h()}};var r,t,o;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    title: 'Dependencies / FS, SS, FF, SF semantics',
    description: 'Reference dependency surface with all four public link types represented so reviewers can inspect line routing and milestone adjacency in one place.',
    initialTasks: createDependencyFocusedCapabilityTasks()
  }
}`,...(o=(t=e.parameters)==null?void 0:t.docs)==null?void 0:o.source}}};var c,d,p;a.parameters={...a.parameters,docs:{...(c=a.parameters)==null?void 0:c.docs,source:{originalSource:`{
  args: {
    title: 'Dependencies / hard-mode cascade via onCascade',
    description: 'Auto-schedule hard mode routes drag completion through \`onCascade\` instead of \`onTasksChange\`, matching the documented separation of concerns.',
    initialTasks: createDependencyFocusedCapabilityTasks(),
    enableAutoSchedule: true,
    disableConstraints: false
  }
}`,...(p=(d=a.parameters)==null?void 0:d.docs)==null?void 0:p.source}}};var l,u,m;s.parameters={...s.parameters,docs:{...(l=s.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    title: 'Dependencies / unconstrained debug surface',
    description: 'Debug variant disables dependency constraints while keeping dependency rows visible, useful for layout inspection and manual what-if edits.',
    initialTasks: createDependencyFocusedCapabilityTasks(),
    disableConstraints: true
  }
}`,...(m=(u=s.parameters)==null?void 0:u.docs)==null?void 0:m.source}}};var y,g,b;n.parameters={...n.parameters,docs:{...(y=n.parameters)==null?void 0:y.docs,source:{originalSource:`{
  args: {
    title: 'Dependencies / invalid predecessor visibility',
    description: 'Negative fixture deliberately references a missing predecessor so dependency validation warnings remain observable from the Storybook surface.',
    initialTasks: createInvalidDependencyCapabilityTasks()
  }
}`,...(b=(g=n.parameters)==null?void 0:g.docs)==null?void 0:b.source}}};const F=["MixedDependencyTypes","HardModeCascade","UnconstrainedDebugMode","InvalidPredecessorValidation"];export{a as HardModeCascade,n as InvalidPredecessorValidation,e as MixedDependencyTypes,s as UnconstrainedDebugMode,F as __namedExportsOrder,T as default};
