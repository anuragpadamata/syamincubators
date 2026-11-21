import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function HatcheryListPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('selected'); // 'selected' or 'all-upcoming'
  const [expandedDates, setExpandedDates] = useState(new Set()); // Empty by default = all collapsed
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    setLoading(true);
    api.getHatcheryList()
      .then((data) => setCustomers(data))
      .catch((err) => console.error('Failed to load hatchery transfers:', err))
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

  const isOverdue = (hatcheryDate) => {
    if (!hatcheryDate) return false;
    return hatcheryDate < today;
  };

  // Transfers for selected date
  const selectedDateCustomers = useMemo(() => {
    return customers.filter((c) => c.hatcheryDate === selectedDate);
  }, [customers, selectedDate]);

  // Total eggs for selected date
  const selectedDateTotalEggs = useMemo(() => {
    return selectedDateCustomers.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
  }, [selectedDateCustomers]);

  // All hatchery transfers grouped by date, sorted ASCENDING
  const groupedHatcheryAscending = useMemo(() => {
    const groups = {};
    customers.forEach((c) => {
      if (!c.hatcheryDate) return;
      if (!groups[c.hatcheryDate]) {
        groups[c.hatcheryDate] = [];
      }
      groups[c.hatcheryDate].push(c);
    });

    return Object.entries(groups)
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .map(([date, items]) => ({
        date,
        items,
        totalEggs: items.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0),
        totalOrders: items.length,
      }));
  }, [customers]);

  // Upcoming transfers (today onwards), grouped by date ASCENDING
  const upcomingGrouped = useMemo(() => {
    return groupedHatcheryAscending.filter((g) => g.date >= today);
  }, [groupedHatcheryAscending, today]);

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
    setExpandedDates(new Set(upcomingGrouped.map((g) => g.date)));
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: 12 }}>
        <h2>Hatchery Transfers</h2>
      </div>
      <p className="form-help" style={{ marginBottom: 20 }}>
        Eggs that need to be transferred from incubator trays to hatching baskets (rotation stopped).
      </p>

      {/* Date Filter & View Controls */}
      <div className="deliveries-controls" style={{ marginBottom: 20 }}>
        <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="hatchery_date" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Select Date:
            </label>
            <input
              id="hatchery_date"
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
              className={`filter-btn ${selectedDate === today && viewMode === 'selected' ? 'active' : ''}`}
              onClick={() => {
                setSelectedDate(today);
                setViewMode('selected');
              }}
            >
              Today
            </button>
            <button
              className={`filter-btn ${
                selectedDate ===
                  new Date(Date.now() + 86400000).toISOString().split('T')[0] && viewMode === 'selected'
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(tomorrow.toISOString().split('T')[0]);
                setViewMode('selected');
              }}
            >
              Tomorrow
            </button>
            <button
              className={`filter-btn ${viewMode === 'all-upcoming' ? 'active' : ''}`}
              onClick={() => setViewMode('all-upcoming')}
            >
              All Upcoming (Grouped)
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p>Loading hatchery transfers...</p>
      ) : (
        <>
          {/* VIEW MODE 1: Selected Date Transfers */}
          {viewMode === 'selected' && (
            <div className="hatchery-section">
              <h3 className="hatchery-section-title">
                {selectedDate === today ? "Today's Transfers" : `Transfers for ${formatDate(selectedDate)}`}
                <span className="hatchery-count">{selectedDateCustomers.length} orders</span>
                {selectedDateTotalEggs > 0 && (
                  <span className="badge" style={{ fontSize: '0.8rem', padding: '3px 8px' }}>
                    {selectedDateTotalEggs} eggs
                  </span>
                )}
              </h3>

              {selectedDateCustomers.length === 0 ? (
                <p className="empty-msg">No transfers scheduled for {selectedDate === today ? 'today' : formatDate(selectedDate)}.</p>
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
                          <th>Egg Mark</th>
                          <th>Seal</th>
                          <th>Date Received</th>
                          <th>Hatchery Date</th>
                          <th>Delivery Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedDateCustomers.map((c) => (
                          <tr key={c.id} className={isOverdue(c.hatcheryDate) ? 'row-overdue' : ''}>
                            <td><strong>{c.customerId}</strong></td>
                            <td>{c.customer_name}</td>
                            <td><span className="badge">{c.num_eggs}</span></td>
                            <td>{c.village_city}</td>
                            <td>
                              <a href={`tel:${c.mobile_number}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                📞 {c.mobile_number}
                              </a>
                            </td>
                            <td>{c.egg_mark || '-'}</td>
                            <td>{c.seal === 'Yes' ? <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>SEAL</span> : <span style={{ color: '#94a3b8' }}>No</span>}</td>
                            <td>{formatDate(c.date_received)}</td>
                            <td><strong>{formatDate(c.hatcheryDate)}</strong></td>
                            <td>{formatDate(c.deliveryDate)}</td>
                            <td>
                              <button
                                className="btn btn-sm"
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
                    {selectedDateCustomers.map((c) => (
                      <div key={c.id} className={`card ${isOverdue(c.hatcheryDate) ? 'card-overdue' : ''}`}>
                        <div className="card-header">
                          <div>
                            <strong>{c.customerId} {c.customer_name}</strong>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.village_city}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {c.seal === 'Yes' && <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>SEAL</span>}
                            <span className="badge">{c.num_eggs} eggs</span>
                          </div>
                        </div>
                        <div className="card-body">
                          <p>
                            <span className="label">Mobile:</span>{' '}
                            <a href={`tel:${c.mobile_number}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                              📞 {c.mobile_number}
                            </a>
                          </p>
                          {c.egg_mark && <p><span className="label">Egg Mark:</span> {c.egg_mark}</p>}
                          <p><span className="label">Seal:</span> <strong>{c.seal === 'Yes' ? 'Yes' : 'No'}</strong></p>
                          <p><span className="label">Received:</span> {formatDate(c.date_received)}</p>
                          <p><span className="label">Hatchery:</span> <strong>{formatDate(c.hatcheryDate)}</strong></p>
                          <p><span className="label">Delivery:</span> {formatDate(c.deliveryDate)}</p>
                        </div>
                        <div className="card-actions">
                          <button className="btn btn-sm" onClick={() => navigate(`/customers/${c.id}/edit`)}>
                            Edit Sale
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* VIEW MODE 2: All Upcoming Grouped by Date (Ascending) */}
          {(viewMode === 'all-upcoming' || (viewMode === 'selected' && selectedDate === today)) && upcomingGrouped.length > 0 && (
            <div className="hatchery-section" style={{ marginTop: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                <h3 className="hatchery-section-title" style={{ margin: 0 }}>
                  Upcoming Hatchery Transfers (Grouped by Date, Ascending)
                  <span className="hatchery-count">{upcomingGrouped.reduce((acc, g) => acc + g.totalOrders, 0)} orders</span>
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

              {upcomingGrouped.map((group) => {
                const isExpanded = expandedDates.has(group.date);
                const isCollapsed = !isExpanded;
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
                        <span className={`hatchery-day-label ${group.date === today ? 'today' : ''}`}>
                          {formatDayLabel(group.date)}
                        </span>
                        <span className="hatchery-day-date">{formatDate(group.date)}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b' }}>
                          {group.totalEggs} eggs
                        </span>
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
                          <th>Egg Mark</th>
                          <th>Seal</th>
                          <th>Delivery Date</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((c) => (
                          <tr key={c.id}>
                            <td><strong>{c.customerId}</strong></td>
                            <td>{c.customer_name}</td>
                            <td><span className="badge">{c.num_eggs}</span></td>
                            <td>{c.village_city}</td>
                            <td>
                              <a href={`tel:${c.mobile_number}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                                📞 {c.mobile_number}
                              </a>
                            </td>
                            <td>{c.egg_mark || '-'}</td>
                            <td>{c.seal === 'Yes' ? <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>SEAL</span> : <span style={{ color: '#94a3b8' }}>No</span>}</td>
                            <td>{formatDate(c.deliveryDate)}</td>
                            <td>
                              <button
                                className="btn btn-sm"
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {c.seal === 'Yes' && <span className="badge" style={{ background: '#7c3aed', color: '#fff', fontSize: '0.75rem', fontWeight: 'bold' }}>SEAL</span>}
                            <span className="badge">{c.num_eggs} eggs</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                          <span style={{ fontSize: '0.85rem' }}>
                            <a href={`tel:${c.mobile_number}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                              📞 {c.mobile_number}
                            </a>
                          </span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Delivery: <strong>{formatDate(c.deliveryDate)}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
          )}
        </>
      )}
    </div>
  );
}
