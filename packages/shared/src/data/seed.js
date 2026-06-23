/* ============================================================
   Sri Siri Home Foods — seed data
   ============================================================ */

export const CATEGORIES = [
  { id: 'pickles', name: 'Pickles', tint: '#8a2a33', icon: 'fire' },
  { id: 'sweets', name: 'Sweets', tint: '#a8821f', icon: 'sparkle' },
  { id: 'snacks', name: 'Snacks', tint: '#c2611f', icon: 'bolt' },
  { id: 'powders', name: 'Powders', tint: '#9a5a12', icon: 'leaf' },
  { id: 'breakfast', name: 'Breakfast', tint: '#1f5d43', icon: 'clock' },
  { id: 'lunch', name: 'Lunch', tint: '#3a6d2a', icon: 'leaf' },
  { id: 'seasonal', name: 'Seasonal', tint: '#7a3a8a', icon: 'star' },
];

let _pid = 0;
const pid = () => 'P' + (++_pid).toString().padStart(3, '0');

export const PRODUCTS = [
  { id: pid(), name: 'Avakaya Mango Pickle', cat: 'pickles', desc: 'Traditional Andhra cut-mango pickle in cold-pressed sesame oil, sun-matured for deep flavour.', variants: [{ size: '250g', price: 180, cost: 96, stock: 14 }, { size: '500g', price: 340, cost: 182, stock: 8 }, { size: '1kg', price: 640, cost: 350, stock: 3 }], rating: 4.9, reviews: 212, stockState: 'limited', badge: 'Bestseller', tint: '#8a2a33' },
  { id: pid(), name: 'Gongura Pickle', cat: 'pickles', desc: 'Tangy sorrel-leaf pickle, a Telugu classic. Bold, spicy, and unmistakably homemade.', variants: [{ size: '250g', price: 170, cost: 90, stock: 20 }, { size: '500g', price: 320, cost: 170, stock: 11 }], rating: 4.8, reviews: 138, stockState: 'in', tint: '#7a2530' },
  { id: pid(), name: 'Tomato Pickle', cat: 'pickles', desc: 'Slow-cooked tomato pickle with garlic and fenugreek. Pairs with rice, idli, dosa.', variants: [{ size: '250g', price: 150, cost: 78, stock: 0 }, { size: '500g', price: 280, cost: 150, stock: 0 }], rating: 4.7, reviews: 96, stockState: 'out', tint: '#9c3a2a' },
  { id: pid(), name: 'Kaja (Madatha)', cat: 'sweets', desc: 'Crisp, flaky layered sweet soaked in light sugar syrup. Festival favourite.', variants: [{ size: '250g', price: 160, cost: 84, stock: 18 }, { size: '500g', price: 300, cost: 160, stock: 9 }], rating: 4.8, reviews: 154, stockState: 'in', badge: 'New', tint: '#a8821f' },
  { id: pid(), name: 'Boondi Laddu', cat: 'sweets', desc: 'Soft ghee laddus made fresh to order. Rich, fragrant, never too sweet.', variants: [{ size: '6 pcs', price: 180, cost: 95, stock: 0, mto: true }, { size: '12 pcs', price: 340, cost: 185, stock: 0, mto: true }], rating: 4.9, reviews: 201, stockState: 'mto', tint: '#b58a23' },
  { id: pid(), name: 'Dry Fruit Mysore Pak', cat: 'sweets', desc: 'Melt-in-the-mouth gram-flour sweet loaded with cashew and almond.', variants: [{ size: '250g', price: 240, cost: 140, stock: 7 }, { size: '500g', price: 460, cost: 270, stock: 4 }], rating: 4.7, reviews: 88, stockState: 'limited', tint: '#9c7a1e' },
  { id: pid(), name: 'Chekkalu (Rice Crackers)', cat: 'snacks', desc: 'Crunchy spiced rice crackers with sesame and chana dal. Perfect with chai.', variants: [{ size: '250g', price: 130, cost: 66, stock: 22 }, { size: '500g', price: 240, cost: 128, stock: 13 }], rating: 4.6, reviews: 74, stockState: 'in', tint: '#c2611f' },
  { id: pid(), name: 'Murukku', cat: 'snacks', desc: 'Hand-twisted crispy murukku, light and savoury. Made in small batches.', variants: [{ size: '250g', price: 120, cost: 60, stock: 16 }, { size: '500g', price: 220, cost: 118, stock: 6 }], rating: 4.7, reviews: 110, stockState: 'in', badge: 'Hot', tint: '#cf7022' },
  { id: pid(), name: 'Sakinalu', cat: 'snacks', desc: 'Festive Telangana sesame spirals — crunchy, delicate, deeply traditional.', variants: [{ size: '250g', price: 150, cost: 80, stock: 9 }], rating: 4.8, reviews: 62, stockState: 'limited', tint: '#b85e1e' },
  { id: pid(), name: 'Idli Podi (Gunpowder)', cat: 'powders', desc: 'Roasted lentil & chilli podi. Mix with sesame oil for idli, dosa, rice.', variants: [{ size: '200g', price: 140, cost: 70, stock: 25 }, { size: '500g', price: 320, cost: 165, stock: 14 }], rating: 4.9, reviews: 178, stockState: 'in', badge: 'Bestseller', tint: '#9a5a12' },
  { id: pid(), name: 'Kandi Podi (Toor Dal)', cat: 'powders', desc: 'Protein-rich lentil powder with a warm, nutty roast. A daily staple.', variants: [{ size: '200g', price: 130, cost: 65, stock: 19 }], rating: 4.6, reviews: 54, stockState: 'in', tint: '#8a5414' },
  { id: pid(), name: 'Sambar Powder', cat: 'powders', desc: 'House-blend sambar masala, stone-ground in small lots for freshness.', variants: [{ size: '200g', price: 120, cost: 58, stock: 21 }], rating: 4.7, reviews: 69, stockState: 'in', tint: '#a86319' },
  { id: pid(), name: 'Pesarattu Batter', cat: 'breakfast', desc: 'Fresh green-gram dosa batter, ground each morning. Same-day delivery only.', variants: [{ size: '1kg', price: 120, cost: 62, stock: 0, mto: true }], rating: 4.8, reviews: 91, stockState: 'mto', tint: '#1f5d43' },
  { id: pid(), name: 'Idli / Dosa Batter', cat: 'breakfast', desc: 'Naturally fermented rice & urad batter. Soft idlis, crisp dosas guaranteed.', variants: [{ size: '1kg', price: 90, cost: 46, stock: 12 }, { size: '2kg', price: 170, cost: 90, stock: 6 }], rating: 4.9, reviews: 240, stockState: 'in', badge: 'Bestseller', tint: '#247a57' },
  { id: pid(), name: 'Veg Lunch Box', cat: 'lunch', desc: 'Rice, sambar, two curries, curd & pickle. Wholesome homestyle meal, made to order.', variants: [{ size: '1 box', price: 140, cost: 78, stock: 0, mto: true }], rating: 4.7, reviews: 130, stockState: 'mto', tint: '#3a6d2a' },
  { id: pid(), name: 'Andhra Meal (Non-Veg)', cat: 'lunch', desc: 'Chicken curry, rice, rasam, curry & curd. Spicy, hearty, made fresh.', variants: [{ size: '1 box', price: 220, cost: 128, stock: 0, mto: true }], rating: 4.8, reviews: 84, stockState: 'mto', tint: '#2f5d23' },
  { id: pid(), name: 'Bobbatlu (Holige)', cat: 'seasonal', desc: 'Festival sweet flatbread stuffed with jaggery & lentil. Available this season.', variants: [{ size: '6 pcs', price: 240, cost: 135, stock: 10 }, { size: '12 pcs', price: 460, cost: 262, stock: 5 }], rating: 4.9, reviews: 120, stockState: 'seasonal', season: 'Available till 30 Jun', tint: '#7a3a8a' },
  { id: pid(), name: 'Mango Thokku', cat: 'seasonal', desc: 'Grated raw-mango relish, summer-only. Bright, tangy, small-batch.', variants: [{ size: '250g', price: 190, cost: 100, stock: 8 }], rating: 4.8, reviews: 46, stockState: 'seasonal', season: 'Summer special', tint: '#8a5a8a' },
];

