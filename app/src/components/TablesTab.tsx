"use client";

import { motion } from "framer-motion";
import { CircleDot, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "./Common";

const API_URL = "http://localhost:8000";

interface TableType {
  id: number;
  type: string;
  status: string;
  remaining?: string;
  active_user_id?: number | null;
}

export default function TablesTab() {
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tables`);
      const data = await res.json();
      setTables(data);
      localStorage.setItem("maincue_tables", JSON.stringify(data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem("maincue_tables");
    if (cached) setTables(JSON.parse(cached));
    fetchTables();
  }, []);

  return (
    <div className="space-y-6 pt-4 pb-24 px-2">
      <div className="flex justify-between items-end mb-8">
        <div>
           <h2 className="text-3xl font-light text-[#2A2421] tracking-tight">Tables</h2>
           <p className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] mt-1">Live Status</p>
        </div>
        <button onClick={fetchTables} className="text-[#8B8580] hover:text-[#2A2421] transition-colors p-2">
           <RefreshCw size={16} strokeWidth={1.5} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {tables.map((tbl, idx) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            key={tbl.id} 
            onClick={fetchTables}
            className={cn(
              "p-6 rounded-[1.5rem] border flex flex-col items-start justify-between min-h-[140px] cursor-pointer transition-all",
              tbl.status === "Available" ? "bg-white border-[#D4C4B7]/40 premium-shadow" : "bg-[#F5F4F1] border-transparent"
            )}
          >
            <div className="w-full flex justify-between items-start">
              <span className="text-[10px] font-medium tracking-[0.2em] text-[#8B8580]">{tbl.type}</span>
              {tbl.status !== "Available" && <CircleDot size={10} className="text-[#8B7355] animate-pulse" />}
            </div>
            
            <div className="mt-4">
              <span className="text-3xl font-light text-[#2A2421] block">No. {tbl.id}</span>
              <span className={cn(
                "text-[10px] uppercase tracking-widest mt-2 block font-medium",
                tbl.status === "Available" ? "text-[#8B7355]" : "text-[#8B8580]"
              )}>
                {tbl.status} {tbl.remaining && `- ${tbl.remaining}`}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
