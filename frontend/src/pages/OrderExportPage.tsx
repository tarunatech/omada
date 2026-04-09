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
  finish: string;
  image?: string;
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

const syncDesigns = async (categories: OrderCategory[], supplierName: string) => {
  try {
    const res = await api.get('/master/products?limit=1000');
    const existing = res.data || [];
    
    for (const cat of categories) {
      for (const item of cat.items) {
        if (!item.design) continue;
        
        const match = existing.find((p: any) => 
          p.design.trim().toLowerCase() === item.design.trim().toLowerCase()
        );

        if (!match) {
          // Auto-register new design with all available details
          await api.post('/master/products', {
            design: item.design.trim(),
            company: supplierName || '-',
            finish: item.finish || '-',
            size: item.size || '-',
            image: item.image || null,
            status: 'Active'
          });
          console.log(`Auto-registered new design: ${item.design}`);
        } else if (!match.image && item.image) {
          // If design exists but has NO image, update it with the new image
          await api.patch(`/master/products/${match.id}`, {
            image: item.image
          });
          console.log(`Updated existing design with image: ${item.design}`);
        }
      }
    }
  } catch (err) {
    console.error('Failed to sync designs:', err);
  }
};

const OrderExportPage = () => {
  const [view, setView] = useState<'list' | 'form' | 'view'>('list');
  const [search, setSearch] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [records, setRecords] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/quotations?type=OrderExport&page=${currentPage}&limit=${itemsPerPage}&search=${search}`);
      const mapped = (res.data || []).map((r: any) => {
        const [city, state] = (r.siteAddress || '').split(', ');
        return {
          ...r,
          supplier: r.companyName,
          party: r.customerName,
          referParty: r.salesRef,
          city: city || '-',
          state: state || '-'
        };
      });
      setRecords(mapped);
      setTotalPages(res.pagination.totalPages || 1);
    } catch (err) {
      toast.error('Failed to fetch orders from server');
    } finally {
      setLoading(false);
    }
  };

  const [masterProducts, setMasterProducts] = useState<any[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState<{ catId: string, itemId: string } | null>(null);

  const fetchMasterProducts = async () => {
    try {
      const res = await api.get('/master/products?limit=2000');
      setMasterProducts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch master products:', err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMasterProducts();
  }, [search, currentPage]);

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
    setParty('');
    setCity('');
    setState('');
    setReferParty('');
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
        ? { ...c, items: [...c.items, { id: Date.now().toString(), size: '', design: '', finish: '', qty: 0 }] }
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
    setCategories(prev => prev.map(c =>
      c.id === catId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, [field]: value } : i) }
        : c
    ));
  };

  const updateItemFields = (catId: string, itemId: string, fields: Partial<OrderItem>) => {
    setCategories(prev => prev.map(c =>
      c.id === catId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, ...fields } : i) }
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
    const toastId = toast.loading('Formatting professional document...');

    try {
      // WAIT for React to re-render the flat document layout
      await new Promise(resolve => setTimeout(resolve, 1000));

      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        width: 850,
        pixelRatio: 2,
        style: {
          margin: '0',
          padding: '0',
          borderRadius: '0',
          boxShadow: 'none'
        }
      });

      const link = document.createElement('a');
      link.download = `PO_${supplier.replace(/\s+/g, '_') || 'Omada'}_${editingId || 'Order'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Professional Document Image exported', { id: toastId });
    } catch (error) {
      console.error('Export fail:', error);
      toast.error('Failed to export. Please try again.', { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. BRANDED HEADER (BROWN BOX)
    doc.setFillColor(133, 85, 70);
    doc.rect(0, 0, pageWidth, 55, 'F');

    // Logo & Tagline (Left)
    doc.addImage(omadaLogo, 'PNG', 15, 12, 40, 10);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('WORLD OF LUXURY', 15, 27, { charSpace: 1.5 });

    // Order ID & Date (Right)
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('PURCHASE ORDER', pageWidth - 15, 18, { align: 'right', charSpace: 2 });
    
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(editingId || 'NEW-ORDER', pageWidth - 15, 30, { align: 'right' });

    // Issued Pill
    const dateStr = `ISSUED: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()}`;
    doc.setFontSize(8);
    doc.setFillColor(255, 255, 255, 0.15); // Glass effect
    doc.roundedRect(pageWidth - 65, 35, 50, 6, 3, 3, 'F');
    doc.text(dateStr, pageWidth - 15, 39, { align: 'right', charSpace: 1 });

    // 2. PARTNER INFO BAR (BOTTOM OF HEADER)
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, 65, pageWidth - 30, 25, 4, 4, 'S'); // Outline card
    
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text('MANUFACTURING PARTNER', 25, 75);
    
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(supplier.toUpperCase() || 'E.G. KAJARIA CERAMICS LTD.', 25, 83);

    // 3. ITEMS TABLE
    let currentY = 105;

    categories.forEach((cat) => {
      // Category Name Banner
      doc.setFillColor(248, 250, 252);
      doc.rect(15, currentY - 5, pageWidth - 30, 8, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(cat.name.toUpperCase() || 'ORDER ITEMS', 20, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        margin: { left: 15, right: 15 },
        head: [['SR.', 'PHOTO', 'DESIGN', 'FINISH', 'SIZE', 'QUANTITY']],
        body: cat.items.map((item, idx) => [
          (idx + 1).toString().padStart(2, '0'),
          '', // Placeholder for image
          item.design.toUpperCase(),
          item.finish.toUpperCase(),
          item.size.toUpperCase(),
          item.qty.toLocaleString()
        ]),
        didDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            const item = cat.items[data.row.index];
            if (item.image) {
              const x = data.cell.x + 2;
              const y = data.cell.y + 2;
              const w = data.cell.width - 4;
              const h = data.cell.height - 4;
              try {
                doc.addImage(item.image, 'JPEG', x, y, w, h);
              } catch(e) {}
            }
          }
        },
        theme: 'grid',
        headStyles: { 
          fillColor: [133, 85, 70], 
          textColor: [255, 255, 255], 
          fontSize: 7, 
          fontStyle: 'bold',
          cellPadding: 4,
          halign: 'left'
        },
        styles: { 
          fontSize: 8, 
          cellPadding: 4, 
          lineColor: [226, 232, 240], 
          lineWidth: 0.1,
          minCellHeight: 20,
          valign: 'middle'
        },
        columnStyles: { 
          0: { cellWidth: 10, halign: 'left' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 'auto', fontStyle: 'bold', halign: 'left' },
          3: { cellWidth: 25, halign: 'left' },
          4: { cellWidth: 25, halign: 'left' },
          5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' } 
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

    const footerY = 260;
    doc.setFillColor(133, 85, 70);
    doc.rect(0, footerY, pageWidth, 37, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('ORDER SUMMARY', pageWidth / 2, footerY + 10, { align: 'center', charSpace: 2 });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total Material Count: ${totalMaterials.toLocaleString()} Boxes`, pageWidth / 2, footerY + 20, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const footerText = 'OMADA HOME STUDIO   •   LUXURY MATERIAL PROCUREMENT';
    doc.text(footerText.toUpperCase(), pageWidth / 2, footerY + 30, { align: 'center', charSpace: 1.5 });

    doc.save(`${editingId || 'PO'}_${supplier}.pdf`);
    toast.success('PDF exported successfully');
  };

  const handleSave = async () => {
    if (!supplier) {
      toast.error('Manufacturing Partner is required');
      return;
    }

    const newRecord: any = {
      id: editingId || `ORD-TEMP-${Date.now()}`, // Temporary ID, backend will overwrite with sequence
      customerName: supplier,
      companyName: supplier,
      mobile: '-',
      salesRef: referParty || '-',
      date: new Date().toISOString().split('T')[0],
      grandTotal: 0,
      categories: categories.map(c => ({
        ...c,
        items: c.items.map(i => ({
            ...i,
            company: supplier, // Link each item to the selected supplier
            total: 0,
            multiplier: 1, // Store default for order items
            unitPrice: 0
        }))
      })),
      siteAddress: `${city || '-'}, ${state || '-'}`,
      referenceInfo: '-',
      status: 'Final',
      type: 'OrderExport'
    };

    try {
        if (editingId) {
            await api.put(`/quotations/${encodeURIComponent(editingId)}`, newRecord);
            toast.success('Order record synchronized');
        } else {
            await api.post('/quotations', newRecord);
            toast.success('Order record committed to server');
        }
        
        await syncManufacturer(supplier);
        await syncDesigns(categories, supplier);
        
        fetchOrders();
        setView('list');
        resetForm();
    } catch (err) {
        toast.error('Failed to save order to server');
    }
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

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this order record? This will remove it from all computers.')) {
      try {
          await api.delete(`/quotations/${encodeURIComponent(id)}`);
          toast.success('Order record deleted from server');
          fetchOrders();
      } catch (err) {
          toast.error('Failed to delete record');
      }
    }
  };

  const filteredRecords = records; // Server handles filtering

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const paginatedRecords = records; // Server handles pagination

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

      <div ref={exportRef} className={`${isExporting ? 'bg-white w-[850px] !p-0 !m-0 flex flex-col overflow-hidden' : 'space-y-10'}`}>
        {isExporting && (
           <div className="bg-[#855546] w-full p-12 flex justify-between items-start mb-12 border-0">
              <div className="flex flex-col gap-3">
                <img src={omadaLogo} className="h-12 mb-1 block" alt="OMADA" />
                <p className="text-[10px] uppercase font-bold text-white tracking-[0.3em] opacity-90">World of Luxury</p>
              </div>
              <div className="text-right text-white flex flex-col items-end gap-1">
                <p className="text-[10px] uppercase font-bold tracking-[0.4em] mb-2 opacity-80">Purchase Order</p>
                <div className="text-4xl font-black tracking-tighter mb-2">{editingId || 'NEW-ORDER'}</div>
                <p className="text-[11px] font-bold opacity-80 uppercase tracking-[0.15em] bg-white/10 px-3 py-1 rounded-full">
                  Issued: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
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
          <div className={`${isExporting ? 'bg-white border border-slate-200 p-8' : 'bg-white border border-slate-100 rounded-2xl p-8 shadow-sm'} flex flex-col md:flex-row justify-between items-start md:items-center relative`}>
            {isExporting ? (
               <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#855546]" />
            ) : (
               <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-black" />
            )}
            <div className="space-y-4 w-full md:w-auto">
              <div>
                <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2 block">Manufacturing Partner</Label>
                {isExporting ? (
                  <p className="text-2xl font-black uppercase text-slate-900">{supplier || 'E.G. KAJARIA CERAMICS LTD.'}</p>
                ) : (
                  <Input
                    value={supplier}
                    onChange={e => setSupplier(e.target.value)}
                    placeholder="e.g. KAJARIA CERAMICS LTD."
                    className="border-0 p-0 h-auto text-2xl font-black uppercase text-slate-900 bg-transparent focus-visible:ring-0 placeholder:text-slate-200"
                    disabled={view === 'view'}
                  />
                )}
                <div className="text-[11px] text-[#855546] font-bold uppercase tracking-widest mt-1">
                  Authorized Material Supplier
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories and Item Tables */}
        <div className={`${isExporting ? 'mx-10 space-y-8' : 'space-y-12'}`}>
          {categories.map((cat) => (
            <div key={cat.id} className={isExporting ? 'mb-12' : 'bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-visible'}>
              {isExporting ? (
                 <p className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4 px-4">{cat.name || 'ORDER ITEMS'}</p>
              ) : (
                <div className="p-8 sm:px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  {/* ... (keep input as is for editor) ... */}
                </div>
              )}

                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-[#855546] text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                      <th className="w-16 py-4 px-4 text-left border border-[#764a3d] rounded-none">SR.</th>
                      <th className="w-24 py-4 px-4 text-left border border-[#764a3d] rounded-none">PHOTO</th>
                      <th className="py-4 px-4 text-left border border-[#764a3d] rounded-none">DESIGN</th>
                      <th className="w-32 py-4 px-4 text-left border border-[#764a3d] rounded-none">FINISH</th>
                      <th className="w-32 py-4 px-4 text-left border border-[#764a3d] rounded-none">SIZE</th>
                      <th className="w-24 py-4 px-4 text-right border border-[#764a3d] rounded-none">QUANTITY</th>
                      {!isExporting && view !== 'view' && <th className="w-16 py-4 px-4 text-right border border-[#764a3d] rounded-none"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cat.items.map((item, idx) => (
                      <tr key={item.id} className="group transition-all">
                        <td className="py-3 px-4 text-left text-slate-500 font-bold text-xs border border-slate-200 uppercase !rounded-none">{(idx + 1).toString().padStart(2, '0')}</td>
                        
                        {/* PHOTO COLUMN */}
                        <td className="py-3 px-4 border border-slate-200 !rounded-none">
                          <div className="flex flex-col items-center gap-2">
                            {item.image ? (
                              <div className="relative group/img">
                                <img src={item.image} className="w-14 h-14 object-cover rounded-md border border-slate-200" alt="Item" />
                                {!isExporting && view !== 'view' && (
                                  <button 
                                    onClick={() => updateItem(cat.id, item.id, 'image', '')}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              !isExporting && view !== 'view' && (
                                <label className="w-12 h-12 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-[#855546] hover:bg-[#855546]/5 transition-all">
                                  <Plus className="w-4 h-4 text-slate-300" />
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                          updateItem(cat.id, item.id, 'image', reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                  />
                                </label>
                              )
                            )}
                          </div>
                        </td>

                        {/* DESIGN COLUMN - Expanding column */}
                        <td className="py-3 px-4 border border-slate-200 !rounded-none relative overflow-visible">
                          {isExporting || view === 'view' ? (
                             <p className="text-xs font-bold text-slate-900 uppercase whitespace-normal break-words leading-tight">{item.design}</p>
                          ) : (
                             <div className="relative">
                               <Input 
                                 value={item.design} 
                                 onFocus={() => setActiveSuggestion({ catId: cat.id, itemId: item.id })}
                                 onBlur={() => {
                                   setTimeout(() => setActiveSuggestion(null), 200);
                                 }}
                                 onChange={e => {
                                   updateItem(cat.id, item.id, 'design', e.target.value);
                                   setActiveSuggestion({ catId: cat.id, itemId: item.id });
                                 }}
                                 className="h-8 border-0 p-0 text-xs font-bold text-slate-900 bg-transparent focus-visible:ring-0 placeholder:text-slate-200 uppercase"
                                 placeholder="ITEM DESIGN"
                               />
                               {activeSuggestion?.catId === cat.id && activeSuggestion?.itemId === item.id && item.design && item.design.length > 1 && (
                                 <div className="absolute top-full left-0 w-64 bg-white border border-slate-200 shadow-xl rounded-xl mt-1 z-[100] max-h-48 overflow-y-auto overflow-x-hidden">
                                   {masterProducts
                                     .filter(p => p.design.toLowerCase().includes(item.design.toLowerCase()))
                                     .slice(0, 10)
                                     .map((p, idx) => (
                                       <button
                                         key={p.id || idx}
                                         className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                                         onMouseDown={(e) => {
                                           e.preventDefault(); // Prevent input blur before this fires
                                           updateItemFields(cat.id, item.id, {
                                             design: p.design,
                                             finish: p.finish,
                                             size: p.size,
                                             image: p.image || undefined
                                           });
                                           setActiveSuggestion(null);
                                         }}
                                       >
                                         <div className="flex items-center gap-3">
                                           {p.image ? (
                                             <img src={p.image} className="w-8 h-8 rounded object-cover border border-slate-100" />
                                           ) : (
                                             <div className="w-8 h-8 rounded bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 font-bold border border-slate-100">NA</div>
                                           )}
                                           <div>
                                             <p className="text-[10px] font-black uppercase tracking-tight text-slate-900 leading-none mb-1">{p.design}</p>
                                             <div className="flex items-center gap-2">
                                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.size}</p>
                                               <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                               <p className="text-[8px] font-bold text-primary uppercase tracking-widest">{p.finish}</p>
                                             </div>
                                           </div>
                                         </div>
                                       </button>
                                     ))
                                   }
                                 </div>
                               )}
                             </div>
                          )}
                        </td>

                        {/* FINISH COLUMN */}
                        <td className="py-3 px-4 border border-slate-200 !rounded-none w-32">
                          {isExporting || view === 'view' ? (
                             <p className="text-xs font-medium text-slate-600 uppercase whitespace-normal break-words leading-relaxed">{item.finish}</p>
                          ) : (
                             <Input 
                               value={item.finish} 
                               onChange={e => updateItem(cat.id, item.id, 'finish', e.target.value)}
                               className="h-8 border-0 p-0 text-xs font-medium text-slate-600 bg-transparent focus-visible:ring-0 placeholder:text-slate-200 uppercase"
                               placeholder="e.g. GLOSSY"
                             />
                          )}
                        </td>

                        {/* SIZE COLUMN */}
                        <td className="py-3 px-4 border border-slate-200 !rounded-none">
                          {isExporting || view === 'view' ? (
                             <p className="text-xs font-medium text-slate-600 uppercase whitespace-normal break-words leading-relaxed">{item.size}</p>
                          ) : (
                             <Input 
                               value={item.size} 
                               onChange={e => updateItem(cat.id, item.id, 'size', e.target.value)}
                               className="h-8 border-0 p-0 text-xs font-medium text-slate-600 bg-transparent focus-visible:ring-0 placeholder:text-slate-200 uppercase"
                               placeholder="SIZE/DIM."
                             />
                          )}
                        </td>



                        {/* QUANTITY COLUMN */}
                        <td className="py-3 px-4 border border-slate-200 text-right font-black !rounded-none">
                          {isExporting || view === 'view' ? (
                             <p className="text-sm font-black text-slate-900">{item.qty || 0}</p>
                          ) : (
                             <Input 
                               type="number"
                               value={item.qty} 
                               onChange={e => updateItem(cat.id, item.id, 'qty', e.target.value)}
                               className="h-8 border-0 p-0 text-sm font-black text-slate-900 bg-transparent focus-visible:ring-0 text-right"
                             />
                          )}
                        </td>
                        {!isExporting && view !== 'view' && (
                          <td className="py-3 px-4 text-right border border-slate-200 w-16">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500" onClick={() => removeItem(cat.id, item.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {!isExporting && view !== 'view' && (
                      <tr>
                        <td colSpan={7} className="p-0">
                           <Button 
                            variant="ghost" 
                            className="w-full h-10 rounded-none border-t border-slate-100 text-primary hover:bg-primary/5 font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                            onClick={() => addItem(cat.id)}
                           >
                             <Plus className="w-3 h-3" /> ADD NEW LINE ITEM
                           </Button>
                        </td>
                      </tr>
                    )}
                    {cat.items.length === 0 && isExporting && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-sm text-slate-400 font-bold uppercase tracking-widest">No line items configured yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
            <div className="flex-1 min-h-[400px]"></div>
          )}

          {isExporting && (
             <div className="bg-[#855546] p-10 text-center relative mt-auto">
                <p className="text-[8px] uppercase font-bold text-white/40 tracking-[0.4em] mb-4">Order Summary</p>
                <h2 className="text-2xl font-black text-white mb-3">
                  Total Material Count: {categorySummary.reduce((sum, s) => sum + s.totalQty, 0).toLocaleString()} Boxes
                </h2>
                <div className="flex items-center justify-center gap-4 text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">
                  <span>Omada Home Studio</span>
                  <div className="w-1 h-1 rounded-full bg-white/20" />
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
