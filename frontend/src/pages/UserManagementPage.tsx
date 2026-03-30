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
  BarChart3
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
      const res = await api.post('/auth/register', form);
      setIsModalOpen(false);
      setGeneratedUser(res);
      setIsPasswordModalOpen(true);
      fetchUsers();
      setForm({ name: '', email: '', role: 'User', password: '' });
      toast.success('User created successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create user');
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
                            <p className="text-[11px] font-black text-primary flex items-center gap-1.5 mt-1">
                              <Key className="w-3 h-3" /> PW: {u.plainPassword}
                            </p>
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
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        onClick={() => handleDeleteUser(u.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
