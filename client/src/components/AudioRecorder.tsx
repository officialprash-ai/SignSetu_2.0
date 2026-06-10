/**
 * AudioRecorder — browser microphone capture → base64 → tRPC voice.transcribe
 *
 * Props:
 *   onTranscript(text)  called when Whisper returns a result
 *   onError(msg)        called on any failure
 *   language            optional ISO code hint for Whisper (e.g. "en")
 *   disabled            prevent recording while translation is in progress
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type RecordingState = 'idle' | 'recording' | 'processing';

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
  language,
  disabled = false,
  className,
}: AudioRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [seconds, setSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);

  const transcribeMutation = trpc.voice.transcribe.useMutation();

  // ── Cleanup on unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── Timer helpers ───────────────────────────────────────────────────────────
  function startTimer() {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
  }
  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ── Start recording ─────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (disabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick the best supported MIME type
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find(t => MediaRecorder.isTypeSupported(t)) ?? '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stopTimer();
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        if (blob.size < 1000) {
          onError?.('Recording was too short — please try again.');
          setState('idle');
          return;
        }

        setState('processing');

        // Convert blob → base64
        const arrayBuf   = await blob.arrayBuffer();
        const uint8      = new Uint8Array(arrayBuf);
        const binary     = uint8.reduce((s, b) => s + String.fromCharCode(b), '');
        const audioBase64 = btoa(binary);

        try {
          const result = await transcribeMutation.mutateAsync({
            audioBase64,
            mimeType: recorder.mimeType || 'audio/webm',
            language,
          });
          onTranscript(result.text);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Transcription failed';
          onError?.(msg);
        } finally {
          setState('idle');
        }
      };

      recorder.start(250); // collect in 250ms chunks
      setState('recording');
      startTimer();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied';
      onError?.(msg);
    }
  }, [disabled, language, onError, onTranscript, transcribeMutation]);

  // ── Stop recording ──────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  // ── UI ───────────────────────────────────────────────────────────────────────
  const isIdle       = state === 'idle';
  const isRecording  = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        type="button"
        variant={isRecording ? 'destructive' : 'outline'}
        size="sm"
        className={cn(
          'gap-2 transition-all',
          isRecording && 'animate-pulse',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        disabled={disabled || isProcessing}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
        {isRecording  && <Square className="w-4 h-4" />}
        {isIdle       && <Mic    className="w-4 h-4" />}
        {isIdle       && 'Record'}
        {isRecording  && `Stop  ${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`}
        {isProcessing && 'Transcribing…'}
      </Button>

      {isIdle && !isProcessing && (
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Speak, then stop to transcribe
        </span>
      )}

      {!isRecording && !isProcessing && (
        <MicOff className="w-3.5 h-3.5 text-muted-foreground/40 hidden sm:block" />
      )}
    </div>
  );
}
