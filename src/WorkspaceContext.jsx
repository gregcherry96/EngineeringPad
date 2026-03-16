import { createContext, useContext } from 'react';

export const WorkspaceContext = createContext({});

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
