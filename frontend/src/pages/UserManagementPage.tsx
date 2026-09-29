import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  Trash2,
  Users,
  Shield,
  Mail,
  Calendar,
  Key,
  Copy,
  Check,
  X,
  Loader2,
  UserPlus,
  FileText,
  BarChart3,
  Pencil,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UserManagementPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Creation modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [generatedUser, setGeneratedUser] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'User',
    password: '' // Optional
  });

  // Edit modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'User',
    changePassword: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/users');
      setUsers(res);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!form.name || !form.email) {
      toast.error('Name and Email are required');
      return;
    }
    try {
      const res = await api.post('/auth/register', {
        ...form,
        name: form.name.trim().toUpperCase(),
        email: form.email.trim().toLowerCase()
      });
      setIsModalOpen(false);
      setGeneratedUser(res);
      setIsPasswordModalOpen(true);
      fetchUsers();
      setForm({ name: '', email: '', role: 'User', password: '' });
      toast.success('User created successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create user');
    }
  };

  const openEditModal = (u: any) => {
    setEditingUser(u);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      role: u.role || 'User',
      changePassword: false,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setIsPasswordVerified(false);
    setVerifyError('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setIsEditModalOpen(true);
  };

  const handleVerifyPassword = async () => {
    if (!editForm.currentPassword) {
      toast.error('Please enter the current password to verify');
      return;
    }
    try {
      setIsVerifyingPassword(true);
      setVerifyError('');
      const res = await api.post(`/auth/users/${editingUser.id}/verify-password`, {
        currentPassword: editForm.currentPassword
      });
      if (res.valid) {
        setIsPasswordVerified(true);
        toast.success('Current password verified successfully!');
      }
    } catch (err: any) {
      setIsPasswordVerified(false);
      setVerifyError(err?.message || 'Incorrect current password');
      toast.error(err?.message || 'Current password verification failed');
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  const handleGenerateRandomPassword = () => {
    const randomPass = Math.random().toString(36).slice(-8) + '!';
    setEditForm(prev => ({
      ...prev,
      newPassword: randomPass,
      confirmPassword: randomPass
    }));
    toast.success('Generated secure key');
  };

  const handleUpdateUser = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast.error('Name and Email are required');
      return;
    }

    if (editForm.changePassword) {
      if (!editForm.currentPassword) {
        toast.error('Please enter and verify the current password first');
        return;
      }
      if (!isPasswordVerified) {
        toast.error('Please click "Verify Password" to verify the current password before updating');
        return;
      }
      if (!editForm.newPassword) {
        toast.error('Please enter a new password');
        return;
      }
      if (editForm.newPassword.length < 4) {
        toast.error('New password must be at least 4 characters long');
        return;
      }
      if (editForm.newPassword !== editForm.confirmPassword) {
        toast.error('New password and confirm password do not match');
        return;
      }
    }

    try {
      setIsUpdating(true);
      const payload: any = {
        name: editForm.name.trim().toUpperCase(),
        email: editForm.email.trim().toLowerCase(),
        role: editForm.role,
      };

      if (editForm.changePassword) {
        payload.currentPassword = editForm.currentPassword;
        payload.newPassword = editForm.newPassword;
      }

      const res = await api.put(`/auth/users/${editingUser.id}`, payload);
      toast.success(res.message || 'Employee updated successfully');
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update employee details');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.delete(`/auth/users/${id}`);
        toast.success('User deleted successfully');
        fetchUsers();
      } catch (err) {
        toast.error('Failed to delete user');
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            User Management Hub
            <Shield className="w-8 h-8 text-primary opacity-20" />
          </h1>
          <p className="text-sm text-slate-500 font-bold tracking-tight mt-2 italic">Access control and workforce identity provisioning infrastructure</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="h-14 px-8 rounded-2xl bg-slate-900 border-2 border-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all font-black uppercase tracking-widest text-[12px] group">
          <UserPlus className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" /> 
          PROVISION NEW IDENTITY
        </Button>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-50/30">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Active Directory</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronized workforce registry</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Filter by name or email..."
              className="pl-11 h-12 rounded-2xl bg-white border-slate-200 shadow-sm font-bold placeholder:text-slate-300"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retrieving security credentials...</p>
             </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-900/5 text-[12px] font-black uppercase tracking-[0.25em] text-slate-900 border-b border-slate-200">
                  <th className="py-8 px-10 text-left">ENTITY IDENTITY</th>
                  <th className="py-8 px-10 text-center">ACCESS ROLE</th>
                  <th className="py-8 px-10 text-center">EMPLOYEE ACTIVITY</th>
                  <th className="py-8 px-10 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-all duration-300 group">
                    <td className="py-6 px-10 text-left">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-inner">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col items-start text-left">
                          <p className="text-base font-black text-slate-900 uppercase tracking-tight leading-tight">{u.name}</p>
                          <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mt-1">
                            <Mail className="w-3 h-3" /> {u.email}
                          </p>
                          {u.plainPassword && (
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-[11px] font-black text-primary flex items-center gap-1.5 ">
                                <Key className="w-3 h-3" /> PW: {u.plainPassword}
                              </p>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5 text-slate-300 hover:text-primary transition-all p-0"
                                onClick={() => copyToClipboard(u.plainPassword)}
                              >
                                <Copy className="w-2.5 h-2.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-10 text-center">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border ${
                        u.role === 'Admin' 
                        ? 'bg-primary/5 text-primary border-primary/20 shadow-sm' 
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-6 px-10 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 px-4 rounded-xl border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[9px] hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                          onClick={() => navigate(`/sales?userId=${u.id}&userName=${encodeURIComponent(u.name)}`)}
                        >
                          <BarChart3 className="w-3 h-3" /> Sales
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 px-4 rounded-xl border-slate-200 text-slate-600 font-black uppercase tracking-widest text-[9px] hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 shadow-sm"
                          onClick={() => navigate(`/quotation?userId=${u.id}&userName=${encodeURIComponent(u.name)}`)}
                        >
                          <FileText className="w-3 h-3" /> Quotations
                        </Button>
                      </div>
                    </td>
                    <td className="py-6 px-10 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Edit Employee Details & Password"
                          className="h-10 w-10 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                          onClick={() => openEditModal(u)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Delete Employee"
                          className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-[32px] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 px-8 py-6 relative overflow-hidden">
             <div className="relative z-10 flex items-center justify-between">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">Provision Identity</DialogTitle>
                </DialogHeader>
                <Shield className="w-12 h-12 text-white/10" />
             </div>
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl -mr-16 -mt-16" />
          </div>
          
          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Legal Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="h-14 bg-slate-50 border-none rounded-2xl font-bold focus-visible:ring-primary/20 transition-all shadow-inner"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Corporate Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <Input
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="john@omada.com"
                  className="h-14 bg-slate-50 border-none rounded-2xl pl-12 font-bold focus-visible:ring-primary/20 transition-all shadow-inner"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Auth Role</Label>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                  <SelectTrigger className="h-14 bg-slate-50 border-none rounded-2xl font-black text-xs uppercase tracking-widest shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                    <SelectItem value="Admin" className="font-bold py-3">ADMIN</SelectItem>
                    <SelectItem value="User" className="font-bold py-3">USER / SALES</SelectItem>
                    <SelectItem value="Builders Sales" className="font-bold py-3 text-[10px]">BUILDERS SALES</SelectItem>
                    <SelectItem value="Architects / Interior Sales" className="font-bold py-3 text-[10px]">ARCHITECTS SALES</SelectItem>
                    <SelectItem value="Contractors / End-to-End" className="font-bold py-3 text-[10px]">CONTRACTORS / END-TO-END</SelectItem>
                    <SelectItem value="PMC" className="font-bold py-3 text-[10px]">PMC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Password Bypass</Label>
                <Input
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Auto-generate"
                  className="h-14 bg-slate-50 border-none rounded-2xl font-bold shadow-inner placeholder:italic placeholder:font-medium placeholder:text-slate-300"
                  type="password"
                />
              </div>
            </div>
          </div>
          
          <div className="p-8 bg-slate-50/50 flex justify-end gap-4 shrink-0 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="h-14 px-8 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-all">Cancel</Button>
            <Button onClick={handleCreateUser} className="h-14 px-10 rounded-2xl shadow-xl shadow-primary/25 font-black uppercase tracking-widest text-[11px] bg-slate-900 border-2 border-slate-900 hover:bg-slate-800 transition-all">
              Initialize Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg rounded-[32px] p-0 overflow-hidden border-none shadow-2xl max-h-[90vh] flex flex-col">
          <div className="bg-slate-900 px-8 py-6 relative overflow-hidden shrink-0">
             <div className="relative z-10 flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2.5">
                    <Pencil className="w-5 h-5 text-primary" />
                    Modify Employee Record
                  </DialogTitle>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    Editing profile for <span className="text-white font-extrabold">{editingUser?.name}</span>
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
             </div>
             <div className="absolute top-0 right-0 w-36 h-36 bg-primary/20 blur-3xl -mr-16 -mt-16" />
          </div>
          
          <div className="p-8 space-y-6 bg-white overflow-y-auto custom-scrollbar flex-1">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Legal Name</Label>
                <Input
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. JOHN DOE"
                  className="h-13 bg-slate-50 border border-slate-200/80 rounded-2xl font-bold focus-visible:ring-primary/20 transition-all text-slate-800"
                />
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Corporate Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                  <Input
                    value={editForm.email}
                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="john@omada.com"
                    className="h-13 bg-slate-50 border border-slate-200/80 rounded-2xl pl-12 font-bold focus-visible:ring-primary/20 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Authorization Role</Label>
                <Select value={editForm.role} onValueChange={v => setEditForm({ ...editForm, role: v })}>
                  <SelectTrigger className="h-13 bg-slate-50 border border-slate-200/80 rounded-2xl font-black text-xs uppercase tracking-widest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                    <SelectItem value="Admin" className="font-bold py-3">ADMIN</SelectItem>
                    <SelectItem value="User" className="font-bold py-3">USER / SALES</SelectItem>
                    <SelectItem value="Builders Sales" className="font-bold py-3 text-[10px]">BUILDERS SALES</SelectItem>
                    <SelectItem value="Architects / Interior Sales" className="font-bold py-3 text-[10px]">ARCHITECTS SALES</SelectItem>
                    <SelectItem value="Contractors / End-to-End" className="font-bold py-3 text-[10px]">CONTRACTORS / END-TO-END</SelectItem>
                    <SelectItem value="PMC" className="font-bold py-3 text-[10px]">PMC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Password Change Toggle Card */}
            <div className="pt-2 border-t border-slate-100">
              <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      editForm.changePassword ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-200 text-slate-500'
                    }`}>
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Change Account Password</h4>
                      <p className="text-[10px] font-bold text-slate-400">Requires verification of current password</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant={editForm.changePassword ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setEditForm(prev => ({
                        ...prev,
                        changePassword: !prev.changePassword,
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                      }));
                      setIsPasswordVerified(false);
                      setVerifyError('');
                    }}
                    className={`h-8 px-3.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                      editForm.changePassword ? 'bg-slate-900 text-white hover:bg-slate-800' : 'border-slate-300 text-slate-600'
                    }`}
                  >
                    {editForm.changePassword ? 'Enabled' : 'Enable'}
                  </Button>
                </div>

                {editForm.changePassword && (
                  <div className="space-y-4 pt-3 border-t border-slate-200/60 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Step 1: Verify Current Password */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] flex items-center justify-center font-bold">1</span>
                          Verify Current Password <span className="text-rose-500">*</span>
                        </Label>
                        {isPasswordVerified && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" /> Verified
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="Enter employee's current password"
                            value={editForm.currentPassword}
                            onChange={e => {
                              setEditForm({ ...editForm, currentPassword: e.target.value });
                              setIsPasswordVerified(false);
                              setVerifyError('');
                            }}
                            className={`h-11 bg-white pr-10 rounded-xl font-bold text-xs ${
                              isPasswordVerified 
                                ? 'border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/20' 
                                : verifyError 
                                  ? 'border-rose-400 ring-1 ring-rose-400' 
                                  : 'border-slate-200'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <Button
                          type="button"
                          disabled={!editForm.currentPassword || isVerifyingPassword || isPasswordVerified}
                          onClick={handleVerifyPassword}
                          className={`h-11 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider shrink-0 transition-all ${
                            isPasswordVerified 
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                              : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                          }`}
                        >
                          {isVerifyingPassword ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Checking...</>
                          ) : isPasswordVerified ? (
                            <><Check className="w-3.5 h-3.5 mr-1.5" /> Verified</>
                          ) : (
                            'Verify Key'
                          )}
                        </Button>
                      </div>

                      {verifyError && (
                        <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1 ml-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {verifyError}
                        </p>
                      )}
                    </div>

                    {/* Step 2: Create New Password (Enabled only after verification) */}
                    <div className={`space-y-3 pt-2 border-t border-slate-200/40 transition-opacity ${
                      !isPasswordVerified ? 'opacity-40 pointer-events-none' : 'opacity-100'
                    }`}>
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] flex items-center justify-center font-bold">2</span>
                          Create New Password <span className="text-rose-500">*</span>
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={!isPasswordVerified}
                          onClick={handleGenerateRandomPassword}
                          className="h-6 px-2 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 rounded-lg flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> Auto-Generate
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1">New Password</span>
                          <div className="relative">
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              placeholder="New password"
                              value={editForm.newPassword}
                              disabled={!isPasswordVerified}
                              onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })}
                              className="h-11 bg-white pr-9 rounded-xl font-bold text-xs border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-1">Confirm Password</span>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm new password"
                              value={editForm.confirmPassword}
                              disabled={!isPasswordVerified}
                              onChange={e => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                              className={`h-11 bg-white pr-9 rounded-xl font-bold text-xs ${
                                editForm.newPassword && editForm.confirmPassword && editForm.newPassword === editForm.confirmPassword
                                  ? 'border-emerald-400 ring-1 ring-emerald-400'
                                  : editForm.confirmPassword && editForm.newPassword !== editForm.confirmPassword
                                    ? 'border-rose-400 ring-1 ring-rose-400'
                                    : 'border-slate-200'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                              {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      {editForm.newPassword && editForm.confirmPassword && (
                        <div className="flex items-center gap-1.5 ml-1 pt-0.5">
                          {editForm.newPassword === editForm.confirmPassword ? (
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Passwords match perfectly
                            </span>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                              <X className="w-3 h-3" /> Passwords do not match
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 bg-slate-50/70 flex justify-end gap-3 shrink-0 border-t border-slate-100">
            <Button 
              variant="ghost" 
              onClick={() => setIsEditModalOpen(false)} 
              className="h-12 px-6 rounded-2xl text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600 transition-all"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateUser} 
              disabled={isUpdating || (editForm.changePassword && (!isPasswordVerified || !editForm.newPassword || editForm.newPassword !== editForm.confirmPassword))}
              className="h-12 px-8 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-[11px] bg-slate-900 border-2 border-slate-900 hover:bg-slate-800 text-white transition-all flex items-center gap-2"
            >
              {isUpdating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...</>
              ) : (
                <><Check className="w-4 h-4" /> Save Record Updates</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generated Password Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="max-w-md rounded-[32px] p-0 overflow-hidden border-none shadow-2xl animate-in zoom-in-95">
          <div className="bg-emerald-500 px-8 py-8 relative overflow-hidden text-center">
             <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 backdrop-blur-md">
                   <Key className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Security Credentials Created</h3>
             </div>
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl -mr-16 -mt-16" />
          </div>
          
          <div className="p-10 space-y-8 bg-white text-center">
             <p className="text-sm font-bold text-slate-500 leading-relaxed px-4">
               Credentials successfully provisioned for <span className="text-slate-900 font-black">{generatedUser?.name}</span>. Please securely transmit this temporary password to the user.
             </p>

             <div className="relative group">
                <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-hover:bg-primary/10 transition-all" />
                <div className="relative bg-slate-50 border-2 border-slate-100 rounded-3xl p-8 flex flex-col items-center gap-4">
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Temporary Key</span>
                   <span className="text-4xl font-black text-primary tracking-widest font-mono">
                     {generatedUser?.generatedPassword || '(Used Manual Password)'}
                   </span>
                   
                   {generatedUser?.generatedPassword && (
                      <Button 
                        onClick={() => copyToClipboard(generatedUser.generatedPassword)}
                        className={`mt-4 h-12 rounded-xl transition-all font-black uppercase tracking-widest text-[10px] px-8 flex items-center gap-2 ${
                          copied ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'
                        }`}
                      >
                        {copied ? (
                          <><Check className="w-4 h-4" /> Identity Copied</>
                        ) : (
                          <><Copy className="w-4 h-4" /> Copy Secure Key</>
                        )}
                      </Button>
                   )}
                </div>
             </div>
          </div>
          
          <div className="p-8 bg-slate-50 flex justify-center border-t border-slate-100">
            <Button onClick={() => setIsPasswordModalOpen(false)} className="h-14 w-full rounded-2xl font-black uppercase tracking-widest text-[11px] bg-slate-900 border-2 border-slate-900 shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all">
              Acknowledge & Dismiss
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagementPage;
