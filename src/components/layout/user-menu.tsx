"use client";

import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProfileDialog } from "@/components/layout/profile-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getDataSource } from "@/lib/data/data-source";
import { getSupabaseBrowserClient } from "@/lib/data/supabase/client";
import { useRepo } from "@/lib/data/use-repo";

function initialsFor(name: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]![0]! + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function UserMenu() {
  const repo = useRepo();
  const router = useRouter();
  const profile = repo.profile.get();
  const [profileOpen, setProfileOpen] = useState(false);

  if (getDataSource() !== "supabase") return null;

  async function handleSignOut() {
    const client = getSupabaseBrowserClient();
    await client.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu do usuário">
              <Avatar>
                <AvatarFallback>{initialsFor(profile.displayName)}</AvatarFallback>
              </Avatar>
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            {profile.displayName ? <DropdownMenuLabel>{profile.displayName}</DropdownMenuLabel> : null}
            <DropdownMenuItem onClick={() => setProfileOpen(true)}>
              <User className="h-4 w-4" />
              Perfil
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} profile={profile} onSubmit={(patch) => repo.profile.update(patch)} />
    </>
  );
}
