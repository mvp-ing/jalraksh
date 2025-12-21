/**
 * Hook for Web Push Notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { INSPECTOR_API_BASE_URL } from '../constants/api-config';

interface PushState {
  isSupported: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
  subscriptionId: string | null;
  loading: boolean;
  error: string | null;
}

// Convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    isSupported: false,
    permission: 'default',
    subscription: null,
    subscriptionId: null,
    loading: false,
    error: null,
  });

  // Check if push notifications are supported
  useEffect(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    setState(prev => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : 'denied',
    }));

    // Check for existing subscription
    if (isSupported) {
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          if (subscription) {
            setState(prev => ({ ...prev, subscription }));
          }
        });
      });
    }
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw-inspector.js');
      console.log('Service Worker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (inspectorId?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Register service worker
      await registerServiceWorker();
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      const vapidResponse = await fetch(`${INSPECTOR_API_BASE_URL}/push/vapid-public-key`);
      if (!vapidResponse.ok) {
        throw new Error('Push notifications not configured on server');
      }
      const { publicKey } = await vapidResponse.json();

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      // Send subscription to server
      const subscribeResponse = await fetch(`${INSPECTOR_API_BASE_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
            },
          },
          inspector_id: inspectorId,
          topics: ['alerts'],
        }),
      });

      if (!subscribeResponse.ok) {
        throw new Error('Failed to register subscription with server');
      }

      const { subscriptionId } = await subscribeResponse.json();

      setState(prev => ({
        ...prev,
        subscription,
        subscriptionId,
        loading: false,
        error: null,
      }));

      return { subscription, subscriptionId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [registerServiceWorker]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      if (state.subscription) {
        await state.subscription.unsubscribe();
      }

      if (state.subscriptionId) {
        await fetch(`${INSPECTOR_API_BASE_URL}/push/unsubscribe?subscription_id=${state.subscriptionId}`, {
          method: 'POST',
        });
      }

      setState(prev => ({
        ...prev,
        subscription: null,
        subscriptionId: null,
        loading: false,
        error: null,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return false;
    }
  }, [state.subscription, state.subscriptionId]);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!state.subscriptionId) {
      throw new Error('Not subscribed to push notifications');
    }

    try {
      const response = await fetch(
        `${INSPECTOR_API_BASE_URL}/push/test?subscription_id=${state.subscriptionId}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      return true;
    } catch (error) {
      console.error('Test notification failed:', error);
      return false;
    }
  }, [state.subscriptionId]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
    isSubscribed: !!state.subscription,
  };
}
