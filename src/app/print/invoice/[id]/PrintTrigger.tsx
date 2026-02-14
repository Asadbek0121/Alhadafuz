"use client";
import { useEffect } from "react";

export default function PrintTrigger() {
    useEffect(() => {
        // Wait a bit for images and styles to load
        const timer = setTimeout(() => {
            window.print();
        }, 1000);
        return () => clearTimeout(timer);
    }, []);
    return null;
}
