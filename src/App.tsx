import { useState } from "react";
import {
  BarChart3,
  ChevronRight,
  Database,
  Package,
  Users,
} from "lucide-react";
import anuaraIcon from "./assets/anuara-icon.png";
import Produse from "./pages/Produse";
import Clienti from "./pages/Clienti";
import Rapoarte from "./pages/Rapoarte";

type Page = "produse" | "clienti" | "rapoarte";

const BAZA_CHILDREN: { id: Page; label: string; icon: typeof Package }[] = [
  { id: "produse", label: "Produse", icon: Package },
  { id: "clienti", label: "Clienți", icon: Users },
];

export default function App() {
  const [page, setPage] = useState<Page>("rapoarte");
  const [bazaOpen, setBazaOpen] = useState(false);

  const bazaActive = BAZA_CHILDREN.some((c) => c.id === page);

  return (
    <div className="flex h-full">
      <aside className="flex w-64 shrink-0 flex-col bg-forest-950 text-forest-100">
        <div className="flex items-center gap-3 px-5 pb-6 pt-6">
          <img
            src={anuaraIcon}
            alt=""
            className="h-10 w-10 rounded-xl shadow-[0_0_24px_rgba(251,191,36,0.2)]"
          />
          <h1 className="font-display text-lg font-semibold leading-tight tracking-tight text-white">
            Anuara
          </h1>
        </div>

        <nav className="flex flex-col gap-1.5 px-3">
          <button
            onClick={() => setPage("rapoarte")}
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
              page === "rapoarte"
                ? "bg-forest-800/80 text-white"
                : "text-forest-200 hover:bg-forest-900 hover:text-white"
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-amber-400 transition-all duration-300 ${
                page === "rapoarte" ? "opacity-100" : "opacity-0 group-hover:opacity-40"
              }`}
            />
            <BarChart3
              size={18}
              className={`shrink-0 transition-colors ${
                page === "rapoarte"
                  ? "text-amber-400"
                  : "text-forest-300 group-hover:text-amber-300"
              }`}
            />
            <span className="text-sm font-semibold">Rapoarte</span>
          </button>

          <button
            onClick={() => setBazaOpen((o) => !o)}
            className={`group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-200 ${
              bazaActive
                ? "bg-forest-900 text-white"
                : "text-forest-200 hover:bg-forest-900 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <Database
                size={18}
                className={`shrink-0 transition-colors ${
                  bazaActive
                    ? "text-amber-400"
                    : "text-forest-300 group-hover:text-amber-300"
                }`}
              />
              <span className="text-sm font-semibold">Date de bază</span>
            </span>
            <ChevronRight
              size={15}
              className={`text-forest-400 transition-transform duration-200 ${
                bazaOpen ? "rotate-90" : ""
              }`}
            />
          </button>

          {bazaOpen && (
            <div className="ml-4 flex flex-col gap-1 border-l border-forest-800 pl-3">
              {BAZA_CHILDREN.map((item) => {
                const Icon = item.icon;
                const active = page === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setPage(item.id)}
                    className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all duration-200 ${
                      active
                        ? "bg-forest-800/80 text-white"
                        : "text-forest-300 hover:bg-forest-900 hover:text-white"
                    }`}
                  >
                    <Icon
                      size={15}
                      className={`shrink-0 transition-colors ${
                        active
                          ? "text-amber-400"
                          : "text-forest-400 group-hover:text-amber-300"
                      }`}
                    />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <div className="mt-auto px-5 pb-5">
          <p className="text-center text-[10px] tracking-wide text-forest-400/70">
            v1.0.0
          </p>
        </div>
      </aside>

      <main className="app-bg flex-1 overflow-auto">
        {page === "produse" && <Produse />}
        {page === "clienti" && <Clienti />}
        {page === "rapoarte" && <Rapoarte />}
      </main>
    </div>
  );
}
