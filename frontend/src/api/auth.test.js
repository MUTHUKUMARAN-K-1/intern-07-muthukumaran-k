import { beforeEach, expect, it, vi } from 'vitest';

import authApi from './auth.js';
import api, { tokenStorage } from './client.js';
import { disablePush } from '../features/notifications/push.js';

vi.mock('./client.js', () => ({
  default: { post: vi.fn() },
  tokenStorage: { getRefresh: vi.fn(), clear: vi.fn(), set: vi.fn() },
}));
vi.mock('../features/notifications/push.js', () => ({ disablePush: vi.fn() }));

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  tokenStorage.getRefresh.mockReturnValue('local-test-refresh');
  localStorage.setItem('pillsync.push-device', 'owned-device');
  disablePush.mockResolvedValue(undefined);
});

it('revokes the owned device with logout before cleaning up the browser token', async () => {
  api.post.mockResolvedValue({});
  await authApi.logout();
  expect(api.post).toHaveBeenCalledWith('/auth/logout/', {
    refresh: 'local-test-refresh',
    device_id: 'owned-device',
  });
  expect(disablePush).toHaveBeenCalledWith({ serverRevoked: true });
  expect(localStorage.getItem('pillsync.push-device')).toBeNull();
  expect(tokenStorage.clear).toHaveBeenCalled();
});

it('still attempts device cleanup and forgets tokens when the logout request fails', async () => {
  api.post.mockRejectedValue(new Error('offline'));
  disablePush.mockRejectedValue(new Error('offline'));
  await expect(authApi.logout()).rejects.toThrow('offline');
  expect(disablePush).toHaveBeenCalledWith({ serverRevoked: false });
  expect(localStorage.getItem('pillsync.push-device')).toBeNull();
  expect(tokenStorage.clear).toHaveBeenCalled();
});

it('stores the Google sign-in token envelope and returns the verified user', async () => {
  const tokens = { access: 'local-test-access', refresh: 'local-test-refresh' };
  const user = { role: 'CAREGIVER' };
  api.post.mockResolvedValue({ data: { tokens, user } });
  expect(await authApi.loginWithGoogle({ idToken: 'local-test-id', role: 'CAREGIVER' })).toEqual(
    user
  );
  expect(tokenStorage.set).toHaveBeenCalledWith(tokens);
});
