import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Mic, Upload, Copy, Play, Pause } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { SignAvatar } from '@/components/SignAvatar';
import { toast } from 'sonner';

interface GlossSequence {
  gloss: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export default function Translator() {
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState<'ASL' | 'ISL'>('ASL');
  const [glossSequence, setGlossSequence] = useState<GlossSequence[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(100);

  const textToSignMutation = trpc.translation.textToSign.useMutation();
  const preferencesQuery = trpc.translation.getPreferences.useQuery();

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to translate');
      return;
    }

    try {
      const result = await textToSignMutation.mutateAsync({
        text: inputText,
        language,
      });
      setGlossSequence(result.glossSequence);
      setIsPlaying(true);
      toast.success('Translation complete!');
    } catch (error) {
      toast.error('Failed to translate text');
      console.error(error);
    }
  };

  const handleLanguageChange = (lang: 'ASL' | 'ISL') => {
    setLanguage(lang);
    setGlossSequence([]);
    setIsPlaying(false);
  };

  const handleCopyGlosses = () => {
    const glossText = glossSequence.map(g => g.gloss).join(' ');
    navigator.clipboard.writeText(glossText);
    toast.success('Glosses copied to clipboard');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Sign Language Translator</h1>
        <p className="text-muted-foreground">Convert text or speech to beautiful sign language animations</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input Panel */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Select Language</label>
              <div className="flex gap-2">
                {(['ASL', 'ISL'] as const).map(lang => (
                  <Button
                    key={lang}
                    variant={language === lang ? 'default' : 'outline'}
                    onClick={() => handleLanguageChange(lang)}
                    className="flex-1"
                  >
                    {lang}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Text Input</label>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Enter English text to translate..."
                className="w-full h-32 p-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Button
              onClick={handleTranslate}
              disabled={textToSignMutation.isPending || !inputText.trim()}
              className="w-full"
            >
              {textToSignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Translate to Sign
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Audio Input</label>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Mic className="w-4 h-4 mr-2" />
                  Record
                </Button>
                <Button variant="outline" className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Avatar Panel */}
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                <SignAvatar isPlaying={isPlaying} playbackSpeed={playbackSpeed / 100} />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsPlaying(!isPlaying)}
                  variant="outline"
                  className="flex-1"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Play
                    </>
                  )}
                </Button>
                <Button variant="outline" className="flex-1">
                  Replay
                </Button>
              </div>
            </div>
          </Card>

          {/* Gloss Display */}
          {glossSequence.length > 0 && (
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Gloss Sequence</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyGlosses}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {glossSequence.map((gloss, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-sm font-medium text-primary"
                  >
                    {gloss.gloss}
                  </div>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {glossSequence.length} glosses • {(glossSequence[glossSequence.length - 1]?.endMs || 0) / 1000}s duration
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
