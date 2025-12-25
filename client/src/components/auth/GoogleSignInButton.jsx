import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../../api/config';

const SCRIPT_ID = 'google-identity-services';

const loadGoogleScript = () => {
  return new Promise((resolve, reject) => {
    if (document.getElementById(SCRIPT_ID)) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(script);
  });
};

const GoogleSignInButton = ({ onCredential, onError }) => {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        if (!GOOGLE_CLIENT_ID) return;
        await loadGoogleScript();
        if (cancelled) return;

        const google = window.google;
        if (!google?.accounts?.id || !containerRef.current) return;

        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp) => {
            if (resp?.credential) {
              onCredential?.(resp.credential);
            } else {
              onError?.(new Error('Missing credential from Google'));
            }
          }
        });

        containerRef.current.innerHTML = '';
        google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: '340',
          text: 'signin_with'
        });

        setReady(true);
      } catch (err) {
        onError?.(err);
      }
    };

    init();

    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div>
      <div ref={containerRef} />
      {!ready && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Loading Google sign-in…
        </div>
      )}
    </div>
  );
};

export default GoogleSignInButton;