export const CUSTOMERS = [
  { id: 'C01', name: 'Priya Sharma', phone: '+91 98480 12345', orders: 14, spent: 6820, last: '2d ago', seg: 'High-value' },
  { id: 'C02', name: 'Ramesh Gupta', phone: '+91 90000 22113', orders: 6, spent: 2140, last: '5d ago', seg: 'Repeat' },
  { id: 'C03', name: 'Anitha Rao', phone: '+91 91234 55678', orders: 2, spent: 540, last: '1d ago', seg: 'New' },
  { id: 'C04', name: 'Suresh Kumar', phone: '+91 99887 33221', orders: 9, spent: 3960, last: '18d ago', seg: 'Lapsed' },
  { id: 'C05', name: 'Lakshmi Devi', phone: '+91 97000 44556', orders: 21, spent: 9450, last: 'today', seg: 'High-value' },
];

export const WORKERS = [
  { id: 'W01', name: 'Ravi Teja', role: 'Kitchen & Delivery', salary: 14000, advance: 2000, join: 'Jan 2024', status: 'Active', attendance: 96 },
  { id: 'W02', name: 'Sunitha', role: 'Kitchen Helper', salary: 11000, advance: 0, join: 'Mar 2024', status: 'Active', attendance: 99 },
  { id: 'W03', name: 'Mahesh', role: 'Delivery', salary: 9000, advance: 1500, join: 'Aug 2024', status: 'Active', attendance: 88 },
];

