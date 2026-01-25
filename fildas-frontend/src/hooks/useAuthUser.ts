import * as React from "react";
import { getAuthUser, AUTH_USER_KEY, type AuthUser } from "../lib/auth";

export function useAuthUser(): AuthUser | null {
  const [user, setUser] = React.useState<AuthUser | null>(() => getAuthUser());

  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_USER_KEY) setUser(getAuthUser());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return user;
}
