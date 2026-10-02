import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import Alert from '../../components/common/Alert.jsx';
import { pushConfigured } from './firebaseConfig.js';

/** Foreground reminders remain visible on every authenticated page. */
export default function PushNotice() {
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!pushConfigured) return;
    let active = true;
    let unsubscribe;
    import('./push.js')
      .then(({ listenForPush }) =>
        listenForPush((payload) => {
          if (active) setNotice(payload.notification?.body || 'A new medication notice arrived.');
        })
      )
      .then((stop) => {
        if (active) unsubscribe = stop;
        else stop();
      })
      .catch(() => {});
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);
  if (!notice) return null;
  return (
    <Alert className="mb-4">
      {notice}{' '}
      <Link to="/today" className="underline">
        View doses
      </Link>{' '}
      <button type="button" onClick={() => setNotice('')} className="ml-3 underline">
        Dismiss
      </button>
    </Alert>
  );
}
