"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import type { UserRole } from "@/lib/types";
import { getStaffByClerkId, upsertStaffUser } from "@/lib/actions/staff";

interface AuthState {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, role: null, loading: true });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Upsert the staff record in Neon DB and retrieve their role.
        // The Firebase UID is used as the stable staff identifier.
        try {
          const staffUser = await upsertStaffUser({
            clerkUserId: user.uid,
            name: user.displayName ?? user.email?.split("@")[0] ?? "Staff",
            email: user.email ?? "",
          });
          setState({ user, role: staffUser.role as UserRole, loading: false });
        } catch {
          // Fallback: try a read-only lookup if upsert fails
          try {
            const existing = await getStaffByClerkId(user.uid);
            setState({ user, role: (existing?.role as UserRole) ?? "librarian", loading: false });
          } catch {
            setState({ user, role: "librarian", loading: false });
          }
        }
      } else {
        setState({ user: null, role: null, loading: false });
      }
    });
    return unsubscribe;
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
