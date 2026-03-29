"use client";

import { useState, useEffect } from "react";
import { useZxing } from "react-zxing";
import { QrCode, UserCircle, LogOut, CheckCircle2 } from "lucide-react";
import { useModal } from "../../components/ModalProvider";

const ZxingScanner = ({ onResult }: { onResult: (text: string) => void }) => {
  const { ref } = useZxing({
    onResult(result) {
      onResult(result.getText());
    },
  });

  return (
    <div className="w-full aspect-square bg-[#1A1614] rounded-3xl overflow-hidden mb-4 relative shadow-inner flex items-center justify-center">
       <div className="absolute inset-12 z-20 pointer-events-none shadow-[0_0_0_9999px_rgba(26,22,20,0.6)] rounded-[1rem]">
           <div className="w-6 h-6 border-t-[3px] border-l-[3px] border-[#D4C4B7] absolute top-0 left-0 rounded-tl-xl" />
           <div className="w-6 h-6 border-t-[3px] border-r-[3px] border-[#D4C4B7] absolute top-0 right-0 rounded-tr-xl" />
           <div className="w-6 h-6 border-b-[3px] border-l-[3px] border-[#D4C4B7] absolute bottom-0 left-0 rounded-bl-xl" />
           <div className="w-6 h-6 border-b-[3px] border-r-[3px] border-[#D4C4B7] absolute bottom-0 right-0 rounded-br-xl" />
       </div>
       <video ref={ref} className="w-full h-full object-cover z-10" />
    </div>
  );
};

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [stats, setStats] = useState({ revenue: 0, verified_bookings: 0 });
  const [events, setEvents] = useState<any[]>([]);
  
  // Event Add Modal State
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '', image_url: '', content_html: '', cta_text: '', cta_link: '' });
  
  // Event Delete State
  const [eventToDelete, setEventToDelete] = useState<number | null>(null);
  
  const { showModal } = useModal();
  
  useEffect(() => {
    const token = localStorage.getItem("billiard_admin");
    if (token) {
      setAdminToken(token);
      fetchDashboardData(token);
    }
  }, []);

  const fetchDashboardData = async (token: string) => {
    try {
      const statsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/admin/stats`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (statsRes.ok) setStats(await statsRes.json());
      
      const evtRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/events`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (evtRes.ok) setEvents(await evtRes.json());
    } catch(e) {
      console.log(e);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
         setAdminToken(data.token);
         localStorage.setItem("billiard_admin", data.token);
         fetchDashboardData(data.token);
      } else {
         showModal({ title: "Login Failed", message: data.detail || "Kredensial salah", type: "error" });
      }
    } catch(e) {
      showModal({ title: "Error", message: "Gagal menyambung ke server utama.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken("");
    localStorage.removeItem("billiard_admin");
  };

  const handleVerify = async (ticketCode: string) => {
    if (!ticketCode) return;
    setLoading(true);
    setShowScanner(false); // Turn off camera during API call
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/admin/verify-ticket?verification_code=${encodeURIComponent(ticketCode)}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${adminToken}` }
      });
      const data = await res.json();
      
      if (!res.ok) {
         showModal({ title: "Verification Failed", message: data.detail || "Tiket tidak valid", type: "error" });
      } else {
         showModal({ title: "Ticket Verified!", message: data.message || "Timer Meja mulai berjalan!", type: "success" });
         setCode(""); // clear input box
         fetchDashboardData(adminToken); // refresh stats
      }
    } catch(e) {
       showModal({ title: "Connection Error", message: "Gagal menyambung ke server utama.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEventSubmit = async () => {
      if (!newEvent.title || !newEvent.date) {
         showModal({ title: "Incomplete", message: "Title and Date are required", type: "error" });
         return;
      }
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/admin/events`, {
         method: "POST",
         headers: { 
            "Authorization": `Bearer ${adminToken}`,
            "Content-Type": "application/json"
         },
         body: JSON.stringify({ 
            title: newEvent.title, 
            date: newEvent.date, 
            description: newEvent.description, 
            image_url: newEvent.image_url || "none",
            content_html: newEvent.content_html,
            cta_text: newEvent.cta_text,
            cta_link: newEvent.cta_link
         })
      });
      if (res.ok) {
         fetchDashboardData(adminToken);
         setShowAddEvent(false);
         setNewEvent({ title: '', date: '', description: '', image_url: '', content_html: '', cta_text: '', cta_link: '' });
         showModal({ title: "Success", message: "Event published!", type: "success" });
      }
      setLoading(false);
  };

  const executeDelete = async () => {
      if (!eventToDelete) return;
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/admin/events/${eventToDelete}`, {
         method: "DELETE",
         headers: { "Authorization": `Bearer ${adminToken}` }
      });
      if (res.ok) {
          fetchDashboardData(adminToken);
          showModal({ title: "Deleted", message: "Event removed permanently.", type: "success" });
      }
      setEventToDelete(null);
      setLoading(false);
  };

  if (!adminToken) {
     return (
       <div className="min-h-screen bg-[#F5F4F1] flex items-center justify-center p-6 font-sans">
          <div className="bg-white p-8 rounded-[2rem] premium-shadow w-full max-w-sm text-center">
             <div className="w-16 h-16 bg-[#2A2421] text-[#D4C4B7] mx-auto rounded-full flex items-center justify-center mb-6">
                <UserCircle size={32} />
             </div>
             <h2 className="text-2xl font-light text-[#2A2421] mb-2 tracking-tight">Masuk Admin</h2>
             <p className="text-xs text-[#8B8580] mb-8 uppercase tracking-[0.2em]">Khusus Personel Resmi</p>
             
             <div className="space-y-4 mb-8 text-left">
                <div className="bg-[#F5F4F1] p-1.5 rounded-2xl border border-[#D4C4B7]/40">
                   <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-transparent px-4 py-2 outline-none text-sm text-[#2A2421]" />
                </div>
                <div className="bg-[#F5F4F1] p-1.5 rounded-2xl border border-[#D4C4B7]/40">
                   <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-transparent px-4 py-2 outline-none text-sm text-[#2A2421]" />
                </div>
             </div>

             <button onClick={handleLogin} disabled={loading} className="w-full bg-[#2A2421] text-white py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] font-medium hover:bg-[#1A1614] active:scale-95 transition-all outline-none">
                {loading ? "Membuka Akses..." : "Kontrol Akses"}
             </button>
          </div>
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-[#F5F4F1] flex flex-col font-sans">
       {/* Admin Header */}
       <header className="bg-white px-6 py-5 border-b border-[#D4C4B7] flex justify-between items-center shadow-sm">
         <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-[#2A2421] rounded-full flex items-center justify-center text-[#D4C4B7]">
                <UserCircle size={24} />
             </div>
             <div>
                 <h1 className="text-xl font-light tracking-tight text-[#2A2421]">Panel Admin</h1>
                 <p className="text-[10px] tracking-widest text-[#8B8580] uppercase -mt-0.5">Pusat Komando</p>
              </div>
          </div>
          <button onClick={handleLogout} className="w-10 h-10 border border-[#D4C4B7] text-[#8B7355] rounded-full flex items-center justify-center hover:bg-[#F5F4F1] transition-colors">
              <LogOut size={16} />
          </button>
        </header>

       <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
          {/* Main Grid PC vs Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             
             {/* Box 1: Scanner & Input Verification */}
             <div className="bg-white rounded-[2rem] p-8 premium-shadow premium-border relative overflow-hidden h-fit">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4C4B7]/20 -mr-10 -mt-10 rounded-full blur-xl" />
                <h2 className="text-2xl font-light text-[#2A2421] mb-2 relative z-10">Log Verifikasi</h2>
                <p className="text-xs text-[#8B8580] mb-8 font-light relative z-10 leading-relaxed max-w-xs">
                   Input manual atau scan QR dari layar pelanggan untuk memulai timer meja +10 Menit.
                </p>

                {/* Input Manual */}
                <div className="flex bg-[#F5F4F1] p-1.5 rounded-2xl mb-6 relative z-10 border border-[#D4C4B7]/40">
                  <input 
                     type="text" 
                     placeholder="MC-..." 
                     value={code}
                     onChange={(e) => setCode(e.target.value.toUpperCase())}
                     className="bg-transparent flex-1 px-4 outline-none text-[#2A2421] font-medium tracking-wider w-full"
                  />
                  <button 
                     disabled={loading || !code}
                     onClick={() => handleVerify(code)}
                     className="bg-[#2A2421] text-white px-6 py-3 rounded-xl hover:bg-[#1A1614] active:scale-95 transition-all outline-none font-medium tracking-wide disabled:opacity-50 text-xs"
                  >
                     {loading ? 'Tunggu..' : 'Verifikasi'}
                  </button>
                </div>

                <div className="flex items-center gap-4 my-6">
                   <div className="h-px bg-[#D4C4B7]/40 flex-1" />
                   <span className="text-[10px] text-[#8B8580] uppercase tracking-widest">atau pindai qr</span>
                   <div className="h-px bg-[#D4C4B7]/40 flex-1" />
                </div>

                {/* Switch Scanner Button */}
                {!showScanner ? (
                   <button 
                     onClick={() => setShowScanner(true)}
                     className="w-full bg-white border border-[#2A2421] text-[#2A2421] py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-[#F5F4F1] transition-all font-medium tracking-wider text-sm"
                   >
                     <QrCode size={18} /> BUKA KAMERA
                   </button>
                ) : (
                   <div className="w-full flex flex-col items-center">
                      <ZxingScanner onResult={(text) => handleVerify(text)} />
                      <button 
                        onClick={() => setShowScanner(false)}
                        className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#8B8580] hover:text-[#2A2421] transition-colors py-2"
                      >
                         Tutup Kamera
                      </button>
                   </div>
                )}
             </div>

             {/* Box 2: Events & Metrics Summary */}
             <div className="space-y-6">
                 {/* Total Revenue Today */}
                 <div className="bg-[#2A2421] rounded-[2rem] p-8 premium-shadow text-white relative overflow-hidden">
                    <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-[#8B7355]/30 rounded-full blur-3xl block" />
                    <span className="text-[10px] font-medium text-[#D4C4B7] uppercase tracking-[0.2em] block mb-4">Total Pendapatan Operasional</span>
                    <h3 className="text-4xl font-light tracking-tight mb-2">Rp {stats.revenue.toLocaleString('id-ID')}</h3>
                    <p className="text-xs font-light text-[#D4C4B7]/80">+{stats.verified_bookings} Transaksi Pesanan Terverifikasi</p>
                 </div>

                 {/* Future Event CRUD */}
                 <div className="bg-white rounded-[2rem] p-8 premium-shadow premium-border">
                    <div className="flex justify-between items-center mb-6">
                       <h2 className="text-xl font-light text-[#2A2421]">Acara Mendatang</h2>
                       <button onClick={() => setShowAddEvent(true)} className="text-[9px] text-[#8B7355] border border-[#8B7355] px-3 py-2 rounded-xl hover:bg-[#8B7355] hover:text-white transition-colors uppercase tracking-[0.2em] font-medium">
                          + Tambah
                       </button>
                    </div>
                    <div className="space-y-3">
                       {events.map(event => (
                          <div key={event.id} className="flex justify-between items-center bg-[#F5F4F1] p-4 rounded-2xl border border-[#D4C4B7]/40 ring-1 ring-transparent hover:ring-[#8B7355]/30 transition-all">
                             <div>
                                <h4 className="font-medium text-[#2A2421] text-sm tracking-tight">{event.title}</h4>
                                <p className="text-[9px] text-[#8B8580] mt-1 tracking-[0.2em] uppercase">{event.date}</p>
                             </div>
                             <div className="flex gap-2">
                               <button onClick={() => setEventToDelete(event.id)} className="text-[10px] uppercase tracking-widest text-red-500 hover:text-red-700 font-medium bg-red-50 px-2 py-1 rounded">Del</button>
                             </div>
                          </div>
                       ))}
                       {events.length === 0 && <p className="text-xs text-[#8B8580] text-center italic">Tidak ada acara mendatang</p>}
                    </div>
                 </div>
              </div>
          </div>
       </main>

       {/* Add Event Modal */}
       {showAddEvent && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2A2421]/60 backdrop-blur-sm">
            <div className="bg-[#FCFBFA] rounded-[2rem] p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto premium-shadow border border-[#D4C4B7]/40">
               <h3 className="text-xl font-light text-[#2A2421] mb-6">Buat Acara Baru</h3>
               <div className="space-y-4 text-left">
                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-1 block">Judul</label>
                    <input type="text" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} className="w-full bg-white border border-[#D4C4B7]/40 px-4 py-3 rounded-xl outline-none text-sm" placeholder="Contoh: Turnamen Pro" />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-1 block">Tanggal & Waktu</label>
                    <input type="text" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full bg-white border border-[#D4C4B7]/40 px-4 py-3 rounded-xl outline-none text-sm" placeholder="Contoh: Jumat, 15 April - 19:00" />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-1 block">Ringkasan Singkat (Untuk Kartu)</label>
                    <textarea value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="w-full bg-white border border-[#D4C4B7]/40 px-4 py-3 rounded-xl outline-none text-sm h-16 resize-none" placeholder="Pengantar singkat..." />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-1 block">URL Gambar Utama (Opsional)</label>
                    <input type="text" value={newEvent.image_url} onChange={e => setNewEvent({...newEvent, image_url: e.target.value})} className="w-full bg-white border border-[#D4C4B7]/40 px-4 py-3 rounded-xl outline-none text-sm" placeholder="https://..." />
                 </div>
                 <div>
                    <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-1 block">Konten Lengkap (HTML Diizinkan)</label>
                    <div className="bg-white border border-[#D4C4B7]/40 rounded-xl overflow-hidden">
                       <div className="bg-[#F5F4F1] p-2 border-b border-[#D4C4B7]/40 flex gap-2">
                          <button onClick={() => setNewEvent({...newEvent, content_html: newEvent.content_html + '<b>Tebal</b>'})} className="px-2 py-1 text-xs font-bold text-[#2A2421] hover:bg-[#D4C4B7]/20 rounded">B</button>
                          <button onClick={() => setNewEvent({...newEvent, content_html: newEvent.content_html + '<i>Miring</i>'})} className="px-2 py-1 text-xs italic text-[#2A2421] hover:bg-[#D4C4B7]/20 rounded">I</button>
                          <button onClick={() => setNewEvent({...newEvent, content_html: newEvent.content_html + '<h2 style="font-size:24px; color:#2A2421;">Judul</h2>'})} className="px-2 py-1 text-xs text-[#2A2421] hover:bg-[#D4C4B7]/20 rounded">Judul Besar</button>
                          <button onClick={() => setNewEvent({...newEvent, content_html: newEvent.content_html + '<br/>'})} className="px-2 py-1 text-xs text-[#2A2421] hover:bg-[#D4C4B7]/20 rounded">Enter (Brs)</button>
                       </div>
                       <textarea value={newEvent.content_html} onChange={e => setNewEvent({...newEvent, content_html: e.target.value})} className="w-full bg-transparent px-4 py-3 outline-none text-sm h-32 resize-none" placeholder="<p>Tulis rincian acara lengkap di sini...</p>" />
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-1 block">Teks Tombol Aksi</label>
                       <input type="text" value={newEvent.cta_text} onChange={e => setNewEvent({...newEvent, cta_text: e.target.value})} className="w-full bg-white border border-[#D4C4B7]/40 px-4 py-3 rounded-xl outline-none text-sm" placeholder="Daftar Sekarang" />
                    </div>
                    <div>
                       <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-1 block">Tautan Tombol Aksi</label>
                       <input type="text" value={newEvent.cta_link} onChange={e => setNewEvent({...newEvent, cta_link: e.target.value})} className="w-full bg-white border border-[#D4C4B7]/40 px-4 py-3 rounded-xl outline-none text-sm" placeholder="https://wa.me/..." />
                    </div>
                 </div>
               </div>
               
               <div className="flex justify-end gap-3 mt-8">
                  <button disabled={loading} onClick={() => setShowAddEvent(false)} className="px-6 py-3 text-sm text-[#8B8580] hover:text-[#2A2421]">Batal</button>
                  <button disabled={loading} onClick={handleAddEventSubmit} className="bg-[#2A2421] text-[#D4C4B7] px-8 py-3 rounded-xl text-xs uppercase tracking-[0.2em] font-medium hover:bg-[#1A1614] active:scale-95 transition-transform">{loading ? 'Menerbitkan...' : 'Terbitkan Acara'}</button>
               </div>
            </div>
         </div>
       )}

       {/* Delete Confirm Modal */}
       {eventToDelete !== null && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#2A2421]/60 backdrop-blur-sm">
            <div className="bg-[#FCFBFA] rounded-[2rem] p-8 w-full max-w-sm text-center premium-shadow border border-[#D4C4B7]/40">
               <h3 className="text-xl font-light text-[#2A2421] mb-2">Hapus Acara?</h3>
               <p className="text-xs text-[#8B8580] mb-8">Tindakan ini tidak dapat dibatalkan.</p>
               <div className="flex gap-4">
                  <button disabled={loading} onClick={() => setEventToDelete(null)} className="flex-1 bg-white border border-[#D4C4B7] text-[#2A2421] py-3 rounded-xl text-xs font-medium">Batal</button>
                  <button disabled={loading} onClick={executeDelete} className="flex-1 bg-red-500 text-white py-3 rounded-xl text-xs font-medium">{loading ? 'Menghapus...' : 'Konfirmasi'}</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
}
