import React from 'react';

// Vitest uses the classic JSX transform in this repository's Node test
// environment, while Vite production builds use the React plugin. Make the
// classic runtime available to component rendering tests without a DOM shim.
globalThis.React = React;
