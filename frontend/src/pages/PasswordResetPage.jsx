import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import authApi from '../api/auth.js';
import { fieldError } from '../api/client.js';
import Alert from '../components/common/Alert.jsx';
import Button from '../components/common/Button.jsx';
import Input from '../components/common/Input.jsx';
import {
  collectErrors,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
} from '../utils/validation.js';
import AuthLayout from './AuthLayout.jsx';

export default function PasswordResetPage({ confirm = false }) {
  const [params] = useSearchParams();
  const [values, setValues] = useState({ email: '', new_password: '', new_password_confirm: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const uid = params.get('uid');
  const token = params.get('token');
  const invalidLink = confirm && (!uid || !token);

  function change(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
    setErrors({});
    setServerError(null);
  }

  async function submit(event) {
    event.preventDefault();
    const found = collectErrors(
      confirm
        ? {
            new_password: validatePassword(values.new_password),
            new_password_confirm: validatePasswordConfirmation(
              values.new_password,
              values.new_password_confirm
            ),
          }
        : { email: validateEmail(values.email) }
    );
    setErrors(found);
    if (Object.keys(found).length || invalidLink) return;
    setLoading(true);
    setServerError(null);
    try {
      const result = confirm
        ? await authApi.confirmPasswordReset({
            uid,
            token,
            new_password: values.new_password,
            new_password_confirm: values.new_password_confirm,
          })
        : await authApi.requestPasswordReset(values.email);
      setValues({ email: '', new_password: '', new_password_confirm: '' });
      setMessage(result.detail);
    } catch (error) {
      setServerError(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={confirm ? 'Choose a new password' : 'Reset your password'}
      subtitle={confirm ? 'Use at least 10 characters.' : 'We will email you a link to reset it.'}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        {invalidLink && (
          <Alert tone="error">
            This reset link is incomplete. <Link to="/forgot-password">Request a new link.</Link>
          </Alert>
        )}
        {serverError && <Alert tone="error">{serverError.message}</Alert>}
        {message ? (
          <Alert tone="success">{message}</Alert>
        ) : confirm ? (
          <>
            <Input
              label="New password"
              name="new_password"
              type="password"
              autoComplete="new-password"
              value={values.new_password}
              onChange={change}
              error={errors.new_password || fieldError(serverError, 'new_password')}
              required
            />
            <Input
              label="Repeat new password"
              name="new_password_confirm"
              type="password"
              autoComplete="new-password"
              value={values.new_password_confirm}
              onChange={change}
              error={errors.new_password_confirm || fieldError(serverError, 'new_password_confirm')}
              required
            />
          </>
        ) : (
          <Input
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={change}
            error={errors.email || fieldError(serverError, 'email')}
            required
          />
        )}
        {!message && (
          <Button type="submit" loading={loading} disabled={invalidLink} className="w-full">
            {confirm ? 'Save new password' : 'Send reset link'}
          </Button>
        )}
        <Link to="/login" className="block text-center text-sm font-medium text-brand-700">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
