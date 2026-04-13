"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Mobile logo */}
      <div className="flex items-center gap-3 mb-8 lg:hidden">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white text-lg"
          style={{ background: "var(--color-primary)" }}
        >
          P
        </div>
        <span className="text-xl font-semibold tracking-tight">pdfy</span>
      </div>

      <h2
        className="text-2xl font-bold mb-2"
        style={{ color: "var(--color-text-primary)" }}
      >
        Welcome back
      </h2>
      <p
        className="mb-8 text-sm"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Sign in to your account to continue
      </p>

      {error && (
        <div
          className="mb-4 p-3 text-sm rounded-lg"
          style={{
            background: "var(--color-badge-red)",
            color: "var(--color-error)",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--color-text-primary)" }}
          >
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            className="input"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-medium mb-1.5"
            style={{ color: "var(--color-text-primary)" }}
          >
            Password
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            className="input"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full h-11 mt-2"
          disabled={loading}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      <p
        className="mt-6 text-sm text-center"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium"
          style={{ color: "var(--color-primary)" }}
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
