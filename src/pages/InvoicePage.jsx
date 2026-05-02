import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { Plus, Printer, Trash2, CheckCircle, FileText, AlertCircle, Clock } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { localToday } from '../utils/dateUtils';

const CURRENCIES = ['HKD', 'USD', 'GBP', 'EUR', 'SGD', 'AUD'];
const EMPTY_ITEM = { description: '', qty: 1, unitPrice: 0 };

function isOverdue(inv, today) {
  return inv.status === 'unpaid' && inv.dueDate < today;
}

function statusLabel(inv, today) {
  if (inv.status === 'paid') return 'paid';
  if (isOverdue(inv, today)) return 'overdue';
  return 'unpaid';
}

function InvoicePrint({ invoice, trainer, client, onClose }) {
  const total = invoice.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  return (
    <div className="invoice-print-overlay">
      <div className="invoice-print-actions no-print">
        <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / Save PDF</button>
        <button className="btn btn-outline" onClick={onClose}>Close</button>
      </div>
      <div className="invoice-print-doc">
        <div className="invoice-print-header">
          <div>
            <div className="invoice-print-brand">ElitePro</div>
            <div className="invoice-print-trainer">{trainer?.name}</div>
            <div className="invoice-print-trainer-email">{trainer?.email}</div>
          </div>
          <div className="invoice-print-meta">
            <div className="invoice-print-number">{invoice.invoiceNumber}</div>
            <div className="invoice-print-dates">
              <div><span>Issue date</span><strong>{invoice.issueDate}</strong></div>
              <div><span>Due date</span><strong>{invoice.dueDate}</strong></div>
            </div>
          </div>
        </div>

        <div className="invoice-print-to">
          <div className="invoice-print-to-label">Bill to</div>
          <div className="invoice-print-to-name">{client?.name}</div>
          <div className="invoice-print-to-email">{client?.email}</div>
        </div>

        <table className="invoice-print-table">
          <thead>
            <tr>
              <th>Description</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Unit Price</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td>{item.description}</td>
                <td className="text-right">{item.qty}</td>
                <td className="text-right">{invoice.currency} {Number(item.unitPrice).toFixed(2)}</td>
                <td className="text-right">{invoice.currency} {(item.qty * item.unitPrice).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="text-right invoice-total-label">Total</td>
              <td className="text-right invoice-total-amount">{invoice.currency} {total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        {invoice.notes && (
          <div className="invoice-print-notes">
            <div className="invoice-print-notes-label">Notes</div>
            <div>{invoice.notes}</div>
          </div>
        )}

        <div className="invoice-print-status">
          Status: <strong style={{ textTransform: 'uppercase' }}>{invoice.status === 'paid' ? `PAID ${invoice.paidDate ? `on ${invoice.paidDate}` : ''}` : 'UNPAID'}</strong>
        </div>
      </div>
    </div>
  );
}

export default function InvoicePage() {
  const { currentUser, getClients, getInvoices, addInvoice, updateInvoice, deleteInvoice } = useApp();
  const toast = useToast();
  const today = localToday();
  const clients = getClients(currentUser.id);
  const invoices = getInvoices(currentUser.id);

  const [tab, setTab] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [printInvoice, setPrintInvoice] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    clientId: '', issueDate: today, dueDate: '', currency: 'HKD', notes: '',
    items: [{ ...EMPTY_ITEM }],
  });

  const resetForm = () => setForm({
    clientId: '', issueDate: today, dueDate: '', currency: 'HKD', notes: '',
    items: [{ ...EMPTY_ITEM }],
  });

  const nextInvoiceNumber = () => {
    const nums = invoices.map(inv => {
      const m = inv.invoiceNumber?.match(/(\d+)$/);
      return m ? parseInt(m[1]) : 0;
    });
    const next = nums.length ? Math.max(...nums) + 1 : 1;
    return `INV-${String(next).padStart(4, '0')}`;
  };

  const formTotal = form.items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);

  const setItem = (idx, field, value) => {
    setForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.clientId) { toast('Please select a client', 'error'); return; }
    if (!form.dueDate) { toast('Please set a due date', 'error'); return; }
    if (form.items.some(i => !i.description.trim())) { toast('All items need a description', 'error'); return; }
    if (formTotal <= 0) { toast('Invoice total must be greater than zero', 'error'); return; }
    setSaving(true);
    try {
      await addInvoice({
        invoiceNumber: nextInvoiceNumber(),
        trainerId: currentUser.id,
        clientId: form.clientId,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        currency: form.currency,
        items: form.items.map(i => ({ description: i.description, qty: Number(i.qty), unitPrice: Number(i.unitPrice) })),
        status: 'unpaid',
        notes: form.notes,
        paidDate: null,
      });
      toast('Invoice created');
      setShowCreate(false);
      resetForm();
    } catch {
      toast('Failed to create invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (inv) => {
    try {
      await updateInvoice(inv.id, { status: 'paid', paidDate: today });
      toast('Marked as paid');
    } catch {
      toast('Failed to update invoice', 'error');
    }
  };

  const handleMarkUnpaid = async (inv) => {
    try {
      await updateInvoice(inv.id, { status: 'unpaid', paidDate: null });
      toast('Marked as unpaid');
    } catch {
      toast('Failed to update invoice', 'error');
    }
  };

  const handleDelete = async (inv) => {
    setDeleting(inv.id);
    try {
      await deleteInvoice(inv.id);
      toast('Invoice deleted', 'info');
    } catch {
      toast('Failed to delete invoice', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = invoices.filter(inv => {
    const s = statusLabel(inv, today);
    if (tab === 'all') return true;
    return s === tab;
  }).sort((a, b) => b.issueDate.localeCompare(a.issueDate));

  const unpaidTotal = invoices
    .filter(inv => inv.status === 'unpaid')
    .reduce((s, inv) => s + inv.items.reduce((t, i) => t + i.qty * i.unitPrice, 0), 0);
  const overdueCount = invoices.filter(inv => isOverdue(inv, today)).length;
  const paidThisMonth = invoices
    .filter(inv => inv.status === 'paid' && inv.paidDate?.startsWith(today.slice(0, 7)))
    .reduce((s, inv) => s + inv.items.reduce((t, i) => t + i.qty * i.unitPrice, 0), 0);

  const getClient = (id) => clients.find(c => c.id === id);

  const tabs = [
    { key: 'all', label: `All (${invoices.length})` },
    { key: 'unpaid', label: `Unpaid (${invoices.filter(i => statusLabel(i, today) === 'unpaid').length})` },
    { key: 'overdue', label: `Overdue (${overdueCount})` },
    { key: 'paid', label: `Paid (${invoices.filter(i => i.status === 'paid').length})` },
  ];

  if (printInvoice) {
    const client = getClient(printInvoice.clientId);
    return <InvoicePrint invoice={printInvoice} trainer={currentUser} client={client} onClose={() => setPrintInvoice(null)} />;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Track payments from your clients</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> New Invoice
        </button>
      </div>

      {/* Summary */}
      <div className="grid-3 mb-16">
        <div className="card stat-card">
          <Clock size={22} style={{ color: 'var(--warning)', marginBottom: 8 }} />
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>
            {invoices[0]?.currency || 'HKD'} {unpaidTotal.toFixed(0)}
          </div>
          <div className="stat-label">Unpaid</div>
        </div>
        <div className="card stat-card">
          <AlertCircle size={22} style={{ color: 'var(--danger)', marginBottom: 8 }} />
          <div className="stat-value">{overdueCount}</div>
          <div className="stat-label">Overdue</div>
        </div>
        <div className="card stat-card">
          <CheckCircle size={22} style={{ color: 'var(--success)', marginBottom: 8 }} />
          <div className="stat-value" style={{ fontSize: '1.2rem' }}>
            {invoices[0]?.currency || 'HKD'} {paidThisMonth.toFixed(0)}
          </div>
          <div className="stat-label">Paid This Month</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-16">
        {tabs.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={tab === 'all' ? 'No invoices yet' : `No ${tab} invoices`}
          description={tab === 'all' ? 'Create your first invoice to start tracking payments.' : `No invoices with status "${tab}".`}
          action={tab === 'all' ? { label: 'Create Invoice', onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="invoice-list">
          {filtered.map(inv => {
            const client = getClient(inv.clientId);
            const total = inv.items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
            const sl = statusLabel(inv, today);
            return (
              <div key={inv.id} className="card invoice-card">
                <div className="invoice-card-top">
                  <div className="invoice-card-left">
                    <div className="invoice-card-number">{inv.invoiceNumber}</div>
                    <div className="invoice-card-client">{client?.name || 'Unknown client'}</div>
                    <div className="invoice-card-date">Issued {inv.issueDate} · Due {inv.dueDate}</div>
                  </div>
                  <div className="invoice-card-right">
                    <div className="invoice-card-amount">{inv.currency} {total.toFixed(2)}</div>
                    <span className={`tag ${sl === 'paid' ? 'tag-accent' : sl === 'overdue' ? 'tag-danger' : 'tag-warning'}`}>
                      {sl}
                    </span>
                  </div>
                </div>
                {inv.notes && <div className="invoice-card-notes">{inv.notes}</div>}
                <div className="invoice-card-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => setPrintInvoice(inv)}>
                    <Printer size={14} /> Print / PDF
                  </button>
                  {inv.status === 'unpaid' && (
                    <button className="btn btn-sm btn-primary" onClick={() => handleMarkPaid(inv)}>
                      <CheckCircle size={14} /> Mark Paid
                    </button>
                  )}
                  {inv.status === 'paid' && (
                    <button className="btn btn-sm btn-outline" onClick={() => handleMarkUnpaid(inv)}>
                      Mark Unpaid
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-outline"
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginLeft: 'auto' }}
                    onClick={() => handleDelete(inv)}
                    disabled={deleting === inv.id}
                  >
                    <Trash2 size={14} /> {deleting === inv.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); resetForm(); }}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">New Invoice</h3>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label">Client</label>
                  <select className="form-select" required value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                    <option value="">Select client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Currency</label>
                  <select className="form-select" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Issue Date</label>
                  <input className="form-input" type="date" required value={form.issueDate} onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <input className="form-input" type="date" required value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>

              {/* Line items */}
              <div className="form-group">
                <label className="form-label">Items</label>
                {form.items.map((item, idx) => (
                  <div key={idx} className="invoice-item-row">
                    <input
                      className="form-input invoice-item-desc"
                      placeholder="Description"
                      value={item.description}
                      onChange={e => setItem(idx, 'description', e.target.value)}
                    />
                    <input
                      className="form-input invoice-item-qty"
                      type="number" min="1" placeholder="Qty"
                      value={item.qty}
                      onChange={e => setItem(idx, 'qty', e.target.value)}
                    />
                    <input
                      className="form-input invoice-item-price"
                      type="number" min="0" step="0.01" placeholder="Price"
                      value={item.unitPrice}
                      onChange={e => setItem(idx, 'unitPrice', e.target.value)}
                    />
                    {form.items.length > 1 && (
                      <button type="button" className="btn-icon" style={{ color: 'var(--danger)' }}
                        onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="btn btn-sm btn-outline mt-8"
                  onClick={() => setForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }))}>
                  <Plus size={14} /> Add Item
                </button>
                <div className="invoice-form-total">Total: {form.currency} {formTotal.toFixed(2)}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-textarea" rows={2} placeholder="Payment instructions, bank details…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => { setShowCreate(false); resetForm(); }} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
