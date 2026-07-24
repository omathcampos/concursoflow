"use client";

import { Bell, Check, LogOut, Monitor, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDataSource } from "@/lib/data/data-source";
import { getSupabaseBrowserClient } from "@/lib/data/supabase/client";
import { useSupabaseCache } from "@/lib/data/supabase/cache-store";
import { useRepo } from "@/lib/data/use-repo";
import { initialsFor } from "@/lib/domain/profile-display";

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function UserMenu() {
  const repo = useRepo();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const profile = repo.profile.get();
  const email = useSupabaseCache((s) => s.userEmail);

  if (getDataSource() !== "supabase") return null;

  async function handleSignOut() {
    const client = getSupabaseBrowserClient();
    await client.auth.signOut();
    toast.success("Até logo!");
    router.push("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menu do usuário">
            <Avatar>
              <AvatarFallback className="bg-primary text-primary-foreground">{initialsFor(profile.displayName, email)}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="text-foreground">{profile.displayName || "Sem nome"}</span>
            {email ? <span className="text-xs font-normal text-muted-foreground">{email}</span> : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/perfil" />}>
            <User className="h-4 w-4" />
            Perfil
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun className="h-4 w-4" />
              Tema
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
                  <Icon className="h-4 w-4" />
                  {label}
                  {theme === value ? <Check className="ml-auto h-4 w-4" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem
            onClick={() => {
              toast.info("Notificações chegam na próxima fase — em breve por aqui.");
              router.push("/perfil");
            }}
          >
            <Bell className="h-4 w-4" />
            Notificações
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
