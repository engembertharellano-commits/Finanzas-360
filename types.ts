export type Currency = 'USD' | 'VES';
export type AccountType =
  | 'Ahorros'
  | 'Corriente'
  | 'Efectivo'
  | 'Tarjeta de Crédito'
  | 'Billetera Virtual'
  | 'Broker';

export type TransactionType = 'Ingreso' | 'Gasto' | 'Transferencia' | 'Ajuste';
export type Category = string;

export interface User {
  id: string;
  name: string;
  email: string;
  /**
   * Acceso local (solo front/localStorage).
   * Si luego migras a auth real backend, este campo debe salir del cliente.
   */
  password?: string;
}

export interface BankAccount {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: Currency;
  color: string;

  // Tarjeta de crédito (opcionales)
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  commission?: number;
  type: TransactionType;
  category: string;
  date: string; // recomendado: YYYY-MM-DD o ISO
  currency: Currency;

  // Cuenta origen (o única en ingreso/gasto/ajuste)
  accountId: string;

  // Transferencia
  toAccountId?: string;
  targetAmount?: number;

  // Inversión relacionada
  relatedInvestmentId?: string;

  // Ajuste
  adjustmentDirection?: 'plus' | 'minus';

  // Trabajo
  isWorkRelated?: boolean;
  workStatus?: 'pending' | 'settled';

  // Terceros (tu naming actual)
  isThirdParty?: boolean;
  thirdPartyOwner?: string;

  // Compatibilidad extra (por si algún componente usa otro naming)
  isThirdPartyMoney?: boolean;
  thirdPartyName?: string;
}

export interface Investment {
  id: string;
  name: string;

  // Tu modelo actual
  ticker?: string;
  brokerId?: string;
  platform?: string;
  initialInvestment: number;
  quantity: number;
  buyPrice: number;
  currentMarketPrice: number;
  value: number;
  currency: Currency;
  performance: number;
  category: string;
  date?: string;
  yieldRate?: number;
  yieldPeriod?: 'Mensual' | 'Anual';
  participationPercent?: number;

  // Compatibilidad adicional con otras vistas/helpers
  currentValue?: number;
  marketValue?: number;
  totalValue?: number;
  amount?: number;
  currentPrice?: number;
  purchasePrice?: number;
  price?: number;
  symbol?: string;
  type?: 'Stock' | 'Crypto' | 'ETF' | 'Bono' | 'Fondo' | 'Otro' | string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  currency: Currency;
  month: string; // YYYY-MM
  spent?: number;
}

export const DEFAULT_EXPENSE_CATEGORIES: string[] = [
  'Comida',
  'Transporte',
  'Servicios',
  'Salud',
  'Educación',
  'Ocio',
  'Compras',
  'Comisiones',
  'Otros'
];

export const DEFAULT_INCOME_CATEGORIES: string[] = [
  'Sueldo',
  'Freelance',
  'Ventas',
  'Inversiones',
  'Regalos',
  'Otros'
];
