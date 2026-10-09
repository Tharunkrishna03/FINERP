export interface Installment {
  id: number;
  month_number: number;
  due_date: string;
  principal_due: string;
  interest_due: string;
  total_due: string;
  amount_paid: string;
  status: string;
  paid_date?: string;
}

export interface Payment {
  id: number;
  payment_amount: string;
  principal_portion: string;
  interest_portion: string;
  payment_date: string;
  payment_mode: string;
  reference_number?: string;
  remarks?: string;
}

export interface CustomerTransaction {
  id: number;
  amount: string;
  date: string;
  interest_amount: string;
  tenure: number;
  jewel?: {
    item_type: string;
    metal_type: string;
    purity: string;
    weight: string;
    num_stones: number;
    photo: string | null;
    remark: string | null;
  };
}

export interface Customer {
  id: number;
  profile?: number | null;
  sno: string | null;
  ano: string | null;
  amount: string;
  date: string;
  customer_name: string;
  guardian_name: string;
  phone: string;
  customer_id_no: string | null;
  address: string | null;
  item_type: string;
  metal_type: string;
  purity: string;
  weight: string;
  num_stones: number | string;
  remark: string | null;
  photo: string | null;
  
  // Financial fields
  interest_rate: string;
  tenure: number;
  total_interest: string;
  total_payable: string;
  amount_paid: string;
  status: string;
  tenure_call_done?: boolean;
  tenure_date_overrides?: Record<string, string>;
  
  installments?: Installment[];
  payments?: Payment[];
  transactions?: CustomerTransaction[];

  created_at?: string;
  updated_at?: string;
}

export interface CustomerProfile {
  id: number;
  customer_name: string;
  guardian_name: string;
  phone: string;
  customer_id_no: string | null;
  address: string | null;
  accounts: Customer[];
  account_count: number;
  status: "Active" | "Inactive";
  created_at?: string;
  updated_at?: string;
}

export interface CustomerPayload {
  sno?: string;
  ano?: string;
  amount: string;
  date: string;
  customer_name: string;
  guardian_name: string;
  phone: string;
  customer_id_no?: string;
  address?: string;
  item_type: string;
  metal_type: string;
  purity: string;
  weight: string;
  num_stones: number | string;
  remark?: string;
  tenure_date_overrides?: Record<string, string>;
}
