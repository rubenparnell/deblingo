import { useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getReadableError } from "../lib/errors";
import { Alert } from "../components/Alert";

export function ProfileView({
  user,
  username,
  onUsernameChanged,
  onBack,
}: {
  user: User;
  username: string;
  onUsernameChanged: (value: string) => void;
  onBack: () => void;
}) {
  const [newUsername, setNewUsername] = useState(username);
  const [newEmail, setNewEmail] = useState(user.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  const saveUsername = async (event: FormEvent) => {
    event.preventDefault();
    const cleanUsername = newUsername.trim();
    setError("");
    setMessage("");
    if (!/^[A-Za-z0-9_]{3,30}$/.test(cleanUsername)) {
      setError(
        "Username must be 3-30 characters using only letters, numbers, and underscores.",
      );
      return;
    }
    setSaving("username");
    const { error: usernameError } = await supabase.rpc("set_my_username", {
      new_username: cleanUsername,
    });
    setSaving("");
    if (usernameError) {
      setError(getReadableError(usernameError.message));
      return;
    }
    onUsernameChanged(cleanUsername);
    setNewUsername(cleanUsername);
    setMessage("Username updated.");
  };

  const saveEmail = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setError("Enter a valid email address.");
      return;
    }
    setSaving("email");
    const { error: emailError } = await supabase.auth.updateUser({
      email: newEmail.trim(),
    });
    setSaving("");
    if (emailError) {
      setError(emailError.message);
      return;
    }
    setMessage(
      "Email update requested. Check your email to confirm the new address.",
    );
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (currentPassword.length < 1) {
      setError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSaving("password");
    const { error: currentPasswordError } =
      await supabase.auth.signInWithPassword({
        email: user.email ?? "",
        password: currentPassword,
      });
    if (currentPasswordError) {
      setSaving("");
      setError("The current password is incorrect.");
      return;
    }
    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setSaving("");
    if (passwordError) {
      setError(passwordError.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated.");
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]";

  return (
    <section className="mx-auto max-w-[700px] px-4 py-6 sm:px-10 sm:py-8 lg:px-14">
      <div className="mb-8">
        <h2 className="text-[32px] font-extrabold tracking-[-0.055em]">
          Your profile.
        </h2>
        <p className="mt-2 text-[13px] text-[#748096]">
          Update your account details and sign-in credentials.
        </p>
      </div>
      {(error || message) && (
        <Alert
          message={error || message}
          kind={error ? "error" : "success"}
          className="mb-6"
        />
      )}
      <div className="space-y-6">
        <form
          onSubmit={saveUsername}
          className="rounded-2xl border border-[#e4e8ef] bg-white p-4 shadow-[0_10px_30px_rgba(38,51,77,0.04)] sm:p-5"
        >
          <h3 className="text-[13px] font-bold">Username</h3>
          <label className="mt-4 block text-[11px] font-bold text-[#59667c]">
            Username
            <input
              required
              pattern="[A-Za-z0-9_]{3,30}"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              className={inputClass}
            />
          </label>
          <p className="mt-2 text-[11px] text-[#748096]">
            3-30 characters; letters, numbers, and underscores only.
          </p>
          <button
            disabled={saving === "username"}
            className="mt-4 rounded-xl bg-[#2144d3] px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving === "username" ? "Saving…" : "Update username"}
          </button>
        </form>

        <form
          onSubmit={saveEmail}
          className="rounded-2xl border border-[#e4e8ef] bg-white p-5 shadow-[0_10px_30px_rgba(38,51,77,0.04)]"
        >
          <h3 className="text-[13px] font-bold">Email address</h3>
          <p className="mt-1 text-[11px] text-[#9aa4b4]">
            Supabase may require confirmation at both the old and new address.
          </p>
          <label className="mt-4 block text-[11px] font-bold text-[#59667c]">
            Email
            <input
              required
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className={inputClass}
            />
          </label>
          <button
            disabled={saving === "email"}
            className="mt-4 rounded-xl bg-[#2144d3] px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving === "email" ? "Saving…" : "Update email"}
          </button>
        </form>

        <form
          onSubmit={savePassword}
          className="rounded-2xl border border-[#e4e8ef] bg-white p-5 shadow-[0_10px_30px_rgba(38,51,77,0.04)]"
        >
          <h3 className="text-[13px] font-bold">Password</h3>
          <label className="mt-4 block text-[11px] font-bold text-[#59667c]">
            Current password
            <input
              required
              minLength={1}
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </label>
          <label className="mt-4 block text-[11px] font-bold text-[#59667c]">
            New password
            <input
              required
              minLength={8}
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </label>
          <label className="mt-4 block text-[11px] font-bold text-[#59667c]">
            Confirm new password
            <input
              required
              minLength={8}
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </label>
          <p className="mt-2 text-[11px] text-[#748096]">
            New passwords must be at least 8 characters.
          </p>
          <button
            disabled={saving === "password"}
            className="mt-4 rounded-xl bg-[#2144d3] px-4 py-3 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving === "password" ? "Saving…" : "Update password"}
          </button>
        </form>
      </div>
    </section>
  );
}
