import { createContext, useContext } from 'react';

export type WorkspaceContextValue = {
  targetRole: string;
  setTargetRole: (role: string) => void;
  resetDirection: () => void;
};

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used inside WorkspaceProvider.');
  }
  return context;
}
