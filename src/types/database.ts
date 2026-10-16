export interface Product {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  customer_name?: string | null;
  items_summary?: { id: string; quantity: number; subtotal: number; product_name: string }[];
  id: string;
  customer_id: string | null;
  total_amount: number;
  total_profit: number;
  discount_amount?: number;
  payment_method: 'dinheiro' | 'pix' | 'credito' | 'debito';
  status: 'pago' | 'pendente';
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  profit: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_amount: number;
  payment_method: 'dinheiro' | 'pix' | 'cartao';
  supplier?: string;
  created_at: string;
}

export interface PurchaseBatch {
  id: string;
  product_id: string;
  initial_quantity: number;
  remaining_quantity: number;
  purchase_price: number;
  purchase_date: string;
  supplier: string | null;
  purchase_id: string | null;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  batch_id: string | null;
  movement_type: 'entrada' | 'venda' | 'ajuste' | 'perda';
  quantity: number;
  unit_price: number;
  origin: 'compra' | 'venda' | 'ajuste';
  reference_id: string | null;
  movement_date: string;
  resulting_stock: number;
  created_at: string;
}

export interface CashFlow {
  id: string;
  type: 'entrada' | 'saida';
  category: string;
  description: string | null;
  amount: number;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'dinheiro' | 'pix' | 'credito' | 'debito' | 'cartao';

export interface AppSetting {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
}

export interface SaleItemInput {
  product: Product;
  quantity: number;
}
