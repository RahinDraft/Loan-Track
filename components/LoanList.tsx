import React, { useState, useEffect, useRef } from 'react';
import { Loan, LoanStatus, Installment, UserAccount } from '../types';

interface LoanListProps {
  loans: Loan[];
  users?: UserAccount[];
  onUpdate: (loan: Loan) => void;
  onEdit: (loan: Loan) => void;
  onDelete?: (id: string) => void;
  isAdmin: boolean;
  onUserClick?: (name: string) => void;
  expandedLoanId: string | null;
  onExpandChange: (id: string | null) => void;
  highlightedInstallmentId: string | null;
}

const LoanList: React.FC<LoanListProps> = ({ 
  loans, 
  users = [], 
  onUpdate, 
  onEdit, 
  onDelete, 
  isAdmin, 
  onUserClick,
  expandedLoanId,
  onExpandChange,
  highlightedInstallmentId
}) => {
  const [notifyingInstallment, setNotifyingInstallment] = useState<{ loan: Loan, inst: Installment, type: 'success' | 'congrats' } | null>(null);
  
  // Refs for scrolling
  const listRef = useRef<HTMLDivElement>(null);

  // Handle auto-scrolling when an installment is highlighted
  useEffect(() => {
    if (highlightedInstallmentId) {
      // Small delay to allow expansion animation to start/finish
      setTimeout(() => {
        const element = document.getElementById(`inst-${highlightedInstallmentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [highlightedInstallmentId, expandedLoanId]);

  const formatCurrency = (amount: number) => {
    return `৳${amount.toLocaleString('bn-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getWhatsAppLink = (loan: Loan, installment: Installment, type: 'success' | 'congrats') => {
    if (!isAdmin) return null;
    const user = users.find(u => u.name === loan.userName);
    if (!user || !user.phone) return null;

    const totalPaidAmount = loan.installments.filter(i => i.status === 'Paid' || i.id === installment.id).reduce((s, i) => s + i.amount, 0);
    const remaining = loan.totalPayable - totalPaidAmount;
    
    let message = '';
    const cleanPhone = user.phone.startsWith('0') ? '88' + user.phone : user.phone;

    if (type === 'success') {
      message = `*বিকাশ লোন পেমেন্ট কনফার্মেশন*\n\nপ্রিয় ${loan.userName},\nআলহামদুলিল্লাহ, আপনার লোন আইডি: ${loan.loanId} এর ${formatCurrency(installment.amount)} টাকা কিস্তি সফলভাবে গ্রহণ করা হয়েছে।\n\nবর্তমান বাকি লোন: ${formatCurrency(remaining < 0 ? 0 : remaining)}\n\nধন্যবাদ।`;
    } else if (type === 'congrats') {
      message = `*অভিনন্দন! লোন পরিশোধ সম্পন্ন*\n\nপ্রিয় ${loan.userName},\nআপনার লোন আইডি: ${loan.loanId} লোনটি সম্পূর্ণ পরিশোধ হয়েছে। আমাদের সাথে সময়মতো লেনদেন করার জন্য আপনাকে অসংখ্য ধন্যবাদ। ভবিষ্যতে প্রয়োজনে আমরা আপনার পাশে আছি।`;
    }

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const triggerWhatsApp = (loan: Loan, installment: Installment, type: 'success' | 'congrats') => {
    if (!isAdmin) return;
    const link = getWhatsAppLink(loan, installment, type);
    if (link) {
      window.open(link, '_blank');
      setNotifyingInstallment(null);
    } else {
      alert("ইউজারের ফোন নাম্বার পাওয়া যায়নি। সেটিংস থেকে ফোন নাম্বার যোগ করুন।");
    }
  };

  const handleToggleInstallment = (loan: Loan, installmentId: string) => {
    if (!isAdmin) return;
    
    const installment = loan.installments.find(i => i.id === installmentId);
    if (!installment) return;

    const isMarkingAsPaid = installment.status === 'Pending';
    const updatedInstallments = loan.installments.map(inst => 
      inst.id === installmentId ? { ...inst, status: (inst.status === 'Paid' ? 'Pending' : 'Paid') as any } : inst
    );
    
    const paidCount = updatedInstallments.filter(i => i.status === 'Paid').length;
    const isCompleted = paidCount === loan.totalInstallments;

    const updatedLoan: Loan = {
      ...loan,
      installments: updatedInstallments,
      paidInstallments: paidCount,
      status: isCompleted ? LoanStatus.PAID : LoanStatus.ACTIVE
    };

    onUpdate(updatedLoan);

    if (isMarkingAsPaid && isAdmin) {
      setNotifyingInstallment({
        loan: updatedLoan,
        inst: { ...installment, status: 'Paid' },
        type: isCompleted ? 'congrats' : 'success'
      });
    }
  };

  if (loans.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        </div>
        <p className="text-gray-400 font-bold">কোন লোন পাওয়া যায়নি</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" ref={listRef}>
      {loans.map(loan => {
        const isExp = expandedLoanId === loan.id;
        const totalPaidAmount = loan.installments.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0);
        const progress = (loan.paidInstallments / loan.totalInstallments) * 100;

        return (
          <div key={loan.id} id={`loan-${loan.id}`} className={`bg-white rounded-[24px] shadow-sm border overflow-hidden transition-all duration-300 ${isExp ? 'border-bkash-pink/20 shadow-md scale-[1.01]' : 'border-gray-100'}`}>
            <div 
              className={`p-5 flex justify-between items-center cursor-pointer active:bg-gray-50 ${isExp ? 'bg-pink-50/30' : ''}`}
              onClick={() => onExpandChange(isExp ? null : loan.id)}
            >
              <div className="flex gap-4 items-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isExp ? 'bg-bkash-pink text-white' : 'bg-bkash-pink/5 text-bkash-pink'}`}>
                   <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"></path><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"></path></svg>
                </div>
                <div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onUserClick?.(loan.userName); }}
                    className="font-bold text-gray-800 hover:text-bkash-pink text-left transition-colors flex items-center gap-1"
                  >
                    {loan.userName}
                    <svg className="w-3 h-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                  </button>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">আইডি: {loan.loanId.slice(-6)}</p>
                </div>
              </div>
              <div className="text-right flex items-center gap-3">
                 <div>
                   <p className="text-sm font-black text-bkash-pink">{formatCurrency(loan.totalPayable - totalPaidAmount)}</p>
                   <p className="text-[9px] text-gray-400 font-bold uppercase">বাকি</p>
                 </div>
                 <svg className={`w-4 h-4 text-gray-300 transition-transform duration-300 ${isExp ? 'rotate-180 text-bkash-pink' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>

            {isExp && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 space-y-5">
                   <div className="text-center py-4 relative">
                      {isAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEdit(loan); }}
                          className="absolute right-0 top-0 p-2 text-gray-400 hover:text-blue-500 transition-colors bg-white rounded-full shadow-sm"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                        </button>
                      )}
                      <p className="text-[11px] text-gray-500 font-bold mb-1">মূল লোন পরিমাণ</p>
                      <h3 className="text-3xl font-black text-bkash-pink tracking-tight">{formatCurrency(loan.principalAmount)}</h3>
                   </div>
                   
                   <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-500 font-bold">পূর্ণ আইডি: {loan.loanId}</span>
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${loan.status === LoanStatus.PAID ? 'bg-green-100 text-green-600' : 'bg-pink-100 text-bkash-pink'}`}>
                        {loan.status === LoanStatus.PAID ? 'পরিশোধিত' : 'চলতি'}
                      </span>
                   </div>
                   
                   <div className="space-y-2.5 py-4 border-y border-gray-100">
                      <div className="flex justify-between text-xs font-bold">
                         <span className="text-gray-500">মোট পরিশোধযোগ্য</span>
                         <span className="text-gray-800">{formatCurrency(loan.totalPayable)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold">
                         <span className="text-gray-500">পরিশোধ করা হয়েছে</span>
                         <span className="text-gray-800 text-green-600">{formatCurrency(totalPaidAmount)}</span>
                      </div>
                   </div>

                   <div className="relative pt-1">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">অগ্রগতি</span>
                        <span className="text-[10px] font-bold text-bkash-pink">{Math.round(progress)}%</span>
                      </div>
                      <div className="overflow-hidden h-2 mb-2 text-xs flex rounded-full bg-gray-200">
                        <div style={{ width: `${progress}%` }} className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all duration-1000 ${loan.status === LoanStatus.PAID ? 'bg-green-500' : 'bg-bkash-pink'}`}></div>
                      </div>
                   </div>
                </div>

                <div className="p-6 space-y-4">
                   <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b pb-2">কিস্তি তালিকা</h5>
                   {loan.installments.map((inst, idx) => {
                     const isHighlighted = highlightedInstallmentId === inst.id;
                     return (
                      <div 
                        key={inst.id} 
                        id={`inst-${inst.id}`} 
                        className={`flex gap-4 p-2 -m-2 rounded-xl transition-all duration-700 ${isHighlighted ? 'bg-yellow-50 ring-2 ring-yellow-400 shadow-lg scale-[1.02] z-10' : ''}`}
                      >
                         <div className="flex flex-col items-center">
                            <div 
                             onClick={() => isAdmin && handleToggleInstallment(loan, inst.id)}
                             className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${isAdmin ? 'cursor-pointer' : 'cursor-default'} ${inst.status === 'Paid' ? 'bg-bkash-pink border-bkash-pink shadow-md' : 'bg-white border-gray-300'}`}
                            >
                              {inst.status === 'Paid' && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7"></path></svg>}
                            </div>
                            {idx !== loan.installments.length - 1 && <div className="w-0.5 flex-1 bg-gray-100 my-1"></div>}
                         </div>
                         <div className="flex-1 pb-6 flex justify-between items-start">
                            <div className={isHighlighted ? 'animate-pulse' : ''}>
                               <p className="text-xs font-black text-gray-800 mb-0.5">{inst.date}</p>
                               <div className="flex items-center gap-2">
                                 <p className="text-sm font-black text-gray-900">{formatCurrency(inst.amount)}</p>
                                 {isHighlighted && <span className="text-[8px] bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-black animate-bounce">লক্ষ্য</span>}
                               </div>
                               <p className="text-[9px] text-gray-400 font-bold">আসল {formatCurrency(inst.principalPart)} + সুদ {formatCurrency(inst.interestPart)}</p>
                            </div>
                            
                            {inst.status === 'Paid' && isAdmin && (
                              <button 
                                onClick={() => triggerWhatsApp(loan, inst, 'success')}
                                className="p-2 text-green-500 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                              </button>
                            )}
                         </div>
                      </div>
                    );
                   })}
                   
                   {isAdmin && (
                     <button 
                      onClick={() => onDelete?.(loan.id)}
                      className="w-full py-3 text-[10px] font-bold text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-dashed border-red-100"
                     >
                        লোন রেকর্ড ডিলিট করুন
                     </button>
                   )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {notifyingInstallment && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-xs text-center shadow-2xl animate-in zoom-in duration-300">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${notifyingInstallment.type === 'congrats' ? 'bg-green-100 text-green-600' : 'bg-bkash-pink/10 text-bkash-pink'}`}>
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h4 className="text-xl font-black text-gray-900 mb-2">
              {notifyingInstallment.type === 'congrats' ? 'অভিনন্দন!' : 'সফল হয়েছে!'}
            </h4>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              {notifyingInstallment.type === 'congrats' 
                ? `${notifyingInstallment.loan.userName}-এর লোনটি সম্পূর্ণ পরিশোধ হয়েছে।`
                : `${notifyingInstallment.loan.userName}-এর ${formatCurrency(notifyingInstallment.inst.amount)} টাকা কিস্তি গ্রহণ করা হয়েছে।`}
            </p>
            <div className="space-y-3">
              <button 
                onClick={() => triggerWhatsApp(notifyingInstallment.loan, notifyingInstallment.inst, notifyingInstallment.type)}
                className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                হোয়াটসঅ্যাপে পাঠান
              </button>
              <button 
                onClick={() => setNotifyingInstallment(null)}
                className="w-full py-3 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                পরে পাঠাবো
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanList;