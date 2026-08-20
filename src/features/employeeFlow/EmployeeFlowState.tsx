import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Screening } from './types';

interface Value {
  activeScreening: Screening | null;
  setActiveScreening: (screening: Screening | null) => void;
}

const Context = createContext<Value | null>(null);

export function EmployeeFlowStateProvider({ children }: { children: ReactNode }) {
  const [activeScreening, setActiveScreening] = useState<Screening | null>(null);
  return <Context.Provider value={{ activeScreening, setActiveScreening }}>{children}</Context.Provider>;
}

// The provider and its colocated hook form one intentionally small feature boundary.
// eslint-disable-next-line react-refresh/only-export-components
export function useEmployeeFlowState() {
  const value = useContext(Context);
  if (!value) throw new Error('useEmployeeFlowState must be used within EmployeeFlowStateProvider');
  return value;
}
