/**
 * Password policy validation
 * Minimum requirements:
 * - 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 8) {
    errors.push("Parola trebuie să aibă minim 8 caractere");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Parola trebuie să conțină cel puțin o literă mare");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Parola trebuie să conțină cel puțin o literă mică");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Parola trebuie să conțină cel puțin o cifră");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get password requirements as a user-friendly string
 */
export function getPasswordRequirements(): string {
  return "Minim 8 caractere, cel puțin o literă mare, o literă mică și o cifră";
}
