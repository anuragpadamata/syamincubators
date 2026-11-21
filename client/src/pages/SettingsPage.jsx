import { useState, useEffect } from 'react';
import { api } from '../api';

export default function SettingsPage() {
  const [days, setDays] = useState(21);
  const [hatcheryDays, setHatcheryDays] = useState(3);
  const [pricePerEgg, setPricePerEgg] = useState(15);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getIncubationDays().then((data) => setDays(data.value)).catch(() => {});
    api.getHatcheryDaysBefore().then((data) => setHatcheryDays(data.value)).catch(() => {});
    api.getPricePerEgg().then((data) => setPricePerEgg(data.value)).catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await api.updateIncubationDays(Number(days));
      await api.updateHatcheryDaysBefore(Number(hatcheryDays));
      await api.updatePricePerEgg(Number(pricePerEgg));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="page">
      <h2>Settings</h2>
      <form className="settings-form" onSubmit={handleSave}>
        {error && <div className="error-msg">{error}</div>}
        {saved && <div className="success-msg">Settings saved!</div>}
        <div className="form-group">
          <label htmlFor="incubation_days">Default Incubation Days</label>
          <p className="form-help">Default incubation period for new sales. Each sale can override this.</p>
          <input
            id="incubation_days"
            type="number"
            min="1"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="hatchery_days">Hatchery Days Before Delivery</label>
          <p className="form-help">How many days before delivery to transfer eggs to hatchery. Hatchery date = Incubation Days - this value.</p>
          <input
            id="hatchery_days"
            type="number"
            min="1"
            value={hatcheryDays}
            onChange={(e) => setHatcheryDays(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="price_per_egg">Default Price per Egg (Rs)</label>
          <p className="form-help">Default price per egg for new sales. Each sale can override this.</p>
          <input
            id="price_per_egg"
            type="number"
            min="0"
            step="0.01"
            value={pricePerEgg}
            onChange={(e) => setPricePerEgg(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">Save</button>
      </form>
    </div>
  );
}
