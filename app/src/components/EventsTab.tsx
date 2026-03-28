"use client";

import { motion } from "framer-motion";

export default function EventsTab() {
  const events = [
    { id: 1, title: "Pro Cues Tournament", date: "April 15, 2026", time: "10:00 AM", type: "Championship" },
    { id: 2, title: "Friday Night Exhibition", date: "April 18, 2026", time: "07:00 PM", type: "Casual" },
    { id: 3, title: "VIP Meet & Greet", date: "April 25, 2026", time: "05:00 PM", type: "Exclusive" }
  ];

  return (
    <div className="space-y-12 pt-10 pb-24 mx-2">
      <div className="mb-8">
         <h2 className="text-3xl font-light text-[#2A2421] tracking-tight">Events</h2>
         <p className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] mt-2">Upcoming Tournaments</p>
      </div>
      
      <div className="space-y-6">
        {events.map((e, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={e.id}
            className="bg-white p-8 rounded-[1.5rem] premium-shadow premium-border relative overflow-hidden group cursor-pointer"
          >
             <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-[#8B7355]/10 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
             <div className="relative z-10 w-full">
                <span className="text-[10px] font-medium tracking-[0.2em] text-[#8B7355] uppercase block mb-3">{e.type}</span>
                <h3 className="text-xl font-light text-[#2A2421] mb-6">{e.title}</h3>
                <div className="flex justify-between items-center border-t border-[#D4C4B7]/30 pt-4">
                  <span className="text-[10px] text-[#8B8580] uppercase tracking-widest">{e.date}</span>
                  <span className="text-[10px] font-medium text-[#2A2421] uppercase tracking-widest">{e.time}</span>
                </div>
             </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
