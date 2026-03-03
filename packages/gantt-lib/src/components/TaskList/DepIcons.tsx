import React from 'react';
import type { LinkType } from '../../types';

const DepIconFS = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 12H3"/><path d="m11 18 6-6-6-6"/><path d="M21 5v14"/>
  </svg>
);

const DepIconSS = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5v14"/><path d="M21 12H7"/><path d="m15 18 6-6-6-6"/>
  </svg>
);

const DepIconFF = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m10 15 5 5 5-5"/><path d="M4 4h7a4 4 0 0 1 4 4v12"/>
  </svg>
);

const DepIconSF = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m14 15-5 5-5-5"/><path d="M20 4h-7a4 4 0 0 0-4 4v12"/>
  </svg>
);

export const LINK_TYPE_ICONS: Record<LinkType, React.FC> = {
  FS: DepIconFS,
  SS: DepIconSS,
  FF: DepIconFF,
  SF: DepIconSF,
};
