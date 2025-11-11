import { useCallback, useEffect, useMemo, useRef } from 'react';
import useHomeStore from '../store/useHomeStore';
import { type DeviceKey } from '../constants/devices';
import type { DeviceCommand } from './useHomeSocket';

type RecognitionInstance = {
  start: () => void;
  stop: () => void;
  abort?: () => void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  addEventListener: (type: string, listener: (event: any) => void) => void;
  removeEventListener?: (type: string, listener: (event: any) => void) => void;
} | null;

type SpeechRecognitionConstructor = new () => NonNullable<RecognitionInstance>;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const DEVICE_KEYWORDS: Record<DeviceKey, string[]> = {
  lights: ['light', 'lights', 'lighting'],
  ac: ['ac', 'air', 'climate', 'temperature', 'cool'],
  doorLock: ['door', 'lock', 'front door'],
  camera: ['camera', 'security', 'vision'],
  coffeeMaker: ['coffee', 'espresso', 'brew'],
  music: ['music', 'audio', 'sound', 'speaker', 'playlist'],
};

const findDeviceKey = (phrase: string): DeviceKey | null => {
  const tokens = phrase.toLowerCase();
  for (const [key, keywords] of Object.entries(DEVICE_KEYWORDS)) {
    if (keywords.some((word) => tokens.includes(word))) {
      return key as DeviceKey;
    }
  }
  return null;
};

const extractValue = (phrase: string): number | null => {
  const match = phrase.match(/(\d{1,3})/);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  if (phrase.includes('max')) return 100;
  if (phrase.includes('min')) return 0;
  if (phrase.includes('mid')) return 50;
  return null;
};

const buildCommand = (transcript: string): DeviceCommand | null => {
  const device = findDeviceKey(transcript);
  if (!device) return null;

  const intent = transcript.toLowerCase();
  const base = {
    device,
    state: {} as DeviceCommand['state'],
  };

  if (intent.includes('off') || intent.includes('shut down')) {
    return {
      ...base,
      state: {
        ...base.state,
        isOn: false,
        status: 'Voice: turned off',
      },
    };
  }

  if (
    intent.includes('on') ||
    intent.includes('start') ||
    intent.includes('turn up') ||
    intent.includes('activate')
  ) {
    return {
      ...base,
      state: {
        ...base.state,
        isOn: true,
        status: 'Voice: turned on',
      },
    };
  }

  if (device === 'doorLock') {
    if (intent.includes('unlock') || intent.includes('open')) {
      return {
        ...base,
        state: {
          isOn: false,
          status: 'Voice: unlocked door',
          meta: { locked: false },
        },
      };
    }
    if (intent.includes('lock') || intent.includes('secure')) {
      return {
        ...base,
        state: {
          isOn: true,
          status: 'Voice: locked door',
          meta: { locked: true },
        },
      };
    }
  }

  const value = extractValue(intent);
  if (value !== null) {
    return {
      ...base,
      state: {
        ...base.state,
        isOn: value > 0,
        value,
        status: `Voice: set to ${value}`,
      },
    };
  }

  return null;
};

export const useVoiceControl = (handleCommand: (command: DeviceCommand) => void) => {
  const setVoiceListening = useHomeStore((state) => state.setVoiceListening);
  const recognitionRef = useRef<RecognitionInstance>(null);
  const isSupported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
    [],
  );

  const stop = useCallback(() => {
    setVoiceListening(false);
    recognitionRef.current?.stop?.();
  }, [setVoiceListening]);

  const onResult = useCallback(
    (event: any) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript?.toLowerCase() ?? '';
      const command = buildCommand(transcript);
      if (command) {
        handleCommand(command);
      }
      stop();
    },
    [handleCommand, stop],
  );

  const start = useCallback(() => {
    if (!isSupported) return;
    const RecognitionClass =
      (window.SpeechRecognition ?? window.webkitSpeechRecognition) ??
      null;
    if (!RecognitionClass) return;

    const recognition = new RecognitionClass() as RecognitionInstance;
    if (!recognition) return;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.addEventListener('result', onResult);
    recognition.addEventListener('error', () => stop());
    recognition.addEventListener('end', () => stop());

    recognition.start();
    setVoiceListening(true);
  }, [isSupported, onResult, setVoiceListening, stop]);

  useEffect(() => {
    if (!isSupported) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      if (
        event.repeat ||
        (event.target instanceof HTMLElement &&
          ['INPUT', 'TEXTAREA'].includes(event.target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      start();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      stop();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSupported, start, stop]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort?.();
    },
    [],
  );

  return { isSupported };
};

export default useVoiceControl;
