"use client";

import { LogOut, MoonStar, Settings2, SunMedium, UserCircle2 } from "lucide-react";
import { useTheme } from "next-themes";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { usePermissions } from "@/features/permissions/hooks";

function getInitials(email?: string) {
  if (!email) {
    return "SA";
  }

  return email.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { setTheme } = useTheme();
  const { user, logout } = useAuth();
  const { roleName } = usePermissions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 gap-3 rounded-full px-2">
          <Avatar>
            <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
          </Avatar>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium text-foreground">{user?.email ?? "Workspace user"}</span>
            <span className="block text-xs capitalize text-muted-foreground">{roleName ?? "No active role"}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserCircle2 className="size-4" />
          Profile coming soon
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings2 className="size-4" />
          Session management later
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <SunMedium className="size-4" />
          Light theme
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <MoonStar className="size-4" />
          Dark theme
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => void logout()}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
