"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const statuses = [
    { label: "Barchasi", value: "ALL" },
    { label: "Kutilmoqda", value: "PENDING" },
    { label: "To'lov kutilmoqda", value: "AWAITING_PAYMENT" },
    { label: "Jarayonda", value: "PROCESSING" },
    { label: "Yetkazilmoqda", value: "SHIPPING" },
    { label: "Yetkazildi", value: "DELIVERED" },
    { label: "Bekor qilindi", value: "CANCELLED" },
];

export default function StatusFilter() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const currentStatus = searchParams.get("status") || "ALL";

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleFilter = (status: string) => {
        const params = new URLSearchParams(searchParams);
        if (status === "ALL") {
            params.delete("status");
        } else {
            params.set("status", status);
        }
        router.replace(`/admin/invoices?${params.toString()}`);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="outline"
                size="sm"
                className={`rounded-xl text-xs font-semibold gap-2 border-gray-200 transition-all ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500' : 'hover:border-gray-300'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Filter size={14} className={currentStatus !== 'ALL' ? 'text-blue-600' : 'text-gray-400'} />
                {statuses.find(s => s.value === currentStatus)?.label || "Filtrlash"}
                <ChevronDown size={14} className={`opacity-50 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </Button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 4, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 top-full z-50 min-w-[180px] bg-white rounded-2xl border border-gray-100 shadow-2xl shadow-gray-200/50 p-2 overflow-hidden"
                    >
                        {statuses.map((status) => {
                            const isActive = currentStatus === status.value;
                            return (
                                <button
                                    key={status.value}
                                    onClick={() => handleFilter(status.value)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-all ${isActive
                                        ? "bg-blue-50 text-blue-600"
                                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                >
                                    {status.label}
                                    {isActive && <Check size={14} className="text-blue-600" />}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
