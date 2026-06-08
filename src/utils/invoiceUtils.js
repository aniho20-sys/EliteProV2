export const getInvoiceTotal = (items) =>
  (items || []).reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
