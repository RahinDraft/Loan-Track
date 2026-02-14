export enum LoanStatus {
  ACTIVE = 'Active',
  PAID = 'Paid'
}

export type LoanUser = string;

export interface UserAccount {
  name: string;
  phone: string;
  pin: string;
  role: 'admin' | 'user';
}

export interface CloudConfig {
  apiKey: string;
  binId: string;
  lastSync: string;
}

export interface Installment {
  id: string;
  date: string;
  amount: number;
  principalPart: number;
  interestPart: number;
  status: 'Paid' | 'Pending';
}

export interface Loan {
  id: string;
  loanId: string;
  userName: LoanUser;
  principalAmount: number;
  totalPayable: number;
  interestRate: number;
  totalInterest: number;
  startDate: string;
  totalInstallments: number;
  paidInstallments: number;
  status: LoanStatus;
  nextDueDate: string;
  installments: Installment[];
}

export interface DashboardStats {
  totalLoanAmount: number;
  totalPaid: number;
  totalRemaining: number;
  activeLoansCount: number;
}