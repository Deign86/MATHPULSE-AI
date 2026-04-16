export interface AdminCreateUserFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  status: string;
  grade: string;
  section: string;
  lrn: string;
}

export type AdminCreateUserField =
  | 'name'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'role'
  | 'status'
  | 'grade'
  | 'section'
  | 'lrn';

export type AdminCreateUserValidationErrors = Partial<Record<AdminCreateUserField, string>>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_UPPER_REGEX = /[A-Z]/;
const PASSWORD_LOWER_REGEX = /[a-z]/;
const PASSWORD_DIGIT_REGEX = /\d/;
const PASSWORD_SPECIAL_REGEX = /[^A-Za-z0-9]/;

export function validateAdminCreateUserForm(data: AdminCreateUserFormData): AdminCreateUserValidationErrors {
  const errors: AdminCreateUserValidationErrors = {};

  if (!data.name.trim()) {
    errors.name = 'Name is required.';
  }

  const email = data.email.trim().toLowerCase();
  if (!email) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  const password = data.password;
  if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (!PASSWORD_UPPER_REGEX.test(password)) {
    errors.password = 'Password must include at least one uppercase letter.';
  } else if (!PASSWORD_LOWER_REGEX.test(password)) {
    errors.password = 'Password must include at least one lowercase letter.';
  } else if (!PASSWORD_DIGIT_REGEX.test(password)) {
    errors.password = 'Password must include at least one number.';
  } else if (!PASSWORD_SPECIAL_REGEX.test(password)) {
    errors.password = 'Password must include at least one special character.';
  }

  if (!data.confirmPassword) {
    errors.confirmPassword = 'Confirm password is required.';
  } else if (data.confirmPassword !== password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!data.role.trim()) {
    errors.role = 'Role is required.';
  }

  if (!data.status.trim()) {
    errors.status = 'Status is required.';
  }

  if (!data.grade.trim()) {
    errors.grade = 'Grade is required.';
  }

  if (!data.section.trim()) {
    errors.section = 'Section is required.';
  }

  if (data.role.trim().toLowerCase() === 'student' && !data.lrn.trim()) {
    errors.lrn = 'LRN is required for student accounts.';
  }

  return errors;
}

export function getFirstValidationError(errors: AdminCreateUserValidationErrors): string | null {
  const first = Object.values(errors).find((message) => !!message);
  return first ?? null;
}
