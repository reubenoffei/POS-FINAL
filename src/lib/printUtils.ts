import { Sale, ShopSettings, Product } from '../types';
import JsBarcode from 'jsbarcode';

export type ThermalPaperWidth = '80mm' | '58mm';

/**
 * Generate inline SVG string for a barcode
 */
export function generateBarcodeSvgString(value: string, options?: { height?: number; width?: number; fontSize?: number }): string {
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value || '0000000000', {
      format: 'CODE128',
      lineColor: '#000000',
      width: options?.width || 1.5,
      height: options?.height || 36,
      displayValue: true,
      fontSize: options?.fontSize || 10,
      font: 'monospace',
      fontOptions: 'bold',
      textMargin: 2,
      margin: 4,
      background: 'transparent',
    });
    return new XMLSerializer().serializeToString(svg);
  } catch (err) {
    console.error('Barcode generation error:', err);
    return `<div style="font-family:monospace;font-weight:bold;padding:4px;border:1px dashed #000;text-align:center;">*${value}*</div>`;
  }
}

/**
 * Print isolated HTML string via a dedicated print iframe
 */
export function printHtmlViaIframe(htmlContent: string): Promise<void> {
  return new Promise((resolve) => {
    // Remove any previous print iframes
    const existing = document.getElementById('shop-print-frame');
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'shop-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      console.warn('Print iframe document not accessible, fallback to window.open');
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(htmlContent);
        win.document.close();
        win.focus();
        setTimeout(() => {
          win.print();
          win.close();
          resolve();
        }, 300);
      }
      return;
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    const triggerPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Iframe print error, attempting popup print:', e);
        const win = window.open('', '_blank', 'width=450,height=700');
        if (win) {
          win.document.write(htmlContent);
          win.document.close();
          win.focus();
          setTimeout(() => {
            win.print();
            win.close();
          }, 350);
        }
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
          resolve();
        }, 1500);
      }
    };

    // Wait a brief tick for fonts & SVGs to finish rendering in iframe
    setTimeout(triggerPrint, 250);
  });
}

/**
 * Print a Thermal Receipt configured specifically for 80mm or 58mm POS thermal printers
 */
