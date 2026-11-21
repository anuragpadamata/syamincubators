import React, { useState, useEffect } from 'react';

export default function SmsModal({ customer, initialMode = 'sms', onClose }) {
  if (!customer) return null;

  const [lang, setLang] = useState('both'); // 'both', 'te' (Telugu) or 'en' (English)
  const [targetPhone, setTargetPhone] = useState(customer.mobile_number || customer.alt_phone || '');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const isWhatsAppMode = initialMode === 'whatsapp';

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(String(dateStr).includes('T') ? dateStr : `${dateStr}T00:00:00`);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return String(dateStr);
    }
  };

  const getEffectiveDeliveryDate = () => {
    if (customer.deliveryDate) return formatDisplayDate(customer.deliveryDate);
    if (customer.delivery_date) return formatDisplayDate(customer.delivery_date);
    if (customer.date_received) {
      try {
        const d = new Date(String(customer.date_received).includes('T') ? customer.date_received : `${customer.date_received}T00:00:00`);
        const days = Number(customer.incubation_days || 21);
        d.setDate(d.getDate() + days);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch {
        return '';
      }
    }
    return '';
  };

  const getTemplate = (language) => {
    const name = customer.customer_name || 'Customer';
    const eggs = customer.num_eggs || 0;
    const balance = Number(customer.balance || 0);
    const receivedDate = formatDisplayDate(customer.date_received);
    const deliveryDate = getEffectiveDeliveryDate();

    const getTelugu = () => {
      const dateLines = [];
      if (receivedDate) dateLines.push(`గుడ్లు ఇచ్చిన తేదీ: ${receivedDate}`);
      if (deliveryDate) dateLines.push(`డెలివరీ తేదీ: ${deliveryDate}`);
      dateLines.push('డెలివరీ సమయం: సాయంత్రం 6:30 PM నుండి 8:30 PM');

      const datesBlock = dateLines.join('\n');
      const balanceBlock = balance > 0 ? `బాకీ మొత్తం: రూ. ${balance.toFixed(2)}\n\n` : '';

      return `హాయ్ ${name} గారు,\nమీ కోడి పిల్లలు (${eggs} గుడ్లు) డెలివరీకి సిద్ధంగా ఉన్నాయి!\n\n${datesBlock}\n${balanceBlock}షాప్ వేళలు:\nఉదయం: 10:30 AM నుండి 1:00 PM\nసాయంత్రం: 6:30 PM నుండి 8:30 PM\n\nగమనిక: దయచేసి షాప్ వేళల్లో మాత్రమే రాగలరు. అర్థం చేసుకున్నందుకు ధన్యవాదాలు.\n\nధన్యవాదాలు,\nశ్యామ్ ఇంక్యుబేటర్స్`;
    };

    const getEnglish = () => {
      const dateLines = [];
      if (receivedDate) dateLines.push(`Eggs Given Date: ${receivedDate}`);
      if (deliveryDate) dateLines.push(`Delivery Date: ${deliveryDate}`);
      dateLines.push('Delivery Time: Evening 6:30 PM to 8:30 PM');

      const datesBlock = dateLines.join('\n');
      const balanceBlock = balance > 0 ? `Pending Balance: Rs ${balance.toFixed(2)}\n\n` : '';

      return `Hi ${name},\nYour chicks (${eggs} eggs) are ready for delivery!\n\n${datesBlock}\n${balanceBlock}Shop Timings:\nMorning: 10:30 AM to 1:00 PM\nEvening: 6:30 PM to 8:30 PM\n\nNote: Please come only during shop timings. Thanks for understanding.\n\nThanks,\nSyam Incubators`;
    };

    if (language === 'both') {
      return `${getTelugu()}\n\n----------------------------------\n\n${getEnglish()}`;
    } else if (language === 'te') {
      return getTelugu();
    } else {
      return getEnglish();
    }
  };

  useEffect(() => {
    setMessage(getTemplate(lang));
  }, [lang, customer]);

  const handleSendSms = () => {
    const cleanPhone = String(targetPhone).replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('Please select or enter a valid phone number');
      return;
    }
    const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const separator = isApple ? '&' : '?';
    const smsUrl = `sms:${cleanPhone}${separator}body=${encodeURIComponent(message)}`;
    window.location.href = smsUrl;
  };

  const handleSendWhatsApp = () => {
    let cleanPhone = String(targetPhone).replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      alert('Please select or enter a valid phone number');
      return;
    }
    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="print-dialog-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="print-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480, width: '92%', textAlign: 'left', padding: '20px 24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{isWhatsAppMode ? '💬' : '✉️'}</span> {isWhatsAppMode ? 'Send WhatsApp Delivery Message' : 'Send Delivery Ready SMS'}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Customer Header Info */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{customer.customer_name}</strong>
            <span className="badge" style={{ fontSize: '0.75rem' }}>{customer.num_eggs} eggs</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4, display: 'flex', gap: 12 }}>
            {customer.egg_mark && <span>Mark: <strong>{customer.egg_mark}</strong></span>}
            <span>Balance: <strong style={{ color: Number(customer.balance || 0) > 0 ? '#dc2626' : '#16a34a' }}>Rs {Number(customer.balance || 0).toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Target Phone Selector */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
            Send to Phone Number:
          </label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {customer.mobile_number && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', fontWeight: targetPhone === customer.mobile_number ? 700 : 500 }}>
                <input
                  type="radio"
                  name="sms_phone"
                  checked={targetPhone === customer.mobile_number}
                  onChange={() => setTargetPhone(customer.mobile_number)}
                />
                <span>Mobile: {customer.mobile_number}</span>
              </label>
            )}
            {customer.alt_phone && (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', cursor: 'pointer', fontWeight: targetPhone === customer.alt_phone ? 700 : 500 }}>
                <input
                  type="radio"
                  name="sms_phone"
                  checked={targetPhone === customer.alt_phone}
                  onChange={() => setTargetPhone(customer.alt_phone)}
                />
                <span>Alt: {customer.alt_phone}</span>
              </label>
            )}
          </div>
        </div>

        {/* Language Switcher Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button
            type="button"
            onClick={() => setLang('both')}
            style={{
              flex: 1.3,
              padding: '6px 8px',
              borderRadius: 6,
              border: lang === 'both' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
              background: lang === 'both' ? '#eff6ff' : '#fff',
              color: lang === 'both' ? 'var(--primary)' : '#475569',
              fontWeight: lang === 'both' ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.82rem',
            }}
          >
            ✨ Both (తెలుగు + English)
          </button>
          <button
            type="button"
            onClick={() => setLang('te')}
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: 6,
              border: lang === 'te' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
              background: lang === 'te' ? '#eff6ff' : '#fff',
              color: lang === 'te' ? 'var(--primary)' : '#475569',
              fontWeight: lang === 'te' ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.82rem',
            }}
          >
            తెలుగు (Telugu)
          </button>
          <button
            type="button"
            onClick={() => setLang('en')}
            style={{
              flex: 0.9,
              padding: '6px 8px',
              borderRadius: 6,
              border: lang === 'en' ? '2px solid var(--primary)' : '1px solid #cbd5e1',
              background: lang === 'en' ? '#eff6ff' : '#fff',
              color: lang === 'en' ? 'var(--primary)' : '#475569',
              fontWeight: lang === 'en' ? 700 : 500,
              cursor: 'pointer',
              fontSize: '0.82rem',
            }}
          >
            English
          </button>
        </div>

        {/* Editable Message Box */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>
              Message Text (Editable):
            </label>
            <button
              type="button"
              onClick={handleCopy}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
            >
              {copied ? '✓ Copied!' : '📋 Copy Text'}
            </button>
          </div>
          <textarea
            rows={lang === 'both' ? 12 : 8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              lineHeight: 1.45,
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isWhatsAppMode ? (
            <>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#25D366',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 2px 4px rgba(37,211,102,0.3)',
                }}
              >
                <span>💬</span> Send via WhatsApp Now
              </button>

              <button
                type="button"
                onClick={handleSendSms}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #0284c7',
                  background: '#f0f9ff',
                  color: '#0369a1',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>📱</span> Send via Phone SIM (SMS)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleSendSms}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 6,
                  border: 'none',
                  background: '#0284c7',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 2px 4px rgba(2,132,199,0.3)',
                }}
              >
                <span>📱</span> Send via Phone SIM (SMS)
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #16a34a',
                  background: '#f0fdf4',
                  color: '#15803d',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>💬</span> Send via WhatsApp
              </button>
            </>
          )}

          <button
            type="button"
            className="btn"
            onClick={onClose}
            style={{ width: '100%', padding: '6px 12px', fontSize: '0.85rem', marginTop: 4 }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
