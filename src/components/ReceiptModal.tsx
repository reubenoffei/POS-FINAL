import React, { useState, useEffect, useRef } from 'react';
import { Sale } from '../types';
import { useShop } from '../context/ShopContext';
import { Printer, X, CheckCircle2, Store, Sliders, Check } from 'lucide-react';
import { printThermalReceipt, ThermalPaperWidth } from '../lib/printUtils';
import JsBarcode from 'jsbarcode';

interface ReceiptModalProps {
  sale: Sale | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose }) => {
  const { settings, formatCurrency } = useShop();
  const [paperWidth, setPaperWidth] = useState<ThermalPaperWidth>('80mm');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (sale && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, sale.receiptNo, {
          format: 'CODE128',
          lineColor: '#000000',
          width: paperWidth === '58mm' ? 1.2 : 1.5,
          height: paperWidth === '58mm' ? 28 : 34,
          displayValue: true,
          fontSize: paperWidth === '58mm' ? 9 : 10,
          font: 'monospace',
          textMargin: 2,
          margin: 2,
        });
      } catch (e) {
        console.error('Barcode render error:', e);
      }
    }
  }, [sale, paperWidth]);

  if (!sale) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await printThermalReceipt(sale, settings, formatCurrency, paperWidth);
      setPrintSuccess(true);
      setTimeout(() => setPrintSuccess(false), 2500);
    } catch (err) {
      console.error('Print failed:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  const formattedDate = new Date(sale.date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const is58mm = paperWidth === '58mm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header action bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 no-print">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Receipt #{sale.receiptNo}</h3>
              <p className="text-[11px] text-slate-500">{sale.branchName || 'Head Office'} • {sale.customerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Paper format selector */}
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperWidth === '80mm'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Standard POS 80mm thermal roll"
              >
                80mm Roll
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  paperWidth === '58mm'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Compact 58mm Bluetooth/Portable thermal roll"
              >
                58mm Roll
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview with thermal paper roll aesthetic */}
        <div className="overflow-y-auto p-6 bg-slate-100 flex flex-col items-center">
          
          <div className="text-[11px] text-slate-500 font-medium mb-2 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Thermal Receipt Output Preview ({paperWidth} Roll Format)</span>
          </div>

          {/* Thermal Paper Container */}
          <div
            id="printable-receipt"
            style={{ width: is58mm ? '240px' : '320px' }}
            className="bg-white p-4 sm:p-5 rounded-sm shadow-md border-t-4 border-indigo-600 font-mono-code text-[11px] text-slate-900 select-all relative transition-all duration-200"
          >
            {/* Top jagged / serrated receipt roll effect */}
            <div className="absolute -top-2 left-0 right-0 h-2 bg-slate-100 flex justify-between overflow-hidden">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-3 h-3 bg-white rotate-45 transform origin-top-left -mt-1.5" />
              ))}
            </div>

            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-950 uppercase leading-snug">
                {settings.shopName}
              </h2>
              {settings.tagline && <p className="text-[10px] text-slate-500 mt-0.5">{settings.tagline}</p>}
              <p className="text-[10px] text-slate-600 mt-1">{settings.address}</p>
              <p className="text-[10px] text-slate-600">Tel: {settings.phone}</p>
              {settings.email && <p className="text-[10px] text-slate-600">Email: {settings.email}</p>}
              {sale.branchName && (
                <div className="mt-1.5 inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-sm text-[9px] font-bold uppercase tracking-wider text-slate-800">
                  Branch: {sale.branchName}
                </div>
              )}
            </div>

            {/* Receipt Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[10.5px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-bold text-slate-950">{sale.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date/Time:</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier:</span>
                <span>{sale.cashierName || 'Staff'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-semibold text-slate-900">{sale.customerName}</span>
              </div>
              {sale.customerPhone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <span>{sale.customerPhone}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Payment:</span>
                <span className="uppercase font-bold text-slate-900">{sale.paymentMethod.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status:</span>
                <span className={`uppercase font-bold ${
                  sale.status === 'completed'
                    ? 'text-emerald-700'
                    : sale.status === 'refunded'
                    ? 'text-rose-700'
                    : 'text-amber-700'
                }`}>
                  {sale.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="grid grid-cols-12 font-bold text-slate-950 mb-1.5 pb-1 border-b border-slate-900 text-[10.5px]">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-2 text-right">Price</span>
                <span className="col-span-2 text-right">Total</span>
              </div>

              <div className="space-y-1.5">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 text-[10.5px] items-start">
                    <div className="col-span-6 pr-1">
                      <div className="font-bold text-slate-950 leading-tight">{item.productName}</div>
                      <div className="text-[9px] text-slate-500">SKU: {item.sku}</div>
                    </div>
                    <div className="col-span-2 text-center text-slate-700">
                      {item.quantity}
                    </div>
                    <div className="col-span-2 text-right text-slate-600">
                      {formatCurrency(item.unitPrice)}
                    </div>
                    <div className="col-span-2 text-right font-bold text-slate-950">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="py-2.5 space-y-1 text-[10.5px] border-b border-dashed border-slate-300">
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

              <div className="flex justify-between text-xs sm:text-sm font-extrabold text-slate-950 pt-1 border-t-2 border-slate-900 mt-1">
                <span>GRAND TOTAL:</span>
                <span>{formatCurrency(sale.grandTotal)}</span>
              </div>

              {sale.cashTendered !== undefined && sale.cashTendered > 0 && (
                <div className="flex justify-between text-slate-600 pt-0.5">
                  <span>Cash Tendered:</span>
                  <span>{formatCurrency(sale.cashTendered)}</span>
                </div>
              )}

              {sale.changeDue !== undefined && sale.changeDue > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Change Given:</span>
                  <span>{formatCurrency(sale.changeDue)}</span>
                </div>
              )}

              {sale.balanceDue > 0 && (
                <div className="flex justify-between text-rose-600 font-bold pt-1 border-t border-dashed border-rose-200">
                  <span>OUTSTANDING BALANCE:</span>
                  <span>{formatCurrency(sale.balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Footer Notes & Scannable Barcode */}
            <div className="pt-3 text-center space-y-1.5 text-[9.5px] text-slate-600">
              {settings.receiptHeader && <p className="font-medium text-slate-800">{settings.receiptHeader}</p>}
              {sale.notes && <p className="italic text-slate-700 bg-slate-50 p-1 rounded-xs">Note: {sale.notes}</p>}
              {settings.receiptFooter ? (
                <p>{settings.receiptFooter}</p>
              ) : (
                <p>Thank you for your business! Please keep receipt for returns.</p>
              )}
              
              {/* Crisp SVG Barcode for thermal scanner recognition */}
              <div className="pt-2 flex flex-col items-center justify-center">
                <svg ref={barcodeRef} className="max-w-full" />
              </div>
            </div>

          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-200 bg-slate-50 no-print">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            Formatted for direct thermal receipt roll printers (zero margin).
          </div>
          
          <div className="flex items-center gap-2.5 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-xl shadow-2xs hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 rounded-xl shadow-sm transition-all"
            >
              {printSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  Sent to Printer!
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  {isPrinting ? 'Preparing Print...' : `Print Thermal (${paperWidth})`}
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

