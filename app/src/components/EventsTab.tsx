"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X, ArrowRight } from "lucide-react";

export default function EventsTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/events`)
      .then(res => res.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load events", err);
        setLoading(false);
      });
  }, []);

  return (
    <>
    <div className="space-y-12 pt-10 pb-24 mx-2">
      <div className="mb-8">
         <h2 className="text-3xl font-light text-[#2A2421] tracking-tight">Acara</h2>
         <p className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] mt-2">Turnamen Mendatang</p>
      </div>
      
      <div className="space-y-6">
        {loading ? (
          <p className="text-xs text-[#8B8580] text-center italic mt-10">Memuat acara...</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-[#8B8580] text-center italic mt-10">Tidak ada acara mendatang saat ini.</p>
        ) : (
          events.map((e, idx) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={e.id}
              onClick={() => setSelectedEvent(e)}
              className="bg-white p-8 rounded-[1.5rem] premium-shadow premium-border relative overflow-hidden group cursor-pointer"
            >
               <div className="absolute right-0 top-0 w-32 h-32 bg-gradient-to-br from-[#8B7355]/10 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
               <div className="relative z-10 w-full">
                  <span className="text-[10px] font-medium tracking-[0.2em] text-[#8B7355] uppercase block mb-3">Acara Komunitas</span>
                  <h3 className="text-xl font-light text-[#2A2421] mb-2">{e.title}</h3>
                  <p className="text-xs font-light text-[#8B8580] mb-6 leading-relaxed line-clamp-2">{e.description}</p>
                  
                  <div className="flex justify-between items-center border-t border-[#D4C4B7]/30 pt-4">
                    <span className="text-[10px] text-[#2A2421] uppercase font-medium tracking-widest">{e.date}</span>
                  </div>
               </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
    
    {/* Full Screen Interactive Event View */}
    <AnimatePresence>
      {selectedEvent && (
        <motion.div 
          initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed inset-0 bg-[#FCFBFA] z-[100] flex flex-col overflow-y-auto"
        >
           {/* Cinematic Header Image */}
           <div className="relative w-full h-[40vh] bg-[#2A2421] min-h-[300px]">
              {selectedEvent.image_url && selectedEvent.image_url !== 'none' ? (
                <img src={selectedEvent.image_url} alt="Cover" className="w-full h-full object-cover opacity-80" />
              ) : (
                <div className="absolute inset-0 bg-[#2A2421] overflow-hidden">
                   {/* Abstract Artistic Mesh / Aurora */}
                   <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-[#8B7355] rounded-[100%] mix-blend-screen filter blur-[60px] opacity-50 animate-pulse" style={{ animationDuration: '7s' }} />
                   <div className="absolute top-[10%] -right-[20%] w-[60%] h-[80%] bg-[#D4C4B7] rounded-[100%] mix-blend-overlay filter blur-[80px] opacity-40 animate-pulse" style={{ animationDuration: '10s' }} />
                   <div className="absolute -bottom-[20%] left-[20%] w-[80%] h-[60%] bg-[#4A3B32] rounded-[100%] mix-blend-screen filter blur-[70px] opacity-60 animate-pulse" style={{ animationDuration: '8s' }} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#FCFBFA] via-transparent to-transparent opacity-100" />
              <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 w-10 h-10 bg-[#2A2421]/30 backdrop-blur-md text-white rounded-full flex items-center justify-center hover:bg-[#2A2421]/60 transition-colors z-20 shadow-lg">
                <X size={20} />
              </button>
           </div>
           
           {/* Rich Content Body */}
           <div className="px-8 pb-32 flex-1 relative z-20 -mt-10">
              <span className="text-[10px] font-medium tracking-[0.2em] text-[#8B7355] uppercase block mb-4">{selectedEvent.date}</span>
              <h2 className="text-4xl font-light text-[#2A2421] mb-8 tracking-tight leading-tight">{selectedEvent.title}</h2>
              
              {/* Output Native HTML / Markdown-like styling */}
              <div 
                className="w-full text-sm text-[#8B8580] leading-relaxed 
                           prose-p:mb-4 prose-strong:text-[#2A2421] prose-strong:font-bold 
                           prose-em:italic prose-h2:text-2xl prose-h2:font-light prose-h2:text-[#2A2421] prose-h2:mb-4 prose-h2:mt-8 
                           prose-a:text-[#8B7355] prose-a:underline"
                dangerouslySetInnerHTML={{ __html: selectedEvent.content_html || selectedEvent.description }} 
              />
           </div>
           
           {/* Optional Sticky Bottom Call-To-Action */}
           {selectedEvent.cta_text && selectedEvent.cta_link && (
              <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FCFBFA] via-[#FCFBFA] to-transparent z-30 pointer-events-none">
                 <a 
                   href={selectedEvent.cta_link.startsWith('http') ? selectedEvent.cta_link : `https://${selectedEvent.cta_link}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="w-full bg-[#2A2421] pointer-events-auto text-[#D4C4B7] shadow-2xl py-5 rounded-2xl flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] font-medium premium-shadow hover:bg-[#1A1614] active:scale-95 transition-all outline-none"
                 >
                   {selectedEvent.cta_text} <ArrowRight size={16} />
                 </a>
              </div>
           )}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
