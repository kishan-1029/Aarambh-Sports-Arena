export function isEmail(val) {
  if (!val || typeof val !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
}

export function normalizeEmail(val) {
  return typeof val === 'string' ? val.trim().toLowerCase() : '';
}

export function normalizeMobile(val) {
  if (!val) return '';
  let digits = String(val).replace(/\D+/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
}

export function mobileError(val) {
  const digits = normalizeMobile(val);
  if (!digits) return 'Mobile number is required.';
  if (digits.length !== 10) return 'Enter a valid 10-digit mobile number.';
  if (!/^[6-9]/.test(digits)) return 'Mobile number must start with 6, 7, 8 or 9.';
  return null;
}

export function isName(val) {
  return typeof val === 'string' && val.trim().length >= 2;
}

export function trimName(val) {
  return typeof val === 'string' ? val.trim() : '';
}

export function isPasswordStrong(pwd) {
  if (!pwd || pwd.length < 8) return false;
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  return hasLetter && hasNumber;
}

export function maxDobIST() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 12);
  return d.toISOString().slice(0, 10);
}

export function dobError(val) {
  if (!val) return 'Date of birth is required.';
  const selected = new Date(val);
  const now = new Date();
  if (isNaN(selected.getTime())) return 'Please enter a valid date.';
  if (selected > now) return 'Date of birth cannot be in the future.';
  const maxDob = new Date();
  maxDob.setFullYear(maxDob.getFullYear() - 12);
  if (selected > maxDob) return 'You must be at least 12 years old.';
  return null;
}
