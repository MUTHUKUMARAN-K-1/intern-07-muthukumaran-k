import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithProviders, anonymousState } from '../../tests/utils.jsx';
import authApi from '../api/auth.js';
import PasswordResetPage from './PasswordResetPage.jsx';

vi.mock('../api/auth.js', () => ({
  default: { requestPasswordReset: vi.fn(), confirmPasswordReset: vi.fn() },
}));

describe('Password reset', () => {
  beforeEach(() => vi.clearAllMocks());
  it('sends a reset request and shows the neutral account-enumeration response', async () => {
    authApi.requestPasswordReset.mockResolvedValue({
      detail: 'If that email is registered, a reset link is on its way.',
    });
    const user = userEvent.setup();
    renderWithProviders(<PasswordResetPage />, { preloadedState: anonymousState() });
    await user.type(screen.getByLabelText(/Email address/), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('If that email is registered');
    expect(authApi.requestPasswordReset).toHaveBeenCalledWith('asha@example.com');
  });
  it('refuses an incomplete reset link before a network request', () => {
    renderWithProviders(<PasswordResetPage confirm />, { preloadedState: anonymousState() });
    expect(screen.getByRole('button', { name: 'Save new password' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('incomplete');
    expect(authApi.confirmPasswordReset).not.toHaveBeenCalled();
  });
  it('passes the emailed reset credentials with the validated new password', async () => {
    authApi.confirmPasswordReset.mockResolvedValue({ detail: 'Your password has been reset.' });
    renderWithProviders(<PasswordResetPage confirm />, {
      preloadedState: anonymousState(),
      route: '/reset-password?uid=user-id&token=local-test-token',
    });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/^New password/), 'new-password-for-test-123');
    await user.type(screen.getByLabelText(/Repeat new password/), 'new-password-for-test-123');
    await user.click(screen.getByRole('button', { name: 'Save new password' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your password has been reset');
    expect(authApi.confirmPasswordReset).toHaveBeenCalledWith({
      uid: 'user-id',
      token: 'local-test-token',
      new_password: 'new-password-for-test-123',
      new_password_confirm: 'new-password-for-test-123',
    });
  });
});
