"use client";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-1.5 min-w-[60px] group">
      <div 
        className={cn(
          "transition-all duration-300 ease-out",
          active ? "text-[#2A2421] transform -translate-y-1" : "text-[#D4C4B7] group-hover:text-[#8B8580]"
        )}
      >
        {icon}
      </div>
      <span 
        className={cn(
          "text-[10px] uppercase tracking-widest transition-all duration-300", 
          active ? "font-medium text-[#2A2421]" : "font-light text-[#D4C4B7] group-hover:text-[#8B8580]"
        )}
      >
        {label}
      </span>
    </button>
  );
}
