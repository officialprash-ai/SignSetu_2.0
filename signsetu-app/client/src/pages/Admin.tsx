import { trpc } from '@/lib/trpc';
import { useAuth } from '@/_core/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, FileText, TrendingUp, BarChart3 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useEffect } from 'react';

export default function Admin() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/');
  }, [user, navigate]);

  const overviewQuery  = trpc.stats.overview.useQuery(undefined, { staleTime: 30_000 });
  const topGlossQuery  = trpc.stats.topGlosses.useQuery({ limit: 10 }, { staleTime: 30_000 });

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        Access restricted to administrators.
      </div>
    );
  }

  const overview = overviewQuery.data;
  const topGlosses = topGlossQuery.data ?? [];

  const statCards = [
    { label: 'Total Users',          value: overview?.totalUsers,         icon: Users,      color: 'text-blue-500'  },
    { label: 'Total Translations',   value: overview?.totalTranslations,  icon: FileText,   color: 'text-green-500' },
    { label: 'Translations Today',   value: overview?.todayTranslations,  icon: TrendingUp, color: 'text-orange-500'},
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform-wide usage statistics</p>
      </div>

      {/* Overview cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{label}</p>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            {overviewQuery.isFetching
              ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              : <p className="text-3xl font-bold">{value ?? '—'}</p>
            }
          </Card>
        ))}
      </div>

      {/* Top glosses */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Top Glosses — Last 30 Days</h2>
        </div>

        {topGlossQuery.isFetching && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!topGlossQuery.isFetching && topGlosses.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No translation data yet.
          </p>
        )}

        {topGlosses.length > 0 && (
          <div className="space-y-2">
            {topGlosses.map((item, idx) => {
              const max = topGlosses[0]?.count ?? 1;
              const pct = Math.round((item.count / max) * 100);
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-6 text-xs text-muted-foreground text-right shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.gloss}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{item.language}</Badge>
                        <span className="text-muted-foreground text-xs">{item.count}×</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
