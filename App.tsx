import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Loan, LoanStatus, UserAccount } from './types';
import Dashboard from './components/Dashboard';
import LoanForm from './components/LoanForm';
import LoanList from './components/LoanList';
import Auth from './components/Auth';
import Settings from './components/Settings';

const APP_VERSION = "v1.0.9";

// Supabase Configuration
const SUPABASE_URL = 'https://ivcuqbjctoeaqmtesobu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2Y3VxYmpjdG9lYXFtdGVzb2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTY3OTcsImV4cCI6MjA4NjYzMjc5N30.17daHgzsoNB3NgyfCIGWLPglv6iYIkr2bGfjIn1isKk';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STORAGE_KEY = 'bkash_loan_tracker_master_loans';
const USERS_KEY = 'bkash_loan_tracker_master_users';

const App: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [filterUser, setFilterUser] = useState<string>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [highlightedInstId, setHighlightedInstId] = useState<string | null>(null);

  const pullFromSupabase = useCallback(async () => {
    setIsSyncing(true);
    try {
      const { data: userData } = await supabase.from('users').select('*');
      const { data: loanData } = await supabase.from('loans').select('*').order('created_at', { ascending: false });

      if (userData) {
        setUsers(userData);
        localStorage.setItem(USERS_KEY, JSON.stringify(userData));
      }

      if (loanData) {
        const transformedLoans = loanData.map(l => ({
          ...l,
          installments: typeof l.installments === 'string' ? JSON.parse(l.installments) : l.installments
        }));
        setLoans(transformedLoans);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transformedLoans));
      }
      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const savedLoans = localStorage.getItem(STORAGE_KEY);
      const savedUsers = localStorage.getItem(USERS_KEY);
      if (savedLoans) setLoans(JSON.parse(savedLoans));
      if (savedUsers) setUsers(JSON.parse(savedUsers));
      await pullFromSupabase();
      setIsLoaded(true);
    };
    init();
  }, [pullFromSupabase]);

  const syncToSupabase = useCallback(async (currentLoans: Loan[], currentUsers: UserAccount[]) => {
    if (currentUser?.role !== 'admin') return;
    setIsSyncing(true);
    try {
      const cleanLoans = currentLoans.map(({ created_at, ...l }: any) => l);
      await supabase.from('users').upsert(currentUsers, { onConflict: 'name' });
      await supabase.from('loans').upsert(cleanLoans, { onConflict: 'id' });
    } catch (error) { console.error(error); } finally { setIsSyncing(false); }
  }, [currentUser]);

  const handleDataChange = (newLoans: Loan[], newUsers: UserAccount[]) => {
    setLoans(newLoans);
    setUsers(newUsers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLoans));
    localStorage.setItem(USERS_KEY, JSON.stringify(newUsers));
    if (currentUser?.role === 'admin') syncToSupabase(newLoans, newUsers);
  };

  const addLoan = (newLoan: Loan) => {
    handleDataChange([newLoan, ...loans], users);
    setShowForm(false);
  };

  const updateLoan = (updatedLoan: Loan) => {
    handleDataChange(loans.map(l => l.id === updatedLoan.id ? updatedLoan : l), users);
    setEditingLoan(null);
  };

  const deleteLoan = async (id: string) => {
    if (window.confirm('মুছে ফেলতে চান?')) {
      const updatedLoans = loans.filter(l => l.id !== id);
      setLoans(updatedLoans);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLoans));
      if (currentUser?.role === 'admin') await supabase.from('loans').delete().eq('id', id);
    }
  };

  const handleInstallmentFocus = (loanId: string, instId: string) => {
    setExpandedLoanId(loanId);
    setHighlightedInstId(instId);
    setTimeout(() => setHighlightedInstId(null), 3000);
  };

  const filteredLoans = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') {
      if (filterUser === 'All') return loans;
      return loans.filter(l => l.userName.toLowerCase() === filterUser.toLowerCase());
    }
    return loans.filter(l => l.userName.toLowerCase() === currentUser.name.toLowerCase());
  }, [loans, filterUser, currentUser]);

  const stats = useMemo(() => {
    return filteredLoans.reduce((acc, loan) => {
      const paid = loan.installments.reduce((sum, inst) => inst.status === 'Paid' ? sum + inst.amount : sum, 0);
      return {
        totalLoanAmount: acc.totalLoanAmount + loan.totalPayable,
        totalPaid: acc.totalPaid + paid,
        totalRemaining: acc.totalRemaining + (loan.totalPayable - paid),
        activeLoansCount: acc.activeLoansCount + (loan.status === LoanStatus.ACTIVE ? 1 : 0)
      };
    }, { totalLoanAmount: 0, totalPaid: 0, totalRemaining: 0, activeLoansCount: 0 });
  }, [filteredLoans]);

  if (!isLoaded) return <div className="min-h-screen bg-bkash-pink flex flex-col items-center justify-center p-6 text-white text-center">লোডিং...</div>;

  if (!isAuthenticated) {
    return (
      <Auth 
        users={users} 
        isSyncing={isSyncing}
        onRestore={pullFromSupabase}
        onSetupAdmin={(admin) => { setUsers([admin]); setCurrentUser(admin); setIsAuthenticated(true); handleDataChange([], [admin]); }}
        onSuccess={(user) => { setCurrentUser(user); setIsAuthenticated(true); pullFromSupabase(); }} 
        onReset={() => { localStorage.clear(); window.location.reload(); }}
      />
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col max-w-md mx-auto shadow-2xl relative border-x border-gray-200 font-['Hind_Siliguri']">
      <header className="bg-bkash-pink text-white pt-10 pb-16 px-6 sticky top-0 z-40 rounded-b-[40px] shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">বিকাশ লোন প্রো</h1>
              <span className="text-[8px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold opacity-60 tracking-tighter">{APP_VERSION}</span>
            </div>
            <p className="text-pink-100 text-[10px] font-bold uppercase tracking-wider">
              {isAdmin ? 'অ্যাডমিন' : 'ইউজার'}: {currentUser?.name}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => pullFromSupabase()} className="p-2 bg-white/10 rounded-full active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg></button>
            <button onClick={() => { setIsAuthenticated(false); setFilterUser('All'); }} className="p-2 bg-white/10 rounded-full active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg></button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 -mt-10 pb-28 relative z-30">
        {isAdmin && (
          <div className="flex bg-white rounded-2xl p-1 shadow-md mb-6 overflow-x-auto no-scrollbar border border-gray-100">
            <button onClick={() => setFilterUser('All')} className={`flex-1 px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${filterUser === 'All' ? 'bg-bkash-pink text-white shadow-md' : 'text-gray-400'}`}>সবাই</button>
            {users.filter(u => u.role !== 'admin').map(user => (
              <button key={user.name} onClick={() => setFilterUser(user.name)} className={`flex-1 px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${filterUser === user.name ? 'bg-bkash-pink text-white shadow-md' : 'text-gray-400'}`}>{user.name}</button>
            ))}
          </div>
        )}

        <Dashboard 
          stats={stats} 
          filterUser={isAdmin ? filterUser : (currentUser?.name || 'All')} 
          loans={filteredLoans} 
          users={users} 
          isAdmin={isAdmin}
          onInstallmentClick={handleInstallmentFocus}
        />
        
        <div className="mt-8">
          <LoanList 
            loans={filteredLoans} 
            users={users} 
            onUpdate={updateLoan} 
            onEdit={(loan) => setEditingLoan(loan)} 
            onDelete={isAdmin ? deleteLoan : undefined} 
            isAdmin={isAdmin} 
            expandedLoanId={expandedLoanId}
            onExpandChange={setExpandedLoanId}
            highlightedInstallmentId={highlightedInstId}
          />
        </div>
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/90 backdrop-blur-xl py-4 px-8 flex justify-between items-center z-50 shadow-2xl rounded-[30px] border border-white/20">
        <button onClick={() => { setShowSettings(false); setExpandedLoanId(null); }} className="flex flex-col items-center gap-1 transition-all active:scale-90">
          <svg className={`w-6 h-6 ${!showSettings ? 'text-bkash-pink' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span className={`text-[10px] font-bold ${!showSettings ? 'text-bkash-pink' : 'text-gray-300'}`}>হোম</span>
        </button>
        {isAdmin && (
          <button onClick={() => setShowForm(true)} className="w-14 h-14 bg-bkash-pink -mt-12 rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-white active:scale-95 transition-all">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
          </button>
        )}
        {isAdmin && (
          <button onClick={() => setShowSettings(true)} className="flex flex-col items-center gap-1 transition-all active:scale-90">
            <svg className={`w-6 h-6 ${showSettings ? 'text-bkash-pink' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zM19.4 13c0-.3.1-.6.1-.9l2.1-1.7c.2-.2.2-.4.1-.6l-2-3.5c-.1-.2-.4-.3-.6-.2l-2.5 1c-.5-.4-1.1-.7-1.7-.9l-.4-2.6c0-.2-.2-.4-.5-.4h-4c-.3 0-.5.2-.5.4l-.4 2.6c-.6.2-1.2.5-1.7.9l-2.5-1c-.2-.1-.5 0-.6.2l-2 3.5c-.1.2-.1.4.1.6l2.1 1.7c-.1.3-.1.6-.1.9 0 .3 0 .6.1.9l-2.1 1.7c-.2.2-.2.4-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7.9l.4 2.6c0 .2.2.4.5.4h4c.3 0 .5-.2.5-.4l.4-2.6c.6-.2 1.2-.5 1.7-.9l2.5 1c.2.1.5 0 .6-.2l2-3.5c.1-.2.1-.4-.1-.6L19.4 13z"/></svg>
            <span className={`text-[10px] font-bold ${showSettings ? 'text-bkash-pink' : 'text-gray-300'}`}>সেটিংস</span>
          </button>
        )}
      </div>

      {(showForm || editingLoan) && <LoanForm onClose={() => { setShowForm(false); setEditingLoan(null); }} onSubmit={editingLoan ? updateLoan : addLoan} existingUsers={users.filter(u => u.role !== 'admin').map(u => u.name)} editingLoan={editingLoan} />}
      {showSettings && isAdmin && (
        <Settings onClose={() => setShowSettings(false)} currentUser={currentUser} users={users} setUsers={(u) => handleDataChange(loans, u)} loans={loans} setLoans={(l) => handleDataChange(l, users)} onRefresh={pullFromSupabase} isSyncing={isSyncing} />
      )}
    </div>
  );
};

export default App;