import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loan, LoanStatus, UserAccount, CloudConfig } from './types';
import Dashboard from './components/Dashboard';
import LoanForm from './components/LoanForm';
import LoanList from './components/LoanList';
import Auth from './components/Auth';
import Settings from './components/Settings';

const STORAGE_KEY = 'bkash_loan_tracker_master_loans';
const USERS_KEY = 'bkash_loan_tracker_master_users';
const CLOUD_KEY = 'bkash_loan_tracker_cloud_config';

// Priority: Use Environment Variables for permanent setup if available
const ENV_CONFIG: Partial<CloudConfig> = {
  apiKey: (process.env as any).JSONBIN_API_KEY || '',
  binId: (process.env as any).JSONBIN_BIN_ID || ''
};

const App: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [cloudConfig, setCloudConfig] = useState<CloudConfig | null>(null);
  const [filterUser, setFilterUser] = useState<string>('All');
  const [showForm, setShowForm] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<'success' | 'error' | 'none'>('none');

  const pullFromCloud = useCallback(async (manualConfig?: {apiKey: string, binId: string}) => {
    const config = manualConfig || cloudConfig || (ENV_CONFIG.apiKey ? (ENV_CONFIG as CloudConfig) : null);
    if (!config?.apiKey || !config?.binId) return false;
    
    setIsSyncing(true);
    try {
      const res = await fetch(`https://api.jsonbin.io/v3/b/${config.binId}/latest`, {
        headers: { 'X-Master-Key': config.apiKey }
      });
      if (!res.ok) throw new Error("Pull failed");
      const data = await res.json();
      if (data.record) {
        const fetchedLoans = data.record.loans || [];
        const fetchedUsers = data.record.users || [];
        setLoans(fetchedLoans);
        setUsers(fetchedUsers);
        setLastSyncStatus('success');
        
        const newCloudConfig = { 
          ...config, 
          lastSync: new Date().toLocaleTimeString('bn-BD') 
        };
        setCloudConfig(newCloudConfig);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fetchedLoans));
        localStorage.setItem(USERS_KEY, JSON.stringify(fetchedUsers));
        localStorage.setItem(CLOUD_KEY, JSON.stringify(newCloudConfig));
        
        if (fetchedUsers.length > 0) {
          setIsFirstRun(false);
        }
        return true;
      }
      return false;
    } catch (error) {
      setLastSyncStatus('error');
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [cloudConfig]);

  useEffect(() => {
    const savedLoans = localStorage.getItem(STORAGE_KEY);
    const savedUsers = localStorage.getItem(USERS_KEY);
    const savedCloud = localStorage.getItem(CLOUD_KEY);

    let currentConfig: CloudConfig | null = null;
    if (savedCloud) {
      currentConfig = JSON.parse(savedCloud);
      setCloudConfig(currentConfig);
    } else if (ENV_CONFIG.apiKey && ENV_CONFIG.binId) {
      // Auto-bootstrap from environment variables
      currentConfig = ENV_CONFIG as CloudConfig;
      setCloudConfig(currentConfig);
    }

    if (savedLoans) setLoans(JSON.parse(savedLoans));
    
    if (savedUsers) {
      const parsedUsers = JSON.parse(savedUsers);
      setUsers(parsedUsers);
      setIsFirstRun(parsedUsers.length === 0);
    } else {
      setIsFirstRun(true);
    }

    setIsLoaded(true);

    // Initial sync check if we have config but no local data
    if (currentConfig && (!savedUsers || JSON.parse(savedUsers).length === 0)) {
      pullFromCloud(currentConfig);
    }
  }, [pullFromCloud]);

  const syncToCloud = useCallback(async (currentLoans: Loan[], currentUsers: UserAccount[]) => {
    const config = cloudConfig || (ENV_CONFIG.apiKey ? (ENV_CONFIG as CloudConfig) : null);
    if (!config?.apiKey || !config?.binId || currentUser?.role !== 'admin') return;
    
    setIsSyncing(true);
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${config.binId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': config.apiKey
        },
        body: JSON.stringify({ loans: currentLoans, users: currentUsers })
      });
      if (response.ok) {
        setLastSyncStatus('success');
        const updatedConfig = { ...config, lastSync: new Date().toLocaleTimeString('bn-BD') };
        setCloudConfig(updatedConfig);
        localStorage.setItem(CLOUD_KEY, JSON.stringify(updatedConfig));
      } else {
        setLastSyncStatus('error');
      }
    } catch (error) {
      setLastSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  }, [cloudConfig, currentUser]);

  const handleDataChange = (newLoans: Loan[], newUsers: UserAccount[]) => {
    setLoans(newLoans);
    setUsers(newUsers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newLoans));
    localStorage.setItem(USERS_KEY, JSON.stringify(newUsers));
    if (currentUser?.role === 'admin') syncToCloud(newLoans, newUsers);
  };

  const addLoan = (newLoan: Loan) => {
    handleDataChange([newLoan, ...loans], users);
    setShowForm(false);
  };

  const updateLoan = (updatedLoan: Loan) => {
    handleDataChange(loans.map(l => l.id === updatedLoan.id ? updatedLoan : l), users);
    setEditingLoan(null);
  };

  const deleteLoan = (id: string) => {
    if (window.confirm('ডিলিট করতে চান?')) {
      handleDataChange(loans.filter(l => l.id !== id), users);
    }
  };

  const stats = useMemo(() => {
    const vLoans = currentUser?.role === 'admin' && filterUser === 'All' 
      ? loans 
      : loans.filter(l => l.userName === (currentUser?.role === 'admin' ? filterUser : currentUser?.name));

    return vLoans.reduce((acc, loan) => {
      const paid = loan.installments.reduce((sum, inst) => inst.status === 'Paid' ? sum + inst.amount : sum, 0);
      return {
        totalLoanAmount: acc.totalLoanAmount + loan.totalPayable,
        totalPaid: acc.totalPaid + paid,
        totalRemaining: acc.totalRemaining + (loan.totalPayable - paid),
        activeLoansCount: acc.activeLoansCount + (loan.status === LoanStatus.ACTIVE ? 1 : 0)
      };
    }, { totalLoanAmount: 0, totalPaid: 0, totalRemaining: 0, activeLoansCount: 0 });
  }, [loans, filterUser, currentUser]);

  if (!isLoaded) return (
    <div className="min-h-screen bg-bkash-pink flex items-center justify-center font-['Hind_Siliguri']">
      <div className="animate-pulse text-white font-bold">লোড হচ্ছে...</div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="font-['Hind_Siliguri']">
        <Auth 
          users={users} 
          isFirstRun={isFirstRun}
          onRestore={pullFromCloud}
          onSetupAdmin={(admin) => {
            setUsers([admin]);
            setCurrentUser(admin);
            setIsAuthenticated(true);
            setIsFirstRun(false);
            handleDataChange([], [admin]);
          }}
          onSuccess={(user) => {
            setCurrentUser(user);
            setIsAuthenticated(true);
            // Refresh data on every login for user transparency
            pullFromCloud();
          }} 
          onReset={() => {
             if(window.confirm("সব ডেটা রিসেট হবে! নিশ্চিত?")) {
               localStorage.clear();
               window.location.reload();
             }
          }}
        />
      </div>
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
              {(cloudConfig || ENV_CONFIG.apiKey) && (
                <div 
                  className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-white animate-pulse' : lastSyncStatus === 'success' ? 'bg-green-400' : lastSyncStatus === 'error' ? 'bg-red-400' : 'bg-gray-400'}`}
                  title={lastSyncStatus === 'success' ? `সিঙ্ক সফল` : 'সিঙ্ক এরর'}
                ></div>
              )}
            </div>
            <p className="text-pink-100 text-[10px] font-bold uppercase tracking-wider">
              {isAdmin ? 'অ্যাডমিন' : 'ইউজার'}: {currentUser?.name}
              {cloudConfig?.lastSync && lastSyncStatus === 'success' && ` • সিঙ্ক: ${cloudConfig.lastSync}`}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => pullFromCloud()} className={`p-2 bg-white/10 rounded-full transition-all ${isSyncing ? 'rotate-180 opacity-50' : 'active:scale-90'}`} title="রিলোড করুন">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
            <button onClick={() => { setIsAuthenticated(false); setFilterUser('All'); }} className="p-2 bg-white/10 rounded-full active:scale-90" title="লগআউট">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            </button>
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
          filterUser={isAdmin ? filterUser : currentUser?.name || 'All'} 
          loans={loans} 
          users={users} 
          isAdmin={isAdmin}
          onUserClick={(name) => isAdmin && setFilterUser(name)} 
        />
        
        <div className="mt-8">
          <LoanList 
            loans={isAdmin && filterUser === 'All' ? loans : loans.filter(l => l.userName === (isAdmin ? filterUser : currentUser?.name))} 
            users={users} 
            onUpdate={updateLoan} 
            onEdit={(loan) => setEditingLoan(loan)} 
            onDelete={isAdmin ? deleteLoan : undefined} 
            isAdmin={isAdmin} 
            onUserClick={(name) => isAdmin && setFilterUser(name)} 
          />
        </div>
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-white/90 backdrop-blur-xl py-4 px-8 flex justify-between items-center z-50 shadow-2xl rounded-[30px] border border-white/20">
        <button onClick={() => { setShowSettings(false); setFilterUser('All'); }} className="flex flex-col items-center gap-1 transition-all active:scale-90">
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
        <Settings 
          onClose={() => setShowSettings(false)} 
          currentUser={currentUser} 
          users={users} 
          setUsers={(u) => handleDataChange(loans, u)} 
          loans={loans} 
          setLoans={(l) => handleDataChange(l, users)} 
          cloudConfig={cloudConfig} 
          setCloudConfig={(cfg) => { setCloudConfig(cfg); localStorage.setItem(CLOUD_KEY, JSON.stringify(cfg)); }} 
        />
      )}
    </div>
  );
};

export default App;