import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function DashboardPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('monthly'); // 'daily' | 'monthly' | 'all'

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);
  const currentYearStr = todayStr.slice(0, 4);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [selectedYear, setSelectedYear] = useState('all'); // 'all' | '2026' | '2025' | '2024'
  const [expandedYears, setExpandedYears] = useState(new Set()); // Set of expanded year strings in all-time bowler
  const navigate = useNavigate();

  const toggleYearExpand = (year) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }
      return next;
    });
  };

  const expandAllYears = () => {
    setExpandedYears(new Set(availableYears));
  };

  const collapseAllYears = () => {
    setExpandedYears(new Set());
  };

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
      .catch((err) => console.error('Failed to load customers for dashboard:', err))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatMonthLabel = (monthStr) => {
    if (!monthStr) return '-';
    const [year, month] = monthStr.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const getCustomerDate = (c) => {
    if (c.date_received) return c.date_received;
    if (c.createdAt) return c.createdAt.split('T')[0];
    return '';
  };

  // Distinct available months from data
  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    monthsSet.add(currentMonthStr);
    customers.forEach((c) => {
      const d = getCustomerDate(c);
      if (d && d.length >= 7) monthsSet.add(d.slice(0, 7));
      if (c.deliveryDate && c.deliveryDate.length >= 7) monthsSet.add(c.deliveryDate.slice(0, 7));
    });
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [customers, currentMonthStr]);

  // Distinct available years from data (including current and prior 2 years)
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    const currY = Number(currentYearStr) || 2026;
    yearsSet.add(String(currY));
    yearsSet.add(String(currY - 1));
    yearsSet.add(String(currY - 2));

    customers.forEach((c) => {
      const d = getCustomerDate(c);
      if (d && d.length >= 4) yearsSet.add(d.slice(0, 4));
      if (c.deliveryDate && c.deliveryDate.length >= 4) yearsSet.add(c.deliveryDate.slice(0, 4));
    });

    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [customers, currentYearStr]);

  const yearsAscending = useMemo(() => {
    return [...availableYears].sort((a, b) => a.localeCompare(b));
  }, [availableYears]);

  // DAILY METRICS CALCULATION
  const dailyData = useMemo(() => {
    const sales = customers.filter((c) => getCustomerDate(c) === selectedDate);
    const eggsReceived = sales.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
    const totalAmount = sales.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
    const amountPaid = sales.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
    const balanceDue = sales.reduce((sum, c) => sum + Number(c.balance || 0), 0);

    // Deliveries scheduled or completed on this date
    const deliveries = customers.filter((c) => c.deliveryDate === selectedDate);
    const deliveredCount = deliveries.filter((c) => c.delivery_status === 'Delivered').length;
    const chicksDelivered = deliveries.reduce(
      (sum, c) => sum + (c.delivery_status === 'Delivered' ? Number(c.chicks_count || 0) : 0),
      0
    );
    const deliveredEggs = deliveries
      .filter((c) => c.delivery_status === 'Delivered')
      .reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
    const hatchRate = deliveredEggs > 0 ? ((chicksDelivered / deliveredEggs) * 100).toFixed(1) : null;

    const avgEggsPerSale = sales.length > 0 ? (eggsReceived / sales.length).toFixed(1) : 0;

    return {
      sales,
      salesCount: sales.length,
      eggsReceived,
      totalAmount,
      amountPaid,
      balanceDue,
      deliveries,
      deliveriesCount: deliveries.length,
      deliveredCount,
      chicksDelivered,
      hatchRate,
      avgEggsPerSale,
    };
  }, [customers, selectedDate]);

  // MONTHLY METRICS CALCULATION
  const monthlyData = useMemo(() => {
    const sales = customers.filter((c) => getCustomerDate(c).startsWith(selectedMonth));
    const totalEggs = sales.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
    const totalAmount = sales.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
    const amountPaid = sales.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
    const balanceDue = sales.reduce((sum, c) => sum + Number(c.balance || 0), 0);

    // Days in selected month
    const [year, month] = selectedMonth.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const isCurrentMonth = todayStr.startsWith(selectedMonth);
    const currentDay = Number(todayStr.split('-')[2]);
    const daysElapsed = isCurrentMonth ? Math.min(currentDay, totalDaysInMonth) : totalDaysInMonth;

    // Average eggs per day (over calendar days elapsed)
    const avgEggsPerDay = daysElapsed > 0 ? (totalEggs / daysElapsed).toFixed(1) : 0;

    // Active intake days (dates when eggs were actually received)
    const activeDatesSet = new Set(sales.map((c) => getCustomerDate(c)).filter(Boolean));
    const activeDaysCount = activeDatesSet.size;
    const avgEggsPerActiveDay = activeDaysCount > 0 ? (totalEggs / activeDaysCount).toFixed(0) : 0;

    // Chicks hatched & Hatchability calculation
    // Method A: From batches received in this month that were delivered
    const batchDelivered = sales.filter((c) => c.delivery_status === 'Delivered');
    const batchDeliveredEggs = batchDelivered.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
    const batchChicks = batchDelivered.reduce((sum, c) => sum + Number(c.chicks_count || 0), 0);
    const batchHatchRate = batchDeliveredEggs > 0 ? ((batchChicks / batchDeliveredEggs) * 100).toFixed(1) : null;

    // Method B: All deliveries fulfilled in this month (by deliveryDate or delivered_at)
    const monthDeliveries = customers.filter((c) => {
      if (c.delivery_status === 'Delivered') {
        if (c.delivered_at && c.delivered_at.startsWith(selectedMonth)) return true;
        if (c.deliveryDate && c.deliveryDate.startsWith(selectedMonth)) return true;
      }
      return false;
    });
    const totalChicksHatchedInMonth = monthDeliveries.reduce((sum, c) => sum + Number(c.chicks_count || 0), 0);
    const totalEggsOfDeliveredInMonth = monthDeliveries.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
    const monthHatchRate =
      totalEggsOfDeliveredInMonth > 0
        ? ((totalChicksHatchedInMonth / totalEggsOfDeliveredInMonth) * 100).toFixed(1)
        : batchHatchRate;

    // Daily breakdown for Bowler scorecard & chart (Day 1 to totalDaysInMonth)
    const dailyBreakdown = [];
    let maxDailyEggs = 1;
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dayStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const daySales = sales.filter((c) => getCustomerDate(c) === dayStr);
      const eggs = daySales.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
      const amount = daySales.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
      const paid = daySales.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
      const balance = daySales.reduce((sum, c) => sum + Number(c.balance || 0), 0);

      // Deliveries due or completed on this day
      const dayDeliveries = customers.filter((c) => c.deliveryDate === dayStr);
      const deliveriesCount = dayDeliveries.length;
      const dayDelivered = dayDeliveries.filter((c) => c.delivery_status === 'Delivered');
      const chicksDelivered = dayDelivered.reduce((sum, c) => sum + Number(c.chicks_count || 0), 0);
      const deliveredEggs = dayDelivered.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
      const hatchRate = deliveredEggs > 0 ? ((chicksDelivered / deliveredEggs) * 100).toFixed(0) : null;

      if (eggs > maxDailyEggs) maxDailyEggs = eggs;
      dailyBreakdown.push({
        day,
        dateStr: dayStr,
        eggs,
        amount,
        paid,
        balance,
        salesCount: daySales.length,
        deliveriesCount,
        chicksDelivered,
        hatchRate,
      });
    }

    // Top Villages / Cities
    const villageMap = {};
    sales.forEach((c) => {
      const village = c.village_city || 'Unknown';
      if (!villageMap[village]) {
        villageMap[village] = { name: village, orders: 0, eggs: 0, amount: 0, balance: 0 };
      }
      villageMap[village].orders += 1;
      villageMap[village].eggs += Number(c.num_eggs || 0);
      villageMap[village].amount += Number(c.total_amount || 0);
      villageMap[village].balance += Number(c.balance || 0);
    });
    const topVillages = Object.values(villageMap).sort((a, b) => b.eggs - a.eggs);

    return {
      sales,
      salesCount: sales.length,
      totalEggs,
      totalAmount,
      amountPaid,
      balanceDue,
      totalDaysInMonth,
      daysElapsed,
      avgEggsPerDay,
      activeDaysCount,
      avgEggsPerActiveDay,
      totalChicksHatched: totalChicksHatchedInMonth > 0 ? totalChicksHatchedInMonth : batchChicks,
      hatchRate: monthHatchRate,
      batchDeliveredCount: batchDelivered.length,
      monthDeliveriesCount: monthDeliveries.length,
      dailyBreakdown,
      maxDailyEggs,
      topVillages,
    };
  }, [customers, selectedMonth, todayStr]);

  // ALL-TIME METRICS CALCULATION
  const allTimeData = useMemo(() => {
    const totalOrders = customers.length;
    const totalEggs = customers.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
    const totalAmount = customers.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
    const amountPaid = customers.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
    const balanceDue = customers.reduce((sum, c) => sum + Number(c.balance || 0), 0);

    const deliveredOrders = customers.filter((c) => c.delivery_status === 'Delivered');
    const totalChicks = deliveredOrders.reduce((sum, c) => sum + Number(c.chicks_count || 0), 0);
    const deliveredEggs = deliveredOrders.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
    const overallHatchRate = deliveredEggs > 0 ? ((totalChicks / deliveredEggs) * 100).toFixed(1) : null;

    // Monthly historical comparison
    const monthsMap = {};
    customers.forEach((c) => {
      const d = getCustomerDate(c);
      if (!d) return;
      const m = d.slice(0, 7);
      if (!monthsMap[m]) {
        monthsMap[m] = { month: m, orders: 0, eggs: 0, amount: 0, paid: 0, balance: 0, chicks: 0, deliveredEggs: 0 };
      }
      monthsMap[m].orders += 1;
      monthsMap[m].eggs += Number(c.num_eggs || 0);
      monthsMap[m].amount += Number(c.total_amount || 0);
      monthsMap[m].paid += Number(c.amount_paid || 0);
      monthsMap[m].balance += Number(c.balance || 0);
      if (c.delivery_status === 'Delivered') {
        monthsMap[m].chicks += Number(c.chicks_count || 0);
        monthsMap[m].deliveredEggs += Number(c.num_eggs || 0);
      }
    });

    const monthlyHistory = Object.values(monthsMap).sort((a, b) => b.month.localeCompare(a.month));
    const monthlyBowlerList = Object.values(monthsMap).sort((a, b) => a.month.localeCompare(b.month));

    return {
      totalOrders,
      totalEggs,
      totalAmount,
      amountPaid,
      balanceDue,
      deliveredOrdersCount: deliveredOrders.length,
      totalChicks,
      overallHatchRate,
      monthlyHistory,
      monthlyBowlerList,
    };
  }, [customers]);

  // Metrics Map by Year (aggregating 12 months for each available year)
  const yearMetricsMap = useMemo(() => {
    const map = {};
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    availableYears.forEach((yearStr) => {
      const sales = customers.filter((c) => getCustomerDate(c).startsWith(yearStr));
      const orders = sales.length;
      const eggs = sales.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
      const amount = sales.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
      const paid = sales.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
      const balance = sales.reduce((sum, c) => sum + Number(c.balance || 0), 0);

      const delivered = customers.filter((c) => {
        if (c.delivery_status === 'Delivered') {
          if (c.delivered_at && c.delivered_at.startsWith(yearStr)) return true;
          if (c.deliveryDate && c.deliveryDate.startsWith(yearStr)) return true;
        }
        return false;
      });
      const chicks = delivered.reduce((sum, c) => sum + Number(c.chicks_count || 0), 0);
      const deliveredEggs = delivered.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
      const hatchRate = deliveredEggs > 0 ? ((chicks / deliveredEggs) * 100).toFixed(1) : null;
      const avgEggsPerDay = eggs > 0 ? (eggs / 365).toFixed(1) : '0';

      const months = [];
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0');
        const ym = `${yearStr}-${mm}`;
        const mSales = sales.filter((c) => getCustomerDate(c).startsWith(ym));
        const mOrders = mSales.length;
        const mEggs = mSales.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
        const mAmount = mSales.reduce((sum, c) => sum + Number(c.total_amount || 0), 0);
        const mPaid = mSales.reduce((sum, c) => sum + Number(c.amount_paid || 0), 0);
        const mBalance = mSales.reduce((sum, c) => sum + Number(c.balance || 0), 0);

        const mDelivered = customers.filter((c) => {
          if (c.delivery_status === 'Delivered') {
            if (c.delivered_at && c.delivered_at.startsWith(ym)) return true;
            if (c.deliveryDate && c.deliveryDate.startsWith(ym)) return true;
          }
          return false;
        });
        const mChicks = mDelivered.reduce((sum, c) => sum + Number(c.chicks_count || 0), 0);
        const mDeliveredEggs = mDelivered.reduce((sum, c) => sum + Number(c.num_eggs || 0), 0);
        const mHatchRate = mDeliveredEggs > 0 ? ((mChicks / mDeliveredEggs) * 100).toFixed(1) : null;

        const daysInMonth = new Date(Number(yearStr), m, 0).getDate();
        const mAvgEggs = mEggs > 0 ? (mEggs / daysInMonth).toFixed(1) : '0';

        months.push({
          monthStr: ym,
          monthNum: m,
          shortName: MONTH_NAMES[m - 1],
          orders: mOrders,
          eggs: mEggs,
          amount: mAmount,
          paid: mPaid,
          balance: mBalance,
          chicks: mChicks,
          deliveredEggs: mDeliveredEggs,
          hatchRate: mHatchRate,
          avgEggsPerDay: mAvgEggs,
        });
      }

      map[yearStr] = {
        yearStr,
        orders,
        eggs,
        amount,
        paid,
        balance,
        chicks,
        deliveredEggs,
        hatchRate,
        avgEggsPerDay,
        months,
      };
    });

    return map;
  }, [customers, availableYears]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>📊</span> Business Dashboard & Analytics
          </h2>
          <p className="form-help" style={{ margin: '4px 0 0', color: 'var(--text-muted)' }}>
            Real-time egg collection intake, sales revenue, daily averages, and chick hatchability performance.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 14px', fontSize: '0.82rem', height: 32, display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600, cursor: 'pointer' }}
          title="Print analytics report"
        >
          🖨️ Print Report
        </button>
      </div>

      {/* Timeframe Switcher Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <button
          className={`filter-btn ${timeframe === 'monthly' ? 'active' : ''}`}
          onClick={() => setTimeframe('monthly')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', padding: '7px 16px', fontWeight: 600 }}
        >
          <span>📆</span> Monthly Analytics
        </button>
        <button
          className={`filter-btn ${timeframe === 'daily' ? 'active' : ''}`}
          onClick={() => setTimeframe('daily')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', padding: '7px 16px', fontWeight: 600 }}
        >
          <span>📅</span> Daily Analytics
        </button>
        <button
          className={`filter-btn ${timeframe === 'all' ? 'active' : ''}`}
          onClick={() => setTimeframe('all')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.88rem', padding: '7px 16px', fontWeight: 600 }}
        >
          <span>📈</span> All-Time Overview
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <p style={{ color: 'var(--text-muted)' }}>Loading analytics data...</p>
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 1. MONTHLY VIEW */}
          {/* ========================================================================= */}
          {timeframe === 'monthly' && (
            <div>
              {/* Month Selector Controls */}
              <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label htmlFor="dashboard_month" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    Select Month:
                  </label>
                  <input
                    id="dashboard_month"
                    type="month"
                    className="filter-date"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    className={`filter-btn ${selectedMonth === currentMonthStr ? 'active' : ''}`}
                    onClick={() => setSelectedMonth(currentMonthStr)}
                  >
                    This Month ({formatMonthLabel(currentMonthStr).split(' ')[0]})
                  </button>

                  {/* Previous Month Button */}
                  {(() => {
                    const d = new Date();
                    d.setDate(1);
                    d.setMonth(d.getMonth() - 1);
                    const prevM = d.toISOString().slice(0, 7);
                    return (
                      <button
                        className={`filter-btn ${selectedMonth === prevM ? 'active' : ''}`}
                        onClick={() => setSelectedMonth(prevM)}
                      >
                        Last Month ({formatMonthLabel(prevM).split(' ')[0]})
                      </button>
                    );
                  })()}

                  {availableMonths.length > 2 && (
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        background: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {availableMonths.map((m) => (
                        <option key={m} value={m}>
                          {formatMonthLabel(m)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Monthly KPI Metric Cards */}
              <div className="dashboard-grid">
                {/* 1. Total Eggs Collected */}
                <div className="kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
                  <div className="kpi-header">
                    <span className="kpi-title">Eggs Collected</span>
                    <span className="kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>🥚</span>
                  </div>
                  <div className="kpi-value">{monthlyData.totalEggs.toLocaleString('en-IN')}</div>
                  <div className="kpi-sub">
                    <span>In {formatMonthLabel(selectedMonth)}</span>
                    <span className="badge" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>{monthlyData.salesCount} sales</span>
                  </div>
                </div>

                {/* 2. Total Money Earned */}
                <div className="kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
                  <div className="kpi-header">
                    <span className="kpi-title">Total Money Earned</span>
                    <span className="kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>💰</span>
                  </div>
                  <div className="kpi-value" style={{ color: '#15803d' }}>
                    Rs {monthlyData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="kpi-sub">
                    <span style={{ color: '#15803d', fontWeight: 600 }}>Paid: Rs {monthlyData.amountPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    {monthlyData.balanceDue > 0 && (
                      <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 4 }}>
                        • Due: Rs {monthlyData.balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Average Eggs Per Day */}
                <div className="kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                  <div className="kpi-header">
                    <span className="kpi-title">Avg Eggs / Day</span>
                    <span className="kpi-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>📊</span>
                  </div>
                  <div className="kpi-value" style={{ color: '#6d28d9' }}>
                    {monthlyData.avgEggsPerDay}
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#64748b', marginLeft: 4 }}>eggs/day</span>
                  </div>
                  <div className="kpi-sub">
                    <span>
                      {monthlyData.activeDaysCount} active intake days ({monthlyData.avgEggsPerActiveDay} eggs/batch)
                    </span>
                  </div>
                </div>

                {/* 4. Chicks Hatched & Hatchability Rate % */}
                <div className="kpi-card" style={{ borderLeft: '4px solid #ea580c' }}>
                  <div className="kpi-header">
                    <span className="kpi-title">Chicks Hatched & Rate</span>
                    <span className="kpi-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>🐣</span>
                  </div>
                  <div className="kpi-value" style={{ color: '#c2410c' }}>
                    {monthlyData.totalChicksHatched > 0 ? (
                      <>
                        {monthlyData.totalChicksHatched.toLocaleString('en-IN')}
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a', marginLeft: 6 }}>
                          ({monthlyData.hatchRate}%)
                        </span>
                      </>
                    ) : (
                      <span style={{ fontSize: '1.25rem', color: '#64748b' }}>In Incubation</span>
                    )}
                  </div>
                  <div className="kpi-sub">
                    {monthlyData.hatchRate ? (
                      <span style={{ color: '#15803d', fontWeight: 700 }}>
                        ✓ {monthlyData.hatchRate}% average hatch rate
                      </span>
                    ) : (
                      <span>Hatching data records when delivered</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Summary: Financial Health */}
              <div className="analytics-card" style={{ marginBottom: 20 }}>
                <div className="analytics-card-header">
                  <h4 className="analytics-card-title">
                    <span>💵</span> Monthly Revenue & Collection Breakdown
                  </h4>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Total Billed: Rs {monthlyData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {monthlyData.totalAmount > 0 ? (
                  <>
                    <div className="progress-track" style={{ height: 16, marginBottom: 12 }}>
                      <div
                        style={{
                          width: `${((monthlyData.amountPaid / monthlyData.totalAmount) * 100).toFixed(1)}%`,
                          background: '#16a34a',
                          transition: 'width 0.4s ease',
                        }}
                        title={`Paid: Rs ${monthlyData.amountPaid} (${((monthlyData.amountPaid / monthlyData.totalAmount) * 100).toFixed(1)}%)`}
                      />
                      <div
                        style={{
                          width: `${((monthlyData.balanceDue / monthlyData.totalAmount) * 100).toFixed(1)}%`,
                          background: '#dc2626',
                          transition: 'width 0.4s ease',
                        }}
                        title={`Due: Rs ${monthlyData.balanceDue} (${((monthlyData.balanceDue / monthlyData.totalAmount) * 100).toFixed(1)}%)`}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: '#16a34a', display: 'inline-block' }}></span>
                        <span><strong>Paid Collected:</strong> Rs {monthlyData.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, padding: '1px 6px', fontSize: '0.75rem' }}>
                          {((monthlyData.amountPaid / monthlyData.totalAmount) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: '#dc2626', display: 'inline-block' }}></span>
                        <span><strong>Balance Due:</strong> Rs {monthlyData.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className="badge" style={{ background: '#fee2e2', color: '#b91c1c', fontWeight: 700, padding: '1px 6px', fontSize: '0.75rem' }}>
                          {((monthlyData.balanceDue / monthlyData.totalAmount) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>No sales recorded for this month yet.</p>
                )}
              </div>

              {/* Monthly Bowler Scorecard (Day 1 to 31 Metric Matrix) */}
              <div className="analytics-card" style={{ marginBottom: 20 }}>
                <div className="analytics-card-header">
                  <div>
                    <h4 className="analytics-card-title">
                      <span>🎯</span> Monthly Bowler Scorecard — {formatMonthLabel(selectedMonth)}
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Day-by-day operational grid tracking egg intake, revenue, collections, and pending balances across all {monthlyData.totalDaysInMonth} days.
                    </p>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    👉 Scroll horizontally to see all days • Click day to view
                  </span>
                </div>

                <div className="bowler-table-container">
                  <table className="bowler-table">
                    <thead>
                      <tr>
                        <th className="bowler-sticky-col">Metric \ Day</th>
                        {monthlyData.dailyBreakdown.map((item) => {
                          const isToday = item.dateStr === todayStr;
                          const hasData = item.eggs > 0 || item.deliveriesCount > 0;
                          return (
                            <th
                              key={item.day}
                              className={isToday ? 'bowler-cell-today' : ''}
                              style={{
                                cursor: 'pointer',
                                color: isToday ? '#1d4ed8' : (hasData ? '#0f172a' : '#64748b'),
                                fontWeight: isToday ? 800 : 700,
                              }}
                              onClick={() => {
                                setSelectedDate(item.dateStr);
                                setTimeframe('daily');
                              }}
                              title={`Click to view Daily Analytics for ${formatDate(item.dateStr)}`}
                            >
                              <div>{item.day}</div>
                              {isToday && (
                                <div style={{ fontSize: '0.58rem', color: '#2563eb', fontWeight: 800 }}>TODAY</div>
                              )}
                            </th>
                          );
                        })}
                        <th className="bowler-total-col">TOTAL / MTD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Row 1: Eggs Collected */}
                      <tr>
                        <td className="bowler-sticky-col">
                          <span style={{ marginRight: 6 }}>🥚</span> Eggs Collected
                        </td>
                        {monthlyData.dailyBreakdown.map((item) => (
                          <td key={'eggs-' + item.day} className={item.dateStr === todayStr ? 'bowler-cell-today' : (item.eggs > 0 ? 'bowler-cell-active' : '')}>
                            {item.eggs > 0 ? (
                              <strong style={{ color: '#2563eb' }}>{item.eggs.toLocaleString('en-IN')}</strong>
                            ) : (
                              <span className="bowler-muted-dash">-</span>
                            )}
                          </td>
                        ))}
                        <td className="bowler-total-col" style={{ color: '#2563eb' }}>
                          {monthlyData.totalEggs.toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* Row 2: Orders / Sales Count */}
                      <tr>
                        <td className="bowler-sticky-col">
                          <span style={{ marginRight: 6 }}>📦</span> Orders Count
                        </td>
                        {monthlyData.dailyBreakdown.map((item) => (
                          <td key={'orders-' + item.day} className={item.dateStr === todayStr ? 'bowler-cell-today' : (item.salesCount > 0 ? 'bowler-cell-active' : '')}>
                            {item.salesCount > 0 ? (
                              <strong>{item.salesCount}</strong>
                            ) : (
                              <span className="bowler-muted-dash">-</span>
                            )}
                          </td>
                        ))}
                        <td className="bowler-total-col">
                          {monthlyData.salesCount}
                        </td>
                      </tr>

                      {/* Row 3: Revenue Billed */}
                      <tr>
                        <td className="bowler-sticky-col">
                          <span style={{ marginRight: 6 }}>💰</span> Revenue Billed (₹)
                        </td>
                        {monthlyData.dailyBreakdown.map((item) => (
                          <td key={'amount-' + item.day} className={item.dateStr === todayStr ? 'bowler-cell-today' : (item.amount > 0 ? 'bowler-cell-active' : '')}>
                            {item.amount > 0 ? (
                              <strong>₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                            ) : (
                              <span className="bowler-muted-dash">-</span>
                            )}
                          </td>
                        ))}
                        <td className="bowler-total-col">
                          ₹{monthlyData.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>

                      {/* Row 4: Money Collected (Paid) */}
                      <tr>
                        <td className="bowler-sticky-col">
                          <span style={{ marginRight: 6 }}>💵</span> Money Collected (₹)
                        </td>
                        {monthlyData.dailyBreakdown.map((item) => (
                          <td key={'paid-' + item.day} className={item.dateStr === todayStr ? 'bowler-cell-today' : (item.paid > 0 ? 'bowler-cell-active' : '')}>
                            {item.paid > 0 ? (
                              <strong style={{ color: '#16a34a' }}>₹{item.paid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                            ) : (
                              <span className="bowler-muted-dash">-</span>
                            )}
                          </td>
                        ))}
                        <td className="bowler-total-col" style={{ color: '#16a34a' }}>
                          ₹{monthlyData.amountPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>

                      {/* Row 5: Balance Due (Pending) */}
                      <tr>
                        <td className="bowler-sticky-col">
                          <span style={{ marginRight: 6 }}>⏳</span> Balance Due (₹)
                        </td>
                        {monthlyData.dailyBreakdown.map((item) => (
                          <td key={'bal-' + item.day} className={item.dateStr === todayStr ? 'bowler-cell-today' : (item.balance > 0 ? 'bowler-cell-active' : '')}>
                            {item.balance > 0 ? (
                              <strong style={{ color: '#dc2626' }}>₹{item.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                            ) : (
                              <span className="bowler-muted-dash">-</span>
                            )}
                          </td>
                        ))}
                        <td className="bowler-total-col" style={{ color: '#dc2626' }}>
                          ₹{monthlyData.balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </td>
                      </tr>

                      {/* Row 6: Deliveries Scheduled */}
                      <tr>
                        <td className="bowler-sticky-col">
                          <span style={{ marginRight: 6 }}>🚚</span> Deliveries Due
                        </td>
                        {monthlyData.dailyBreakdown.map((item) => (
                          <td key={'del-' + item.day} className={item.dateStr === todayStr ? 'bowler-cell-today' : (item.deliveriesCount > 0 ? 'bowler-cell-active' : '')}>
                            {item.deliveriesCount > 0 ? (
                              <span className="badge" style={{ fontSize: '0.72rem', padding: '1px 6px' }}>{item.deliveriesCount}</span>
                            ) : (
                              <span className="bowler-muted-dash">-</span>
                            )}
                          </td>
                        ))}
                        <td className="bowler-total-col">
                          {monthlyData.dailyBreakdown.reduce((s, i) => s + i.deliveriesCount, 0)}
                        </td>
                      </tr>

                      {/* Row 7: Chicks Delivered */}
                      <tr>
                        <td className="bowler-sticky-col">
                          <span style={{ marginRight: 6 }}>🐣</span> Chicks Delivered
                        </td>
                        {monthlyData.dailyBreakdown.map((item) => (
                          <td key={'chicks-' + item.day} className={item.dateStr === todayStr ? 'bowler-cell-today' : (item.chicksDelivered > 0 ? 'bowler-cell-active' : '')}>
                            {item.chicksDelivered > 0 ? (
                              <strong style={{ color: '#ea580c' }}>{item.chicksDelivered}</strong>
                            ) : (
                              <span className="bowler-muted-dash">-</span>
                            )}
                          </td>
                        ))}
                        <td className="bowler-total-col" style={{ color: '#ea580c' }}>
                          {monthlyData.dailyBreakdown.reduce((s, i) => s + i.chicksDelivered, 0) || monthlyData.totalChicksHatched}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Daily Egg Intake Interactive Bar Chart */}
              <div className="analytics-card" style={{ marginBottom: 20 }}>
                <div className="analytics-card-header">
                  <h4 className="analytics-card-title">
                    <span>📈</span> Daily Egg Intake Trend — {formatMonthLabel(selectedMonth)}
                  </h4>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Click any day to jump to Daily Analytics
                  </span>
                </div>

                <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', height: 170, gap: 4, minWidth: 620, padding: '0 4px 20px 4px', borderBottom: '2px solid #cbd5e1' }}>
                    {monthlyData.dailyBreakdown.map((item) => {
                      const heightPercent = item.eggs > 0 ? Math.max(12, (item.eggs / monthlyData.maxDailyEggs) * 100) : 4;
                      const isToday = item.dateStr === todayStr;

                      return (
                        <div
                          key={item.day}
                          className="chart-bar-col"
                          onClick={() => {
                            setSelectedDate(item.dateStr);
                            setTimeframe('daily');
                          }}
                          title={`${item.dateStr}: ${item.eggs} eggs (${item.salesCount} orders, Rs ${item.amount})`}
                        >
                          {item.eggs > 0 && (
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#1e293b', marginBottom: 2, whiteSpace: 'nowrap' }}>
                              {item.eggs}
                            </span>
                          )}
                          <div
                            style={{
                              width: '100%',
                              height: `${heightPercent}%`,
                              background: item.eggs > 0 ? (isToday ? '#1d4ed8' : '#3b82f6') : '#f1f5f9',
                              borderRadius: '4px 4px 0 0',
                              border: item.eggs > 0 ? '1px solid #2563eb' : '1px dashed #cbd5e1',
                              transition: 'all 0.2s',
                            }}
                          />
                          <span
                            style={{
                              position: 'absolute',
                              bottom: -22,
                              fontSize: '0.68rem',
                              fontWeight: isToday ? 800 : 500,
                              color: isToday ? '#2563eb' : (item.eggs > 0 ? '#1e293b' : '#94a3b8'),
                            }}
                          >
                            {item.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Village Breakdown & Orders Table */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {/* Top Villages */}
                <div className="analytics-card" style={{ margin: 0 }}>
                  <div className="analytics-card-header">
                    <h4 className="analytics-card-title">
                      <span>📍</span> Top Villages / Locations
                    </h4>
                    <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b' }}>
                      {monthlyData.topVillages.length} villages
                    </span>
                  </div>

                  {monthlyData.topVillages.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No data available.</p>
                  ) : (
                    <div className="table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
                      <table>
                        <thead>
                          <tr>
                            <th>Village</th>
                            <th>Orders</th>
                            <th>Eggs</th>
                            <th>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyData.topVillages.map((v, i) => (
                            <tr key={v.name}>
                              <td>
                                <strong>#{i + 1} {v.name}</strong>
                              </td>
                              <td>{v.orders}</td>
                              <td><span className="badge">{v.eggs}</span></td>
                              <td>Rs {v.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Hatching & Delivery Summary */}
                <div className="analytics-card" style={{ margin: 0 }}>
                  <div className="analytics-card-header">
                    <h4 className="analytics-card-title">
                      <span>🐣</span> Hatchery & Delivery Performance
                    </h4>
                    <span className="badge" style={{ background: '#ecfdf5', color: '#047857' }}>
                      {monthlyData.hatchRate ? `${monthlyData.hatchRate}% Avg Rate` : 'Active'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
                      <span>Total Sales Intake This Month</span>
                      <strong>{monthlyData.salesCount} orders ({monthlyData.totalEggs} eggs)</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
                      <span>Completed / Delivered Batches</span>
                      <strong style={{ color: '#16a34a' }}>{monthlyData.batchDeliveredCount} orders delivered</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 6 }}>
                      <span>Total Chicks Produced & Handed Over</span>
                      <strong style={{ color: '#ea580c' }}>
                        {monthlyData.totalChicksHatched > 0 ? `${monthlyData.totalChicksHatched} chicks` : '0 chicks'}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                      <span>Average Hatchability Success</span>
                      <strong style={{ color: '#15803d', fontSize: '1.05rem' }}>
                        {monthlyData.hatchRate ? `🐣 ${monthlyData.hatchRate}%` : 'Pending delivery'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. DAILY VIEW */}
          {/* ========================================================================= */}
          {timeframe === 'daily' && (
            <div>
              {/* Daily Filter Controls */}
              <div className="filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label htmlFor="dashboard_date" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    Select Date:
                  </label>
                  <input
                    id="dashboard_date"
                    type="date"
                    className="filter-date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={{ fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {/* Yesterday */}
                  {(() => {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    const yStr = y.toISOString().split('T')[0];
                    return (
                      <button
                        className={`filter-btn ${selectedDate === yStr ? 'active' : ''}`}
                        onClick={() => setSelectedDate(yStr)}
                      >
                        Yesterday
                      </button>
                    );
                  })()}

                  <button
                    className={`filter-btn ${selectedDate === todayStr ? 'active' : ''}`}
                    onClick={() => setSelectedDate(todayStr)}
                  >
                    Today
                  </button>

                  {/* Tomorrow */}
                  {(() => {
                    const t = new Date();
                    t.setDate(t.getDate() + 1);
                    const tStr = t.toISOString().split('T')[0];
                    return (
                      <button
                        className={`filter-btn ${selectedDate === tStr ? 'active' : ''}`}
                        onClick={() => setSelectedDate(tStr)}
                      >
                        Tomorrow
                      </button>
                    );
                  })()}
                </div>
              </div>

              {/* Daily KPI Metric Cards */}
              <div className="dashboard-grid">
                {/* 1. Total Sales Count */}
                <div className="kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
                  <div className="kpi-header">
                    <span className="kpi-title">Sales on this Date</span>
                    <span className="kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>📦</span>
                  </div>
                  <div className="kpi-value">{dailyData.salesCount}</div>
                  <div className="kpi-sub">
                    <span>{formatDate(selectedDate)}</span>
                  </div>
                </div>

                {/* 2. Eggs Received */}
                <div className="kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                  <div className="kpi-header">
                    <span className="kpi-title">Eggs Received</span>
                    <span className="kpi-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>🥚</span>
                  </div>
                  <div className="kpi-value" style={{ color: '#6d28d9' }}>
                    {dailyData.eggsReceived.toLocaleString('en-IN')}
                  </div>
                  <div className="kpi-sub">
                    <span>Avg {dailyData.avgEggsPerSale} eggs / customer</span>
                  </div>
                </div>

                {/* 3. Total Amount Earned */}
                <div className="kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
                  <div className="kpi-header">
                    <span className="kpi-title">Amount Earned</span>
                    <span className="kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>💰</span>
                  </div>
                  <div className="kpi-value" style={{ color: '#15803d' }}>
                    Rs {dailyData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="kpi-sub">
                    <span style={{ color: '#15803d', fontWeight: 600 }}>Paid: Rs {dailyData.amountPaid.toFixed(2)}</span>
                    {dailyData.balanceDue > 0 && (
                      <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: 4 }}>
                        • Due: Rs {dailyData.balanceDue.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4. Deliveries / Chicks on this date */}
                <div className="kpi-card" style={{ borderLeft: '4px solid #ea580c' }}>
                  <div className="kpi-header">
                    <span className="kpi-title">Deliveries & Chicks</span>
                    <span className="kpi-icon" style={{ background: '#fff7ed', color: '#ea580c' }}>🚚</span>
                  </div>
                  <div className="kpi-value" style={{ color: '#c2410c' }}>
                    {dailyData.deliveriesCount} orders
                  </div>
                  <div className="kpi-sub">
                    {dailyData.chicksDelivered > 0 ? (
                      <span style={{ color: '#15803d', fontWeight: 700 }}>
                        🐣 {dailyData.chicksDelivered} chicks delivered ({dailyData.hatchRate}%)
                      </span>
                    ) : (
                      <span>{dailyData.deliveredCount} delivered so far</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Table of Orders Received on this Date */}
              <div className="analytics-card" style={{ marginBottom: 20 }}>
                <div className="analytics-card-header">
                  <h4 className="analytics-card-title">
                    <span>📋</span> Orders Received on {formatDate(selectedDate)}
                  </h4>
                  <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b' }}>
                    {dailyData.salesCount} orders
                  </span>
                </div>

                {dailyData.salesCount === 0 ? (
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    No sales/batches were received on {formatDate(selectedDate)}.
                  </p>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Customer</th>
                          <th>Eggs</th>
                          <th>Village</th>
                          <th>Mobile</th>
                          <th>Mark</th>
                          <th>Seal</th>
                          <th>Amount</th>
                          <th>Paid</th>
                          <th>Balance</th>
                          <th>Delivery Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyData.sales.map((c) => (
                          <tr key={c.id}>
                            <td><strong>{c.customerId}</strong></td>
                            <td>{c.customer_name}</td>
                            <td><span className="badge">{c.num_eggs}</span></td>
                            <td>{c.village_city}</td>
                            <td>{c.mobile_number}</td>
                            <td>{c.egg_mark || '-'}</td>
                            <td>{c.seal === 'Yes' ? <span className="badge" style={{ background: '#7c3aed', color: '#fff' }}>SEAL</span> : 'No'}</td>
                            <td>Rs {Number(c.total_amount || 0).toFixed(2)}</td>
                            <td>Rs {Number(c.amount_paid || 0).toFixed(2)}</td>
                            <td className={Number(c.balance || 0) > 0 ? 'overdue' : 'paid-clear'}>
                              <strong>Rs {Number(c.balance || 0).toFixed(2)}</strong>
                            </td>
                            <td><strong>{formatDate(c.deliveryDate)}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Deliveries Scheduled on this Date (if any) */}
              {dailyData.deliveriesCount > 0 && (
                <div className="analytics-card">
                  <div className="analytics-card-header">
                    <h4 className="analytics-card-title">
                      <span>🚚</span> Deliveries Scheduled for {formatDate(selectedDate)}
                    </h4>
                    <span className="badge" style={{ background: '#ecfdf5', color: '#047857' }}>
                      {dailyData.deliveriesCount} orders
                    </span>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Customer</th>
                          <th>Eggs</th>
                          <th>Village</th>
                          <th>Phone</th>
                          <th>Status</th>
                          <th>Chicks Delivered</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyData.deliveries.map((c) => (
                          <tr key={c.id}>
                            <td><strong>{c.customerId}</strong></td>
                            <td>{c.customer_name}</td>
                            <td><span className="badge">{c.num_eggs}</span></td>
                            <td>{c.village_city}</td>
                            <td>{c.mobile_number}</td>
                            <td>
                              {c.delivery_status === 'Delivered' ? (
                                <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                                  ✓ Delivered
                                </span>
                              ) : (
                                <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                                  ⏳ Pending
                                </span>
                              )}
                            </td>
                            <td>
                              {c.chicks_count !== undefined && c.chicks_count !== '' ? (
                                <span style={{ fontWeight: 700, color: '#16a34a' }}>
                                  🐣 {c.chicks_count} chicks ({Number(c.num_eggs) > 0 ? ((Number(c.chicks_count) / Number(c.num_eggs)) * 100).toFixed(0) : 0}%)
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className={Number(c.balance || 0) > 0 ? 'overdue' : 'paid-clear'}>
                              Rs {Number(c.balance || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. ALL-TIME & YEARLY OVERVIEW */}
          {/* ========================================================================= */}
          {timeframe === 'all' && (() => {
            const isAllYears = selectedYear === 'all';
            const anyYearExpanded = yearsAscending.some((yr) => expandedYears.has(yr));
            const yData = !isAllYears ? (yearMetricsMap[selectedYear] || {}) : null;

            const kpiOrders = isAllYears ? allTimeData.totalOrders : (yData?.orders || 0);
            const kpiEggs = isAllYears ? allTimeData.totalEggs : (yData?.eggs || 0);
            const kpiAmount = isAllYears ? allTimeData.totalAmount : (yData?.amount || 0);
            const kpiPaid = isAllYears ? allTimeData.amountPaid : (yData?.paid || 0);
            const kpiBalance = isAllYears ? allTimeData.balanceDue : (yData?.balance || 0);

            const filteredMonthlyHistory = isAllYears
              ? allTimeData.monthlyHistory
              : allTimeData.monthlyHistory.filter((m) => m.month.startsWith(selectedYear));

            return (
              <div>
                {/* Year Selector Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 18,
                    background: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                      📅 Filter Year:
                    </span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={`filter-btn ${isAllYears ? 'active' : ''}`}
                        onClick={() => setSelectedYear('all')}
                        style={{ padding: '5px 14px', fontSize: '0.82rem', fontWeight: 700 }}
                      >
                        All Years (All-Time)
                      </button>
                      {availableYears.map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          className={`filter-btn ${selectedYear === yr ? 'active' : ''}`}
                          onClick={() => setSelectedYear(yr)}
                          style={{ padding: '5px 14px', fontSize: '0.82rem', fontWeight: 700 }}
                        >
                          {yr}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isAllYears && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.74rem', height: 26 }}
                        onClick={expandAllYears}
                        title="Expand all years into monthly columns"
                      >
                        📂 Expand All Years
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.74rem', height: 26 }}
                        onClick={collapseAllYears}
                        title="Collapse all years to summary columns"
                      >
                        📁 Collapse All Years
                      </button>
                    </div>
                  )}
                </div>

                {/* KPI Cards */}
                <div className="dashboard-grid">
                  <div className="kpi-card" style={{ borderLeft: '4px solid #2563eb' }}>
                    <div className="kpi-header">
                      <span className="kpi-title">{isAllYears ? 'Lifetime Sales' : `${selectedYear} Total Sales`}</span>
                      <span className="kpi-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>📦</span>
                    </div>
                    <div className="kpi-value">{kpiOrders.toLocaleString('en-IN')}</div>
                    <div className="kpi-sub">
                      <span>{isAllYears ? 'Total customer orders' : `Customer orders in ${selectedYear}`}</span>
                    </div>
                  </div>

                  <div className="kpi-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
                    <div className="kpi-header">
                      <span className="kpi-title">{isAllYears ? 'Total Eggs Received' : `${selectedYear} Eggs Received`}</span>
                      <span className="kpi-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>🥚</span>
                    </div>
                    <div className="kpi-value" style={{ color: '#6d28d9' }}>
                      {kpiEggs.toLocaleString('en-IN')}
                    </div>
                    <div className="kpi-sub">
                      <span>{isAllYears ? 'Incubated across all batches' : `Incubated in ${selectedYear}`}</span>
                    </div>
                  </div>

                  <div className="kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
                    <div className="kpi-header">
                      <span className="kpi-title">{isAllYears ? 'Total Revenue Billed' : `${selectedYear} Revenue Billed`}</span>
                      <span className="kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>💰</span>
                    </div>
                    <div className="kpi-value" style={{ color: '#15803d' }}>
                      Rs {kpiAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="kpi-sub">
                      <span style={{ color: '#15803d', fontWeight: 600 }}>Collected: Rs {kpiPaid.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
                    <div className="kpi-header">
                      <span className="kpi-title">{isAllYears ? 'Total Balance Pending' : `${selectedYear} Balance Due`}</span>
                      <span className="kpi-icon" style={{ background: '#fef2f2', color: '#dc2626' }}>⏳</span>
                    </div>
                    <div className="kpi-value" style={{ color: '#b91c1c' }}>
                      Rs {kpiBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="kpi-sub">
                      <span>{isAllYears ? 'Receivable balances' : `Receivables for ${selectedYear}`}</span>
                    </div>
                  </div>
                </div>

                {/* =================================================================== */}
                {/* CASE A: SPECIFIC YEAR SELECTED -> SHOW 12-MONTH BOWLER (JAN - DEC) */}
                {/* =================================================================== */}
                {!isAllYears && (
                  <div className="analytics-card" style={{ marginBottom: 20 }}>
                    <div className="analytics-card-header">
                      <div>
                        <h4 className="analytics-card-title">
                          <span>🎯</span> {selectedYear} Monthly Bowler Scorecard (Jan – Dec)
                        </h4>
                        <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          12-month operational scorecard tracking egg collection, revenue, collections, and hatchability across {selectedYear}.
                        </p>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        👉 Click any month header to drill into Monthly Analytics
                      </span>
                    </div>

                    <div className="bowler-table-container">
                      <table className="bowler-table">
                        <thead>
                          <tr>
                            <th className="bowler-sticky-col">Metric \ Month</th>
                            {(yData?.months || []).map((m) => {
                              const isCurrentMonth = m.monthStr === currentMonthStr;
                              return (
                                <th
                                  key={m.monthStr}
                                  className={isCurrentMonth ? 'bowler-cell-today' : ''}
                                  style={{ cursor: 'pointer', minWidth: 65, textAlign: 'center' }}
                                  onClick={() => {
                                    setSelectedMonth(m.monthStr);
                                    setTimeframe('monthly');
                                  }}
                                  title={`Click to open Monthly Analytics for ${m.shortName} ${selectedYear}`}
                                >
                                  <div><strong>{m.shortName}</strong></div>
                                  {isCurrentMonth && (
                                    <div style={{ fontSize: '0.58rem', color: '#2563eb', fontWeight: 800 }}>CURRENT</div>
                                  )}
                                </th>
                              );
                            })}
                            <th className="bowler-total-col">{selectedYear} TOTAL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Row 1: Eggs Collected */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>🥚</span> Eggs Collected
                            </td>
                            {(yData?.months || []).map((m) => (
                              <td key={'y-eggs-' + m.monthStr} className={m.eggs > 0 ? 'bowler-cell-active' : ''} style={{ textAlign: 'center' }}>
                                {m.eggs > 0 ? <strong style={{ color: '#2563eb' }}>{m.eggs.toLocaleString('en-IN')}</strong> : <span className="bowler-muted-dash">-</span>}
                              </td>
                            ))}
                            <td className="bowler-total-col" style={{ color: '#2563eb' }}>
                              {(yData?.eggs || 0).toLocaleString('en-IN')}
                            </td>
                          </tr>

                          {/* Row 2: Total Orders */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>📦</span> Total Orders
                            </td>
                            {(yData?.months || []).map((m) => (
                              <td key={'y-orders-' + m.monthStr} className={m.orders > 0 ? 'bowler-cell-active' : ''} style={{ textAlign: 'center' }}>
                                {m.orders > 0 ? <strong>{m.orders}</strong> : <span className="bowler-muted-dash">-</span>}
                              </td>
                            ))}
                            <td className="bowler-total-col">
                              {yData?.orders || 0}
                            </td>
                          </tr>

                          {/* Row 3: Revenue Billed */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>💰</span> Revenue Billed (₹)
                            </td>
                            {(yData?.months || []).map((m) => (
                              <td key={'y-amount-' + m.monthStr} style={{ textAlign: 'center' }}>
                                {m.amount > 0 ? <strong>₹{m.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong> : <span className="bowler-muted-dash">-</span>}
                              </td>
                            ))}
                            <td className="bowler-total-col">
                              ₹{(yData?.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>

                          {/* Row 4: Money Collected */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>💵</span> Money Collected (₹)
                            </td>
                            {(yData?.months || []).map((m) => (
                              <td key={'y-paid-' + m.monthStr} style={{ textAlign: 'center' }}>
                                {m.paid > 0 ? <strong style={{ color: '#16a34a' }}>₹{m.paid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong> : <span className="bowler-muted-dash">-</span>}
                              </td>
                            ))}
                            <td className="bowler-total-col" style={{ color: '#16a34a' }}>
                              ₹{(yData?.paid || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>

                          {/* Row 5: Balance Due */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>⏳</span> Balance Due (₹)
                            </td>
                            {(yData?.months || []).map((m) => (
                              <td key={'y-bal-' + m.monthStr} style={{ textAlign: 'center' }}>
                                {m.balance > 0 ? (
                                  <strong style={{ color: '#dc2626' }}>₹{m.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                                ) : m.amount > 0 ? (
                                  <span style={{ color: '#15803d', fontWeight: 600 }}>₹0</span>
                                ) : (
                                  <span className="bowler-muted-dash">-</span>
                                )}
                              </td>
                            ))}
                            <td className="bowler-total-col" style={{ color: (yData?.balance || 0) > 0 ? '#dc2626' : '#15803d' }}>
                              ₹{(yData?.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>

                          {/* Row 6: Avg Eggs Per Day */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>📊</span> Avg Eggs / Day
                            </td>
                            {(yData?.months || []).map((m) => (
                              <td key={'y-avg-' + m.monthStr} style={{ textAlign: 'center' }}>
                                {Number(m.avgEggsPerDay) > 0 ? <span style={{ fontWeight: 600 }}>{m.avgEggsPerDay}</span> : <span className="bowler-muted-dash">-</span>}
                              </td>
                            ))}
                            <td className="bowler-total-col">
                              {yData?.avgEggsPerDay || '0'}
                            </td>
                          </tr>

                          {/* Row 7: Chicks Hatched */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>🐣</span> Chicks Hatched
                            </td>
                            {(yData?.months || []).map((m) => (
                              <td key={'y-chicks-' + m.monthStr} style={{ textAlign: 'center' }}>
                                {m.chicks > 0 ? <strong style={{ color: '#ea580c' }}>{m.chicks}</strong> : <span className="bowler-muted-dash">-</span>}
                              </td>
                            ))}
                            <td className="bowler-total-col" style={{ color: '#ea580c' }}>
                              {yData?.chicks > 0 ? yData.chicks : '-'}
                            </td>
                          </tr>

                          {/* Row 8: Hatch Rate % */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>🎯</span> Hatch Rate %
                            </td>
                            {(yData?.months || []).map((m) => (
                              <td key={'y-rate-' + m.monthStr} style={{ textAlign: 'center' }}>
                                {m.hatchRate ? (
                                  <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem', padding: '1px 6px' }}>
                                    {m.hatchRate}%
                                  </span>
                                ) : (
                                  <span className="bowler-muted-dash">-</span>
                                )}
                              </td>
                            ))}
                            <td className="bowler-total-col">
                              {yData?.hatchRate ? (
                                <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem', padding: '1px 6px' }}>
                                  {yData.hatchRate}%
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* =================================================================== */}
                {/* CASE B: ALL YEARS (ALL-TIME) -> MULTI-YEAR BOWLER WITH COLLAPSIBLE YEAR HEADERS */}
                {/* =================================================================== */}
                {isAllYears && (
                  <div className="analytics-card" style={{ marginBottom: 20 }}>
                    <div className="analytics-card-header">
                      <div>
                        <h4 className="analytics-card-title">
                          <span>🎯</span> All-Time Multi-Year Bowler Scorecard
                        </h4>
                        <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Yearly executive overview with collapsible year headers (click <strong>Expand ▾</strong> on any year like 2024, 2025, 2026 to see full monthly details).
                        </p>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        👉 Click any month header to drill into Monthly Analytics
                      </span>
                    </div>

                    <div className="bowler-table-container">
                      <table className="bowler-table">
                        <thead>
                          <tr>
                            <th className="bowler-sticky-col" rowSpan={anyYearExpanded ? 2 : 1}>
                              Metric \ Period
                            </th>
                            {yearsAscending.map((yr) => {
                              const isExp = expandedYears.has(yr);
                              return isExp ? (
                                <th
                                  key={'th-yr-' + yr}
                                  colSpan={13}
                                  style={{
                                    textAlign: 'center',
                                    background: '#eff6ff',
                                    color: '#1d4ed8',
                                    borderRight: '2px solid #94a3b8',
                                    padding: '6px 8px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <span>📅 <strong>{yr}</strong> (12 Months Breakdown)</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleYearExpand(yr)}
                                      style={{
                                        padding: '1px 8px',
                                        fontSize: '0.68rem',
                                        background: '#ffffff',
                                        border: '1px solid #93c5fd',
                                        borderRadius: 4,
                                        cursor: 'pointer',
                                        fontWeight: 700,
                                        color: '#1d4ed8',
                                      }}
                                      title={`Collapse ${yr} into single column`}
                                    >
                                      Collapse ▴
                                    </button>
                                  </div>
                                </th>
                              ) : (
                                <th
                                  key={'th-yr-' + yr}
                                  rowSpan={anyYearExpanded ? 2 : 1}
                                  style={{
                                    textAlign: 'center',
                                    background: '#f8fafc',
                                    minWidth: 105,
                                    borderRight: '1px solid #cbd5e1',
                                    padding: '6px 8px',
                                  }}
                                >
                                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>{yr}</div>
                                  <button
                                    type="button"
                                    onClick={() => toggleYearExpand(yr)}
                                    style={{
                                      marginTop: 4,
                                      padding: '2px 8px',
                                      fontSize: '0.68rem',
                                      background: '#ffffff',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: 4,
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      color: '#2563eb',
                                    }}
                                    title={`Expand ${yr} into 12 monthly columns`}
                                  >
                                    Expand ▾
                                  </button>
                                </th>
                              );
                            })}
                            <th className="bowler-total-col" rowSpan={anyYearExpanded ? 2 : 1}>
                              LIFETIME TOTAL
                            </th>
                          </tr>

                          {/* Row 2: Sub-headers for Expanded Years */}
                          {anyYearExpanded && (
                            <tr>
                              {yearsAscending.map((yr) => {
                                if (!expandedYears.has(yr)) return null;
                                const yObj = yearMetricsMap[yr] || {};
                                return (
                                  <>
                                    {(yObj.months || []).map((m) => {
                                      const isCurr = m.monthStr === currentMonthStr;
                                      return (
                                        <th
                                          key={'subth-' + m.monthStr}
                                          className={isCurr ? 'bowler-cell-today' : ''}
                                          style={{
                                            minWidth: 55,
                                            textAlign: 'center',
                                            fontSize: '0.72rem',
                                            padding: '4px 3px',
                                            cursor: 'pointer',
                                          }}
                                          onClick={() => {
                                            setSelectedMonth(m.monthStr);
                                            setTimeframe('monthly');
                                          }}
                                          title={`View ${m.shortName} ${yr} Monthly Analytics`}
                                        >
                                          <div>{m.shortName}</div>
                                        </th>
                                      );
                                    })}
                                    <th
                                      key={'subth-tot-' + yr}
                                      style={{
                                        minWidth: 70,
                                        textAlign: 'center',
                                        background: '#dbeafe',
                                        color: '#1e40af',
                                        fontWeight: 800,
                                        fontSize: '0.72rem',
                                        borderRight: '2px solid #94a3b8',
                                      }}
                                    >
                                      {yr} Total
                                    </th>
                                  </>
                                );
                              })}
                            </tr>
                          )}
                        </thead>
                        <tbody>
                          {/* Row 1: Eggs Collected */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>🥚</span> Eggs Collected
                            </td>
                            {yearsAscending.map((yr) => {
                              const yObj = yearMetricsMap[yr] || {};
                              const isExp = expandedYears.has(yr);
                              if (!isExp) {
                                return (
                                  <td key={'my-eggs-' + yr} style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                                    {yObj.eggs > 0 ? (
                                      <strong style={{ color: '#2563eb' }}>{yObj.eggs.toLocaleString('en-IN')}</strong>
                                    ) : (
                                      <span className="bowler-muted-dash">-</span>
                                    )}
                                  </td>
                                );
                              }
                              return (
                                <>
                                  {(yObj.months || []).map((m) => (
                                    <td key={'my-eggs-' + m.monthStr} style={{ textAlign: 'center' }}>
                                      {m.eggs > 0 ? <strong style={{ color: '#2563eb' }}>{m.eggs.toLocaleString('en-IN')}</strong> : <span className="bowler-muted-dash">-</span>}
                                    </td>
                                  ))}
                                  <td key={'my-eggs-tot-' + yr} style={{ textAlign: 'center', background: '#eff6ff', fontWeight: 800, color: '#1e40af', borderRight: '2px solid #94a3b8' }}>
                                    {(yObj.eggs || 0).toLocaleString('en-IN')}
                                  </td>
                                </>
                              );
                            })}
                            <td className="bowler-total-col" style={{ color: '#2563eb' }}>
                              {allTimeData.totalEggs.toLocaleString('en-IN')}
                            </td>
                          </tr>

                          {/* Row 2: Total Orders */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>📦</span> Total Orders
                            </td>
                            {yearsAscending.map((yr) => {
                              const yObj = yearMetricsMap[yr] || {};
                              const isExp = expandedYears.has(yr);
                              if (!isExp) {
                                return (
                                  <td key={'my-orders-' + yr} style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                                    {yObj.orders > 0 ? <strong>{yObj.orders}</strong> : <span className="bowler-muted-dash">-</span>}
                                  </td>
                                );
                              }
                              return (
                                <>
                                  {(yObj.months || []).map((m) => (
                                    <td key={'my-orders-' + m.monthStr} style={{ textAlign: 'center' }}>
                                      {m.orders > 0 ? <strong>{m.orders}</strong> : <span className="bowler-muted-dash">-</span>}
                                    </td>
                                  ))}
                                  <td key={'my-orders-tot-' + yr} style={{ textAlign: 'center', background: '#eff6ff', fontWeight: 800, color: '#1e40af', borderRight: '2px solid #94a3b8' }}>
                                    {yObj.orders || 0}
                                  </td>
                                </>
                              );
                            })}
                            <td className="bowler-total-col">
                              {allTimeData.totalOrders}
                            </td>
                          </tr>

                          {/* Row 3: Revenue Billed */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>💰</span> Revenue Billed (₹)
                            </td>
                            {yearsAscending.map((yr) => {
                              const yObj = yearMetricsMap[yr] || {};
                              const isExp = expandedYears.has(yr);
                              if (!isExp) {
                                return (
                                  <td key={'my-amount-' + yr} style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                                    {yObj.amount > 0 ? (
                                      <strong>₹{yObj.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                                    ) : (
                                      <span className="bowler-muted-dash">-</span>
                                    )}
                                  </td>
                                );
                              }
                              return (
                                <>
                                  {(yObj.months || []).map((m) => (
                                    <td key={'my-amount-' + m.monthStr} style={{ textAlign: 'center' }}>
                                      {m.amount > 0 ? <strong>₹{m.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong> : <span className="bowler-muted-dash">-</span>}
                                    </td>
                                  ))}
                                  <td key={'my-amount-tot-' + yr} style={{ textAlign: 'center', background: '#eff6ff', fontWeight: 800, color: '#1e40af', borderRight: '2px solid #94a3b8' }}>
                                    ₹{(yObj.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                  </td>
                                </>
                              );
                            })}
                            <td className="bowler-total-col">
                              ₹{allTimeData.totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>

                          {/* Row 4: Money Collected */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>💵</span> Money Collected (₹)
                            </td>
                            {yearsAscending.map((yr) => {
                              const yObj = yearMetricsMap[yr] || {};
                              const isExp = expandedYears.has(yr);
                              if (!isExp) {
                                return (
                                  <td key={'my-paid-' + yr} style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                                    {yObj.paid > 0 ? (
                                      <strong style={{ color: '#16a34a' }}>₹{yObj.paid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                                    ) : (
                                      <span className="bowler-muted-dash">-</span>
                                    )}
                                  </td>
                                );
                              }
                              return (
                                <>
                                  {(yObj.months || []).map((m) => (
                                    <td key={'my-paid-' + m.monthStr} style={{ textAlign: 'center' }}>
                                      {m.paid > 0 ? <strong style={{ color: '#16a34a' }}>₹{m.paid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong> : <span className="bowler-muted-dash">-</span>}
                                    </td>
                                  ))}
                                  <td key={'my-paid-tot-' + yr} style={{ textAlign: 'center', background: '#eff6ff', fontWeight: 800, color: '#16a34a', borderRight: '2px solid #94a3b8' }}>
                                    ₹{(yObj.paid || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                  </td>
                                </>
                              );
                            })}
                            <td className="bowler-total-col" style={{ color: '#16a34a' }}>
                              ₹{allTimeData.amountPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>

                          {/* Row 5: Balance Due */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>⏳</span> Balance Due (₹)
                            </td>
                            {yearsAscending.map((yr) => {
                              const yObj = yearMetricsMap[yr] || {};
                              const isExp = expandedYears.has(yr);
                              if (!isExp) {
                                return (
                                  <td key={'my-bal-' + yr} style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                                    {yObj.balance > 0 ? (
                                      <strong style={{ color: '#dc2626' }}>₹{yObj.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                                    ) : yObj.amount > 0 ? (
                                      <span style={{ color: '#15803d', fontWeight: 600 }}>₹0</span>
                                    ) : (
                                      <span className="bowler-muted-dash">-</span>
                                    )}
                                  </td>
                                );
                              }
                              return (
                                <>
                                  {(yObj.months || []).map((m) => (
                                    <td key={'my-bal-' + m.monthStr} style={{ textAlign: 'center' }}>
                                      {m.balance > 0 ? (
                                        <strong style={{ color: '#dc2626' }}>₹{m.balance.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
                                      ) : m.amount > 0 ? (
                                        <span style={{ color: '#15803d', fontWeight: 600 }}>₹0</span>
                                      ) : (
                                        <span className="bowler-muted-dash">-</span>
                                      )}
                                    </td>
                                  ))}
                                  <td key={'my-bal-tot-' + yr} style={{ textAlign: 'center', background: '#eff6ff', fontWeight: 800, color: (yObj.balance || 0) > 0 ? '#dc2626' : '#15803d', borderRight: '2px solid #94a3b8' }}>
                                    ₹{(yObj.balance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                  </td>
                                </>
                              );
                            })}
                            <td className="bowler-total-col" style={{ color: allTimeData.balanceDue > 0 ? '#dc2626' : '#15803d' }}>
                              ₹{allTimeData.balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </td>
                          </tr>

                          {/* Row 6: Avg Eggs Per Day */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>📊</span> Avg Eggs / Day
                            </td>
                            {yearsAscending.map((yr) => {
                              const yObj = yearMetricsMap[yr] || {};
                              const isExp = expandedYears.has(yr);
                              if (!isExp) {
                                return (
                                  <td key={'my-avg-' + yr} style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                                    {Number(yObj.avgEggsPerDay) > 0 ? yObj.avgEggsPerDay : <span className="bowler-muted-dash">-</span>}
                                  </td>
                                );
                              }
                              return (
                                <>
                                  {(yObj.months || []).map((m) => (
                                    <td key={'my-avg-' + m.monthStr} style={{ textAlign: 'center' }}>
                                      {Number(m.avgEggsPerDay) > 0 ? <span style={{ fontWeight: 600 }}>{m.avgEggsPerDay}</span> : <span className="bowler-muted-dash">-</span>}
                                    </td>
                                  ))}
                                  <td key={'my-avg-tot-' + yr} style={{ textAlign: 'center', background: '#eff6ff', fontWeight: 800, borderRight: '2px solid #94a3b8' }}>
                                    {yObj.avgEggsPerDay || '0'}
                                  </td>
                                </>
                              );
                            })}
                            <td className="bowler-total-col">
                              {allTimeData.monthlyBowlerList.length > 0
                                ? (allTimeData.totalEggs / (allTimeData.monthlyBowlerList.length * 30)).toFixed(1)
                                : '0'}
                            </td>
                          </tr>

                          {/* Row 7: Chicks Hatched */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>🐣</span> Chicks Hatched
                            </td>
                            {yearsAscending.map((yr) => {
                              const yObj = yearMetricsMap[yr] || {};
                              const isExp = expandedYears.has(yr);
                              if (!isExp) {
                                return (
                                  <td key={'my-chicks-' + yr} style={{ textAlign: 'center', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                                    {yObj.chicks > 0 ? <strong style={{ color: '#ea580c' }}>{yObj.chicks}</strong> : <span className="bowler-muted-dash">-</span>}
                                  </td>
                                );
                              }
                              return (
                                <>
                                  {(yObj.months || []).map((m) => (
                                    <td key={'my-chicks-' + m.monthStr} style={{ textAlign: 'center' }}>
                                      {m.chicks > 0 ? <strong style={{ color: '#ea580c' }}>{m.chicks}</strong> : <span className="bowler-muted-dash">-</span>}
                                    </td>
                                  ))}
                                  <td key={'my-chicks-tot-' + yr} style={{ textAlign: 'center', background: '#eff6ff', fontWeight: 800, color: '#ea580c', borderRight: '2px solid #94a3b8' }}>
                                    {yObj.chicks > 0 ? yObj.chicks : '-'}
                                  </td>
                                </>
                              );
                            })}
                            <td className="bowler-total-col" style={{ color: '#ea580c' }}>
                              {allTimeData.totalChicks > 0 ? allTimeData.totalChicks : '-'}
                            </td>
                          </tr>

                          {/* Row 8: Hatch Rate % */}
                          <tr>
                            <td className="bowler-sticky-col">
                              <span style={{ marginRight: 6 }}>🎯</span> Hatch Rate %
                            </td>
                            {yearsAscending.map((yr) => {
                              const yObj = yearMetricsMap[yr] || {};
                              const isExp = expandedYears.has(yr);
                              if (!isExp) {
                                return (
                                  <td key={'my-rate-' + yr} style={{ textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                                    {yObj.hatchRate ? (
                                      <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem', padding: '1px 6px' }}>
                                        {yObj.hatchRate}%
                                      </span>
                                    ) : (
                                      <span className="bowler-muted-dash">-</span>
                                    )}
                                  </td>
                                );
                              }
                              return (
                                <>
                                  {(yObj.months || []).map((m) => (
                                    <td key={'my-rate-' + m.monthStr} style={{ textAlign: 'center' }}>
                                      {m.hatchRate ? (
                                        <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem', padding: '1px 6px' }}>
                                          {m.hatchRate}%
                                        </span>
                                      ) : (
                                        <span className="bowler-muted-dash">-</span>
                                      )}
                                    </td>
                                  ))}
                                  <td key={'my-rate-tot-' + yr} style={{ textAlign: 'center', background: '#eff6ff', borderRight: '2px solid #94a3b8' }}>
                                    {yObj.hatchRate ? (
                                      <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem', padding: '1px 6px' }}>
                                        {yObj.hatchRate}%
                                      </span>
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                </>
                              );
                            })}
                            <td className="bowler-total-col">
                              {allTimeData.overallHatchRate ? (
                                <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: '0.75rem', padding: '1px 6px' }}>
                                  {allTimeData.overallHatchRate}%
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Monthly Historical Comparison Table */}
                <div className="analytics-card">
                  <div className="analytics-card-header">
                    <h4 className="analytics-card-title">
                      <span>🗓️</span> {isAllYears ? 'Month-by-Month Performance History' : `${selectedYear} Monthly Performance History`}
                    </h4>
                    <span className="badge" style={{ background: '#e2e8f0', color: '#1e293b' }}>
                      {filteredMonthlyHistory.length} months
                    </span>
                  </div>

                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Month</th>
                          <th>Orders</th>
                          <th>Eggs Received</th>
                          <th>Revenue</th>
                          <th>Paid</th>
                          <th>Balance Due</th>
                          <th>Chicks Hatched</th>
                          <th>Hatch Rate %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMonthlyHistory.map((m) => {
                          const rate = m.deliveredEggs > 0 ? ((m.chicks / m.deliveredEggs) * 100).toFixed(1) : null;
                          return (
                            <tr key={m.month}>
                              <td>
                                <button
                                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                  onClick={() => {
                                    setSelectedMonth(m.month);
                                    setTimeframe('monthly');
                                  }}
                                  title="Click to view full monthly details"
                                >
                                  {formatMonthLabel(m.month)} →
                                </button>
                              </td>
                              <td>{m.orders}</td>
                              <td><span className="badge">{m.eggs.toLocaleString('en-IN')}</span></td>
                              <td><strong>Rs {m.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
                              <td style={{ color: '#15803d' }}>Rs {m.paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td style={{ color: m.balance > 0 ? '#b91c1c' : '#15803d', fontWeight: m.balance > 0 ? 700 : 400 }}>
                                Rs {m.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td>{m.chicks > 0 ? `🐣 ${m.chicks}` : '-'}</td>
                              <td>
                                {rate ? (
                                  <span className="badge" style={{ background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                                    {rate}%
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
