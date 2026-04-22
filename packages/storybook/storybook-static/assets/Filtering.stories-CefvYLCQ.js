import{C as k,d as s}from"./CapabilityStoryHarness-B61ZXIOI.js";import"./index-3rWi14TQ.js";import"./index-JhL3uwfD.js";import"./index-hLVmTiZX.js";import"./index-CTXTNBUN.js";const T={title:"Capabilities/Filtering",component:k,tags:["autodocs"],parameters:{layout:"fullscreen",docs:{description:{component:"Filtering stories demonstrate both highlight and hide modes on Storybook-local datasets, including the no-match boundary state and an empty query that leaves the catalog untouched."}}}},e={args:{title:"Filtering / highlight matched tasks",description:"Uses `taskFilter` with highlight mode so reviewers can keep the full dependency context visible while drawing attention to critical rows.",initialTasks:s(),filterMode:"highlight",taskFilterQuery:"Critical",highlightedTaskIds:new Set(["cap-interaction","cap-deps"])}},t={args:{title:"Filtering / hide non-matching tasks",description:"Same dataset in hide mode: only the matched rows remain visible, which exercises the documented filteredTaskIds / isFilterActive behavior through the public filter API.",initialTasks:s(),filterMode:"hide",taskFilterQuery:"Critical",highlightedTaskIds:new Set(["cap-interaction","cap-deps"])}},i={args:{title:"Filtering / no-match boundary state",description:"Negative case for an active filter with no results; the chart should stay mounted and signal the empty filtered view without touching the underlying task data.",initialTasks:s(),filterMode:"hide",taskFilterQuery:"No such task"}},a={args:{title:"Filtering / empty query is inactive",description:"Malformed-input guard: an empty search query does not activate filtering, so the full capability dataset remains visible and unmodified.",initialTasks:s(),filterMode:"highlight",taskFilterQuery:""}};var r,n,o;e.parameters={...e.parameters,docs:{...(r=e.parameters)==null?void 0:r.docs,source:{originalSource:`{
  args: {
    title: 'Filtering / highlight matched tasks',
    description: 'Uses \`taskFilter\` with highlight mode so reviewers can keep the full dependency context visible while drawing attention to critical rows.',
    initialTasks: createFilteringCapabilityTasks(),
    filterMode: 'highlight',
    taskFilterQuery: 'Critical',
    highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])
  }
}`,...(o=(n=e.parameters)==null?void 0:n.docs)==null?void 0:o.source}}};var l,c,d;t.parameters={...t.parameters,docs:{...(l=t.parameters)==null?void 0:l.docs,source:{originalSource:`{
  args: {
    title: 'Filtering / hide non-matching tasks',
    description: 'Same dataset in hide mode: only the matched rows remain visible, which exercises the documented filteredTaskIds / isFilterActive behavior through the public filter API.',
    initialTasks: createFilteringCapabilityTasks(),
    filterMode: 'hide',
    taskFilterQuery: 'Critical',
    highlightedTaskIds: new Set(['cap-interaction', 'cap-deps'])
  }
}`,...(d=(c=t.parameters)==null?void 0:c.docs)==null?void 0:d.source}}};var h,g,p;i.parameters={...i.parameters,docs:{...(h=i.parameters)==null?void 0:h.docs,source:{originalSource:`{
  args: {
    title: 'Filtering / no-match boundary state',
    description: 'Negative case for an active filter with no results; the chart should stay mounted and signal the empty filtered view without touching the underlying task data.',
    initialTasks: createFilteringCapabilityTasks(),
    filterMode: 'hide',
    taskFilterQuery: 'No such task'
  }
}`,...(p=(g=i.parameters)==null?void 0:g.docs)==null?void 0:p.source}}};var u,m,y;a.parameters={...a.parameters,docs:{...(u=a.parameters)==null?void 0:u.docs,source:{originalSource:`{
  args: {
    title: 'Filtering / empty query is inactive',
    description: 'Malformed-input guard: an empty search query does not activate filtering, so the full capability dataset remains visible and unmodified.',
    initialTasks: createFilteringCapabilityTasks(),
    filterMode: 'highlight',
    taskFilterQuery: ''
  }
}`,...(y=(m=a.parameters)==null?void 0:m.docs)==null?void 0:y.source}}};const M=["HighlightMatches","HideMatchesOnly","NoMatchesBoundary","EmptyQueryLeavesCatalogVisible"];export{a as EmptyQueryLeavesCatalogVisible,t as HideMatchesOnly,e as HighlightMatches,i as NoMatchesBoundary,M as __namedExportsOrder,T as default};
