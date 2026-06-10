import { Product, Customer, Order, PaymentTransaction, Purchase, StoreSettings, Company } from '../types';

export const OFFLINE_CHANGE_EVENT = 'local-db-updated';

// Helper to check if fallback mode was manually activated or triggered
let isOfflineActive = false;

export function setOfflineFallbackActive(active: boolean) {
  isOfflineActive = false;
  localStorage.setItem('switchshop_offline_mode', 'false');
  window.dispatchEvent(new Event(OFFLINE_CHANGE_EVENT));
}

// Force online by clearing state on boot
try {
  localStorage.setItem('switchshop_offline_mode', 'false');
} catch (e) {}

export function getOfflineFallbackActive(): boolean {
  return false;
}

// Initial Mock Datasets
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "def-prod-1",
    name: "Café Molido Premium (200g)",
    description: "Excelente café de especialidad de altura, tostado medio y molido fino. Sabor balanceado con sutiles notas a cacao, cítricos y miel silvestre.",
    price: 7.50,
    costPrice: 3.20,
    stock: 50,
    minStock: 10,
    category: "café",
    status: "active",
    sku: "CF-MOL-200",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "def-prod-2",
    name: "Café Molido Premium (300g)",
    description: "Café de especialidad de altura, tostado medio y molido fino. Sabor equilibrado rico en notas aromáticas, cuerpo redondo y crema persistente.",
    price: 11.00,
    costPrice: 4.80,
    stock: 40,
    minStock: 15,
    category: "café",
    status: "active",
    sku: "CF-MOL-300",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "def-prod-3",
    name: "Café Molido Premium (450g)",
    description: "Café de especialidad de altura molido. Presentación familiar ideal para los amantes del buen café diario, cultivado y cosechado con amor.",
    price: 15.50,
    costPrice: 6.50,
    stock: 30,
    minStock: 20,
    category: "café",
    status: "active",
    sku: "CF-MOL-450",
    image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "def-prod-4",
    name: "Café en Grano Premium (450g)",
    description: "Café de especialidad de altura en grano entero listo para moler en casa. Conserva intacta su frescura, aroma dulce y aceites esenciales.",
    price: 16.00,
    costPrice: 6.80,
    stock: 35,
    minStock: 15,
    category: "café",
    status: "active",
    sku: "CF-GRA-450",
    image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&q=80&w=600"
  }
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: "def-cust-1",
    name: "Juan Pérez",
    phone: "0998877665",
    address: "Av. Principal 123 y Granados",
    totalSpent: 15.00,
    currentDebt: 0.00,
    lastPurchase: new Date().toISOString()
  },
  {
    id: "def-cust-2",
    name: "María Belén Andrade",
    phone: "0987654321",
    address: "La Floresta, General Veintimilla N23",
    totalSpent: 120.00,
    currentDebt: 0.00,
    lastPurchase: new Date().toISOString()
  }
];

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "SwitchShop",
  heroTitle: "Calidad y Tradición Hecha a Mano.",
  heroSubtitle: "Descubre nuestra cuidada selección de café premium de especialidad y piezas de joyería artesanal única. Cultivados y creados con dedicación para deleitar tus sentidos.",
  heroImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000",
  logoImage: "",
  footerText: "Productos seleccionados con alma, sabor y tradición.",
  socialLinks: {
    instagram: { enabled: false, url: "" },
    facebook: { enabled: false, url: "" },
    tiktok: { enabled: false, url: "" },
    twitter: { enabled: false, url: "" }
  },
  heroBgType: "image",
  heroBgColor: "#1c1917",
  heroTextColor: "light",
  stockAlertPercentage: 20,
  supportPhone: "+593 99 999 9999",
  supportEmail: "soporte@switchshop.com",
  whatsappNumber: "+593 99 999 9999"
};

const DEFAULT_ORDERS: Order[] = [
  {
    id: "ped-1",
    customerName: "Juan Pérez",
    customerPhone: "0998877665",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    items: [
      {
        id: "def-prod-1",
        name: "Café Molido Premium (200g)",
        description: "",
        price: 7.50,
        stock: 48,
        category: "café",
        status: "active",
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600",
        quantity: 2
      }
    ],
    subtotal: 15.00,
    total: 15.00,
    status: "completed",
    paymentStatus: "paid",
    dispatchStatus: "delivered",
    paymentMethod: "cash",
    amountPaid: 15.00
  },
];

const DEFAULT_PURCHASES: Purchase[] = [];

