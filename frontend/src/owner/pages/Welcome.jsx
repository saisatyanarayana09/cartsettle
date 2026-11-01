import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setStarted(true);
    // Automatically redirect to the actual dashboard after 2.5 seconds
    const timer = setTimeout(() => {
      navigate('/owner');
    }, 2500);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  const getOwnerName = () => {
    try {
      const user = JSON.parse(localStorage.getItem('smart-kirana-owner-user'));
      return user?.first_name || user?.username || 'Owner';
    } catch {
      return 'Owner';
    }
  };
  const ownerName = getOwnerName();

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-white to-emerald-50 flex flex-col items-center justify-center z-50">
      
      <div className="transition-all duration-700 ease-out" style={{opacity: started ? 1 : 0, transform: started ? 'translateY(0)' : 'translateY(16px)', transitionDelay: '0ms'}}>
        <div className="relative mb-8">
          <div className="absolute inset-0 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl mx-auto" style={{top: '-10px'}} />
          <img src="/logo-transparent.png" className="w-28 h-28 object-contain drop-shadow-xl relative z-10" alt="Narendra Kirana" />
        </div>
      </div>
      
      <h1 className="transition-all duration-700 ease-out text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-3" style={{opacity: started ? 1 : 0, transform: started ? 'translateY(0)' : 'translateY(16px)', transitionDelay: '150ms'}}>
        Welcome Back, {ownerName}!
      </h1>
      <p className="transition-all duration-700 ease-out text-slate-500 text-lg mb-10" style={{opacity: started ? 1 : 0, transform: started ? 'translateY(0)' : 'translateY(16px)', transitionDelay: '300ms'}}>
        Let's check on your store.
      </p>
      
      <div className="transition-all duration-700 ease-out w-64 sm:w-80" style={{opacity: started ? 1 : 0, transform: started ? 'translateY(0)' : 'translateY(16px)', transitionDelay: '450ms'}}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-emerald-700">Loading your dashboard...</span>
        </div>
        <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-[2500ms] ease-linear" style={{ width: started ? '100%' : '0%' }} />
        </div>
      </div>
    </div>
  );
};
export default Welcome;
