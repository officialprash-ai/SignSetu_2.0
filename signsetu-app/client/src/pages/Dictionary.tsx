import { useState, useDeferredValue } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Play, X, BookOpen } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SignAvatar, type GlossEntry } from '@/components/SignAvatarLazy';
import { Button } from '@/components/ui/button';

const SAMPLE_SIGNS = [
  { gloss: 'HELLO',     language: 'ASL', category: 'Greetings', poseUrl: null },
  { gloss: 'THANK-YOU', language: 'ASL', category: 'Courtesy',  poseUrl: null },
  { gloss: 'PLEASE',    language: 'ASL', category: 'Courtesy',  poseUrl: null },
  { gloss: 'SORRY',     language: 'ASL', category: 'Courtesy',  poseUrl: null },
  { gloss: 'YES',       language: 'ASL', category: 'Responses', poseUrl: null },
  { gloss: 'NO',        language: 'ASL', category: 'Responses', poseUrl: null },
  { gloss: 'NAMASTE',   language: 'ISL', category: 'Greetings', poseUrl: null },
  { gloss: 'HELP',      language: 'ASL', category: 'Common',    poseUrl: null },
  { gloss: 'WATER',     language: 'ASL', category: 'Basics',    poseUrl: null },
  { gloss: 'FOOD',      language: 'ASL', category: 'Basics',    poseUrl: null },
  { gloss: 'HOME',      language: 'ASL', category: 'Places',    poseUrl: null },
  { gloss: 'WORK',      language: 'ASL', category: 'Actions',   poseUrl: null },
  { gloss: 'GOOD',      language: 'ASL', category: 'Feelings',  poseUrl: null },
  { gloss: 'BAD',       language: 'ASL', category: 'Feelings',  poseUrl: null },
  { gloss: 'HAPPY',     language: 'ASL', category: 'Feelings',  poseUrl: null },
  { gloss: 'LOVE',      language: 'ASL', category: 'Feelings',  poseUrl: null },
  { gloss: 'FAMILY',    language: 'ASL', category: 'People',    poseUrl: null },
  { gloss: 'FRIEND',    language: 'ASL', category: 'People',    poseUrl: null },
  { gloss: 'SCHOOL',    language: 'ASL', category: 'Places',    poseUrl: null },
  { gloss: 'LEARN',     language: 'ASL', category: 'Actions',   poseUrl: null },
  { gloss: 'UNDERSTAND',language: 'ASL', category: 'Cognitive', poseUrl: null },
  { gloss: 'THINK',     language: 'ASL', category: 'Cognitive', poseUrl: null },
  { gloss: 'KNOW',      language: 'ASL', category: 'Cognitive', poseUrl: null },
  { gloss: 'WANT',      language: 'ASL', category: 'Common',    poseUrl: null },
  { gloss: 'NEED',      language: 'ASL', category: 'Common',    poseUrl: null },
];

interface SignItem {
  gloss: string;
  language: string;
  category?: string | null;
  poseUrl?: string | null;
}

function makeGlossEntry(gloss: string): GlossEntry[] {
  // Single sign looping: neutral gap + sign + neutral gap
  return [
    { gloss, startMs: 300, endMs: 1100, confidence: 1 },
  ];
}

function SignPreviewDialog({
  sign,
  onClose,
}: {
  sign: SignItem | null;
  onClose: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(true);

  if (!sign) return null;

  const glossSequence = makeGlossEntry(sign.gloss);

  return (
    <Dialog open={!!sign} onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="text-2xl font-bold">{sign.gloss}</span>
            <Badge variant="secondary">{sign.language}</Badge>
            {sign.category && (
              <Badge variant="outline" className="text-xs font-normal">{sign.category}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="h-72 w-full rounded-xl overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <SignAvatar
            glossSequence={glossSequence}
            isPlaying={isPlaying}
            playbackSpeed={0.9}
            language={(sign.language === 'ISL' ? 'ISL' : 'ASL')}
            onAnimationComplete={() => {
              // auto-loop: restart
              setIsPlaying(false);
              setTimeout(() => setIsPlaying(true), 180);
            }}
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {isPlaying ? 'Playing sign animation…' : 'Paused'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying(p => !p)}
            className="gap-2"
          >
            {isPlaying
              ? <><X className="h-3.5 w-3.5" /> Pause</>
              : <><Play className="h-3.5 w-3.5" /> Play</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Dictionary() {
  const [search, setSearch]         = useState('');
  const [langFilter, setLangFilter] = useState<'ASL' | 'ISL'>('ASL');
  const [selected, setSelected]     = useState<SignItem | null>(null);

  const deferredSearch = useDeferredValue(search);

  const { data, isFetching, isError } = trpc.dictionary.search.useQuery(
    { query: deferredSearch, language: langFilter, limit: 60 },
    { staleTime: 30_000 }
  );

  const signs: SignItem[] = data && data.length > 0
    ? data
    : SAMPLE_SIGNS
        .filter(s => s.language === langFilter)
        .filter(s =>
          !deferredSearch ||
          s.gloss.toLowerCase().includes(deferredSearch.toLowerCase()) ||
          (s.category ?? '').toLowerCase().includes(deferredSearch.toLowerCase())
        );

  const isLive = !!(data && data.length > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Sign Dictionary
          </h1>
          <p className="text-muted-foreground">Browse and search the sign language lexicon</p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          {isFetching
            ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            : <Search  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          }
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search signs..."
            className="pl-9 h-11"
          />
        </div>
        <div className="flex gap-2 p-1 rounded-xl bg-muted">
          {(['ASL', 'ISL'] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setLangFilter(lang)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
                langFilter === lang
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {lang === 'ASL' ? '\u{1F1FA}\u{1F1F8} ASL' : '\u{1F1EE}\u{1F1F3} ISL'}
            </button>
          ))}
        </div>
      </div>

      {isError && (
        <p className="text-xs text-destructive text-center">
          Could not reach dictionary — showing sample data.
        </p>
      )}

      {/* Grid */}
      <div className={cn(
        'grid sm:grid-cols-2 lg:grid-cols-3 gap-4',
        isFetching && 'opacity-60 pointer-events-none'
      )}>
        {signs.map((sign, idx) => (
          <Card
            key={idx}
            className="group relative p-5 rounded-2xl cursor-pointer overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5"
            onClick={() => setSelected(sign)}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-lg font-bold group-hover:text-primary transition-colors">
                {sign.gloss}
              </span>
              <Badge variant="secondary" className="text-xs shrink-0">{sign.language}</Badge>
            </div>
            {sign.category && (
              <p className="text-xs text-muted-foreground mb-3">{sign.category}</p>
            )}
            <div className="w-full h-11 rounded-xl bg-gradient-to-r from-primary/5 to-secondary/5 border border-border/60 flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground transition-all group-hover:from-primary/10 group-hover:to-secondary/10 group-hover:text-primary group-hover:border-primary/30">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Play className="h-3 w-3 text-primary ml-0.5" />
              </span>
              Preview sign
            </div>
          </Card>
        ))}
      </div>

      {signs.length === 0 && !isFetching && (
        <div className="text-center py-16 text-muted-foreground">
          No signs found{deferredSearch ? ` for "${deferredSearch}"` : ''}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        {isLive
          ? `${signs.length} signs from live dictionary`
          : `${signs.length} sample signs · Connect DB to see full dictionary`
        }
      </p>

      <SignPreviewDialog sign={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
