import { Product } from "../types";

export const products: Product[] = [
  {
    id: '1',
    name: 'Pulsera Amatista Natural',
    description: 'Hecha con piedras de amatista genuina y detalles en plata.',
    price: 25.99,
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80&w=800',
    category: 'piedra',
    stock: 15,
    status: 'active'
  },
  {
    id: '2',
    name: 'Brazalete de Hilo Trenzado',
    description: 'Diseño bohemio tejido a mano con hilos de seda de alta resistencia.',
    price: 12.50,
    image: 'https://images.unsplash.com/photo-1573408302185-9146fe634ad0?auto=format&fit=crop&q=80&w=800',
    category: 'hilo',
    stock: 20,
    status: 'active'
  },
  {
    id: '3',
    name: 'Pulsera Cuarzo Rosa',
    description: 'Símbolo de amor y paz, con cuentas de cuarzo rosa pulido.',
    price: 22.00,
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=800',
    category: 'piedra',
    stock: 8,
    status: 'active'
  },
  {
    id: '4',
    name: 'Pulsera Cuero y Acero',
    description: 'Estilo rústico elegante con cuero genuino y cierre magnético.',
    price: 18.99,
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=800',
    category: 'natural',
    stock: 12,
    status: 'active'
  },
  {
    id: '5',
    name: 'Set de Pulseras Amistad',
    description: 'Pack de 3 pulseras ajustables para compartir.',
    price: 15.00,
    image: 'https://images.unsplash.com/photo-1590548784585-643d2b9f2925?auto=format&fit=crop&q=80&w=800',
    category: 'hilo',
    stock: 30,
    status: 'active'
  },
  {
    id: '6',
    name: 'Pulsera Oro 18k Minimal',
    description: 'Delicada cadena de oro con dije artesanal.',
    price: 45.00,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&q=80&w=800',
    category: 'premium',
    stock: 5,
    status: 'active'
  }
];
