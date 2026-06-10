import { useCallback, useEffect, useState } from 'react';
import { useSearch } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Loader2, Pause, Play, RotateCcw, Youtube, X, Lightbulb } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { SignAvatar, type GlossEntry } from '@/components/SignAvatarLazy';
import { AudioRecorder } from '@/components/AudioRecorder';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type InputTab = 'text' | 'voice' | 'youtube';

const TIP_KEY = 'signsetu_tip_dismissed';

const EXAMPLE_PHRASES = [
  'Hello, how are you?',
  'Thank you for your help.',
  'I love learning sign language.',
  'Good morning, have a great day!',
];

function OnboardingTip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="font-medium text-foreground">Getting started</p>
        <p className="text-muted-foreground text-xs">
          Type a phrase, record your voice, or paste a YouTube URL. The 3D avatar will sign it back to you in real time.
          Try: <button
            className="underline underline-offset-2 hover:text-primary transition-colors"
            onClick={onDismiss}
          >"Hello, how are you?"</button>
        </p>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0" aria-label="Dismiss tip">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function AvatarIdleState({ onTryExample }: { onTryExample: (phrase: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5 px-6 py-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <span className="text-3xl">🤟</span>
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold text-foreground">Avatar ready</p>
        <p className="text-sm text-muted-foreground">
          Translate something to see it signed here
        </p>
      </div>
      <div className="w-full space-y-2">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Try an example</p>
        <div className="grid grid-cols-1 gap-1.5">
          {EXAMPLE_PHRASES.map(phrase => (
            <button
              key={phrase}
              onClick={() => onTryExample(phrase)}
              className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground truncate"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Translator() {
  const search = useSearch();

  const [inputTab, setInputTab]             = useState<InputTab>('text');
  const [inputText, setInputText]           = useState('');
  const [youtubeUrl, setYoutubeUrl]         = useState('');
  const [language, setLanguage]             = useState<'ASL' | 'ISL'>('ASL');
  const [glossSequence, setGlossSequence]   = useState<GlossEntry[]>([]);
  const [isPlaying, setIsPlaying]           = useState(false);
  const [playbackSpeed, setPlaybackSpeed]   = useState(1);
  const [activeGlossIdx, setActiveGlossIdx] = useState(-1);
  const [replayKey, setReplayKey]           = useState(0);
  const [showTip, setShowTip]               = useState(() => {
    try { return !localStorage.getItem(TIP_KEY); } catch { return true; }
  });

  const textToSignMutation  = trpc.translation.textToSign.useMutation();
  const youtubeMutation     = trpc.youtube.transcribe.useMutation();
  const prefsQuery          = trpc.preferences.get.useQuery();
  const prefsMutation       = trpc.preferences.set.useMutation();

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
      setInputText(replayText);
      setInputTab('text');
      if (replayLang === 'ASL' || replayLang === 'ISL') setLanguage(replayLang);
      setTimeout(() => {
        textToSignMutation.mutateAsync({ text: replayText, language: replayLang ?? 'ASL' }).then(result => {
          applyResult(result.glossSequence);
        }).catch(() => {});
      }, 100);
    }
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

  const handleReplay = () => {
    setActiveGlossIdx(-1);
    setIsPlaying(false);
    setTimeout(() => { setReplayKey(k => k + 1); setIsPlaying(true); }, 80);
  };

  const handleAnimationComplete = useCallback(() => {
    setIsPlaying(false);
    setActiveGlossIdx(-1);
  }, []);

  const handleDismissTip = () => {
    setShowTip(false);
    try { localStorage.setItem(TIP_KEY, '1'); } catch { /* ignore */ }
  };

  const handleTryExample = async (phrase: string) => {
    handleDismissTip();
    setInputText(phrase);
    setInputTab('text');
    try {
      const result = await textToSignMutation.mutateAsync({ text: phrase, language });
      applyResult(result.glossSequence);
      toast.success('Translation complete!');
    } catch { toast.error('Failed to translate'); }
  };

  const totalDurationS = glossSequence.length > 0
    ? ((glossSequence[glossSequence.length - 1]?.endMs ?? 0) / 1000).toFixed(1)
    : '0';

  const isPending = textToSignMutation.isPending || youtubeMutation.isPending;

  const TABS: { id: InputTab; label: string }[] = [
    { id: 'text',    label: 'Text'    },
    { id: 'voice',   label: 'Voice'   },
    { id: 'youtube', label: 'YouTube' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Sign Language Translator</h1>
        <p className="text-muted-foreground">Convert text, speech, or YouTube videos to sign language</p>
      </div>

      {showTip && <OnboardingTip onDismiss={handleDismissTip} />}

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* ── Left: Input Panel ── */}
        <div className="space-y-4">
          <Card className="p-5 space-y-3">
            <label className="text-sm font-semibold">Sign Language</label>
            <div className="flex gap-2">
              {(['ASL', 'ISL'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => { setLanguage(lang); setGlossSequence([]); setIsPlaying(false); persistPrefs(lang, playbackSpeed); }}
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

          <Card className="p-5 space-y-4">
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
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleTranslate(); }}
                  placeholder="Type something to translate…  (⌘↵ to translate)"
                  rows={4}
                  className="w-full p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none text-sm"
                />
                <Button onClick={handleTranslate} disabled={isPending || !inputText.trim()} className="w-full">
                  {textToSignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Translate to Sign
                </Button>
              </div>
            )}

            {inputTab === 'voice' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Record your voice — auto-transcribed and translated.
                </p>
                <AudioRecorder
                  language="en"
                  disabled={isPending}
                  onTranscript={text => {
                    setInputText(text);
                    setInputTab('text');
                    setTimeout(() => {
                      if (text.trim()) {
                        textToSignMutation.mutateAsync({ text, language, sourceType: 'audio' }).then(result => {
                          applyResult(result.glossSequence);
                          toast.success('Voice translated!');
                        }).catch(() => toast.error('Failed to translate voice input'));
                      }
                    }, 50);
                  }}
                  onError={msg => toast.error(msg)}
                />
              </div>
            )}

            {inputTab === 'youtube' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Paste a YouTube URL — audio extracted, transcribed, and signed.
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={youtubeUrl}
                      onChange={e => setYoutubeUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleYoutube(); }}
                      placeholder="https://youtube.com/watch?v=…"
                      className="pl-9 text-sm"
                    />
                  </div>
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

        {/* ── Right: Avatar Panel ── */}
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <div className="h-96 rounded-lg overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              {glossSequence.length > 0 || isPending ? (
                <SignAvatar
                  key={replayKey}
                  glossSequence={glossSequence}
                  isPlaying={isPlaying}
                  playbackSpeed={playbackSpeed}
                  onGlossChange={setActiveGlossIdx}
                  onAnimationComplete={handleAnimationComplete}
                />
              ) : (
                <AvatarIdleState onTryExample={handleTryExample} />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsPlaying(p => !p)}
                  variant="outline" className="flex-1"
                  disabled={glossSequence.length === 0}
                >
                  {isPlaying
                    ? <><Pause className="w-4 h-4 mr-2" />Pause</>
                    : <><Play  className="w-4 h-4 mr-2" />Play</>
                  }
                </Button>
                <Button variant="outline" className="flex-1" onClick={handleReplay} disabled={glossSequence.length === 0}>
                  <RotateCcw className="w-4 h-4 mr-2" />Replay
                </Button>
              </div>

              <div className="space-y-2">
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
            </div>
          </Card>

          {glossSequence.length > 0 && (
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Gloss Sequence</h3>
                <span className="text-xs text-muted-foreground">
                  {glossSequence.length} signs · {totalDurationS}s
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {glossSequence.map((g, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200',
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
        </div>
      </div>
    </div>
  );
}
