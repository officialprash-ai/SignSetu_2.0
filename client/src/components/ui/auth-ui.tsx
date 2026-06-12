"use client";
import * as React from "react";
import { useState, useId, useEffect } from "react";
import { Slot } from "@radix-ui/react-slot";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SplineScene } from "@/components/ui/splite";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ROBOT_SCENE = "https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode";

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
}

export function Typewriter({
  text,
  speed = 100,
  cursor = "|",
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [textArrayIndex, setTextArrayIndex] = useState(0);
  const textArray = Array.isArray(text) ? text : [text];
  const currentText = textArray[textArrayIndex] || "";
  useEffect(() => {
    if (!currentText) return;
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (currentIndex < currentText.length) {
            setDisplayText((prev) => prev + currentText[currentIndex]);
            setCurrentIndex((prev) => prev + 1);
          } else if (loop) {
            setTimeout(() => setIsDeleting(true), delay);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText((prev) => prev.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentIndex(0);
            setTextArrayIndex((prev) => (prev + 1) % textArray.length);
          }
        }
      },
      isDeleting ? deleteSpeed : speed,
    );
    return () => clearTimeout(timeout);
  }, [currentIndex, isDeleting, currentText, loop, speed, deleteSpeed, delay, displayText, text]);
  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">{cursor}</span>
    </span>
  );
}

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);
const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input dark:border-input/50 bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-6",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-input dark:border-input/50 bg-muted/50 px-3 py-3 text-sm text-foreground shadow-sm shadow-black/5 transition-shadow placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, ...props }, ref) => {
    const id = useId();
    const [showPassword, setShowPassword] = useState(false);
    return (
      <div className="grid w-full items-center gap-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="relative">
          <Input id={id} type={showPassword ? "text" : "password"} className={cn("pe-10", className)} ref={ref} {...props} />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

function GoogleIcon() {
  return <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="" className="mr-2 h-4 w-4" />;
}

function SignInForm({ onAuth }: { onAuth: () => void }) {
  const submit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); onAuth(); };
  return (
    <form onSubmit={submit} autoComplete="on" className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign in to your account</h1>
        <p className="text-balance text-sm text-muted-foreground">Continue to SignSetu</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" placeholder="m@example.com" autoComplete="email" /></div>
        <PasswordInput name="password" label="Password" autoComplete="current-password" placeholder="Password" />
        <Button type="submit" className="mt-2">Sign In</Button>
      </div>
    </form>
  );
}

function SignUpForm({ onAuth }: { onAuth: () => void }) {
  const submit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); onAuth(); };
  return (
    <form onSubmit={submit} autoComplete="on" className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-balance text-sm text-muted-foreground">Join SignSetu in seconds</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-1"><Label htmlFor="name">Full Name</Label><Input id="name" name="name" type="text" placeholder="John Doe" autoComplete="name" /></div>
        <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" placeholder="m@example.com" autoComplete="email" /></div>
        <PasswordInput name="password" label="Password" autoComplete="new-password" placeholder="Password" />
        <Button type="submit" className="mt-2">Sign Up</Button>
      </div>
    </form>
  );
}

function AuthFormContainer({ isSignIn, onToggle, onAuth }: { isSignIn: boolean; onToggle: () => void; onAuth: () => void; }) {
  return (
    <div className="mx-auto grid w-full max-w-[350px] gap-3">
      {isSignIn ? <SignInForm onAuth={onAuth} /> : <SignUpForm onAuth={onAuth} />}
      <div className="text-center text-sm">
        {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
        <Button variant="link" className="px-1" onClick={onToggle}>
          {isSignIn ? "Sign up" : "Sign in"}
        </Button>
      </div>
      <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
        <span className="relative z-10 bg-background px-2 text-muted-foreground">Or continue with</span>
      </div>
      <Button variant="outline" type="button" onClick={onAuth}>
        <GoogleIcon />
        Continue with Google
      </Button>
    </div>
  );
}

interface AuthUIProps {
  /** Called on any auth action (form submit or Google). Wire to your real login. */
  onAuth?: () => void;
}

export function AuthUI({ onAuth = () => {} }: AuthUIProps) {
  const [isSignIn, setIsSignIn] = useState(true);
  const toggleForm = () => setIsSignIn((p) => !p);

  const greeting = isSignIn
    ? ["Namaste! Welcome back.", "Good to see you again."]
    : ["Hello! Let's get you started.", "Welcome to SignSetu."];

  return (
    <div className="w-full min-h-dvh md:grid md:grid-cols-2 bg-background">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear { display: none; }
      `}</style>

      {/* Left: form */}
      <div className="flex min-h-dvh items-center justify-center p-6 md:min-h-0 md:p-0 md:py-12">
        <AuthFormContainer isSignIn={isSignIn} onToggle={toggleForm} onAuth={onAuth} />
      </div>

      {/* Right: greeting robot */}
      <div className="relative hidden md:block overflow-hidden bg-black/[0.96]">
        {/* dotted grid */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <SplineScene scene={ROBOT_SCENE} className="absolute inset-0 w-full h-full" />

        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/90 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center justify-end p-6 pb-10">
          <blockquote className="space-y-2 text-center">
            <p className="text-xl font-medium text-white">
              <Typewriter key={isSignIn ? "in" : "up"} text={greeting} speed={55} deleteSpeed={30} loop />
            </p>
            <cite className="block text-sm font-light text-white/60 not-italic">— SignSetu Assistant</cite>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
