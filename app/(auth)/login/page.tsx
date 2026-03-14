"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { signIn, resetPassword } from "@/lib/firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { FieldWrapper, Input } from "@/components/ui/FormField";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Redirect to dashboard once AuthContext confirms the user is logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      // Don't navigate here — the useEffect above will redirect
      // once AuthContext picks up the authenticated user.
      // Keep loading=true so the spinner stays until redirect.
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      const msg = (err as { message?: string }).message ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        setError(`Invalid email or password. \n[${code}] ${msg}`);
      } else if (code === "auth/operation-not-allowed") {
        setError(`Email/password sign-in is not enabled in Firebase Console. \n[${code}] ${msg}`);
      } else if (code === "auth/invalid-api-key") {
        setError(`Firebase API key is invalid — check .env.local. \n[${code}] ${msg}`);
      } else {
        setError(`Error (${code || "unknown"}): ${msg}`);
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    try {
      await resetPassword(email);
      setResetSent(true);
      setError("");
    } catch {
      setError("Could not send reset email. Check the address and try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-2xl mb-4">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 text-center">Library Management System</h1>
          <p className="text-sm text-slate-500 mt-1">Library Management Ecosystem — Staff Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <FieldWrapper label="Email" htmlFor="email" required>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@librarymanagement.ae"
              autoComplete="email"
              required
              error={!!error}
            />
          </FieldWrapper>

          <FieldWrapper label="Password" htmlFor="password" required>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              error={!!error}
            />
          </FieldWrapper>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}

          {resetSent && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
              Password reset email sent. Check your inbox.
            </p>
          )}

          <Button type="submit" className="w-full h-14 text-base" loading={loading}>
            Sign In
          </Button>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Forgot password?
          </button>
        </form>
      </div>
    </div>
  );
}
