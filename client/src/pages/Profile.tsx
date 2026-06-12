import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Settings, Hand } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SignAvatar, type GlossEntry } from "@/components/SignAvatarLazy";

const LETTER_MS = 220;
const PAUSE_MS  = 120;

function nameToGlossSequence(name: string): GlossEntry[] {
  const letters = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim();
  if (!letters) return [];
  const entries: GlossEntry[] = [];
  let ms = 300;
  for (const ch of letters) {
    if (ch === ' ') { ms += PAUSE_MS; continue; }
    entries.push({ gloss: ch, startMs: ms, endMs: ms + LETTER_MS, confidence: 1, fingerspell: true });
    ms += LETTER_MS;
  }
  return entries;
}

export default function Profile() {
  const { user, logout } = useAuth();

  const [name, setName]         = useState('');
  const [language, setLanguage] = useState<'ASL' | 'ISL'>('ASL');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playKey, setPlayKey]   = useState(0); // bump to restart

  const profileQuery = trpc.auth.profile.useQuery(undefined, { enabled: !!user });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success('Profile updated successfully');
      profileQuery.refetch();
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });

  useEffect(() => {
    if (profileQuery.data?.user?.name) setName(profileQuery.data.user.name);
    if (profileQuery.data?.preferences?.preferredLanguage) setLanguage(profileQuery.data.preferences.preferredLanguage);
  }, [profileQuery.data]);

  const handleSave = () => {
    updateProfileMutation.mutate({ name, preferredLanguage: language });
  };

  const glossSequence = useMemo(() => nameToGlossSequence(name), [name, playKey]);

  const handlePreview = () => {
    setPlayKey(k => k + 1);
    setIsPlaying(true);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
            Profile Settings
          </h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Personal Information
            </CardTitle>
            <CardDescription>Update your personal details here.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name + avatar preview side by side */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {/* Left: avatar initial + name input */}
              <div className="flex-1 w-full space-y-3">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 shrink-0 border">
                    <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                      {name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={e => { setName(e.target.value); setIsPlaying(false); }}
                      placeholder="Enter your name"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  disabled={!name.trim()}
                  className="gap-2 text-xs"
                >
                  <Hand className="w-3.5 h-3.5" />
                  Fingerspell my name
                </Button>
              </div>

              {/* Right: compact avatar */}
              <div className="shrink-0 w-full sm:w-40 rounded-2xl overflow-hidden border border-border bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" style={{ height: '160px' }}>
                <SignAvatar
                  glossSequence={glossSequence}
                  isPlaying={isPlaying}
                  playbackSpeed={1}
                  onAnimationComplete={() => setIsPlaying(false)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <Input value={user.email || 'No email provided'} disabled className="bg-muted/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Preferences
            </CardTitle>
            <CardDescription>Manage your app experience and defaults.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1">
              <Label>Default Sign Language</Label>
              <Select value={language} onValueChange={(v: 'ASL' | 'ISL') => setLanguage(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASL">American Sign Language (ASL)</SelectItem>
                  <SelectItem value="ISL">Indian Sign Language (ISL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full sm:w-auto"
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
            >
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Session</CardTitle>
            <CardDescription>Sign out of your account on this device.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={logout} className="w-full sm:w-auto">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
