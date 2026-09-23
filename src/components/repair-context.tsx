import { createContext, useContext, useState, type ReactNode } from "react";

type RepairContextValue = {
  open: () => void;
  isOpen: boolean;
  close: () => void;
};

const RepairContext = createContext<RepairContextValue | null>(null);

export function RepairProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <RepairContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </RepairContext.Provider>
  );
}

export function useRepair() {
  const ctx = useContext(RepairContext);
  if (!ctx) throw new Error("useRepair must be used within RepairProvider");
  return ctx;
}
