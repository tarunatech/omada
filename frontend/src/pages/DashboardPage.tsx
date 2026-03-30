import { TrendingUp, FileText, Clock, Users, Loader2, ArrowUpRight, ArrowDownRight, Search, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { CustomPagination } from '@/components/CustomPagination';

const statusClass = (s: string) => {
  if (s === 'Confirmed' || s === 'Contacted') return 'status-badge-success';
  if (s === 'Pending' || s === 'In Progress') return 'status-badge-warning';
  if (s === 'New') return 'status-badge-info';
  return 'status-badge-neutral';
};

const DashboardPage = () => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ kpis: any[], recentQuotations: any[], recentSales: any[] } | null>(null);

  const [quotationCurrentPage, setQuotationCurrentPage] = useState(1);
  const [salesCurrentPage, setSalesCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard');
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    setQuotationCurrentPage(1);
  }, [search]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-pulse">
        <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-primary animate-spin shadow-xl shadow-primary/20" />
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Initialising Core Business Intelligence Analytics...</p>
      </div>
    );
  }

  if (!data) return null;

  const iconMap: any = { FileText, TrendingUp, Clock, Users, Package };

  const filteredQuotations = data.recentQuotations.filter(q => q.customer.toLowerCase().includes(search.toLowerCase()) || q.id.toLowerCase().includes(search.toLowerCase()));
  const totalQuotationPages = Math.ceil(filteredQuotations.length / itemsPerPage);
  const paginatedQuotations = filteredQuotations.slice((quotationCurrentPage - 1) * itemsPerPage, quotationCurrentPage * itemsPerPage);

  const totalSalesPages = Math.ceil(data.recentSales.length / itemsPerPage);
  const paginatedSales = data.recentSales.slice((salesCurrentPage - 1) * itemsPerPage, salesCurrentPage * itemsPerPage);


  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Dashboard</h1>
          <p className="text-sm text-slate-500 font-bold tracking-tight mt-2">Aggregated real-time lifecycle metrics and performance indicators</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.kpis.map(kpi => {
          const Icon = iconMap[kpi.icon] || FileText;
          const isUp = kpi.trend === 'up';
          return (
            <div key={kpi.label} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group relative overflow-hidden">
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className={`p-3.5 rounded-2xl ${kpi.bg} ${kpi.color} shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isUp ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
                  {kpi.change || '+0%'}
                  {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                </div>
              </div>
              <div className="space-y-1 relative z-10">
                <p className="text-[13px] font-black uppercase tracking-[0.15em] text-slate-700">{kpi.label}</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{kpi.value}</p>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-700 group-hover:scale-125">
                <Icon className="w-32 h-32" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Quotations */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-slate-50/30">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Recent Quotations</h2>
            <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-slate-500">Latest estimation generation logs</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search customers..."
              className="w-full pl-11 h-12 text-sm rounded-2xl bg-white border-slate-200 shadow-sm font-bold"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/5 text-[14px] font-black uppercase tracking-[0.15em] text-slate-900 border-b border-slate-200">
                <th className="py-8 px-6 text-center w-[80px]">#</th>
                <th className="py-8 px-10 text-left">CUSTOMER IDENTITY</th>
                <th className="py-8 px-10 text-right">TOTAL ESTIMATE</th>
                <th className="py-8 px-10 text-center hidden md:table-cell">CREATION DATE</th>
                <th className="py-8 px-10 text-center">LIFECYCLE STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {paginatedQuotations.map((q, index) => (
                  <tr key={q.id} className="hover:bg-slate-50 transition-all duration-300 group">
                    <td className="py-6 px-6 text-center text-slate-400 font-extrabold tabular-nums">
                      {(quotationCurrentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="py-6 px-10 text-left">
                      <p className="text-base font-black text-slate-900 uppercase tracking-tight">{q.customer}</p>
                    </td>
                    <td className="py-6 px-10 text-right font-black text-slate-950 text-base tracking-tighter tabular-nums">{q.amount}</td>
                    <td className="py-6 px-10 text-center text-slate-400 font-bold hidden md:table-cell">{q.date}</td>
                    <td className="py-6 px-10 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${q.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100' :
                        q.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100' :
                          'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        
        <CustomPagination
          currentPage={quotationCurrentPage}
          totalPages={totalQuotationPages}
          onPageChange={setQuotationCurrentPage}
        />
      </div>

      {/* Recent Enquiries */}
      <div className="bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
        <div className="p-8 sm:p-10 border-b border-slate-100 bg-slate-50/30">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recent Sales Pipeline</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Activity logs from sales intelligence hub</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/5 text-[12px] font-black uppercase tracking-[0.25em] text-slate-900 border-b border-slate-200">
                <th className="py-8 px-10 text-left">PARTY PROFILE</th>
                <th className="py-8 px-10 text-center hidden sm:table-cell">DEPARTMENT</th>
                <th className="py-8 px-10 text-center hidden lg:table-cell">CONTACT POINT</th>
                <th className="py-8 px-10 text-center hidden md:table-cell">REG DATE</th>
                <th className="py-8 px-10 text-center">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-bold">
              {paginatedSales.map((e, index) => (
                <tr key={e.id} className="hover:bg-slate-50 transition-all duration-300 group">
                  <td className="py-6 px-10 text-left">
                    <p className="text-base font-black text-slate-900 uppercase tracking-tight">{e.party}</p>
                  </td>
                  <td className="py-6 px-10 text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-slate-900 text-white rounded-lg shadow-lg shadow-slate-200">
                      {e.department}
                    </span>
                  </td>
                  <td className="py-6 px-10 text-center text-slate-600 font-black tracking-tighter hidden lg:table-cell">{e.contact}</td>
                  <td className="py-6 px-10 text-center text-slate-400 font-bold hidden md:table-cell">{e.date}</td>
                  <td className="py-6 px-10 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${e.status === 'Contacted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100' :
                      e.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100' :
                        'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <CustomPagination
          currentPage={salesCurrentPage}
          totalPages={totalSalesPages}
          onPageChange={setSalesCurrentPage}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
