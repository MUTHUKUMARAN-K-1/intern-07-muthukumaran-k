import { useCallback, useState } from 'react';

import notificationsApi from '../../api/notifications.js';
import Alert from '../../components/common/Alert.jsx';
import Button from '../../components/common/Button.jsx';
import Card from '../../components/common/Card.jsx';
import { useApi } from '../../hooks/useApi.js';
import { pushConfigured } from './firebaseConfig.js';

export default function PushDevices() {
  const fetchDevices = useCallback(() => notificationsApi.listDevices(), []);
  const devices = useApi(fetchDevices);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function enable() {
    setBusy(true);
    setError('');
    try {
      const { enablePush } = await import('./push.js');
      await enablePush();
      setNotice('This browser is registered for medicine reminders.');
      devices.reload();
    } catch (reason) {
      setError(reason.message || 'Browser registration failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setError('');
    try {
      if (localStorage.getItem('pillsync.push-device') === id) {
        const { disablePush } = await import('./push.js');
        await disablePush();
      } else await notificationsApi.removeDevice(id);
      devices.reload();
    } catch (reason) {
      setError(reason.message || 'Could not remove the device.');
    }
  }

  const rows = devices.data?.results || devices.data || [];
  return (
    <Card title="Browser reminders" subtitle="Register this browser to receive push notifications">
      {notice && (
        <Alert tone="success" className="mb-3">
          {notice}
        </Alert>
      )}
      {(error || devices.error) && (
        <Alert tone="error" className="mb-3">
          {error || devices.error.message}
        </Alert>
      )}
      {pushConfigured ? (
        <Button type="button" onClick={enable} loading={busy}>
          Enable on this browser
        </Button>
      ) : (
        <p className="text-sm text-slate-600">
          Browser push is unavailable on this deployment. Email and SMS preferences are below.
        </p>
      )}
      <ul className="mt-4 divide-y divide-slate-100">
        {rows.map((device) => (
          <li key={device.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>{device.device_name || device.platform}</span>
            <Button variant="ghost" size="sm" onClick={() => remove(device.id)}>
              Remove device
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
