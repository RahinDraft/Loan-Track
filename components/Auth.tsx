import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';

interface AuthProps {
  users: UserAccount[];
  isFirstRun?: boolean;
  onSetupAdmin?: (admin: UserAccount) => void;
  onSuccess: (user: UserAccount) => void;
  onReset: () => void;
  onRestore: (config: {apiKey: string, binId: string}) => Promise<boolean | undefined>;
}

const Auth: React.FC<AuthProps> = ({ users, isFirstRun, onSetupAdmin, onSuccess, onReset, onRestore }) => {
  const [userName, setUserName] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [setupMode, setSetupMode] = useState(isFirstRun);
  const [adminName, setAdminName] = useState('Admin');
  
  // Restore State
  const [showRestore, setShowRestore] = useState(false);
  const [resKey, setResKey] = useState('');
  const [resBin, setResBin] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    setSetupMode(isFirstRun);
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

    if (!userName.trim()) {
      setError('ইউজার নেম দিন');
      setPin('');
      return;
    }

    const foundUser = users.find(u => u.name.toLowerCase() === userName.trim().toLowerCase());
    
    if (!foundUser) {
      setError('ইউজার পাওয়া যায়নি! রিস্টোর করুন?');
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
    if (!resKey || !resBin) return alert("মাস্টার কি এবং বিন আইডি দিন");
    setIsRestoring(true);
    try {
      const success = await onRestore({ apiKey: resKey, binId: resBin });
      if (success) {
        alert("সব তথ্য সফলভাবে রিস্টোর হয়েছে! এখন লগইন করুন।");
        setShowRestore(false);
        setSetupMode(false);
        setPin('');
        setError('');
      } else {
        alert("তথ্য পাওয়া যায়নি। কি বা আইডি চেক করুন।");
      }
    } catch (e) {
      alert("সমস্যা হয়েছে। ইন্টারনেট চেক করুন।");
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

  // Restore UI Modal
  if (showRestore) {
    return (
      <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-xs space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path></svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">ক্লাউড থেকে রিস্টোর</h2>
            <p className="text-gray-400 text-xs">আপনার JSONBin তথ্য দিয়ে সব লোন ফেরত আনুন</p>
          </div>
          <div className="space-y-3">
            <input 
              type="password" 
              placeholder="Master Key" 
              className="w-full bg-white/5 p-4 rounded-xl border border-white/10 outline-none text-sm focus:border-white/40 transition-all"
              value={resKey}
              onChange={e => setResKey(e.target.value)}
            />
            <input 
              type="text" 
              placeholder="Bin ID" 
              className="w-full bg-white/5 p-4 rounded-xl border border-white/10 outline-none text-sm focus:border-white/40 transition-all"
              value={resBin}
              onChange={e => setResBin(e.target.value)}
            />
          </div>
          <button 
            disabled={isRestoring}
            onClick={handleCloudRestore}
            className="w-full bg-white text-bkash-pink py-4 rounded-xl font-black active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isRestoring ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                তথ্য আনা হচ্ছে...
              </>
            ) : 'ডেটা রিস্টোর করুন'}
          </button>
          <button onClick={() => setShowRestore(false)} className="w-full text-gray-400 text-xs font-bold py-2 uppercase tracking-widest">ফিরে যান</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-bkash-pink flex flex-col items-center justify-center p-6 text-white overflow-y-auto">
      <div className="mb-8 text-center max-w-xs">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {setupMode ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
            )}
          </svg>
        </div>
        <h2 className="text-2xl font-bold">{setupMode ? 'অ্যাডমিন সেটআপ' : 'লগইন করুন'}</h2>
        <p className="text-pink-100 text-sm mt-1">
          {setupMode ? 'আপনার নতুন পিন সেট করুন' : 'আপনার নাম ও পিন ব্যবহার করুন'}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-4 mb-8">
        {!setupMode && (
          <div>
            <label className="text-[10px] font-bold uppercase text-pink-200 block mb-1">ইউজার নেম</label>
            <input 
              type="text" 
              placeholder="নাম লিখুন"
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
                  {showPin && pin.length > i && <span className="text-bkash-pink text-[8px] font-black">{pin[i]}</span>}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setShowPin(!showPin)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-pink-200 p-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
            </button>
          </div>
        </div>
      </div>

      {error && <p className="mb-6 text-sm bg-black/30 px-4 py-2 rounded-xl text-center font-bold animate-bounce">{error}</p>}

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
        <button 
          onClick={() => setShowRestore(true)}
          className="w-full bg-white/10 border border-white/30 py-3 rounded-xl font-black text-[10px] uppercase tracking-[2px] hover:bg-white/20 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/></svg>
          Cloud Restore
        </button>
        
        {users.length > 0 && setupMode && (
          <button onClick={() => setSetupMode(false)} className="text-white/60 text-[10px] font-bold uppercase tracking-widest text-center">লগইন স্ক্রিনে যান</button>
        )}
        
        <button onClick={onReset} className="text-pink-200 text-[9px] font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity text-center mt-2 underline">সব ডেটা মুছে ফেলুন (Reset App)</button>
      </div>
    </div>
  );
};

export default Auth;