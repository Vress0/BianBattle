import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "首頁" },
  { href: "/rooms/debate", label: "辯論房" },
  { href: "/rooms/banter", label: "嘴砲房" },
  { href: "/ranked", label: "排位賽" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/profile", label: "個人資料" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-white transition-colors hover:text-indigo-400"
        >
          Bian<span className="text-indigo-400">Battle</span>
        </Link>

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
      </div>
    </header>
  );
}
