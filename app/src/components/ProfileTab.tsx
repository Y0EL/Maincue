"use client";

import { useEffect, useState } from "react";

export default function ProfileTab({ userId, onLogout }: { userId: number, onLogout: () => void }) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch(`http://localhost:8000/user/${userId}`)
      .then(r => r.json())
      .then(setUser)
      .catch(e => console.log(e));
  }, []);

  return (
    <div className="space-y-12 pt-10 pb-24 px-4">
      
      {/* Profile Info */}
      <div className="text-center space-y-4">
         <div className="w-24 h-24 mx-auto rounded-full bg-transparent border border-[#D4C4B7] flex items-center justify-center text-[#2A2421]">
            <span className="text-3xl font-light tracking-tight">{user ? user.name.charAt(0).toUpperCase() : ''}</span>
         </div>
         
         <div>
            <h2 className="text-3xl font-light text-[#2A2421] tracking-tight">{user ? user.name : 'Loading...'}</h2>
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium text-[#8B8580] mt-2">Member</p>
         </div>
      </div>

      <div className="pt-12 border-t border-[#D4C4B7]/30 space-y-8">
         <span className="text-[10px] font-medium text-[#8B8580] uppercase tracking-[0.2em] block text-center">Settings</span>
         
         <div className="flex justify-center">
            <button 
              onClick={onLogout} 
              className="px-8 py-4 border border-[#2A2421] text-[#2A2421] hover:bg-[#2A2421] hover:text-white transition-colors duration-300 rounded-[1.5rem] uppercase tracking-[0.2em] text-[10px] font-medium"
            >
               Sign Out
            </button>
         </div>
      </div>

    </div>
  );
}