export async function printThermalReceipt(
  sale: Sale,
  settings: ShopSettings,
  formatCurrency: (val: number) => string,
  paperWidth: ThermalPaperWidth = '80mm'
): Promise<void> {
  const is58mm = paperWidth === '58mm';
  const widthVal = is58mm ? '58mm' : '80mm';
  const maxContentWidth = is58mm ? '48mm' : '72mm';
  const fontSizeBase = is58mm ? '10px' : '11.5px';
  const titleSize = is58mm ? '13px' : '15px';
  const headerSize = is58mm ? '9px' : '10.5px';

  const formattedDate = new Date(sale.date).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const barcodeSvg = generateBarcodeSvgString(sale.receiptNo, {
    height: is58mm ? 28 : 34,
    width: is58mm ? 1.2 : 1.4,
    fontSize: is58mm ? 8.5 : 9.5,
  });

  const itemsHtml = sale.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px dashed #cccccc;">
        <td style="padding: 4px 0; vertical-align: top;">
          <div style="font-weight: bold; color: #000000; line-height: 1.2;">${item.productName}</div>
          <div style="font-size: ${headerSize}; color: #444444;">SKU: ${item.sku}</div>
        </td>
        <td style="padding: 4px 0; text-align: center; vertical-align: top; white-space: nowrap;">
          ${item.quantity} ${item.unit}
        </td>
        <td style="padding: 4px 0; text-align: right; vertical-align: top; white-space: nowrap;">
          ${formatCurrency(item.unitPrice)}
        </td>
        <td style="padding: 4px 0; text-align: right; font-weight: bold; vertical-align: top; white-space: nowrap;">
          ${formatCurrency(item.total)}
        </td>
      </tr>
    `
    )
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${sale.receiptNo}</title>
  <style>
    @page {
      size: ${widthVal} auto;
      margin: 0mm !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .receipt-container {
      width: ${widthVal};
      max-width: ${widthVal};
      margin: 0 auto;
      padding: 4mm 3mm 8mm 3mm;
      box-sizing: border-box;
      font-size: ${fontSizeBase};
      line-height: 1.35;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .divider {
      border-top: 1px dashed #000000;
      margin: 6px 0;
    }
    .double-divider {
      border-top: 2px solid #000000;
      margin: 6px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 2px 0;
    }
    .meta-label {
      color: #333333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: inherit;
    }
    th {
      font-weight: bold;
      border-bottom: 1px solid #000000;
      padding-bottom: 3px;
      text-transform: uppercase;
      font-size: ${headerSize};
    }
    .grand-total {
      font-size: ${titleSize};
      font-weight: 900;
      border-top: 1px solid #000000;
      border-bottom: 2px solid #000000;
      padding: 5px 0;
      margin: 5px 0;
    }
    .barcode-wrap {
      margin-top: 8px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .barcode-wrap svg {
      max-width: 100%;
      height: auto;
    }
    .feed-cut {
      height: 10mm;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    
    <!-- STORE HEADER -->
    <div class="text-center">
      <div class="bold uppercase" style="font-size: ${titleSize}; letter-spacing: 0.5px;">${settings.shopName}</div>
      ${settings.tagline ? `<div style="font-size: ${headerSize}; margin-top: 1px;">${settings.tagline}</div>` : ''}
      <div style="font-size: ${headerSize}; margin-top: 2px;">${settings.address}</div>
      <div style="font-size: ${headerSize};">Tel: ${settings.phone}</div>
      ${settings.email ? `<div style="font-size: ${headerSize};">Email: ${settings.email}</div>` : ''}
      ${sale.branchName ? `<div class="bold" style="font-size: ${headerSize}; margin-top: 3px; padding: 2px 4px; border: 1px solid #000; display: inline-block;">BRANCH: ${sale.branchName.toUpperCase()}</div>` : ''}
    </div>

    <div class="divider"></div>

    <!-- TRANSACTION META -->
    <div>
      <div class="row">
        <span class="meta-label">Receipt No:</span>
        <span class="bold">${sale.receiptNo}</span>
      </div>
      <div class="row">
        <span class="meta-label">Date & Time:</span>
        <span>${formattedDate}</span>
      </div>
      <div class="row">
        <span class="meta-label">Cashier:</span>
        <span>${sale.cashierName || 'Staff'}</span>
      </div>
      <div class="row">
        <span class="meta-label">Customer:</span>
        <span class="bold">${sale.customerName}</span>
      </div>
      ${sale.customerPhone ? `
      <div class="row">
        <span class="meta-label">Cust Phone:</span>
        <span>${sale.customerPhone}</span>
      </div>` : ''}
      <div class="row">
        <span class="meta-label">Payment:</span>
        <span class="bold uppercase">${sale.paymentMethod.replace('_', ' ')}</span>
      </div>
      <div class="row">
        <span class="meta-label">Status:</span>
        <span class="bold uppercase">${sale.status.replace('_', ' ')}</span>
      </div>
    </div>

    <div class="divider"></div>

    <!-- ITEMS TABLE -->
    <table>
      <thead>
        <tr>
          <th class="text-left" style="width: 44%;">Item</th>
          <th class="text-center" style="width: 14%;">Qty</th>
          <th class="text-right" style="width: 20%;">Price</th>
          <th class="text-right" style="width: 22%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <!-- TOTALS -->
    <div style="margin-top: 4px;">
      <div class="row">
        <span>Subtotal:</span>
        <span>${formatCurrency(sale.subtotal)}</span>
      </div>

      ${sale.discount > 0 ? `
      <div class="row">
        <span>Discount:</span>
        <span>-${formatCurrency(sale.discount)}</span>
      </div>` : ''}

      ${sale.taxAmount > 0 ? `
      <div class="row">
        <span>${settings.taxName} (${sale.taxRate}%):</span>
        <span>+${formatCurrency(sale.taxAmount)}</span>
      </div>` : ''}

      <div class="row grand-total">
        <span>GRAND TOTAL:</span>
        <span>${formatCurrency(sale.grandTotal)}</span>
      </div>

      ${sale.cashTendered !== undefined && sale.cashTendered > 0 ? `
      <div class="row">
        <span>Cash Tendered:</span>
        <span>${formatCurrency(sale.cashTendered)}</span>
      </div>` : ''}

      ${sale.changeDue !== undefined && sale.changeDue > 0 ? `
      <div class="row bold">
        <span>Change Returned:</span>
        <span>${formatCurrency(sale.changeDue)}</span>
      </div>` : ''}

      ${sale.balanceDue > 0 ? `
      <div class="row bold" style="margin-top: 3px; padding-top: 2px; border-top: 1px dashed #000;">
        <span>OUTSTANDING CREDIT:</span>
        <span>${formatCurrency(sale.balanceDue)}</span>
      </div>` : ''}
    </div>

    <div class="divider"></div>

    <!-- FOOTER -->
    <div class="text-center" style="font-size: ${headerSize};">
      ${settings.receiptHeader ? `<div style="margin-bottom: 3px;">${settings.receiptHeader}</div>` : ''}
      ${sale.notes ? `<div style="font-style: italic; margin-bottom: 3px;">Note: ${sale.notes}</div>` : ''}
      ${settings.receiptFooter ? `<div>${settings.receiptFooter}</div>` : '<div>Thank you for your patronage! Please keep this receipt.</div>'}
      
      <!-- BARCODE -->
      <div class="barcode-wrap">
        ${barcodeSvg}
      </div>
    </div>

    <div class="feed-cut"></div>
  </div>
</body>
</html>
  `;

  await printHtmlViaIframe(html);
}

