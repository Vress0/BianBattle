import Link from "next/link";
import ModeCard from "@/components/home/ModeCard";

const FEATURES = [
  { icon: "⚖️", title: "AI 裁判", desc: "即時評分與賽後分析" },
  { icon: "👥", title: "多人模式", desc: "1v1、3v3、5v5 全支援" },
  { icon: "🏆", title: "段位系統", desc: "青銅到王者七階段位" },
  { icon: "🎯", title: "快速配對", desc: "秒速找到對手開戰" },
];

export default function HeroSection() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 text-center">
        <span className="mb-4 rounded-full border border-slate-700 px-4 py-1.5 text-sm text-slate-300">
          線上辯論配對平台
        </span>

        <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-6xl font-bold tracking-tight text-transparent md:text-8xl">
          BianBattle
        </h1>

        <p className="mt-4 text-xl text-indigo-400 md:text-2xl">
          See Every Side with AI
        </p>

        <p className="mt-5 max-w-2xl text-slate-400">
          真人線上辯論配對平台，支援辯論房、嘴砲房、排位賽、1v1、3v3、5v5
          對戰。AI 擔任主持人、裁判與賽後分析教練。
        </p>

        <div className="mt-12 grid w-full max-w-3xl gap-5 md:grid-cols-2">
          <ModeCard
            type="debate"
            title="辯論房"
            description="正式回合制辯論，練習立論、反駁、攻防與總結，AI 即時點評。"
            features={["1v1", "3v3", "5v5", "一般對戰", "排位對戰"]}
            href="/rooms/debate"
            buttonLabel="進入辯論房"
          />
          <ModeCard
            type="banter"
            title="嘴砲房"
            description="輕鬆快速對戰，用幽默、反應力與觀點打出你的風格。"
            features={["1v1", "3v3", "5v5", "嘴砲戰力", "幽默反擊"]}
            href="/rooms/banter"
            buttonLabel="進入嘴砲房"
          />
        </div>

        <Link
          href="/ranked"
          className="mt-6 w-full max-w-3xl rounded-2xl border border-yellow-900/60 bg-gradient-to-r from-yellow-950/50 to-slate-900 p-5 text-left transition-colors hover:border-yellow-700/60"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-yellow-400">
                RANKED
              </span>
              <p className="mt-1 text-lg font-bold text-white">排位賽</p>
              <p className="mt-1 text-sm text-slate-400">
                從青銅爬到王者，證明你的辯論實力
              </p>
            </div>
            <span className="text-3xl">🏆</span>
          </div>
        </Link>
      </section>

      <section className="mx-auto mt-24 max-w-5xl px-6 pb-20">
        <h2 className="text-center text-2xl font-bold text-white">平台特色</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center"
            >
              <div className="text-3xl">{f.icon}</div>
              <p className="mt-3 font-semibold text-white">{f.title}</p>
              <p className="mt-1 text-sm text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
