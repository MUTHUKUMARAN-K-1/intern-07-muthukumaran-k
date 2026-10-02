import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import Alert from '../../components/common/Alert.jsx';
import Select from '../../components/common/Select.jsx';
import { loginWithGoogle } from '../../store/authSlice.js';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let scriptPromise;

function loadGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve(window.google.accounts.id);
      script.onerror = () => {
        script.remove();
        scriptPromise = null;
        reject(
          new Error('Google sign-in could not load. You can still sign in with your password.')
        );
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export default function GoogleSignIn() {
  const target = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [role, setRole] = useState('PATIENT');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!CLIENT_ID) return;
    let active = true;
    loadGoogle()
      .then((google) => {
        if (!active) return;
        google.initialize({
          client_id: CLIENT_ID,
          callback: async ({ credential }) => {
            if (!active) return;
            const result = await dispatch(loginWithGoogle({ idToken: credential, role }));
            if (!active) return;
            if (loginWithGoogle.fulfilled.match(result)) navigate('/', { replace: true });
            else setError(result.payload?.message || 'Google sign-in failed. Try again.');
          },
          auto_select: false,
        });
        google.renderButton(target.current, { theme: 'outline', size: 'large', width: 300 });
      })
      .catch((reason) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
    };
  }, [dispatch, navigate, role]);

  if (!CLIENT_ID) return null;
  return (
    <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
      {error && <Alert tone="error">{error}</Alert>}
      <Select
        label="For a new Google account, I am a"
        value={role}
        onChange={(event) => setRole(event.target.value)}
        options={[
          { value: 'PATIENT', label: 'Patient' },
          { value: 'CAREGIVER', label: 'Caregiver' },
        ]}
      />
      <div ref={target} />
    </div>
  );
}
