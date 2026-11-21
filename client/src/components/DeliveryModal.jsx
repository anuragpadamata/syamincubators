import React, { useState } from 'react';
import { api } from '../api';

export default function DeliveryModal({ customer, onClose, onSuccess }) {
  if (!customer) return null;

  const numEggs = Number(customer.num_eggs || 0);
  const initialChicks = customer.chicks_count !== undefined && customer.chicks_count !== '' && customer.chicks_count !== null
    ? customer.chicks_count
    : '';

  const [chicksCount, setChicksCount] = useState(initialChicks);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const chicksNum = Number(chicksCount);
  const isValidCount = chicksCount !== '' && !isNaN(chicksNum) && chicksNum >= 0;
  const hatchRate = (numEggs > 0 && isValidCount) ? ((chicksNum / numEggs) * 100).toFixed(1) : null;

  const isAlreadyDelivered = customer.delivery_status === 'Delivered';

  const handleSave = async (markDelivered = true) => {
    setError('');
    if (markDelivered && !isValidCount) {
      setError('Please enter the number of chicks (or 0)');
      return;
    }

    setLoading(true);
    try {
      const statusVal = markDelivered ? 'Delivered' : 'Pending';
      const countVal = markDelivered ? chicksNum : '';
      const deliveredAtVal = markDelivered
        ? new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';

      const payload = {
        ...customer,
        delivery_status: statusVal,
        chicks_count: countVal,
        delivered_at: deliveredAtVal,
      };

      // 1. Send update to backend
      let updated = null;
      try {
        updated = await api.updateCustomer(customer.id, payload);
      } catch (apiErr) {
        console.warn('Backend update error, saving to local state:', apiErr);
      }

      // 2. Cache in localStorage so status persists even if offline
      try {
        const cache = JSON.parse(localStorage.getItem('delivery_status_cache') || '{}');
        cache[customer.id] = {
          delivery_status: statusVal,
          chicks_count: countVal,
          delivered_at: deliveredAtVal,
        };
        localStorage.setItem('delivery_status_cache', JSON.stringify(cache));
      } catch {}

      onSuccess(updated || payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update delivery status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="print-dialog-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="print-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 440, width: '92%', textAlign: 'left', padding: '20px 22px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🐣</span> {isAlreadyDelivered ? 'Update Delivery / Chicks' : 'Mark as Delivered'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Customer Info Box */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '1rem', color: '#1e293b' }}>
              {customer.customer_name} <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>({customer.customerId})</span>
            </strong>
            <span className="badge" style={{ fontSize: '0.8rem', background: '#3b82f6', color: '#fff' }}>
              {numEggs} eggs
            </span>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>Village: <strong>{customer.village_city || '-'}</strong></span>
            <span>Mobile: <strong>{customer.mobile_number || '-'}</strong></span>
          </div>

          {Number(customer.balance || 0) > 0 && (
            <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#dc2626', fontWeight: 600, background: '#fef2f2', padding: '4px 8px', borderRadius: 4 }}>
              ⚠️ Pending Balance: Rs {Number(customer.balance).toFixed(2)} (Collect balance upon delivery)
            </div>
          )}
        </div>

        {/* Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(true);
          }}
        >
          {error && (
            <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 10px', borderRadius: 6, fontSize: '0.82rem', marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              How many chicks hatched / delivered?
              <div style={{ fontSize: '0.78rem', fontWeight: 400, color: '#64748b' }}>
                ఎన్ని కోడి పిల్లలు వచ్చాయి? (గుడ్లు: {numEggs})
              </div>
            </label>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                max={numEggs * 2}
                value={chicksCount}
                onChange={(e) => setChicksCount(e.target.value)}
                placeholder="Enter chicks count..."
                autoFocus
                required
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '2px solid var(--primary)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>
                chicks
              </span>
            </div>
          </div>

          {/* Quick presets */}
          {numEggs > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 4 }}>Quick presets (హ్యాచింగ్ లెక్క):</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[70, 75, 80, 85, 90].map((pct) => {
                  const val = Math.round((numEggs * pct) / 100);
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setChicksCount(String(val))}
                      className="btn btn-sm"
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        height: 22,
                        minHeight: 'unset',
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        cursor: 'pointer',
                        borderRadius: 4,
                      }}
                    >
                      {pct}% ({val})
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setChicksCount(String(numEggs))}
                  className="btn btn-sm"
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.72rem',
                    height: 22,
                    minHeight: 'unset',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#334155',
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                >
                  All ({numEggs})
                </button>
              </div>
            </div>
          )}

          {/* Live Hatch Rate Card */}
          {hatchRate !== null && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                marginBottom: 16,
                background: Number(hatchRate) >= 75 ? '#f0fdf4' : Number(hatchRate) >= 50 ? '#fefce8' : '#fef2f2',
                border: `1px solid ${Number(hatchRate) >= 75 ? '#86efac' : Number(hatchRate) >= 50 ? '#fde047' : '#fca5a5'}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: Number(hatchRate) >= 75 ? '#15803d' : Number(hatchRate) >= 50 ? '#a16207' : '#b91c1c' }}>
                  🐣 Hatch Rate: {hatchRate}%
                </span>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {chicksNum} chicks from {numEggs} eggs
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: Number(hatchRate) >= 75 ? '#22c55e' : Number(hatchRate) >= 50 ? '#eab308' : '#ef4444',
                  color: '#fff',
                }}
              >
                {Number(hatchRate) >= 80 ? '🌟 Excellent' : Number(hatchRate) >= 65 ? '👍 Good' : '⚠️ Low'}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="submit"
              disabled={loading || !isValidCount}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#16a34a',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: loading || !isValidCount ? 'not-allowed' : 'pointer',
                opacity: loading || !isValidCount ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {loading ? 'Saving...' : `✓ Confirm & Mark as Delivered (${isValidCount ? chicksNum : 0} chicks)`}
            </button>

            {isAlreadyDelivered && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSave(false)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: '1px solid #f87171',
                  background: '#fff',
                  color: '#dc2626',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                ↺ Reset Status (Mark as Not Delivered)
              </button>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              style={{
                width: '100%',
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#64748b',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