export const EXPENSES = [
  { id: 'E01', cat: 'Worker Salary', amount: 14000, payee: 'Ravi Teja', note: 'May salary', date: '01 Jun', recurring: true },
  { id: 'E02', cat: 'Worker Salary', amount: 11000, payee: 'Sunitha', note: 'May salary', date: '01 Jun', recurring: true },
  { id: 'E03', cat: 'Power Bill', amount: 3200, payee: 'TSSPDCL', note: 'Electricity', date: '03 Jun', recurring: true },
  { id: 'E04', cat: 'Raw Groceries', amount: 4850, payee: 'Rythu Bazaar', note: 'Mangoes, oil, chilli', date: '04 Jun', recurring: false },
  { id: 'E05', cat: 'Raw Groceries', amount: 2600, payee: 'Wholesale Mandi', note: 'Rice, dal, sugar', date: '06 Jun', recurring: false },
  { id: 'E06', cat: 'Packaging', amount: 1800, payee: 'Sri Packers', note: 'Jars & boxes', date: '06 Jun', recurring: false },
  { id: 'E07', cat: 'Gas / Fuel', amount: 1100, payee: 'HP Gas', note: 'Cylinder refill', date: '07 Jun', recurring: false },
  { id: 'E08', cat: 'Rent', amount: 6000, payee: 'Landlord', note: 'Kitchen space', date: '01 Jun', recurring: true },
];

export const EXPENSE_CATS = ['Worker Salary', 'Power Bill', 'Raw Groceries', 'Packaging', 'Gas / Fuel', 'Rent', 'Transport', 'Miscellaneous'];

export const ORDERS = [
  { id: '#1042', customer: 'Lakshmi Devi', phone: '+91 97000 44556', items: [{ name: 'Idli / Dosa Batter', size: '2kg', qty: 2, price: 170, cost: 90 }, { name: 'Idli Podi (Gunpowder)', size: '200g', qty: 1, price: 140, cost: 70 }], subtotal: 480, discount: 0, delivery: 40, total: 520, status: 'new', pay: 'UPI', time: '5 min ago', worker: null, addr: '12-3-45, Banjara Hills, Hyderabad 500034' },
  { id: '#1041', customer: 'Anitha Rao', phone: '+91 91234 55678', items: [{ name: 'Avakaya Mango Pickle', size: '500g', qty: 1, price: 340, cost: 182 }, { name: 'Murukku', size: '250g', qty: 1, price: 120, cost: 60 }], subtotal: 460, discount: 46, delivery: 40, total: 454, status: 'new', pay: 'COD', time: '22 min ago', worker: null, addr: '8-2-120, Madhapur, Hyderabad 500081' },
  { id: '#1040', customer: 'Priya Sharma', phone: '+91 98480 12345', items: [{ name: 'Boondi Laddu', size: '12 pcs', qty: 1, price: 340, cost: 185 }, { name: 'Kaja (Madatha)', size: '250g', qty: 1, price: 160, cost: 84 }, { name: 'Dry Fruit Mysore Pak', size: '250g', qty: 1, price: 240, cost: 140 }], subtotal: 740, discount: 0, delivery: 0, total: 740, status: 'preparing', pay: 'UPI', time: '1 hr ago', worker: 'Sunitha', addr: 'Road 12, Jubilee Hills, Hyderabad 500033' },
  { id: '#1039', customer: 'Ramesh Gupta', phone: '+91 90000 22113', items: [{ name: 'Gongura Pickle', size: '500g', qty: 1, price: 320, cost: 170 }], subtotal: 320, discount: 0, delivery: 40, total: 360, status: 'out', pay: 'UPI', time: '2 hr ago', worker: 'Ravi Teja', addr: '5-9-22, Kukatpally, Hyderabad 500072' },
  { id: '#1038', customer: 'Lakshmi Devi', phone: '+91 97000 44556', items: [{ name: 'Sambar Powder', size: '200g', qty: 2, price: 120, cost: 58 }, { name: 'Idli / Dosa Batter', size: '1kg', qty: 1, price: 90, cost: 46 }], subtotal: 330, discount: 33, delivery: 40, total: 337, status: 'delivered', pay: 'UPI', time: 'Yesterday', worker: 'Ravi Teja', addr: 'Banjara Hills, Hyderabad' },
  { id: '#1037', customer: 'Suresh Kumar', phone: '+91 99887 33221', items: [{ name: 'Chekkalu (Rice Crackers)', size: '500g', qty: 1, price: 240, cost: 128 }, { name: 'Sakinalu', size: '250g', qty: 1, price: 150, cost: 80 }], subtotal: 390, discount: 0, delivery: 40, total: 430, status: 'delivered', pay: 'COD', time: 'Yesterday', worker: 'Mahesh', addr: 'Kondapur, Hyderabad' },
];

export const COUPONS = [
  { code: 'WELCOME10', type: 'percent', value: 10, min: 0, desc: '10% off your first order', freeShip: false },
  { code: 'FESTIVE50', type: 'flat', value: 50, min: 400, desc: '₹50 off above ₹400', freeShip: false },
  { code: 'FREESHIP', type: 'percent', value: 0, min: 300, desc: 'Free delivery above ₹300', freeShip: true },
];

export const DELIVERY = { freeThreshold: 500, flatCharge: 40 };

export const fmt = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
