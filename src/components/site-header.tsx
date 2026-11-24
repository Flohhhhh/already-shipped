"use client";

import { Check, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ThemeSwitch } from "@/components/theme-switch";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

const LINKS = [
  { href: "/", label: "Search" },
  { href: "/proposed", label: "Requests" },
] as const;

function isCurrent(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {LINKS.map((link) => {
        const current = isCurrent(pathname, link.href);
        return (
          <Button
            key={link.href}
            nativeButton={false}
            variant={current ? "outline" : "quiet"}
            aria-current={current ? "page" : undefined}
            className={`h-8 rounded-full px-4 ${current ? "bg-card border-transparent shadow-sm" : ""}`}
            render={<Link href={link.href} />}
          >
            {link.label}
          </Button>
        );
      })}
    </>
  );
}

function MobileMenu({ pathname }: { pathname: string }) {
  const [openPath, setOpenPath] = useState<string | null>(null);

  return (
    <Drawer
      showSwipeHandle
      open={openPath === pathname}
      onOpenChange={(next) => setOpenPath(next ? pathname : null)}
    >
      <DrawerTrigger
        render={
          <Button
            variant="quiet"
            aria-label="Open menu"
            className="size-11 rounded-full md:hidden"
          />
        }
      >
        <Menu />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="items-center pb-2 text-center">
          <DrawerTitle>Menu</DrawerTitle>
          <DrawerDescription className="sr-only">
            Search, requests, and appearance.
          </DrawerDescription>
        </DrawerHeader>
        <nav aria-label="Primary" className="px-3">
          <ul>
            {LINKS.map((link) => {
              const current = isCurrent(pathname, link.href);
              return (
                <li
                  key={link.href}
                  className="border-border/70 border-b last:border-b-0"
                >
                  <DrawerClose
                    nativeButton={false}
                    render={<Link href={link.href} />}
                    className="flex min-h-14 w-full items-center justify-between px-3 text-base"
                    aria-current={current ? "page" : undefined}
                  >
                    {link.label}
                    {current ? <Check aria-hidden className="size-5" /> : null}
                  </DrawerClose>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-4 flex items-center justify-between gap-4 px-6 pt-2">
          <p className="text-base">Appearance</p>
          <ThemeSwitch />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-background/80 sticky top-0 z-40 grid grid-cols-[1fr_auto] items-center gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-xl md:grid-cols-[1fr_auto_1fr] md:px-6">
      <Link
        href="/"
        className="justify-self-start text-base font-semibold tracking-tight"
      >
        already-shipped
      </Link>
      <nav
        aria-label="Primary"
        className="bg-muted col-start-2 hidden items-center gap-1 justify-self-center rounded-full p-1 md:flex"
      >
        <NavLinks pathname={pathname} />
      </nav>
      <div className="col-start-2 justify-self-end md:col-start-3">
        <div className="hidden md:block">
          <ThemeSwitch compact />
        </div>
        <div className="md:hidden">
          <MobileMenu pathname={pathname} />
        </div>
      </div>
    </header>
  );
}
