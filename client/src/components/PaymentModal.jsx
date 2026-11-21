import React, { useState } from 'react';
import { api } from '../api';

export default function PaymentModal({ customer, onClose, onSuccess }) {
  if (!customer) return null;

  const currentPaid = Number(customer.amount_paid || 0);
  const totalAmount = Number(customer.total_amount || 0);
  const currentBalance = Number(customer.balance || (totalAmount - currentPaid));

  const [paymentAmount, setPaymentAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePayFull = async () => {
    await submitPayment(currentBalance);
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    const addAmt = Number(paymentAmount);
    if (isNaN(addAmt) || addAmt <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }
    await submitPayment(addAmt);
  };

  const submitPayment = async (addAmt) => {
    setError('');
    setLoading(true);
    try {
      const newPaid = currentPaid + Number(addAmt);
      const newBalance = Math.max(0, totalAmount - newPaid);

      const payload = {
        ...customer,
        amount_paid: newPaid,
        total_amount: totalAmount,
        balance: newBalance,
      };

      const updated = await api.updateCustomer(customer.id, payload);
      onSuccess(updated || payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const additionalEntered = Number(paymentAmount) || 0;
  const previewNewPaid = currentPaid + additionalEntered;
  const previewNewBalance = totalAmount - previewNewPaid;

  return (
    <div className="print-dialog-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="print-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420, width: '90%', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, textAlign: 'left', fontSize: '1.25rem' }}>Collect Payment</h3>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              #{customer.customerId} • <strong>{customer.customer_name}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
          >
            ✕
          </button>
        </div>

        {error && <div className="error-msg" style={{ margin: '12px 0 0 0', padding: '8px 12px' }}>{error}</div>}

        {/* Bill summary card */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Bill:</span>
            <strong>Rs {totalAmount.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: 6 }}>
            <span style={{ color: 'var(--text-muted)' }}>Already Paid:</span>
            <strong style={{ color: '#16a34a' }}>Rs {currentPaid.toFixed(2)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', borderTop: '1px solid #e2e8f0', paddingTop: 6 }}>
            <span style={{ fontWeight: 600, color: '#dc2626' }}>Balance Due:</span>
            <strong style={{ color: '#dc2626', fontSize: '1.15rem' }}>Rs {currentBalance.toFixed(2)}</strong>
          </div>
        </div>

        {/* Option 1: 1-Click Pay Full Balance */}
        {currentBalance > 0 && (
          <button
            className="btn btn-primary"
            onClick={handlePayFull}
            disabled={loading}
            style={{
              background: '#16a34a',
              borderColor: '#16a34a',
              color: '#fff',
              padding: '12px',
              fontSize: '1rem',
              fontWeight: 'bold',
              borderRadius: 8,
              marginTop: 10,
              cursor: 'pointer'
            }}
          >
            {loading ? 'Saving...' : `✓ Pay Full Balance (Rs ${currentBalance.toFixed(2)})`}
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0', color: '#94a3b8', fontSize: '0.75rem' }}>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          <span>OR ENTER CUSTOM AMOUNT</span>
          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        </div>

        {/* Option 2: Custom payment input */}
        <form onSubmit={handleCustomSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Amount Receiving Now (Rs):</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={totalAmount}
              placeholder={`e.g. ${Math.min(50, currentBalance)}`}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              disabled={loading}
              autoFocus
              style={{ padding: '8px 12px', fontSize: '1rem' }}
            />
          </div>

          {additionalEntered > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#475569', background: '#eff6ff', padding: '6px 10px', borderRadius: 6 }}>
              New Paid: <strong>Rs {previewNewPaid.toFixed(2)}</strong> • New Balance: <strong>Rs {Math.max(0, previewNewBalance).toFixed(2)}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !paymentAmount || Number(paymentAmount) <= 0}
              style={{ flex: 1, padding: '10px' }}
            >
              {loading ? 'Saving...' : 'Save Payment'}
            </button>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '10px 16px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
