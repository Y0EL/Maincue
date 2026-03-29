"use client";

import { useState, useEffect } from "react";
import { useZxing } from "react-zxing";
import {
  QrCode, LogOut, LayoutDashboard, TableProperties,
  History, CalendarDays, UserCircle, RefreshCw,
  TrendingUp, Users, Clock, CheckCircle2, XCircle
} from "lucide-react";
import { useModal } from "../../components/ModalProvider";
import { cn } from "../../components/Common";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── QR Scanner ───────────────────────────────────────────────────────────────
const ZxingScanner = ({ onResult }: { onResult: (text: string) => void }) => {
  const { ref } = useZxing({ onResult(r) { onResult(r.getText()); } });
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

// ─── PAGE: Dashboard (Revenue Breakdown) ──────────────────────────────────────
function PageDashboard({ stats, tableDetails, onRefresh }: { stats: any, tableDetails: any[], onRefresh: () => void }) {
  const totalRev = tableDetails.reduce((sum, t) => sum + (t.total_revenue || 0), 0);
  const maxRev = Math.max(...tableDetails.map(t => t.total_revenue || 0), 1);
  const chartH = 120;
  const barW = tableDetails.length > 0 ? Math.floor(280 / tableDetails.length) - 6 : 30;

  return (
    <div className="space-y-5">
      {/* Top Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#2A2421] rounded-2xl p-4 text-white relative overflow-hidden col-span-2">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#8B7355]/30 rounded-full blur-2xl" />
          <TrendingUp size={16} className="text-[#D4C4B7] mb-2" />
          <p className="text-[9px] text-[#D4C4B7]/70 uppercase tracking-widest mb-0.5">Total Pendapatan</p>
          <p className="text-2xl font-light">Rp {(stats.revenue || 0).toLocaleString('id-ID')}</p>
          <p className="text-[9px] text-[#D4C4B7]/60 mt-1">{stats.verified_bookings || 0} transaksi terverifikasi</p>
        </div>
        <div className="bg-white rounded-2xl p-4 premium-shadow border border-[#D4C4B7]/30">
          <Users size={16} className="text-[#8B7355] mb-2" />
          <p className="text-[9px] text-[#8B8580] uppercase tracking-widest mb-0.5">Meja Aktif</p>
          <p className="text-xl font-light text-[#2A2421]">{tableDetails.filter(t => t.status !== 'Available').length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 premium-shadow border border-[#D4C4B7]/30">
          <Clock size={16} className="text-[#8B7355] mb-2" />
          <p className="text-[9px] text-[#8B8580] uppercase tracking-widest mb-0.5">Total Waitlist</p>
          <p className="text-xl font-light text-[#2A2421]">{tableDetails.reduce((s, t) => s + (t.waitlist_count || 0), 0)}</p>
        </div>
      </div>

      {/* BAR CHART — Revenue Per Table */}
      <div className="bg-white rounded-2xl p-5 premium-shadow border border-[#D4C4B7]/30">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-base font-medium text-[#2A2421]">Grafik Pendapatan</h2>
            <p className="text-[10px] text-[#8B8580] uppercase tracking-widest mt-0.5">Per Meja — Akumulasi</p>
          </div>
          <button onClick={onRefresh} className="p-2 hover:bg-[#F5F4F1] rounded-xl transition-colors">
            <RefreshCw size={13} className="text-[#8B8580]" />
          </button>
        </div>

        {/* SVG Bar Chart */}
        <div className="overflow-x-auto">
          <svg width={Math.max(tableDetails.length * (barW + 6), 280)} height={chartH + 48} className="mx-auto">
            {/* Y-axis gridlines */}
            {[0.25, 0.5, 0.75, 1].map(pct => (
              <g key={pct}>
                <line
                  x1={0} y1={chartH - chartH * pct}
                  x2={Math.max(tableDetails.length * (barW + 6), 280)} y2={chartH - chartH * pct}
                  stroke="#F0EDE9" strokeWidth={1}
                />
                <text x={2} y={chartH - chartH * pct - 3} fontSize={8} fill="#B8B0AA">
                  {Math.round(maxRev * pct / 1000)}K
                </text>
              </g>
            ))}
            {/* Bars */}
            {tableDetails.map((t, i) => {
              const bh = maxRev > 0 ? Math.max(((t.total_revenue || 0) / maxRev) * chartH, 3) : 3;
              const x = i * (barW + 6) + 20;
              const y = chartH - bh;
              const isActive = t.status !== 'Available';
              return (
                <g key={t.id}>
                  {/* Bar background */}
                  <rect x={x} y={0} width={barW} height={chartH} rx={6} fill="#F5F4F1" />
                  {/* Bar fill */}
                  <rect x={x} y={y} width={barW} height={bh} rx={6}
                    fill={isActive ? '#2A2421' : (t.total_revenue > 0 ? '#8B7355' : '#E6E2DE')} />
                  {/* Label */}
                  <text x={x + barW / 2} y={chartH + 14} textAnchor="middle" fontSize={9} fill="#8B8580" fontWeight="600">
                    #{t.id}
                  </text>
                  <text x={x + barW / 2} y={chartH + 26} textAnchor="middle" fontSize={8} fill="#B8B0AA">
                    {(t.total_revenue || 0) >= 1000 ? `${Math.round((t.total_revenue || 0) / 1000)}K` : '0'}
                  </text>
                  {/* Active dot */}
                  {isActive && <circle cx={x + barW / 2} cy={y - 6} r={3} fill="#8B7355" />}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-[#2A2421]" />
            <span className="text-[9px] text-[#8B8580] uppercase tracking-wider">Sedang Aktif</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded bg-[#8B7355]" />
            <span className="text-[9px] text-[#8B8580] uppercase tracking-wider">Idle</span>
          </div>
        </div>

        {/* Total Footer */}
        <div className="mt-4 pt-3 border-t border-[#D4C4B7]/30 flex justify-between items-center">
          <span className="text-[10px] text-[#8B8580] uppercase tracking-widest font-medium">Total Akumulasi Semua Meja</span>
          <span className="text-sm font-bold text-[#2A2421]">Rp {totalRev.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* Per-table breakdown list */}
      <div className="bg-white rounded-2xl p-5 premium-shadow border border-[#D4C4B7]/30">
        <h3 className="text-sm font-medium text-[#2A2421] mb-4">Rincian Per Meja</h3>
        <div className="space-y-3">
          {[...tableDetails].sort((a, b) => (b.total_revenue || 0) - (a.total_revenue || 0)).map((t, i) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-[#8B8580] w-4">{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#2A2421]">Meja #{t.id}</span>
                    <span className="text-[9px] text-[#8B8580]">{t.type}</span>
                    {(t.waitlist_count || 0) > 0 && (
                      <span className="text-[8px] text-[#8B7355] font-bold">⏳{t.waitlist_count}</span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-[#2A2421]">Rp {(t.total_revenue || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="h-1.5 bg-[#F5F4F1] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${totalRev > 0 ? ((t.total_revenue || 0) / maxRev) * 100 : 0}%`, background: 'linear-gradient(to right, #8B7355, #2A2421)' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PAGE: Meja ───────────────────────────────────────────────────────────────
function PageMeja({ tableDetails, adminToken, onRefresh }: { tableDetails: any[], adminToken: string, onRefresh: () => void }) {
  const [endingTable, setEndingTable] = useState<number | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<number | null>(null);

  const handleEndTable = async (tableId: number) => {
    setConfirmEnd(null);
    setEndingTable(tableId);
    try {
      await fetch(`${API}/admin/end-table/${tableId}`, {
        method: "POST", headers: { "Authorization": `Bearer ${adminToken}` }
      });
      onRefresh();
    } finally { setEndingTable(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-light text-[#2A2421]">Status Meja</h2>
          <p className="text-[10px] text-[#8B8580] uppercase tracking-widest mt-0.5">Live — {tableDetails.filter(t => t.status !== 'Available').length} Aktif</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 text-[10px] text-[#8B8580] hover:text-[#2A2421] uppercase tracking-widest font-medium border border-[#D4C4B7] px-3 py-2 rounded-xl transition-colors">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {tableDetails.map(t => (
        <div key={t.id} className={cn(
          "rounded-2xl p-5 border",
          t.status === "Available" ? "bg-white border-[#D4C4B7]/30" : "bg-[#F5F4F1] border-[#D4C4B7]/50"
        )}>
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-[#8B7355] uppercase tracking-widest">Meja #{t.id}</span>
                <span className="text-[9px] text-[#8B8580] uppercase">{t.type}</span>
              </div>
              <p className={cn("text-sm font-medium",
                t.status === "Available" ? "text-green-600" :
                t.status === "Playing" ? "text-orange-600" : "text-blue-600"
              )}>
                {t.status === "Available" ? "Idle — Tersedia"
                  : t.status === "Playing" ? `Sedang Main — Sisa ${t.remaining}`
                  : "Reserved — Menunggu Scan"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[#8B8580] uppercase tracking-widest">Waitlist</p>
              <p className="text-xl font-light text-[#2A2421]">{t.waitlist_count || 0}</p>
            </div>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-[#D4C4B7]/30">
            <div>
              <p className="text-[9px] text-[#8B8580] uppercase tracking-widest">Pendapatan Meja</p>
              <p className="text-sm font-bold text-[#2A2421]">Rp {(t.total_revenue || 0).toLocaleString('id-ID')}</p>
            </div>
            {t.status !== "Available" && (
              confirmEnd === t.id ? (
                <div className="flex gap-2">
                  <button onClick={() => handleEndTable(t.id)} disabled={endingTable === t.id}
                    className="text-[8px] uppercase tracking-widest text-white bg-red-500 px-3 py-2 rounded-lg font-bold disabled:opacity-50">
                    {endingTable === t.id ? "..." : "Akhiri"}
                  </button>
                  <button onClick={() => setConfirmEnd(null)}
                    className="text-[8px] uppercase tracking-widest text-[#8B8580] bg-[#E6E2DE] px-3 py-2 rounded-lg font-bold">
                    Batal
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmEnd(t.id)}
                  className="text-[8px] uppercase tracking-widest text-orange-600 border border-orange-200 bg-orange-50 hover:bg-orange-100 px-3 py-2 rounded-lg font-bold transition-colors">
                  Akhiri Sesi
                </button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PAGE: Scan Verifikasi ─────────────────────────────────────────────────────
function PageScan({ adminToken, onSuccess }: { adminToken: string, onSuccess: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [result, setResult] = useState<{ ok: boolean, msg: string } | null>(null);
  const { showModal } = useModal();

  const handleVerify = async (ticketCode: string) => {
    if (!ticketCode) return;
    setLoading(true);
    setShowScanner(false);
    try {
      const res = await fetch(`${API}/admin/verify-ticket?verification_code=${encodeURIComponent(ticketCode)}`, {
        method: "POST", headers: { "Authorization": `Bearer ${adminToken}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, msg: data.detail || "Tiket tidak valid" });
      } else {
        setResult({ ok: true, msg: data.message || "Tiket terverifikasi! Timer dimulai." });
        setCode("");
        onSuccess();
      }
    } catch {
      setResult({ ok: false, msg: "Gagal terhubung ke server" });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-light text-[#2A2421]">Verifikasi Tiket</h2>
        <p className="text-[10px] text-[#8B8580] uppercase tracking-widest mt-0.5">Input kode atau scan QR pelanggan</p>
      </div>

      {result && (
        <div className={cn("flex items-center gap-3 p-4 rounded-2xl",
          result.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
        )}>
          {result.ok ? <CheckCircle2 size={18} className="text-green-600 flex-shrink-0" /> : <XCircle size={18} className="text-red-500 flex-shrink-0" />}
          <p className={cn("text-sm font-medium", result.ok ? "text-green-700" : "text-red-700")}>{result.msg}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 premium-shadow border border-[#D4C4B7]/30">
        <p className="text-[10px] text-[#8B8580] uppercase tracking-widest mb-3">Input Kode Manual</p>
        <div className="flex bg-[#F5F4F1] p-1.5 rounded-xl border border-[#D4C4B7]/40 gap-2">
          <input
            type="text" placeholder="MC-XXXX"
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setResult(null); }}
            onKeyDown={e => e.key === 'Enter' && handleVerify(code)}
            className="bg-transparent flex-1 px-3 py-2 outline-none text-[#2A2421] font-bold tracking-widest text-sm"
          />
          <button disabled={loading || !code} onClick={() => handleVerify(code)}
            className="bg-[#2A2421] text-white px-5 py-2.5 rounded-xl text-xs font-medium uppercase tracking-wider disabled:opacity-40 hover:bg-[#1A1614] active:scale-95 transition-all">
            {loading ? "..." : "Verifikasi"}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 premium-shadow border border-[#D4C4B7]/30">
        <p className="text-[10px] text-[#8B8580] uppercase tracking-widest mb-4">Scan QR Code</p>
        {!showScanner ? (
          <button onClick={() => setShowScanner(true)}
            className="w-full border-2 border-dashed border-[#D4C4B7] text-[#8B8580] py-8 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-[#8B7355] hover:text-[#8B7355] transition-colors">
            <QrCode size={28} />
            <span className="text-xs uppercase tracking-widest font-medium">Buka Kamera</span>
          </button>
        ) : (
          <div>
            <ZxingScanner onResult={text => { setResult(null); handleVerify(text); }} />
            <button onClick={() => setShowScanner(false)} className="w-full text-[10px] uppercase tracking-widest text-[#8B8580] py-2 hover:text-[#2A2421] transition-colors">
              Tutup Kamera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGE: Riwayat Pesanan ─────────────────────────────────────────────────────
function PageHistory({ bookingHistory }: { bookingHistory: any[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-light text-[#2A2421]">Riwayat Pesanan</h2>
        <p className="text-[10px] text-[#8B8580] uppercase tracking-widest mt-0.5">{bookingHistory.length} Transaksi Terakhir</p>
      </div>
      {bookingHistory.length === 0 && (
        <div className="text-center py-16 text-[#8B8580] text-sm">Belum ada transaksi</div>
      )}
      {bookingHistory.map(b => (
        <div key={b.id} className="bg-white rounded-2xl p-5 premium-shadow border border-[#D4C4B7]/30">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-[#8B7355] uppercase tracking-widest">Meja #{b.table_id}</span>
                <span className="text-[9px] text-[#8B8580]">— {b.duration} Jam</span>
                {b.players && <span className="text-[9px] text-[#8B8580]">· {b.players} Pemain</span>}
              </div>
              <p className="text-sm font-medium text-[#2A2421]">{b.user_name || "Pengguna"}</p>
              <p className="text-[10px] text-[#8B8580]">{b.user_email}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-[#2A2421]">Rp {(b.cost || 0).toLocaleString('id-ID')}</p>
              <span className={cn(
                "text-[8px] uppercase tracking-wider font-bold mt-1 px-2 py-0.5 rounded inline-block",
                b.is_verified ? "bg-green-100 text-green-700" : b.status === "PAID" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
              )}>
                {b.is_verified ? "✓ Terverifikasi" : b.status}
              </span>
            </div>
          </div>
          {b.verification_code && (
            <div className="pt-3 border-t border-[#D4C4B7]/30 flex justify-between items-center">
              <span className="text-[9px] text-[#8B8580]">Kode Tiket</span>
              <span className="text-[10px] font-bold text-[#2A2421] tracking-widest">{b.verification_code}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PAGE: Acara ───────────────────────────────────────────────────────────────
function PageAcara({ events, adminToken, onRefresh }: { events: any[], adminToken: string, onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '', image_url: '', cta_text: '', cta_link: '' });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleAdd = async () => {
    if (!newEvent.title || !newEvent.date) return;
    setLoading(true);
    await fetch(`${API}/admin/events`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${adminToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...newEvent, image_url: newEvent.image_url || "none" })
    });
    setLoading(false);
    setShowAdd(false);
    setNewEvent({ title: '', date: '', description: '', image_url: '', cta_text: '', cta_link: '' });
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API}/admin/events/${id}`, {
      method: "DELETE", headers: { "Authorization": `Bearer ${adminToken}` }
    });
    setDeleteId(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-light text-[#2A2421]">Acara</h2>
          <p className="text-[10px] text-[#8B8580] uppercase tracking-widest mt-0.5">{events.length} Acara Aktif</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="text-[9px] text-[#8B7355] border border-[#8B7355] px-4 py-2.5 rounded-xl hover:bg-[#8B7355] hover:text-white transition-colors uppercase tracking-widest font-bold">
          + Tambah
        </button>
      </div>

      {events.length === 0 && <div className="text-center py-16 text-[#8B8580] text-sm">Belum ada acara</div>}
      {events.map(ev => (
        <div key={ev.id} className="bg-white rounded-2xl p-5 premium-shadow border border-[#D4C4B7]/30 flex justify-between items-start">
          <div>
            <p className="font-medium text-[#2A2421] text-sm">{ev.title}</p>
            <p className="text-[10px] text-[#8B7355] uppercase tracking-widest mt-1 font-medium">{ev.date}</p>
            {ev.description && <p className="text-[11px] text-[#8B8580] mt-2 max-w-xs">{ev.description}</p>}
          </div>
          {deleteId === ev.id ? (
            <div className="flex gap-2 flex-shrink-0 ml-4">
              <button onClick={() => handleDelete(ev.id)} className="text-[8px] bg-red-500 text-white px-2.5 py-1.5 rounded-lg font-bold uppercase">Hapus</button>
              <button onClick={() => setDeleteId(null)} className="text-[8px] bg-[#F5F4F1] text-[#8B8580] px-2.5 py-1.5 rounded-lg font-bold uppercase">Batal</button>
            </div>
          ) : (
            <button onClick={() => setDeleteId(ev.id)} className="flex-shrink-0 ml-4 text-[9px] text-red-400 hover:text-red-600 font-bold uppercase tracking-widest">Del</button>
          )}
        </div>
      ))}

      {/* Add Event Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-[#2A2421]/50 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <h3 className="text-xl font-light text-[#2A2421] mb-6">Acara Baru</h3>
            <div className="space-y-4">
              {[
                { label: "Judul *", key: "title", placeholder: "Turnamen 8-Ball" },
                { label: "Tanggal & Waktu *", key: "date", placeholder: "Jumat, 15 April — 19:00" },
                { label: "Deskripsi", key: "description", placeholder: "Ringkasan singkat..." },
                { label: "URL Gambar (Opsional)", key: "image_url", placeholder: "https://..." },
                { label: "Teks Tombol CTA", key: "cta_text", placeholder: "Daftar Sekarang" },
                { label: "Link Tombol CTA", key: "cta_link", placeholder: "https://wa.me/..." },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[10px] uppercase tracking-widest text-[#8B8580] mb-1.5 block font-medium">{f.label}</label>
                  <input
                    type="text"
                    value={(newEvent as any)[f.key]}
                    onChange={e => setNewEvent({ ...newEvent, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full bg-[#F5F4F1] border border-[#D4C4B7]/40 px-4 py-3 rounded-xl outline-none text-sm"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-3.5 border border-[#D4C4B7] text-[#8B8580] rounded-xl text-xs font-medium">Batal</button>
              <button onClick={handleAdd} disabled={loading} className="flex-1 py-3.5 bg-[#2A2421] text-white rounded-xl text-xs font-medium uppercase tracking-widest disabled:opacity-50">
                {loading ? "Menerbitkan..." : "Terbitkan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN AdminPage ────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "meja", label: "Meja", icon: TableProperties },
  { id: "scan", label: "Scan", icon: QrCode },
  { id: "history", label: "Pesanan", icon: History },
  { id: "acara", label: "Acara", icon: CalendarDays },
];

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const [stats, setStats] = useState({ revenue: 0, verified_bookings: 0 });
  const [tableDetails, setTableDetails] = useState<any[]>([]);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const { showModal } = useModal();

  useEffect(() => {
    const tok = localStorage.getItem("billiard_admin");
    if (tok) { setAdminToken(tok); fetchAll(tok); }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!adminToken) return;
    const iv = setInterval(() => fetchAll(adminToken), 30000);
    return () => clearInterval(iv);
  }, [adminToken]);

  const fetchAll = async (tok: string) => {
    try {
      const [statsRes, tblRes, bkRes, evtRes] = await Promise.all([
        fetch(`${API}/admin/stats`, { headers: { "Authorization": `Bearer ${tok}` } }),
        fetch(`${API}/tables`, { headers: { "Authorization": `Bearer ${tok}` } }),
        fetch(`${API}/admin/bookings`, { headers: { "Authorization": `Bearer ${tok}` } }),
        fetch(`${API}/events`, { headers: { "Authorization": `Bearer ${tok}` } }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (tblRes.ok) setTableDetails(await tblRes.json());
      if (bkRes.ok) setBookingHistory(await bkRes.json());
      if (evtRes.ok) setEvents(await evtRes.json());
    } catch { }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        setAdminToken(data.token);
        localStorage.setItem("billiard_admin", data.token);
        fetchAll(data.token);
      } else {
        showModal({ title: "Login Gagal", message: data.detail || "Kredensial salah", type: "error" });
      }
    } catch {
      showModal({ title: "Error", message: "Gagal terhubung ke server.", type: "error" });
    } finally { setLoading(false); }
  };

  // ─── LOGIN PAGE ──────────────────────────────────────────────────────────────
  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#F5F4F1] flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-[2rem] premium-shadow w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-[#2A2421] text-[#D4C4B7] mx-auto rounded-full flex items-center justify-center mb-6">
            <UserCircle size={32} />
          </div>
          <h2 className="text-2xl font-light text-[#2A2421] mb-1 tracking-tight">Panel Admin</h2>
          <p className="text-[10px] text-[#8B8580] mb-8 uppercase tracking-[0.2em]">Khusus Personel Resmi</p>
          <div className="space-y-3 mb-8 text-left">
            <div className="bg-[#F5F4F1] p-1.5 rounded-2xl border border-[#D4C4B7]/40">
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full bg-transparent px-4 py-2 outline-none text-sm text-[#2A2421]" />
            </div>
            <div className="bg-[#F5F4F1] p-1.5 rounded-2xl border border-[#D4C4B7]/40">
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className="w-full bg-transparent px-4 py-2 outline-none text-sm text-[#2A2421]" />
            </div>
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full bg-[#2A2421] text-white py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] font-medium hover:bg-[#1A1614] active:scale-95 transition-all disabled:opacity-50">
            {loading ? "Membuka Akses..." : "Masuk"}
          </button>
        </div>
      </div>
    );
  }

  // ─── DASHBOARD LAYOUT ────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (activeTab) {
      case "dashboard": return <PageDashboard stats={stats} tableDetails={tableDetails} onRefresh={() => fetchAll(adminToken)} />;
      case "meja": return <PageMeja tableDetails={tableDetails} adminToken={adminToken} onRefresh={() => fetchAll(adminToken)} />;
      case "scan": return <PageScan adminToken={adminToken} onSuccess={() => fetchAll(adminToken)} />;
      case "history": return <PageHistory bookingHistory={bookingHistory} />;
      case "acara": return <PageAcara events={events} adminToken={adminToken} onRefresh={() => fetchAll(adminToken)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F4F1] font-sans">

      {/* ── DESKTOP LAYOUT: Sidebar + Content ─────────────────────────── */}
      <div className="hidden md:flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-60 bg-[#2A2421] flex flex-col fixed top-0 left-0 h-screen z-40">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-lg font-light text-white tracking-tight">Panel Admin</h1>
            <p className="text-[9px] text-[#D4C4B7]/60 uppercase tracking-widest mt-0.5">Pusat Komando</p>
          </div>
          <nav className="flex-1 p-4 space-y-1">
            {NAV.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm transition-all",
                  activeTab === item.id
                    ? "bg-white/15 text-white font-medium"
                    : "text-[#D4C4B7]/60 hover:bg-white/8 hover:text-[#D4C4B7]"
                )}>
                <item.icon size={16} />
                {item.label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-white/10">
            <div className="bg-white/10 rounded-xl p-3 mb-3">
              <p className="text-[9px] text-[#D4C4B7]/60 uppercase tracking-widest mb-1">Total Pendapatan</p>
              <p className="text-sm font-light text-white">Rp {(stats.revenue || 0).toLocaleString('id-ID')}</p>
            </div>
            <button onClick={() => { setAdminToken(""); localStorage.removeItem("billiard_admin"); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[#D4C4B7]/60 hover:text-white text-sm transition-colors">
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </aside>

        {/* Desktop Content */}
        <main className="ml-60 flex-1 p-8 max-w-3xl">
          <div className="mb-8">
            <h2 className="text-3xl font-light text-[#2A2421] capitalize">{NAV.find(n => n.id === activeTab)?.label}</h2>
          </div>
          {renderPage()}
        </main>
      </div>

      {/* ── MOBILE LAYOUT: Header + Content + Bottom Nav ──────────────── */}
      <div className="md:hidden flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white px-6 py-5 border-b border-[#D4C4B7] flex flex-shrink-0 justify-between items-center z-30">
          <div>
            <h1 className="text-base font-medium text-[#2A2421]">{NAV.find(n => n.id === activeTab)?.label || "Panel Admin"}</h1>
            <p className="text-[9px] text-[#8B8580] uppercase tracking-widest font-bold mt-0.5">Pusat Komando</p>
          </div>
          <button onClick={() => { setAdminToken(""); localStorage.removeItem("billiard_admin"); }}
            className="w-10 h-10 bg-[#F5F4F1] border border-[#D4C4B7] text-[#8B7355] rounded-full flex items-center justify-center active:scale-90 transition-transform">
            <LogOut size={16} />
          </button>
        </header>

        {/* Mobile Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-hide p-5 pb-24">
          {renderPage()}
        </main>

        {/* Mobile Bottom Navigation (Matching Home screen style) */}
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-[#D4C4B7]/40 z-30 flex items-center justify-around px-2 pb-2">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 transition-all",
                activeTab === item.id ? "text-[#2A2421]" : "text-[#B8B0AA]"
              )}>
              <div className={cn(
                "p-2 rounded-xl transition-all",
                activeTab === item.id ? "bg-[#2A2421]/5" : ""
              )}>
                <item.icon size={18} strokeWidth={activeTab === item.id ? 2 : 1.5} />
              </div>
              <span className="text-[8px] uppercase tracking-[0.1em] font-bold">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

    </div>
  );
}
