"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "./Common";
import { useModal } from "./ModalProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function BookingsTab({ userId }: { userId: number }) {
  const [duration, setDuration] = useState(1);
  const [players, setPlayers] = useState("1-2");
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [successStatus, setSuccessStatus] = useState(false);
  const [updateTick, setUpdateTick] = useState(0); // Trigger for WS updates
  const { showModal } = useModal();

  useEffect(() => {
    fetchTables();

    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws");
    ws.onmessage = (event) => {
      if (event.data === "tables_updated") {
        fetchTables();
        setUpdateTick(prev => prev + 1); // Signal components to check their status safely
      }
    };
    return () => ws.close();
  }, []);

  const fetchTables = async () => {
    try {
      const res = await fetch(`${API_URL}/tables`);
      const data = await res.json();
      setAvailableTables(data.filter((t: any) => t.status === "Available"));
    } catch(e) {
      console.error(e);
    }
  };

  // Replace setInterval polling with WebSocket-triggered check
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

  const cost = duration * 45000;

  const handleBook = async () => {
    if (!selectedTable) {
        showModal({ title: "Table Required", message: "Please select a table to proceed.", type: "info" });
        return;
    }
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
        body: JSON.stringify({
          user_id: userId,
          table_id: selectedTable,
          duration,
          players
        })
      });
      if (!res.ok) {
        setLoading(false);
        const errData = await res.json();
        showModal({
            title: "Pembayaran Berhasil!",
            message: "Tiket telah ditambahkan ke beranda Anda.",
            type: "success"
        });    return;
      }
      const data = await res.json();
      setPaymentData(data);
      setLoading(false);
    } catch(e) {
      setLoading(false);
      showModal({
          title: "Kesalahan Koneksi",
          message: "Silakan periksa jaringan Anda dan coba lagi.",
          type: "error"
      });
    }
  };

  if (successStatus) {
    return (
      <div className="flex flex-col items-center justify-center pt-32 pb-10 h-full text-center space-y-6">
        <div className="w-16 h-16 border border-[#2A2421] bg-[#2A2421] text-[#D4C4B7] shadow-xl premium-shadow rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-light">✓</span>
        </div>
        <div>
           <h2 className="text-3xl font-light text-[#2A2421] tracking-tight holographic-text">Selesaikan<br/>Reservasi</h2>
           <p className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] mt-2">Pilih Meja, Bayar Langsung</p>
          <p className="text-xs text-[#8B8580] uppercase tracking-[0.2em] leading-relaxed">
             Buka <strong className="text-[#8B7355]">Tab Beranda</strong> untuk melihat Tiket & QR Code Anda.
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
           <Loader2 size={12} className="animate-spin" /> Menunggu Pembayaran
        </p>

        <div className="flex flex-col gap-6 mt-8 w-full max-w-[200px]">
           <button 
             onClick={async () => {
                await fetch(`${API_URL}/simulate-payment/${paymentData.booking_id}`, { method: 'POST' });
             }}
             className="w-full py-4 bg-[#F5F4F1] text-[#8B7355] border border-[#D4C4B7]/80 rounded-[1rem] uppercase tracking-[0.2em] text-[10px] font-medium hover:bg-[#E6E2DE] active:scale-95 transition-all premium-shadow"
           >
             Test Bypass Paid
           </button>

           <button onClick={() => setPaymentData(null)} className="w-full py-4 bg-transparent border border-[#2A2421] text-[#2A2421] rounded-2xl text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[#F5F4F1] transition-colors outline-none">
                  Batal Pesan
                </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pt-10 pb-24 mx-2">
      <div className="mb-8">
         <h2 className="text-3xl font-light text-[#2A2421] tracking-tight">Reservasi</h2>
      </div>
      
      <div className="space-y-10">
        
        {/* Branch / Location */}
        <div>
          <span className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] mb-4 block">Pilih Lokasi</span>
          <div className="w-full bg-white px-6 py-5 rounded-[1.5rem] premium-border flex justify-between items-center premium-shadow">
             <span className="font-light text-[#2A2421] text-lg tracking-tight">Sudirman Core</span>
             <span className="w-2 h-2 rounded-full bg-[#8B7355]"></span>
          </div>
        </div>

        {/* Table Selection */}
        <div>
          <div className="flex justify-between items-end mb-4">
             <span className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] block">Pilih Meja ({availableTables.length})</span>
          </div>
          <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-hide py-2">
            {availableTables.length === 0 && <span className="text-xs text-[#8B8580] font-light italic">Menunggu koneksi...</span>}
            {availableTables.map((t) => (
              <div 
                key={t.id} 
                onClick={() => setSelectedTable(t.id)}
                className={cn(
                  "flex-shrink-0 w-24 h-32 rounded-[1.5rem] border flex flex-col items-center justify-center cursor-pointer transition-all",
                  selectedTable === t.id ? "bg-[#2A2421] border-[#2A2421] text-white premium-shadow -translate-y-2" : "bg-white border-[#D4C4B7]/40 text-[#2A2421] hover:border-[#8B7355]"
                )}
              >
                 <span className="text-[10px] uppercase tracking-[0.2em] opacity-70 mb-2">{t.type}</span>
                 <span className="text-3xl font-light">#{t.id}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
           {/* Duration */}
          <div>
            <label className="text-[10px] font-medium text-[#8B8580] uppercase tracking-[0.2em] mb-4 block">Durasi</label>
            <div className="flex items-center justify-between bg-white premium-border rounded-[1.5rem] premium-shadow p-2">
              <button 
                onClick={() => setDuration(Math.max(1, duration - 1))}
                className="w-14 h-14 flex items-center justify-center rounded-xl bg-[#F5F4F1] text-[#2A2421] hover:bg-[#E6E2DE] active:scale-95 transition-all"
                disabled={duration <= 1}
              >-</button>
              <div className="text-2xl font-light text-[#2A2421] w-20 text-center">{duration}</div>
              <button 
                onClick={() => setDuration(Math.min(12, duration + 1))}
                className="w-14 h-14 flex items-center justify-center rounded-xl bg-[#F5F4F1] text-[#2A2421] hover:bg-[#E6E2DE] active:scale-95 transition-all"
              >+</button>
            </div>
          </div>
          
          {/* Players */}
          <div>
            <label className="text-[10px] font-medium text-[#8B8580] uppercase tracking-[0.2em] mb-4 block">Meja Tersedia</label>
            <div className="flex grid grid-cols-3 gap-3">
              {["1-2", "3-4", "5+"].map((p) => (
                <div 
                  key={p} onClick={() => setPlayers(p)}
                  className={cn(
                    "w-full py-4 rounded-xl cursor-pointer border transition-colors text-center text-sm font-medium hover:border-[#8B7355]",
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

      {/* Checkout Section */}
      <div className="mt-16 pt-8 border-t border-[#D4C4B7]/30">
        <div className="flex flex-col items-center text-center space-y-2 mb-8">
           <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8B8580]">Est. Total</span>
           <span className="text-4xl font-light text-[#2A2421]">Rp {cost.toLocaleString('id-ID')}</span>
        </div>
        <button 
          onClick={handleBook}
          disabled={loading || !selectedTable}
          className={cn(
            "w-full h-16 rounded-[1.5rem] uppercase tracking-[0.2em] font-medium text-[11px] flex items-center justify-center gap-4 transition-all",
            (loading || !selectedTable) ? "bg-[#E6E2DE] text-[#8B8580] cursor-not-allowed" : "bg-[#2A2421] text-white hover:bg-[#1C1816] premium-shadow"
          )}
        >
           {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Proceed to Payment"}
        </button>
      </div>
    </div>
  );
}
