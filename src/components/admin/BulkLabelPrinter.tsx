
"use client";

import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { SmartLabel } from './SmartLabel';
import { Printer } from 'lucide-react';

interface BulkLabelPrinterProps {
    orders: any[]; // Array of orders
}

export default function BulkLabelPrinter({ orders }: BulkLabelPrinterProps) {
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `smart-labels-${new Date().toISOString()}`,
    });

    if (!orders || orders.length === 0) return null;

    return (
        <>
            <button
                onClick={() => handlePrint()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-colors"
            >
                <Printer size={18} />
                <span>Print ({orders.length})</span>
            </button>

            {/* Hidden Print Area */}
            <div style={{ display: 'none' }}>
                <div ref={componentRef} style={{ width: '58mm' }}>
                    <style type="text/css" media="print">
                        {`
                            @media print {
                                @page { size: 58mm 40mm; margin: 0; }
                                body { margin: 0; }
                            }
                        `}
                    </style>
                    {orders.map((order, idx) => (
                        <SmartLabel
                            key={order.id}
                            index={idx}
                            orderId={order.id}
                            itemsCount={order.items?.length || 0}
                            districtCode={order.districtCode || 'N/A'}
                            deliveryToken={order.deliveryToken || `ORDER:${order.id}`}
                            paymentMethod={order.paymentMethod}
                            date={new Date(order.createdAt)}
                        />
                    ))}
                </div>
            </div>
        </>
    );
}
