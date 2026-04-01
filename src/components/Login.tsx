import React, { useState } from 'react';
import { LogIn, Shield, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../firebase';
import { signInAnonymously } from 'firebase/auth';

interface LoginProps {
  onLogin: (username: string, role: 'admin' | 'manager', station?: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Single general login as requested
      if (username === 'admin' && password === 'radar2024') {
        onLogin('مدير النظام', 'admin');
      } else {
        setError('خطأ في اسم المستخدم أو رمز الدخول');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-sans" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-blue-700 p-8 text-center text-white">
          <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <Radio className="w-10 h-10" />
          </div>
          <h1 className="text-xl font-bold mb-1">الشركة العامة لخدمات الملاحة الجوية</h1>
          <h2 className="text-lg opacity-90">قسم الاتصالات - شعبة الرادار</h2>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h3 className="text-xl font-black text-slate-800">تسجيل الدخول الموحد</h3>
            <p className="text-slate-500 text-sm font-bold mt-1">يرجى إدخال بيانات الوصول العامة</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">اسم المستخدم</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="اسم المستخدم"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">رمز الدخول</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-700 text-white py-4 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              تسجيل الدخول
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 font-medium">اسم المطور:</p>
            <p className="text-sm text-gray-600 font-bold">المهندس محمد رضا هادي</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
