import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { CategoriesManager } from "./CategoriesManager";
import { SizesManager } from "./SizesManager";
import { BrandsManager } from "./BrandsManager";
import { Tags } from "lucide-react";

const TABS = [
  { id: "categories", label: "Categorías" },
  { id: "sizes", label: "Talles" },
  { id: "brands", label: "Marcas" },
];

export function Atributos() {
  const [activeTab, setActiveTab] = useState("categories");

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Tags size={18} className="text-hype" />
        <h1 className="font-1 text-lg tracking-[0.15em] uppercase">Atributos</h1>
      </div>

      <div className="flex gap-1 mb-[15px] border-b border-white/8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 font-1 text-[10px] tracking-[0.15em] uppercase transition-colors border-b-2 -mb-[1px] ${activeTab === tab.id
              ? "border-hype text-hype font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "categories" && <CategoriesManager />}
      {activeTab === "sizes" && <SizesManager />}
      {activeTab === "brands" && <BrandsManager />}
    </div>
  );
}
