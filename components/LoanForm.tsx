
import React, { useState, useEffect } from 'react';
import { Loan, LoanStatus, Installment } from '../types';

interface LoanFormProps {
  onClose: () => void;
  onSubmit: (loan: Loan) => void;
  existingUsers: string[];
  editingLoan?: Loan | null;
}

const LoanForm: React.FC<LoanFormProps> = ({ onClose, onSubmit, existingUsers, editingLoan }) => {
  const MONTHLY_RATE = 0.0142; // 1.42%

  const [formData, setFormData] = useState({
    userName: editingLoan?.userName || '',
    principalAmount: editingLoan?.principalAmount.toString() || '',
    startDate: editingLoan 
      ? new Date(editingLoan.startDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0],
    totalInstallments: editingLoan?.totalInstallments.toString() || '3'
  });

  const [calc, setCalc] = useState({
    principal: 0,
    totalInterest: 0,
    totalPayable: 0,
    emi: 0,
    installments: [] as any[]
  });

  useEffect(() => {
    const P = Number(formData.principalAmount) || 0;
    const n = Number(formData.totalInstallments);
    const r = MONTHLY_RATE;

    if (P > 0) {
      const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      
      let remainingP = P;
      let totalInt = 0;
      const schedule = [];
      const startDate = new Date(formData.startDate);

      for (let i = 1; i <= n; i++) {
        const interestForMonth = Math.round(remainingP * r * 100) / 100;
        let principalForMonth = Math.round((emi - interestForMonth) * 100) / 100;
        
        if (i === n) {
          principalForMonth = Math.round(remainingP * 100) / 100;
        }

        const installmentDate = new Date(startDate);
        installmentDate.setMonth(startDate.getMonth() + i);

        schedule.push({
          date: installmentDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          principalPart: principalForMonth,
          interestPart: interestForMonth,
          amount: Math.round((principalForMonth + interestForMonth) * 100) / 100
        });

        totalInt += interestForMonth;
        remainingP -= principalForMonth;
      }

      setCalc({
        principal: P,
        totalInterest: Math.round(totalInt * 100) / 100,
        totalPayable: Math.round((P + totalInt) * 100) / 100,
        emi: Math.round(emi * 100) / 100,
        installments: schedule
      });
    }
  }, [formData.principalAmount, formData.totalInstallments, formData.startDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userName || !formData.principalAmount) return;

    // Preserve paid status if editing
    const installments = calc.installments.map((inst, index) => {
      const existingInst = editingLoan?.installments[index];
      return {
        id: existingInst?.id || Math.random().toString(36).substr(2, 9),
        ...inst,
        status: existingInst?.status || 'Pending'
      };
    });

    const paidCount = installments.filter(i => i.status === 'Paid').length;

    const newLoan: Loan = {
      id: editingLoan?.id || Date.now().toString(),
      loanId: editingLoan?.loanId || '1100' + Math.floor(100000000000 + Math.random() * 900000000000).toString(),
      userName: formData.userName,
      principalAmount: calc.principal,
      totalPayable: calc.totalPayable,
      interestRate: MONTHLY_RATE * 100,
      totalInterest: calc.totalInterest,
      startDate: new Date(formData.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      totalInstallments: Number(formData.totalInstallments),
      paidInstallments: paidCount,
      status: paidCount === Number(formData.totalInstallments) ? LoanStatus.PAID : LoanStatus.ACTIVE,
      nextDueDate: installments.find(i => i.status === 'Pending')?.date || installments[installments.length-1].date,
      installments: installments
    };

    onSubmit(newLoan);
  };

  const formatCurrency = (val: number) => `৳${val.toLocaleString('bn-BD', { minimumFractionDigits: 2 })}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-bkash-pink p-6 text-white text-center relative">
          <button onClick={onClose} className="absolute left-6 top-6 hover:bg-white/10 p-1 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <h3 className="text-xl font-bold">{editingLoan ? 'লোন এডিট করুন' : 'নতুন লোন'}</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto no-scrollbar">
          <div className="text-center bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-widest">মোট পরিশোধযোগ্য</p>
            <h2 className="text-2xl font-black text-bkash-pink">{formatCurrency(calc.totalPayable)}</h2>
            <div className="flex justify-center gap-4 mt-2 pt-2 border-t border-gray-200">
              <div className="text-[9px] text-gray-400 font-bold uppercase">আসল: {formatCurrency(calc.principal)}</div>
              <div className="text-[9px] text-pink-400 font-bold uppercase">সুদ: {formatCurrency(calc.totalInterest)}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-wider">লোন গ্রহীতা</label>
              <input 
                required
                placeholder="নাম লিখুন"
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 font-bold focus:border-bkash-pink outline-none transition-all placeholder:text-gray-300"
                value={formData.userName}
                onChange={e => setFormData({...formData, userName: e.target.value})}
              />
              {existingUsers.length > 0 && !editingLoan && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {existingUsers.map(user => (
                    <button
                      key={user}
                      type="button"
                      onClick={() => setFormData({...formData, userName: user})}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${
                        formData.userName === user 
                        ? 'bg-bkash-pink border-bkash-pink text-white shadow-md' 
                        : 'bg-white border-gray-200 text-gray-500 hover:border-bkash-pink hover:text-bkash-pink'
                      }`}
                    >
                      {user}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-wider">লোন আসল পরিমাণ</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-lg">৳</span>
                <input 
                  required
                  type="number"
                  placeholder="0.00"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl py-3 pl-8 pr-3 font-black text-lg focus:border-bkash-pink outline-none transition-all placeholder:text-gray-300"
                  value={formData.principalAmount}
                  onChange={e => setFormData({...formData, principalAmount: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-wider">গ্রহণের তারিখ</label>
                <input 
                  type="date"
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 font-bold text-sm outline-none focus:border-bkash-pink"
                  value={formData.startDate}
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 tracking-wider">কিস্তি সংখ্যা</label>
                <select 
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl p-3 font-bold text-sm outline-none focus:border-bkash-pink appearance-none"
                  value={formData.totalInstallments}
                  onChange={e => setFormData({...formData, totalInstallments: e.target.value})}
                >
                  <option value="3">৩ মাস</option>
                  <option value="6">৬ মাস</option>
                </select>
              </div>
            </div>
          </div>

          <button className="w-full bg-bkash-pink text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:shadow-pink-200 active:scale-95 transition-all mt-2">
            {editingLoan ? 'পরিবর্তন নিশ্চিত করুন' : 'লোন নিশ্চিত করুন'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoanForm;
