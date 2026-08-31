import React from 'react';
import { Sale } from '../types';
import { useShop } from '../context/ShopContext';
import { Printer, X, CheckCircle2, Store } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings, formatCurrency } = useShop();

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(sale.date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header action bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-slate-900 text-base">Receipt #{sale.receiptNo}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Body */}
        <div className="overflow-y-auto p-6 bg-slate-100/50 flex justify-center">
          
          {/* Printable Thermal Receipt Simulation */}
          <div
            id="printable-receipt"
            className="w-full max-w-sm bg-white p-6 rounded-xl shadow-xs border border-slate-200 font-mono-code text-xs text-slate-800"
          >
            {/* Store Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-300">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-indigo-50 text-indigo-700 rounded-full mb-2">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-950 uppercase">{settings.shopName}</h2>
              {settings.tagline && <p className="text-[11px] text-slate-500 mt-0.5">{settings.tagline}</p>}
              <p className="text-[11px] text-slate-600 mt-1">{settings.address}</p>
              <p className="text-[11px] text-slate-600">Tel: {settings.phone}</p>
              {settings.email && <p className="text-[11px] text-slate-600">Email: {settings.email}</p>}
            </div>

            {/* Receipt Meta */}
            <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-bold text-slate-900">{sale.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-medium text-slate-900">{sale.customerName}</span>
              </div>
              {sale.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span>{sale.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Payment:</span>
                <span className="uppercase font-semibold text-slate-800">{sale.paymentMethod.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className={`uppercase font-bold ${sale.status === 'completed' ? 'text-emerald-700' : sale.status === 'refunded' ? 'text-rose-700' : 'text-amber-700'}`}>
                  {sale.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-3 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 font-bold text-slate-900 mb-2 pb-1 border-b border-slate-200 text-[11px]">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Price</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              <div className="space-y-2">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[11px] items-start">
                    <div className="col-span-6 pr-1">
                      <div className="font-medium text-slate-950 leading-tight">{item.productName}</div>
                      <div className="text-[10px] text-slate-400">SKU: {item.sku}</div>
                    </div>
                    <div className="col-span-2 text-center text-slate-700">
                      {item.quantity} {item.unit}
                    </div>
                    <div className="col-span-2 text-right text-slate-600">
                      {formatCurrency(item.unitPrice)}
                    </div>
                    <div className="col-span-2 text-right font-medium text-slate-950">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="py-3 space-y-1.5 text-[11px] border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal:</span>
                <span>{formatCurrency(sale.subtotal)}</span>
              </div>
              
              {sale.discount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Discount:</span>
                  <span>-{formatCurrency(sale.discount)}</span>
                </div>
              )}

              {sale.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>{settings.taxName} ({sale.taxRate}%):</span>
                  <span>+{formatCurrency(sale.taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-slate-950 pt-1.5 border-t border-slate-200">
                <span>Grand Total:</span>
                <span>{formatCurrency(sale.grandTotal)}</span>
              </div>

              {sale.cashTendered !== undefined && sale.cashTendered > 0 && (
                <div className="flex justify-between text-slate-600 pt-1">
                  <span>Cash Tendered:</span>
                  <span>{formatCurrency(sale.cashTendered)}</span>
                </div>
              )}

              {sale.changeDue !== undefined && sale.changeDue > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Change Given:</span>
                  <span>{formatCurrency(sale.changeDue)}</span>
                </div>
              )}

              {sale.balanceDue > 0 && (
                <div className="flex justify-between text-rose-600 font-bold pt-1">
                  <span>Outstanding Credit Balance:</span>
                  <span>{formatCurrency(sale.balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Footer Notes */}
            <div className="pt-4 text-center space-y-2 text-[10px] text-slate-500">
              {settings.receiptHeader && <p className="font-medium text-slate-700">{settings.receiptHeader}</p>}
              {sale.notes && <p className="italic text-slate-600 bg-slate-50 p-1.5 rounded-sm">Note: {sale.notes}</p>}
              {settings.receiptFooter && <p className="text-slate-500">{settings.receiptFooter}</p>}
              
              {/* Barcode representation */}
              <div className="pt-3 flex flex-col items-center">
                <div className="font-mono tracking-[0.25em] text-[11px] font-bold text-slate-800">
                  ||||| | |||| ||| || |||||| | ||
                </div>
                <span className="text-[9px] text-slate-400 tracking-wider mt-0.5">{sale.receiptNo}</span>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>

      </div>
    </div>
  );
};
