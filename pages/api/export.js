import ExcelJS from 'exceljs';
import { getSupabaseAdmin } from '../../lib/supabaseAdmin';
import { isValidSession } from '../../lib/adminSession';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method not allowed');
  }
  if (!isValidSession(req)) {
    return res.status(401).json({ error: 'Not authorized.' });
  }

  const supabase = getSupabaseAdmin();
  const { start, end, limit } = req.query || {};

  let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (start) query = query.gte('created_at', start);
  if (end) query = query.lte('created_at', end);
  query = query.limit(limit ? parseInt(limit, 10) : 100000);

  const { data: orders, error } = await query;
  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Could not load orders.' });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fresas con Crema';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Orders', {
    views: [{ state: 'frozen', ySplit: 1 }], // freeze header row
  });

  const MAROON = 'FF7C1B2C';
  const CREAM = 'FFFFF7EC';
  const THIN_BORDER = { style: 'thin', color: { argb: 'FFDDBFC5' } };

  sheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Time', key: 'time', width: 12 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Base', key: 'base', width: 20 },
    { header: 'Cup Size', key: 'cupSize', width: 10 },
    { header: 'Rim', key: 'rim', width: 10 },
    { header: 'Toppings', key: 'toppings', width: 34 },
    { header: 'Syrup', key: 'syrup', width: 22 },
    { header: 'Qty', key: 'qty', width: 7 },
    { header: 'Pickup Date', key: 'pickupDate', width: 13 },
    { header: 'Pickup Time', key: 'pickupTime', width: 13 },
    { header: 'Payment Method', key: 'paymentMethod', width: 16 },
    { header: 'Paid', key: 'paid', width: 9 },
    { header: 'Total', key: 'total', width: 12 },
  ];

  // Header row styling
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MAROON } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
    cell.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
  });
  headerRow.height = 20;

  orders.forEach((o, i) => {
    const created = new Date(o.created_at);
    const isMultiCup = Array.isArray(o.items) && o.items.length > 0;

    // Multi-cup orders get their columns built from every cup, joined
    // into one readable cell each — e.g. Base: "1x Regular Fresas; 2x
    // Ferrero Rocher" — rather than only reflecting the first cup.
    const baseCell = isMultiCup ? o.items.map((it) => `${it.qty}x ${it.base}`).join('; ') : (o.base || '');
    const cupSizeCell = isMultiCup ? [...new Set(o.items.map((it) => it.cup_size))].join('; ') : (o.cup_size || '');
    const rimCell = isMultiCup
      ? o.items.filter((it) => it.base === 'Banana Pudding' || it.base === 'Gansito')
          .map((it) => `${it.base}: ${it.include_rim === false ? 'No' : 'Yes'}`).join('; ')
      : ((o.base === 'Banana Pudding' || o.base === 'Gansito') ? (o.include_rim === false ? 'No' : 'Yes') : '');
    const toppingsCell = isMultiCup
      ? o.items.map((it) => `[${it.base}] ${(it.toppings || []).join(', ') || 'None'}`).join(' | ')
      : (o.toppings || []).join(', ');
    const syrupCell = isMultiCup
      ? o.items.map((it) => `[${it.base}] ${(it.syrups || []).join(', ') || 'None'}`).join(' | ')
      : (o.syrups || []).join(', ');
    const qtyCell = isMultiCup ? o.items.reduce((sum, it) => sum + (it.qty || 1), 0) : (o.qty ?? '');

    const row = sheet.addRow({
      date: created.toLocaleDateString(),
      time: created.toLocaleTimeString(),
      name: o.customer_name || '',
      phone: o.customer_phone || '',
      base: baseCell,
      cupSize: cupSizeCell,
      rim: rimCell,
      toppings: toppingsCell,
      syrup: syrupCell,
      qty: qtyCell,
      pickupDate: o.pickup_date || '',
      pickupTime: o.pickup_time || '',
      paymentMethod: o.payment_method || '',
      paid: o.paid ? 'Yes' : 'No',
      total: Number(o.total || 0),
    });

    row.eachCell((cell) => {
      cell.border = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    row.getCell('total').numFmt = '$#,##0.00';
    // Zebra striping for readability
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CREAM } };
      });
    }
  });

  // Total row — computed directly rather than as a formula, so it
  // displays immediately in every spreadsheet app without needing a
  // manual recalculation.
  const totalSum = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const totalRow = sheet.addRow({});
  totalRow.getCell('paymentMethod').value = 'TOTAL';
  totalRow.getCell('paymentMethod').font = { bold: true };
  totalRow.getCell('total').value = totalSum;
  totalRow.getCell('total').numFmt = '$#,##0.00';
  totalRow.eachCell((cell) => {
    cell.font = { ...(cell.font || {}), bold: true };
    cell.border = { top: { style: 'double', color: { argb: 'FF7C1B2C' } }, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7CCD6' } };
  });

  sheet.autoFilter = { from: 'A1', to: 'O1' };

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStamp = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="fresas-orders-${dateStamp}.xlsx"`);
  res.status(200).send(Buffer.from(buffer));
}
