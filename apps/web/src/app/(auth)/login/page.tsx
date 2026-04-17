"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";

const GOOGLE_CLIENT_ID = "1006065568188-pfctkl2dlrfr47754ncmgm5eh1gtngv1.apps.googleusercontent.com";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogle } = useAuthStore();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="flex flex-col items-center">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img src="/favicon.png" alt="pdfy" className="w-16 h-16 rounded-xl object-contain" />
        </div>

        <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
          Welcome
        </h2>
        <p className="mb-8 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Sign in with your Google account
        </p>

        {error && (
          <div className="mb-4 p-3 text-sm rounded-lg w-full"
            style={{ background: "var(--color-badge-red)", color: "var(--color-error)" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
        ) : (
          <GoogleLogin
            onSuccess={async (response) => {
              if (!response.credential) { setError("No credential received"); return; }
              setLoading(true);
              setError("");
              try {
                await loginWithGoogle(response.credential);
                router.push("/dashboard");
              } catch (err: any) {
                setError(err.response?.data?.error || "Login failed");
              } finally {
                setLoading(false);
              }
            }}
            onError={() => setError("Google sign-in failed")}
            size="large"
            width="300"
            theme="outline"
            text="signin_with"
            ux_mode="popup"
          />
        )}
      </div>
    </GoogleOAuthProvider>
  );
}
