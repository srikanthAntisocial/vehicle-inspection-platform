"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/toast";
import { api, describeError } from "@/lib/api";
import type { User } from "@/types";

const profileSchema = z.object({
  full_name: z.string().max(255).optional().or(z.literal("")),
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string().min(8, "Use at least 8 characters"),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });
type PasswordValues = z.infer<typeof passwordSchema>;

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name || "" },
  });

  useEffect(() => {
    if (user) profileForm.reset({ full_name: user.full_name });
  }, [user, profileForm]);

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const saveProfile = async (values: ProfileValues) => {
    setSavingProfile(true);
    try {
      await api.put<User>("/users/me", { full_name: values.full_name || "" });
      await refresh();
      toast.push("success", "Profile updated");
    } catch (err) {
      toast.push("error", "Update failed", describeError(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (values: PasswordValues) => {
    setSavingPassword(true);
    try {
      await api.put<User>("/users/me", { password: values.password });
      toast.push("success", "Password updated");
      passwordForm.reset({ password: "", confirm: "" });
    } catch (err) {
      toast.push("error", "Could not change password", describeError(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Account</p>
        <h1 className="text-display mt-1 text-3xl font-semibold md:text-4xl">Settings</h1>
      </div>

      <form onSubmit={profileForm.handleSubmit(saveProfile)} className="card-surface space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="text-sm text-muted-foreground">Update how your name appears in the app.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" {...profileForm.register("full_name")} placeholder="Your name" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={savingProfile}>
            {savingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
            Save profile
          </Button>
        </div>
      </form>

      <form onSubmit={passwordForm.handleSubmit(savePassword)} className="card-surface space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold">Password</h2>
          <p className="text-sm text-muted-foreground">Choose a strong password (min. 8 characters).</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...passwordForm.register("password")} />
            {passwordForm.formState.errors.password && (
              <p className="text-xs text-destructive">{passwordForm.formState.errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" {...passwordForm.register("confirm")} />
            {passwordForm.formState.errors.confirm && (
              <p className="text-xs text-destructive">{passwordForm.formState.errors.confirm.message}</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={savingPassword}>
            {savingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </div>
      </form>
    </div>
  );
}
