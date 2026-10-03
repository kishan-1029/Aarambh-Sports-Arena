import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import {
  dobError,
  isEmail,
  isName,
  isPasswordStrong,
  maxDobIST,
  mobileError,
  normalizeEmail,
  normalizeMobile,
  trimName,
} from '../validate';
import logoStacked from '../assets/brand/logo-stacked.png';

export default function AuthModal({ mode = 'login', next = null, onSuccess = null, onClose }) {
  const { login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [currentMode, setCurrentMode] = useState(mode);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState('');
  const emailRef = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    setErrors({});
    setApiError('');
    if (currentMode === 'login') {
      emailRef.current?.focus();
    } else {
      nameRef.current?.focus();
    }
  }, [currentMode]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const newErrors = {};
    if (!loginForm.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!isEmail(loginForm.email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!loginForm.password) {
      newErrors.password = 'Password is required.';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setBusy(true);
    try {
      await login({
        email: normalizeEmail(loginForm.email),
        password: loginForm.password,
      });
      toast.success('Signed in successfully!');
      onClose();
      if (onSuccess) {
        onSuccess();
      } else if (next) {
        navigate(next);
      }
    } catch (err) {
      setApiError(err.message || 'Incorrect email or password.');
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    const newErrors = {};
    if (!isName(registerForm.name)) newErrors.name = 'Full name is required (min 2 characters).';
    if (!isEmail(registerForm.email)) newErrors.email = 'Enter a valid email address.';
    const phoneErr = mobileError(registerForm.phone);
    if (phoneErr) newErrors.phone = phoneErr;
    const dobErr = dobError(registerForm.dob);
    if (dobErr) newErrors.dob = dobErr;
    if (!isPasswordStrong(registerForm.password)) {
      newErrors.password = 'Password must be at least 8 characters with at least one letter and one number.';
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setBusy(true);
    try {
      await register({
        name: trimName(registerForm.name),
        email: normalizeEmail(registerForm.email),
        phone: normalizeMobile(registerForm.phone),
        dob: registerForm.dob,
        password: registerForm.password,
      });
      toast.success('Account created successfully!');
      onClose();
      if (onSuccess) {
        onSuccess();
      } else if (next) {
        navigate(next);
      }
    } catch (err) {
      setApiError(err.message || 'Failed to create account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-back" role="presentation" onClick={() => !busy && onClose()}>
      <div
        className="modal auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="modal-close"
          type="button"
          aria-label="Close"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>

        <img className="auth-logo" src={logoStacked} alt="Aarambh Sports Arena" />

        {currentMode === 'login' ? (
          <>
            <h2 id="auth-title" style={{ textAlign: 'center', marginBottom: 4 }}>
              Welcome back
            </h2>
            <p className="lead" style={{ textAlign: 'center', marginBottom: 20 }}>
              Sign in to continue
            </p>

            {apiError && <div className="msg msg-err" style={{ marginBottom: 16 }}>{apiError}</div>}

            <form className="stack" onSubmit={handleLoginSubmit} noValidate>
              <label className={`field${errors.email ? ' invalid' : ''}`}>
                <span>Email</span>
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                />
                {errors.email && <small className="field-error">{errors.email}</small>}
              </label>

              <label className={`field${errors.password ? ' invalid' : ''}`}>
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                />
                {errors.password && <small className="field-error">{errors.password}</small>}
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4 }}>
                <button
                  type="button"
                  className="text-link"
                  style={{ fontSize: 13 }}
                  onClick={() => toast.info('Please contact club support to reset your password.')}
                >
                  Forgot Password?
                </button>
              </div>

              <button
                className="btn btn-primary btn-block"
                type="submit"
                disabled={busy}
                style={{ marginTop: 8 }}
              >
                {busy ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <p className="auth-switch">
              Don't have an account?{' '}
              <button type="button" onClick={() => setCurrentMode('register')}>
                Create Account
              </button>
            </p>
          </>
        ) : (
          <>
            <h2 id="auth-title" style={{ textAlign: 'center', marginBottom: 4 }}>
              Create account
            </h2>
            <p className="lead" style={{ textAlign: 'center', marginBottom: 20 }}>
              Join Aarambh Sports Arena
            </p>

            {apiError && <div className="msg msg-err" style={{ marginBottom: 16 }}>{apiError}</div>}

            <form className="stack" onSubmit={handleRegisterSubmit} noValidate>
              <label className={`field${errors.name ? ' invalid' : ''}`}>
                <span>Full Name</span>
                <input
                  ref={nameRef}
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Your full name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                />
                {errors.name && <small className="field-error">{errors.name}</small>}
              </label>

              <label className={`field${errors.email ? ' invalid' : ''}`}>
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                />
                {errors.email && <small className="field-error">{errors.email}</small>}
              </label>

              <label className={`field${errors.phone ? ' invalid' : ''}`}>
                <span>Mobile Number</span>
                <span className="phone-field">
                  <span>+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    name="phone"
                    autoComplete="tel"
                    placeholder="9876543210"
                    value={registerForm.phone}
                    onChange={(e) => {
                      const digits = normalizeMobile(e.target.value);
                      setRegisterForm({ ...registerForm, phone: digits.slice(0, 10) });
                    }}
                  />
                </span>
                {errors.phone && <small className="field-error">{errors.phone}</small>}
              </label>

              <label className={`field${errors.dob ? ' invalid' : ''}`}>
                <span>Date of Birth</span>
                <input
                  type="date"
                  name="dob"
                  max={maxDobIST()}
                  value={registerForm.dob}
                  onChange={(e) => setRegisterForm({ ...registerForm, dob: e.target.value })}
                />
                {errors.dob && <small className="field-error">{errors.dob}</small>}
              </label>

              <label className={`field${errors.password ? ' invalid' : ''}`}>
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                />
                <ul className="password-rules" style={{ marginTop: 4 }}>
                  <li className={registerForm.password.length >= 8 ? 'ok' : ''}>At least 8 characters</li>
                  <li className={/[a-zA-Z]/.test(registerForm.password) ? 'ok' : ''}>At least one letter</li>
                  <li className={/[0-9]/.test(registerForm.password) ? 'ok' : ''}>At least one number</li>
                </ul>
                {errors.password && <small className="field-error">{errors.password}</small>}
              </label>

              <label className={`field${errors.confirmPassword ? ' invalid' : ''}`}>
                <span>Confirm Password</span>
                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  value={registerForm.confirmPassword}
                  onChange={(e) =>
                    setRegisterForm({ ...registerForm, confirmPassword: e.target.value })
                  }
                />
                {errors.confirmPassword && (
                  <small className="field-error">{errors.confirmPassword}</small>
                )}
              </label>

              <button
                className="btn btn-primary btn-block"
                type="submit"
                disabled={busy}
                style={{ marginTop: 8 }}
              >
                {busy ? 'Creating account…' : 'Create Account'}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?{' '}
              <button type="button" onClick={() => setCurrentMode('login')}>
                Sign In
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
