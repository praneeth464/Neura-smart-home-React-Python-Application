import { MicrophoneIcon } from '@heroicons/react/24/solid';
import { clsx } from 'clsx';

interface VoiceControlHintProps {
  visible: boolean;
  supported: boolean;
}

const VoiceControlHint = ({ visible, supported }: VoiceControlHintProps) => {
  if (!supported) return null;

  return (
    <div
      className={clsx(
        'pointer-events-none fixed bottom-28 right-4 z-40 max-w-sm rounded-3xl border border-white/20 bg-card-glass/90 p-4 text-sm text-frost shadow-glass backdrop-blur-2xl transition-all duration-500',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/20">
          <MicrophoneIcon className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold">Aura Voice</p>
          <p className="text-xs text-frost-muted">
            Hold spacebar · try “Turn off lights” or “Set AC to 22”
          </p>
        </div>
      </div>
    </div>
  );
};

export default VoiceControlHint;
