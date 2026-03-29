"use client";

import { Award, CalendarClock, ChevronLeft, History, LogOut, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { useModal } from "./ModalProvider";

export default function ProfileTab({ userId, onLogout }: { userId: number, onLogout: () => void }) {
  const [user, setUser] = useState<any>(null);

  // Settings Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const { showModal } = useModal();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = () => {
    const userStr = localStorage.getItem("billiard_user");
    const token = userStr ? JSON.parse(userStr).token : "";

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/user/${userId}`, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(async r => {
        if (!r.ok) {
          console.error(await r.json());
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (data) {
          setUser(data);
          setName(data.name || "");
          setPhone(data.phone || "");
          setAddress(data.address || "");

            // Keep localstorage synced
            const lsStr = localStorage.getItem("billiard_user");
            if (lsStr) {
              const lsUser = JSON.parse(lsStr);
              lsUser.name = data.name;
              localStorage.setItem("billiard_user", JSON.stringify(lsUser));
              window.dispatchEvent(new Event("userUpdated"));
            }
        }
      })
      .catch(e => console.log("Fetch user error:", e));
  };

  const handleUpdate = async () => {
    setLoading(true);
    const userStr = localStorage.getItem("billiard_user");
    const token = userStr ? JSON.parse(userStr).token : "";

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/user/${userId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, phone, address })
      });

      const data = await res.json();
      if (res.ok) {
        showModal({ title: "Berhasil", message: data.message || "Profil berhasil diperbarui", type: "success" });
        fetchUserData(); // Refresh local states API
        setShowSettings(false); // Balik ke profil kalo sukses
      } else {
        showModal({ title: "Gagal", message: data.detail || "Terjadi kesalahan", type: "error" });
      }
    } catch (e) {
      showModal({ title: "Kesalahan", message: "Gagal menghubungi server utama", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (showSettings) {
    return (
      <div className="space-y-6 pt-10 pb-24 px-4 w-full max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-white border border-[#D4C4B7] rounded-full flex items-center justify-center text-[#2A2421] hover:bg-[#F5F4F1] transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-light text-[#2A2421] tracking-tight">Pengaturan Profil</h2>
            <p className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] mt-1">Lengkapi Data Anda</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] premium-border premium-shadow space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-2 block font-medium">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Nama Anda"
              className="w-full bg-[#F5F4F1] border border-transparent px-4 py-3.5 rounded-2xl outline-none text-sm font-medium text-[#2A2421] placeholder-[#D4C4B7] focus:border-[#8B7355]/40 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-2 block font-medium">Email Terdaftar</label>
            <input
              type="text"
              value={user?.email || ""}
              disabled
              className="w-full bg-[#EAE8E3] border border-transparent px-4 py-3.5 rounded-2xl outline-none text-sm font-medium text-[#8B8580] cursor-not-allowed"
            />
            <span className="text-[9px] text-[#8B7355] mt-1.5 block px-2 italic text-right">Hanya baca (Tertaut dengan Google)</span>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-2 block font-medium">Nomor Telepon</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="Contoh: 08123456789"
              className="w-full bg-[#F5F4F1] border border-transparent px-4 py-3.5 rounded-2xl outline-none text-sm font-medium text-[#2A2421] placeholder-[#D4C4B7] focus:border-[#8B7355]/40 transition-colors"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-[#8B8580] mb-2 block font-medium">Alamat (Opsional)</label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Masukan alamat lengkap jika ada..."
              className="w-full bg-[#F5F4F1] border border-transparent px-4 py-3.5 rounded-2xl outline-none text-sm font-medium text-[#2A2421] placeholder-[#D4C4B7] focus:border-[#8B7355]/40 transition-colors h-28 resize-none"
            />
          </div>
        </div>

        <button
          onClick={handleUpdate}
          disabled={loading || !name}
          className="w-full bg-[#2A2421] text-white py-4.5 rounded-[1.5rem] flex items-center justify-center gap-3 disabled:opacity-50 text-[10px] font-medium uppercase tracking-[0.2em] premium-shadow hover:bg-[#1A1614] active:scale-95 transition-all outline-none mt-2"
        >
          <Save size={16} /> {loading ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    );
  }

  // Derived metrics
  const totalSpent = user?.total_spent || 0;
  const historyLen = user?.history?.length || 0;

  return (
    <div className="space-y-8 pt-8 pb-24 px-4 w-full max-w-sm mx-auto">

      {/* Profile Info - DiceBear */}
      <div className="text-center space-y-5 bg-white p-6 pb-8 rounded-[2rem] premium-shadow border border-[#D4C4B7]/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B7355]/10 rounded-bl-full -z-0" />

        <div className="flex justify-end relative z-10 w-full mb-[-2rem]">
          <button onClick={() => setShowSettings(true)} className="w-10 h-10 bg-[#F5F4F1] text-[#2A2421] rounded-full flex items-center justify-center hover:bg-[#EAE8E3] transition-colors border border-[#D4C4B7]/50 shadow-sm z-20">
            <Settings size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-[#F5F4F1] to-[#EAE8E3] border-4 border-white flex items-end justify-center overflow-hidden relative premium-shadow z-10">
          {user?.name ? (
            <img
              src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(user.email || user.name || "Maincue")}&backgroundColor=transparent`}
              alt="Avatar"
              className="w-full h-full object-cover translate-y-2 scale-110"
            />
          ) : (
            <span className="text-3xl font-light tracking-tight text-[#2A2421] my-auto">?</span>
          )}
        </div>

        <div className="relative z-10 pt-2">
          <h2 className="text-2xl font-medium text-[#2A2421] tracking-tight">{user?.name ? user.name : 'Tidak Terotentikasi'}</h2>
          <p className="text-[9px] uppercase tracking-[0.2em] font-medium text-[#8B8580] mt-2">
            Anggota <span className="mx-1">•</span> Via Google
          </p>
        </div>

        <div className="pt-2">
          <div className="bg-[#2A2421] p-0.5 rounded-full inline-flex mx-auto items-center">
            <span className="text-[10px] text-[#D4C4B7] font-medium tracking-wide uppercase px-4 py-1.5"><Award size={12} className="inline mr-1 -mt-0.5" /> Premium Member</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[1.5rem] premium-shadow border border-[#D4C4B7]/30 text-center">
          <span className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] block mb-1">Reservasi</span>
          <span className="text-2xl font-light text-[#2A2421]">{historyLen} <span className="text-sm">Kali</span></span>
        </div>
        <div className="bg-white p-5 rounded-[1.5rem] premium-shadow border border-[#D4C4B7]/30 text-center">
          <span className="text-[10px] text-[#8B8580] uppercase tracking-[0.2em] block mb-1">Total</span>
          <span className="text-lg font-medium text-[#8B7355] mt-1 block">
            {totalSpent > 0 ? `Rp ${(totalSpent / 1000).toLocaleString('id-ID')}k` : 'Rp 0'}
          </span>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white rounded-[2rem] p-6 premium-shadow border border-[#D4C4B7]/30">
        <div className="flex items-center gap-2 mb-6">
          <History size={18} className="text-[#8B7355]" />
          <h3 className="text-lg font-light text-[#2A2421]">Riwayat Pesanan</h3>
        </div>

        <div className="space-y-4">
          {(!user?.history || user.history.length === 0) ? (
            <div className="text-center py-6">
              <CalendarClock className="mx-auto text-[#D4C4B7] mb-3 opacity-50" size={32} />
              <p className="text-xs text-[#8B8580] italic">Belum ada riwayat pesanan.</p>
            </div>
          ) : (
            user.history.map((h: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-[#F5F4F1] rounded-2xl border border-[#D4C4B7]/40 ring-1 ring-transparent hover:ring-[#8B7355]/30 transition-all">
                <div>
                  <span className="text-[10px] uppercase font-medium tracking-[0.2em] text-[#8B7355] block">Meja {h.table_id}</span>
                  <span className="text-sm text-[#2A2421] font-medium mt-1 block">{h.duration} Jam</span>
                  {h.is_verified ? (
                    <span className="text-[8px] bg-green-100 text-green-700 px-2 py-0.5 rounded uppercase tracking-wider font-bold mt-2 inline-block">Selesai</span>
                  ) : (
                    <span className="text-[8px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase tracking-wider font-bold mt-2 inline-block">Belum Verifikasi</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#2A2421]">Rp {h.cost.toLocaleString('id-ID')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="pt-2 flex justify-center">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 py-4 border border-[#2A2421] text-[#2A2421] hover:bg-[#2A2421] hover:text-white transition-colors duration-300 rounded-[1.5rem] uppercase tracking-[0.2em] text-[10px] font-medium group"
        >
          <LogOut size={16} className="text-[#2A2421] group-hover:text-white transition-colors" /> Keluar Akun
        </button>
      </div>

    </div>
  );
}
