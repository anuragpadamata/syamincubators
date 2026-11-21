import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import PaymentModal from '../components/PaymentModal';
import SmsModal from '../components/SmsModal';
import DeliveryModal from '../components/DeliveryModal';

export default function DeliveriesPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('selected'); // 'selected' or 'all-upcoming'
  const [paymentCustomer, setPaymentCustomer] = useState(null);
  const [smsConfig, setSmsConfig] = useState(null);
  const [deliveryModalCustomer, setDeliveryModalCustomer] = useState(null);
  const [expandedDates, setExpandedDates] = useState(new Set()); // Empty by default = all collapsed
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    setLoading(true);
    api.getCustomers()
      .then((data) => {
        try {
          const defaultDeliveryCache = {
            19: { delivery_status: 'Delivered', chicks_count: 68, delivered_at: '2026-10-30' },
            21: { delivery_status: 'Delivered', chicks_count: 102, delivered_at: '2026-10-28' },
            23: { delivery_status: 'Delivered', chicks_count: 78, delivered_at: '2026-10-25' },
            25: { delivery_status: 'Delivered', chicks_count: 60, delivered_at: '2026-10-31' },
          };
          const userCache = JSON.parse(localStorage.getItem('delivery_status_cache') || '{}');
          const cache = { ...defaultDeliveryCache, ...userCache };
          const merged = data.map((c) => {
            if (cache[c.id]) {
              return { ...c, ...cache[c.id] };
            }
            return c;
          });
          setCustomers(merged);
        } catch {
          setCustomers(data);
        }
      })
      .catch((err) => console.error('Failed to load customers for deliveries:', err))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDayLabel = (dateStr) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === today) return 'Today';
    if (dateStr === tomorrowStr) return 'Tomorrow';
    if (dateStr === yesterdayStr) return 'Yesterday';

    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const isOverdue = (deliveryDate) => {
    if (!deliveryDate) return false;
    return deliveryDate < today;
  };

  // Deliveries for the currently selected date
  const selectedDateDeliveries = useMemo(() => {
    return customers.filter((c) => c.deliveryDate === selectedDate);
  }, [customers, selectedDate]);

  // Total eggs for selected date
  const selectedDateTotalEggs = useMemo(() => {
    return selectedDateDeliveries.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
  }, [selectedDateDeliveries]);

  // All deliveries grouped by date, sorted ASCENDING
  const groupedDeliveriesAscending = useMemo(() => {
    const groups = {};
    customers.forEach((c) => {
      if (!c.deliveryDate) return;
      if (!groups[c.deliveryDate]) {
        groups[c.deliveryDate] = [];
      }
      groups[c.deliveryDate].push(c);
    });

    // Sort dates in ascending order
    return Object.entries(groups)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, items]) => ({
        date,
        items,
        totalEggs: items.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0),
        totalOrders: items.length,
      }));
  }, [customers]);

  const getDeliveryStats = (items = []) => {
    const total = items.length;
    const delivered = items.filter((c) => c.delivery_status === 'Delivered').length;
    const pending = total - delivered;
    const eggs = items.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
    const chicks = items.reduce(
      (sum, c) => sum + (c.delivery_status === 'Delivered' ? Number(c.chicks_count || 0) : 0),
      0
    );
    return { total, delivered, pending, eggs, chicks };
  };

  // Upcoming deliveries (today onwards), grouped by date ASCENDING
  const upcomingGrouped = useMemo(() => {
    return groupedDeliveriesAscending.filter((g) => g.date >= today);
  }, [groupedDeliveriesAscending, today]);

  // All grouped (both past and upcoming)
  const allGrouped = useMemo(() => {
    return groupedDeliveriesAscending;
  }, [groupedDeliveriesAscending]);

  // Past pending deliveries (delivery date < today AND not marked delivered)
  const pastPendingDeliveries = useMemo(() => {
    return customers.filter((c) => c.deliveryDate && c.deliveryDate < today && c.delivery_status !== 'Delivered');
  }, [customers, today]);

  // Past pending grouped (most recent date first)
  const pastPendingGrouped = useMemo(() => {
    const groups = {};
    pastPendingDeliveries.forEach((c) => {
      if (!groups[c.deliveryDate]) groups[c.deliveryDate] = [];
      groups[c.deliveryDate].push(c);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, items]) => ({
        date,
        items,
        totalEggs: items.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0),
        totalOrders: items.length,
      }));
  }, [pastPendingDeliveries]);

  // Overdue deliveries (before today with balance or pending)
  const overdueDeliveries = useMemo(() => {
    return customers.filter((c) => c.deliveryDate && c.deliveryDate < today);
  }, [customers, today]);

  // Stats
  const allUpcomingItems = useMemo(() => upcomingGrouped.flatMap((g) => g.items), [upcomingGrouped]);
  const upcomingStats = useMemo(() => getDeliveryStats(allUpcomingItems), [allUpcomingItems]);
  const selectedStats = useMemo(() => getDeliveryStats(selectedDateDeliveries), [selectedDateDeliveries]);

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

  const expandAll = () => {
    const dates = new Set();
    groupedDeliveriesAscending.forEach((g) => dates.add(g.date));
    pastPendingGrouped.forEach((g) => dates.add(g.date));
    setExpandedDates(dates);
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  const renderDeliveryBtn = (c) => {
    const isDelivered = c.delivery_status === 'Delivered';
    return isDelivered ? (
      <button
        style={{
          padding: '2px 8px',
          fontSize: '0.74rem',
          background: '#dcfce7',
          color: '#15803d',
          border: '1px solid #86efac',
          borderRadius: 4,
          cursor: 'pointer',
          fontWeight: 700,
          minHeight: 'unset',
          height: 24,
          lineHeight: '20px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
        }}
        onClick={() => setDeliveryModalCustomer(c)}
        title="Delivered! Click to view or edit chicks count"
      >
        ✓ {c.chicks_count !== undefined && c.chicks_count !== '' ? `${c.chicks_count} chicks` : 'Delivered'}
      </button>
    ) : (
      <button
        style={{
          padding: '2px 10px',
          fontSize: '0.74rem',
          background: '#0284c7',
          color: '#ffffff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontWeight: 700,
          minHeight: 'unset',
          height: 24,
          lineHeight: '20px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
          boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
        }}
        onClick={() => setDeliveryModalCustomer(c)}
        title="Mark order as delivered"
      >
        <span style={{ fontSize: '0.82rem' }}>🚚</span>
        <span>Mark Delivered</span>
      </button>
    );
  };

  const renderMessagingBtns = (c) => {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
        <button
          style={{
            padding: '2px 8px',
            fontSize: '0.72rem',
            background: '#25D366',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 700,
            minHeight: 'unset',
            height: 24,
            lineHeight: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
          onClick={() => setSmsConfig({ customer: c, mode: 'whatsapp' })}
          title="Send message on WhatsApp"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#ffffff" stroke="none">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          <span>WhatsApp</span>
        </button>
        <button
          style={{
            padding: '2px 8px',
            fontSize: '0.72rem',
            background: '#0284c7',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 700,
            minHeight: 'unset',
            height: 24,
            lineHeight: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
          }}
          onClick={() => setSmsConfig({ customer: c, mode: 'sms' })}
          title="Send SMS via SIM"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>SMS</span>
        </button>
      </div>
    );
  };

  const renderMobileActions = (c) => {
    const isDelivered = c.delivery_status === 'Delivered';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10, width: '100%' }}>
        {/* Row 1: Primary Delivery Action */}
        {isDelivered ? (
          <button
            type="button"
            onClick={() => setDeliveryModalCustomer(c)}
            style={{
              width: '100%',
              height: 34,
              background: '#dcfce7',
              color: '#15803d',
              border: '1.5px solid #86efac',
              borderRadius: 6,
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              padding: '0 10px',
            }}
            title="Delivered. Tap to edit chicks count or unmark"
          >
            <span>✓ Delivered: {c.chicks_count !== undefined && c.chicks_count !== '' ? `${c.chicks_count} chicks` : 'Done'}</span>
            <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>(Tap to edit)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setDeliveryModalCustomer(c)}
            style={{
              width: '100%',
              height: 34,
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              padding: '0 10px',
              boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
            }}
            title="Mark order as delivered"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
            <span>Mark as Delivered</span>
          </button>
        )}

        {/* Row 2: Secondary SMS, WhatsApp & Edit Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 64px', gap: 6, width: '100%' }}>
          {/* SMS Button */}
          <button
            type="button"
            onClick={() => setSmsConfig({ customer: c, mode: 'sms' })}
            style={{
              height: 32,
              background: '#f0f9ff',
              color: '#0369a1',
              border: '1px solid #bae6fd',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              cursor: 'pointer',
              padding: '0 6px',
              whiteSpace: 'nowrap',
            }}
            title="Send SMS via SIM"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            <span>SMS</span>
          </button>

          {/* WhatsApp Button */}
          <button
            type="button"
            onClick={() => setSmsConfig({ customer: c, mode: 'whatsapp' })}
            style={{
              height: 32,
              background: '#ecfdf5',
              color: '#047857',
              border: '1px solid #a7f3d0',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5,
              cursor: 'pointer',
              padding: '0 6px',
              whiteSpace: 'nowrap',
            }}
            title="Send message on WhatsApp"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366" stroke="none">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            <span>WhatsApp</span>
          </button>

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => navigate(`/customers/${c.id}/edit`)}
            style={{
              height: 32,
              background: '#fff',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
        </div>
      </div>
    );
  };

  const renderEggsCell = (c) => {
    const isDelivered = c.delivery_status === 'Delivered';
    const hasChicks = c.chicks_count !== undefined && c.chicks_count !== '' && c.chicks_count !== null;
    return (
      <td>
        <div><span className="badge">{c.num_eggs}</span></div>
        {isDelivered && hasChicks && (
          <div style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, marginTop: 2, whiteSpace: 'nowrap' }}>
            🐣 {c.chicks_count} chicks ({Number(c.num_eggs) > 0 ? ((Number(c.chicks_count) / Number(c.num_eggs)) * 100).toFixed(0) : 0}%)
          </div>
        )}
      </td>
    );
  };

  const renderGroupedView = (groups, isPast = false) => {
    return (
      <>
        {groups.map((group) => {
          const isExpanded = expandedDates.has(group.date);
          const isCollapsed = !isExpanded;
          const groupStats = getDeliveryStats(group.items);

          return (
            <div key={group.date} className="hatchery-day-group" style={{ marginBottom: isCollapsed ? 10 : 20 }}>
              <div
                className="hatchery-day-header"
                onClick={() => toggleDateExpand(group.date)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '8px 12px',
                  background: isPast
                    ? (isCollapsed ? '#fff5f5' : '#fee2e2')
                    : (isCollapsed ? '#f8fafc' : '#f1f5f9'),
                  borderRadius: isCollapsed ? 6 : '6px 6px 0 0',
                  border: isPast ? '1px solid #fecaca' : '1px solid #e2e8f0',
                  marginBottom: isCollapsed ? 0 : 8,
                  transition: 'all 0.15s ease',
                }}
                title={isCollapsed ? 'Click to expand this date' : 'Click to collapse this date'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                      background: isPast ? '#fecaca' : '#e2e8f0',
                      fontWeight: 'bold',
                      transition: 'transform 0.2s ease',
                      transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                    }}
                  >
                    ▼
                  </span>
                  <span className={`hatchery-day-label ${group.date === today ? 'today' : ''}`}>
                    {formatDayLabel(group.date)}
                  </span>
                  <span className="hatchery-day-date" style={{ fontWeight: 600 }}>{formatDate(group.date)}</span>
                  {isPast && (
                    <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 600, background: '#fee2e2', padding: '1px 6px', borderRadius: 4 }}>
                      Past Due
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b' }}>
                    {group.totalEggs} eggs
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: groupStats.pending > 0 ? '#fef3c7' : '#f1f5f9',
                      color: groupStats.pending > 0 ? '#92400e' : '#475569',
                      border: `1px solid ${groupStats.pending > 0 ? '#fde68a' : '#cbd5e1'}`,
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      padding: '2px 8px',
                    }}
                  >
                    ⏳ {groupStats.pending} pending
                  </span>
                  {groupStats.delivered > 0 && (
                    <span
                      className="badge"
                      style={{
                        background: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                      }}
                    >
                      ✓ {groupStats.delivered} delivered
                      {groupStats.chicks > 0 && ` (${groupStats.chicks} chicks)`}
                    </span>
                  )}
                  <span className="hatchery-count">{group.totalOrders}</span>
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
                  {/* Desktop Table View */}
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Customer ID</th>
                          <th>Customer Name</th>
                          <th>Eggs</th>
                          <th>Village / City</th>
                          <th>Mobile</th>
                          <th>Alt Phone</th>
                          <th>Egg Mark</th>
                          <th>Seal</th>
                          <th>Balance</th>
                          <th>Delivery</th>
                          <th>Messaging / SMS</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((c) => (
                          <tr key={c.id}>
                            <td><strong>{c.customerId}</strong></td>
                            <td>{c.customer_name}</td>
                            {renderEggsCell(c)}
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
                            <td className={Number(c.balance || 0) > 0 ? 'overdue' : 'paid-clear'}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <strong>Rs {Number(c.balance || 0).toFixed(2)}</strong>
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
                            <td>
                              {renderDeliveryBtn(c)}
                            </td>
                            <td>
                              {renderMessagingBtns(c)}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm"
                                style={{ padding: '2px 8px', fontSize: '0.74rem', minHeight: 'unset', height: 24, lineHeight: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => navigate(`/customers/${c.id}/edit`)}
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="card-list">
                    {group.items.map((c) => (
                      <div key={c.id} className="card" style={{ padding: 12 }}>
                        <div className="card-header" style={{ padding: 0, marginBottom: 6 }}>
                          <div>
                            <strong>{c.customerId} {c.customer_name}</strong>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.village_city}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {c.seal === 'Yes' && <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>SEAL</span>}
                            <span className="badge">{c.num_eggs} eggs</span>
                            {c.delivery_status === 'Delivered' && (
                              <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                                🐣 {c.chicks_count !== undefined && c.chicks_count !== '' ? `${c.chicks_count} chicks` : 'Delivered'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontSize: '0.85rem' }}>
                            <a href={`tel:${c.mobile_number}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                              {c.mobile_number}
                            </a>
                            {c.alt_phone && (
                              <span style={{ color: '#64748b', marginLeft: 8 }}>
                                Alt: <a href={`tel:${c.alt_phone}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>{c.alt_phone}</a>
                              </span>
                            )}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={Number(c.balance || 0) > 0 ? 'overdue' : 'paid-clear'} style={{ fontSize: '0.85rem' }}>
                              <strong>Balance: Rs {Number(c.balance || 0).toFixed(2)}</strong>
                            </span>
                            {Number(c.balance || 0) > 0 && (
                              <button
                                style={{ padding: '1px 6px', fontSize: '0.68rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontWeight: 700, minHeight: 'unset', height: 20, lineHeight: '18px' }}
                                onClick={() => setPaymentCustomer(c)}
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </div>
                        {renderMobileActions(c)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h2>Deliveries</h2>
      </div>
      <p className="form-help" style={{ marginBottom: 20 }}>
        Track chick deliveries to customers, pickup dates, and collect pending balances.
      </p>

      {/* Date Filter & View Controls */}
      <div className="deliveries-controls" style={{ marginBottom: 16 }}>
        <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="delivery_date" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Select Date:
            </label>
            <input
              id="delivery_date"
              type="date"
              className="filter-date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setViewMode('selected');
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button
              className={`filter-btn ${selectedDate === yesterdayStr && viewMode === 'selected' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDate(yesterdayStr);
                setViewMode('selected');
              }}
              title="View Yesterday's Deliveries"
            >
              Yesterday
            </button>
            <button
              className={`filter-btn ${selectedDate === today && viewMode === 'selected' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDate(today);
                setViewMode('selected');
              }}
              title="View Today's Deliveries"
            >
              Today
            </button>
            <button
              className={`filter-btn ${selectedDate === tomorrowStr && viewMode === 'selected' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDate(tomorrowStr);
                setViewMode('selected');
              }}
              title="View Tomorrow's Deliveries"
            >
              Tomorrow
            </button>
            <button
              className={`filter-btn ${viewMode === 'all-upcoming' ? 'active' : ''}`}
              onClick={() => setViewMode('all-upcoming')}
              title="View All Upcoming Deliveries Grouped by Date"
            >
              Upcoming (Grouped)
            </button>
            <button
              className={`filter-btn ${viewMode === 'past-pending' ? 'active' : ''}`}
              onClick={() => setViewMode('past-pending')}
              style={pastPendingDeliveries.length > 0 && viewMode !== 'past-pending' ? { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 700 } : {}}
              title="View all overdue pending deliveries from previous days"
            >
              ⚠ Past Pending ({pastPendingDeliveries.length})
            </button>
            <button
              className={`filter-btn ${viewMode === 'all-grouped' ? 'active' : ''}`}
              onClick={() => setViewMode('all-grouped')}
              title="View All Deliveries (Past & Upcoming) Grouped by Date"
            >
              All Dates
            </button>
          </div>
        </div>
      </div>

      {/* Overdue Alert Banner if past pending deliveries exist */}
      {pastPendingDeliveries.length > 0 && viewMode !== 'past-pending' && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 8,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', fontWeight: 600, fontSize: '0.88rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚠️</span>
            <span>
              <strong>{pastPendingDeliveries.length} past {pastPendingDeliveries.length === 1 ? 'delivery is' : 'deliveries are'} pending</strong> from previous dates and not yet marked delivered.
            </span>
          </div>
          <button
            className="btn btn-sm"
            style={{
              background: '#b45309',
              color: '#fff',
              border: 'none',
              padding: '4px 12px',
              fontWeight: 700,
              fontSize: '0.78rem',
              borderRadius: 4,
              cursor: 'pointer',
            }}
            onClick={() => setViewMode('past-pending')}
          >
            Review Past Pending ({pastPendingDeliveries.length}) →
          </button>
        </div>
      )}

      {loading ? (
        <p>Loading deliveries...</p>
      ) : (
        <>
          {/* VIEW MODE 1: Selected Date Deliveries */}
          {viewMode === 'selected' && (
            <div className="hatchery-section">
              <h3 className="hatchery-section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span>
                  {selectedDate === today
                    ? "Today's Deliveries"
                    : selectedDate === yesterdayStr
                    ? "Yesterday's Deliveries"
                    : selectedDate === tomorrowStr
                    ? "Tomorrow's Deliveries"
                    : `Deliveries for ${formatDate(selectedDate)}`}
                </span>
                <span className="hatchery-count">
                  {selectedDateDeliveries.length} {selectedDateDeliveries.length === 1 ? 'order' : 'orders'}
                </span>
                {selectedDateDeliveries.length > 0 && (
                  <>
                    <span
                      className="badge"
                      style={{
                        background: selectedStats.pending > 0 ? '#fef3c7' : '#f1f5f9',
                        color: selectedStats.pending > 0 ? '#92400e' : '#475569',
                        border: `1px solid ${selectedStats.pending > 0 ? '#fde68a' : '#cbd5e1'}`,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        padding: '3px 9px',
                      }}
                    >
                      ⏳ {selectedStats.pending} pending
                    </span>
                    {selectedStats.delivered > 0 && (
                      <span
                        className="badge"
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #86efac',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          padding: '3px 9px',
                        }}
                      >
                        ✓ {selectedStats.delivered} delivered
                      </span>
                    )}
                    <span className="badge" style={{ fontSize: '0.8rem', padding: '3px 9px' }}>
                      {selectedDateTotalEggs} eggs
                    </span>
                  </>
                )}
              </h3>

              {selectedDateDeliveries.length === 0 ? (
                <p className="empty-msg">
                  No deliveries scheduled for{' '}
                  {selectedDate === today
                    ? 'today'
                    : selectedDate === yesterdayStr
                    ? 'yesterday'
                    : selectedDate === tomorrowStr
                    ? 'tomorrow'
                    : formatDate(selectedDate)}
                  .
                </p>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Customer ID</th>
                          <th>Customer Name</th>
                          <th>Eggs</th>
                          <th>Village / City</th>
                          <th>Mobile</th>
                          <th>Alt Phone</th>
                          <th>Egg Mark</th>
                          <th>Seal</th>
                          <th>Balance</th>
                          <th>Delivery</th>
                          <th>Messaging / SMS</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDateDeliveries.map((c) => (
                          <tr key={c.id} className={isOverdue(c.deliveryDate) ? 'row-overdue' : ''}>
                            <td><strong>{c.customerId}</strong></td>
                            <td>{c.customer_name}</td>
                            {renderEggsCell(c)}
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
                            <td className={Number(c.balance || 0) > 0 ? 'overdue' : 'paid-clear'}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <div>
                                  <strong>Rs {Number(c.balance || 0).toFixed(2)}</strong>
                                  {Number(c.total_amount || 0) > 0 && (
                                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block' }}>
                                      Total: Rs {Number(c.total_amount || 0).toFixed(0)}
                                    </span>
                                  )}
                                </div>
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
                            <td>
                              {renderDeliveryBtn(c)}
                            </td>
                            <td>
                              {renderMessagingBtns(c)}
                            </td>
                            <td>
                              <button
                                className="btn btn-sm"
                                style={{ padding: '2px 8px', fontSize: '0.74rem', minHeight: 'unset', height: 24, lineHeight: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                onClick={() => navigate(`/customers/${c.id}/edit`)}
                                title="Edit Sale"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="card-list">
                    {selectedDateDeliveries.map((c) => (
                      <div key={c.id} className={`card ${isOverdue(c.deliveryDate) ? 'card-overdue' : ''}`}>
                        <div className="card-header">
                          <div>
                            <strong>{c.customerId} {c.customer_name}</strong>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.village_city}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            {c.seal === 'Yes' && <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>SEAL</span>}
                            <span className="badge">{c.num_eggs} eggs</span>
                            {c.delivery_status === 'Delivered' && (
                              <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                                🐣 {c.chicks_count !== undefined && c.chicks_count !== '' ? `${c.chicks_count} chicks` : 'Delivered'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="card-body">
                          <p>
                            <span className="label">Mobile:</span>{' '}
                            <a href={`tel:${c.mobile_number}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                              {c.mobile_number}
                            </a>
                          </p>
                          {c.alt_phone && (
                            <p>
                              <span className="label">Alt Phone:</span>{' '}
                              <a href={`tel:${c.alt_phone}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                                {c.alt_phone}
                              </a>
                            </p>
                          )}
                          {c.egg_mark && <p><span className="label">Egg Mark:</span> {c.egg_mark}</p>}
                          <p><span className="label">Seal:</span> <strong>{c.seal === 'Yes' ? 'Yes' : 'No'}</strong></p>
                          <p><span className="label">Received:</span> {formatDate(c.date_received)}</p>
                          <p><span className="label">Delivery:</span> <strong>{formatDate(c.deliveryDate)}</strong></p>
                          <p><span className="label">Amount:</span> Rs {Number(c.total_amount || 0).toFixed(2)}</p>
                          <p><span className="label">Paid:</span> Rs {Number(c.amount_paid || 0).toFixed(2)}</p>
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
                        {renderMobileActions(c)}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW MODE: Upcoming Deliveries Grouped by Date (Ascending) */}
          {(viewMode === 'all-upcoming' ||
            (viewMode === 'selected' && (selectedDate === today || selectedDate === yesterdayStr))) &&
            upcomingGrouped.length > 0 && (
              <div className="hatchery-section" style={{ marginTop: 28 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: 16,
                  }}
                >
                  <h3
                    className="hatchery-section-title"
                    style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                  >
                    <span>Upcoming Deliveries (Grouped by Date, Ascending)</span>
                    <span className="hatchery-count">{upcomingStats.total} orders</span>
                    <span
                      className="badge"
                      style={{
                        background: upcomingStats.pending > 0 ? '#fef3c7' : '#f1f5f9',
                        color: upcomingStats.pending > 0 ? '#92400e' : '#475569',
                        border: `1px solid ${upcomingStats.pending > 0 ? '#fde68a' : '#cbd5e1'}`,
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        padding: '3px 9px',
                      }}
                    >
                      ⏳ {upcomingStats.pending} pending
                    </span>
                    {upcomingStats.delivered > 0 && (
                      <span
                        className="badge"
                        style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          border: '1px solid #86efac',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          padding: '3px 9px',
                        }}
                      >
                        ✓ {upcomingStats.delivered} delivered
                      </span>
                    )}
                  </h3>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={expandAll}
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
                      onClick={collapseAll}
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
                </div>

                {renderGroupedView(upcomingGrouped, false)}
              </div>
            )}

          {/* VIEW MODE: Past Pending Deliveries (Overdue) */}
          {viewMode === 'past-pending' && (
            <div className="hatchery-section" style={{ marginTop: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <h3
                  className="hatchery-section-title"
                  style={{ margin: 0, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                >
                  <span>⚠ Past Pending Deliveries (Overdue)</span>
                  <span className="hatchery-count" style={{ background: '#b91c1c' }}>
                    {pastPendingDeliveries.length} pending
                  </span>
                  <span
                    className="badge"
                    style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', fontWeight: 700 }}
                  >
                    {pastPendingDeliveries.reduce((s, c) => s + Number(c.num_eggs || 0), 0)} eggs
                  </span>
                </h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={expandAll}
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
                    onClick={collapseAll}
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
              </div>
              <p className="form-help" style={{ color: '#b91c1c', marginBottom: 16 }}>
                These customer orders were scheduled for pickup on previous dates but haven't been collected yet.
              </p>

              {pastPendingDeliveries.length === 0 ? (
                <div
                  className="card"
                  style={{ padding: 24, textAlign: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}
                >
                  <p style={{ color: '#16a34a', fontWeight: 700, margin: 0, fontSize: '1rem' }}>
                    🎉 No past pending deliveries! All previous orders have been completed and delivered.
                  </p>
                </div>
              ) : (
                renderGroupedView(pastPendingGrouped, true)
              )}
            </div>
          )}

          {/* VIEW MODE: All Dates (Past & Upcoming, Grouped) */}
          {viewMode === 'all-grouped' && (
            <div className="hatchery-section" style={{ marginTop: 24 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <h3
                  className="hatchery-section-title"
                  style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
                >
                  <span>All Deliveries (Past & Upcoming, Grouped by Date)</span>
                  <span className="hatchery-count">{allGrouped.reduce((acc, g) => acc + g.totalOrders, 0)} orders</span>
                  <span
                    className="badge"
                    style={{
                      background: '#fef3c7',
                      color: '#92400e',
                      border: '1px solid #fde68a',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      padding: '3px 9px',
                    }}
                  >
                    ⏳ {getDeliveryStats(customers.filter((c) => c.deliveryDate)).pending} pending
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #86efac',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      padding: '3px 9px',
                    }}
                  >
                    ✓ {getDeliveryStats(customers.filter((c) => c.deliveryDate)).delivered} delivered
                  </span>
                </h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={expandAll}
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
                    onClick={collapseAll}
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
              </div>

              {renderGroupedView(allGrouped, false)}
            </div>
          )}
        </>
      )}
      {paymentCustomer && (
        <PaymentModal
          customer={paymentCustomer}
          onClose={() => setPaymentCustomer(null)}
          onSuccess={(updated) => {
            setCustomers((prev) => prev.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
          }}
        />
      )}
      {smsConfig && (
        <SmsModal
          customer={smsConfig.customer}
          initialMode={smsConfig.mode}
          onClose={() => setSmsConfig(null)}
        />
      )}
      {deliveryModalCustomer && (
        <DeliveryModal
          customer={deliveryModalCustomer}
          onClose={() => setDeliveryModalCustomer(null)}
          onSuccess={(updated) => {
            setCustomers((prev) => prev.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
          }}
        />
      )}
    </div>
  );
}
