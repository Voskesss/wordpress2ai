"use client";

import { SignInButton, Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/hoe-het-werkt", label: "Hoe het werkt" },
  { href: "/prijzen", label: "Prijzen" },
  { href: "/demo", label: "Demo" },
];

export default function HeaderNav({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden sm:flex items-center gap-6 text-sm font-medium">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-2 py-1 text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/contact"
          className="rounded-full bg-violet-600 px-4 py-2 text-white hover:bg-violet-500 transition-colors"
        >
          Kennismaken
        </Link>
        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="px-2 py-1 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer">
              Inloggen
            </button>
          </SignInButton>
        </Show>
        <Show when="signed-in">
          <Link
            href="/portal"
            className="px-2 py-1 text-zinc-600 hover:text-zinc-900 transition-colors"
          >
            Mijn website
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="px-2 py-1 text-violet-700 font-semibold hover:text-violet-900 transition-colors"
            >
              Admin
            </Link>
          )}
          <UserButton />
        </Show>
      </nav>

      {/* Mobiel */}
      <div className="flex sm:hidden items-center gap-3">
        <Show when="signed-in">
          <UserButton />
        </Show>
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Menu sluiten" : "Menu openen"}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
            {open ? (
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3 5.5h14M3 10h14M3 14.5h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-20 z-50 sm:hidden border-b border-zinc-200 bg-white shadow-lg">
          <nav className="flex flex-col p-4 gap-1 text-base font-medium">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 hover:bg-zinc-50"
              >
                {item.label}
              </Link>
            ))}
            <Show when="signed-in">
              <Link
                href="/portal"
                onClick={() => setOpen(false)}
                className="rounded-lg px-4 py-3 hover:bg-zinc-50"
              >
                Mijn website
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-3 text-violet-700 font-semibold hover:bg-violet-50"
                >
                  Admin
                </Link>
              )}
            </Show>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <button className="rounded-lg px-4 py-3 text-left hover:bg-zinc-50 cursor-pointer">
                  Inloggen
                </button>
              </SignInButton>
            </Show>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-violet-600 px-4 py-3 text-center text-white"
            >
              Kennismaken
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
