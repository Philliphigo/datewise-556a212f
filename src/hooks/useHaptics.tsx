import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

const hapticPatterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  selection: 15,
  success: [10, 50, 10],
  warning: [30, 30, 30],
  error: [50, 30, 50],
};

export const useHaptics = () => {
  const triggerHaptic = useCallback((type: HapticType = 'light') => {
    // Check if vibration API is supported
    if ('vibrate' in navigator) {
      navigator.vibrate(hapticPatterns[type]);
    }
    
    // Also try to play a subtle click sound for devices that support it
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different haptic types
      const frequencies: Record<HapticType, number> = {
        light: 1200,
        medium: 800,
        heavy: 400,
        selection: 1000,
        success: 1400,
        warning: 600,
        error: 300,
      };
      
      oscillator.frequency.value = frequencies[type];
      oscillator.type = 'sine';
      
      // Very short and quiet click
      gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
    } catch (e) {
      // Audio not supported, that's fine
    }
  }, []);

  return { triggerHaptic };
};
