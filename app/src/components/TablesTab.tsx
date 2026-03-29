"use client";

import { motion } from "framer-motion";
import { CircleDot, RefreshCw, Users, Clock, Bell, CheckCircle2 } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { cn } from "./Common";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TableType {
  id: number;
  type: string;
  status: string;
  remaining?: string;
  seconds_remaining?: number;
  active_user_id?: number | null;
  waitlist_count?: number;
  total_revenue?: number;
  active_until?: string;
}

export default function TablesTab() {
  const [tables, setTables] = useState<TableType[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const notifiedTables = useRef<Set<number>>(new Set());

  useEffect(() => {
    const userStr = localStorage.getItem("billiard_user");
    if (userStr) setUserId(JSON.parse(userStr).id);

    // Check notification permission
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setNotifGranted(true);
    }
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/tables`);
      const data = await res.json();
      setTables(data);
      localStorage.setItem("maincue_tables", JSON.stringify(data));

      // Check 10-minute notification trigger
      data.forEach((t: TableType) => {
        if (
          t.status === "Playing" &&
          t.seconds_remaining != null &&
          t.seconds_remaining <= 600 && // 10 minutes
          t.seconds_remaining > 0 &&
          t.waitlist_count && t.waitlist_count > 0 &&
          !notifiedTables.current.has(t.id)
        ) {
          notifiedTables.current.add(t.id);
          if (notifGranted && typeof Notification !== "undefined") {
            new Notification(`Meja #${t.id} hampir selesai!`, {
              body: `Meja ${t.type} #${t.id} akan selesai dalam ${t.remaining}. Segera siapkan diri!`,
              icon: "/favicon.ico"
            });
          }
        }
        // Reset if table becomes available again
        if (t.status === "Available" && notifiedTables.current.has(t.id)) {
          notifiedTables.current.delete(t.id);
        }
      });
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

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws");
    ws.onmessage = (event) => {
      if (event.data === "tables_updated") fetchTables();
    };
    return () => ws.close();
  }, []);

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    if (result === "granted") setNotifGranted(true);
  };

  // Separate my tables vs others
  const myActiveTables = tables.filter(t => t.active_user_id === userId && t.status === "Playing");
  const otherTables = tables.filter(t => !(t.active_user_id === userId && t.status === "Playing"));

  return (
    <div className="space-y-6 pt-4 pb-24 px-2">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-light text-[#2A2421] tracking-tight">Daftar Meja</h2>
          <p className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] mt-1">Status Langsung</p>
        </div>
        <button onClick={fetchTables} className="text-[#8B8580] hover:text-[#2A2421] transition-colors p-2">
          <RefreshCw size={16} strokeWidth={1.5} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      {/* Notification permission request */}
      {!notifGranted && (
        <div className="bg-white border border-[#D4C4B7]/40 rounded-2xl p-4 premium-shadow">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 bg-[#F5F4F1] rounded-full flex items-center justify-center flex-shrink-0">
              <Bell size={14} className="text-[#8B7355]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#2A2421] mb-1">Aktifkan Notifikasi Meja</p>
              <p className="text-[10px] text-[#8B8580] leading-relaxed">Dapatkan pemberitahuan otomatis langsung di perangkat Anda saat:</p>
            </div>
          </div>
          <div className="space-y-1.5 mb-4 pl-11">
            {[
              "🔔 Meja yang Anda tunggu hampir selesai (10 menit sebelumnya)",
              "✅ Tiket Anda valid dan meja siap digunakan",
              "⚡ Ada meja baru yang tiba-tiba tersedia",
            ].map((item) => (
              <p key={item} className="text-[10px] text-[#8B8580]">{item}</p>
            ))}
          </div>
          <button
            onClick={requestNotifPermission}
            className="w-full py-3 flex items-center justify-center gap-2 bg-[#2A2421] text-white rounded-xl text-[10px] uppercase tracking-[0.2em] font-medium hover:bg-[#1A1614] active:scale-95 transition-all"
          >
            <Bell size={13} /> Izinkan Notifikasi
          </button>
        </div>
      )}
      {notifGranted && (
        <div className="flex items-center gap-2 py-2.5 px-4 bg-green-50 rounded-2xl border border-green-200">
          <CheckCircle2 size={13} className="text-green-600 flex-shrink-0" />
          <span className="text-[10px] text-green-700 uppercase tracking-widest font-medium">Notifikasi Aktif — Anda akan diberitahu 10 menit sebelum meja selesai</span>
        </div>
      )}

      {/* My Active Tables Section */}
      {myActiveTables.length > 0 && (
        <div>
          <span className="text-[10px] text-[#8B7355] uppercase tracking-[0.2em] block mb-3 font-bold">Meja Anda Aktif</span>
          <div className="space-y-3">
            {myActiveTables.map(tbl => (
              <motion.div
                key={tbl.id}
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-[1.5rem] bg-[#2A2421] text-white premium-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] uppercase tracking-[0.3em] text-[#D4C4B7]/70">{tbl.type}</span>
                    <h3 className="text-2xl font-light mt-1">Meja No. {tbl.id}</h3>
                    <p className="text-[10px] text-[#D4C4B7] mt-2 uppercase tracking-widest">Sedang Aktif</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] uppercase tracking-[0.2em] text-[#D4C4B7]/70 block mb-1">Sisa Waktu</span>
                    <span className="text-2xl font-light text-[#D4C4B7]">{tbl.remaining || "—"}</span>
                  </div>
                </div>
                {tbl.seconds_remaining != null && tbl.seconds_remaining <= 600 && (
                  <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
                    <Bell size={12} className="text-orange-400 animate-pulse" />
                    <span className="text-[10px] text-orange-400 font-medium">Waktu hampir habis!</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All Tables Grid */}
      <div>
        <span className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] block mb-3">Semua Meja</span>
        <div className="grid grid-cols-2 gap-4">
          {otherTables.map((tbl, idx) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.04 }}
              key={tbl.id}
              onClick={fetchTables}
              className={cn(
                "p-5 rounded-[1.5rem] border flex flex-col items-start justify-between min-h-[150px] cursor-pointer transition-all",
                tbl.status === "Available"
                  ? "bg-white border-[#D4C4B7]/40 premium-shadow"
                  : "bg-[#F5F4F1] border-[#D4C4B7]/20"
              )}
            >
              <div className="w-full flex justify-between items-start">
                <span className="text-[9px] font-medium tracking-[0.2em] text-[#8B8580]">{tbl.type}</span>
                <div className="flex items-center gap-1">
                  {tbl.status !== "Available" && <CircleDot size={9} className="text-[#8B7355] animate-pulse" />}
                </div>
              </div>

              <div className="mt-3 w-full">
                <span className="text-3xl font-light text-[#2A2421] block">No.{tbl.id}</span>
                <span className={cn(
                  "text-[9px] uppercase tracking-widest mt-1.5 block font-bold",
                  tbl.status === "Available" ? "text-green-600" : "text-orange-600"
                )}>
                  {tbl.status === "Available" ? "Tersedia" : "Penuh"}
                </span>

                {tbl.remaining && (
                  <span className="text-[9px] text-[#8B8580] mt-1 block flex items-center gap-1">
                    <Clock size={8} /> {tbl.remaining}
                  </span>
                )}

                {(tbl.waitlist_count || 0) > 0 && (
                  <span className="text-[9px] text-[#8B7355] mt-1 block flex items-center gap-1">
                    <Users size={8} /> {tbl.waitlist_count} menunggu
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
