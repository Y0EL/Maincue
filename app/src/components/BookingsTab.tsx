"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Users, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "./Common";
import { useModal } from "./ModalProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function BookingsTab({ userId }: { userId: number }) {
  const [duration, setDuration] = useState(1);
  const [players, setPlayers] = useState("1-2");
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [successStatus, setSuccessStatus] = useState(false);
  const [updateTick, setUpdateTick] = useState(0);

  // Waitlist confirmation dialog state
  const [showWaitlistConfirm, setShowWaitlistConfirm] = useState(false);

  const { showModal } = useModal();

  useEffect(() => {
    fetchTables();
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws");
    ws.onmessage = (event) => {
      if (event.data === "tables_updated") {
        fetchTables();
        setUpdateTick(prev => prev + 1);
      }
    };
    return () => ws.close();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch(`${API_URL}/tables`);
      const data = await res.json();
      setTables(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Check payment status when WS fires
  useEffect(() => {
    if (paymentData && !successStatus) {
      fetch(`${API_URL}/booking/${paymentData.booking_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === "PAID") {
            setSuccessStatus(true);
            setPaymentData(null);
            setTimeout(() => {
              setSuccessStatus(false);
              setSelectedTable(null);
            }, 5000);
          }
        })
        .catch(e => console.error("Payment check error", e));
    }
  }, [paymentData, successStatus, updateTick]);

  const selectedTableData = tables.find(t => t.id === selectedTable);
  const isTableOccupied = selectedTableData && selectedTableData.status !== "Available";
  const cost = duration * 45000;

  // When user clicks "Pesan" button
  const handleBookClick = () => {
    if (!selectedTable) {
      showModal({ title: "Pilih Meja", message: "Silakan pilih meja terlebih dahulu.", type: "info" });
      return;
    }
    if (isTableOccupied) {
      // Show waitlist confirmation
      setShowWaitlistConfirm(true);
    } else {
      // Directly proceed to payment
      proceedToBook();
    }
  };

  const proceedToBook = async () => {
    setShowWaitlistConfirm(false);
    setLoading(true);
    try {
      const userStr = localStorage.getItem("billiard_user");
      const token = userStr ? JSON.parse(userStr).token : "";
      const res = await fetch(`${API_URL}/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: userId, table_id: selectedTable, duration, players })
      });
      if (!res.ok) {
        const errData = await res.json();
        showModal({ title: "Gagal", message: errData.detail || "Terjadi kesalahan.", type: "error" });
        return;
      }
      const data = await res.json();
      setPaymentData(data);
    } catch (e) {
      showModal({ title: "Kesalahan Koneksi", message: "Silakan periksa jaringan Anda.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (successStatus) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 pb-10 h-full text-center space-y-6">
        <div className="w-16 h-16 border border-[#2A2421] bg-[#2A2421] text-[#D4C4B7] shadow-xl premium-shadow rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <h2 className="text-3xl font-light text-[#2A2421] tracking-tight">Pembayaran<br />Berhasil!</h2>
          <p className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] mt-4 leading-relaxed">
            Buka <strong className="text-[#8B7355]">Tab Beranda</strong> untuk<br />melihat Tiket &amp; QR Code Anda.
          </p>
        </div>
      </div>
    );
  }

  if (paymentData) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(paymentData.qr_string)}`;
    return (
      <div className="flex flex-col items-center justify-center pt-24 pb-20 h-full text-center space-y-8 px-8">
        <div>
          <p className="text-[10px] uppercase font-medium tracking-[0.2em] text-[#8B8580] mb-2">Total Pembayaran</p>
          <h2 className="text-4xl font-light text-[#2A2421]">Rp {paymentData.amount.toLocaleString('id-ID')}</h2>
        </div>
        <div className="bg-white p-4 premium-shadow premium-border w-56 h-56 flex items-center justify-center" style={{ borderRadius: "2rem" }}>
          <img src={qrUrl} alt="QRIS" className="w-full h-full object-contain mix-blend-multiply" />
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#8B7355] font-medium flex items-center gap-3 animate-pulse">
          <Loader2 size={12} className="animate-spin" /> Menunggu Konfirmasi Pembayaran
        </p>
        <div className="flex flex-col gap-4 mt-4 w-full max-w-[220px]">
          <button
            onClick={async () => {
              await fetch(`${API_URL}/simulate-payment/${paymentData.booking_id}`, { method: 'POST' });
            }}
            className="w-full py-4 bg-[#F5F4F1] text-[#8B7355] border border-[#D4C4B7]/80 rounded-[1rem] uppercase tracking-[0.2em] text-[10px] font-medium hover:bg-[#E6E2DE] active:scale-95 transition-all premium-shadow"
          >
            Test Bypass Paid
          </button>
          <button onClick={() => setPaymentData(null)} className="w-full py-4 bg-transparent border border-[#2A2421] text-[#2A2421] rounded-2xl text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[#F5F4F1] transition-colors outline-none">
            Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pt-10 pb-24 mx-2">
      <div className="mb-4">
        <h2 className="text-3xl font-light text-[#2A2421] tracking-tight">Reservasi</h2>
        <p className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] mt-1">Pilih Meja &amp; Durasi</p>
      </div>

      <div className="space-y-8">
        {/* Table Selection - ALL TABLES with status */}
        <div>
          <span className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] mb-4 block">Pilih Meja</span>
          <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide py-2">
            {tables.length === 0 && <span className="text-xs text-[#8B8580] font-light italic">Memuat data meja...</span>}
            {tables.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTable(t.id)}
                className={cn(
                  "flex-shrink-0 w-28 h-40 rounded-[1.5rem] border flex flex-col items-center justify-center cursor-pointer transition-all relative overflow-hidden gap-1",
                  selectedTable === t.id
                    ? "bg-[#2A2421] border-[#2A2421] text-white premium-shadow -translate-y-2"
                    : "bg-white border-[#D4C4B7]/40 text-[#2A2421] hover:border-[#8B7355]"
                )}
              >
                {/* Waitlist badge at top */}
                {t.waitlist_count > 0 && (
                  <div className={cn(
                    "absolute top-0 left-0 right-0 py-1 text-[8px] uppercase tracking-widest font-bold text-center",
                    selectedTable === t.id ? "bg-[#8B7355]" : "bg-[#8B7355] text-white"
                  )}>
                    Antrian: {t.waitlist_count}
                  </div>
                )}

                <span className="text-[9px] uppercase tracking-[0.2em] opacity-70 mt-3">{t.type}</span>
                <span className="text-3xl font-light">#{t.id}</span>

                {/* Status badge */}
                <span className={cn(
                  "text-[8px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full",
                  selectedTable === t.id
                    ? (t.status === "Available" ? "bg-green-400/30 text-green-200" : "bg-orange-400/30 text-orange-200")
                    : (t.status === "Available" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700")
                )}>
                  {t.status === "Available" ? "Tersedia" : "Penuh"}
                </span>

                {/* Remaining time if playing */}
                {t.remaining && (
                  <span className={cn(
                    "text-[8px] tracking-wide",
                    selectedTable === t.id ? "text-[#D4C4B7]" : "text-[#8B8580]"
                  )}>
                    <Clock size={8} className="inline mr-1" />{t.remaining}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status indicator for selected table */}
        {selectedTableData && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-4 rounded-2xl flex items-center gap-3",
              isTableOccupied ? "bg-orange-50 border border-orange-200" : "bg-green-50 border border-green-200"
            )}
          >
            {isTableOccupied
              ? <AlertTriangle size={18} className="text-orange-500 flex-shrink-0" />
              : <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" />
            }
            <div>
              <p className={cn("text-sm font-medium", isTableOccupied ? "text-orange-700" : "text-green-700")}>
                {isTableOccupied
                  ? `Meja #${selectedTable} Tidak Tersedia${selectedTableData.remaining ? ` — Selesai dalam ${selectedTableData.remaining}` : ''}`
                  : `Meja #${selectedTable} Tersedia`}
              </p>
              {isTableOccupied && selectedTableData.waitlist_count > 0 && (
                <p className="text-[10px] text-orange-600 mt-0.5">
                  <Users size={9} className="inline mr-1" />
                  {selectedTableData.waitlist_count} orang sudah dalam antrean
                </p>
              )}
              {!isTableOccupied && (
                <p className="text-[10px] text-green-600 mt-0.5">Anda bisa langsung memesan</p>
              )}
            </div>
          </motion.div>
        )}

        <div className="space-y-8">
          {/* Duration */}
          <div>
            <label className="text-[10px] font-medium text-[#8B8580] uppercase tracking-[0.2em] mb-4 block">Durasi (Jam)</label>
            <div className="flex items-center justify-between bg-white premium-border rounded-[1.5rem] premium-shadow p-2">
              <button
                onClick={() => setDuration(Math.max(1, duration - 1))}
                className="w-14 h-14 flex items-center justify-center rounded-xl bg-[#F5F4F1] text-[#2A2421] hover:bg-[#E6E2DE] active:scale-95 transition-all text-xl"
                disabled={duration <= 1}
              >−</button>
              <div className="text-center">
                <span className="text-3xl font-light text-[#2A2421]">{duration}</span>
                <span className="text-xs text-[#8B8580] ml-1">jam</span>
              </div>
              <button
                onClick={() => setDuration(Math.min(12, duration + 1))}
                className="w-14 h-14 flex items-center justify-center rounded-xl bg-[#F5F4F1] text-[#2A2421] hover:bg-[#E6E2DE] active:scale-95 transition-all text-xl"
              >+</button>
            </div>
          </div>

          {/* Players */}
          <div>
            <label className="text-[10px] font-medium text-[#8B8580] uppercase tracking-[0.2em] mb-4 block">
              <Users size={11} className="inline mr-1" />Jumlah Pemain
            </label>
            <div className="grid grid-cols-3 gap-3">
              {["1-2", "3-4", "5+"].map((p) => (
                <div
                  key={p} onClick={() => setPlayers(p)}
                  className={cn(
                    "py-4 rounded-xl cursor-pointer border transition-colors text-center text-sm font-medium hover:border-[#8B7355]",
                    players === p ? 'bg-[#FCFBFA] text-[#8B7355] border-[#8B7355]' : 'bg-white border-[#D4C4B7]/40 text-[#2A2421]'
                  )}
                >
                  {p}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Checkout */}
      <div className="mt-8 pt-8 border-t border-[#D4C4B7]/30">
        <div className="flex flex-col items-center text-center space-y-2 mb-8">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8B8580]">Est. Total</span>
          <span className="text-4xl font-light text-[#2A2421]">Rp {cost.toLocaleString('id-ID')}</span>
          <span className="text-[10px] text-[#8B8580]">{duration} jam × Rp 45.000</span>
        </div>
        <button
          onClick={handleBookClick}
          disabled={loading || !selectedTable}
          className={cn(
            "w-full h-16 rounded-[1.5rem] uppercase tracking-[0.2em] font-medium text-[11px] flex items-center justify-center gap-4 transition-all",
            (loading || !selectedTable)
              ? "bg-[#E6E2DE] text-[#8B8580] cursor-not-allowed"
              : isTableOccupied
                ? "bg-[#8B7355] text-white hover:bg-[#7A6448] premium-shadow"
                : "bg-[#2A2421] text-white hover:bg-[#1C1816] premium-shadow"
          )}
        >
          {loading
            ? <Loader2 className="animate-spin w-4 h-4" />
            : isTableOccupied
              ? "Masuk Antrean Waitlist"
              : "Lanjut ke Pembayaran"}
        </button>
      </div>

      {/* Waitlist Confirmation Modal */}
      <AnimatePresence>
        {showWaitlistConfirm && selectedTableData && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-[#2A2421]/50 backdrop-blur-sm"
            onClick={() => setShowWaitlistConfirm(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-[2rem] p-8 w-full max-w-md text-center premium-shadow"
            >
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-orange-600" />
              </div>
              <h3 className="text-xl font-medium text-[#2A2421] mb-2">Meja Sedang Penuh</h3>
              <p className="text-sm text-[#8B8580] mb-2">
                Meja <strong className="text-[#2A2421]">#{selectedTable}</strong> saat ini tidak tersedia
                {selectedTableData.remaining && <span> — selesai dalam <strong className="text-[#8B7355]">{selectedTableData.remaining}</strong></span>}.
              </p>
              {selectedTableData.waitlist_count > 0 && (
                <p className="text-xs text-orange-600 mb-6">
                  <Users size={10} className="inline mr-1" />
                  {selectedTableData.waitlist_count} orang sudah mengantre sebelum Anda.
                </p>
              )}
              <p className="text-xs text-[#8B8580] mb-8 bg-[#F5F4F1] p-3 rounded-xl">
                Dengan masuk waitlist, tiket Anda akan tersimpan dan <strong>berlaku 24 jam</strong> sejak pembayaran. Lewat dari itu, saldo akan dikembalikan otomatis.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowWaitlistConfirm(false)}
                  className="py-4 border border-[#D4C4B7] text-[#8B8580] rounded-2xl text-xs font-medium uppercase tracking-widest hover:bg-[#F5F4F1] transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={proceedToBook}
                  className="py-4 bg-[#8B7355] text-white rounded-2xl text-xs font-medium uppercase tracking-widest hover:bg-[#7A6448] transition-colors"
                >
                  Ya, Masuk Antrean
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
