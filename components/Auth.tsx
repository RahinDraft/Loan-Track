import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';

interface AuthProps {
  users: UserAccount[];
  isFirstRun?: boolean;
  isSyncing?: boolean;
  onSetupAdmin?: (admin: UserAccount) => void;
  onSuccess: (user: UserAccount) => void;
  onReset: () => void;
  onRestore: () => Promise<boolean | undefined>;
}

const Auth: React.FC<AuthProps> = ({ users, isFirstRun, isSyncing, onSetupAdmin, onSuccess, onReset, onRestore }) => {
  const [userName, setUserName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [setupMode, setSetupMode] = useState(isFirstRun);
  const [adminName, setAdminName] = useState('Admin');
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (isFirstRun) setSetupMode(true);
  }, [isFirstRun]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    setError('');
    const cleanName = userName.trim();
    
    if (setupMode && onSetupAdmin) {
      if (pin.length !== 4) {
        setError('৪ ডিজিটের পিন দিন');
        return;
      }
      onSetupAdmin({
        name: adminName.trim() || 'Admin',
        phone: '', 
        pin: pin,
        role: 'admin'
      });
      return;
    }

    if (!cleanName) {
      setError('ইউজার নেম দিন (যেমন: Admin)');
      setPin('');
      return;
    }

    const foundUser = users.find(u => u.name.toLowerCase() === cleanName.toLowerCase());
    
    if (!foundUser) {
      // Manual fallback for first-time deploy only
      if (cleanName.toLowerCase() === 'admin' && pin === '1234') {
        onSuccess({ name: 'Admin', phone: '', pin: '1234', role: 'admin' });
        return;
      }
      setError('ইউজার পাওয়া যায়নি! সঠিক নাম লিখুন');
      setPin('');
      return;
    }

    if (pin === foundUser.pin) {
      onSuccess(foundUser);
    } else {
      setError('ভুল পিন! আবার চেষ্টা করুন');
      setPin('');
    }
  };

  const handleCloudRestore = async () => {
    setIsRestoring(true);
    setError('সিঙ্ক করা হচ্ছে...');
    try {
      const success = await onRestore();
      if (success) {
        setError('সিঙ্ক সফল হয়েছে! এখন লগিন করুন।');
      } else {
        setError('সার্ভারে কোনো ডাটা পাওয়া যায়নি।');
      }
    } catch (e) {
      setError('সার্ভার কানেকশন সমস্যা।');
    } finally {
      setIsRestoring(false);
    }
  };

  useEffect(() => {
    if (pin.length === 4) {
      const timer = setTimeout(() => handleSubmit(), 300);
      return () => clearTimeout(timer);
    }
  }, [pin]);

  const isLoadingUsers = isSyncing || isRestoring;

  return (
    <div className="fixed inset-0 z-[100] bg-bkash-pink flex flex-col items-center justify-center p-6 text-white overflow-y-auto font-['Hind_Siliguri']">
      <div className="mb-8 text-center max-w-xs">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
          {isLoadingUsers ? (
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            </svg>
          )}
        </div>
        <h2 className="text-2xl font-bold">{setupMode ? 'অ্যাডমিন সেটআপ' : 'লগইন করুন'}</h2>
        <p className="text-pink-100 text-[10px] mt-2 opacity-80 leading-relaxed">
          আপনার অ্যাকাউন্টে প্রবেশ করতে সঠিক নাম এবং ৪ ডিজিট পিন দিন
        </p>
      </div>

      <div className="w-full max-w-xs space-y-4 mb-8">
        {!setupMode && (
          <div>
            <label className="text-[10px] font-bold uppercase text-pink-200 block mb-1">ইউজার নেম</label>
            <input 
              type="text" 
              placeholder="নাম লিখুন (যেমন: Admin)"
              className="w-full bg-white/10 border border-white/30 rounded-xl p-4 outline-none text-white font-bold text-center placeholder:text-pink-300"
              value={userName}
              onChange={e => {setUserName(e.target.value); setError('');}}
            />
          </div>
        )}

        {setupMode && (
          <div>
            <label className="text-[10px] font-bold uppercase text-pink-200 block mb-1">অ্যাডমিন নাম</label>
            <input 
              type="text" 
              className="w-full bg-white/10 border border-white/30 rounded-xl p-4 outline-none text-white font-bold text-center"
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="text-[10px] font-bold uppercase text-pink-200 block mb-1 text-center">৪ ডিজিট পিন দিন</label>
          <div className="relative">
            <div className="flex justify-center gap-4 py-2">
              {[1, 2, 3, 4].map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 border-white transition-all duration-300 flex items-center justify-center ${pin.length > i ? 'bg-white scale-125' : 'bg-transparent'}`}>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p className={`mb-6 text-[11px] bg-black/40 px-4 py-2 rounded-xl text-center font-bold text-white shadow-xl`}>{error}</p>}

      <div className="grid grid-cols-3 gap-6 w-full max-w-xs mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'delete', 0, 'ok'].map(btn => {
          if (btn === 'delete') return (
            <button key="del" onClick={handleDelete} className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform border border-white/5"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z"></path></svg></button>
          );
          if (btn === 'ok') return (
            <button key="ok" onClick={handleSubmit} className="w-16 h-16 rounded-full bg-white text-bkash-pink flex items-center justify-center font-black active:scale-90 shadow-xl transition-transform">OK</button>
          );
          return (
            <button key={btn} onClick={() => handleNumberClick(btn.toString())} className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold active:scale-90 transition-all border border-white/5">{btn}</button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-[240px]">
        {!setupMode && (
          <button 
            onClick={handleCloudRestore}
            disabled={isLoadingUsers}
            className="w-full bg-white/10 border border-white/30 py-3 rounded-xl font-black text-[10px] uppercase tracking-[2px] hover:bg-white/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoadingUsers ? 'Syncing...' : 'Force Restore from Cloud'}
          </button>
        )}
        
        <button onClick={onReset} className="text-pink-200 text-[9px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity text-center mt-2 underline">Reset Local Data</button>
      </div>
    </div>
  );
};

export default Auth;