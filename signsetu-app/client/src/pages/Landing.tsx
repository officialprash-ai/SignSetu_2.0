import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Globe, Users, Play } from 'lucide-react';
import { useLocation } from 'wouter';
import { getLoginUrl } from '@/const';

export default function Landing() {
  const [, navigate] = useLocation();

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
      <section className="container py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-sm font-semibold text-primary">✨ AI-Powered Sign Language Bridge</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Bridging Language with{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Sign
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              SignSetu converts spoken and written language into beautiful, animated sign language with AI-powered translation and 3D avatars. Making communication accessible for everyone.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
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
        </div>

        {/* Hero Visual */}
        <div className="mt-16 md:mt-24 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 blur-3xl rounded-full opacity-40" />
          <div className="relative bg-card border border-border rounded-2xl p-8 md:p-12 shadow-lg">
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Play className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground">Interactive 3D Avatar Demo</p>
              </div>
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
          {/* Feature 1 */}
          <div className="group p-8 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Translation</h3>
            <p className="text-muted-foreground">Convert text or speech to sign language in seconds with AI-powered accuracy</p>
          </div>

          {/* Feature 2 */}
          <div className="group p-8 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
              <Globe className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Language</h3>
            <p className="text-muted-foreground">Support for ASL and ISL with proper grammar rules and cultural nuances</p>
          </div>

          {/* Feature 3 */}
          <div className="group p-8 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">3D Avatar</h3>
            <p className="text-muted-foreground">Smooth, lifelike animations with expressive hand shapes and facial expressions</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-8">
          {/* Feature 4 */}
          <div className="group p-8 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Play className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Audio Input</h3>
            <p className="text-muted-foreground">Record or upload audio and watch it transform into beautiful sign language</p>
          </div>

          {/* Feature 5 */}
          <div className="group p-8 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-300">
            <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4 group-hover:bg-secondary/20 transition-colors">
              <Globe className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sign Dictionary</h3>
            <p className="text-muted-foreground">Browse thousands of signs with video previews and detailed information</p>
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
