import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spotlight } from '@/components/ui/spotlight';
import { SplineScene } from '@/components/ui/splite';
import { ArrowRight, Zap, Globe, Users, Play, Mic, BookOpen } from 'lucide-react';

const ROBOT_SCENE = 'https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode';

const FEATURES = [
  { icon: Zap,      tint: 'text-primary',   bg: 'bg-primary/10',   title: 'Instant Translation', desc: 'Convert text or speech to sign language in seconds with AI-powered accuracy.' },
  { icon: Globe,    tint: 'text-secondary', bg: 'bg-secondary/10', title: 'Multi-Language',      desc: 'ASL and ISL support with proper grammar rules and cultural nuance.' },
  { icon: Users,    tint: 'text-primary',   bg: 'bg-primary/10',   title: '3D Avatar',           desc: 'Smooth, lifelike animation with expressive hand shapes and body language.' },
  { icon: Mic,      tint: 'text-primary',   bg: 'bg-primary/10',   title: 'Audio Input',         desc: 'Record or upload audio and watch it transform into beautiful signing.' },
  { icon: BookOpen, tint: 'text-secondary', bg: 'bg-secondary/10', title: 'Sign Dictionary',     desc: 'Browse hundreds of signs with live 3D previews and detail.' },
  { icon: Play,     tint: 'text-primary',   bg: 'bg-primary/10',   title: 'Playback Control',    desc: 'Pause, replay, and adjust signing speed to learn at your own pace.' },
];

const STATS = [
  { value: '2', label: 'Sign languages' },
  { value: '500+', label: 'Signs covered' },
  { value: '3D', label: 'Animated avatar' },
  { value: '<1s', label: 'Translation time' },
];

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
            <a href="#features" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              Features
            </a>
            <a href="/login" className="text-sm font-medium hover:text-primary transition-colors">
              Sign In
            </a>
            <Button asChild>
              <a href="/login">Get Started</a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section — dark spotlight card */}
      <section className="container py-10 md:py-16">
        <Card className="relative w-full overflow-hidden rounded-3xl border-white/10 bg-black/[0.96] shadow-2xl">
          <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="white" />
          {/* subtle dotted grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />

          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center min-h-[520px] md:min-h-[580px]">
            {/* Left: copy */}
            <div className="flex flex-col justify-center p-8 md:p-12 space-y-7">
              <div className="inline-flex w-fit items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/15">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium text-neutral-300">AI-Powered Sign Language Bridge</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05] bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                Bridging language
                <br />
                with{' '}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  sign
                </span>
              </h1>

              <p className="text-base md:text-lg text-neutral-300 max-w-md leading-relaxed">
                SignSetu converts spoken and written language into beautiful, animated sign
                language with AI translation and a live 3D avatar — making communication
                accessible for everyone.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" asChild className="group">
                  <a href="/login">
                    Try Translator
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <a href="#features">
                    <Play className="w-4 h-4 mr-2" />
                    Learn More
                  </a>
                </Button>
              </div>

              <p className="text-xs text-neutral-500">
                Powered by AI translation and a live 3D avatar
              </p>
            </div>

            {/* Right: interactive 3D robot */}
            <div className="relative h-[320px] md:h-full min-h-[360px]">
              <SplineScene scene={ROBOT_SCENE} className="w-full h-full" />
            </div>
          </div>
        </Card>

        {/* Stats strip */}
        <div className="mx-auto mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
          {STATS.map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5 text-center">
              <div className="text-2xl md:text-3xl font-bold text-foreground">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container py-20 md:py-28">
        <div className="max-w-3xl mx-auto text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Powerful features</h2>
          <p className="text-lg text-muted-foreground">
            Everything you need for seamless sign language translation
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group p-7 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  <Icon className={`w-6 h-6 ${f.tint}`} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container pb-20 md:pb-28">
        <Card className="relative overflow-hidden rounded-3xl border-white/10 bg-black/[0.96] max-w-4xl mx-auto">
          <Spotlight className="-top-20 right-0 md:right-40" fill="white" />
          <div className="relative z-10 text-center space-y-7 p-10 md:p-16">
            <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
              Ready to bridge the gap?
            </h2>
            <p className="text-base md:text-lg text-neutral-300 max-w-xl mx-auto">
              Start translating text and speech to sign language today. Join thousands making
              communication more accessible.
            </p>
            <Button size="lg" asChild className="group">
              <a href="/login">
                Get Started Now
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </a>
            </Button>
          </div>
        </Card>
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
