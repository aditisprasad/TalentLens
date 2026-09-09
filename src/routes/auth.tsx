import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — TalentLens Workforce Intelligence" },
      {
        name: "description",
        content:
          "Sign in or create your TalentLens account to access workforce, recruitment and attrition analytics.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  function authErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && error.message === "Invalid login credentials") {
      return "Invalid email or password.";
    }
    return error instanceof Error ? error.message : fallback;
  }

  // Already signed in → go straight to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        void supabase.auth.signOut({ scope: "local" });
        return;
      }

      if (data.session) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
  }, [navigate]);

  // ── Sign in ──────────────────────────────────────────────────────────
  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }

      if (data.session) {
        toast.success("Welcome back to TalentLens!");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      throw new Error("Supabase returned no authenticated session.");
    } catch (err) {
      toast.error(authErrorMessage(err, "Unable to sign in with the provided credentials."));
    } finally {
      setLoading(false);
    }
  }

  // ── Sign up ──────────────────────────────────────────────────────────
  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        toast.success("Account created. Welcome to TalentLens!");
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      setLoading(false);
      toast.info("Account created. Check your email to confirm your account before signing in.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to create the account at this time.");
    } finally {
      setLoading(false);
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────
  async function signInWithGoogle() {
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in could not be completed.");
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel */}
      <div className="hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <Link to="/" className="font-display text-xl font-semibold">
          TalentLens
        </Link>
        <div className="space-y-4">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Workforce decisions, backed by evidence.
          </h2>
          <p className="max-w-sm text-sidebar-foreground/70">
            Headcount trends, hiring funnels, attrition drivers and capacity gaps — calculated
            from your organisation's own HR data.
          </p>
        </div>
        <ul className="space-y-2 text-xs text-sidebar-foreground/60">
          <li>✓ Import employee, recruitment and attrition data from CSV or Excel</li>
          <li>✓ All analytics are derived from your real data — no demo numbers</li>
          <li>✓ Organisation-level data isolation and Row-Level Security</li>
          <li>✓ AI insights grounded in verified metrics, not generated fiction</li>
        </ul>
      </div>

      {/* Right panel */}
      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Access TalentLens</CardTitle>
            <CardDescription>
              Sign in with your work email or create a new organisation account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "signin" | "signup")}
            >
              <TabsList className="mb-4 w-full">
                <TabsTrigger className="flex-1" value="signin">
                  Sign in
                </TabsTrigger>
                <TabsTrigger className="flex-1" value="signup">
                  Create account
                </TabsTrigger>
              </TabsList>

              {/* ── Sign-in form ── */}
              <TabsContent value="signin">
                <form className="space-y-4" onSubmit={signIn}>
                  <div className="space-y-2">
                    <Label htmlFor="si-email">Work email</Label>
                    <Input
                      id="si-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="si-password">Password</Label>
                    <Input
                      id="si-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Sign in
                  </Button>
                </form>
              </TabsContent>

              {/* ── Sign-up form ── */}
              <TabsContent value="signup">
                <form className="space-y-4" onSubmit={signUp}>
                  <div className="space-y-2">
                    <Label htmlFor="su-name">Full name</Label>
                    <Input
                      id="su-name"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Priya Sharma"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-email">Work email</Label>
                    <Input
                      id="su-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-password">Password</Label>
                    <Input
                      id="su-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                    Create account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> or{" "}
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
              Continue with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
