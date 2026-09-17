// GET ?id=<quote_id> -> customer-facing quote PDF.
//
// IMPORTANT: this document goes to the customer. It must never contain
// buy prices, cost, or margin. The query below deliberately does not
// select those columns at all, so they cannot leak into the template.

import { createClient } from '@supabase/supabase-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_KEY
);

const COMPANY = {
  name: 'GLA Norway AS',
  address: 'Norway Street 10, 0010 Oslo, Norway',
  vat: 'VAT: [to be added]',
  phone: 'Phone: [to be added]',
};

const NAVY = rgb(0.059, 0.090, 0.165);   // #0F172A
const BLUE = rgb(0.145, 0.388, 0.922);   // #2563EB
const GREY = rgb(0.45, 0.48, 0.53);
const LINE = rgb(0.886, 0.91, 0.941);

const money = (n, cur = 'EUR') =>
  `${cur} ${Number(n || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const date = (d) => d ? new Date(d).toLocaleDateString('en-GB', {
  day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }

  try {
    const id = event.queryStringParameters?.id;
    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ success: false, error: 'id required' }) };
    }

    // SELL SIDE ONLY - no buy_unit_price, buy_line_total, margin_percent
    const { data: q, error } = await supabase
      .from('quote')
      .select(`
        id, reference_number, status, created_at, expires_at, current_version_id,
        customer:customer_id ( name, email, phone, address, city ),
        request:request_id ( title, description, origin_city, destination_city,
                             required_by_date, service_type:service_type_id ( name ) )
      `)
      .eq('id', id).single();
    if (error || !q) {
      return { statusCode: 404, body: JSON.stringify({ success: false, error: 'Quote not found' }) };
    }

    const { data: v } = await supabase
      .from('quote_version')
      .select('id, version_number, sell_total, sell_total_currency, payment_terms, notes, incoterm:incoterm_id ( code, description )')
      .eq('id', q.current_version_id).single();

    let lines = [], option = null;
    if (v) {
      const { data: opts } = await supabase
        .from('quote_option')
        .select('id, title, transport_mode, transit_days')
        .eq('quote_version_id', v.id).order('is_recommended', { ascending: false });
      option = opts?.[0] || null;
      if (option) {
        const { data: ls } = await supabase
          .from('quote_line')
          .select('description, quantity, sell_unit_price, sell_currency, sell_line_total')
          .eq('quote_option_id', option.id);
        lines = ls || [];
      }
    }

    const cur = v?.sell_total_currency || 'EUR';

    // ---- draw -------------------------------------------------------
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595, 842]);       // A4
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const reg = await pdf.embedFont(StandardFonts.Helvetica);
    const W = 595;
    const M = 50;
    let y = 842;

    const text = (s, x, yy, { size = 10, font = reg, color = NAVY } = {}) =>
      page.drawText(String(s ?? '-'), { x, y: yy, size, font, color });

    const right = (s, xRight, yy, { size = 10, font = reg, color = NAVY } = {}) => {
      const str = String(s ?? '-');
      page.drawText(str, { x: xRight - font.widthOfTextAtSize(str, size), y: yy, size, font, color });
    };

    // navy header band - a white logo sits on this
    page.drawRectangle({ x: 0, y: 742, width: W, height: 100, color: NAVY });
    text(COMPANY.name, M, 800, { size: 20, font: bold, color: rgb(1, 1, 1) });
    text(COMPANY.address, M, 782, { size: 9, color: rgb(0.8, 0.84, 0.9) });
    text(`${COMPANY.vat}   ${COMPANY.phone}`, M, 768, { size: 9, color: rgb(0.8, 0.84, 0.9) });
    right('QUOTATION', W - M, 800, { size: 18, font: bold, color: rgb(1, 1, 1) });
    right(q.reference_number, W - M, 780, { size: 11, color: rgb(0.8, 0.84, 0.9) });

    y = 710;
    text('QUOTED TO', M, y, { size: 8, font: bold, color: GREY });
    text('DETAILS', 330, y, { size: 8, font: bold, color: GREY });
    y -= 15;
    text(q.customer?.name, M, y, { size: 11, font: bold });
    text(`Issued    ${date(q.created_at)}`, 330, y, { size: 9 });
    y -= 13;
    text(q.customer?.email, M, y, { size: 9, color: GREY });
    text(`Valid to  ${date(q.expires_at)}`, 330, y, { size: 9 });
    y -= 13;
    if (q.customer?.address) text(q.customer.address, M, y, { size: 9, color: GREY });
    text(`Version   ${v?.version_number ?? 1}`, 330, y, { size: 9 });

    // shipment
    y -= 35;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1, color: LINE });
    y -= 18;
    text('SHIPMENT', M, y, { size: 8, font: bold, color: GREY });
    y -= 16;
    text(q.request?.title, M, y, { size: 11, font: bold });
    y -= 15;
    const route = q.request?.origin_city && q.request?.destination_city
      ? `${q.request.origin_city}  ->  ${q.request.destination_city}` : null;
    if (route) { text(route, M, y, { size: 10, color: BLUE }); }
    const svc = q.request?.service_type?.name;
    if (svc) right(svc, W - M, y, { size: 10 });
    y -= 14;
    const bits = [];
    if (v?.incoterm?.code) bits.push(`Incoterm ${v.incoterm.code}`);
    if (option?.transit_days) bits.push(`Transit ${option.transit_days} days`);
    if (q.request?.required_by_date) bits.push(`Required by ${date(q.request.required_by_date)}`);
    if (bits.length) text(bits.join('   |   '), M, y, { size: 9, color: GREY });

    // lines
    y -= 32;
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 22, color: rgb(0.97, 0.98, 0.99) });
    text('DESCRIPTION', M + 8, y, { size: 8, font: bold, color: GREY });
    right('QTY', 360, y, { size: 8, font: bold, color: GREY });
    right('UNIT PRICE', 460, y, { size: 8, font: bold, color: GREY });
    right('AMOUNT', W - M - 8, y, { size: 8, font: bold, color: GREY });
    y -= 22;

    for (const l of lines) {
      page.drawLine({ start: { x: M, y: y + 12 }, end: { x: W - M, y: y + 12 }, thickness: 0.5, color: LINE });
      text(l.description, M + 8, y, { size: 10 });
      right(l.quantity, 360, y, { size: 10 });
      right(money(l.sell_unit_price, l.sell_currency || cur), 460, y, { size: 10 });
      right(money(l.sell_line_total ?? l.quantity * l.sell_unit_price, cur), W - M - 8, y, { size: 10, font: bold });
      y -= 24;
    }

    if (!lines.length) {
      text('No line items on this quote.', M + 8, y, { size: 10, color: GREY });
      y -= 24;
    }

    // total - sell only, never margin
    page.drawLine({ start: { x: 330, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 1, color: NAVY });
    y -= 10;
    text('TOTAL', 340, y, { size: 11, font: bold });
    right(money(v?.sell_total, cur), W - M - 8, y, { size: 13, font: bold, color: BLUE });
    y -= 16;
    right('Excluding VAT where applicable', W - M - 8, y, { size: 8, color: GREY });

    if (v?.payment_terms) {
      y -= 26;
      text(`Payment terms: ${v.payment_terms}`, M, y, { size: 9 });
    }
    if (v?.notes) {
      y -= 16;
      text(`Notes: ${v.notes}`, M, y, { size: 9, color: GREY });
    }

    // terms - DRAFT WORDING, review before sending to customers
    const terms = [
      `This quotation is valid until ${date(q.expires_at)} and is subject to space and equipment being available at the time of booking.`,
      'Rates are based on the cargo details supplied and may be revised if actual weights, dimensions, or commodity differ.',
      'Unless stated above, the price excludes customs duties and taxes, demurrage and detention, storage, inspection charges, and cargo insurance.',
      'Currency surcharges, fuel adjustments, and carrier-imposed surcharges applicable at the time of shipment may be added.',
      'All business is transacted in accordance with the General Conditions of the Nordic Association of Freight Forwarders (NSAB 2015), which limit our liability.',
    ];

    y = Math.min(y - 34, 190);
    page.drawLine({ start: { x: M, y: y + 14 }, end: { x: W - M, y: y + 14 }, thickness: 0.5, color: LINE });
    text('TERMS & CONDITIONS', M, y, { size: 8, font: bold, color: GREY });
    y -= 13;
    for (const t of terms) {
      const words = t.split(' ');
      let ln = '';
      for (const w of words) {
        const test = ln ? `${ln} ${w}` : w;
        if (reg.widthOfTextAtSize(test, 7.5) > W - 2 * M - 10) {
          text(ln, M, y, { size: 7.5, color: GREY }); y -= 9.5; ln = w;
        } else ln = test;
      }
      if (ln) { text(ln, M, y, { size: 7.5, color: GREY }); y -= 12; }
    }

    page.drawLine({ start: { x: M, y: 48 }, end: { x: W - M, y: 48 }, thickness: 0.5, color: LINE });
    text(`${COMPANY.name}  |  ${COMPANY.address}`, M, 36, { size: 7.5, color: GREY });
    right(`${q.reference_number}  ยท  page 1 of 1`, W - M, 36, { size: 7.5, color: GREY });

    const bytes = await pdf.save();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${q.reference_number}.pdf"`,
        'Access-Control-Allow-Origin': '*',
      },
      body: Buffer.from(bytes).toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err.message, stack: err.stack }),
    };
  }
};
