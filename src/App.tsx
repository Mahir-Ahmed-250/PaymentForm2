import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Swal from 'sweetalert2';
import { 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  ArrowLeft, 
  Save, 
  RefreshCw, 
  User, 
  BookOpen, 
  Calendar, 
  Hash, 
  MapPin,
  ChevronRight,
  Filter,
  LogOut,
  Edit3,
  FileText,
  LayoutDashboard,
  PieChart as PieChartIcon,
  TrendingUp,
  Users,
  ClipboardList,
  Download,
  MoreVertical,
  Bell,
  CreditCard,
  X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyCxmewKSdvwdJMd3t_6au1G2oFwRJmiB88eADaO5dE4dIlRc3lUuWI2TmDpD83D2p/exec';

const SUBJECTS = [
  "বাংলা",
  "ইংরেজি",
  "গণিত",
  "বিজ্ঞান",
  "বাংলাদেশ ও বিশ্ব-পরিচিতি"
];

function App() {
  
  const [pin, setPin] = useState('');
  const [availableBranches, setAvailableBranches] = useState([]);
  const [activeBranch, setActiveBranch] = useState(null);
  const [currentView, setCurrentView] = useState('form'); // 'form', 'history', 'dashboard', 'reports'
  const [historyData, setHistoryData] = useState([]);
  const [subjectFilter, setSubjectFilter] = useState('All'); 
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  
  const [formData, setFormData] = useState({ 
    teacherTPIN: '', 
    subject: '', 
    bvCount: '', 
    evCount: '',
    singleCount: '',
    entryDate: new Date().toISOString().split('T')[0],
    isUpdate: false,
    rowId: null
  });

  // For tracking changes during update
  const [originalFormData, setOriginalFormData] = useState(null);
  const [originalMarksRows, setOriginalMarksRows] = useState(null);

  const [teacherName, setTeacherName] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(0);
  const [marksRows, setMarksRows] = useState([]);

  const isLanguageSubject = formData.subject === 'বাংলা' || formData.subject === 'ইংরেজি';

  useEffect(() => {
    if (formData.isUpdate) return; 

    const count = isLanguageSubject 
      ? parseInt(formData.singleCount || 0) 
      : (parseInt(formData.bvCount || 0) + parseInt(formData.evCount || 0));
    
    if (count > 0 && count <= 100) { 
      const newRows = Array.from({ length: count }, () => ({ roll: '', marks: '', status: 'Pending' }));
      setMarksRows(newRows);
    } else {
      setMarksRows([]);
    }
  }, [formData.bvCount, formData.evCount, formData.singleCount, formData.subject, isLanguageSubject, formData.isUpdate]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBranchVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "verifyBranch", pin: pin.trim() })
      });
      const data = await res.json();
      if (data.status === "success") {
        setAvailableBranches(data.branches);
        if (data.branches.length === 1) setActiveBranch(data.branches[0]);
        setPin('');
      } else {
        Swal.fire({ icon: 'error', title: 'ভুল পিন!', text: data.message, customClass: { popup: 'rounded-3xl' } });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ত্রুটি!', text: 'সার্ভারের সাথে সংযোগ করা যাচ্ছে না।', customClass: { popup: 'rounded-3xl' } });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherName = useCallback(async (tpinValue) => {
    if (!activeBranch) return;
    setVerifying(true);
    setTeacherName('খোঁজা হচ্ছে...');
    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "verifyTeacher", tpin: tpinValue, branchId: activeBranch.id })
      });
      const data = await res.json();
      setTeacherName(data.status === "success" ? data.teacherName : 'সঠিক Tpin প্রদান করুন!');
    } catch (err) {
      setTeacherName('নেটওয়ার্ক ত্রুটি!');
    } finally {
      setVerifying(false);
    }
  }, [activeBranch]);

  const handleTPINChange = (e) => {
    const value = e.target.value;
    if (value.length <= 6) {
      setFormData({ ...formData, teacherTPIN: value });
      setTeacherName(''); 
      if (typingTimeout) clearTimeout(typingTimeout);
      if (value.length > 0) {
        setTypingTimeout(setTimeout(() => fetchTeacherName(value), 1000));
      }
    }
  };

  const fetchHistory = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "getHistory", branchId: activeBranch.id })
      });
      const data = await res.json();
      if (data.status === "success") {
        setHistoryData(data.records);
        if (!silent) setCurrentView('history');
      }
    } catch (err) {
      if (!silent) Swal.fire({ icon: 'error', title: 'ত্রুটি!', text: 'ডাটা পাওয়া যায়নি।', customClass: { popup: 'rounded-3xl' } });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (activeBranch) {
      fetchHistory(true);
    }
  }, [activeBranch]);

  const dashboardStats = useMemo(() => {
    const totalScripts = historyData.reduce((acc, curr) => acc + (Number(curr.bvCount) + Number(curr.evCount)), 0);
    const totalExaminers = new Set(historyData.map(h => h.tpin)).size;
    
    const pendingPayments = historyData.filter(h => {
      const status = (h.paymentStatus || h.payment || h.payStatus || 'Pending').toString().trim();
      return status === 'Pending';
    }).length;
    const updatedPayments = historyData.filter(h => {
      const status = (h.paymentStatus || h.payment || h.payStatus || '').toString().trim();
      return status === 'Updated';
    }).length;
    
    let markPending = 0;
    let markWrong = 0;
    let markUpdated = 0;
    const wrongRecords = [];

    historyData.forEach(record => {
      const apiEvalStatus = record.evaluationStatus || record.status || record.markStatus;
      
      let hasWrongMark = false;
      if (apiEvalStatus) {
        const s = apiEvalStatus.toString().trim();
        if (s === 'Pending') markPending++;
        else if (s === 'Wrong') {
          markWrong++;
          hasWrongMark = true;
        }
        else if (s === 'Updated') markUpdated++;
      } else {
        record.allMarks?.forEach(mark => {
          if (mark.status === 'Pending') markPending++;
          else if (mark.status === 'Wrong') {
            markWrong++;
            hasWrongMark = true;
          }
          else if (mark.status === 'Updated') markUpdated++;
        });
      }
      
      if (hasWrongMark || (apiEvalStatus && apiEvalStatus.toString().trim() === 'Wrong')) {
        wrongRecords.push(record);
      }
    });
    
    const subjectData = SUBJECTS.map(sub => ({
      name: sub,
      count: historyData.filter(h => h.subject === sub).reduce((acc, curr) => acc + (Number(curr.bvCount) + Number(curr.evCount)), 0)
    }));

    return { 
      totalScripts, 
      totalExaminers, 
      pendingPayments, 
      updatedPayments, 
      markPending, 
      markWrong, 
      markUpdated, 
      wrongRecords,
      subjectData 
    };
  }, [historyData]);

  const handleEditWrongEntry = (record) => {
    const newFormData = {
      ...formData,
      teacherTPIN: record.tpin,
      subject: record.subject,
      bvCount: record.bvCount,
      evCount: record.evCount,
      singleCount: Number(record.bvCount) + Number(record.evCount),
      isUpdate: true,
      rowId: record.rowId
    };
    const newMarksRows = record.allMarks.map(m => ({ roll: m.reg, marks: m.marks, status: m.status }));
    
    setFormData(newFormData);
    setOriginalFormData(JSON.parse(JSON.stringify(newFormData))); // Deep copy
    setMarksRows(newMarksRows);
    setOriginalMarksRows(JSON.parse(JSON.stringify(newMarksRows))); // Deep copy
    
    setTeacherName(record.teacherName);
    setCurrentView('form');
    setShowNotifications(false);
    Swal.fire({ title: 'এডিট মোড', text: 'আপনি এখন তথ্য সংশোধন করছেন।', icon: 'info', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-3xl' } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!teacherName || teacherName.includes('সঠিক')) {
      Swal.fire({ icon: 'warning', title: 'সতর্কতা!', text: 'সঠিক TPIN নিশ্চিত করুন।', customClass: { popup: 'rounded-3xl' } });
      return;
    }

    // Check if any changes were made in update mode
    if (formData.isUpdate) {
      const hasChanged = JSON.stringify(formData) !== JSON.stringify(originalFormData) || 
                         JSON.stringify(marksRows) !== JSON.stringify(originalMarksRows);
      if (!hasChanged) {
        Swal.fire({ 
          icon: 'info', 
          title: 'কোন পরিবর্তন নেই!', 
          text: 'তথ্য আপডেট করতে অন্তত একটি ফিল্ড পরিবর্তন করুন।', 
          customClass: { popup: 'rounded-3xl' } 
        });
        return;
      }
    }

    for (let i = 0; i < marksRows.length; i++) {
      const roll = marksRows[i].roll.toString().trim();
      const markStr = marksRows[i].marks.toString().trim();
      const markNum = Number(markStr);

      const isValidRoll = roll === 'N/A' || roll.length === 7 || roll.length === 11;
      if (!isValidRoll) {
        Swal.fire({ 
          icon: 'error', 
          title: 'ভুল রোল নম্বর!', 
          text: `সিরিয়াল ${i + 1}-এর রোল নম্বরটি ৭ অথবা ১১ ডিজিটের হতে হবে (অথবা N/A)।`,
          customClass: { popup: 'rounded-3xl' }
        });
        return;
      }

      if (markStr === "" || isNaN(markNum) || markNum < 0 || markNum > 100) {
        Swal.fire({ 
          icon: 'error', 
          title: 'ভুল মার্কস!', 
          text: `সিরিয়াল ${i + 1}-এর মার্কস ০ থেকে ১০০-এর মধ্যে হতে হবে।`,
          customClass: { popup: 'rounded-3xl' }
        });
        return;
      }
    }

    let finalMarksRows = [...marksRows];
    if (formData.isUpdate) {
      finalMarksRows = marksRows.map(row => ({
        ...row,
        status: row.status === 'Wrong' ? 'Pending' : row.status
      }));
    }

    setLoading(true);
    Swal.fire({ 
      title: 'প্রসেস হচ্ছে...', 
      allowOutsideClick: false, 
      didOpen: () => Swal.showLoading(),
      customClass: { popup: 'rounded-3xl' }
    });

    try {
      const payload = {
        action: "saveData",
        data: {
          ...formData,
          bvCount: isLanguageSubject ? Number(formData.singleCount || 0) : Number(formData.bvCount || 0),
          evCount: isLanguageSubject ? 0 : Number(formData.evCount || 0),
          teacherName,
          branchId: activeBranch.id,
          branchName: activeBranch.name,
          allMarks: finalMarksRows
        }
      };
      
      const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await res.json();
      
      if (result.status === "success") {
        Swal.fire({ icon: 'success', title: 'সফল!', text: 'তথ্য সংরক্ষিত হয়েছে।', timer: 2000, showConfirmButton: false, customClass: { popup: 'rounded-3xl' } })
          .then(() => {
            setFormData({ 
              teacherTPIN: '', 
              subject: '', 
              bvCount: '', 
              evCount: '',
              singleCount: '',
              entryDate: new Date().toISOString().split('T')[0],
              isUpdate: false,
              rowId: null
            });
            setTeacherName('');
            setMarksRows([{ roll: '', marks: '', status: 'Pending' }]);
            setOriginalFormData(null);
            setOriginalMarksRows(null);
            fetchHistory(true);
            setCurrentView('dashboard');
          });
      }
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'ব্যর্থ!', text: 'ডাটা সেভ হয়নি।', customClass: { popup: 'rounded-3xl' } });
    } finally {
      setLoading(false);
    }
  };

  const getEvaluationStatusBadge = (item) => {
    const apiStatus = item.evaluationStatus || item.status || item.markStatus;
    if (apiStatus) {
      const s = apiStatus.toString().trim();
      if (s === 'Wrong') return <span className="badge-danger">Wrong</span>;
      if (s === 'Pending') return <span className="badge-danger">Pending</span>;
      if (s === 'Updated') return <span className="badge-paid">Updated</span>;
    }

    const marks = item.allMarks;
    if (!marks || marks.length === 0) return <span className="badge-pending">No Data</span>;
    if (marks.some(m => m.status === 'Wrong')) return <span className="badge-danger">Wrong</span>;
    if (marks.some(m => m.status === 'Pending')) return <span className="badge-warning">Pending</span>;
    return <span className="badge-paid">Updated</span>;
  };

  const getPaymentStatusBadge = (item) => {
    const status = (item.paymentStatus || item.payment || item.payStatus || 'Pending').toString().trim();
    return (
      <div className={status === 'Updated' ? 'badge-paid' : 'badge-pending'}>
        {status}
      </div>
    );
  };

  const renderDashboard = () => {
    // Sort recent activities by teacher name as requested
    const sortedRecent = [...historyData]
      .sort((a, b) => a.teacherName.localeCompare(b.teacherName))
      .slice(0, 5);

    return (
      <div className="space-y-6">
        {/* Wrong Entry Notification */}
        <AnimatePresence>
          {dashboardStats.wrongRecords.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-danger/10 border border-danger/20 p-4 rounded-2xl flex items-start gap-4"
            >
              <div className="w-10 h-10 bg-danger/20 rounded-xl flex items-center justify-center text-danger shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-danger">Wrong Entries Detected!</h4>
                <p className="text-sm text-danger/80">There are {dashboardStats.wrongRecords.length} records with incorrect marks. Please fix them to clear this notification.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {dashboardStats.wrongRecords.map((rec, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleEditWrongEntry(rec)}
                      className="text-xs bg-danger text-white px-3 py-1 rounded-lg hover:bg-danger/90 transition-colors"
                    >
                      Fix: {rec.teacherName} ({rec.subject})
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Stats - Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                <ClipboardList className="w-5 h-5" />
              </div>
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{dashboardStats.totalScripts}</div>
            <div className="text-sm text-muted">Total Scripts Evaluated</div>
          </div>
          
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center text-success">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-success bg-success/5 px-2 py-0.5 rounded-full">Active</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{dashboardStats.totalExaminers}</div>
            <div className="text-sm text-muted">Total Examiners</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center text-warning">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{dashboardStats.pendingPayments}</div>
            <div className="text-sm text-muted">Pending Payments</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{dashboardStats.updatedPayments}</div>
            <div className="text-sm text-muted">Updated Payments</div>
          </div>
        </div>

        {/* Status Breakdown Sections */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          <div className="card-pro p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-brand" /> Marks Entry Status
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-2xl bg-warning/5 border border-warning/10">
                
                <div className="text-2xl font-bold text-warning">{dashboardStats.markPending}</div>
                <div className="text-xs text-muted font-bold uppercase mt-1">Pending</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-danger/5 border border-danger/10">
                <div className="text-2xl font-bold text-danger">{dashboardStats.markWrong}</div>
                <div className="text-xs text-muted font-bold uppercase mt-1">Wrong</div>
              </div>
              <div className="text-center p-4 rounded-2xl bg-success/5 border border-success/10">
                <div className="text-2xl font-bold text-success">{dashboardStats.markUpdated}</div>
                <div className="text-xs text-muted font-bold uppercase mt-1">Updated</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-pro p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand" /> Subject Distribution
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardStats.subjectData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    cursor={{fill: '#f8fafc'}}
                  />
                  <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-pro p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-brand" /> Evaluation Entry Progress
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Updated', value: dashboardStats.markUpdated },
                      { name: 'Pending', value: dashboardStats.markPending },
                      { name: 'Wrong', value: dashboardStats.markWrong }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card-pro p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-brand" /> Recent Activity 
            </h3>
            <button onClick={() => setCurrentView('history')} className="text-brand text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
         

            {sortedRecent.map((item, i ) =>  (
              
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-brand font-bold">
                    {item.teacherName[0]}
                    
                  </div>
                  <div>
                    <div className="font-bold text-sm">{item.teacherName}</div>
                    <div className="text-xs text-muted">{item.subject} • {item.entryDate}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{Number(item.bvCount) + Number(item.evCount)} Scripts</div>
                  <div className="text-xs text-muted"><span>Evaluation Entry: </span></div>     
                  <div className="text-center mt-1">{getPaymentStatusBadge(item)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

 const renderReports = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Evaluation Reports</h2>
          <p className="text-muted text-sm">Detailed breakdown of all evaluations</p>
        </div>
        <button className="btn-outline-pro py-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="card-pro overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Examiner</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Scripts</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Marks Detail</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Mark Entry Status</th>
                <th className="px-6 py-4 font-bold text-slate-500 uppercase tracking-wider">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Added sorting logic here */}
              {[...historyData]
                .sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate))
                .map((item, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium">{item.entryDate}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{item.teacherName}</div>
                    <div className="text-xs text-muted">TPIN: {item.tpin}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-lg bg-brand/5 text-brand text-xs font-bold">{item.subject}</span>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">{Number(item.bvCount) + Number(item.evCount)}</td>
                  <td className="px-6 py-4">
                    <div className="max-w-[200px] flex flex-wrap gap-1">
                      {item.allMarks?.map((m, idx) => (          
                        <span key={idx} className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          m.status === 'Wrong' ? 'bg-danger/5 border-danger/20 text-danger' : 
                          m.status === 'Updated' ? 'bg-success/5 border-success/20 text-success' : 
                          /* Updated pending colour here to warning */
                          'bg-warning/5 border-warning/20 text-warning'
                        }`}>
                          Reg: {m.reg} Mark: {m.marks}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      {/* Counter Summary */}
                      {item.allMarks?.length > 0 && (
                        <div className="flex items-center gap-2">
                          {(() => {
                            const counts = {
                              wrong: item.allMarks.filter(m => m.status === 'Wrong').length,
                              updated: item.allMarks.filter(m => m.status === 'Updated').length,
                              pending: item.allMarks.filter(m => m.status !== 'Wrong' && m.status !== 'Updated').length
                            };

                            return (
                              <div className="gap-2">
                                {counts.wrong > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-danger">
                                    <span className="w-1.5 h-1.5 rounded-full bg-danger"></span>
                                    {counts.wrong} Wrong
                                  </span>
                                )}
                                {counts.updated > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-success">
                                    <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                                    {counts.updated} Updated
                                  </span>
                                )}
                                {counts.pending > 0 && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold text-warning">
                                    <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
                                    {counts.pending} Pending
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getPaymentStatusBadge(item)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12rounded-2xl shadow-lg shadow-brand/20">
            <img src="https://online.udvash-unmesh.com/Content/UmsTheme/assets/img/udvash-unmesh.png" alt="" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Exam Scripts Management</h1>
              <p className="text-muted text-xs">Exam Center Scripts Management System</p>
            </div>
          </div>

          {activeBranch && (
            <div className="flex items-center gap-3">
              <div className="relative" ref={notificationRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${dashboardStats.wrongRecords.length > 0 ? 'bg-danger/10 text-danger' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <Bell className="w-5 h-5" />
                  {dashboardStats.wrongRecords.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-danger text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-50">
                      {dashboardStats.wrongRecords.length}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h4 className="font-bold text-slate-900">Notifications</h4>
                        <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto custom-scrollbar">
                        {dashboardStats.wrongRecords.length > 0 ? (
                          <div className="divide-y divide-slate-100">
                            {dashboardStats.wrongRecords.map((rec, i) => (
                              <button
                                key={i}
                                onClick={() => handleEditWrongEntry(rec)}
                                className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex items-start gap-3 group"
                              >
                                <div className="w-8 h-8 bg-danger/10 rounded-lg flex items-center justify-center text-danger shrink-0">
                                  <AlertCircle className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="text-sm font-bold text-slate-900 group-hover:text-brand transition-colors">
                                    {rec.teacherName}
                                  </div>
                                  <div className="text-xs text-muted mt-0.5">
                                    Wrong marks in {rec.subject}
                                  </div>
                                  <div className="text-[10px] font-bold text-danger mt-1 uppercase tracking-wider">
                                    Click to correct
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                              <CheckCircle2 className="text-slate-300 w-6 h-6" />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">No new notifications</p>
                          </div>
                        )}
                      </div>
                      {dashboardStats.wrongRecords.length > 0 && (
                        <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                          <button 
                            onClick={() => { setCurrentView('dashboard'); setShowNotifications(false); }}
                            className="text-xs font-bold text-brand hover:underline"
                          >
                            View Dashboard Stats
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-bold text-slate-900">{activeBranch.coordinator}</span>
                <span className="text-[10px] text-muted font-bold uppercase tracking-wider">{activeBranch.name}</span>
              </div>

              <button onClick={() => window.location.reload()} className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center hover:bg-slate-200 transition-all">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}
        </header>

        {activeBranch && (
          <nav className="mb-8 flex items-center justify-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-fit mx-auto">
            <button 
              onClick={() => setCurrentView('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all relative ${currentView === 'dashboard' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
              {dashboardStats.wrongRecords.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full animate-pulse" />
              )}
            </button>
            <button 
              onClick={() => setCurrentView('form')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${currentView === 'form' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Edit3 className="w-4 h-4" /> Entry Form
            </button>
            <button 
              onClick={() => setCurrentView('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${currentView === 'history' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <History className="w-4 h-4" /> History
            </button>
            <button 
              onClick={() => setCurrentView('reports')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${currentView === 'reports' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <FileText className="w-4 h-4" /> Reports
            </button>
          </nav>
        )}

        <main className={currentView === 'dashboard' || currentView === 'reports' ? '' : 'card-pro'}>
          {/* Status Bar */}
          {activeBranch && currentView !== 'dashboard' && currentView !== 'reports' && (
            <div className={`px-6 py-3 flex items-center justify-between text-sm font-medium ${formData.isUpdate ? 'bg-warning/10 text-warning' : 'bg-brand/5 text-brand'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${formData.isUpdate ? 'bg-warning' : 'bg-brand'}`} />
                {formData.isUpdate ? "Update Mode Active" : "System Ready"}
              </div>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {activeBranch.name}</span>
                <button onClick={() => window.location.reload()} className="hover:underline flex items-center gap-1 text-slate-500"><LogOut className="w-3.5 h-3.5" /> Change</button>
              </div>
            </div>
          )}

          <div className={currentView === 'dashboard' || currentView === 'reports' ? '' : 'p-6 md:p-8'}>
            <AnimatePresence mode="wait">
              {/* Step 1: PIN Verification */}
              {availableBranches.length === 0 && (
                <motion.div 
                  key="pin"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-sm mx-auto py-8"
                >
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    👤
                    </div>
                    <h2 className="text-xl font-bold">Authentication Required</h2>
                    <p className="text-muted text-sm mt-1">Please enter your branch PIN to continue</p>
                  </div>
                  <form onSubmit={handleBranchVerify} className="space-y-4">
                    <input 
                      type="number" 
                      value={pin} 
                      onChange={(e) => setPin(e.target.value)} 
                      placeholder="Enter Your PIN" 
                      className="input-pro text-center text-xl  font-display" 
                      required 
                    />
                    <button type="submit" className="btn-primary-pro w-full py-3 text-lg" disabled={loading}>
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Confirm Identity"}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Step 2: Branch Selection */}
              {availableBranches.length > 0 && !activeBranch && (
                <motion.div 
                  key="branch"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="max-w-sm mx-auto py-8"
                >
                  <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="text-slate-500 w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold">Select Branch</h2>
                    <p className="text-muted text-sm mt-1">Choose your assigned branch location</p>
                  </div>
                  <div className="space-y-3">
                    {availableBranches.map((branch) => (
                      <button 
                        key={branch.id} 
                        onClick={() => setActiveBranch(branch)}
                        className="w-full p-4 rounded-xl border border-slate-200 hover:border-brand hover:bg-brand/5 flex items-center justify-between group transition-all"
                      >
                        <span className="font-semibold text-slate-700">{branch.name}</span>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand transition-colors" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 3: History View */}
              {activeBranch && currentView === 'history' && (
                <motion.div 
                  key="history"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold">Entry Records</h2>
                      <p className="text-muted text-sm">Review and manage your submitted marks</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                          className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/10"
                          value={subjectFilter}
                          onChange={(e) => setSubjectFilter(e.target.value)}
                        >
                          <option value="All">All Subjects</option>
                          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(subjectFilter === 'All' ? historyData : historyData.filter(item => item.subject === subjectFilter)).length > 0 ? (subjectFilter === 'All' ? historyData : historyData.filter(item => item.subject === subjectFilter)).map((item, i) => (
                      <div key={i} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-brand font-bold">
                              {item.subject[0]}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{item.subject}</div>
                              <div className="text-xs text-muted flex items-center gap-1 mt-0.5"><Calendar className="w-3 h-3" /> {item.entryDate}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-brand text-sm">{item.teacherName}</div>
                            <div className="flex items-center justify-end gap-2 mt-1">
                              <div className="text-xs text-muted"><span>Evaluation Entry: </span></div> {getPaymentStatusBadge(item)}
                              <div className="text-xs text-muted">TPIN: {item.tpin}</div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                          {item.allMarks?.map((mark, idx) => (
                            <div key={idx} className={`p-2.5 rounded-xl bg-white border shadow-sm ${mark.status === 'Wrong' ? 'border-danger/30 bg-danger/5' : 'border-slate-100'}`}>
                              <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 text-center ${
                                mark.status === 'Pending' ? 'text-warning' : 
                                mark.status === 'Updated' ? 'text-success' : 
                                mark.status === 'Wrong' ? 'text-danger' : 'text-slate-400'
                              }`}>
                                {mark.status || "Pending"}
                              </div>
                              <div className="text-[11px] font-medium text-slate-600">
                                Reg: <span className="font-bold text-slate-900">{mark.reg}</span>
                              </div>
                              <div className="text-[11px] font-medium text-slate-600">
                                Mark: <span className="font-bold text-brand">{mark.marks}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {item.allMarks.some(m => m.status === 'Wrong') && (
                          <button className="btn-danger-pro w-full py-2 text-sm" onClick={() => handleEditWrongEntry(item)}>
                            <Edit3 className="w-4 h-4" /> Correct Entry Errors
                          </button>
                        )}
                      </div>
                    )) : (
                      <div className="py-12 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="text-slate-300 w-8 h-8" />
                        </div>
                        <p className="text-slate-400 font-medium">No records found for this branch.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Dashboard View */}
              {activeBranch && currentView === 'dashboard' && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  {renderDashboard()}
                </motion.div>
              )}

              {/* Reports View */}
              {activeBranch && currentView === 'reports' && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {renderReports()}
                </motion.div>
              )}

              {/* Step 4: Main Form */}
              {activeBranch && currentView === 'form' && (
                <motion.div 
                  key="form"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  className="space-y-8"
                >
                  {/* Coordinator Info */}
                  <div className="p-4 rounded-2xl bg-brand/5 border border-brand/10 flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-brand font-bold uppercase tracking-wider">Coordinator</div>
                      <div className="font-bold text-slate-900">{activeBranch.coordinator}</div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Hash className="w-4 h-4 text-slate-400" /> Examiner TPIN</label>
                        <div className="relative">
                          <input 
                            type="number" 
                            value={formData.teacherTPIN} 
                            onChange={handleTPINChange} 
                            className="input-pro" 
                            placeholder="Enter TPIN"
                            required 
                            disabled={formData.isUpdate} 
                          />
                          {verifying && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand animate-spin" />}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> Examiner Name</label>
                        <input type="text" value={teacherName} className="input-pro bg-slate-100 font-medium" disabled />
                      </div>

                      <div className="col-span-full space-y-2">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><BookOpen className="w-4 h-4 text-slate-400" /> Subject</label>
                        <select 
                          className="input-pro appearance-none" 
                          value={formData.subject} 
                          onChange={(e) => setFormData({...formData, subject: e.target.value})} 
                          required 
                          disabled={formData.isUpdate}
                        >
                          <option value="">Select Subject</option>
                          {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {formData.subject && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="col-span-full"
                        >
                          {isLanguageSubject ? (
                            <div className="space-y-2">
                              <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><FileText className="w-4 h-4 text-slate-400" /> Total Scripts</label>
                              <input type="number" value={formData.singleCount} onChange={(e) => setFormData({...formData, singleCount: e.target.value})} className="input-pro" placeholder="Enter total count" required disabled={formData.isUpdate} />
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Bangla Version</label>
                                <input type="number" value={formData.bvCount} onChange={(e) => setFormData({...formData, bvCount: e.target.value})} className="input-pro border-brand/20" required disabled={formData.isUpdate} />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">English Version</label>
                                <input type="number" value={formData.evCount} onChange={(e) => setFormData({...formData, evCount: e.target.value})} className="input-pro border-success/20" required disabled={formData.isUpdate} />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {marksRows.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3"
                      >
                        <div className={`p-3 rounded-xl flex items-center justify-between ${formData.isUpdate ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                          <span className="font-bold flex items-center gap-2">
                            {formData.isUpdate ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                            {formData.isUpdate ? "Correct Errors" : "Marks Entry"}
                          </span>
                          <span className="text-xs font-bold px-2 py-1 bg-white rounded-lg shadow-sm">Total: {marksRows.length}</span>
                        </div>
                        
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            <table className="w-full text-sm border-collapse">
                              <thead className="bg-slate-50 sticky top-0 z-10 border-bottom border-slate-200">
                                <tr>
                                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">#</th>
                                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Reg/Roll</th>
                                  <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-wider">Marks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {marksRows.map((row, idx) => {
                                  const isReadOnly = formData.isUpdate && row.status !== 'Wrong';
                                  return (
                                    <tr key={idx} className={`${row.status === 'Wrong' ? 'bg-danger/5' : ''} transition-colors`}>
                                      <td className="px-4 py-2 font-medium text-slate-400">{idx + 1}</td>
                                      <td className="px-4 py-2">
                                        <input 
                                          type="text" 
                                          className={`w-full px-3 py-1.5 rounded-lg border outline-none focus:ring-2 transition-all ${isReadOnly ? 'bg-slate-50 border-slate-100 text-slate-400' : 'border-slate-200 focus:ring-brand/10 focus:border-brand'}`}
                                          value={row.roll} 
                                          placeholder="7 or 11 digits"
                                          onChange={(e) => {
                                            const n = [...marksRows]; 
                                            n[idx].roll = e.target.value.toUpperCase(); 
                                            setMarksRows(n);
                                          }} 
                                          required 
                                          disabled={isReadOnly} 
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input 
                                          type="number" 
                                          className={`w-full px-3 py-1.5 rounded-lg border outline-none focus:ring-2 transition-all ${isReadOnly ? 'bg-slate-50 border-slate-100 text-slate-400' : 'border-slate-200 focus:ring-brand/10 focus:border-brand'}`}
                                          value={row.marks} 
                                          placeholder="0-100"
                                          onChange={(e) => {
                                            const n = [...marksRows]; 
                                            n[idx].marks = e.target.value; 
                                            setMarksRows(n);
                                          }} 
                                          required 
                                          disabled={isReadOnly} 
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> Evaluation Date</label>
                      <input type="date" value={formData.entryDate} onChange={(e) => setFormData({...formData, entryDate: e.target.value})} className="input-pro" required disabled={formData.isUpdate} />
                    </div>

                    <div className="pt-4 space-y-3">
                      <button 
                        type="submit" 
                        className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all ${formData.isUpdate ? 'bg-warning text-white shadow-warning/20' : 'btn-primary-pro shadow-brand/20'}`} 
                        disabled={loading || verifying || !teacherName || teacherName.includes('সঠিক')}
                      >
                        {loading ? <RefreshCw className="w-6 h-6 animate-spin mx-auto" /> : (
                          <span className="flex items-center justify-center gap-2">
                            {formData.isUpdate ? <Save className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                            {formData.isUpdate ? 'Update Records' : 'Submit Evaluation'}
                          </span>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <footer className="mt-12 text-center text-slate-400 text-sm font-medium">
          <p>© 2026 Exam Scripts Management • Queries: 01329681885,79</p>
          <p>Any kind of complaint or suggestion: 01713236951 || Mahabub Alam || Dyp Manager (ESM)</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