export type BarcodePaperMode = 'thermal_roll' | 'a4_labels';

/**
 * Print Barcode Labels (Thermal Roll single column OR A4 sticker grid)
 */
export async function printBarcodeLabels(
  products: Product[],
  formatCurrency: (val: number) => string,
  options?: {
    mode?: BarcodePaperMode;
    copiesPerProduct?: Record<string, number>;
    defaultCopies?: number;
    showPrice?: boolean;
    showSku?: boolean;
    shopName?: string;
  }
): Promise<void> {
  const mode = options?.mode || 'thermal_roll';
  const defaultCopies = options?.defaultCopies || 1;
  const showPrice = options?.showPrice ?? true;
  const showSku = options?.showSku ?? true;
  const shopName = options?.shopName || 'Retail Store';

  // Build flattened list of labels according to requested copy counts
  const labelItems: Product[] = [];
  products.forEach((prod) => {
    const count = options?.copiesPerProduct?.[prod.id] ?? defaultCopies;
    for (let i = 0; i < count; i++) {
      labelItems.push(prod);
    }
  });

  if (labelItems.length === 0) {
    alert('No barcode labels selected to print.');
    return;
  }

  const isThermalRoll = mode === 'thermal_roll';

  const labelsHtml = labelItems
    .map((prod) => {
      const barcodeSvg = generateBarcodeSvgString(prod.barcode || prod.sku, {
        height: isThermalRoll ? 30 : 26,
        width: isThermalRoll ? 1.3 : 1.1,
        fontSize: 9,
      });

      return `
      <div class="barcode-label">
        <div class="label-store">${shopName}</div>
        <div class="label-name" title="${prod.name}">${prod.name}</div>
        ${showPrice ? `<div class="label-price">${formatCurrency(prod.sellingPrice)}</div>` : ''}
        <div class="label-barcode">
          ${barcodeSvg}
        </div>
        ${showSku ? `<div class="label-sku">SKU: ${prod.sku}</div>` : ''}
      </div>
    `;
    })
    .join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Barcode Labels (${labelItems.length} Labels)</title>
  <style>
    @page {
      ${
        isThermalRoll
          ? 'size: 58mm auto; margin: 0mm !important;'
          : 'size: A4 portrait; margin: 8mm 8mm !important;'
      }
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    ${
      isThermalRoll
        ? `
      /* Thermal Continuous Label Roll (e.g. 50mm x 30mm or 58mm wide) */
      .labels-container {
        width: 58mm;
        margin: 0 auto;
        padding: 2mm;
        box-sizing: border-box;
      }
      .barcode-label {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #000000;
        border-radius: 4px;
        padding: 4px;
        margin-bottom: 4mm;
        text-align: center;
        page-break-inside: avoid;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #ffffff;
      }
    `
        : `
      /* A4 Standard 3-Column / 4-Column Sticker Label Sheet */
      .labels-container {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4mm;
        width: 100%;
        box-sizing: border-box;
      }
      .barcode-label {
        box-sizing: border-box;
        border: 1px dashed #999999;
        border-radius: 4px;
        padding: 6px 4px;
        text-align: center;
        page-break-inside: avoid;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 38mm;
        background: #ffffff;
      }
    `
    }

    .label-store {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #333333;
      margin-bottom: 1px;
    }
    .label-name {
      font-size: 10.5px;
      font-weight: 800;
      color: #000000;
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }
    .label-price {
      font-size: 12px;
      font-weight: 900;
      color: #000000;
      margin: 2px 0 1px 0;
    }
    .label-barcode {
      display: flex;
      align-items: center;
      justify-content: center;
      max-width: 100%;
      margin: 1px 0;
    }
    .label-barcode svg {
      max-width: 100%;
      height: auto;
    }
    .label-sku {
      font-size: 8.5px;
      font-family: monospace;
      color: #444444;
      margin-top: 1px;
    }
  </style>
</head>
<body>
  <div class="labels-container">
    ${labelsHtml}
  </div>
</body>
</html>
  `;

  await printHtmlViaIframe(html);
}
