const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxddAk2eDL8Haxo92VOAAsObzoQ3vSUYMQv5yGv9v7lZz0Obl6vc7bLK0GwZ5uM6zemeA/exec';
const PASSWORD = 'admin123';

const dummyPastOrders = [
  // 1. Yesterday's deliveries (deliveryDate: 2026-10-30) - 1 PENDING, 1 DELIVERED
  {
    customer_name: 'K. Ramesh Babu',
    num_eggs: 100,
    village_city: 'Chirala',
    mobile_number: '9848011221',
    egg_mark: 'RB',
    date_received: '2026-10-09',
    incubation_days: 21,
    price_per_egg: 15,
    amount_paid: 1000,
    seal: 'Yes',
    notes: 'Egg pickup pending from yesterday',
    delivery_status: '', // Not taken yet!
  },
  {
    customer_name: 'P. Krishnaiah',
    num_eggs: 80,
    village_city: 'Ongole',
    mobile_number: '9848022334',
    egg_mark: 'PK',
    date_received: '2026-10-09',
    incubation_days: 21,
    price_per_egg: 15,
    amount_paid: 1200,
    seal: 'No',
    delivery_status: 'Delivered',
    chicks_count: 68,
    delivered_at: '2026-10-30',
  },

  // 2. 3 days ago deliveries (deliveryDate: 2026-10-28) - 1 PENDING OVERDUE, 1 DELIVERED
  {
    customer_name: 'M. Venkateswarlu',
    num_eggs: 150,
    village_city: 'Kandukur',
    mobile_number: '9988771122',
    egg_mark: 'MV',
    date_received: '2026-10-07',
    incubation_days: 21,
    price_per_egg: 15,
    amount_paid: 1500,
    seal: 'Yes',
    notes: 'Called on 28th, customer will come weekend',
    delivery_status: '', // Not taken yet!
  },
  {
    customer_name: 'B. Subba Rao',
    num_eggs: 120,
    village_city: 'Bapatla',
    mobile_number: '9123456780',
    egg_mark: 'SR',
    date_received: '2026-10-07',
    incubation_days: 21,
    price_per_egg: 15,
    amount_paid: 1800,
    seal: 'No',
    delivery_status: 'Delivered',
    chicks_count: 102,
    delivered_at: '2026-10-28',
  },

  // 3. 6 days ago deliveries (deliveryDate: 2026-10-25) - 1 PENDING OVERDUE, 1 DELIVERED
  {
    customer_name: 'T. Koteswara Rao',
    num_eggs: 200,
    village_city: 'Parchur',
    mobile_number: '9440112233',
    egg_mark: 'TK',
    date_received: '2026-10-04',
    incubation_days: 21,
    price_per_egg: 15,
    amount_paid: 2000,
    seal: 'Yes',
    notes: 'Overdue - reminder SMS sent',
    delivery_status: '', // Not taken yet!
  },
  {
    customer_name: 'Ch. Lakshmi Devi',
    num_eggs: 90,
    village_city: 'Podili',
    mobile_number: '9849012345',
    egg_mark: 'LD',
    date_received: '2026-10-04',
    incubation_days: 21,
    price_per_egg: 15,
    amount_paid: 1350,
    seal: 'No',
    delivery_status: 'Delivered',
    chicks_count: 78,
    delivered_at: '2026-10-25',
  },

  // 4. Today's deliveries (deliveryDate: 2026-10-31) - 1 PENDING TODAY, 1 DELIVERED TODAY
  {
    customer_name: 'G. Brahmaiah',
    num_eggs: 110,
    village_city: 'Tangutur',
    mobile_number: '9848055667',
    egg_mark: 'GB',
    date_received: '2026-10-10',
    incubation_days: 21,
    price_per_egg: 15,
    amount_paid: 1000,
    seal: 'Yes',
    notes: 'Coming today evening 7 PM',
    delivery_status: '', // Pending pickup today
  },
  {
    customer_name: 'D. Srinivasa Rao',
    num_eggs: 70,
    village_city: 'Singarayakonda',
    mobile_number: '9848099881',
    egg_mark: 'DS',
    date_received: '2026-10-10',
    incubation_days: 21,
    price_per_egg: 15,
    amount_paid: 1050,
    seal: 'No',
    delivery_status: 'Delivered',
    chicks_count: 60,
    delivered_at: '2026-10-31',
  },
];

async function sendRequest(payload) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, password: PASSWORD }),
  });
  return res.json();
}

async function run() {
  console.log(`Starting to add ${dummyPastOrders.length} dummy orders...`);
  for (let i = 0; i < dummyPastOrders.length; i++) {
    const o = dummyPastOrders[i];
    console.log(`Creating [${i + 1}/${dummyPastOrders.length}]: ${o.customer_name} (${o.date_received})...`);
    const created = await sendRequest({ action: 'createCustomer', ...o });
    if (!created || !created.id) {
      console.error('Failed to create:', created);
      continue;
    }
    console.log(` -> Created with ID: ${created.id}`);

    // If delivered, update delivery_status and chicks_count
    if (o.delivery_status === 'Delivered') {
      console.log(` -> Updating delivery status to Delivered (${o.chicks_count} chicks)...`);
      await sendRequest({
        action: 'updateCustomer',
        id: created.id,
        delivery_status: o.delivery_status,
        chicks_count: o.chicks_count,
        delivered_at: o.delivered_at,
      });
    }
  }
  console.log('All dummy orders created successfully!');
}

run().catch(console.error);
