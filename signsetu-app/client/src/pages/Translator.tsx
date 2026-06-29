import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import {
  Loader2, Pause, Play, RotateCcw, Youtube, X,
  Lightbulb, Upload, FileVideo, CornerRightUp, Zap,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { SignAvatar, type GlossEntry } from '@/components/SignAvatarLazy';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AIInput } from '@/components/ui/ai-input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type InputTab = 'text' | 'voice' | 'youtube' | 'file';

const TIP_KEY = 'signsetu_tip_dismissed';
const MAX_FILE_BYTES = 25 * 1024 * 1024;

function buildGreeting(lang: 'ASL' | 'ISL'): GlossEntry[] {
  const gloss = lang === 'ISL' ? 'NAMASTE' : 'HELLO';
  return [{ gloss, startMs: 300, endMs: 1900, confidence: 1 }];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

function OnboardingTip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-foreground">Getting started</p>
        <p className="text-muted-foreground text-xs">
          Type a phrase, record your voice, upload a video, or paste a YouTube URL. The 3D avatar signs it back to you.
        </p>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="Dismiss tip">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function Translator() {
  const search = useSearch();

  const [inputTab, setInputTab]           = useState<InputTab>('text');
  const [inputText, setInputText]         = useState('');
  const [youtubeUrl, setYoutubeUrl]       = useState('');
  const [language, setLanguage]           = useState<'ASL' | 'ISL'>('ASL');
  const [glossSequence, setGlossSequence] = useState<GlossEntry[]>([]);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [activeGlossIdx, setActiveGlossIdx] = useState(-1);
  const [replayKey, setReplayKey]         = useState(0);
  const [fileName, setFileName]           = useState('');
  const [videoUrl, setVideoUrl]           = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef                          = useRef<HTMLVideoElement | null>(null);
  const [showTip, setShowTip]             = useState(() => {
    try { return !localStorage.getItem(TIP_KEY); } catch { return true; }
  });
  const greetedRef = useRef(false);

  const textToSignMutation = trpc.translation.textToSign.useMutation();
  const youtubeMutation    = trpc.youtube.transcribe.useMutation();
  const fileMutation       = trpc.voice.transcribe.useMutation();
  const prefsQuery         = trpc.preferences.get.useQuery();
  const prefsMutation      = trpc.preferences.set.useMutation();

  useEffect(() => {
    if (prefsQuery.data) {
      setLanguage(prefsQuery.data.defaultLanguage);
      setPlaybackSpeed(prefsQuery.data.playbackSpeed);
    } else {
      try {
        const saved = localStorage.getItem('signsetu_prefs');
        if (saved) {
          const p = JSON.parse(saved);
          if (p.language === 'ASL' || p.language === 'ISL') setLanguage(p.language);
          if (typeof p.speed === 'number') setPlaybackSpeed(p.speed);
        }
      } catch { /* ignore */ }
    }
  }, [prefsQuery.data]);

  const persistPrefs = useCallback((lang: 'ASL' | 'ISL', speed: number) => {
    prefsMutation.mutate({ defaultLanguage: lang, playbackSpeed: speed });
    try { localStorage.setItem('signsetu_prefs', JSON.stringify({ language: lang, speed })); } catch { /* ignore */ }
  }, [prefsMutation]);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const replayText = params.get('replay');
    const replayLang = params.get('lang') as 'ASL' | 'ISL' | null;
    if (replayText) {
      greetedRef.current = true;
      setInputText(replayText);
      setInputTab('text');
      if (replayLang === 'ASL' || replayLang === 'ISL') setLanguage(replayLang);
      setTimeout(() => {
        textToSignMutation.mutateAsync({ text: replayText, language: replayLang ?? 'ASL' })
          .then(r => applyResult(r.glossSequence)).catch(() => {});
      }, 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    applyResult(buildGreeting(language));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyResult = (seq: GlossEntry[]) => {
    setGlossSequence(seq);
    setActiveGlossIdx(-1);
    setIsPlaying(true);
    setReplayKey(k => k + 1);
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) { toast.error('Enter text to translate'); return; }
    try {
      const result = await textToSignMutation.mutateAsync({ text: inputText, language });
      applyResult(result.glossSequence);
      toast.success('Translation complete!');
    } catch { toast.error('Failed to translate text'); }
  };

  const handleYoutube = async () => {
    const url = youtubeUrl.trim();
    if (!url) { toast.error('Enter a YouTube URL'); return; }
    if (!url.includes('youtube.com/') && !url.includes('youtu.be/')) {
      toast.error('Invalid YouTube URL'); return;
    }
    try {
      toast.info('Fetching YouTube audio — this may take 30–60 s…');
      const result = await youtubeMutation.mutateAsync({ url, language });
      setInputText(result.transcript);
      setInputTab('text');
      applyResult(result.glossSequence as GlossEntry[]);
      toast.success('YouTube translated!');
    } catch { toast.error('YouTube transcription failed'); }
  };

  const startAvatarWithVideo = () => {
    const v = videoRef.current;
    const lastMs = glossSequence[glossSequence.length - 1]?.endMs ?? 0;
    if (v && v.duration > 0 && lastMs > 0)
      setPlaybackSpeed(+((lastMs / 1000) / v.duration).toFixed(3));
    setActiveGlossIdx(-1);
    setIsPlaying(false);
    setTimeout(() => { setReplayKey(k => k + 1); setIsPlaying(true); }, 30);
  };

  const removeVideo = useCallback(() => {
    const v = videoRef.current;
    if (v) { v.pause(); v.src = ''; }
    setIsPlaying(false);
    setVideoProgress(0);
    setVideoUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setFileName('');
  }, []);

  /** Play/Pause unified for video+avatar or avatar-only */
  const handlePlayPause = () => {
    if (videoUrl && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();          // onPause → setIsPlaying(false)
      } else {
        videoRef.current.play().catch(() => {}); // onPlay → startAvatarWithVideo
      }
    } else {
      setIsPlaying(p => !p);
    }
  };

  const handleReplay = () => {
    if (videoUrl && videoRef.current) {
      videoRef.current.currentTime = 0;
      setVideoProgress(0);
      videoRef.current.play().catch(() => {}); // onPlay → startAvatarWithVideo
    } else {
      setActiveGlossIdx(-1);
      setIsPlaying(false);
      setTimeout(() => { setReplayKey(k => k + 1); setIsPlaying(true); }, 80);
    }
  };

  const handleAnimationComplete = useCallback(() => {
    setIsPlaying(false);
    setActiveGlossIdx(-1);
  }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { toast.error('File too large — max 25 MB'); return; }
    setFileName(file.name);
    setVideoUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return file.type.startsWith('video/') ? URL.createObjectURL(file) : null;
    });
    try {
      toast.info('Extracting audio & transcribing…');
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { text } = await fileMutation.mutateAsync({
        audioBase64: bytesToBase64(bytes),
        mimeType: file.type || 'video/mp4',
        language: 'en',
      });
      if (!text.trim()) { toast.error('No speech detected in file'); return; }
      setInputText(text);
      const result = await textToSignMutation.mutateAsync({ text, language, sourceType: 'audio' });
      applyResult(result.glossSequence);
      // Keep avatar paused when video is present — Play button syncs both together
      if (file.type.startsWith('video/')) {
        setTimeout(() => setIsPlaying(false), 80);
      }
      toast.success('File translated! Press Play to sync video + avatar.');
    } catch { toast.error('Failed to process file'); }
  };

  const totalDurationS = glossSequence.length > 0
    ? ((glossSequence[glossSequence.length - 1]?.endMs ?? 0) / 1000).toFixed(1)
    : '0';

  const isPending = textToSignMutation.isPending || youtubeMutation.isPending || fileMutation.isPending;

  const TABS: { id: InputTab; label: string }[] = [
    { id: 'text',    label: 'Text'    },
    { id: 'voice',   label: 'Voice'   },
    { id: 'file',    label: 'Upload'  },
    { id: 'youtube', label: 'YouTube' },
  ];

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Page title */}
      <div className="space-y-0.5">
        <h1 className="text-2xl sm:text-3xl font-bold">Sign Language Translator</h1>
        <p className="text-muted-foreground text-sm">Convert text, speech, or YouTube videos to sign language</p>
      </div>

      {showTip && (
        <OnboardingTip onDismiss={() => {
          setShowTip(false);
          try { localStorage.setItem(TIP_KEY, '1'); } catch { /* ignore */ }
        }} />
      )}

      {/* ── Avatar canvas (splits with video when uploaded) ── */}
      <Card className="overflow-hidden rounded-2xl border shadow-sm">

        {/*
          Canvas layout:
            Mobile  → flex-col:  video TOP,  avatar BOTTOM
            Desktop → flex-row:  avatar LEFT, video RIGHT
          CSS order flips video/avatar position per breakpoint.
        */}
        <div className={cn(
          'relative flex bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800',
          videoUrl
            ? 'flex-col sm:flex-row h-[430px] sm:h-80'
            : 'h-72 sm:h-96'
        )}>

          {/* ── Avatar: bottom on mobile (order-2), LEFT on desktop (order-1) ── */}
          <div className={cn(
            'relative',
            videoUrl
              ? 'order-2 sm:order-1 flex-1 min-h-0'
              : 'w-full h-full'
          )}>
            {(glossSequence.length > 0 || isPending) ? (
              <SignAvatar
                key={replayKey}
                glossSequence={glossSequence}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                language={language}
                onGlossChange={setActiveGlossIdx}
                onAnimationComplete={handleAnimationComplete}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl">🤟</span>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">Avatar ready</p>
                  <p className="text-sm text-muted-foreground">Translate something to see it signed</p>
                </div>
              </div>
            )}

            {/* Active gloss badge */}
            {activeGlossIdx >= 0 && glossSequence[activeGlossIdx] && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center pointer-events-none">
                <span className="px-3 py-1 rounded-md bg-black/70 text-white text-sm font-semibold tracking-wide">
                  {glossSequence[activeGlossIdx].gloss}
                </span>
              </div>
            )}

            {/* Sync badge */}
            {videoUrl && (
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-md px-2 py-0.5">
                <Zap className={cn('w-3 h-3', isPlaying ? 'text-green-400 animate-pulse' : 'text-white/40')} />
                <span className="text-xs text-white/80 font-medium">Sign Avatar</span>
              </div>
            )}
          </div>

          {/* ── Video: TOP on mobile (order-1), RIGHT on desktop (order-2) ── */}
          {videoUrl && (
            <div className={cn(
              'relative bg-black overflow-hidden',
              'order-1 sm:order-2',
              // mobile: fixed height strip at top; desktop: flex-1 = 50% width, full height
              'flex-none h-44 sm:h-auto sm:flex-1',
              // border: bottom separator on mobile, left separator on desktop
              'border-b border-border/20 sm:border-b-0 sm:border-l'
            )}>
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                className="w-full h-full object-contain"
                onPlay={startAvatarWithVideo}
                onPause={() => setIsPlaying(false)}
                onEnded={() => { setIsPlaying(false); setVideoProgress(100); }}
                onTimeUpdate={() => {
                  const v = videoRef.current;
                  if (v && v.duration > 0)
                    setVideoProgress((v.currentTime / v.duration) * 100);
                }}
                onSeeked={() => {
                  const v = videoRef.current;
                  if (v && !v.paused && v.currentTime < 0.25) startAvatarWithVideo();
                }}
              />

              {/* File name chip */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/65 backdrop-blur-sm rounded-md px-2 py-0.5 max-w-[calc(100%-2.5rem)]">
                <FileVideo className="w-3 h-3 text-white/80 shrink-0" />
                <span className="text-white/80 text-xs font-medium truncate">{fileName}</span>
              </div>

              {/* Remove */}
              <button
                onClick={removeVideo}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/65 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/85 transition-colors"
                aria-label="Remove video"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Play hint */}
              {!isPlaying && videoProgress === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/50 backdrop-blur-sm rounded-full w-12 h-12 flex items-center justify-center">
                    <Play className="w-5 h-5 text-white ml-0.5" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Video scrub bar — only when video loaded */}
        {videoUrl && (
          <div
            className="relative w-full h-1.5 bg-muted cursor-pointer group"
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              const v = videoRef.current;
              if (v && v.duration > 0) {
                v.currentTime = pct * v.duration;
                setVideoProgress(pct * 100);
              }
            }}
          >
            <div
              className="absolute h-full bg-primary rounded-r-full transition-none"
              style={{ width: `${videoProgress}%` }}
            />
            {/* Scrub handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `${videoProgress}%` }}
            />
          </div>
        )}

        {/* Playback controls */}
        <div className="p-4 space-y-3 border-t border-border/50">
          <div className="flex gap-2">
            <Button
              onClick={handlePlayPause}
              variant="outline" className="flex-1 h-9"
              disabled={glossSequence.length === 0}
            >
              {isPlaying
                ? <><Pause className="w-4 h-4 mr-2" />Pause</>
                : <><Play  className="w-4 h-4 mr-2" />Play</>}
            </Button>
            <Button
              variant="outline" className="flex-1 h-9"
              onClick={handleReplay}
              disabled={glossSequence.length === 0}
            >
              <RotateCcw className="w-4 h-4 mr-2" />Replay
            </Button>
          </div>

          {/* Speed slider — hidden when video (speed auto-calculated for sync) */}
          {!videoUrl ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Speed</span><span>{playbackSpeed.toFixed(1)}×</span>
              </div>
              <Slider
                min={0.5} max={2} step={0.1}
                value={[playbackSpeed]}
                onValueChange={([v]) => { setPlaybackSpeed(v); persistPrefs(language, v); }}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5×</span><span>2×</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-primary" />
                Speed auto-synced to video
              </span>
              <span className="font-medium text-foreground">{playbackSpeed.toFixed(2)}×</span>
            </div>
          )}
        </div>
      </Card>

      {/* ── Gloss sequence ── */}
      {glossSequence.length > 0 && (
        <Card className="p-4 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Gloss Sequence</h3>
            <span className="text-xs text-muted-foreground">
              {glossSequence.length} signs · {totalDurationS}s
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {glossSequence.map((g, idx) => (
              <div
                key={idx}
                className={cn(
                  'px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all duration-200',
                  idx === activeGlossIdx
                    ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-sm'
                    : 'bg-primary/10 text-primary border-primary/20'
                )}
              >
                {g.gloss}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Input section ── */}
      <div className="space-y-3">
        {/* Language selector */}
        <Card className="p-4 rounded-2xl space-y-2.5">
          <label className="text-sm font-semibold">Sign Language</label>
          <div className="flex gap-2">
            {(['ASL', 'ISL'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => { setLanguage(lang); applyResult(buildGreeting(lang)); persistPrefs(lang, playbackSpeed); }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors',
                  language === lang
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border hover:bg-muted'
                )}
              >
                {lang === 'ASL' ? '🇺🇸 ASL' : '🇮🇳 ISL'}
              </button>
            ))}
          </div>
        </Card>

        {/* Input tabs */}
        <Card className="p-4 rounded-2xl space-y-4">
          <div className="flex gap-1 p-1 rounded-lg bg-muted">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setInputTab(tab.id)}
                className={cn(
                  'flex-1 py-1.5 rounded-md text-sm font-medium transition-colors',
                  inputTab === tab.id
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {inputTab === 'text' && (
            <div className="space-y-3">
              <AIInput
                value={inputText}
                onChange={setInputText}
                onSubmit={() => handleTranslate()}
                onMic={() => setInputTab('voice')}
                disabled={isPending}
                placeholder="Type something to translate…"
                minHeight={64}
                maxHeight={200}
              />
              <Button onClick={handleTranslate} disabled={isPending || !inputText.trim()} className="w-full">
                {textToSignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Translate to Sign
              </Button>
            </div>
          )}

          {inputTab === 'voice' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Record your voice — auto-transcribed and translated.</p>
              <AudioRecorder
                language="en"
                disabled={isPending}
                onTranscript={text => {
                  setInputText(text);
                  setInputTab('text');
                  setTimeout(() => {
                    if (text.trim()) {
                      textToSignMutation.mutateAsync({ text, language, sourceType: 'audio' })
                        .then(r => { applyResult(r.glossSequence); toast.success('Voice translated!'); })
                        .catch(() => toast.error('Failed to translate voice input'));
                    }
                  }, 50);
                }}
                onError={msg => toast.error(msg)}
              />
            </div>
          )}

          {inputTab === 'file' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Upload a video or audio file — audio extracted, transcribed, and signed.
              </p>
              <label
                className={cn(
                  'flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition-colors',
                  isPending ? 'opacity-60 pointer-events-none' : 'cursor-pointer hover:border-primary/50 hover:bg-primary/5'
                )}
              >
                <input
                  type="file"
                  accept="video/*,audio/*"
                  className="hidden"
                  disabled={isPending}
                  onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
                />
                {fileMutation.isPending
                  ? <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  : <Upload className="w-7 h-7 text-muted-foreground" />}
                <span className="text-sm font-medium text-foreground">
                  {fileMutation.isPending ? 'Processing…' : 'Click to choose a file'}
                </span>
                <span className="text-xs text-muted-foreground">MP4, MOV, WEBM, MP3, WAV · max 25 MB</span>
              </label>
              {fileName && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileVideo className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{fileName}</span>
                </div>
              )}
            </div>
          )}

          {inputTab === 'youtube' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Paste a YouTube URL — audio extracted, transcribed, and signed.
              </p>
              <div className="relative w-full">
                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={e => setYoutubeUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleYoutube(); }}
                  disabled={isPending}
                  placeholder="https://youtube.com/watch?v=…"
                  className={cn(
                    'w-full h-12 rounded-2xl bg-muted/60 border border-border',
                    'pl-11 pr-14 text-sm text-foreground placeholder:text-muted-foreground',
                    'outline-none transition-[box-shadow,border-color] duration-150',
                    'focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary/50',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                />
                <button
                  type="button"
                  onClick={handleYoutube}
                  disabled={isPending || !youtubeUrl.trim()}
                  aria-label="Translate YouTube video"
                  className={cn(
                    'absolute top-1/2 -translate-y-1/2 right-3 flex items-center justify-center',
                    'h-8 w-8 rounded-xl bg-primary text-primary-foreground shadow-sm',
                    'transition-all duration-200 hover:opacity-90',
                    youtubeUrl.trim() ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                  )}
                >
                  {youtubeMutation.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CornerRightUp className="w-4 h-4" />}
                </button>
              </div>
              <Button onClick={handleYoutube} disabled={isPending || !youtubeUrl.trim()} className="w-full">
                {youtubeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {youtubeMutation.isPending ? 'Processing…' : 'Translate YouTube Video'}
              </Button>
              {youtubeMutation.isPending && (
                <p className="text-xs text-muted-foreground text-center animate-pulse">
                  Downloading audio and transcribing — may take 30–60 seconds…
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
