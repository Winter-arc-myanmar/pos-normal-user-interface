// Regex patterns for password validation
export const passwordRegex = {
  upperCase: /[A-Z]/,
  lowerCase: /[a-z]/,
  number: /[0-9]/,
  special: /[^A-Za-z0-9]/,
};

export interface PasswordRequirement {
  label: string;
  isValid: boolean;
}

/**
 * Check password strength based on various criteria
 * @param password The password to check
 * @param t Translation function
 * @returns An array of password requirements with validity indicators
 */
export function checkPasswordStrength(
  password: string,
  t: (key: string) => string
): PasswordRequirement[] {
  const minLength = 6; // Updated to match validation schemas

  return [
    {
      label: t("password.atLeast6Characters"),
      isValid: password.length >= minLength,
    },
    {
      label: t("password.atLeastOneUppercase"),
      isValid: passwordRegex.upperCase.test(password),
    },
    {
      label: t("password.atLeastOneLowercase"),
      isValid: passwordRegex.lowerCase.test(password),
    },
    {
      label: t("password.atLeastOneNumber"),
      isValid: passwordRegex.number.test(password),
    },
    {
      label: t("password.atLeastOneSpecialCharacter"),
      isValid: passwordRegex.special.test(password),
    },
  ];
}

/**
 * Calculate overall password strength percentage
 * @param password The password to check
 * @param t Translation function
 * @returns A number between 0-100 representing password strength
 */
export function calculatePasswordStrength(
  password: string,
  t: (key: string) => string
): number {
  if (!password) return 0;

  const requirements = checkPasswordStrength(password, t);
  const validRequirements = requirements.filter((req) => req.isValid).length;

  return Math.round((validRequirements / requirements.length) * 100);
}
