
import React from 'react';
import Barcode from 'react-barcode';
import { cn } from '@/lib/utils';
import { Truck, CreditCard, Package } from 'lucide-react';

// 58mm x 40mm Smart Label (Compact Style)
interface SmartLabelProps {
    orderId: string;
    itemsCount: number;
    districtCode: string;
    deliveryToken: string;
    paymentMethod: string;
    date: Date;
    index?: number;
}

export const SmartLabel = React.forwardRef<HTMLDivElement, SmartLabelProps>(
    ({ orderId, itemsCount, districtCode, deliveryToken, paymentMethod, date, index }, ref) => {

        const barcodeValue = orderId.slice(-10).toUpperCase();

        const paymentMap: Record<string, string> = {
            'CASH': 'NAQD',
            'CARD': 'KARTA',
            'CLICK': 'CLICK',
            'PAYME': 'PAYME',
            'UZUM': 'UZUM'
        };

        const displayPayment = paymentMap[paymentMethod.toUpperCase()] || paymentMethod;

        return (
            <div ref={ref} className="smart-label bg-white text-black overflow-hidden flex flex-col pt-1 pl-1 pr-1"
                style={{
                    width: '56mm',
                    height: '38mm',
                    fontFamily: 'Inter, sans-serif',
                    pageBreakAfter: 'always',
                    boxSizing: 'border-box',
                    border: '1px solid #eee' // Helper border, invisible in thermal print usually
                }}
            >
                {/* 1. Top: Optimised Barcode for Scannability */}
                <div className="flex flex-col items-center border-b border-black/10 pb-1 w-full overflow-hidden">
                    <div className="scale-x-110 origin-center"> {/* Slight horizontal stretch if needed, but width=2 is usually better */}
                        <Barcode
                            value={barcodeValue}
                            width={2} // Thicker bars for better thermal print
                            height={30} // Sufficient height
                            fontSize={12}
                            margin={2}
                            displayValue={false} // Hide default text to customize it below
                            textAlign="center"
                        />
                    </div>
                    {/* Custom larger readable ID */}
                    <div className="text-[12px] font-mono font-bold tracking-[0.1em] leading-none mt-0.5">
                        {barcodeValue}
                    </div>
                </div>

                {/* 2. Grid Layout for Details */}
                <div className="grid grid-cols-2 gap-x-1 gap-y-1 mt-1 text-[8px] leading-tight">

                    {/* District (Prominent) */}
                    <div className="col-span-2 flex justify-between items-center bg-black text-white px-1 py-0.5 rounded-sm">
                        <span className="opacity-70 font-light uppercase tracking-wider text-[6px]">Tuman</span>
                        <span className="font-bold text-[10px] uppercase truncate max-w-[40mm]">{districtCode || '---'}</span>
                    </div>

                    {/* Payment */}
                    <div className="flex flex-col border border-gray-200 p-0.5 rounded-sm items-center justify-center">
                        <span className="text-[6px] text-gray-400 uppercase">To'lov</span>
                        <div className="font-bold uppercase truncate w-full text-center">{displayPayment}</div>
                    </div>

                    {/* Count */}
                    <div className="flex flex-col border border-gray-200 p-0.5 rounded-sm items-center justify-center">
                        <span className="text-[6px] text-gray-400 uppercase">Soni</span>
                        <div className="font-bold">{itemsCount} dona</div>
                    </div>
                </div>

                {/* 3. Footer: Date */}
                <div className="mt-auto text-[6px] text-gray-400 text-center pb-0.5 font-mono">
                    {date.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        );
    }
);

SmartLabel.displayName = 'SmartLabel';
