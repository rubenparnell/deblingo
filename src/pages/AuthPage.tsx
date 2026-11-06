import { useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getReadableError } from "../lib/errors";
import { Alert } from "../components/Alert";

export function AuthView({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");

    if (mode === "signup") {
      const cleanUsername = username.trim();
      if (!/^[A-Za-z0-9_]{3,30}$/.test(cleanUsername)) {
        setError(
          "Username must be 3-30 characters using only letters, numbers, and underscores.",
        );
        setSubmitting(false);
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        setSubmitting(false);
        return;
      }
      const { data: existingUsername, error: usernameLookupError } =
        await supabase.rpc("get_email_for_username", {
          login_username: cleanUsername,
        });
      if (usernameLookupError) {
        setError("We could not check whether that username is available.");
        setSubmitting(false);
        return;
      }
      if (existingUsername) {
        setError("That username is already taken. Please choose another.");
        setSubmitting(false);
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: login.trim(),
        password,
        options: { data: { username: cleanUsername } },
      });
      if (signUpError) {
        setError(
          signUpError.message === "Database error saving new user"
            ? "That username is already taken. Please choose another."
            : getReadableError(signUpError.message),
        );
      }
      else if (data.session && data.user) {
        const { error: profileError } = await supabase.rpc("set_my_username", {
          new_username: cleanUsername,
        });
        if (profileError) setError(getReadableError(profileError.message));
        else onSignedIn(data.user);
      } else
        setMessage(
          "Account created. Check your email to confirm your account, then sign in.",
        );
      setSubmitting(false);
      return;
    }

    let email = login.trim();
    if (!email.includes("@")) {
      const { data: usernameData, error: usernameError } = await supabase.rpc(
        "get_email_for_username",
        { login_username: email },
      );
      if (usernameError || !usernameData) {
        setError("We could not find an account with that username.");
        setSubmitting(false);
        return;
      }
      email = usernameData;
    }
    const { data, error: signInError } = await supabase.auth.signInWithPassword(
      { email, password },
    );
    if (signInError) setError(signInError.message);
    if (data.user) onSignedIn(data.user);
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] items-center justify-center bg-[#f7f8fb] px-4 py-5 sm:min-h-[calc(100dvh-88px)] sm:px-5">
      <div className="w-full max-w-[410px] rounded-3xl border border-[#e5e9ef] bg-white p-5 shadow-[0_20px_60px_rgba(38,51,77,0.08)] sm:p-8">
        <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#f3f5fa] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError("");
              setMessage("");
            }}
            className={`rounded-lg py-2 text-xs font-bold ${mode === "signin" ? "bg-white text-[#2144d3] shadow-sm" : "text-[#8994a6]"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError("");
              setMessage("");
            }}
            className={`rounded-lg py-2 text-xs font-bold ${mode === "signup" ? "bg-white text-[#2144d3] shadow-sm" : "text-[#8994a6]"}`}
          >
            Create account
          </button>
        </div>
        <form onSubmit={submit} className="mt-7">
          {mode === "signup" && (
            <>
              <label htmlFor="signup-username" className="mb-2 block text-xs font-bold text-[#59667c]">
                Username
              </label>
              <input
                id="signup-username"
                required
                type="text"
                pattern="[A-Za-z0-9_]{3,30}"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]"
                placeholder="your_username"
              />
              <p className="mt-2 text-[11px] text-[#748096]">
                3-30 characters. Only letters, numbers, and underscores.
              </p>
            </>
          )}
          <label htmlFor="auth-email" className="mb-2 mt-4 block text-xs font-bold text-[#59667c]">
            {mode === "signin" ? "Username or email" : "Email"}
          </label>
          <input
            id="auth-email"
            required
            type={mode === "signin" ? "text" : "email"}
            autoComplete={mode === "signin" ? "username" : "email"}
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            className="w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]"
            placeholder={
              mode === "signin"
                ? "your_username or you@company.com"
                : "you@company.com"
            }
          />
          <label htmlFor="auth-password" className="mb-2 mt-4 block text-xs font-bold text-[#59667c]">
            Password
          </label>
          <input
            id="auth-password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]"
            placeholder={
              mode === "signup"
                ? "At least 8 characters"
                : "Your password"
            }
          />
          {mode === "signup" && (
            <p className="mt-2 text-[11px] text-[#748096]">
              Password must be at least 8 characters.
            </p>
          )}
          {error && <Alert message={error} className="mt-4" />}
          {message && (
            <Alert message={message} kind="success" className="mt-4" />
          )}
          <button
            disabled={submitting}
            className="mt-6 w-full rounded-xl bg-[#2144d3] py-3 text-sm font-bold text-white transition hover:bg-[#1738bd] disabled:opacity-50"
          >
            {submitting
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
