import { useCallback, useRef, useState } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  playSound?: boolean;
  showBrowserNotification?: boolean;
}

export function useAnalysisNotification() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastNotifiedProjectRef = useRef<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Initialize audio element with a simple beep sound
  const initAudio = useCallback(() => {
    if (!audioRef.current) {
      // Use a simple notification beep sound (data URL)
      // This is a short, pleasant notification tone
      const beepSound = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGe77eeeTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEAKFF606+uoVRQKRp/g8r5sIQUrgs7y2Yk2CBhnu+3nnk0QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBBChRetevrqFUUCkaf4PK+bCEFK4LO8tmJNggYZ7vt555NEAxQp+PwtmMcBjiS1/LMeSwFJHfH8N2QQQoUXrXr66hVFApGn+DyvmwhBSuCzvLZiTYIGGe77eeeTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEEKFF616+uoVRQKRp/g8r5sIQUrgs7y2Yk2CBhnu+3nnk0QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBBChRetevrqFUUCkaf4PK+bCEFK4LO8tmJNggYZ7vt555NEAxQp+PwtmMcBjiS1/LMeSwFJHfH8N2QQQoUXrXr66hVFApGn+DyvmwhBSuCzvLZiTYIGGe77eeeTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEEKFF616+uoVRQKRp/g8r5sIQUrgs7y2Yk2CBhnu+3nnk0QDFCn4/C2YxwGOJLX8sx5LAUkd8fw3ZBBChRetevrqFUUCkaf4PK+bCEFK4LO8tmJNggYZ7vt555NEAxQp+PwtmMcBjiS1/LMeSwFJHfH8N2QQQoUXrXr66hVFApGn+DyvmwhBSuCzvLZiTYIGGe77eeeTRAMUKfj8LZjHAY4ktfyzHksBSR3x/DdkEEKFF616+uoVRQKRp/g8r5s';
      audioRef.current = new Audio(beepSound);
      audioRef.current.volume = 0.6; // 60% volume
    }
  }, []);

  // Play sound (with fallback)
  const playSound = useCallback(async () => {
    if (!soundEnabled) return false;
    
    initAudio();
    try {
      await audioRef.current?.play();
      return true;
    } catch (err) {
      console.log('Audio playback blocked:', err);
      return false;
    }
  }, [initAudio, soundEnabled]);

  // Request browser notification permission
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    
    const permission = await Notification.requestPermission();
    return permission;
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((title: string, body: string) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'analysis-complete',
        requireInteraction: false,
        silent: !soundEnabled, // Use system sound if enabled
      });

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      // Focus window when clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return true;
    }
    return false;
  }, [soundEnabled]);

  // Main notification function (hybrid approach)
  const notify = useCallback(async (
    projectId: string,
    options: NotificationOptions
  ) => {
    // Prevent duplicate notifications
    if (lastNotifiedProjectRef.current === projectId) {
      return;
    }
    lastNotifiedProjectRef.current = projectId;

    const { 
      title, 
      body, 
      playSound: shouldPlaySound = true, 
      showBrowserNotification: shouldShowBrowser = true 
    } = options;

    // 1. Try playing sound (if enabled)
    if (shouldPlaySound && soundEnabled) {
      await playSound();
    }

    // 2. Show browser notification if permission granted
    if (shouldShowBrowser) {
      showBrowserNotification(title, body);
    }

    // Note: Visual toast should be handled by the component
  }, [playSound, showBrowserNotification, soundEnabled]);

  // Reset notification tracking (for new analysis)
  const reset = useCallback(() => {
    lastNotifiedProjectRef.current = null;
  }, []);

  // Toggle sound on/off
  const toggleSound = useCallback((enabled: boolean) => {
    setSoundEnabled(enabled);
  }, []);

  return {
    notify,
    playSound,
    requestPermission,
    showBrowserNotification,
    reset,
    toggleSound,
    soundEnabled,
    isSupported: 'Notification' in window,
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported',
  };
}
