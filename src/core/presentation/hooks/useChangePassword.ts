import { useCallback, useState } from "react";
import container from "../../infrastructure/di/container";
import type { IAuthService } from "../../domain/services/IAuthService";

export {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "../../application/services/AuthService";

/**
 * Change the signed-in person's own password from the profile screen.
 *
 * The backend answers a wrong current password with 400 (never 401), so a typo
 * shows an error here and leaves the device signed in.
 */
export function useChangePassword() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<boolean> => {
      setError(null);
      setChanged(false);
      setIsSaving(true);
      try {
        await container
          .resolve<IAuthService>("authService")
          .changePassword({ currentPassword, newPassword });
        setChanged(true);
        return true;
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to change the password."
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  /** Lets the form clear the "Password changed." note as soon as it is edited. */
  const reset = useCallback(() => {
    setError(null);
    setChanged(false);
  }, []);

  return { isSaving, error, changed, changePassword, reset };
}
