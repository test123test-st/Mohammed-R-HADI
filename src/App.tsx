/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  LogOut, 
  User as UserIcon, 
  Briefcase, 
  MapPin, 
  Calendar, 
  FileText, 
  Users, 
  Save, 
  X,
  Download,
  ImageIcon,
  Printer,
  Radio,
  ChevronRight,
  ChevronLeft,
  Phone,
  Home,
  Heart,
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, AppUser, IRAQ_PROVINCES, STATIONS, CERTIFICATES } from './types';
import { exportToExcel, exportToPDF, fileToBase64, importFromExcel } from './utils';
import { Login } from './components/Login';
import { Toaster, toast } from 'sonner';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [filterStation, setFilterStation] = useState('all');
  const [filterCert, setFilterCert] = useState('all');
  const [filterProvince, setFilterProvince] = useState('all');
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<Partial<Employee>>({
    fullName: '',
    motherName: '',
    employeeId: '',
    phone: '',
    appointmentDate: '',
    certificate: 'بكالوريوس',
    specialization: '',
    jobTitle: '',
    maritalStatus: 'single',
    childrenCount: 0,
    residenceProvince: 'بغداد',
    residenceDistrict: '',
    station: '',
    section: 'شعبة الرادار',
    images: {
      childrenIds: []
    },
    childrenDetails: []
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('app_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setCurrentUser(parsedUser);
    }
    setLoading(false);

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Firebase Auth: Signed in as', user.uid);
      } else {
        console.log('Firebase Auth: Signed out');
      }
    });

    // Test Firestore connection
    const testConnection = async () => {
      try {
        const { getDocFromServer, doc } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log('Firestore connection successful');
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribeAuth();
  }, []);

  const handleLogin = (username: string, role: 'admin' | 'manager', station?: string) => {
    const user: AppUser = { uid: Date.now().toString(), username, role, stationName: station };
    setCurrentUser(user);
    localStorage.setItem('app_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('app_user');
  };

  useEffect(() => {
    if (!currentUser) return;

    const path = 'employees';
    let q = query(collection(db, path));
    
    if (currentUser.role === 'manager' && currentUser.stationName) {
      q = query(collection(db, path), where('station', '==', currentUser.stationName));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
      setEmployees(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    const requiredFields = ['fullName', 'motherName', 'employeeId', 'phone', 'specialization', 'jobTitle', 'station'];
    const errors = requiredFields.filter(f => !formData[f as keyof Employee]);
    
    if (errors.length > 0) {
      setFormErrors(errors);
      alert('يرجى ملء كافة الحقول المطلوبة المميزة باللون الأحمر');
      return;
    }

    if (!/^07\d{9}$/.test(formData.phone || '')) {
      alert('رقم الهاتف يجب أن يتكون من 11 رقم ويبدأ بـ 07');
      return;
    }

    if (formData.childrenCount > 0 && formData.childrenDetails) {
      const childErrors: string[] = [];
      formData.childrenDetails.forEach((c, idx) => {
        if (!c.name) childErrors.push(`childName-${idx}`);
        if (!c.birthDate) childErrors.push(`childBirth-${idx}`);
        if (!c.nationalId) childErrors.push(`childId-${idx}`);
      });
      
      if (childErrors.length > 0) {
        setFormErrors(prev => [...prev, ...childErrors]);
        alert('يرجى إكمال كافة بيانات الأطفال (الاسم، رقم الهوية، وتاريخ الميلاد)');
        return;
      }
    }

    if (!showConfirmSave) {
      setShowConfirmSave(true);
      return;
    }

    const path = 'employees';
    const data = {
      ...formData,
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.username,
      station: currentUser.role === 'manager' ? currentUser.stationName : formData.station
    };

    try {
      if (editingEmployee?.id) {
        await updateDoc(doc(db, path, editingEmployee.id), data);
        toast.success('تم تحديث بيانات الموظف بنجاح');
      } else {
        await addDoc(collection(db, path), { ...data, createdAt: new Date().toISOString() });
        toast.success('تم إضافة الموظف بنجاح');
      }
      setShowConfirmSave(false);
      closeModal();
    } catch (error) {
      toast.error('حدث خطأ أثناء حفظ البيانات');
      handleFirestoreError(error, editingEmployee?.id ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف بيانات هذا الموظف نهائياً؟')) return;
    const path = 'employees';
    try {
      await deleteDoc(doc(db, path, id));
      toast.success('تم حذف الموظف بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء الحذف');
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleDeleteAll = async () => {
    if (currentUser?.role !== 'admin') return;
    if (!window.confirm('تحذير: سيتم مسح كافة البيانات في النظام. هل أنت متأكد؟')) return;
    
    const path = 'employees';
    try {
      const batch = writeBatch(db);
      employees.forEach(emp => {
        if (emp.id) batch.delete(doc(db, path, emp.id));
      });
      await batch.commit();
      toast.success('تم مسح كافة البيانات بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء مسح البيانات');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const toastId = toast.loading('جاري استيراد البيانات...');
    try {
      const importedData = await importFromExcel(file);
      const batch = writeBatch(db);
      const path = 'employees';
      
      importedData.forEach(emp => {
        const newDocRef = doc(collection(db, path));
        batch.set(newDocRef, {
          ...emp,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: currentUser.username
        });
      });

      await batch.commit();
      toast.success('تم استيراد البيانات بنجاح', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('حدث خطأ أثناء استيراد البيانات', { id: toastId });
    }
  };

  const handleImageUpload = async (key: keyof Employee['images'], file: File) => {
    try {
      const base64 = await fileToBase64(file);
      setFormData(prev => ({
        ...prev,
        images: { ...prev.images, [key]: base64 }
      }));
    } catch (error) {
      alert('خطأ في رفع الصورة');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEmployee(null);
    setFormErrors([]);
    setShowConfirmSave(false);
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.fullName.includes(searchTerm) || emp.employeeId.includes(searchTerm);
    const matchesStation = filterStation === 'all' || emp.station === filterStation;
    const matchesCert = filterCert === 'all' || emp.certificate === filterCert;
    const matchesProvince = filterProvince === 'all' || emp.residenceProvince === filterProvince;
    return matchesSearch && matchesStation && matchesCert && matchesProvince;
  });

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white font-sans">جاري التحميل...</div>;
  if (!currentUser) return <Login onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans text-right" dir="rtl">
      <Toaster position="top-center" richColors />
      {/* Navbar */}
      <nav className="bg-[#1e293b] text-white shadow-2xl sticky top-0 z-40 border-b border-blue-500/30">
        <div className="max-w-7xl mx-auto px-4 h-24 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-3.5 rounded-2xl shadow-lg shadow-blue-500/30">
              <Radio className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-tight tracking-tight">الشركة العامة لخدمات الملاحة الجوية</h1>
              <p className="text-sm text-blue-400 font-bold">قسم الاتصالات - شعبة الرادار</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end border-r border-white/10 pr-6">
              <span className="text-base font-black">{currentUser.username}</span>
              <span className="text-[11px] bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full font-bold mt-1">
                {currentUser.role === 'admin' ? 'المدير العام (Admin)' : 'مدير محطة'}
              </span>
            </div>
            <button onClick={handleLogout} className="p-3 hover:bg-red-500/10 rounded-2xl transition-all text-red-400 group">
              <LogOut className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-800 flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
              لوحة التحكم الرئيسية
            </h2>
            <p className="text-slate-500 font-bold mt-2">إدارة سجلات الموظفين والأرشفة الإلكترونية</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={() => { setFormData({ ...formData, station: currentUser.role === 'manager' ? currentUser.stationName : '' }); setIsModalOpen(true); }}
              className="flex-1 md:flex-none bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
            >
              <Plus className="w-6 h-6" />
              إضافة موظف جديد
            </button>
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1 space-y-2">
              <label className="text-xs font-black text-slate-400 mr-2">البحث السريع</label>
              <div className="relative">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="الاسم أو الرقم الوظيفي..."
                  className="w-full pr-12 pl-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-700"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 mr-2">المحطة</label>
              <select 
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black outline-none appearance-none cursor-pointer"
                value={filterStation}
                onChange={e => setFilterStation(e.target.value)}
              >
                <option value="all">كل المحطات</option>
                {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 mr-2">الشهادة</label>
              <select 
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black outline-none appearance-none cursor-pointer"
                value={filterCert}
                onChange={e => setFilterCert(e.target.value)}
              >
                <option value="all">كل الشهادات</option>
                {CERTIFICATES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 mr-2">المحافظة</label>
              <select 
                className="w-full bg-slate-50 border-none rounded-2xl px-4 py-4 text-sm font-black outline-none appearance-none cursor-pointer"
                value={filterProvince}
                onChange={e => setFilterProvince(e.target.value)}
              >
                <option value="all">كل المحافظات</option>
                {IRAQ_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button 
            onClick={() => exportToExcel(filteredEmployees, 'Radar_Employees_Report')}
            className="bg-white border border-slate-200 px-6 py-3.5 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-all shadow-sm"
          >
            <Download className="w-5 h-5 text-green-600" /> تصدير تقرير Excel
          </button>
          <button 
            onClick={() => exportToPDF(filteredEmployees, 'Radar_Employees_Report')}
            className="bg-white border border-slate-200 px-6 py-3.5 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-all shadow-sm"
          >
            <Printer className="w-5 h-5 text-red-600" /> تصدير تقرير PDF
          </button>

          <label className="bg-white border border-slate-200 px-6 py-3.5 rounded-2xl text-sm font-black text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-all shadow-sm cursor-pointer">
            <Plus className="w-5 h-5 text-amber-600" /> استيراد من Excel
            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
          </label>

          {currentUser.role === 'admin' && (
            <button 
              onClick={handleDeleteAll}
              className="bg-red-50 text-red-600 px-6 py-3.5 rounded-2xl text-sm font-black hover:bg-red-100 flex items-center gap-3 transition-all mr-auto shadow-sm"
            >
              <Trash2 className="w-5 h-5" /> مسح كافة السجلات
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">الموظف</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">الرقم الوظيفي</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">المحطة</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">الشهادة</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest">رقم الهاتف</th>
                  <th className="px-8 py-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-blue-50/30 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
                          {emp.fullName[0]}
                        </div>
                        <div>
                          <span className="block font-black text-slate-800 text-base">{emp.fullName}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{emp.residenceProvince}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-black text-slate-600">{emp.employeeId}</td>
                    <td className="px-8 py-6">
                      <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-xl text-[11px] font-black">
                        {emp.station}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-slate-600">{emp.certificate}</td>
                    <td className="px-8 py-6 text-sm font-black text-slate-500 font-mono">{emp.phone}</td>
                    <td className="px-8 py-6">
                      <div className="flex justify-center gap-3">
                        <button onClick={() => setViewingEmployee(emp)} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100">
                          <FileText className="w-5 h-5" />
                        </button>
                        <button onClick={() => { setEditingEmployee(emp); setFormData(emp); setIsModalOpen(true); }} className="p-3 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100">
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button onClick={() => emp.id && handleDelete(emp.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredEmployees.length === 0 && (
            <div className="p-32 text-center">
              <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="text-slate-200 w-12 h-12" />
              </div>
              <p className="text-slate-400 font-black text-lg">لا توجد سجلات مطابقة للبحث حالياً</p>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-12 text-center border-t border-slate-200 mt-20">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">نظام إدارة بيانات الرادار المؤسسي v2.5</p>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-600 font-black">المطور: المهندس محمد رضا هادي</p>
          </div>
        </div>
      </footer>

      {/* Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="fixed inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 30 }} className="relative bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-lg shadow-blue-600/20">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{editingEmployee ? 'تحديث بيانات الموظف' : 'إضافة سجل موظف جديد'}</h2>
                    <p className="text-xs text-slate-400 font-bold mt-1">يرجى ملء كافة الحقول المطلوبة بدقة</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-3 hover:bg-slate-100 rounded-full transition-all"><X className="w-7 h-7 text-slate-300" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-10 overflow-y-auto space-y-12">
                {/* Section 1: Basic */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-3 border-r-8 border-blue-600 pr-6 mb-4">
                    <h3 className="text-xl font-black text-slate-900">المعلومات الوظيفية والأساسية</h3>
                  </div>
                  <div className="space-y-3">
                    <label className={`text-sm font-black ${formErrors.includes('fullName') ? 'text-red-500' : 'text-slate-700'} mr-2`}>الاسم الثلاثي الكامل *</label>
                    <input required type="text" className={`w-full px-5 py-4 bg-slate-50 border-2 ${formErrors.includes('fullName') ? 'border-red-500' : 'border-transparent'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold`} value={formData.fullName} onChange={e => { setFormData({...formData, fullName: e.target.value}); setFormErrors(prev => prev.filter(f => f !== 'fullName')); }} />
                  </div>
                  <div className="space-y-3">
                    <label className={`text-sm font-black ${formErrors.includes('motherName') ? 'text-red-500' : 'text-slate-700'} mr-2`}>اسم الأم *</label>
                    <input required type="text" className={`w-full px-5 py-4 bg-slate-50 border-2 ${formErrors.includes('motherName') ? 'border-red-500' : 'border-transparent'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold`} value={formData.motherName} onChange={e => { setFormData({...formData, motherName: e.target.value}); setFormErrors(prev => prev.filter(f => f !== 'motherName')); }} />
                  </div>
                  <div className="space-y-3">
                    <label className={`text-sm font-black ${formErrors.includes('employeeId') ? 'text-red-500' : 'text-slate-700'} mr-2`}>الرقم الوظيفي *</label>
                    <input required type="text" className={`w-full px-5 py-4 bg-slate-50 border-2 ${formErrors.includes('employeeId') ? 'border-red-500' : 'border-transparent'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold`} value={formData.employeeId} onChange={e => { setFormData({...formData, employeeId: e.target.value}); setFormErrors(prev => prev.filter(f => f !== 'employeeId')); }} />
                  </div>
                  <div className="space-y-3">
                    <label className={`text-sm font-black ${formErrors.includes('phone') ? 'text-red-500' : 'text-slate-700'} mr-2`}>رقم الهاتف (07XXXXXXXXX) *</label>
                    <input required type="tel" className={`w-full px-5 py-4 bg-slate-50 border-2 ${formErrors.includes('phone') ? 'border-red-500' : 'border-transparent'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold font-mono`} value={formData.phone} onChange={e => { setFormData({...formData, phone: e.target.value}); setFormErrors(prev => prev.filter(f => f !== 'phone')); }} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 mr-2">تاريخ التعيين</label>
                    <input type="date" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={formData.appointmentDate} onChange={e => setFormData({...formData, appointmentDate: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 mr-2">الشهادة العلمية</label>
                    <select className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black" value={formData.certificate} onChange={e => setFormData({...formData, certificate: e.target.value})}>
                      {CERTIFICATES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className={`text-sm font-black ${formErrors.includes('specialization') ? 'text-red-500' : 'text-slate-700'} mr-2`}>الاختصاص *</label>
                    <input required type="text" className={`w-full px-5 py-4 bg-slate-50 border-2 ${formErrors.includes('specialization') ? 'border-red-500' : 'border-transparent'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold`} value={formData.specialization} onChange={e => { setFormData({...formData, specialization: e.target.value}); setFormErrors(prev => prev.filter(f => f !== 'specialization')); }} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 mr-2">الشعبة/القسم</label>
                    <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} />
                  </div>
                  <div className="space-y-3">
                    <label className={`text-sm font-black ${formErrors.includes('jobTitle') ? 'text-red-500' : 'text-slate-700'} mr-2`}>العنوان الوظيفي *</label>
                    <input required type="text" className={`w-full px-5 py-4 bg-slate-50 border-2 ${formErrors.includes('jobTitle') ? 'border-red-500' : 'border-transparent'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold`} value={formData.jobTitle} onChange={e => { setFormData({...formData, jobTitle: e.target.value}); setFormErrors(prev => prev.filter(f => f !== 'jobTitle')); }} />
                  </div>
                  <div className="space-y-3">
                    <label className={`text-sm font-black ${formErrors.includes('station') ? 'text-red-500' : 'text-slate-700'} mr-2`}>المحطة *</label>
                    <select disabled={currentUser.role === 'manager'} className={`w-full px-5 py-4 bg-slate-50 border-2 ${formErrors.includes('station') ? 'border-red-500' : 'border-transparent'} rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black`} value={formData.station} onChange={e => { setFormData({...formData, station: e.target.value}); setFormErrors(prev => prev.filter(f => f !== 'station')); }}>
                      <option value="">اختر المحطة</option>
                      {STATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Section 2: Residence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2 border-r-8 border-green-600 pr-6 mb-4">
                    <h3 className="text-xl font-black text-slate-900">محل السكن الحالي</h3>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 mr-2">المحافظة</label>
                    <select className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black" value={formData.residenceProvince} onChange={e => setFormData({...formData, residenceProvince: e.target.value})}>
                      {IRAQ_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 mr-2">القضاء / الناحية</label>
                    <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={formData.residenceDistrict} onChange={e => setFormData({...formData, residenceDistrict: e.target.value})} />
                  </div>
                </div>

                {/* Section 3: Social */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-3 border-r-8 border-pink-600 pr-6 mb-4">
                    <h3 className="text-xl font-black text-slate-900">الحالة الاجتماعية والعائلية</h3>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black text-slate-700 mr-2">الحالة الاجتماعية</label>
                    <select className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-black" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value as any})}>
                      <option value="single">أعزب</option>
                      <option value="married">متزوج</option>
                      <option value="divorced">مطلق</option>
                      <option value="widowed">أرمل</option>
                    </select>
                  </div>
                  {formData.maritalStatus === 'married' && (
                    <>
                      <div className="space-y-3">
                        <label className="text-sm font-black text-slate-700 mr-2">اسم الزوج/الزوجة</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={formData.spouseName} onChange={e => setFormData({...formData, spouseName: e.target.value})} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-black text-slate-700 mr-2">رقم البطاقة الوطنية للزوج/ة</label>
                        <input type="text" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold font-mono" value={formData.spouseNationalId} onChange={e => setFormData({...formData, spouseNationalId: e.target.value})} />
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-black text-slate-700 mr-2">عدد الأطفال</label>
                        <input type="number" className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={formData.childrenCount} onChange={e => {
                          const count = parseInt(e.target.value) || 0;
                          const details = [...(formData.childrenDetails || [])];
                          if (count > details.length) {
                            for (let i = details.length; i < count; i++) {
                              details.push({ name: '', nationalId: '', birthDate: '' });
                            }
                          } else {
                            details.length = count;
                          }
                          setFormData({...formData, childrenCount: count, childrenDetails: details});
                        }} />
                      </div>
                      {formData.childrenCount > 0 && (
                        <div className="md:col-span-3 space-y-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                          <h4 className="text-sm font-black text-slate-500">تفاصيل الأطفال</h4>
                          {formData.childrenDetails?.map((child, idx) => (
                            <div key={idx} className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-200 last:border-0">
                              <div className="space-y-2">
                                <label className={`text-xs font-bold ${formErrors.includes(`childName-${idx}`) ? 'text-red-500' : 'text-slate-500'}`}>اسم الطفل {idx + 1}</label>
                                <input type="text" className={`w-full px-4 py-3 bg-white border-2 ${formErrors.includes(`childName-${idx}`) ? 'border-red-500' : 'border-transparent'} rounded-xl font-bold text-sm`} value={child.name} onChange={e => {
                                  const details = [...(formData.childrenDetails || [])];
                                  details[idx].name = e.target.value;
                                  setFormData({...formData, childrenDetails: details});
                                  setFormErrors(prev => prev.filter(f => f !== `childName-${idx}`));
                                }} />
                              </div>
                              <div className="space-y-2">
                                <label className={`text-xs font-bold ${formErrors.includes(`childBirth-${idx}`) ? 'text-red-500' : 'text-slate-500'}`}>تاريخ الميلاد</label>
                                <input type="date" className={`w-full px-4 py-3 bg-white border-2 ${formErrors.includes(`childBirth-${idx}`) ? 'border-red-500' : 'border-transparent'} rounded-xl font-bold text-sm`} value={child.birthDate} onChange={e => {
                                  const details = [...(formData.childrenDetails || [])];
                                  details[idx].birthDate = e.target.value;
                                  setFormData({...formData, childrenDetails: details});
                                  setFormErrors(prev => prev.filter(f => f !== `childBirth-${idx}`));
                                }} />
                              </div>
                              <div className="space-y-2">
                                <label className={`text-xs font-bold ${formErrors.includes(`childId-${idx}`) ? 'text-red-500' : 'text-slate-500'}`}>رقم البطاقة الوطنية</label>
                                <input type="text" className={`w-full px-4 py-3 bg-white border-2 ${formErrors.includes(`childId-${idx}`) ? 'border-red-500' : 'border-transparent'} rounded-xl font-bold text-sm font-mono`} value={child.nationalId} onChange={e => {
                                  const details = [...(formData.childrenDetails || [])];
                                  details[idx].nationalId = e.target.value;
                                  setFormData({...formData, childrenDetails: details});
                                  setFormErrors(prev => prev.filter(f => f !== `childId-${idx}`));
                                }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Section 4: Documents Upload */}
                <div className="space-y-8">
                  <div className="border-r-8 border-amber-600 pr-6 mb-4">
                    <h3 className="text-xl font-black text-slate-900">الأرشفة الإلكترونية للمستمسكات</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { label: 'البطاقة الوطنية (وجه)', key: 'nationalIdFront' },
                      { label: 'البطاقة الوطنية (ظهر)', key: 'nationalIdBack' },
                      { label: 'البطاقة التموينية (وجه)', key: 'rationCardFront' },
                      { label: 'البطاقة التموينية (ظهر)', key: 'rationCardBack' },
                      { label: 'بطاقة السكن (وجه)', key: 'residenceCardFront' },
                      { label: 'بطاقة السكن (ظهر)', key: 'residenceCardBack' },
                    ].map(item => (
                      <div key={item.key} className="space-y-3">
                        <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">{item.label}</label>
                        <div className="relative group">
                          <div className="w-full h-44 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50/30">
                            {formData.images?.[item.key as keyof Employee['images']] ? (
                              <img src={formData.images[item.key as keyof Employee['images']] as string} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-10 h-10 text-slate-200" />
                            )}
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && handleImageUpload(item.key as any, e.target.files[0])} />
                          </div>
                        </div>
                      </div>
                    ))}
                    {formData.maritalStatus !== 'single' && (
                      <>
                        <div className="space-y-3">
                          <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">البطاقة الوطنية للزوج/ة (وجه)</label>
                          <div className="relative group">
                            <div className="w-full h-44 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50/30">
                              {formData.images?.spouseIdFront ? (
                                <img src={formData.images.spouseIdFront} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-10 h-10 text-slate-200" />
                              )}
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && handleImageUpload('spouseIdFront', e.target.files[0])} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">البطاقة الوطنية للزوج/ة (ظهر)</label>
                          <div className="relative group">
                            <div className="w-full h-44 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50/30">
                              {formData.images?.spouseIdBack ? (
                                <img src={formData.images.spouseIdBack} className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon className="w-10 h-10 text-slate-200" />
                              )}
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && handleImageUpload('spouseIdBack', e.target.files[0])} />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    {formData.childrenCount > 0 && Array.from({ length: formData.childrenCount }).map((_, idx) => (
                      <div key={`child-id-${idx}`} className="space-y-3">
                        <label className="text-xs font-black text-slate-400 mr-2 uppercase tracking-widest">البطاقة الوطنية للطفل {idx + 1}</label>
                        <div className="relative group">
                          <div className="w-full h-44 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-blue-400 group-hover:bg-blue-50/30">
                            {formData.images?.childrenIds?.[idx] ? (
                              <img src={formData.images.childrenIds[idx]} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-10 h-10 text-slate-200" />
                            )}
                            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                fileToBase64(file).then(base64 => {
                                  const childrenIds = [...(formData.images?.childrenIds || [])];
                                  childrenIds[idx] = base64;
                                  setFormData({
                                    ...formData,
                                    images: { ...formData.images, childrenIds }
                                  });
                                });
                              }
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="sticky bottom-0 bg-white pt-8 border-t border-slate-100 flex gap-4">
                  {!showConfirmSave ? (
                    <button type="submit" className="flex-1 bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-4">
                      <Save className="w-7 h-7" /> حفظ بيانات الموظف في السجلات
                    </button>
                  ) : (
                    <div className="flex-1 flex gap-4 animate-in fade-in slide-in-from-bottom-4">
                      <button type="button" onClick={() => handleSubmit()} className="flex-1 bg-green-600 text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl shadow-green-600/30 hover:bg-green-700 transition-all flex items-center justify-center gap-4">
                        <ShieldCheck className="w-7 h-7" /> تأكيد الحفظ النهائي
                      </button>
                      <button type="button" onClick={() => setShowConfirmSave(false)} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black hover:bg-slate-200 transition-all">تراجع</button>
                    </div>
                  )}
                  {!showConfirmSave && (
                    <button type="button" onClick={closeModal} className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[2rem] font-black hover:bg-slate-200 transition-all">إلغاء</button>
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Record Modal */}
      <AnimatePresence>
        {viewingEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingEmployee(null)} className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-6xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
              <div className="p-12 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-800 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-blue-500/30">{viewingEmployee.fullName[0]}</div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900">{viewingEmployee.fullName}</h2>
                    <p className="text-base text-blue-600 font-black mt-1">الرقم الوظيفي: {viewingEmployee.employeeId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => window.print()} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all flex items-center gap-2 text-slate-600 font-black">
                    <Printer className="w-6 h-6" /> طباعة
                  </button>
                  <button onClick={() => setViewingEmployee(null)} className="p-4 hover:bg-slate-100 rounded-full transition-all"><X className="w-8 h-8 text-slate-300" /></button>
                </div>
              </div>

              <div className="p-12 overflow-y-auto space-y-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="space-y-8">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-[0.4em]">المعلومات الوظيفية</h4>
                    <div className="space-y-5">
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">المحطة:</span><span className="font-black text-slate-800">{viewingEmployee.station}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">الشعبة/القسم:</span><span className="font-black text-slate-800">{viewingEmployee.section}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">الاختصاص:</span><span className="font-black text-slate-800">{viewingEmployee.specialization}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">العنوان الوظيفي:</span><span className="font-black text-slate-800">{viewingEmployee.jobTitle}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">الشهادة:</span><span className="font-black text-slate-800">{viewingEmployee.certificate}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">تاريخ التعيين:</span><span className="font-black text-slate-800">{viewingEmployee.appointmentDate}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">الهاتف:</span><span className="font-black text-slate-800 font-mono">{viewingEmployee.phone}</span></div>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-[0.4em]">السكن والحالة</h4>
                    <div className="space-y-5">
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">اسم الأم:</span><span className="font-black text-slate-800">{viewingEmployee.motherName}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">المحافظة:</span><span className="font-black text-slate-800">{viewingEmployee.residenceProvince}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">القضاء:</span><span className="font-black text-slate-800">{viewingEmployee.residenceDistrict}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">الحالة:</span><span className="font-black text-slate-800">{viewingEmployee.maritalStatus}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">الأطفال:</span><span className="font-black text-slate-800">{viewingEmployee.childrenCount}</span></div>
                    </div>
                  </div>
                  <div className="space-y-8">
                    <h4 className="text-xs font-black text-slate-300 uppercase tracking-[0.4em]">بيانات العائلة</h4>
                    <div className="space-y-5">
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">اسم الزوج/ة:</span><span className="font-black text-slate-800">{viewingEmployee.spouseName || '-'}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-3"><span className="text-slate-400 text-sm font-bold">هوية الزوج/ة:</span><span className="font-black text-slate-800 font-mono">{viewingEmployee.spouseNationalId || '-'}</span></div>
                      {viewingEmployee.childrenDetails?.map((child, idx) => (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl space-y-2">
                          <p className="text-xs font-black text-blue-600">الطفل {idx + 1}: {child.name}</p>
                          <div className="flex justify-between text-[11px] font-bold text-slate-500">
                            <span>المواليد: {child.birthDate}</span>
                            <span>الهوية: {child.nationalId}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-10">
                  <h4 className="text-xs font-black text-slate-300 uppercase tracking-[0.4em]">الأرشيف الإلكتروني (المستمسكات)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {[
                      { label: 'البطاقة الوطنية (وجه)', key: 'nationalIdFront' },
                      { label: 'البطاقة الوطنية (ظهر)', key: 'nationalIdBack' },
                      { label: 'البطاقة التموينية (وجه)', key: 'rationCardFront' },
                      { label: 'البطاقة التموينية (ظهر)', key: 'rationCardBack' },
                      { label: 'بطاقة السكن (وجه)', key: 'residenceCardFront' },
                      { label: 'بطاقة السكن (ظهر)', key: 'residenceCardBack' },
                      { label: 'هوية الزوج/ة (وجه)', key: 'spouseIdFront' },
                      { label: 'هوية الزوج/ة (ظهر)', key: 'spouseIdBack' },
                    ].map(item => (
                      <div key={item.key} className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-widest">{item.label}</p>
                        <div className="aspect-[4/3] rounded-[2rem] overflow-hidden border border-slate-100 shadow-lg shadow-slate-200/50">
                          {viewingEmployee.images?.[item.key as keyof Employee['images']] ? (
                            <img src={viewingEmployee.images[item.key as keyof Employee['images']] as string} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-slate-200" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {viewingEmployee.images?.childrenIds?.map((img, idx) => (
                      <div key={`view-child-${idx}`} className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-widest">هوية الطفل {idx + 1}</p>
                        <div className="aspect-[4/3] rounded-[2rem] overflow-hidden border border-slate-100 shadow-lg shadow-slate-200/50">
                          <img src={img} className="w-full h-full object-cover" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
