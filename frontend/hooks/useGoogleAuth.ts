// hooks/useGoogleAuth.ts
import { useEffect, useState } from 'react';
import type { GoogleCredentialResponse } from '@/types/google';

export const useGoogleAuth = (callback: (response: GoogleCredentialResponse) => void) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (typeof window !== 'undefined' && window.google?.accounts?.id) {
        try {
          const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
          
          // Check if client ID is available
          if (!clientId) {
            console.error('Google Client ID is missing. Please check your environment variables.');
            setError('Google authentication is not properly configured. Please contact support.');
            return;
          }
          
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback,
          });
          
          setScriptLoaded(true);
        } catch (err) {
          console.error('Error initializing Google Sign-In:', err);
          setError('Failed to initialize Google Sign-In');
        }
      }
    };

    // Check if Google script is already loaded
    if (window.google?.accounts?.id) {
      initializeGoogleSignIn();
    } else {
      // Set up a listener for when the script loads
      const checkGoogle = setInterval(() => {
        if (window.google?.accounts?.id) {
          initializeGoogleSignIn();
          clearInterval(checkGoogle);
        }
      }, 100);
      
      // Timeout after 5 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkGoogle);
        setError('Google Sign-In script failed to load');
      }, 5000);

      return () => {
        clearInterval(checkGoogle);
        clearTimeout(timeout);
      };
    }
  }, [callback]);

  const renderButton = (elementId: string, options: any = {}) => {
    if (scriptLoaded && window.google?.accounts?.id) {
      const element = document.getElementById(elementId);
      if (element) {
        try {
          window.google.accounts.id.renderButton(element, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "signin_with",
            ...options
          });
        } catch (err) {
          console.error('Error rendering Google button:', err);
          setError('Failed to render Google Sign-In button');
        }
      }
    }
  };

  return { scriptLoaded, renderButton, error };
};