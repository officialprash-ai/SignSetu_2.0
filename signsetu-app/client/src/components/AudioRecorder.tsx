/**
 * AudioRecorder — uses the browser's native Web Speech API.
 * No server API key required. Works in Chrome and Edge.
 *
 * Props:
 *   onTranscript(text)  called with the final recognised text
 *   onError(msg)        called on any failure
 *   language            optional BCP-47 code, e.g. "en-US"
 *   disabled            prevent recording while translation is in progress
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Augment window for webkit prefix
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

type RecordingState = 'idle' | 'recording' | 'finishing';

interface AudioRecorderProps {
  onTranscript: (text: string) => void;
  onError?: (msg: string) => void;
  language?: string;
  disabled?: boolean;
  className?: string;
}

export function AudioRecorder({
  onTranscript,
  onError,
  language = 'en',
  disabled = false,
  className,
}: AudioRecorderProps) {
  const [state, setState]       = useState<RecordingState>('idle');
  const [seconds, setSeconds]   = useState(0);
  const [liveText, setLiveText] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalRef       = useRef('');

  const SpeechAPI =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition || window.webkitSpeechRecognition || null)
      : null;

  function startTimer() {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }
  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  useEffect(() => () => {
    recognitionRef.current?.abort();
    stopTimer();
  }, []);

  const startRecording = useCallback(() => {
    if (disabled || !SpeechAPI) return;

    const recognition = new SpeechAPI();
    recognition.lang            = language.includes('-') ? language : `${language}-US`;
    recognition.continuous      = true;
    recognition.interimResults  = true;
    recognition.maxAlternatives = 1;
    finalRef.current            = '';

    recognition.onresult = event => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalRef.current += t + ' ';
        else interim = t;
      }
      setLiveText(finalRef.current + interim);
    };

    recognition.onerror = event => {
      if (event.error !== 'no-speech') {
        onError?.(`Mic error: ${event.error}`);
      }
      stopTimer();
      setState('idle');
      setLiveText('');
    };

    recognition.onend = () => {
      stopTimer();
      setState('finishing');
      const text = finalRef.current.trim();
      if (text) {
        onTranscript(text);
      } else {
        onError?.('No speech detected — please try again.');
      }
      setLiveText('');
      setTimeout(() => setState('idle'), 400);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('recording');
    startTimer();
  }, [SpeechAPI, disabled, language, onError, onTranscript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    stopTimer();
  }, []);

  if (!SpeechAPI) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300 text-center">
        Voice recording requires <strong>Chrome</strong> or <strong>Edge</strong>.
        Firefox does not support the Web Speech API.
      </div>
    );
  }

  const isRecording = state === 'recording';
  const isFinishing = state === 'finishing';

  return (
    <div className={cn('space-y-2.5', className)}>
      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'outline'}
        size="sm"
        className={cn(
          'gap-2 w-full h-10 transition-all',
          isRecording && 'animate-pulse',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        disabled={disabled || isFinishing}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isFinishing && <Loader2 className="w-4 h-4 animate-spin" />}
        {isRecording  && <Square className="w-4 h-4" />}
        {state === 'idle' && <Mic className="w-4 h-4" />}
        {state === 'idle' && 'Start Recording'}
        {isRecording && `Stop  ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`}
        {isFinishing && 'Finishing…'}
      </Button>

      {liveText && (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground min-h-[2.5rem] italic">
          {liveText}
        </div>
      )}

      {!isRecording && state === 'idle' && (
        <p className="text-xs text-muted-foreground text-center">
          Speak clearly · results appear live · no API key needed
        </p>
      )}
    </div>
  );
}
