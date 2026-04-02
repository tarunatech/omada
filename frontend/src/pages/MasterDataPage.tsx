import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, Pencil, Trash2, Building2, Package, Tag, Clock, Upload, Loader2, X, Eye, Trophy, TrendingUp, List, PackageOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
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
} from "@/components/ui/select"
import { CustomPagination } from '@/components/CustomPagination';

const MasterDataPage = () => {
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [bestDesigns, setBestDesigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [currentDesignPage, setCurrentDesignPage] = useState(1);
  const [currentBestPage, setCurrentBestPage] = useState(1);
  const [totalDesignPages, setTotalDesignPages] = useState(1);
  const [totalBestPages, setTotalBestPages] = useState(1);
  const itemsPerPage = 12;

  // Modal states
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [designModalOpen, setDesignModalOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [orderRecords, setOrderRecords] = useState<any[]>([]);
  const [viewHistoryOpen, setViewHistoryOpen] = useState(false);
  const [historyCompany, setHistoryCompany] = useState<string>('');

  // Form states
  const [companyForm, setCompanyForm] = useState({ name: '', type: '', contact: '', status: 'Active' });
  const [designForm, setDesignForm] = useState({ company: '', design: '', finish: '', size: '', image: null as string | null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/master/companies?limit=100');
      setCompanies(res.data || []);
    } catch (err) {
      console.error('Failed to fetch companies', err);
    }
  };

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const url = `/master/products?page=${currentDesignPage}&limit=${itemsPerPage}&search=${search}&company=${selectedCompany === 'all' ? '' : selectedCompany}`;
      const res = await api.get(url);
      setDesigns(res.data || []);
      setTotalDesignPages(res.pagination.totalPages || 1);
    } catch (err) {
      toast.error('Failed to fetch designs');
    } finally {
      setLoading(false);
    }
  };

  const fetchBestDesigns = async () => {
    try {
      const url = `/master/products?sortBy=usage&page=${currentBestPage}&limit=${itemsPerPage}&search=${search}`;
      const res = await api.get(url);
      setBestDesigns(res.data || []);
      setTotalBestPages(res.pagination.totalPages || 1);
    } catch (err) {
      console.error('Failed to fetch best designs', err);
    }
  };

  useEffect(() => {
    fetchCompanies();
    // Load local PO records
    const saved = localStorage.getItem('omada_order_records');
    if (saved) {
      setOrderRecords(JSON.parse(saved));
    }
  }, []);

  // Auto-sync manufacturers from local PO records to DB if missing
  useEffect(() => {
    const syncMissing = async () => {
      if (orderRecords.length === 0) return;
      
      const uniqueSuppliers = Array.from(new Set(orderRecords.map(r => r.supplier)));
      let addedAny = false;

      for (const s of uniqueSuppliers) {
        if (!s || s.trim() === '-' || s.startsWith('ORD-')) continue;
        
        // Use current state to check existence
        const exists = companies.some(c => c.name.toLowerCase() === s.toLowerCase());
        
        if (!exists) {
          try {
            await api.post('/master/companies', { 
              name: s, 
              type: 'Manufacturer', 
              contact: '-',
              status: 'Active' 
            });
            addedAny = true;
          } catch (e) {
            console.log(`Sync skipped for ${s}`);
          }
        }
      }
      if (addedAny) fetchCompanies();
    };

    // Small delay to ensure fetchCompanies has finished first
    const timeout = setTimeout(syncMissing, 1000);
    return () => clearTimeout(timeout);
  }, [orderRecords.length, companies.length]);

  useEffect(() => {
    fetchDesigns();
  }, [currentDesignPage, search, selectedCompany]);

  useEffect(() => {
    fetchBestDesigns();
  }, [currentBestPage, search]);

  useEffect(() => {
    setCurrentDesignPage(1);
    setCurrentBestPage(1);
  }, [search, selectedCompany]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDesignForm({ ...designForm, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const saveCompany = async () => {
    if (!companyForm.name) {
      toast.error('Company name is required');
      return;
    }
    try {
      if (editingItem) {
        await api.put(`/master/companies/${editingItem.id}`, companyForm);
        toast.success('Company updated');
      } else {
        await api.post('/master/companies', companyForm);
        toast.success('Company created');
      }
      setCompanyModalOpen(false);
      setEditingItem(null);
      setCompanyForm({ name: '', type: '', contact: '', status: 'Active' });
      fetchCompanies();
    } catch (err) {
      toast.error('Failed to save company');
    }
  };

  const saveDesign = async () => {
    if (!designForm.company || !designForm.design) {
      toast.error('Company and Design name are required');
      return;
    }
    try {
      if (editingItem) {
        await api.put(`/master/products/${editingItem.id}`, designForm);
        toast.success('Design updated');
      } else {
        await api.post('/master/products', designForm);
        toast.success('Design created');
      }
      setDesignModalOpen(false);
      setEditingItem(null);
      setDesignForm({ company: '', design: '', finish: '', size: '', image: null });
      fetchDesigns();
      fetchBestDesigns();
    } catch (err) {
      toast.error('Failed to save design');
    }
  };

  const removeCompany = async (id: number) => {
    if (confirm('Delete this company?')) {
      try {
        await api.delete(`/master/companies/${id}`);
        toast.success('Company deleted');
        fetchCompanies();
      } catch (err) {
        toast.error('Failed to delete company');
      }
    }
  };

  const removeDesign = async (id: number) => {
    if (confirm('Delete this design?')) {
      try {
        await api.delete(`/master/products/${id}`);
        toast.success('Design deleted');
        fetchDesigns();
        fetchBestDesigns();
      } catch (err) {
        toast.error('Failed to delete design');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Master Data Intelligence</h1>
          <p className="text-sm text-slate-500 font-bold tracking-tight">Enterprise-grade catalog management for manufacturing and supply chain</p>
        </div>
        {loading && (
          <div className="bg-primary/5 px-4 py-2 rounded-xl flex items-center gap-2 border border-primary/10">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Synchronizing...</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="designs" className="w-full">
        <TabsList className="bg-slate-100/50 backdrop-blur-md border border-white p-1.5 rounded-[20px] h-14 mb-8">
          <TabsTrigger
            value="designs"
            className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-500 font-black uppercase tracking-widest text-[12px] rounded-2xl px-8 h-11 transition-all data-[state=active]:shadow-lg data-[state=active]:scale-[1.02]"
          >
            <Package className="w-4 h-4 mr-2" /> Designs
          </TabsTrigger>
          <TabsTrigger
            value="best"
            className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-500 font-black uppercase tracking-widest text-[12px] rounded-2xl px-8 h-11 transition-all data-[state=active]:shadow-lg data-[state=active]:scale-[1.02]"
          >
            <Trophy className="w-4 h-4 mr-2" /> Performance Ranking
          </TabsTrigger>
          <TabsTrigger
            value="companies"
            className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-500 font-black uppercase tracking-widest text-[12px] rounded-2xl px-8 h-11 transition-all data-[state=active]:shadow-lg data-[state=active]:scale-[1.02]"
          >
            <Building2 className="w-4 h-4 mr-2" /> Manufacturers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="designs" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 p-8 sm:p-10 border-b border-slate-100 bg-slate-50/30">
              <div className="flex flex-col sm:flex-row flex-1 items-center gap-4 max-w-3xl">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search design repository..."
                    className="pl-11 bg-white border-slate-200 h-12 rounded-xl focus-visible:ring-primary/20 shadow-sm font-bold"
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setCurrentDesignPage(1);
                      setCurrentBestPage(1);
                    }}
                  />
                </div>
                <Select value={selectedCompany} onValueChange={v => {
                  setSelectedCompany(v);
                  setCurrentDesignPage(1);
                }}>
                  <SelectTrigger className="w-full sm:w-[240px] h-12 rounded-xl bg-white border-slate-200 shadow-sm font-black text-[11px] uppercase tracking-widest text-slate-600">
                    <SelectValue placeholder="All Manufacturers" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    <SelectItem value="all" className="font-black text-[11px] uppercase tracking-widest">All Manufacturers</SelectItem>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.name} className="font-black text-[11px] uppercase tracking-widest">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => { setEditingItem(null); setDesignForm({ company: '', design: '', finish: '', size: '', image: null }); setDesignModalOpen(true); }} className="h-12 px-8 rounded-xl bg-slate-900 border-2 border-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all font-black uppercase tracking-widest text-[12px]">
                <Plus className="w-5 h-5 mr-2" /> ADD NEW SPECIFICATION
              </Button>
            </div>
            <div className="p-8 sm:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                {designs.map(d => (
                  <div key={d.id} className="group relative bg-white border border-slate-100 rounded-[40px] overflow-hidden hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-500 hover:-translate-y-2 flex flex-col">
                    <div className="aspect-[5/4] relative overflow-hidden bg-slate-50">
                      {d.image ? (
                        <img src={d.image} alt={d.design} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                          <Package className="w-12 h-12 mb-3 opacity-20" />
                          <span className="text-[10px] uppercase font-black tracking-[0.2em]">Asset Pending</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center p-6 backdrop-blur-[2px]">
                        <div className="flex gap-3">
                          <Button size="icon" className="h-12 w-12 rounded-2xl bg-white text-slate-900 border-none hover:bg-slate-900 hover:text-white shadow-xl transition-all" onClick={() => { setViewingItem(d); setViewDetailsOpen(true); }}>
                            <Eye className="w-5 h-5" />
                          </Button>
                          <Button size="icon" className="h-12 w-12 rounded-2xl bg-white text-slate-900 border-none hover:bg-slate-900 hover:text-white shadow-xl transition-all" onClick={() => { setEditingItem(d); setDesignForm({ company: d.company, design: d.design, finish: d.finish || '', size: d.size || '', image: d.image }); setDesignModalOpen(true); }}>
                            <Pencil className="w-5 h-5" />
                          </Button>
                          <Button size="icon" variant="destructive" className="h-12 w-12 rounded-2xl bg-white text-red-600 border-none hover:bg-red-600 hover:text-white shadow-xl transition-all" onClick={() => removeDesign(d.id)}>
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-[12px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-4 py-1.5 rounded-xl border border-blue-100">{d.company}</span>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Tag className="w-4 h-4" />
                          <span className="text-[13px] font-bold tracking-tight text-slate-500">{d.size}</span>
                        </div>
                      </div>

                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter group-hover:text-blue-600 transition-colors duration-300 leading-none mb-8 line-clamp-1">{d.design}</h3>

                      <div className="mt-auto flex items-center justify-between bg-slate-950/[0.03] px-6 py-4 rounded-2xl border border-slate-950/[0.05]">
                        <span className="text-[12px] text-slate-600 font-bold uppercase tracking-widest">{d.finish || 'Standard'}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          <span className="text-[11px] font-black uppercase text-emerald-600 tracking-[0.2em]">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <CustomPagination
                currentPage={currentDesignPage}
                totalPages={totalDesignPages}
                onPageChange={setCurrentDesignPage}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="best" className="mt-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-8 sm:p-12 border-b border-slate-100 bg-slate-50/30 text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Most Popular Designs</h2>
              </div>
              <p className="text-sm text-slate-500 font-bold tracking-tight">Real-time product performance analytics based on finalized quotations</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900/5 text-[12px] font-black uppercase tracking-[0.25em] text-slate-900 border-b-2 border-slate-100">
                    <th className="py-8 px-6 text-center w-[80px]">#</th>
                    <th className="py-8 px-10 text-left">DESIGN IDENTITY</th>
                    <th className="py-8 px-10 text-left">MANUFACTURER</th>
                    <th className="py-8 px-10 text-left">SPECIFICATIONS</th>
                    <th className="py-8 px-10 text-center">TOTAL VOLUME</th>
                    <th className="py-8 px-10 text-right">PREVIEW</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bestDesigns.map((d, index) => (
                    <tr key={d.id} className="hover:bg-slate-50 transition-all duration-300 group">
                      <td className="py-8 px-6 text-center text-slate-400 font-extrabold tabular-nums">
                        {(currentBestPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="py-8 px-10 text-left">
                        <p className="text-base font-black text-slate-900 uppercase tracking-tight group-hover:text-primary transition-colors">{d.design}</p>
                      </td>
                      <td className="py-8 px-10 text-left">
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary bg-primary/5 px-3 py-1.5 rounded-full border border-primary/10">{d.company}</span>
                      </td>
                      <td className="py-8 px-10 text-left">
                        <div className="space-y-1.5">
                          <p className="text-sm font-black text-slate-700 tracking-tight">{d.size || '-'}</p>
                          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{d.finish || '-'}</p>
                        </div>
                      </td>
                      <td className="py-8 px-10 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-2xl font-black text-slate-950 tracking-tighter leading-none">{parseFloat(d.totalQuantityUsed || 0).toLocaleString()}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mt-2 bg-emerald-50 px-2 py-0.5 rounded">Boxes Sold</span>
                        </div>
                      </td>
                      <td className="py-8 px-10 text-right">
                        <div className="flex justify-end">
                          <div className="w-20 h-14 rounded-2xl border-2 border-slate-100 overflow-hidden bg-slate-50 shadow-md group-hover:border-primary/40 group-hover:shadow-lg transition-all cursor-pointer" onClick={() => { setViewingItem(d); setViewDetailsOpen(true); }}>
                            {d.image ? (
                              <img src={d.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-5 h-5 text-slate-200" />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <CustomPagination
              currentPage={currentBestPage}
              totalPages={totalBestPages}
              onPageChange={setCurrentBestPage}
            />
          </div>
        </TabsContent>

        <TabsContent value="companies" className="mt-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="p-8 sm:p-12 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
              <div className="text-left">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Manufacturing Partners</h2>
                <p className="text-sm text-slate-500 font-bold tracking-tight">Approved vendor list and supply chain partners</p>
              </div>
              <div className="flex gap-4 items-center">
                <Button variant="outline" onClick={() => window.location.reload()} className="h-12 px-6 rounded-xl border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-xs">
                  <Clock className="w-4 h-4 mr-2" /> REFRESH FROM POs
                </Button>
                <Button onClick={() => { setEditingItem(null); setCompanyForm({ name: '', type: '', contact: '', status: 'Active' }); setCompanyModalOpen(true); }} className="h-12 px-8 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[12px]">
                  <Plus className="w-5 h-5 mr-2" /> REGISTER PARTNER
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900/5 text-[12px] font-black uppercase tracking-[0.25em] text-slate-900 border-b-2 border-slate-100">
                    <th className="py-8 px-10 text-left">COMPANY IDENTITY</th>
                    <th className="py-8 px-10 text-left">CATEGORY</th>
                    <th className="py-8 px-10 text-center">STATUS</th>
                    <th className="py-8 px-10 text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-all duration-300">
                      <td className="py-8 px-10 text-left font-black text-slate-900 uppercase tracking-tight">{c.name}</td>
                      <td className="py-8 px-10 text-left text-slate-500 font-bold">{c.type || 'N/A'}</td>
                      <td className="py-8 px-10 text-center">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-8 px-10 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-primary hover:text-primary hover:bg-primary/5" onClick={() => { setHistoryCompany(c.name); setViewHistoryOpen(true); }} title="View Purchase Orders">
                            <List className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-400 hover:text-slate-900" onClick={() => { setEditingItem(c); setCompanyForm({ name: c.name, type: c.type || '', contact: '', status: c.status }); setCompanyModalOpen(true); }}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-slate-400 hover:text-red-600" onClick={() => removeCompany(c.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* PO History Modal */}
      <Dialog open={viewHistoryOpen} onOpenChange={setViewHistoryOpen}>
        <DialogContent className="max-w-4xl rounded-3xl p-0 overflow-hidden outline-none flex flex-col max-h-[85vh]">
          <div className="bg-[#855546] px-8 py-6 flex items-center justify-between shrink-0">
            <div>
              <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.2em] mb-1">Manufacturer Order History</p>
              <h2 className="text-xl font-black tracking-tight text-white uppercase">{historyCompany}</h2>
            </div>
            <Button variant="ghost" className="h-8 w-8 p-0 text-white/50 hover:text-white" onClick={() => setViewHistoryOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="p-8 overflow-y-auto flex-1">
            {orderRecords.filter(r => r.supplier === historyCompany).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orderRecords.filter(r => r.supplier === historyCompany).map((order) => (
                  <div key={order.id} className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Order Ref</p>
                        <p className="text-base font-black text-slate-900 uppercase">{order.id}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-900 text-white">
                        {order.date}
                      </span>
                    </div>
                    <div className="space-y-4">
                      {order.categories.map((cat: any, i: number) => (
                        <div key={i} className="bg-slate-50 rounded-xl p-4">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-2">{cat.name}</p>
                          <div className="space-y-2">
                            {cat.items.map((item: any, j: number) => (
                              <div key={j} className="flex justify-between items-center text-[11px] font-bold text-slate-600">
                                <span className="uppercase">{item.design} ({item.size})</span>
                                <span className="text-slate-900 font-black">{item.qty?.toLocaleString()} PCS</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <PackageOpen className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No purchase orders found for this partner</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Company Modal */}
      <Dialog open={companyModalOpen} onOpenChange={setCompanyModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              {editingItem ? 'Edit Company' : 'New Company'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Company Name</Label>
              <Input
                value={companyForm.name}
                onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                placeholder="e.g. Kajaria"
                className="h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Type</Label>
                <Input
                  value={companyForm.type}
                  onChange={e => setCompanyForm({ ...companyForm, type: e.target.value })}
                  placeholder="e.g. Tiles"
                  className="h-12 bg-slate-50 border-none rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Status</Label>
                <Select value={companyForm.status} onValueChange={v => setCompanyForm({ ...companyForm, status: v })}>
                  <SelectTrigger className="h-12 bg-slate-50 border-none rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setCompanyModalOpen(false)} className="h-12 px-8 rounded-xl border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-xs">Cancel</Button>
            <Button onClick={saveCompany} className="h-12 px-10 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-xs">
              {editingItem ? 'Update' : 'Save'} Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Design Modal */}
      <Dialog open={designModalOpen} onOpenChange={setDesignModalOpen}>
        <DialogContent className="max-w-xl max-h-[92vh] rounded-3xl p-0 overflow-hidden outline-none flex flex-col">
          <div className="bg-slate-900 px-8 py-6 flex items-center justify-between shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight text-white uppercase">
                {editingItem ? 'Update Design' : 'Add New Design'}
              </DialogTitle>
            </DialogHeader>
            <Button variant="ghost" className="h-8 w-8 p-0 text-white/50 hover:text-white" onClick={() => setDesignModalOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-8 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Company Name</Label>
                  <Input
                    value={designForm.company}
                    onChange={e => setDesignForm({ ...designForm, company: e.target.value })}
                    placeholder="e.g. Kajaria"
                    className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                    list="company-list"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Design Name</Label>
                  <Input
                    value={designForm.design}
                    onChange={e => setDesignForm({ ...designForm, design: e.target.value })}
                    placeholder="e.g. Statuario White"
                    className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Finish</Label>
                    <Input
                      value={designForm.finish}
                      onChange={e => setDesignForm({ ...designForm, finish: e.target.value })}
                      placeholder="e.g. Polished"
                      className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Size</Label>
                    <Input
                      value={designForm.size}
                      onChange={e => setDesignForm({ ...designForm, size: e.target.value })}
                      placeholder="e.g. 1200x600"
                      className="h-12 bg-slate-50 border-none rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1">Product Visual</Label>
                <div
                  className="aspect-square rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group/img cursor-pointer transition-all hover:border-primary/40 hover:bg-slate-100/50"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {designForm.image ? (
                    <>
                      <img src={designForm.image} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-white text-[10px] font-black uppercase tracking-widest">Change Image</p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-6">
                      <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-5 h-5 text-primary" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Click to upload<br />high-res image</p>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-8 flex justify-end gap-3 shrink-0">
              <Button variant="ghost" onClick={() => setDesignModalOpen(false)} className="h-12 px-8 rounded-xl text-slate-500 font-bold uppercase tracking-widest text-xs">Cancel</Button>
              <Button onClick={saveDesign} className="h-12 px-10 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-xs">
                {editingItem ? 'Update' : 'Confirm'} Design
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* View Details Modal */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] p-0 overflow-hidden rounded-[32px] border-none shadow-2xl flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle className="text-white">View Item Details</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col md:flex-row h-full overflow-y-auto">
            <div className="md:w-3/5 bg-slate-50 relative aspect-square md:aspect-auto">
              {viewingItem?.image ? (
                <img src={viewingItem.image} alt={viewingItem.design} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-200">
                  <Package className="w-20 h-20 mb-4 opacity-10" />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">No High-Res Image</span>
                </div>
              )}
              <div className="absolute top-6 left-6">
                <span className="bg-white/90 backdrop-blur-md text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl border border-white/20">
                  {viewingItem?.company}
                </span>
              </div>
            </div>

            <div className="md:w-2/5 p-10 flex flex-col bg-white">
              <div className="mb-10 flex justify-between items-start">
                <div className="space-y-1 text-left">
                  <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight">{viewingItem?.design}</h2>
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-slate-100" onClick={() => setViewDetailsOpen(false)}>
                  <X className="w-6 h-6 text-slate-400" />
                </Button>
              </div>

              <div className="space-y-8 flex-1">
                <div className="grid grid-cols-1 gap-6">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 group transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Building2 className="w-3 h-3 text-primary" /> Manufacturing Company
                    </p>
                    <p className="text-lg font-black text-slate-800 tracking-tight">{viewingItem?.company}</p>
                  </div>

                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm group transition-all duration-300 hover:border-primary/30 text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-primary" /> Dimensions / Size
                    </p>
                    <p className="text-2xl font-black text-slate-950 tracking-tight">{viewingItem?.size || 'N/A'}</p>
                  </div>

                  <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm group transition-all duration-300 hover:border-primary/30 text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-primary" /> Surface Finish
                    </p>
                    <p className="text-2xl font-black text-slate-950 uppercase tracking-tight">{viewingItem?.finish || 'Standard'}</p>
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-auto flex gap-3">
                <Button className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] shadow-xl hover:bg-slate-800 transition-all" onClick={() => { setViewDetailsOpen(false); setEditingItem(viewingItem); setDesignForm({ company: viewingItem.company, design: viewingItem.design, finish: viewingItem.finish || '', size: viewingItem.size || '', image: viewingItem.image }); setDesignModalOpen(true); }}>
                  <Pencil className="w-4 h-4 mr-2" /> Modify details
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <datalist id="company-list">
        {companies.map(c => (
          <option key={c.id} value={c.name} />
        ))}
      </datalist>
    </div>
  );
};

export default MasterDataPage;
