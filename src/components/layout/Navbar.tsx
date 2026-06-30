import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NavbarAuthSection from "./NavbarAuthSection";

const NAV_LINKS = [
  { href: "/", label: "首頁" },
  { href: "/rooms/debate", label: "辯論房" },
  { href: "/rooms/banter", label: "嘴砲房" },
  { href: "/ranked", label: "排位賽" },
  { href: "/leaderboard", label: "排行榜" },
];

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nickname: string | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .single();
    nickname = data?.nickname ?? null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white transition-colors hover:text-indigo-400"
        >
          Bian<span className="text-indigo-400">Battle</span>
        </Link>

        <div className="flex items-center">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <NavbarAuthSection
            user={user ? { id: user.id, nickname } : null}
          />
        </div>
      </div>
    </header>
  );
}