const DEFAULT_COMPANIES: Company[] = [
  {
    id: "comp-default",
    name: "Israel Quinde",
    ownerEmail: "israel.quinde@gmail.com",
    collaboratorEmails: [],
    storeName: "SwitchShop Matriz",
    status: "active",
    description: "Tienda principal de especialidades artesanales y café de altura.",
    phone: "+593 99 999 9999",
    whatsapp: "+593 99 999 9999",
    email: "israel.quinde@gmail.com",
    createdAt: new Date().toISOString()
  },
  {
    id: "comp-1",
    name: "Ana María Santos",
    ownerEmail: "ana.santos@switchshop.com",
    collaboratorEmails: [],
    storeName: "Esencias & Aromas",
    status: "active",
    description: "Velas de soya, aceites esenciales y fragancias orgánicas ornamentales.",
    phone: "+593 98 123 4567",
    whatsapp: "+593 98 123 4567",
    email: "ana.santos@switchshop.com",
    createdAt: new Date().toISOString()
  },
  {
    id: "comp-2",
    name: "Carlos Mendoza",
    ownerEmail: "carlos.mendoza@switchshop.com",
    collaboratorEmails: [],
    storeName: "Cacao Ancestral",
    status: "active",
    description: "Chocolates finos de aroma, bombones artesanales y coberturas gourmet.",
    phone: "+593 97 765 4321",
    whatsapp: "+593 97 765 4321",
    email: "carlos.mendoza@switchshop.com",
    createdAt: new Date().toISOString()
  }
];


// Helper database getters and setters
export function getLocalCollection<T>(key: string, defaults: T[]): T[] {
  // Clear old default products with pulseras or wrong lists for the presentation
  if (key === 'products') {
    const cachedProducts = localStorage.getItem('switchshop_local_products');
    if (cachedProducts) {
      try {
        const parsed = JSON.parse(cachedProducts) as any[];
        const hasPulseras = parsed.some(p => p.category === 'pulseras' || p.name?.includes('Pulsera') || p.id === 'def-prod-3');
        const hasOldImage = parsed.some(p => p.id === 'def-prod-1' && p.image?.includes('1447933601403'));
        const lacksMinStock = parsed.some(p => p.minStock === undefined);
        if (hasPulseras || parsed.length !== 4 || hasOldImage || lacksMinStock) {
          localStorage.removeItem('switchshop_local_products');
          localStorage.removeItem('switchshop_local_orders'); // Force restart orders to avoid reference mismatches
        }
      } catch {
        localStorage.removeItem('switchshop_local_products');
      }
    }
  }

  const data = localStorage.getItem(`switchshop_local_${key}`);
  if (!data) {
    localStorage.setItem(`switchshop_local_${key}`, JSON.stringify(defaults));
    return defaults;
  }
  try {
    return JSON.parse(data);
  } catch {
    return defaults;
  }
}

export function saveLocalCollection<T>(key: string, items: T[]) {
  localStorage.setItem(`switchshop_local_${key}`, JSON.stringify(items));
  window.dispatchEvent(new Event(OFFLINE_CHANGE_EVENT));
}

