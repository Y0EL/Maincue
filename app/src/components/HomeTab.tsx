"use client";

import { motion } from "framer-motion";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

export default function HomeTab({ userId, onGoBook }: { userId: number, onGoBook: () => void }) {
  const [user, setUser] = useState<any>(null);

  const fetchUser = () => {
    fetch(`http://localhost:8000/user/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        localStorage.setItem(`maincue_home_${userId}`, JSON.stringify(data));
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
        className="bg-[#2A2421] text-white p-8 relative overflow-hidden group cursor-pointer premium-shadow"
        style={{ borderRadius: "2rem" }}
        onClick={onGoBook}
      >
        <div className="absolute right-0 top-0 w-64 h-64 bg-gradient-to-br from-[#8B7355]/20 to-transparent opacity-50" />
        <div className="relative z-10">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#D4C4B7] mb-4 block">Reservation</span>
          <h2 className="text-3xl font-light leading-tight mb-8">Secure<br/>Your Table</h2>
          <div className="flex flex-row items-center gap-3 text-xs font-medium uppercase tracking-widest text-white border-b border-[#8B7355] pb-1 w-fit hover:border-white transition-colors">
            Book Now <ArrowRight size={14} />
          </div>
        </div>
      </motion.div>
      
      {/* Active Reservation */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-2">
          <h3 className="text-[10px] font-medium text-[#8B8580] uppercase tracking-[0.2em]">Active Session</h3>
          <button onClick={fetchUser} className="text-[#8B8580] hover:text-[#2A2421] transition-colors"><RefreshCw size={14} strokeWidth={1.5} /></button>
        </div>

        {user?.active_table_id ? (
           <div className="bg-white p-8 rounded-[2rem] premium-border premium-shadow">
              <div className="flex justify-between items-start mb-8">
                <div>
                   <span className="text-[10px] font-medium text-[#8B7355] uppercase tracking-[0.2em] mb-2 block">Table Status : Active</span>
                   <h4 className="text-4xl font-light text-[#2A2421]">No. {user.active_table_id}</h4>
                </div>
              </div>
              <div className="flex justify-between items-center border-t border-[#D4C4B7]/30 pt-4">
                <span className="text-[10px] uppercase tracking-widest text-[#8B8580]">Time Left</span>
                <span className="text-sm font-medium text-[#2A2421]">
                  Ends at {new Date(user.active_until).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false})}
                </span>
              </div>
           </div>
        ) : (
           <div className="bg-transparent border border-[#D4C4B7]/40 rounded-[2rem] p-10 text-center">
              <p className="text-sm font-light text-[#2A2421] mb-2">No active reservations.</p>
              <p className="text-[10px] uppercase tracking-[0.1em] text-[#8B8580]">Reserve a table to start</p>
           </div>
        )}
      </div>
    </div>
  );
}
