import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dock } from "@/components/ui/dock-two";
import { BookOpen, History, Languages, LayoutDashboard, LogOut, Moon, Sun, User as UserIcon } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { useTheme } from "@/contexts/ThemeContext";

const menuItems = [
  { icon: Languages,        label: "Translator", path: "/",          adminOnly: false },
  { icon: BookOpen,         label: "Dictionary", path: "/dictionary", adminOnly: false },
  { icon: History,          label: "History",    path: "/history",    adminOnly: false },
  { icon: UserIcon,         label: "Profile",    path: "/profile",    adminOnly: false },
  { icon: LayoutDashboard,  label: "Admin",      path: "/admin",      adminOnly: true  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Access to this dashboard requires authentication. Continue to launch the login flow.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = "/login"; }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  const visibleItems = menuItems.filter(item => !item.adminOnly || user?.role === 'admin');
  const dockItems = visibleItems.map(item => ({
    icon: item.icon,
    label: item.label,
    isActive: location === item.path,
    onClick: () => setLocation(item.path),
  }));
  const activeLabel = visibleItems.find(item => item.path === location)?.label ?? "SignSetu";

  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-background via-background to-muted/20">
      {/* Top header */}
      <header className="sticky top-0 z-40 h-16 border-b border-border/40 backdrop-blur-md bg-background/80">
        <div className="flex items-center justify-between h-full px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold tracking-tight">SignSetu</span>
              <span className="text-xs text-muted-foreground mt-0.5">{activeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {toggleTheme && (
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {theme === 'dark'
                  ? <Sun  className="h-4 w-4 text-muted-foreground" />
                  : <Moon className="h-4 w-4 text-muted-foreground" />}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-accent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                    {user?.name || "-"}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="text-sm font-medium truncate">{user?.name || "-"}</p>
                  <p className="text-xs text-muted-foreground truncate mt-1">{user?.email || "-"}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Content (bottom padding leaves room for floating dock) */}
      <main className="mx-auto w-full max-w-6xl px-4 md:px-6 py-6 pb-32">
        {children}
      </main>

      {/* Floating dock nav */}
      <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto">
          <Dock items={dockItems} />
        </div>
      </div>
    </div>
  );
}
