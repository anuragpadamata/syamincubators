import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import PaymentModal from '../components/PaymentModal';

function getDateStr(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().split('T')[0];
}

export default function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hatcheryDaysBefore, setHatcheryDaysBefore] = useState(3);
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState(getDateStr());
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [groupByDate, setGroupByDate] = useState(true);
  const [expandedDates, setExpandedDates] = useState(new Set()); // Empty by default = all collapsed
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printTargetDate, setPrintTargetDate] = useState(null);
  const [printMode, setPrintMode] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [teluguMap, setTeluguMap] = useState({});
  const [allExpanded, setAllExpanded] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const navigate = useNavigate();

  const fetchCustomers = async (searchTerm = '') => {
    setLoading(true);
    try {
      const data = await api.getCustomers(searchTerm);
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
    api.getHatcheryDaysBefore().then((data) => setHatcheryDaysBefore(Number(data.value))).catch(() => {});
  }, []);

  const getHatcheryDate = (dateReceived, incubationDays) => {
    if (!dateReceived || !incubationDays) return null;
    const d = new Date(dateReceived + 'T00:00:00');
    d.setDate(d.getDate() + (incubationDays - hatcheryDaysBefore));
    return d.toISOString().split('T')[0];
  };

  const executeDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.deleteCustomer(id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return { date: '-', time: '-' };
    const d = new Date(isoStr);
    const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { date, time };
  };

  const formatDayLabel = (dateStr) => {
    const today = getDateStr(0);
    const tomorrow = getDateStr(1);
    const yesterday = getDateStr(-1);

    if (dateStr === today) return 'Today';
    if (dateStr === tomorrow) return 'Tomorrow';
    if (dateStr === yesterday) return 'Yesterday';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const isOverdue = (deliveryDate) => {
    if (!deliveryDate) return false;
    return new Date(deliveryDate) < new Date(new Date().toISOString().split('T')[0]);
  };

  const dailySerial = useMemo(() => {
    const groups = {};
    customers.forEach((c) => {
      if (!groups[c.date_received]) groups[c.date_received] = [];
      groups[c.date_received].push(c);
    });
    const map = {};
    Object.values(groups).forEach((group) => {
      group.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
      group.forEach((c, i) => { map[c.id] = i + 1; });
    });
    return map;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter((c) =>
        String(c.customer_name || '').toLowerCase().includes(term) ||
        String(c.village_city || '').toLowerCase().includes(term) ||
        String(c.mobile_number || '').includes(term) ||
        String(c.alt_phone || '').includes(term) ||
        String(c.egg_mark || '').toLowerCase().includes(term) ||
        String(c.customerId || '').toLowerCase().includes(term)
      );
    }

    if (dateFilter === 'range') {
      if (rangeFrom) result = result.filter((c) => c.date_received >= rangeFrom);
      if (rangeTo) result = result.filter((c) => c.date_received <= rangeTo);
    } else if (dateFilter !== 'all') {
      let targetDate;
      if (dateFilter === 'today') targetDate = getDateStr(0);
      else if (dateFilter === 'yesterday') targetDate = getDateStr(-1);
      else if (dateFilter === 'tomorrow') targetDate = getDateStr(1);
      else if (dateFilter === 'custom') targetDate = customDate;
      if (targetDate) result = result.filter((c) => c.date_received === targetDate);
    }

    result.sort((a, b) => {
      const cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
      return sortOrder === 'newest' ? -cmp : cmp;
    });

    return result;
  }, [customers, search, dateFilter, customDate, rangeFrom, rangeTo, sortOrder]);

  const groupedByDate = useMemo(() => {
    const groups = {};
    filteredCustomers.forEach((c) => {
      if (!groups[c.date_received]) groups[c.date_received] = [];
      groups[c.date_received].push(c);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => sortOrder === 'newest' ? b.localeCompare(a) : a.localeCompare(b))
      .map(([date, custs]) => ({
        date,
        customers: custs,
        totalEggs: custs.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0),
        totalAmount: custs.reduce((sum, c) => sum + Number(c.total_amount || 0), 0),
        totalPaid: custs.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0),
        totalBalance: custs.reduce((sum, c) => sum + Number(c.balance || 0), 0),
        hatcheryDate: getHatcheryDate(date, custs[0].incubation_days),
        deliveryDate: custs[0].deliveryDate,
      }));
  }, [filteredCustomers, sortOrder]);

  const toggleCard = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleAllCards = () => {
    if (allExpanded) {
      setExpandedCards({});
      setAllExpanded(false);
    } else {
      const all = {};
      filteredCustomers.forEach((c) => { all[c.id] = true; });
      setExpandedCards(all);
      setAllExpanded(true);
    }
  };

  const toggleDateExpand = (date) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const expandAllDates = () => {
    setExpandedDates(new Set(groupedByDate.map((g) => g.date)));
  };

  const collapseAllDates = () => {
    setExpandedDates(new Set());
  };

  const activePrintDate = useMemo(() => {
    if (printTargetDate) return printTargetDate;
    if (dateFilter === 'yesterday') return getDateStr(-1);
    if (dateFilter === 'tomorrow') return getDateStr(1);
    if (dateFilter === 'custom' && customDate) return customDate;
    return getDateStr(0); // Default to Today
  }, [printTargetDate, dateFilter, customDate]);

  const targetDayDate = activePrintDate;

  const dayPrintCustomers = useMemo(() => {
    let list = customers.filter((c) => c.date_received === activePrintDate);
    return list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }, [customers, activePrintDate]);

  const handlePrint = async (mode) => {
    setShowPrintDialog(false);
    if (mode === 'labels' || mode === 'labels-telugu') {
      if (dayPrintCustomers.length === 0) {
        alert(`No sales found for ${formatDayLabel(activePrintDate)} (${formatDate(activePrintDate)}) to print slips.`);
        return;
      }
    }
    if (mode === 'labels-telugu') {
      const texts = [];
      dayPrintCustomers.forEach((c) => {
        texts.push(c.customer_name, c.village_city, c.egg_mark || '');
      });
      try {
        const { results } = await api.transliterate(texts.filter(Boolean));
        setTeluguMap(results);
      } catch (err) {
        console.error('Transliteration failed:', err);
      }
    }
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 100);
  };

  const renderLabelSlip = (customer, isTelugu = false) => {
    if (!customer) {
      return <div className="label-card label-card-empty" />;
    }

    const t = (text) => teluguMap[text] || text;
    const name = isTelugu ? t(customer.customer_name) : customer.customer_name;
    const village = isTelugu ? t(customer.village_city) : customer.village_city;
    const eggMark = customer.egg_mark ? (isTelugu ? t(customer.egg_mark) : customer.egg_mark) : '-';
    const hatcheryDate = formatDate(getHatcheryDate(customer.date_received, customer.incubation_days));
    const deliveryDate = formatDate(customer.deliveryDate);
    const paid = Number(customer.amount_paid || 0).toFixed(2);
    const balance = Number(customer.balance || 0).toFixed(2);
    const isSeal = customer.seal === 'Yes';
    const keyWidth = isTelugu ? '100px' : '85px';

    return (
      <div
        className={`label-card ${isTelugu ? 'label-card-telugu' : ''}`}
        style={{ textAlign: 'left', alignItems: 'stretch' }}
      >
        {isSeal && (
          <div
            className="label-seal-top"
            style={{
              textAlign: 'center',
              fontWeight: 900,
              fontSize: '1.35rem',
              letterSpacing: '3px',
              color: '#000',
              border: '2.5px solid #000',
              padding: '2px 0',
              borderRadius: '4px',
              display: 'block',
              background: '#e2e8f0',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: '3px',
              textTransform: 'uppercase',
            }}
          >
            ★ {isTelugu ? 'సీల్ / SEAL' : 'SEAL'} ★
          </div>
        )}
        <div
          className="label-name"
          style={{ textAlign: 'center', width: '100%', fontSize: '1.3rem', fontWeight: 800 }}
        >
          {name}
        </div>
        <div className="label-row" style={{ display: 'flex', alignItems: 'baseline', margin: '1px 0' }}>
          <span className="label-key" style={{ minWidth: keyWidth, width: keyWidth, fontWeight: 700, color: '#111' }}>
            {isTelugu ? 'గ్రామం:' : 'Village:'}
          </span>
          <span className="label-val" style={{ flex: 1, paddingLeft: 10, fontWeight: 600 }}>
            {village}
          </span>
        </div>
        <div className="label-row" style={{ display: 'flex', alignItems: 'baseline', margin: '1px 0' }}>
          <span className="label-key" style={{ minWidth: keyWidth, width: keyWidth, fontWeight: 700, color: '#111' }}>
            {isTelugu ? 'ఫోన్:' : 'Phone:'}
          </span>
          <span className="label-val" style={{ flex: 1, paddingLeft: 10, fontWeight: 600 }}>
            {customer.mobile_number || '-'}{customer.alt_phone ? ` / ${customer.alt_phone}` : ''}
          </span>
        </div>
        <div className="label-row" style={{ display: 'flex', alignItems: 'baseline', margin: '1px 0' }}>
          <span className="label-key" style={{ minWidth: keyWidth, width: keyWidth, fontWeight: 700, color: '#111' }}>
            {isTelugu ? 'గుడ్లు:' : 'Eggs:'}
          </span>
          <span className="label-val" style={{ flex: 1, paddingLeft: 10, fontWeight: 600 }}>
            {customer.num_eggs}
          </span>
        </div>
        <div className="label-row" style={{ display: 'flex', alignItems: 'baseline', margin: '1px 0' }}>
          <span className="label-key" style={{ minWidth: keyWidth, width: keyWidth, fontWeight: 700, color: '#111' }}>
            {isTelugu ? 'గుర్తు:' : 'Mark:'}
          </span>
          <span className="label-val" style={{ flex: 1, paddingLeft: 10, fontWeight: 600 }}>
            {eggMark}
          </span>
        </div>
        <div className="label-row" style={{ display: 'flex', alignItems: 'baseline', margin: '1px 0' }}>
          <span className="label-key" style={{ minWidth: keyWidth, width: keyWidth, fontWeight: 700, color: '#111' }}>
            {isTelugu ? 'హ్యాచరీ:' : 'Hatchery:'}
          </span>
          <span className="label-val" style={{ flex: 1, paddingLeft: 10, fontWeight: 600 }}>
            {hatcheryDate}
          </span>
        </div>
        <div className="label-row" style={{ display: 'flex', alignItems: 'baseline', margin: '1px 0' }}>
          <span className="label-key" style={{ minWidth: keyWidth, width: keyWidth, fontWeight: 700, color: '#111' }}>
            {isTelugu ? 'డెలివరీ:' : 'Delivery:'}
          </span>
          <span className="label-val" style={{ flex: 1, paddingLeft: 10, fontWeight: 600 }}>
            {deliveryDate}
          </span>
        </div>
        <div className="label-row" style={{ display: 'flex', alignItems: 'baseline', margin: '1px 0' }}>
          <span className="label-key" style={{ minWidth: keyWidth, width: keyWidth, fontWeight: 700, color: '#111' }}>
            {isTelugu ? 'చెల్లించినది:' : 'Paid:'}
          </span>
          <span className="label-val" style={{ flex: 1, paddingLeft: 10, fontWeight: 600 }}>
            {paid}
          </span>
        </div>
        <div className="label-row" style={{ display: 'flex', alignItems: 'baseline', margin: '1px 0' }}>
          <span className="label-key" style={{ minWidth: keyWidth, width: keyWidth, fontWeight: 700, color: '#111' }}>
            {isTelugu ? 'బాకీ:' : 'Balance:'}
          </span>
          <span className="label-val" style={{ flex: 1, paddingLeft: 10, fontWeight: 600 }}>
            {balance}
          </span>
        </div>
      </div>
    );
  };

  const renderCustomerTable = (list) => {
    const listTotalEggs = list.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
    const listTotalAmount = list.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
    const listTotalPaid = list.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
    const listTotalBalance = list.reduce((sum, c) => sum + Number(c.balance || 0), 0);

    const totalCellStyle = {
      background: '#f1f5f9',
      borderTop: '2px solid #94a3b8',
      borderBottom: '2px solid #94a3b8',
      padding: '5px 4px',
      verticalAlign: 'middle',
      fontWeight: 700,
      fontSize: '0.78rem',
    };

    return (
      <div className="table-container">
        <table>
          <thead>
          <tr>
            <th>S.No</th>
            <th>ID</th>
            <th>Customer Name</th>
            <th>Eggs</th>
            <th>Village</th>
            <th>Mobile</th>
            <th>Alt Phone</th>
            <th>Mark</th>
            <th>Seal</th>
            <th>Received</th>
            <th>Hatchery</th>
            <th>Delivery</th>
            <th>Amount</th>
            <th>Paid</th>
            <th>Balance</th>
            <th style={{ minWidth: 90, maxWidth: 130, padding: '4px 6px' }}>Notes</th>
            <th style={{ width: 62, minWidth: 62, textAlign: 'center', padding: '4px 2px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} className={isOverdue(c.deliveryDate) ? 'row-overdue' : ''}>
              <td><strong>#{dailySerial[c.id]}</strong></td>
              <td><strong>{c.customerId}</strong></td>
              <td>
                <strong>{c.customer_name}</strong>
              </td>
              <td>
                <span className="badge">{c.num_eggs}</span>
                {c.egg_age_days !== undefined && c.egg_age_days !== '' && c.egg_age_days !== null && (
                  <div style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {c.egg_age_days}d old
                  </div>
                )}
              </td>
              <td>{c.village_city}</td>
              <td>
                <a href={`tel:${c.mobile_number}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                  {c.mobile_number}
                </a>
              </td>
              <td>
                {c.alt_phone ? (
                  <a href={`tel:${c.alt_phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    {c.alt_phone}
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8' }}>-</span>
                )}
              </td>
              <td>{c.egg_mark || '-'}</td>
              <td>{c.seal === 'Yes' ? <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>SEAL</span> : <span style={{ color: '#94a3b8' }}>No</span>}</td>
              <td>
                <div>{formatDate(c.date_received)}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{c.incubation_days}d</div>
              </td>
              <td>{formatDate(getHatcheryDate(c.date_received, c.incubation_days))}</td>
              <td className={isOverdue(c.deliveryDate) ? 'overdue' : ''}>
                {formatDate(c.deliveryDate)}
              </td>
              <td>{Number(c.total_amount || 0).toFixed(2)}</td>
              <td>{Number(c.amount_paid || 0).toFixed(2)}</td>
              <td className={Number(c.balance || 0) > 0 ? 'overdue' : 'paid-clear'}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <strong>{Number(c.balance || 0).toFixed(2)}</strong>
                  {Number(c.balance || 0) > 0 && (
                    <button
                      style={{
                        padding: '1px 6px',
                        fontSize: '0.68rem',
                        background: '#16a34a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 3,
                        cursor: 'pointer',
                        fontWeight: 700,
                        minHeight: 'unset',
                        height: 20,
                        lineHeight: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onClick={() => setPaymentCustomer(c)}
                      title="Collect Payment"
                    >
                      Pay
                    </button>
                  )}
                </div>
              </td>
              <td style={{ minWidth: 90, maxWidth: 130, whiteSpace: 'normal', verticalAlign: 'middle', padding: '4px 6px' }}>
                {c.notes ? (
                  <div style={{ fontSize: '0.74rem', color: '#1e293b', lineHeight: 1.25, wordBreak: 'break-word', background: '#f8fafc', padding: '2px 5px', borderRadius: 4, border: '1px solid #e2e8f0', display: 'inline-block' }}>
                    📝 {c.notes}
                  </div>
                ) : (
                  <span style={{ color: '#94a3b8' }}>-</span>
                )}
              </td>
              <td className="actions" style={{ width: 62, minWidth: 62, boxSizing: 'border-box', verticalAlign: 'middle', padding: '4px 2px' }}>
                {confirmDeleteId === c.id ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <button
                      className="btn btn-sm btn-danger"
                      style={{ width: 32, height: 32, padding: 0, fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => executeDelete(c.id)}
                      disabled={deletingId === c.id}
                      title="Yes, delete"
                    >
                      {deletingId === c.id ? '...' : 'Yes'}
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ width: 32, height: 32, padding: 0, fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deletingId === c.id}
                      title="Cancel"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <>
                    <button className="btn-icon" onClick={() => navigate(`/customers/${c.id}/edit`)} title="Edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                    </button>
                    <button className="btn-icon btn-icon-danger" onClick={() => setConfirmDeleteId(c.id)} title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...totalCellStyle, fontWeight: 800, color: '#0f172a' }}>TOTAL</td>
            <td style={{ ...totalCellStyle, color: '#475569', fontWeight: 600 }}>{list.length} {list.length === 1 ? 'order' : 'orders'}</td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
            <td style={{ ...totalCellStyle }}>
              <span className="badge" style={{ background: '#3b82f6', color: '#fff', fontWeight: 800 }}>
                {listTotalEggs}
              </span>
            </td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
            <td style={{ ...totalCellStyle, color: '#047857', fontWeight: 800, fontSize: '0.88rem' }}>
              Rs {listTotalAmount.toFixed(2)}
            </td>
            <td style={{ ...totalCellStyle, color: '#15803d', fontWeight: 800, fontSize: '0.88rem' }}>
              Rs {listTotalPaid.toFixed(2)}
            </td>
            <td style={{ ...totalCellStyle, color: listTotalBalance > 0 ? '#dc2626' : '#16a34a', fontWeight: 800, fontSize: '0.88rem' }}>
              Rs {listTotalBalance.toFixed(2)}
            </td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
            <td style={{ ...totalCellStyle, color: '#94a3b8' }}>-</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

  const renderCustomerCards = (list) => (
    <div className="card-list">
      {list.map((c) => (
        <div key={c.id} className={`card ${isOverdue(c.deliveryDate) ? 'card-overdue' : ''}`}>
          <div className="card-header" onClick={() => toggleCard(c.id)} style={{ cursor: 'pointer' }}>
            <strong>#{dailySerial[c.id]} {c.customerId} {c.customer_name}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {c.seal === 'Yes' && (
                <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  SEAL
                </span>
              )}
              <span className="badge">{c.num_eggs} eggs</span>
              <span className={`card-chevron ${expandedCards[c.id] ? 'open' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </span>
            </div>
          </div>
          {expandedCards[c.id] && (
            <>
              <div className="card-body">
                <p><span className="label">Order:</span> {formatDateTime(c.createdAt).date} {formatDateTime(c.createdAt).time}</p>
                <p><span className="label">Village/City:</span> {c.village_city}</p>
                <p>
                  <span className="label">Mobile:</span>{' '}
                  <a href={`tel:${c.mobile_number}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                    📞 {c.mobile_number}
                  </a>
                  {c.alt_phone && (
                    <span style={{ marginLeft: 8, color: '#64748b', fontSize: '0.85rem' }}>
                      (Alt: <a href={`tel:${c.alt_phone}`} style={{ color: 'inherit', textDecoration: 'none' }}>{c.alt_phone}</a>)
                    </span>
                  )}
                </p>
                <p>
                  <span className="label">Eggs:</span> <strong>{c.num_eggs}</strong>
                  {c.egg_age_days !== undefined && c.egg_age_days !== '' && c.egg_age_days !== null && (
                    <span style={{ marginLeft: 8, color: '#64748b', fontSize: '0.85rem' }}>
                      (Egg Age: <strong>{c.egg_age_days} days old</strong>)
                    </span>
                  )}
                </p>
                {c.egg_mark && <p><span className="label">Egg Mark:</span> {c.egg_mark}</p>}
                <p><span className="label">Seal:</span> <strong>{c.seal === 'Yes' ? 'Yes' : 'No'}</strong></p>
                <p><span className="label">Received:</span> {formatDate(c.date_received)}</p>
                <p><span className="label">Incubation:</span> {c.incubation_days} days</p>
                <p><span className="label">Hatchery:</span> {formatDate(getHatcheryDate(c.date_received, c.incubation_days))}</p>
                <p className={isOverdue(c.deliveryDate) ? 'overdue' : ''}>
                  <span className="label">Delivery:</span> {formatDate(c.deliveryDate)}
                </p>
                <p><span className="label">Amount:</span> Rs {Number(c.total_amount || 0).toFixed(2)}</p>
                <p><span className="label">Paid:</span> Rs {Number(c.amount_paid || 0).toFixed(2)}</p>
                {c.notes && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '6px 10px', margin: '6px 0', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Notes:</span> {c.notes}
                  </div>
                )}
                <div className={Number(c.balance || 0) > 0 ? 'overdue' : 'paid-clear'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <p style={{ margin: 0 }}>
                    <span className="label">Balance:</span> <strong>Rs {Number(c.balance || 0).toFixed(2)}</strong>
                  </p>
                  {Number(c.balance || 0) > 0 && (
                    <button
                      className="btn btn-sm"
                      style={{ padding: '3px 10px', fontSize: '0.8rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                      onClick={() => setPaymentCustomer(c)}
                    >
                      Pay Rs {Number(c.balance || 0).toFixed(2)}
                    </button>
                  )}
                </div>
              </div>
              <div className="card-actions">
                {confirmDeleteId === c.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#dc2626' }}>Delete?</span>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => executeDelete(c.id)}
                      disabled={deletingId === c.id}
                    >
                      {deletingId === c.id ? 'Deleting...' : 'Yes'}
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deletingId === c.id}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <>
                    <button className="btn btn-sm" onClick={() => navigate(`/customers/${c.id}/edit`)}>Edit</button>
                    <button className="btn btn-sm btn-danger" onClick={() => setConfirmDeleteId(c.id)}>Delete</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className={`page ${printMode ? 'print-mode-' + printMode : ''}`}>
      <div className="page-header no-print">
        <h2>Sales</h2>
      </div>

      <div className="search-bar no-print">
        <input
          type="text"
          placeholder="Search by name, village, or mobile..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="filter-bar no-print">
        <div className="filter-buttons">
          {['all', 'today', 'yesterday', 'tomorrow'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${dateFilter === f ? 'active' : ''}`}
              onClick={() => setDateFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          <input
            type="date"
            className="filter-date"
            value={customDate}
            onChange={(e) => { setCustomDate(e.target.value); setDateFilter('custom'); }}
          />
          <button
            className={`filter-btn ${dateFilter === 'range' ? 'active' : ''}`}
            onClick={() => setDateFilter('range')}
          >
            Range
          </button>
        </div>
        {dateFilter === 'range' && (
          <div className="filter-range">
            <label>From:</label>
            <input type="date" className="filter-date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} />
            <label>To:</label>
            <input type="date" className="filter-date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            className={`filter-btn ${groupByDate ? 'active' : ''}`}
            onClick={() => setGroupByDate(!groupByDate)}
            title="Toggle Group by Date"
          >
            Group by Date
          </button>
          <button
            className="sort-btn"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          >
            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
          </button>
          <button className="sort-btn" onClick={() => { setPrintTargetDate(null); setShowPrintDialog(true); }}>Print</button>
        </div>
      </div>

      <div className="print-section-separate">
        {groupedByDate.map((group, gi) => (
          <div key={group.date} className={`print-page ${gi < groupedByDate.length - 1 ? 'print-page-break' : ''}`}>
            <div className="print-header">
              <div className="print-header-center">
                <h2>Syam Incubators</h2>
                <p className="print-date">{formatDate(group.date)}</p>
                <p className="print-count">({group.customers.length} orders)</p>
              </div>
              <div className="print-header-right">
                <p>Hatching: {formatDate(group.hatcheryDate)}</p>
                <p>Delivery: {formatDate(group.deliveryDate)}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Customer ID</th>
                  <th>Order Date</th>
                  <th>Order Time</th>
                  <th>Customer Name</th>
                  <th>Eggs</th>
                  <th>Village / City</th>
                  <th>Mobile</th>
                  <th>Alt Phone</th>
                  <th>Egg Mark</th>
                  <th>Seal</th>
                  <th>Date Received</th>
                  <th>Days</th>
                  <th>Hatchery Date</th>
                  <th>Delivery Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {group.customers.map((c) => (
                  <tr key={c.id} className={isOverdue(c.deliveryDate) ? 'row-overdue' : ''}>
                    <td>{dailySerial[c.id]}</td>
                    <td>{c.customerId}</td>
                    <td>{formatDateTime(c.createdAt).date}</td>
                    <td>{formatDateTime(c.createdAt).time}</td>
                    <td>{c.customer_name}</td>
                    <td>{c.num_eggs}</td>
                    <td>{c.village_city}</td>
                    <td>{c.mobile_number}</td>
                    <td>{c.alt_phone || '-'}</td>
                    <td>{c.egg_mark || '-'}</td>
                    <td>{c.seal === 'Yes' ? <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>SEAL</span> : <span style={{ color: '#94a3b8' }}>No</span>}</td>
                    <td>{formatDate(c.date_received)}</td>
                    <td>{c.incubation_days}</td>
                    <td>{formatDate(getHatcheryDate(c.date_received, c.incubation_days))}</td>
                    <td className={isOverdue(c.deliveryDate) ? 'overdue' : ''}>
                      {formatDate(c.deliveryDate)}
                    </td>
                    <td>{Number(c.total_amount || 0).toFixed(2)}</td>
                    <td>{Number(c.amount_paid || 0).toFixed(2)}</td>
                    <td className={Number(c.balance || 0) > 0 ? 'overdue' : 'paid-clear'}>
                      {Number(c.balance || 0).toFixed(2)}
                    </td>
                    <td>{c.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="print-section-single">
        <div className="print-header">
          <div className="print-header-center">
            <h2>Syam Incubators</h2>
            <p className="print-date">Sales Report — {printTargetDate ? `${formatDayLabel(printTargetDate)} (${formatDate(printTargetDate)})` : (dateFilter === 'all' ? 'All Orders' : dateFilter === 'custom' ? formatDate(customDate) : dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1))}</p>
            <p className="print-count">({(printTargetDate ? dayPrintCustomers : filteredCustomers).length} orders)</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Customer ID</th>
              <th>Order Date</th>
              <th>Order Time</th>
              <th>Customer Name</th>
              <th>Eggs</th>
              <th>Village / City</th>
              <th>Mobile</th>
              <th>Alt Phone</th>
              <th>Egg Mark</th>
              <th>Date Received</th>
              <th>Days</th>
              <th>Hatchery Date</th>
              <th>Delivery Date</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {(printTargetDate ? dayPrintCustomers : filteredCustomers).map((c) => (
              <tr key={c.id} className={isOverdue(c.deliveryDate) ? 'row-overdue' : ''}>
                <td>{dailySerial[c.id]}</td>
                <td>{c.customerId}</td>
                <td>{formatDateTime(c.createdAt).date}</td>
                <td>{formatDateTime(c.createdAt).time}</td>
                <td>{c.customer_name}</td>
                <td>{c.num_eggs}</td>
                <td>{c.village_city}</td>
                <td>{c.mobile_number}</td>
                <td>{c.alt_phone || '-'}</td>
                <td>{c.egg_mark || '-'}</td>
                <td>{formatDate(c.date_received)}</td>
                <td>{c.incubation_days}</td>
                <td>{formatDate(getHatcheryDate(c.date_received, c.incubation_days))}</td>
                <td className={isOverdue(c.deliveryDate) ? 'overdue' : ''}>
                  {formatDate(c.deliveryDate)}
                </td>
                <td>{Number(c.total_amount || 0).toFixed(2)}</td>
                <td>{Number(c.amount_paid || 0).toFixed(2)}</td>
                <td className={Number(c.balance || 0) > 0 ? 'overdue' : 'paid-clear'}>
                  {Number(c.balance || 0).toFixed(2)}
                </td>
                <td>{c.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2 COLUMNS x 4 ROWS LABELS (ENGLISH) - TODAY'S SALES ONLY */}
      <div className="print-section-labels">
        {Array.from({ length: Math.ceil(dayPrintCustomers.length / 8) }, (_, pi) => {
          const pageCustomers = dayPrintCustomers.slice(pi * 8, pi * 8 + 8);
          const rows = [];
          for (let r = 0; r < 4; r++) {
            rows.push({
              left: pageCustomers[r * 2] || null,
              right: pageCustomers[r * 2 + 1] || null,
            });
          }

          return (
            <div key={pi} className="label-grid-page">
              {rows.map((row, ri) => (
                <React.Fragment key={'en-single-' + ri}>
                  {renderLabelSlip(row.left, false)}
                  {renderLabelSlip(row.right, false)}
                </React.Fragment>
              ))}
            </div>
          );
        })}
      </div>

      {/* DOUBLE-SIDED LABELS: SIDE 1 (ENGLISH) & SIDE 2 (TELUGU) IN 2 COLUMNS x 4 ROWS - TODAY'S SALES ONLY */}
      <div className="print-section-labels-telugu">
        {Array.from({ length: Math.ceil(dayPrintCustomers.length / 8) }, (_, pi) => {
          const pageCustomers = dayPrintCustomers.slice(pi * 8, pi * 8 + 8);
          const rows = [];
          for (let r = 0; r < 4; r++) {
            rows.push({
              left: pageCustomers[r * 2] || null,
              right: pageCustomers[r * 2 + 1] || null,
            });
          }

          return (
            <React.Fragment key={pi}>
              {/* SIDE 1: ENGLISH (2 cols x 4 rows) */}
              <div className="label-grid-page">
                {rows.map((row, ri) => (
                  <React.Fragment key={'en-' + ri}>
                    {renderLabelSlip(row.left, false)}
                    {renderLabelSlip(row.right, false)}
                  </React.Fragment>
                ))}
              </div>

              {/* SIDE 2: TELUGU (Mirrored horizontally for double-sided alignment) */}
              <div className="label-grid-page">
                {rows.map((row, ri) => (
                  <React.Fragment key={'te-' + ri}>
                    {renderLabelSlip(row.right, true)}
                    {renderLabelSlip(row.left, true)}
                  </React.Fragment>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {showPrintDialog && (
        <div className="print-dialog-overlay" onClick={() => setShowPrintDialog(false)}>
          <div className="print-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>
              {printTargetDate
                ? `Print Slips — ${formatDayLabel(printTargetDate)} (${formatDate(printTargetDate)})`
                : 'Print Options'}
            </h3>
            {printTargetDate ? (
              <>
                <button className="btn btn-primary" onClick={() => handlePrint('labels-telugu')}>
                  Day Print (Telugu) — Double-sided ({dayPrintCustomers.length} {dayPrintCustomers.length === 1 ? 'slip' : 'slips'})
                </button>
                <button className="btn btn-primary" onClick={() => handlePrint('labels')}>
                  Day Print (Labels) — English ({dayPrintCustomers.length} {dayPrintCustomers.length === 1 ? 'slip' : 'slips'})
                </button>
                <button className="btn btn-primary" onClick={() => handlePrint('single')}>
                  Table Report ({dayPrintCustomers.length} {dayPrintCustomers.length === 1 ? 'order' : 'orders'})
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => handlePrint('labels-telugu')}>
                  Day Print (Telugu) — Double-sided ({dayPrintCustomers.length} {dayPrintCustomers.length === 1 ? 'slip' : 'slips'})
                </button>
                <button className="btn btn-primary" onClick={() => handlePrint('labels')}>
                  Day Print (Labels) — English ({dayPrintCustomers.length} {dayPrintCustomers.length === 1 ? 'slip' : 'slips'})
                </button>
                <button className="btn btn-primary" onClick={() => handlePrint('single')}>Single Page (All Filtered)</button>
                <button className="btn btn-primary" onClick={() => handlePrint('separate')}>Separate Pages (per date)</button>
              </>
            )}
            <button className="btn" onClick={() => setShowPrintDialog(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="no-print">
        {loading ? (
          <p>Loading...</p>
        ) : filteredCustomers.length === 0 ? (
          <p className="empty-msg">{customers.length === 0 ? 'No customers found. Add your first customer!' : 'No orders for this filter.'}</p>
        ) : groupByDate ? (
          <div className="sales-grouped">
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginBottom: 14 }}>
              <button
                type="button"
                onClick={expandAllDates}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '3px 12px',
                  fontSize: '0.78rem',
                  height: 26,
                  minHeight: 'unset',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title="Expand all date groups"
              >
                <span>📂</span> Expand All
              </button>
              <button
                type="button"
                onClick={collapseAllDates}
                className="btn btn-secondary btn-sm"
                style={{
                  padding: '3px 12px',
                  fontSize: '0.78rem',
                  height: 26,
                  minHeight: 'unset',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title="Collapse all date groups"
              >
                <span>📁</span> Collapse All
              </button>
            </div>

            {groupedByDate.map((group) => {
              const isExpanded = expandedDates.has(group.date);
              const isCollapsed = !isExpanded;
              return (
                <div key={group.date} className="hatchery-day-group" style={{ marginBottom: isCollapsed ? 10 : 24 }}>
                  <div
                    className="hatchery-day-header"
                    onClick={() => toggleDateExpand(group.date)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      cursor: 'pointer',
                      userSelect: 'none',
                      padding: '8px 12px',
                      background: isCollapsed ? '#f8fafc' : '#f1f5f9',
                      borderRadius: isCollapsed ? 6 : '6px 6px 0 0',
                      border: '1px solid #e2e8f0',
                      marginBottom: isCollapsed ? 0 : 8,
                      transition: 'all 0.15s ease',
                    }}
                    title={isCollapsed ? 'Click to expand this date' : 'Click to collapse this date'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#475569',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: '#e2e8f0',
                          fontWeight: 'bold',
                          transition: 'transform 0.2s ease',
                          transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                        }}
                      >
                        ▼
                      </span>
                      <span className={`hatchery-day-label ${group.date === getDateStr(0) ? 'today' : ''}`}>
                        {formatDayLabel(group.date)}
                      </span>
                      <span className="hatchery-day-date" style={{ fontWeight: 600 }}>{formatDate(group.date)}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        (Hatchery: {formatDate(group.hatcheryDate)} | Delivery: {formatDate(group.deliveryDate)})
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span
                        className="badge"
                        style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          border: '1px solid #a7f3d0',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 10px',
                          borderRadius: 12,
                        }}
                        title="Total sales value for this day"
                      >
                        💰 Total: Rs {Number(group.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span
                        className="badge"
                        style={{
                          background: '#f8fafc',
                          color: '#15803d',
                          border: '1px solid #dcfce7',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 10px',
                          borderRadius: 12,
                        }}
                        title="Total cash collected for this day"
                      >
                        Paid: Rs {Number(group.totalPaid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      {Number(group.totalBalance || 0) > 0 && (
                        <span
                          className="badge"
                          style={{
                            background: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 10px',
                            borderRadius: 12,
                          }}
                          title="Total balance due for this day"
                        >
                          Due: Rs {Number(group.totalBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      )}
                      <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b', fontWeight: 600, fontSize: '0.8rem', padding: '3px 10px', borderRadius: 12 }}>
                        {group.totalEggs} eggs
                      </span>
                      <span className="hatchery-count" style={{ fontSize: '0.8rem', padding: '3px 10px', borderRadius: 12 }}>
                        {group.customers.length} orders
                      </span>
                      <button
                        style={{
                          background: 'var(--primary)',
                          color: '#fff',
                          border: 'none',
                          padding: '3px 12px',
                          borderRadius: 12,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          minHeight: 'unset',
                          lineHeight: '1.4',
                          boxShadow: 'none',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPrintTargetDate(group.date);
                          setShowPrintDialog(true);
                        }}
                        title={`Print Slips for ${formatDayLabel(group.date)} (${formatDate(group.date)})`}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 6 2 18 2 18 9"></polyline>
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                          <rect x="6" y="14" width="12" height="8"></rect>
                        </svg>
                        <span>Print Slips</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDateExpand(group.date);
                        }}
                        style={{
                          padding: '1px 8px',
                          fontSize: '0.72rem',
                          height: 22,
                          minHeight: 'unset',
                          lineHeight: '20px',
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          color: '#475569',
                          cursor: 'pointer',
                          borderRadius: 4,
                        }}
                      >
                        {isCollapsed ? 'Expand ▾' : 'Collapse ▴'}
                      </button>
                    </div>
                  </div>
                  {!isCollapsed && (
                    <>
                      {renderCustomerTable(group.customers)}
                      {renderCustomerCards(group.customers)}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {renderCustomerTable(filteredCustomers)}
            {renderCustomerCards(filteredCustomers)}
          </>
        )}
      </div>
      {paymentCustomer && (
        <PaymentModal
          customer={paymentCustomer}
          onClose={() => setPaymentCustomer(null)}
          onSuccess={(updated) => {
            setCustomers((prev) => prev.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
          }}
        />
      )}
    </div>
  );
}
