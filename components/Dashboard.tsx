import React from 'react';
import { DashboardStats, LoanUser, Loan, LoanStatus, UserAccount } from '../types';

interface DashboardProps {
  stats: DashboardStats;
  filterUser: LoanUser | 'All';
  loans: Loan[];
  users?: UserAccount[];
  isAdmin?: boolean;
  onUserClick?: (name: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, filterUser, loans, users = [], isAdmin = false, onUserClick }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('bn-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getUserColor = (name: string) => {
    const colors = ['text-pink-600 bg-pink-50', 'text-purple-600 bg-purple-50', 'text-blue-600 bg-blue-50', 'text-green-600 bg-green-50', 'text-orange-600 bg-orange-50'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const sendWhatsAppReminder = (userName: string, loanId: string, amount: number, date: string) => {
    if (!isAdmin) return;
    const user = users.find(u => u.name === userName);
    if (!user || !user.phone) {
      alert("ইউজারের ফোন নাম্বার নেই। সেটিংসে ফোন নাম্বার যোগ করুন।");
      return;
    }
    
    const cleanPhone = user.phone.startsWith('0') ? '88' + user.phone : user.phone;
    const message = `আসসালামু আলাইকুম, আগামীকাল (${date}) আপনার লোন আইডি ${loanId} এর ${formatCurrency(amount)} টাকা কিস্তি পরিশোধের তারিখ। অনুগ্রহ করে সময়মতো পরিশোধ করুন। ধন্যবাদ।`;
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const upcomingPayments = React.useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return loans
      .filter(loan => loan.status === LoanStatus.ACTIVE)
      .map(loan => {
         const nextPending = loan.installments.find(inst => inst.status === 'Pending');
         if (!nextPending) return null;
         
         const instDate = new Date(nextPending.date);
         instDate.setHours(0,0,0,0);
         const isDueSoon = instDate.getTime() === tomorrow.getTime();
         return { ...nextPending, userName: loan.userName, loanId: loan.loanId, isDueSoon };
      })
      .filter(item => item !== null)
      .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime());
  }, [loans]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
        <span className="text-gray-500 text-sm font-medium mb-1">
          {filterUser === 'All' ? 'মোট বাকি লোন' : `${filterUser}-এর বাকি লোন`}
        </span>
        <h3 className="text-3xl font-extrabold text-gray-900 mb-2">{formatCurrency(stats.totalRemaining)}</h3>
        <div className="w-full bg-gray-100 rounded-full h-2 mt-4 overflow-hidden">
          <div 
            className="bg-bkash-pink h-full transition-all duration-1000"
            style={{ width: `${stats.totalLoanAmount > 0 ? (stats.totalPaid / stats.totalLoanAmount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {upcomingPayments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-bkash-pink/5 px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h4 className="text-sm font-bold text-bkash-pink flex items-center gap-2">আসন্ন কিস্তি সমূহ</h4>
            <span className="text-[10px] bg-bkash-pink/10 text-bkash-pink px-2 py-0.5 rounded-full font-bold uppercase">রিভিউ</span>
          </div>
          <div className="p-3 space-y-3">
              {upcomingPayments.map((inst, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex justify-between items-center ${inst!.isDueSoon ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-200 ring-offset-2' : 'bg-gray-50 border-gray-100'}`}>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <button 
                          onClick={() => onUserClick?.(inst!.userName)}
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase transition-transform active:scale-95 ${getUserColor(inst!.userName)}`}
                        >
                          {inst!.userName}
                        </button>
                        {inst!.isDueSoon && <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded font-black animate-pulse">আগামীকাল</span>}
                      </div>
                      <p className="text-lg font-black text-gray-900">{formatCurrency(inst!.amount)}</p>
                      <p className="text-[10px] font-bold text-gray-400">{inst!.date}</p>
                    </div>
                    {inst!.isDueSoon && isAdmin && (
                      <button 
                        onClick={() => sendWhatsAppReminder(inst!.userName, inst!.loanId, inst!.amount, inst!.date)}
                        className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition-transform active:scale-90"
                      >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                      </button>
                    )}
                  </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;