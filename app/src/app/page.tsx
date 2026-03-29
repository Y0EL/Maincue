"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Grid, Home, Loader2, Plus, User, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useModal } from "../components/ModalProvider";

// Components
import BookingsTab from "../components/BookingsTab";
import { NavItem } from "../components/Common";
import HomeTab from "../components/HomeTab";
import ProfileTab from "../components/ProfileTab";
import TablesTab from "../components/TablesTab";
import EventsTab from "../components/EventsTab";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function App() {
  const [activeTab, setActiveTab] = useState<"home" | "tables" | "bookings" | "profile" | "events">("home");
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { showModal } = useModal();

  useEffect(() => {
    setMounted(true);
    const loadUser = () => {
      const saved = localStorage.getItem("billiard_user");
      if (saved) setCurrentUser(JSON.parse(saved));
    };
    loadUser();
    window.addEventListener("userUpdated", loadUser);
    return () => window.removeEventListener("userUpdated", loadUser);
  }, []);

  const [loginLoading, setLoginLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();
      
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          token: idToken,
          name: firebaseUser.displayName || "User",
          email: firebaseUser.email || ""
        })
      });
      if (!res.ok) throw new Error("Gagal login backend");
      const user = await res.json();
      setCurrentUser(user);
      localStorage.setItem("billiard_user", JSON.stringify(user));
    } catch (err) {
      console.error(err);
      showModal({
        title: "Akses Ditolak",
        message: "Gagal masuk atau tidak dapat terhubung ke server utama.",
        type: "error"
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch(e) { console.error(e); }
    localStorage.removeItem("billiard_user");
    setCurrentUser(null);
  };

  if (!mounted) return null;

  if (!currentUser) {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-[#FCFBFA] font-sans items-center justify-center p-8 relative overflow-hidden">
        
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="w-full text-center relative z-10 w-full max-w-xs">
          
          <div className="mb-12">
            <h1 className="text-4xl font-light text-[#2A2421] tracking-tight holographic-text mb-2">
              maincue.id
            </h1>
            <p className="text-xs tracking-[0.2em] uppercase font-medium text-[#8B8580]">
              Eksklusif Lounge
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loginLoading}
              className="mt-8 w-full h-14 bg-[#2A2421] text-white font-medium tracking-[0.1em] text-xs flex items-center justify-center gap-3 disabled:opacity-50 transition-colors uppercase hover:bg-[#1C1816]"
            >
              {loginLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <>Masuk dengan Google <ArrowRight size={14} /></>}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#FCFBFA] font-sans">

      {/* ── Header ── */}
      <header className="px-8 pt-12 pb-4 flex justify-between items-end animate-slide-up">
        <div>
          <h1 className="text-2xl font-light text-[#2A2421] tracking-tight holographic-text">
            maincue.id
          </h1>
        </div>
        <button onClick={() => setActiveTab("profile")} className="text-[#8B8580] hover:text-[#2A2421] transition-colors">
          <span className="text-xs font-medium tracking-widest uppercase">{currentUser.name}</span>
        </button>
      </header>

      {/* ── Main Content Area ── */}
      <main className="flex-1 overflow-y-auto px-6 pb-28 scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="flex flex-col min-h-max"
          >
            {activeTab === "home" && <HomeTab userId={currentUser.id} onGoBook={() => setActiveTab("bookings")} />}
            {activeTab === "tables" && <TablesTab />}
            {activeTab === "bookings" && <BookingsTab userId={currentUser.id} />}
            {activeTab === "events" && <EventsTab />}
            {activeTab === "profile" && <ProfileTab userId={currentUser.id} onLogout={handleLogout} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Bottom Nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 h-24 max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-[#D4C4B7]/30 flex items-center justify-between px-8 z-40 pb-4">
        <NavItem icon={<Home size={22} strokeWidth={1.5} />} label="Beranda" active={activeTab === "home"} onClick={() => setActiveTab("home")} />
        <NavItem icon={<Grid size={22} strokeWidth={1.5} />} label="Meja" active={activeTab === "tables"} onClick={() => setActiveTab("tables")} />
        <div className="w-14 h-14 flex items-center justify-center -mt-8">
          <motion.button onClick={() => setActiveTab("bookings")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full h-full bg-[#2A2421] shadow-lg shadow-[#2A2421]/20 flex items-center justify-center rounded-xl text-white outline-none">
            <Plus size={24} strokeWidth={1.5} />
          </motion.button>
        </div>
        <NavItem icon={<Ticket size={22} strokeWidth={1.5} />} label="Acara" active={activeTab === "events"} onClick={() => setActiveTab("events")} />
        <NavItem icon={<User size={22} strokeWidth={1.5} />} label="Profil" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
      </nav>
    </div>
  );
}
