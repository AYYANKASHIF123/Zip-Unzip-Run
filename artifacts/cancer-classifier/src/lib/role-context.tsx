import { createContext, useContext, useState } from "react";

export type Role = "admin" | "researcher" | "viewer";

interface RoleUser {
  name: string;
  email: string;
  initials: string;
  department: string;
}

interface RoleContextType {
  role: Role;
  setRole: (r: Role) => void;
  user: RoleUser;
  can: (action: "manage_datasets" | "upload" | "train" | "delete" | "settings") => boolean;
}

const USERS: Record<Role, RoleUser> = {
  admin:      { name: "Prof. S. Chen",   email: "s.chen@genomicslab.ac.uk",    initials: "SC", department: "Bioinformatics Dept." },
  researcher: { name: "Dr. A. Rahman",  email: "a.rahman@genomicslab.ac.uk",   initials: "AR", department: "Cancer Research Unit" },
  viewer:     { name: "M. Thompson",    email: "m.thompson@genomicslab.ac.uk", initials: "MT", department: "Clinical Liaison" },
};

const PERMISSIONS: Record<Role, Set<string>> = {
  admin:      new Set(["manage_datasets", "upload", "train", "delete", "settings"]),
  researcher: new Set(["upload", "train"]),
  viewer:     new Set([]),
};

const RoleContext = createContext<RoleContextType>({
  role: "researcher",
  setRole: () => {},
  user: USERS.researcher,
  can: () => false,
});

export const useRole = () => useContext(RoleContext);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>("researcher");
  const can = (action: string) => PERMISSIONS[role].has(action);
  return (
    <RoleContext.Provider value={{ role, setRole, user: USERS[role], can }}>
      {children}
    </RoleContext.Provider>
  );
}
