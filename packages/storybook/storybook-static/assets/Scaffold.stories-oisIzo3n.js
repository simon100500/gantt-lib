import{j as d}from"./index-3rWi14TQ.js";import{b as m,i as u,C as y}from"./CapabilityStoryHarness-SHE3IjZG.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./index-CTXTNBUN.js";const p=(t="2026-04-20")=>m({anchorDate:t}),k=()=>u();function s({initialTasks:t=p()}){return d.jsx(y,{title:"Baseline Storybook scaffold",description:"This story keeps fixtures inside the Storybook workspace and renders the chart through the published gantt-lib API plus the required CSS contract.",initialTasks:t,showTaskList:!0,showChart:!0,taskListWidth:360})}try{s.displayName="StorybookScaffold",s.__docgenInfo={description:"",displayName:"StorybookScaffold",props:{initialTasks:{defaultValue:{value:"createStorybookTasks()"},description:"",name:"initialTasks",required:!1,type:{name:"Task[]"}}}}}catch{}const T={title:"Overview/Scaffold",component:s,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Baseline gantt-lib rendering through the public package surface with Storybook-local fixtures and required CSS loaded from preview.ts."}}}},e={args:{initialTasks:p()}},a={args:{initialTasks:k()},parameters:{docs:{description:{story:"Negative test fixture: the chart should still mount cleanly with an empty task array."}}}};var r,o,i;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    initialTasks: createStorybookTasks()
  }
}`,...(i=(o=e.parameters)==null?void 0:o.docs)==null?void 0:i.source}}};var n,c,l;a.parameters={...a.parameters,docs:{...(n=a.parameters)==null?void 0:n.docs,source:{originalSource:`{
  args: {
    initialTasks: createEmptyStorybookTasks() as Task[]
  },
  parameters: {
    docs: {
      description: {
        story: 'Negative test fixture: the chart should still mount cleanly with an empty task array.'
      }
    }
  }
}`,...(l=(c=a.parameters)==null?void 0:c.docs)==null?void 0:l.source}}};const _=["Default","EmptyState"];export{e as Default,a as EmptyState,_ as __namedExportsOrder,T as default};