// Offline Database CRUD Controllers
export const offlineDb = {
  // Products
  getProducts(): Product[] {
    return getLocalCollection<Product>('products', DEFAULT_PRODUCTS);
  },
  saveProduct(product: Partial<Product> & { id?: string }): Product {
    const list = this.getProducts();
    let updated: Product;
    if (product.id) {
      list.forEach((p, idx) => {
        if (p.id === product.id) {
          list[idx] = { ...p, ...product } as Product;
          updated = list[idx];
        }
      });
      updated = updated! || { ...product, id: product.id } as Product;
    } else {
      updated = {
        ...product,
        id: `local-prod-${Date.now()}`,
        createdAt: new Date().toISOString()
      } as Product;
      list.unshift(updated);
    }
    saveLocalCollection('products', list);
    return updated;
  },
  deleteProduct(id: string) {
    const list = this.getProducts().filter(p => p.id !== id);
    saveLocalCollection('products', list);
  },

  // Customers
  getCustomers(): Customer[] {
    return getLocalCollection<Customer>('customers', DEFAULT_CUSTOMERS);
  },
  saveCustomer(customer: Partial<Customer> & { id?: string }): Customer {
    const list = this.getCustomers();
    let updated: Customer;
    if (customer.id) {
      const idx = list.findIndex(c => c.id === customer.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...customer } as Customer;
        updated = list[idx];
      } else {
        updated = { ...customer, id: customer.id } as Customer;
        list.push(updated);
      }
    } else {
      updated = {
        ...customer,
        id: `local-cust-${Date.now()}`,
        totalSpent: customer.totalSpent || 0,
        currentDebt: customer.currentDebt || 0
      } as Customer;
      list.unshift(updated);
    }
    saveLocalCollection('customers', list);
    return updated;
  },
  deleteCustomer(id: string) {
    const list = this.getCustomers().filter(c => c.id !== id);
    saveLocalCollection('customers', list);
  },

  // Orders
  getOrders(): Order[] {
    return getLocalCollection<Order>('orders', DEFAULT_ORDERS);
  },
  saveOrder(order: Partial<Order> & { id?: string }): Order {
    const list = this.getOrders();
    let updated: Order;
    if (order.id) {
      const idx = list.findIndex(o => o.id === order.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...order } as Order;
        updated = list[idx];
      } else {
        updated = { ...order, id: order.id } as Order;
        list.push(updated);
      }
    } else {
      updated = {
        ...order,
        id: `local-ord-${Date.now()}`,
        status: order.status || 'pending',
        paymentStatus: order.paymentStatus || 'unpaid',
        dispatchStatus: order.dispatchStatus || 'pending',
        createdAt: new Date().toISOString()
      } as Order;
      list.unshift(updated);
    }
    saveLocalCollection('orders', list);
    return updated;
  },
  deleteOrder(id: string) {
    const list = this.getOrders().filter(o => o.id !== id);
    saveLocalCollection('orders', list);
  },

  // Purchases
  getPurchases(): Purchase[] {
    return getLocalCollection<Purchase>('purchases', DEFAULT_PURCHASES);
  },
  savePurchase(purchase: Partial<Purchase> & { id?: string }): Purchase {
    const list = this.getPurchases();
    let updated: Purchase;
    if (purchase.id) {
      const idx = list.findIndex(p => p.id === purchase.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...purchase } as Purchase;
        updated = list[idx];
      } else {
        updated = { ...purchase, id: purchase.id } as Purchase;
        list.push(updated);
      }
    } else {
      updated = {
        ...purchase,
        id: `local-pur-${Date.now()}`,
        createdAt: new Date().toISOString()
      } as Purchase;
      list.unshift(updated);
    }
    saveLocalCollection('purchases', list);
    return updated;
  },
  deletePurchase(id: string) {
    const list = this.getPurchases().filter(p => p.id !== id);
    saveLocalCollection('purchases', list);
  },

  // Payment Transactions (Abonos)
  getTransactions(): PaymentTransaction[] {
    return getLocalCollection<PaymentTransaction>('paymentTransactions', []);
  },
  saveTransaction(trans: Partial<PaymentTransaction> & { id?: string }): PaymentTransaction {
    const list = this.getTransactions();
    let updated: PaymentTransaction;
    if (trans.id) {
      const idx = list.findIndex(t => t.id === trans.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...trans } as PaymentTransaction;
        updated = list[idx];
      } else {
        updated = { ...trans, id: trans.id } as PaymentTransaction;
        list.push(updated);
      }
    } else {
      updated = {
        ...trans,
        id: `local-trans-${Date.now()}`,
        date: new Date().toISOString()
      } as PaymentTransaction;
      list.unshift(updated);
    }
    saveLocalCollection('paymentTransactions', list);
    return updated;
  },

  // Settings
  getSettings(): StoreSettings {
    const data = localStorage.getItem('switchshop_local_settings');
    if (!data) {
      localStorage.setItem('switchshop_local_settings', JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  saveSettings(sets: StoreSettings) {
    localStorage.setItem('switchshop_local_settings', JSON.stringify(sets));
    window.dispatchEvent(new Event(OFFLINE_CHANGE_EVENT));
  },

  // Companies (Multi-empresa)
  getCompanies(): Company[] {
    return getLocalCollection<Company>('companies', DEFAULT_COMPANIES);
  },
  saveCompany(company: Partial<Company> & { id?: string }): Company {
    const list = this.getCompanies();
    let updated: Company;
    if (company.id) {
      const idx = list.findIndex(c => c.id === company.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...company } as Company;
        updated = list[idx];
      } else {
        updated = { ...company, id: company.id } as Company;
        list.push(updated);
      }
    } else {
      updated = {
        ...company,
        id: `local-comp-${Date.now()}`,
        status: company.status || 'active',
        createdAt: new Date().toISOString()
      } as Company;
      list.unshift(updated);
    }
    saveLocalCollection('companies', list);
    return updated;
  },
  deleteCompany(id: string) {
    const list = this.getCompanies().filter(c => c.id !== id);
    saveLocalCollection('companies', list);
  }
};
