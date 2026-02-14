import React, { useState } from 'react';
import { UserAccount, Loan } from '../types';

interface SettingsProps {
  onClose: () => void;
  currentUser: UserAccount | null;
  users: UserAccount[];
  setUsers: (users: UserAccount[]) => void;
  loans: Loan[];
  setLoans: (loans: Loan[]) => void;
  onRefresh: () => void;
  isSyncing: boolean;
}

const Settings: React.FC<SettingsProps> = ({ onClose, currentUser, users, setUsers, onRefresh, isSyncing }) => {
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPin, setNewUserPin] = useState('');

  const addUser = () => {
    if (!newUserName || !newUserPin) return alert("নাম এবং পিন অবশ্যই দিতে হবে");
    setUsers([...users, { name: newUserName.trim(), phone: newUserPhone.trim(), pin: newUserPin.trim(), role: 'user' }]);
    setNewUserName(''); setNewUserPhone(''); setNewUserPin('');
  };

  const deleteUser = (name: string) => {
    if (window.confirm(`${name}-কে কি সত্যিই ডিলিট করতে চান?`)) {
      setUsers(users.filter(u => u.name !== name));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-['Hind_Siliguri']">
      <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="bg-gray-900 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-lg">সেটিংস ও অ্যাডমিন প্যানেল</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">কনফিগারেশন</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
          {/* Supabase Status Section */}
          <section className="p-5 rounded-2xl text-white shadow-xl bg-green-600">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-xs uppercase flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/></svg>
                Supabase Cloud Storage
              </h4>
              <span className="text-[9px] bg-black/20 px-2 py-0.5 rounded-full font-bold">স্থায়ী কানেকশন</span>
            </div>
            <p className="text-[10px] opacity-90 mb-4 leading-relaxed">
              আপনার অ্যাপ্লিকেশনটি সফলভাবে Supabase ক্লাউড ডাটাবেসের সাথে যুক্ত আছে। এখন আর আলাদা করে বিন আইডি বা মাস্টার কি প্রয়োজন নেই।
            </p>
            <button 
              onClick={onRefresh}
              disabled={isSyncing}
              className={`w-full py-3 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 bg-white text-green-700`}
            >
              {isSyncing ? 'সিঙ্ক হচ্ছে...' : 'এখনই ডাটা সিঙ্ক করুন'}
            </button>
          </section>

          <section className="space-y-4">
            <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider">নতুন ইউজার (বন্ধু) যোগ করুন</h4>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="বন্ধুর নাম" className="bg-gray-50 p-3 rounded-xl border text-sm outline-none focus:border-bkash-pink" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
              <input type="tel" placeholder="ফোন নাম্বার" className="bg-gray-50 p-3 rounded-xl border text-sm outline-none focus:border-bkash-pink" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} />
            </div>
            <input type="text" maxLength={4} placeholder="লগইন পিন (৪ ডিজিট)" className="w-full bg-gray-50 p-3 rounded-xl border text-sm outline-none focus:border-bkash-pink" value={newUserPin} onChange={e => setNewUserPin(e.target.value)} />
            <button onClick={addUser} className="w-full bg-bkash-pink text-white py-3 rounded-xl font-bold active:scale-95 transition-all shadow-lg shadow-pink-100">ইউজার তৈরি করুন</button>
          </section>

          <section className="space-y-3">
            <h4 className="font-bold text-xs text-gray-500 uppercase tracking-wider">ইউজার লিস্ট ({users.length})</h4>
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.name} className="flex justify-between p-4 border rounded-2xl items-center bg-gray-50 hover:border-bkash-pink/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-bkash-pink/5 flex items-center justify-center font-bold text-bkash-pink">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-800">{u.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{u.role} • PIN: {u.pin}</p>
                    </div>
                  </div>
                  {u.name !== currentUser?.name && (
                    <button onClick={() => deleteUser(u.name)} className="text-red-400 text-xs font-bold bg-red-50 px-3 py-1 rounded-lg active:scale-90 transition-transform">মুছুন</button>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Settings;