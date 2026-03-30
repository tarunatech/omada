import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth, SalesDept } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Search, Building2, PencilRuler, HardHat, Bell, MapPin, ExternalLink, Eye, Loader2, Clock, FileDown, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, isSameDay } from 'date-fns';
import BuildersForm from '@/components/sales/BuildersForm';
import ArchitectsForm from '@/components/sales/ArchitectsForm';
import ContractorsForm from '@/components/sales/ContractorsForm';
import EndToEndForm from '@/components/sales/EndToEndForm';
import { api } from '@/lib/api';
import { globalSearch } from '@/lib/utils';
import { Users, User, X as CloseIcon } from 'lucide-react';
import { CustomPagination } from '@/components/CustomPagination';

const SalesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterUserId = searchParams.get('userId');
  const filterUserName = searchParams.get('userName');
  
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;


  // Use the department from the user context, or default for Admin
  const [activeDept, setActiveDept] = useState<SalesDept>(user?.selectedDepartment || 'builders');

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<any[]>([]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const userFilter = filterUserId ? `&createdBy=${filterUserId}` : '';
      const res = await api.get(`/sales?dept=${activeDept}&page=${currentPage}&limit=${itemsPerPage}&search=${search}${userFilter}`);
      const data = res.data || [];
      const pagination = res.pagination || { totalPages: 1, totalCount: 0 };
      
      setRecords(data);
      setTotalPages(pagination.totalPages || 1);
      setTotalCount(pagination.totalCount || 0);
    } catch (err) {
      toast.error('Failed to fetch records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentPage, search, activeDept]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeDept]);
  
  useEffect(() => {
    if (user?.selectedDepartment && user.selectedDepartment !== activeDept) {
      setActiveDept(user.selectedDepartment);
    }
  }, [user?.selectedDepartment]);

  // Form State
  const [formData, setFormData] = useState<any>({
    followUps: [],
    date: format(new Date(), 'yyyy-MM-dd')
  });



  const paginatedRecords = records;

  const handleView = (record: any) => {
    setEditingId(record.id);
    setFormData({ ...record });
    setIsViewOnly(true);
    setOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setFormData({ ...record });
    setIsViewOnly(false);
    setOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      try {
        await api.delete(`/sales/${id}`);
        setRecords(records.filter(r => r.id !== id));
        toast.success('Record deleted');
      } catch (err) {
        toast.error('Failed to delete record');
      }
    }
  };

  const handleSave = async () => {
    const nameField = activeDept === 'builders' ? formData.siteName :
      activeDept === 'architects' ? formData.firmName :
        activeDept === 'contractors' ? formData.contractorOwnerName :
          formData.customerName;

    if (!nameField) {
      toast.error('Please enter the primary name field');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/sales/${editingId}`, { ...formData, dept: activeDept });
        toast.success('Record updated');
      } else {
        await api.post('/sales', { ...formData, dept: activeDept });
        toast.success('Record saved');
      }
      fetchRecords();
      setOpen(false);
      setEditingId(null);
      setFormData({ followUps: [], date: format(new Date(), 'yyyy-MM-dd') });
    } catch (err) {
      toast.error('Failed to save record');
    }
  };
  const getDeptTitle = () => {
    switch (activeDept) {
      case 'builders': return 'Builder';
      case 'architects': return 'Architecture';
      case 'contractors': return 'Contractor';
      case 'end-to-end': return 'End to End Customer';
      default: return 'Sales Records';
    }
  };

  const getDeptIcon = () => {
    switch (activeDept) {
      case 'builders': return <Building2 className="w-5 h-5" />;
      case 'architects': return <PencilRuler className="w-5 h-5" />;
      case 'contractors': return <HardHat className="w-5 h-5" />;
      case 'end-to-end': return <Users className="w-5 h-5" />;
      default: return <Plus className="w-5 h-5" />;
    }
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      // Fetch a large number of records to get "all"
      const res = await api.get(`/sales?dept=${activeDept}&limit=10000`);
      const data = res.data || [];
      
      if (data.length === 0) {
        toast.error('No records to export');
        return;
      }

      // Define headers and keys for a comprehensive export
      const baseHeaders = ['ID', 'Department', 'Site/Firm/Customer Name', 'Authorized Person', 'Location/Area', 'Contact Number', 'Address', 'Follow Ups', 'Notes', 'Salesperson'];
      const baseKeys = ['id', 'dept', 'siteName', 'authorizedPersonName', 'location', 'contactNumber', 'address', 'followUps', 'notes', 'salesmanName'];

      // Add extra professional fields
      const extraHeaders = [
        'Architect Name', 'Architect Co', 'Architect Contact',
        'Interior Name', 'Interior Co', 'Interior Contact', 
        'Structural Name', 'Structural Co', 'Structural Contact',
        'Supervisor Name', 'Supervisor Contact', 
        'PMC Name', 'PMC Contact', 
        'Purchase Person', 'Purchase Contact',
        'Alternate Contact'
      ];
      const extraKeys = [
        'architectName', 'architectCompany', 'architectContact',
        'interiorDesignerName', 'interiorCompany', 'interiorDesignerContact',
        'structuralEngineerName', 'structuralEngineerCompany', 'structuralEngineerContact',
        'supervisorName', 'supervisorContact',
        'pmcName', 'pmcContact',
        'purchasePersonName', 'purchasePersonContact',
        'anotherContact'
      ];

      const headers = [...baseHeaders, ...extraHeaders];
      const fieldKeys = [...baseKeys, ...extraKeys];

      // Convert to CSV
      const csvRows = [];
      csvRows.push(headers.join(','));

      for (const row of data) {
        const values = fieldKeys.map(key => {
          let val = row[key];
          
          // Special cases for derived or nested data
          if (key === 'siteName') {
            val = row.siteName || row.firmName || row.contractorOwnerName || row.customerName || '';
          }
          if (key === 'contactNumber') {
            val = row.contactNumber || row.contractorOwnerContact || row.purchasePersonContact || row.customerContact || '';
          }
          if (key === 'followUps') {
            val = (val || []).map((f: any) => `${f.date}: ${f.notes}`).join('; ');
          }

          const escaped = ('' + (val || '')).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `sales_records_${activeDept}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('CSV exported successfully');
    } catch (err) {
      toast.error('Failed to export CSV');
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = (lat?: number, lng?: number, address?: string) => {
    if (lat && lng) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else if (address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 rounded-2xl text-white shadow-lg shadow-slate-200">
              {getDeptIcon()}
            </div>
            {getDeptTitle()} Intelligence
          </h1>
          <p className="text-sm text-slate-500 font-bold tracking-tight mt-3">High-integrity sales pipeline and project engagement monitoring</p>
        </div>

        {filterUserId && (
          <div className="bg-slate-900 border-2 border-primary/20 p-5 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-6 animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-0.5">Filtering activity for</p>
                <p className="text-xl font-black text-white uppercase tracking-tight">{decodeURIComponent(filterUserName || 'Employee')}</p>
              </div>
            </div>
            <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 px-4 rounded-xl text-white/50 hover:text-white hover:bg-white/10 font-bold uppercase tracking-widest text-[9px] flex items-center gap-2"
                onClick={() => {
                  searchParams.delete('userId');
                  searchParams.delete('userName');
                  setSearchParams(searchParams);
                }}
            >
              <CloseIcon className="w-4 h-4" /> Reset view
            </Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Select value={activeDept} onValueChange={(v: SalesDept) => setActiveDept(v)}>
            <SelectTrigger className="w-full sm:w-72 h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-black text-[13px] uppercase tracking-widest text-slate-800">
              <SelectValue placeholder="Switch Department" />
            </SelectTrigger>
            <SelectContent className="rounded-[24px] border-slate-100 shadow-2xl p-2">
              <SelectItem value="builders" className="rounded-xl font-black text-[12px] uppercase tracking-widest py-4">Builder</SelectItem>
              <SelectItem value="architects" className="rounded-xl font-black text-[12px] uppercase tracking-widest py-4">Architecture</SelectItem>
              <SelectItem value="contractors" className="rounded-xl font-black text-[12px] uppercase tracking-widest py-4">Contractor</SelectItem>
              <SelectItem value="end-to-end" className="rounded-xl font-black text-[12px] uppercase tracking-widest py-4">End to End Customer</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex flex-col gap-3">
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setFormData({ followUps: [], date: format(new Date(), 'yyyy-MM-dd') }); } }}>
              <DialogTrigger asChild>
                <Button className="h-12 w-full px-8 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all">
                  <Plus className="w-5 h-5 mr-2" /> CREATE NEW RECORD
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[92vh] rounded-[40px] border-none shadow-2xl p-0 overflow-hidden flex flex-col">
                <div className="bg-slate-900 p-8 text-white shrink-0">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter text-white">
                      {isViewOnly ? 'Reviewing' : (editingId ? 'Updating' : 'Initial Registration')} - {getDeptTitle()}
                    </DialogTitle>
                  </DialogHeader>
                </div>

                <div className="p-10 bg-slate-50/50 overflow-y-auto flex-1">
                  <div className={isViewOnly ? "pointer-events-auto" : ""}>
                    {activeDept === 'builders' && <BuildersForm data={formData} onChange={setFormData} readOnly={isViewOnly} />}
                    {activeDept === 'architects' && <ArchitectsForm data={formData} onChange={setFormData} readOnly={isViewOnly} />}
                    {activeDept === 'contractors' && <ContractorsForm data={formData} onChange={setFormData} readOnly={isViewOnly} />}
                    {activeDept === 'end-to-end' && <EndToEndForm data={formData} onChange={setFormData} readOnly={isViewOnly} />}
                  </div>

                  <DialogFooter className="mt-12 pt-8 border-t border-slate-200">
                    {isViewOnly ? (
                      <>
                        <Button variant="outline" onClick={() => setOpen(false)} className="h-12 rounded-xl border-slate-200 font-bold uppercase tracking-widest text-[10px]">Close Session</Button>
                        <Button onClick={() => setIsViewOnly(false)} className="h-12 rounded-xl bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] px-8">Enable Modifications</Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" onClick={() => setOpen(false)} className="h-12 rounded-xl text-slate-400 font-bold uppercase tracking-widest text-[10px]">Discard Session</Button>
                        <Button onClick={handleSave} className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[10px] px-10 shadow-lg shadow-emerald-100">{editingId ? 'Update Record' : 'Save Record'}</Button>
                      </>
                    )}
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
                onClick={() => navigate('/quotation?action=new')}
                className="h-12 w-full px-8 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all text-left justify-start"
            >
                <FileText className="w-5 h-5 mr-2" /> CREATE QUOTATION
            </Button>
          </div>

          <Button 
            onClick={handleExportCSV}
            variant="outline"
            className="h-14 px-8 rounded-2xl border-slate-200 bg-white text-slate-900 font-black uppercase tracking-widest text-[11px] shadow-xl shadow-slate-200/40 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <FileDown className="w-5 h-5 mr-2 text-primary" /> EXPORT CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center mb-8">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search by name, contact or Area..." className="pl-11 bg-white border-slate-200 h-12 rounded-2xl shadow-xl shadow-slate-200/40 font-bold" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="ml-auto">
          <div className="bg-primary/5 px-4 py-2 rounded-xl flex items-center gap-2 border border-primary/10">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{totalCount} Active Records</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {activeDept === 'builders' && (
                <tr className="bg-slate-900/5 text-[14px] font-black uppercase tracking-[0.15em] text-slate-900 border-b border-slate-200">
                  <th className="py-8 px-6 text-center w-[80px]">#</th>
                  <th className="py-8 px-10 text-left w-[300px]">Site Name</th>
                  <th className="py-8 px-10 text-left hidden sm:table-cell">Authorized Person</th>
                  <th className="py-8 px-10 text-left hidden md:table-cell">Area</th>
                  <th className="py-8 px-10 text-left hidden md:table-cell">Contact No</th>
                  <th className="py-8 px-10 text-left hidden lg:table-cell">Address</th>
                  <th className="py-8 px-10 text-left">Follow ups</th>
                  <th className="py-8 px-10 text-center">Actions</th>
                </tr>
              )}
              {activeDept === 'architects' && (
                <tr className="bg-slate-900/5 text-[14px] font-black uppercase tracking-[0.15em] text-slate-900 border-b border-slate-200">
                  <th className="py-8 px-6 text-center w-[80px]">#</th>
                  <th className="py-8 px-10 text-left w-[300px]">Firm Name</th>
                  <th className="py-8 px-10 text-left hidden sm:table-cell">Authorized Person</th>
                  <th className="py-8 px-10 text-left hidden md:table-cell">Area</th>
                  <th className="py-8 px-10 text-left hidden md:table-cell">Contact Phone</th>
                  <th className="py-8 px-10 text-left hidden lg:table-cell">Address</th>
                  <th className="py-8 px-10 text-left">Follow ups</th>
                  <th className="py-8 px-10 text-center">Actions</th>
                </tr>
              )}
              {activeDept === 'contractors' && (
                <tr className="bg-slate-900/5 text-[14px] font-black uppercase tracking-[0.15em] text-slate-900 border-b border-slate-200">
                  <th className="py-8 px-6 text-center w-[80px]">#</th>
                  <th className="py-8 px-10 text-left w-[300px]">Contractor / Owner</th>
                  <th className="py-8 px-10 text-left hidden sm:table-cell">Customer Name</th>
                  <th className="py-8 px-10 text-left hidden md:table-cell">Area</th>
                  <th className="py-8 px-10 text-left hidden md:table-cell">Contact No</th>
                  <th className="py-8 px-10 text-left hidden lg:table-cell">Address</th>
                  <th className="py-8 px-10 text-left">Follow ups</th>
                  <th className="py-8 px-10 text-center">Actions</th>
                </tr>
              )}
              {activeDept === 'end-to-end' && (
                <tr className="bg-slate-900/5 text-[14px] font-black uppercase tracking-[0.15em] text-slate-900 border-b border-slate-200">
                  <th className="py-8 px-6 text-center w-[80px]">#</th>
                  <th className="py-8 px-10 text-left w-[300px]">Customer Name</th>
                  <th className="py-8 px-10 text-left hidden sm:table-cell">Alternate Name</th>
                  <th className="py-8 px-10 text-left hidden md:table-cell">Area</th>
                  <th className="py-8 px-10 text-left hidden md:table-cell">Contact No</th>
                  <th className="py-8 px-10 text-left hidden lg:table-cell">Address</th>
                  <th className="py-8 px-10 text-left">Follow ups</th>
                  <th className="py-8 px-10 text-center">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary opacity-20" />
                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Synchronizing database records...</p>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-40">
                      <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center">
                        <Users className="w-10 h-10 text-slate-300" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Zero records found in this pipeline</p>
                        <p className="text-xs font-bold text-slate-400 tracking-tight">Initiate a new record registration to populate this data stream</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((r, index) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-all duration-300 group">
                    <td className="px-6 py-7 text-center text-slate-400 font-extrabold tabular-nums">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    {activeDept === 'builders' && (
                      <>
                        <td className="px-10 py-7">
                          <p className="text-base font-bold text-slate-900 uppercase tracking-tight">{r.siteName}</p>
                        </td>
                        <td className="px-10 py-7 text-slate-800 font-semibold uppercase tracking-tight hidden sm:table-cell">{r.authorizedPersonName || '---'}</td>
                        <td className="px-10 py-7 text-slate-600 font-semibold tracking-tight hidden md:table-cell">{r.location || '---'}</td>
                        <td className="px-10 py-7 text-slate-600 font-semibold tracking-tight hidden md:table-cell">{r.contactNumber || '---'}</td>
                      </>
                    )}
                    {activeDept === 'architects' && (
                      <>
                        <td className="px-10 py-7">
                          <p className="text-base font-bold text-slate-900 uppercase tracking-tight">{r.firmName}</p>
                        </td>
                        <td className="px-10 py-7 text-slate-800 font-semibold uppercase tracking-tight hidden sm:table-cell">{r.authorizedPersonName || '---'}</td>
                        <td className="px-10 py-7 text-slate-600 font-semibold tracking-tight hidden md:table-cell">{r.location || '---'}</td>
                        <td className="px-10 py-7 text-slate-600 font-semibold tracking-tight hidden md:table-cell">{r.purchasePersonContact || '---'}</td>
                      </>
                    )}
                    {activeDept === 'contractors' && (
                      <>
                        <td className="px-10 py-7">
                          <p className="text-base font-bold text-slate-900 uppercase tracking-tight">{r.contractorOwnerName}</p>
                        </td>
                        <td className="px-10 py-7 text-slate-800 font-semibold uppercase tracking-tight hidden sm:table-cell">{r.customerName || '---'}</td>
                        <td className="px-10 py-7 text-slate-600 font-semibold tracking-tight hidden md:table-cell">{r.location || '---'}</td>
                        <td className="px-10 py-7 text-slate-600 font-semibold tracking-tight hidden md:table-cell">{r.contractorOwnerContact || r.contactNumber || '---'}</td>
                      </>
                    )}
                    {activeDept === 'end-to-end' && (
                      <>
                        <td className="px-10 py-7">
                          <p className="text-base font-bold text-slate-900 uppercase tracking-tight">{r.customerName}</p>
                        </td>
                        <td className="px-10 py-7 text-slate-800 font-semibold uppercase tracking-tight hidden sm:table-cell">{r.anotherName || '---'}</td>
                        <td className="px-10 py-7 text-slate-600 font-semibold tracking-tight hidden md:table-cell">{r.location || '---'}</td>
                        <td className="px-10 py-7 text-slate-600 font-semibold tracking-tight hidden md:table-cell">{r.contactNumber || '---'}</td>
                      </>
                    )}
                    <td className="px-10 py-7 hidden lg:table-cell">
                      {(r.lat && r.lng) || r.address ? (
                        <button
                          onClick={() => openInGoogleMaps(r.lat, r.lng, r.address)}
                          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-[11px] font-black uppercase tracking-widest"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Site Map
                        </button>
                      ) : (
                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Undefined</span>
                      )}
                    </td>
                    <td className="px-10 py-7">
                      {r.followUps && r.followUps.length > 0 ? (
                        (() => {
                          const today = new Date();
                          const timestamps = r.followUps.map((f: any) => new Date(f.date).getTime()).filter((t: number) => !isNaN(t));
                          if (timestamps.length === 0) return <span className="text-slate-300 italic">---</span>;

                          const lastFollowUpDate = new Date(Math.max(...timestamps));
                          const isFollowUpToday = isSameDay(lastFollowUpDate, today);

                          return (
                            <div className="flex flex-col gap-1">
                              <span className={`text-[11px] font-bold tracking-tight italic ${isFollowUpToday ? 'text-amber-600' : 'text-slate-600'}`}>
                                {format(lastFollowUpDate, 'dd MMM yyyy')}
                              </span>
                              {isFollowUpToday && (
                                <span className="flex items-center gap-1 text-[8px] font-black uppercase text-amber-600 animate-pulse tracking-widest">
                                  <Clock className="w-2.5 h-2.5" /> High Priority
                                </span>
                              )}
                            </div>
                          );
                        })()
                      ) : (
                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">Cold Lead</span>
                      )}
                    </td>
                    <td className="px-10 py-7">
                      <div className="flex justify-end gap-1 transition-all">
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl border border-transparent hover:border-primary/10 transition-all" onClick={() => handleView(r)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl border border-transparent hover:border-amber-100 transition-all" onClick={() => handleEdit(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <CustomPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default SalesPage;
