"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Mail, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  totalAmount: number;
  paymentStatus: string;
  status: string;
  resendStatus: string | null;
  sentAt: string | null;
  createdAt: string;
  user?: { name?: string | null; email?: string | null } | null;
}

export default function AdminReceiptsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ search, page: String(page), limit: String(limit) });
      const res = await fetch(`/api/admin/invoices?${qs}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setInvoices(data.invoices || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error("Cheklarni yuklab bo\'lmadi");
    } finally {
      setLoading(false);
    }
  }, [search, page, limit]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleResend = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invoices/${id}/resend`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Chek qayta yuborildi");
      fetchInvoices();
    } catch (e) {
      toast.error("Qayta yuborishda xato");
    }
  };

  const statusBadge = (s: string | null) => {
    if (!s || s === 'SENT') return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">SENT</span>;
    if (s === 'DELIVERED') return <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">DELIVERED</span>;
    if (s === 'FAILED') return <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">FAILED</span>;
    return <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">{s}</span>;
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Elektron cheklar</h1>
          <p className="text-sm text-gray-500">Jami: {total}</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Chek yoki buyurtma raqami..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-blue-600" size={24} /></div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-16 text-sm text-gray-400">Cheklar topilmadi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b bg-gray-50">
                  <th className="px-4 py-3">Chek raqami</th>
                  <th className="px-4 py-3">Buyurtma</th>
                  <th className="px-4 py-3">Mijoz</th>
                  <th className="px-4 py-3 text-right">Summa</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Sana</th>
                  <th className="px-4 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-bold text-blue-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-gray-600">#{inv.orderId.slice(-6).toUpperCase()}</td>
                    <td className="px-4 py-3 text-gray-700">{inv.user?.name || inv.user?.email || '\u2014'}</td>
                    <td className="px-4 py-3 text-right font-bold">{Number(inv.totalAmount).toLocaleString()} so'm</td>
                    <td className="px-4 py-3">{statusBadge(inv.resendStatus)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(inv.createdAt).toLocaleDateString('uz-UZ')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleResend(inv.id)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Chekni qayta yuborish"><Mail size={14} /></button>
                        <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors" title="PDF yuklash"><ExternalLink size={14} /></a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm disabled:opacity-40">← Oldingi</button>
        <span className="text-sm text-gray-500">Sahifa {page}</span>
        <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm disabled:opacity-40">Keyingi →</button>
      </div>
    </div>
  );
}
