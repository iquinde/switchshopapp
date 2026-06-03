export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice?: number;
  stock: number;
  minStock?: number;
  image: string;
  images?: string[];
  category: string;
  status: 'active' | 'inactive';
  sku?: string;
  createdAt?: any;
  companyId?: string; // Links product to a specific company/store
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cedula?: string; // ID / Identification card
  address?: string;
  totalSpent?: number;
  lastPurchase?: any;
  creditLimit?: number;
  currentDebt?: number;
  companyId?: string; // Links customer to a specific company
  status?: 'active' | 'inactive' | 'pending';
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  subtotal: number;
  tax?: number;
  discount?: number;
  status: 'pending' | 'dispatched' | 'completed' | 'cancelled';
  paymentStatus: 'unpaid' | 'partially_paid' | 'paid';
  dispatchStatus: 'pending' | 'shipped' | 'delivered';
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit';
  amountPaid: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerCedula?: string;
  createdAt: any;
  notes?: string;
  companyId?: string; // Links order to a specific company
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  orderNumber?: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'transfer' | 'deposit';
  referenceNumber?: string;
  bankName?: string;
  date: any;
  notes?: string;
  companyId?: string; // Links transaction to a specific company
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  cost: number;
  total: number;
}

export interface Purchase {
  id: string;
  lot: string;
  date: any;
  items: PurchaseItem[];
  total: number;
  supplier?: string;
  notes?: string;
  createdAt?: any;
  companyId?: string;
  productId?: string;
  productName?: string;
  quantity?: number;
  cost?: number;
}

export interface StoreSettings {
  storeName: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImage: string;
  footerText: string;
  heroBgType?: 'image' | 'solid' | 'gradient';
  heroBgColor?: string;
  heroTextColor?: 'light' | 'dark';
  stockAlertPercentage?: number;
  supportPhone?: string;
  supportEmail?: string;
  whatsappNumber?: string;
}

export interface Company {
  id: string;
  name: string;          // Name of the business owner
  ownerEmail: string;    // Owner's login/Google email
  collaboratorEmails?: string[]; // Additional Google accounts allowed to manage the company
  storeName: string;     // Exclusive name of their store/brand
  status: 'active' | 'inactive';
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  createdAt: string;
}
