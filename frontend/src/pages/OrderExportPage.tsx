import { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FileDown, ImageDown, Plus, Trash2, Loader2, ArrowLeft, Search, Pencil, Save, X, List, SquarePlus, Eye, Building2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { globalSearch } from '@/lib/utils';
import { CustomPagination } from '@/components/CustomPagination';
import { api } from '@/lib/api';
import omadaLogo from '@/assets/omada-logo.png';

interface OrderItem {
  id: string;
  size: string;
  design: string;
  qty: number;
}

interface OrderCategory {
  id: string;
  name: string;
  items: OrderItem[];
}

interface OrderRecord {
  id: string;
  supplier: string;
  party: string;
  city: string;
  state: string;
  referParty: string;
  date: string;
  categories: OrderCategory[];
}

const syncManufacturer = async (name: string) => {
  if (!name) return;
  try {
    const res = await api.get('/master/companies?limit=100');
    const companies = res.data || [];
    const exists = companies.some((c: any) => c.name.toLowerCase() === name.toLowerCase());
    
    if (!exists) {
      await api.post('/master/companies', {
        name,
        type: 'Manufacturer',
        contact: '-',
        status: 'Active'
      });
    }
  } catch (err) {
    console.error('Failed to sync manufacturer:', err);
  }
};

const OrderExportPage = () => {
  const [view, setView] = useState<'list' | 'form' | 'view'>('list');
  const [search, setSearch] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [records, setRecords] = useState<OrderRecord[]>(() => {
    const saved = localStorage.getItem('omada_order_records');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Filter out the old dummy record if it exists
      return parsed.filter((r: any) => r.id !== 'ORD-5001');
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('omada_order_records', JSON.stringify(records));
  }, [records]);

  const [supplier, setSupplier] = useState('');
  const [party, setParty] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [referParty, setReferParty] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<OrderCategory[]>([]);

  const resetForm = () => {
    setSupplier('');
    setCategories([]);
    setEditingId(null);
  };

  const addCategory = () => {
    const id = `cat-${Date.now()}`;
    setCategories([...categories, { id, name: 'New Category', items: [] }]);
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter(c => c.id !== id));
  };

  const addItem = (catId: string) => {
    setCategories(categories.map(c =>
      c.id === catId
        ? { ...c, items: [...c.items, { id: Date.now().toString(), size: '', design: '', qty: 0 }] }
        : c
    ));
  };

  const removeItem = (catId: string, itemId: string) => {
    setCategories(categories.map(c =>
      c.id === catId
        ? { ...c, items: c.items.filter(i => i.id !== itemId) }
        : c
    ));
  };

  const updateItem = (catId: string, itemId: string, field: keyof OrderItem, value: string | number) => {
    setCategories(categories.map(c =>
      c.id === catId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) }
        : c
    ));
  };

  const categorySummary = useMemo(() => {
    return categories.map(c => ({
      category: c.name,
      totalQty: c.items.reduce((sum, item) => sum + Number(item.qty || 0), 0)
    }));
  }, [categories]);

  const handleExportImage = async () => {
    if (!exportRef.current) return;

    setIsExporting(true);
    const toastId = toast.loading('Generating image...');

    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: { padding: '20px' }
      });

      const link = document.createElement('a');
      link.download = `Order_Export_${party}_${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Image exported successfully', { id: toastId });
    } catch (error) {
      toast.error('Failed to export image', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. HEADER (BROWN BOX)
    doc.setFillColor(133, 85, 70); // #855546
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Logo
    doc.addImage(omadaLogo, 'PNG', 20, 20, 24, 8);
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.text('WORLD OF LUXURY', 20, 32);

    // Header Right Text
    doc.setFontSize(7);
    doc.text('PURCHASE ORDER', pageWidth - 20, 20, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(editingId || 'ORD-NEW', pageWidth - 20, 26, { align: 'right' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`ISSUED: ${today.toUpperCase()}`, pageWidth - 20, 32, { align: 'right' });

    // 2. PARTNER CARD (GREY CARD)
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(241, 245, 249);
    doc.roundedRect(15, 60, pageWidth - 30, 30, 4, 4, 'FD');
    
    // Vertical Accent Line for card
    doc.setDrawColor(133, 85, 70);
    doc.setLineWidth(1.5);
    doc.line(17, 65, 17, 85);

    doc.setTextColor(100, 116, 139); // Slate 500
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('MANUFACTURING PARTNER', 23, 68);
    
    doc.setTextColor(17, 24, 39); // Gray 900
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(supplier.toUpperCase(), 23, 76);
    
    doc.setTextColor(133, 85, 70);
    doc.setFontSize(8);
    doc.text('AUTHORIZED MATERIAL SUPPLIER', 23, 83);

    // 3. ITEMS TABLE
    let currentY = 105;

    categories.forEach((cat) => {
      // Category Name
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(cat.name.toUpperCase(), 20, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        margin: { left: 15, right: 15 },
        head: [['SR.', 'DIMENSIONS / SIZE', 'DESCRIPTION', 'QUANTITY']],
        body: cat.items.map((item, idx) => [
          (idx + 1).toString().padStart(2, '0'),
          item.size.toUpperCase(),
          item.design.toUpperCase(),
          item.qty.toLocaleString()
        ]),
        theme: 'grid',
        headStyles: { 
          fillColor: [133, 85, 70], 
          textColor: [255, 255, 255], 
          fontSize: 8, 
          fontStyle: 'bold',
          cellPadding: 4,
          halign: 'left'
        },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        styles: { 
          fontSize: 9, 
          cellPadding: 4, 
          lineColor: [241, 245, 249], 
          lineWidth: 0.1 
        },
        columnStyles: { 
          0: { cellWidth: 15, halign: 'left' },
          3: { halign: 'right', fontStyle: 'bold' } 
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
      
      // Page break check
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
    });

    // 4. FOOTER (BROWN BOX)
    const totalMaterials = categories.reduce((sum, cat) => 
      sum + cat.items.reduce((cSum, i) => cSum + i.qty, 0), 0);

    doc.setFillColor(133, 85, 70);
    doc.rect(0, 260, pageWidth, 37, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('ORDER SUMMARY', pageWidth / 2, 270, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Material Count: ${totalMaterials.toLocaleString()} Boxes`, pageWidth / 2, 280, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('OMADA HOME STUDIO   \u2022   LUXURY MATERIAL PROCUREMENT', pageWidth / 2, 288, { align: 'center' });

    doc.save(`${editingId || 'PO'}_${supplier}.pdf`);
    toast.success('PDF exported successfully');
  };

  const handleSave = () => {
    const newRecord: OrderRecord = {
      id: editingId || `ORD-${5000 + records.length + 1}`,
      supplier,
      party: '-',
      city: '-',
      state: '-',
      referParty: '-',
      date: new Date().toISOString().split('T')[0],
      categories
    };

    if (editingId) {
      setRecords(records.map(r => r.id === editingId ? newRecord : r));
    } else {
      setRecords([newRecord, ...records]);
    }
    syncManufacturer(supplier);
    setView('list');
    resetForm();
    toast.success('Order record saved successfully');
  };

  const handleView = (record: OrderRecord) => {
    setEditingId(record.id);
    setSupplier(record.supplier);
    setParty(record.party);
    setCity(record.city);
    setState(record.state);
    setReferParty(record.referParty);
    setCategories(record.categories);
    setView('view');
  };

  const handleEdit = (record: OrderRecord) => {
    setEditingId(record.id);
    setSupplier(record.supplier);
    setParty(record.party);
    setCity(record.city);
    setState(record.state);
    setReferParty(record.referParty);
    setCategories(record.categories);
    setView('form');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this order record?')) {
      setRecords(records.filter(r => r.id !== id));
      toast.success('Order record deleted');
    }
  };

  const filteredRecords = records.filter(r => globalSearch(r, search));

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalItemCount = useMemo(() => {
    return records.reduce((acc, r) => {
      const itemsInOrder = r.categories.reduce((sum, cat) => sum + cat.items.length, 0);
      return { ...acc, [r.id]: itemsInOrder };
    }, {} as Record<string, number>);
  }, [records]);

  if (view === 'list') {
    return (
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2.5 bg-primary/10 rounded-xl text-primary shadow-sm">
                <SquarePlus className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Order Export Pipeline</h1>
            </div>
            <p className="text-sm text-slate-500 font-bold ml-[52px]">Manage, track and generate official purchase orders for vendors</p>
          </div>
          <Button className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-xs" onClick={() => { resetForm(); setView('form'); }}>
            <Plus className="w-4 h-4 mr-2" /> CREATE NEW ORDER
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by supplier, party, or document ID..."
              className="pl-12 h-12 bg-white border-slate-200 rounded-xl shadow-sm focus-visible:ring-primary/20"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden mt-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-950/5 text-[14px] font-black uppercase tracking-[0.15em] text-slate-950 border-b-2 border-slate-100">
                  <th className="py-8 px-6 text-center w-[80px]">SR NO.</th>
                  <th className="py-8 px-10 text-left">SUPPLIER IDENTIFICATION</th>
                  <th className="py-8 px-10 text-center w-[220px]">DATE ISSUED</th>
                  <th className="py-8 px-10 text-center w-[180px]">CONTENTS</th>
                  <th className="py-8 px-10 text-center w-[220px]">CONTROLS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRecords.map((r, index) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-all duration-300 group">
                    <td className="py-6 px-6 text-center text-slate-400 font-black tabular-nums">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-950/5 flex items-center justify-center text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-all shadow-sm border border-slate-100">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-950 uppercase tracking-tight leading-none mb-2">{r.supplier}</p>
                          <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">{r.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-8 px-10 text-center font-bold text-slate-600 text-sm tracking-wide">
                      {new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-6 px-8 text-center">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                        {totalItemCount[r.id] || 0} ITEMS
                      </span>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex justify-center items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all border border-transparent hover:border-blue-100" onClick={() => handleView(r)}>
                          <Eye className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-all border border-transparent hover:border-indigo-100" onClick={() => handleEdit(r)}>
                          <Pencil className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-20 bg-slate-50/30">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="w-10 h-10 text-slate-200" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No order records matched your search</p>
                      </div>
                    </td>
                  </tr>
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
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-primary transition-all"
            onClick={() => setView('list')}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
              {view === 'view' ? 'Review Purchase Order' : (editingId ? 'Modify Order Record' : 'Create High-Res Export')}
            </h1>
            <p className="text-sm text-slate-500 font-bold tracking-tight">Configuration and preview for vendor-specific material allocation</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button className="h-12 px-8 rounded-xl bg-slate-900 border-2 border-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all font-black uppercase tracking-widest text-xs" onClick={handleExportPDF} disabled={isExporting}>
            <FileDown className="w-4 h-4 mr-2" /> DOWNLOAD PDF
          </Button>
          <Button variant="outline" className="h-12 px-8 rounded-xl border-2 border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-all font-black uppercase tracking-widest text-xs" onClick={handleExportImage} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageDown className="w-4 h-4 mr-2" />}
            GENERATE IMAGE
          </Button>
        </div>
      </div>

      <div ref={exportRef} className={`${isExporting ? 'bg-white w-[850px]' : 'space-y-10'}`}>
        {isExporting && (
           <div className="bg-[#855546] p-12 flex justify-between items-end relative overflow-hidden mb-6">
              <div className="absolute top-0 right-0 w-96 h-96 bg-black/5 rounded-full -mr-48 -mt-48 blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <img src={omadaLogo} className="h-10 mb-8 block" alt="OMADA" />
                <h1 className="text-5xl font-black text-white uppercase tracking-widest leading-none">Purchase Order</h1>
              </div>
              <div className="relative z-10 text-right text-white pb-1">
                <p className="text-[10px] uppercase font-black tracking-[0.4em] opacity-50 mb-3">Order Reference</p>
                <p className="text-4xl font-black mb-1">{editingId || 'NEW'}</p>
                <p className="text-sm font-black opacity-50 tracking-widest">{new Date().toLocaleDateString('en-GB')}</p>
              </div>
           </div>
        )}
        {/* Header Info */}
        <div className={`bg-white ${isExporting ? 'mx-10 mb-8' : ''} rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden`}>
        {!isExporting && (
          <div className="p-8 sm:p-10 border-b border-slate-100 bg-slate-50/30">
            <h3 className="text-lg font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#855546]/10 flex items-center justify-center text-[#855546] shadow-inner">
                <List className="w-4 h-4" />
              </div>
              Order Header Metadata
            </h3>
          </div>
        )}
          <div className="p-8 sm:p-10 bg-slate-50/50">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 bottom-0 w-2 bg-black" />
              <div className="space-y-4 w-full md:w-auto">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">Manufacturing Partner</Label>
                  <Input
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    placeholder="e.g. KAJARIA CERAMICS LTD."
                    className="border-0 p-0 h-auto text-3xl font-black uppercase text-slate-900 bg-transparent focus-visible:ring-0 placeholder:text-slate-200"
                    disabled={view === 'view'}
                  />
                  <div className="text-sm text-[#855546] font-black uppercase tracking-widest mt-1 opacity-80">
                    Authorized Material Supplier
                  </div>
                </div>
              </div>

              <div className="mt-6 md:mt-0 text-left md:text-right border-t md:border-t-0 pt-6 md:pt-0 w-full md:w-auto">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-2">Order Status</div>
                <div className="inline-flex items-center px-6 py-3 rounded-2xl bg-slate-100 text-slate-900 font-black uppercase tracking-[0.1em] text-sm shadow-inner transition-colors">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 animate-pulse" />
                  CONFIRMED
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories and Item Tables */}
        <div className={`${isExporting ? 'mx-10 space-y-8' : 'space-y-12'}`}>
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
              {!isExporting && (
                <div className="p-8 sm:px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-[#855546] text-white flex items-center justify-center shadow-lg shadow-[#855546]/20">
                      <span className="font-black text-xs uppercase tracking-tighter">SEC</span>
                    </div>
                    <Input
                      value={cat.name}
                      onChange={e => setCategories(categories.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                      className="text-xl font-black uppercase tracking-tight border-0 bg-transparent p-0 h-auto focus-visible:ring-0 w-full max-w-[400px] disabled:opacity-100 text-slate-900"
                      placeholder="Enter Category Heading..."
                      disabled={view === 'view'}
                      readOnly={isExporting}
                    />
                  </div>
                  {view !== 'view' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-10 px-6 rounded-xl text-[#855546] border-[#855546]/20 hover:bg-[#855546]/5 font-black uppercase tracking-widest text-[10px]" onClick={() => addItem(cat.id)}>
                        <Plus className="w-3.5 h-3.5 mr-2" /> ADD LINE ITEM
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all" onClick={() => removeCategory(cat.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#855546] text-[10px] font-black uppercase tracking-[0.3em] text-white border-b border-[#764a3d] shadow-sm">
                      <th className="w-20 py-7 px-10 text-left">Sr.</th>
                      <th className="py-7 px-10 text-left">Dimensions / Size</th>
                      <th className="py-7 px-10 text-left">Description</th>
                      <th className="w-56 py-7 px-10 text-right">Quantity Ordered</th>
                      {!isExporting && <th className="w-16 py-7 px-10 text-right"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cat.items.map((item, idx) => (
                      <tr key={item.id} className="group hover:bg-slate-50/50 transition-all">
                        <td className="py-5 px-10 text-slate-400 font-black text-sm">{idx + 1}</td>
                        <td className="py-5 px-10">
                          <Input
                            className={`h-10 text-sm border-0 bg-transparent focus-visible:ring-1 font-black uppercase tracking-tight text-slate-800 ${isExporting ? 'p-0' : ''}`}
                            value={item.size}
                            onChange={e => updateItem(cat.id, item.id, 'size', e.target.value)}
                            placeholder="e.g. 600x1200mm"
                            disabled={view === 'view'}
                            readOnly={isExporting}
                          />
                        </td>
                        <td className="py-5 px-10">
                          <Input
                            className={`h-10 text-sm border-0 bg-transparent focus-visible:ring-1 font-black uppercase tracking-tight text-slate-800 ${isExporting ? 'p-0' : ''}`}
                            value={item.design}
                            onChange={e => updateItem(cat.id, item.id, 'design', e.target.value)}
                            placeholder="e.g. Statuario Marble"
                            disabled={view === 'view'}
                            readOnly={isExporting}
                          />
                        </td>
                        <td className="py-6 px-10">
                          <div className="flex flex-col items-end">
                            <Input
                              type="number"
                              className={`h-10 text-2xl font-black border-0 bg-transparent focus-visible:ring-1 text-right no-spinner text-slate-900 ${isExporting ? 'p-0 h-auto w-full' : ''}`}
                              value={item.qty || ''}
                              onChange={e => updateItem(cat.id, item.id, 'qty', +e.target.value)}
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                              disabled={view === 'view'}
                              readOnly={isExporting}
                            />
                            {isExporting && <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Boxes</span>}
                          </div>
                        </td>
                        {!isExporting && view !== 'view' && (
                          <td className="py-5 px-10 text-right">
                            <Button variant="ghost" size="icon" className="h-9 w-9 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all rounded-lg" onClick={() => removeItem(cat.id, item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {cat.items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-sm text-slate-400 font-bold uppercase tracking-widest">No line items configured yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {!isExporting && view !== 'view' && (
            <Button
              variant="outline"
              onClick={addCategory}
              className="w-full border-4 border-dashed h-20 text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 border-slate-100 rounded-[32px] transition-all font-black uppercase tracking-[0.2em] text-xs shadow-sm"
            >
              <Plus className="w-6 h-6 mr-3" /> ADD NEW CATEGORY SECTION
            </Button>
          )}

          {/* Category Summary */}
          {!isExporting && (
            <div className="bg-[#855546] rounded-[32px] border border-[#764a3d] shadow-2xl overflow-hidden p-8 sm:p-12 text-white relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-[100px]" />
              <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white/40 mb-10 flex items-center gap-4">
                <div className="w-1.5 h-6 bg-white/30 rounded-full" />
                Consolidated Allocation Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {categorySummary.map(s => (s.category && (
                  <div key={s.category} className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">{s.category}</p>
                    <div className="flex items-end gap-3">
                      <p className="text-4xl font-black tracking-tighter text-white">{s.totalQty.toLocaleString()}</p>
                      <p className="text-xs font-black uppercase tracking-widest text-white/60 mb-2">Units</p>
                    </div>
                  </div>
                )))}
                <div className="bg-[#111111] border border-white/10 rounded-3xl p-8 shadow-xl shadow-black/40">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">Grand Total Material</p>
                  <div className="flex items-end gap-3">
                    <p className="text-4xl font-black tracking-tighter text-white">
                      {categorySummary.reduce((sum, s) => sum + s.totalQty, 0).toLocaleString()}
                    </p>
                    <p className="text-xs font-black uppercase tracking-widest text-white/80 mb-2">Boxes</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isExporting && (
             <div className="bg-[#855546] p-16 mt-56 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-black/10" />
                <p className="text-[10px] uppercase font-black tracking-[0.5em] text-white/50 mb-6">Order Summary</p>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Total Material Count: {categorySummary.reduce((sum, s) => sum + s.totalQty, 0).toLocaleString()} Boxes
                </h2>
                <div className="flex items-center justify-center gap-4 text-[11px] font-black text-white/40 uppercase tracking-[0.3em]">
                  <span>Omada Home Studio</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  <span>Luxury Material Procurement</span>
                </div>
             </div>
          )}
        </div>

        {!isExporting && (
          <div className="flex flex-col sm:flex-row gap-4 p-8 bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40">
            {view === 'view' ? (
              <>
                <Button className="h-14 px-10 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs flex-1 shadow-lg shadow-slate-200" onClick={() => setView('form')}>
                  <Pencil className="w-4 h-4 mr-2" /> MODIFY RECORD DETAILS
                </Button>
                <Button variant="outline" className="h-14 px-10 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-xs" onClick={() => setView('list')}>
                  CLOSE PREVIEW
                </Button>
              </>
            ) : (
              <>
                <Button className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-xs flex-1 shadow-lg shadow-emerald-200 transition-all scale-100 active:scale-95" onClick={handleSave}>
                  <Save className="w-4 h-4 mr-2" /> {editingId ? 'SYNCHRONIZE RECORD' : 'COMMIT ORDER RECORD'}
                </Button>
                <Button variant="outline" className="h-14 px-10 rounded-2xl border-2 border-slate-200 text-slate-500 font-bold uppercase tracking-widest text-xs" onClick={() => setView('list')}>
                  DISCARD CHANGES
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderExportPage;
