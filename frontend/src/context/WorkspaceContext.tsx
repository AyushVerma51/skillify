import { useCallback, useEffect, useState } from 'react';
import { WorkspaceContext } from './workspace';

const TARGET_ROLE_KEY = 'skillify_target_role';
const DIRECTION_STORAGE_KEYS = [TARGET_ROLE_KEY, 'skillify_roadmap'] as const;

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [targetRole, setTargetRoleState] = useState(() => (
    localStorage.getItem(TARGET_ROLE_KEY) || ''
  ));

  const setTargetRole = useCallback((role: string) => {
    const cleaned = role.trim();
    setTargetRoleState(cleaned);
    if (cleaned) {
      localStorage.setItem(TARGET_ROLE_KEY, cleaned);
    } else {
      localStorage.removeItem(TARGET_ROLE_KEY);
    }
  }, []);

  const resetDirection = useCallback(() => {
    setTargetRoleState('');
    // Preserve unrelated browser data while removing state derived from the old role.
    DIRECTION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  useEffect(() => {
    const syncRole = (event: StorageEvent) => {
      if (event.key === TARGET_ROLE_KEY) {
        setTargetRoleState(event.newValue || '');
      }
    };
    window.addEventListener('storage', syncRole);
    return () => window.removeEventListener('storage', syncRole);
  }, []);

  return (
    <WorkspaceContext.Provider value={{ targetRole, setTargetRole, resetDirection }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
