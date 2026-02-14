import React, { useState } from 'react';
import { UserAccount, Loan, CloudConfig } from '../types';

interface SettingsProps {
  onClose: () => void;
  currentUser: UserAccount | null;
  users: UserAccount[];
  setUsers: (users: UserAccount[]) => void;
  loans: Loan[];
  setLoans: (loans: Loan[]) => void;
  cloudConfig: CloudConfig | null;
  setCloudConfig: (cfg: CloudConfig | null) => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose, currentUser, users, setUsers, cloudConfig, setCloudConfig }) => {
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPin, setNewUserPin] = useState('');
  const [cloudKeyInput, setCloudKeyInput] = useState(cloudConfig?.apiKey || '');
  const [cloudBinInput, setCloudBinInput] = useState(cloudConfig?.binId || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'none' | 'success' | 'error'>('none');

  const saveCloud = async () => {
    if (!cloudKeyInput || !cloudBinInput) return alert("API Key এবং Bin ID দিন");
    
    setIsVerifying(true);
    setVerifyStatus('none');
    
    try {
      // JSONBin.io-র সাথে কানেকশন টেস্ট করা হচ্ছে
      const response = await fetch(`https://api.jsonbin.io/v3/b/${cloudBinInput}/latest`, {
        headers: { 'X-Master-Key': cloudKeyInput }
      });
      
      if (response.ok) {
        setCloudConfig({ 
          apiKey: cloudKeyInput, 
          binId: cloudBinInput, 
          lastSync: new Date().toLocaleTimeString('bn-BD') 
        });
        setVerifyStatus('success');
        alert("অভিনন্দন! ক্লাউড কানেক্ট হয়েছে এবং তথ্য ভেরিফাই করা হয়েছে।");
      } else {
        const errorData = await response.json();
        setVerifyStatus('error');
        alert(`ভুল হয়েছে! JSONBin থেকে মেসেজ: ${errorData.message || 'Key বা ID চেক করুন'}`);
      }
    } catch (error) {
      setVerifyStatus('error');
      alert("ইন্টারনেট কানেকশন চেক করুন। ক্লাউডে যুক্ত হতে সমস্যা হচ্ছে।");
    } finally {
      setIsVerifying(false);
    }
  };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="bg-gray-900 p-6 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-bold text-lg">সেটিংস ও অ্যাডমিন প্যানেল</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">কনফিগারেশন</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
          {/* Cloud Section with Verification UI */}
          <section className={`p-5 rounded-2xl text-white shadow-xl transition-all duration-500 ${verifyStatus === 'success' ? 'bg-green-600' : verifyStatus === 'error' ? 'bg-red-600' : 'bg-indigo-600'}`}>
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-bold text-xs uppercase flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z"/></svg>
                Cloud Sync (JSONBin.io)
              </h4>
              {cloudConfig?.lastSync && (
                <span className="text-[9px] bg-black/20 px-2 py-0.5 rounded-full font-bold">সিঙ্ক: {cloudConfig.lastSync}</span>
              )}
            </div>
            <p className="text-[10px] opacity-80 mb-4 leading-relaxed">আপনার মাস্টার কি এবং বিন আইডি দিয়ে কানেক্ট করুন।</p>
            <div className="space-y-2">
              <input 
                type="password" 
                placeholder="JSONBin Master Key" 
                className="w-full bg-white/10 p-3 rounded-xl outline-none border border-white/20 text-xs placeholder:text-white/40" 
                value={cloudKeyInput} 
                onChange={e => {setCloudKeyInput(e.target.value); setVerifyStatus('none');}} 
              />
              <input 
                type="text" 
                placeholder="Bin ID" 
                className="w-full bg-white/10 p-3 rounded-xl outline-none border border-white/20 text-xs placeholder:text-white/40" 
                value={cloudBinInput} 
                onChange={e => {setCloudBinInput(e.target.value); setVerifyStatus('none');}} 
              />
              <button 
                disabled={isVerifying}
                onClick={saveCloud} 
                className={`w-full py-3 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 ${isVerifying ? 'bg-white/20 cursor-not-allowed' : 'bg-white text-indigo-600'}`}
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    যাচাই করা হচ্ছে...
                  </>
                ) : verifyStatus === 'success' ? 'কানেক্টেড (আবার সিঙ্ক করুন)' : 'ক্লাউড কানেক্ট করুন'}
              </button>
            </div>
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
