import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Globe, Users, Play } from 'lucide-react';
import { getLoginUrl } from '@/const';
import { SignAvatar, type GlossEntry } from '@/components/SignAvatarLazy';
import { useEffect, useRef, useState } from 'react';

// Demo sequence cycling through common signs with labels
const DEMO_SIGNS: { gloss: string; label: string }[] = [
  { gloss: 'HELLO',     label: 'Hello'     },
  { gloss: 'WELCOME',   label: 'Welcome'   },
  { gloss: 'LEARN',     label: 'Learn'     },
  { gloss: 'THANK-YOU', label: 'Thank You' },
  { gloss: 'GOOD',      label: 'Good'      },
  { gloss: 'HAPPY',     label: 'Happy'     },
  { gloss: 'LOVE',      label: 'Love'      },
  { gloss: 'HELP',      label: 'Help'      },
];

const SIGN_MS   = 1200;
const PAUSE_MS  = 500;

function buildSequence(gloss: string): GlossEntry[] {
  return [{ gloss, startMs: PAUSE_MS, endMs: PAUSE_MS + SIGN_MS, confidence: 1 }];
}

function AvatarDemo() {
  const [idx, setIdx]           = useState(0);
  const [playing, setPlaying]   = useState(true);
  const [sequence, setSequence] = useState<GlossEntry[]>(() => buildSequence(DEMO_SIGNS[0].gloss));
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When animation completes, advance to next sign after a short pause
  const handleComplete = () => {
    timerRef.current = setTimeout(() => {
      setIdx(i => {
        const next = (i + 1) % DEMO_SIGNS.length;
        setSequence(buildSequence(DEMO_SIGNS[next].gloss));
        return next;
      });
    }, 400);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const current = DEMO_SIGNS[idx];

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Avatar */}
      <div className="flex-1 min-h-0">
        <SignAvatar
          glossSequence={sequence}
          isPlaying={playing}
          playbackSpeed={1}
          onAnimationComplete={handleComplete}
        />
      </div>

      {/* Sign label strip */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3 pointer-events-none">
        <div className="px-4 py-1.5 rounded-full bg-background/80 backdrop-blur border border-border/60 shadow-sm">
          <span className="text-sm font-semibold text-foreground">{current.label}</span>
        </div>
      </div>

      {/* Dot indicators */}
      <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
        {DEMO_SIGNS.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === idx ? 'w-4 h-1.5 bg-primary' : 'w-1.5 h-1.5 bg-muted-foreground/30'
            }`}
          />
        ))}
      </div>

      {/* Play/pause overlay */}
      <button
        onClick={() => setPlaying(p => !p)}
        className="absolute inset-0 bg-transparent cursor-pointer focus:outline-none"
        aria-label={playing ? 'Pause demo' : 'Play demo'}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm rounded-xl">
          <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-md bg-background/80">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-lg">SignSetu</span>
          </div>
          <div className="flex items-center gap-4">
            <a href={getLoginUrl()} className="text-sm font-medium hover:text-primary transition-colors">
              Sign In
            </a>
            <Button asChild>
              <a href={getLoginUrl()}>Get Started</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left: copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-sm font-semibold text-primary">✨ AI-Powered Sign Language Bridge</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
                Bridging Language with{' '}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Sign
                </span>
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                SignSetu converts spoken and written language into beautiful, animated sign language with AI-powered translation and 3D avatars. Making communication accessible for everyone.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" asChild className="group">
                <a href={getLoginUrl()}>
                  Try Translator
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#features">
                  <Play className="w-4 h-4 mr-2" />
                  Learn More
                </a>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Click the avatar to pause · Signs cycle automatically
            </p>
          </div>

          {/* Right: live avatar */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl rounded-full opacity-40 scale-90" />
            <div className="relative bg-card border border-border rounded-2xl shadow-xl overflow-hidden" style={{ height: '420px' }}>
              <AvatarDemo />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features</h2>
          <p className="text-lg text-muted-foreground">Everything you need for seamless sign language translation</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="group p-8 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Translation</h3>
            <p className="text-muted-foreground">Convert text or speech to sign language in seconds with AI-powered accuracy</p>
          </div>

          <div className="group p-8 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
              <Globe className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Language</h3>
            <p className="text-muted-foreground">Support for ASL and ISL with proper grammar rules and cultural nuances</p>
          </div>

          <div className="group p-8 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">3D Avatar</h3>
            <p className="text-muted-foreground">Smooth, lifelike animations with expressive hand shapes and body language</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-8">
          <div className="group p-8 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Play className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Audio Input</h3>
            <p className="text-muted-foreground">Record or upload audio and watch it transform into beautiful sign language</p>
          </div>

          <div className="group p-8 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
              <Globe className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sign Dictionary</h3>
            <p className="text-muted-foreground">Browse hundreds of signs with live 3D previews and detailed information</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20 md:py-32">
        <div className="max-w-2xl mx-auto text-center space-y-8 bg-card border border-border rounded-2xl p-12">
          <h2 className="text-4xl font-bold">Ready to Bridge the Gap?</h2>
          <p className="text-lg text-muted-foreground">
            Start translating text and speech to sign language today. Join thousands of users making communication more accessible.
          </p>
          <Button size="lg" asChild className="group">
            <a href={getLoginUrl()}>
              Get Started Now
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 md:py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">S</span>
              </div>
              <span className="font-bold">SignSetu</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 SignSetu. Making sign language accessible to everyone.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
