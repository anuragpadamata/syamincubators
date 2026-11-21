import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function CustomerFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: '',
    num_eggs: '',
    egg_age_days: '',
    village_city: '',
    mobile_number: '',
    alt_phone: '',
    egg_mark: '',
    date_received: new Date().toISOString().split('T')[0],
    incubation_days: 21,
    price_per_egg: 15,
    amount_paid: 0,
    seal: 'No',
    notes: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const debounceRef = useRef(null);
  const searchableFields = ['customer_name', 'mobile_number', 'village_city'];

  useEffect(() => {
    if (isEdit) {
      api.getCustomer(id).then((data) => {
        setForm({
          customer_name: data.customer_name,
          num_eggs: data.num_eggs,
          egg_age_days: data.egg_age_days !== undefined && data.egg_age_days !== null ? data.egg_age_days : '',
          village_city: data.village_city,
          mobile_number: data.mobile_number,
          alt_phone: data.alt_phone || '',
          egg_mark: data.egg_mark || '',
          date_received: data.date_received ? String(data.date_received).split('T')[0] : '',
          incubation_days: data.incubation_days,
          price_per_egg: data.price_per_egg,
          amount_paid: data.amount_paid,
          seal: data.seal || 'No',
          notes: data.notes || '',
        });
      }).catch((err) => setError(err.message));
    } else {
      api.getIncubationDays().then((data) => {
        setForm((prev) => ({ ...prev, incubation_days: data.value }));
      }).catch(() => {});
      api.getPricePerEgg().then((data) => {
        setForm((prev) => ({ ...prev, price_per_egg: data.value }));
      }).catch(() => {});
    }
  }, [id, isEdit]);

  const deliveryDate = useMemo(() => {
    if (form.date_received && form.incubation_days) {
      const d = new Date(form.date_received);
      d.setDate(d.getDate() + Number(form.incubation_days));
      return d.toISOString().split('T')[0];
    }
    return '';
  }, [form.date_received, form.incubation_days]);

  const totalAmount = Number(form.price_per_egg || 0) * Number(form.num_eggs || 0);
  const balance = totalAmount - Number(form.amount_paid || 0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (searchableFields.includes(name) && !isEdit) {
      setActiveField(name);
      clearTimeout(debounceRef.current);
      if (value.length >= 2) {
        debounceRef.current = setTimeout(() => {
          api.getCustomers(value).then((data) => {
            const unique = data.filter((c, i, arr) =>
              arr.findIndex((x) => x.customer_name === c.customer_name && x.mobile_number === c.mobile_number) === i
            );
            setSuggestions(unique);
            setShowSuggestions(unique.length > 0);
          }).catch(() => {});
        }, 300);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  };

  const hideSuggestions = () => setTimeout(() => setShowSuggestions(false), 200);
  const showIfHasSuggestions = (field) => () => {
    setActiveField(field);
    if (suggestions.length > 0) setShowSuggestions(true);
  };

  const handleSelectSuggestion = (value) => {
    if (activeField === 'customer_name') {
      setForm((prev) => ({
        ...prev,
        customer_name: value.customer_name,
        mobile_number: value.mobile_number,
        village_city: value.village_city,
        egg_mark: value.egg_mark || '',
        price_per_egg: value.price_per_egg,
        seal: value.seal || 'No',
      }));
    } else if (activeField === 'mobile_number') {
      setForm((prev) => ({ ...prev, mobile_number: value }));
    } else if (activeField === 'village_city') {
      setForm((prev) => ({ ...prev, village_city: value }));
    }
    setShowSuggestions(false);
  };

  const renderSuggestions = (field) => {
    if (!showSuggestions || activeField !== field) return null;

    if (field === 'customer_name') {
      return (
        <ul className="autocomplete-list">
          {suggestions.map((c) => (
            <li key={c.id} className="autocomplete-item" onMouseDown={() => handleSelectSuggestion(c)}>
              <strong>{c.customer_name}</strong>
              <span className="autocomplete-detail">{c.village_city} - {c.mobile_number}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (field === 'mobile_number') {
      const uniqueNumbers = [...new Set(suggestions.map((c) => c.mobile_number))];
      return (
        <ul className="autocomplete-list">
          {uniqueNumbers.map((num) => (
            <li key={num} className="autocomplete-item" onMouseDown={() => handleSelectSuggestion(num)}>
              <strong>{num}</strong>
            </li>
          ))}
        </ul>
      );
    }

    if (field === 'village_city') {
      const uniqueVillages = [...new Set(suggestions.map((c) => c.village_city))];
      return (
        <ul className="autocomplete-list">
          {uniqueVillages.map((v) => (
            <li key={v} className="autocomplete-item" onMouseDown={() => handleSelectSuggestion(v)}>
              <strong>{v}</strong>
            </li>
          ))}
        </ul>
      );
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      id: Number(id) || id,
      ...form,
      seal: form.seal === 'Yes' ? 'Yes' : 'No',
      num_eggs: Number(form.num_eggs),
      egg_age_days: form.egg_age_days !== '' && form.egg_age_days !== null && form.egg_age_days !== undefined ? Number(form.egg_age_days) : '',
      alt_phone: form.alt_phone || '',
      notes: form.notes || '',
      incubation_days: Number(form.incubation_days),
      price_per_egg: Number(form.price_per_egg),
      amount_paid: Number(form.amount_paid),
      total_amount: totalAmount,
      balance: balance,
    };

    try {
      if (isEdit) {
        await api.updateCustomer(id, payload);
      } else {
        await api.createCustomer(payload);
      }
      navigate('/');
    } catch (err) {
      console.error('Save failed:', err);
      const msg = err.message || 'Failed to save';
      setError(msg);
      alert('Error updating customer: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>{isEdit ? 'Edit Customer' : 'New Sale'}</h2>

      <form className="customer-form" onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        <div className="form-group autocomplete-wrapper">
          <label htmlFor="customer_name">Customer Name *</label>
          <input
            id="customer_name"
            name="customer_name"
            value={form.customer_name}
            onChange={handleChange}
            onBlur={hideSuggestions}
            onFocus={showIfHasSuggestions('customer_name')}
            autoComplete="off"
            required
          />
          {renderSuggestions('customer_name')}
        </div>

        <div className="form-row">
          <div className="form-group autocomplete-wrapper">
            <label htmlFor="mobile_number">Mobile Number *</label>
            <input
              id="mobile_number"
              name="mobile_number"
              type="tel"
              value={form.mobile_number}
              onChange={handleChange}
              onBlur={hideSuggestions}
              onFocus={showIfHasSuggestions('mobile_number')}
              autoComplete="off"
              required
            />
            {renderSuggestions('mobile_number')}
          </div>
          <div className="form-group">
            <label htmlFor="alt_phone">Alternative Phone Number</label>
            <input
              id="alt_phone"
              name="alt_phone"
              type="tel"
              value={form.alt_phone}
              onChange={handleChange}
              placeholder="Optional secondary contact"
            />
          </div>
        </div>

        <div className="form-group autocomplete-wrapper">
          <label htmlFor="village_city">Village / City *</label>
          <input
            id="village_city"
            name="village_city"
            value={form.village_city}
            onChange={handleChange}
            onBlur={hideSuggestions}
            onFocus={showIfHasSuggestions('village_city')}
            autoComplete="off"
            required
          />
          {renderSuggestions('village_city')}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="num_eggs">Number of Eggs *</label>
            <input id="num_eggs" name="num_eggs" type="number" min="1" value={form.num_eggs} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="egg_age_days">Egg Age when Received (Days)</label>
            <input
              id="egg_age_days"
              name="egg_age_days"
              type="number"
              min="0"
              placeholder="e.g. 2 or 5 days old"
              value={form.egg_age_days}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="egg_mark">Egg Mark (what mark is written on eggs)</label>
          <input id="egg_mark" name="egg_mark" value={form.egg_mark} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>Seal</label>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', userSelect: 'none', WebkitTapHighlightColor: 'transparent' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: form.seal === 'Yes' ? 700 : 500, color: form.seal === 'Yes' ? '#7c3aed' : 'inherit', userSelect: 'none', WebkitTapHighlightColor: 'transparent', outline: 'none' }}>
              <input
                type="checkbox"
                checked={form.seal === 'Yes'}
                onChange={() => setForm((prev) => ({ ...prev, seal: 'Yes' }))}
                style={{ width: 18, height: 18, cursor: 'pointer', outline: 'none', boxShadow: 'none' }}
              />
              <span>Yes</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: form.seal === 'No' ? 700 : 500, userSelect: 'none', WebkitTapHighlightColor: 'transparent', outline: 'none' }}>
              <input
                type="checkbox"
                checked={form.seal === 'No'}
                onChange={() => setForm((prev) => ({ ...prev, seal: 'No' }))}
                style={{ width: 18, height: 18, cursor: 'pointer', outline: 'none', boxShadow: 'none' }}
              />
              <span>No</span>
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="price_per_egg">Price per Egg (Rs) *</label>
            <input id="price_per_egg" name="price_per_egg" type="number" min="0" step="0.01" value={form.price_per_egg} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="amount_paid">Amount Paid (Rs)</label>
            <input id="amount_paid" name="amount_paid" type="number" min="0" step="0.01" value={form.amount_paid} onChange={handleChange} />
          </div>
        </div>

        <div className="billing-display">
          <div className="billing-row">
            <span className="label">Total Amount:</span>
            <strong>Rs {totalAmount.toFixed(2)}</strong>
          </div>
          <div className="billing-row">
            <span className="label">Amount Paid:</span>
            <strong>Rs {Number(form.amount_paid || 0).toFixed(2)}</strong>
          </div>
          <div className={`billing-row ${balance > 0 ? 'balance-due' : 'balance-clear'}`}>
            <span className="label">Balance:</span>
            <strong>Rs {balance.toFixed(2)}</strong>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="date_received">Date Received *</label>
            <input id="date_received" name="date_received" type="date" value={form.date_received} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label htmlFor="incubation_days">Incubation Days *</label>
            <input id="incubation_days" name="incubation_days" type="number" min="1" value={form.incubation_days} onChange={handleChange} required />
          </div>
        </div>

        <div className="delivery-date-display">
          <span className="label">Delivery Date:</span>
          <strong>{deliveryDate ? new Date(deliveryDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</strong>
        </div>

        <div className="form-group" style={{ marginTop: 12 }}>
          <label htmlFor="notes">Comments / Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows="3"
            value={form.notes}
            onChange={handleChange}
            placeholder="Write any customer notes, egg condition, or special instructions here..."
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (isEdit ? 'Updating...' : 'Adding...') : isEdit ? 'Update' : 'Add Sale'}
          </button>
          <button type="button" className="btn" onClick={() => navigate('/')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
