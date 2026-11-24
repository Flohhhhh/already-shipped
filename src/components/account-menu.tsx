"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useSignInWithDiscord } from "@convex-dev/auth/methods/discord/react";
import { useSignInWithGithub } from "@convex-dev/auth/methods/github/react";
import { useOauth } from "@convex-dev/auth/methods/oauth/react";
import { useQuery } from "convex/react";

import { useClientReady } from "@/components/use-client-ready";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { api } from "../../convex/_generated/api";

function flowMessage(error: string) {
  if (error === "ACCESS_DENIED") return "Sign-in was cancelled.";
  if (error === "EXPIRED") return "Sign-in expired. Try again.";
  return "Sign-in failed.";
}

export function SignInButtons() {
  const github = useSignInWithGithub(api.auth);
  const discord = useSignInWithDiscord(api.auth);
  const { flowError } = useOauth();
  return (
    <div className="flex flex-col gap-2">
      <Button
        className="h-11 rounded-full"
        onClick={() => void github.signIn()}
      >
        Continue with GitHub
      </Button>
      <Button
        variant="outline"
        className="h-11 rounded-full"
        onClick={() => void discord.signIn()}
      >
        Continue with Discord
      </Button>
      {flowError ? (
        <p className="text-muted-foreground text-sm">
          {flowMessage(flowError.error)}
        </p>
      ) : null}
    </div>
  );
}

function AccountLive({ inline }: { inline?: boolean }) {
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  if (me === undefined) return null;
  if (me) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-sm">{me.name}</p>
        <Button
          variant="quiet"
          className="h-11 rounded-full px-3"
          onClick={() => void signOut()}
        >
          Sign out
        </Button>
      </div>
    );
  }
  if (inline) return <SignInButtons />;
  return (
    <Drawer showSwipeHandle>
      <DrawerTrigger
        render={
          <Button variant="outline" className="h-8 rounded-full px-3">
            Sign in
          </Button>
        }
      />
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Sign in</DrawerTitle>
          <DrawerDescription>
            Posting and voting need GitHub or Discord.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-2">
          <SignInButtons />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function AccountButton({ inline = false }: { inline?: boolean }) {
  const ready = useClientReady();
  if (!process.env.NEXT_PUBLIC_CONVEX_URL || !ready) return null;
  return <AccountLive inline={inline} />;
}

export function SignInDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Sign in</DrawerTitle>
          <DrawerDescription>
            Posting and voting need GitHub or Discord.
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-2">
          <SignInButtons />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
