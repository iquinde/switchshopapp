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
  authUid?: string;
  name: string;
  email?: string;
  phone?: string;
  cedula?: string; // ID / Identification card
  address?: string;
  logisticsLocationId?: string;
  city?: string;
  province?: string;
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
  shippingCost?: number;
  shippingLocationCode?: string;
  shippingLocationName?: string;
  shippingProvince?: string;
  shippingCanton?: string;
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

export interface LogisticsLocation {
  id: string;
  provinceCode: string;
  province: string;
  cantonCode: string;
  canton: string;
  parishCode: string;
  parish: string;
  label: string;
}

export interface ShippingRate {
  id: string;
  companyId: string;
  locationId: string;
  locationLabel: string;
  province: string;
  canton: string;
  parish: string;
  cost: number;
  createdAt?: any;
  updatedAt?: any;
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
  historical?: boolean;
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
  heroBadgeText?: string;
  productSectionTitle?: string;
  productSectionDescription?: string;
  heroImage: string;
  logoImage?: string;
  footerText: string;
  socialLinks?: {
    instagram?: { enabled?: boolean; url?: string };
    facebook?: { enabled?: boolean; url?: string };
    tiktok?: { enabled?: boolean; url?: string };
    twitter?: { enabled?: boolean; url?: string };
  };
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
  name: string;          // Business contact/responsible person
  ownerEmail?: string;   // Legacy login email. New access is managed from userRoles.
  collaboratorEmails?: string[]; // Legacy allowed accounts. New access is managed from userRoles.
  storeName: string;     // Exclusive name of their store/brand
  status: 'active' | 'inactive';
  description?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  createdAt: string;
}
