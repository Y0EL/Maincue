"use client";

import { motion, AnimatePresence } from "framer-motion";
import { createContext, useContext, useState, ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type ModalType = "success" | "error" | "info";

interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalOptions | null>(null);

  const showModal = (options: ModalOptions) => setModal(options);
  const hideModal = () => setModal(null);

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={hideModal}
              className="absolute inset-0 bg-[#2A2421]/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[#FCFBFA] rounded-[2rem] p-8 shadow-2xl flex flex-col items-center text-center border border-[#D4C4B7]/40 z-10"
            >
              <div className="mb-4">
                {modal.type === "error" && <AlertCircle className="w-12 h-12 text-[#8B7355]" strokeWidth={1.5} />}
                {modal.type === "success" && <CheckCircle2 className="w-12 h-12 text-[#2A2421]" strokeWidth={1.5} />}
                {(modal.type === "info" || !modal.type) && <Info className="w-12 h-12 text-[#8B8580]" strokeWidth={1.5} />}
              </div>
              
              <h3 className="text-2xl font-light text-[#2A2421] mb-2 tracking-tight">
                {modal.title}
              </h3>
              <p className="text-sm text-[#8B8580] mb-8 leading-relaxed font-light">
                {modal.message}
              </p>
              
              <button
                onClick={hideModal}
                className="w-full py-4 bg-[#F5F4F1] text-[#2A2421] rounded-2xl text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[#E6E2DE] active:scale-95 transition-all outline-none"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}
