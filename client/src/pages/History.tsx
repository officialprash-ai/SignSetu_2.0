import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Loader2, Mic, RotateCcw, Type, History as HistoryIcon } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useLocation } from 'wouter';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SOURCE_ICON: Record<string, React.ReactNode> = {
  text:    <Type    className="w-3 h-3" />,
  audio:   <Mic     className="w-3 h-3" />,
  youtube: <span className="text-[10px] font-bold">YT</span>,
};

const SAMPLES = [
  {
    id: 'sample-1',
    text: 'Hello, how are you today?',
    language: 'ASL' as const,
    glosses: ['HELLO', 'HOW', 'YOU', 'TODAY'],
    sourceType: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'sample-2',
    text: 'Thank you for your help',
    language: 'ASL' as const,
    glosses: ['THANK-YOU', 'HELP'],
    sourceType: 'text',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'sample-3',
    text: 'My name is Prasad',
    language: 'ISL' as const,
    glosses: ['MY', 'NAME', 'P', 'R', 'A', 'S', 'A', 'D'],
    sourceType: 'audio',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
];

export default function History() {
  const { data, isLoading } = trpc.history.list.useQuery({ limit: 50 });
  const [, navigate] = useLocation();

  const items    = data?.items ?? [];
  const hasReal  = items.length > 0;
  const displayed = hasReal ? items : SAMPLES;
  const isGuest   = !hasReal && !isLoading;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <HistoryIcon className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Translation History
          </h1>
          <p className="text-muted-foreground">Your recent sign language translations</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading history&hellip;</span>
        </div>
      )}

      {!isLoading && displayed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
            <span className="text-4xl">📋</span>
          </div>
          <div className="space-y-1.5 max-w-xs">
            <p className="font-semibold text-foreground text-lg">No translations yet</p>
            <p className="text-sm text-muted-foreground">
              Every translation you make is saved here so you can replay it anytime.
            </p>
          </div>
          <Button onClick={() => navigate('/')} className="gap-2">
            <span>🤟</span>
            Make your first translation
          </Button>
          <p className="text-xs text-muted-foreground">
            Supports text, voice recording, and YouTube videos
          </p>
        </div>
      )}

      {!isLoading && displayed.length > 0 && (
        <>
          {isGuest && (
            <p className="text-xs text-muted-foreground bg-muted/50 border border-border/60 rounded-xl px-4 py-2.5">
              Showing sample history — sign in to see your saved translations.
            </p>
          )}

          <div className="space-y-3">
            {displayed.map(item => (
              <Card
                key={item.id}
                className="group p-5 rounded-2xl transition-all duration-300 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <p className="font-medium truncate">{item.text}</p>

                    <div className="flex flex-wrap gap-1.5">
                      {item.glosses.slice(0, 12).map((g, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-semibold text-primary"
                        >
                          {g}
                        </span>
                      ))}
                      {item.glosses.length > 12 && (
                        <span className="px-2.5 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
                          +{item.glosses.length - 12} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(item.createdAt)}
                      </span>
                      <Badge variant="secondary" className="text-xs">{item.language}</Badge>
                      <span className="flex items-center gap-1 capitalize">
                        {SOURCE_ICON[item.sourceType] ?? null}
                        {item.sourceType}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 group-hover:border-primary/40 group-hover:text-primary transition-colors"
                    onClick={() => navigate(`/?replay=${encodeURIComponent(item.text)}&lang=${item.language}`)}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Replay
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {hasReal && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              {items.length} translation{items.length !== 1 ? 's' : ''} saved
            </p>
          )}
        </>
      )}
    </div>
  );
}
