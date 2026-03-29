"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RefreshCw, QrCode } from "lucide-react";
import { useState, useEffect } from "react";
import QRCode from "react-qr-code";

export default function HomeTab({ userId, onGoBook }: { userId: number, onGoBook: () => void }) {
  const [user, setUser] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const fetchUser = () => {
    const userStr = localStorage.getItem("billiard_user");
    const token = userStr ? JSON.parse(userStr).token : "";

    fetch(`http://localhost:8000/user/${userId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(async res => {
          if (!res.ok) {
              const err = await res.json();
              console.error("HomeTab fetch user error:", err);
              return null;
          }
          return res.json();
      })
      .then(data => {
        if (data) {
            setUser(data);
            localStorage.setItem(`maincue_home_${userId}`, JSON.stringify(data));
        }
      })
      .catch(e => console.log(e));
  };

  useEffect(() => {
    const cached = localStorage.getItem(`maincue_home_${userId}`);
    if (cached) setUser(JSON.parse(cached));
    fetchUser();
  }, []);

  return (
    <div className="space-y-8 pt-6 pb-24">
      
      {/* Banner */}
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="bg-[#2A2421] text-white p-8 relative overflow-hidden group premium-shadow"
        style={{ borderRadius: "2rem", cursor: (user?.active_tables?.length > 0 || user?.pending_tickets?.length > 0) ? "default" : "pointer" }}
        onClick={(user?.active_tables?.length > 0 || user?.pending_tickets?.length > 0) ? undefined : onGoBook}
      >
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-[#8B7355]/20 to-transparent opacity-50" />
        <div className="relative z-10">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#D4C4B7] mb-4 block">
             {user?.active_tables?.length > 0 ? "Currently Active" : user?.pending_tickets?.length > 0 ? "Tickets Ready" : "Reservation"}
          </span>
          <h2 className="text-3xl font-light leading-tight mb-8">
            {user?.active_tables?.length > 0 ? (
              <>Enjoy<br/>Your Game</>
            ) : user?.pending_tickets?.length > 0 ? (
              <>Scan<br/>To Play</>
            ) : (
              <>Secure<br/>Your Table</>
            )}
          </h2>
          
          <div className={`flex flex-row items-center gap-3 text-xs font-medium uppercase tracking-widest text-white pb-1 w-fit transition-colors ${(!user?.active_tables?.length && !user?.pending_tickets?.length) ? 'border-b border-[#8B7355] hover:border-white' : 'opacity-80'}`}>
            {user?.active_tables?.length > 0 ? (
              <span>Session In Progress</span>
            ) : user?.pending_tickets?.length > 0 ? (
              <span>Give Code to Admin</span>
            ) : (
              <>Book Now <ArrowRight size={14} /></>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* Active Reservation List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[10px] font-medium text-[#8B8580] uppercase tracking-[0.2em]">
            {user?.pending_tickets?.length > 0 ? "Verify to Start" : "Active Session"}
          </h3>
          <button onClick={fetchUser} className="text-[#8B8580] hover:text-[#2A2421] transition-colors"><RefreshCw size={14} strokeWidth={1.5} /></button>
        </div>

        {/* Cek Tiket Pending (Bisa Lebih Dari 1) */}
        {user?.pending_tickets?.map((ticket: any) => (
           <motion.div 
             key={`pending-${ticket.id}`}
             whileTap={{ scale: 0.98 }}
             onClick={() => setSelectedTicket(ticket)}
             className="bg-white p-6 rounded-[2rem] premium-border premium-shadow flex items-center justify-between cursor-pointer group hover:bg-[#F5F4F1] transition-colors mb-4"
           >
              <div>
                <span className="text-[10px] font-medium text-[#8B7355] uppercase tracking-[0.2em] mb-2 block">Ticket Ready</span>
                <h4 className="text-3xl font-light text-[#2A2421] tracking-tight">Table No. {ticket.table_id}</h4>
              </div>
              <div className="w-14 h-14 bg-[#2A2421] text-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform flex-shrink-0">
                <QrCode size={24} strokeWidth={1.5} />
              </div>
           </motion.div>
        ))}

        {/* Cek Meja Aktif (Bisa Lebih Dari 1) */}
        {user?.active_tables?.map((table: any) => (
           <div key={`active-${table.id}`} className="bg-white p-8 rounded-[2rem] premium-border premium-shadow mb-4">
              <div className="flex justify-between items-start mb-8">
                <div>
                   <span className="text-[10px] font-medium text-[#8B7355] uppercase tracking-[0.2em] mb-2 block">Table Status : Active</span>
                   <h4 className="text-4xl font-light text-[#2A2421]">No. {table.id}</h4>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-[#D4C4B7]/30 pt-4">
                <span className="text-[10px] uppercase tracking-widest text-[#8B8580]">Time Left</span>
                <span className="text-sm font-medium text-[#2A2421]">
                  Ends at {new Date(table.active_until).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false})}
                </span>
              </div>
           </div>
        ))}
        
        {(!user?.pending_tickets?.length && !user?.active_tables?.length) && (
           <div className="bg-transparent border border-[#D4C4B7]/40 rounded-[2rem] p-10 text-center">
              <p className="text-sm font-light text-[#2A2421] mb-2">No active reservations.</p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-[#8B8580]">Reserve a table to start</p>
           </div>
        )}
      </div>

      {/* Local Ticket Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-[#2A2421]/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#FCFBFA] rounded-[2rem] p-8 shadow-2xl flex flex-col items-center text-center border border-[#D4C4B7]/40 z-10"
            >
              <span className="text-[10px] font-medium text-[#8B7355] uppercase tracking-[0.2em] mb-4 block">
                Verification Ticket
              </span>
              
              <div className="bg-white p-4 rounded-xl border border-[#D4C4B7] shadow-sm mb-6 mt-2 inline-block relative">
                 <div className="absolute inset-0 w-full h-full p-2">
                    <div className="w-4 h-4 border-t-2 border-l-2 border-[#2A2421] absolute top-2 left-2" />
                    <div className="w-4 h-4 border-t-2 border-r-2 border-[#2A2421] absolute top-2 right-2" />
                    <div className="w-4 h-4 border-b-2 border-l-2 border-[#2A2421] absolute bottom-2 left-2" />
                    <div className="w-4 h-4 border-b-2 border-r-2 border-[#2A2421] absolute bottom-2 right-2" />
                 </div>
                 <QRCode value={selectedTicket.verification_code} size={150} level="H" />
              </div>
              
              <h4 className="text-3xl tracking-[0.3em] font-light text-[#2A2421] mb-2">{selectedTicket.verification_code}</h4>
              <p className="text-[11px] text-[#8B8580] mb-6 font-medium tracking-[0.1em] uppercase">Table {selectedTicket.table_id} • {selectedTicket.duration} Hours</p>
              
              <div className="bg-[#F5F4F1] p-4 rounded-2xl w-full text-left mb-8 border border-[#D4C4B7]/40 ring-1 ring-white/50 shadow-inner">
                <p className="text-[10px] text-[#2A2421] tracking-[0.1em] uppercase leading-relaxed font-semibold mb-1">🎁 Benefit Spesial:</p>
                <p className="text-xs text-[#8B8580] leading-relaxed">Waktu bermain akan ditambah <strong className="text-[#8B7355]">+10 Menit</strong> otomatis seketika saat tiket ini di-scan oleh Admin di kasir depan.</p>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full py-4 bg-[#2A2421] text-[#D4C4B7] rounded-2xl text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[#1A1614] active:scale-95 transition-all outline-none shadow-lg premium-shadow"
              >
                Tutup QR Code
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
