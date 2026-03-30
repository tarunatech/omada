import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, FileDown, Share2, Save, Eye, Pencil, ImagePlus, X, ArrowLeft, Search, LayoutList, Users } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import omadaLogo from '@/assets/omada-logo.png';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { globalSearch } from '@/lib/utils';
import { CustomPagination } from '@/components/CustomPagination';

interface SampleItem {
    id: string;
    company: string;
    design: string;
    qty: number;
    image: string | null;
}

interface Category {
    id: string;
    name: string;
    items: SampleItem[];
}

interface SampleRecord {
    id: string;
    customerName: string;
    mobile: string;
    salesRef: string;
    date: string;
    categories: Category[];
    siteAddress: string;
    referenceInfo: string;
    customerLogo: string | null;
    status: 'Pending' | 'Final';
    type: 'Sample';
}

const SampleManagementPage = () => {
    const [view, setView] = useState<'list' | 'form' | 'view'>('list');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<SampleRecord[]>([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 10;
    const [masterProducts, setMasterProducts] = useState<any[]>([]);
    const [masterCompanies, setMasterCompanies] = useState<any[]>([]);

    const fetchSamples = async () => {
        try {
            setLoading(true);
            const data = await api.get(`/quotations?type=Sample&page=${currentPage}&limit=${itemsPerPage}&search=${search}`);
            setRecords(data.data || []);
            setTotalPages(data.pagination.totalPages || 1);
        } catch (err) {
            toast.error('Failed to fetch samples');
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterData = async () => {
        try {
            // Fetch a larger set for suggestions
            const [productsRes, companiesRes] = await Promise.all([
                api.get('/master/products?limit=1000'),
                api.get('/master/companies?limit=1000')
            ]);
            setMasterProducts(productsRes.data || []);
            setMasterCompanies(companiesRes.data || []);
        } catch (err) {
            console.error('Failed to fetch master data', err);
        }
    };

    useEffect(() => {
        fetchSamples();
    }, [currentPage, search]);

    useEffect(() => {
        fetchMasterData();
    }, []);

    const [customerName, setCustomerName] = useState('');
    const [mobile, setMobile] = useState('');
    const [salesRef, setSalesRef] = useState('');
    const [siteAddress, setSiteAddress] = useState('');
    const [referenceInfo, setReferenceInfo] = useState('');
    const [customerLogo, setCustomerLogo] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);

    const resetForm = () => {
        setCustomerName('');
        setMobile('');
        setSalesRef('');
        setSiteAddress('');
        setReferenceInfo('');
        setCustomerLogo(null);
        setCategories([]);
        setEditingId(null);
    };

    const addCategory = () => {
        const id = Date.now().toString();
        setCategories([...categories, { id, name: 'New Section', items: [] }]);
    };

    const addItem = (catId: string) => {
        setCategories(categories.map(c =>
            c.id === catId
                ? { ...c, items: [...c.items, { id: `${catId}-${Date.now()}`, company: '', design: '', qty: 0, image: null }] }
                : c
        ));
    };

    const updateItem = (catId: string, itemId: string, field: keyof SampleItem, value: any) => {
        setCategories(categories.map(c =>
            c.id === catId
                ? {
                    ...c, items: c.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
                }
                : c
        ));
    };

    const removeItem = (catId: string, itemId: string) => {
        setCategories(categories.map(c =>
            c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c
        ));
    };

    const removeCategory = (catId: string) => {
        setCategories(categories.filter(c => c.id !== catId));
    };

    const handleSave = async () => {
        // Generate a new ID if not editing
        let finalId = editingId;
        if (!finalId) {
            const lastNum = records.length > 0
                ? parseInt(records[0].id.split('-')[1]) || 1000
                : 1000;
            finalId = `S-${lastNum + 1}`;
        }

        const newRecord: SampleRecord = {
            id: finalId,
            customerName,
            mobile,
            salesRef,
            date: new Date().toISOString().split('T')[0],
            categories,
            siteAddress,
            referenceInfo,
            customerLogo,
            status: editingId ? (records.find(r => r.id === editingId)?.status || 'Pending') : 'Pending',
            type: 'Sample'
        };

        try {
            if (editingId) {
                await api.put(`/quotations/${editingId}`, newRecord);
                toast.success('Sample record updated');
            } else {
                await api.post('/quotations', newRecord);
                toast.success('Sample record saved');
            }

            fetchSamples();
            setView('list');
            resetForm();
        } catch (err) {
            toast.error('Failed to save sample record');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this sample record?')) return;
        try {
            await api.delete(`/quotations/${id}`);
            setRecords(records.filter(r => r.id !== id));
            toast.success('Sample record deleted');
        } catch (err) {
            toast.error('Failed to delete sample record');
        }
    };

    const handleView = (record: SampleRecord) => {
        setEditingId(record.id);
        setCustomerName(record.customerName);
        setMobile(record.mobile);
        setSalesRef(record.salesRef);
        setSiteAddress(record.siteAddress);
        setReferenceInfo(record.referenceInfo);
        setCustomerLogo(record.customerLogo);
        setCategories(record.categories);
        setView('view');
    };

    const handleEdit = (record: SampleRecord) => {
        setEditingId(record.id);
        setCustomerName(record.customerName);
        setMobile(record.mobile);
        setSalesRef(record.salesRef);
        setSiteAddress(record.siteAddress);
        setReferenceInfo(record.referenceInfo);
        setCustomerLogo(record.customerLogo);
        setCategories(record.categories);
        setView('form');
    };

    // Sorting is now partially handled by server-side newest first, 
    // but the local filtered list still needs to match paginated view.
    const paginatedRecords = [...records].sort((a, b) => {
        if (a.status === 'Final' && b.status !== 'Final') return -1;
        if (a.status !== 'Final' && b.status === 'Final') return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const renderPageToCanvas = async (html: string): Promise<HTMLCanvasElement> => {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = '-9999px';
        div.style.width = '210mm';
        div.innerHTML = html;
        document.body.appendChild(div);
        const canvas = await html2canvas(div, { scale: 2, useCORS: true });
        document.body.removeChild(div);
        return canvas;
    };

    const handleGeneratePDF = async (record?: SampleRecord) => {
        const data = record || {
            customerName,
            mobile,
            salesRef,
            siteAddress,
            date: new Date().toLocaleDateString('en-GB'),
            id: editingId || 'S-NEW',
            categories
        };

        const html = `
            <div style="width: 210mm; min-height: 297mm; display: flex; flex-direction: column; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1A1A1A; background: #000000; padding: 0; box-sizing: border-box; position: relative; overflow: hidden;">
                <!-- FRAME -->
                <div style="position: absolute; top: -1px; left: -1px; right: -1px; height: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>
                <div style="position: absolute; bottom: -1px; left: -1px; right: -1px; height: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>
                <div style="position: absolute; top: -1px; left: -1px; bottom: -1px; width: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>
                <div style="position: absolute; top: -1px; right: -1px; bottom: -1px; width: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>
                
                <div style="flex: 1; display: flex; flex-direction: column; padding: 2.5mm; position: relative; background: #ffffff;">
                    <!-- HEADER -->
                    <div style="background: #855546; padding: 40px 60px 40px 60px; display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <img src="${omadaLogo}" style="height: 45px; margin-bottom: 30px; display: block; filter: brightness(0) invert(1);" />
                            <h1 style="font-size: 32px; font-weight: 900; color: #ffffff; margin: 0; letter-spacing: 2px; text-transform: uppercase;">Sample Slip</h1>
                        </div>
                        <div style="text-align: right; color: #ffffff;">
                            <div style="font-size: 10px; font-weight: 800; opacity: 0.7; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">Reference ID</div>
                            <div style="font-size: 22px; font-weight: 900;">${data.id}</div>
                            <div style="font-size: 11px; opacity: 0.6; margin-top: 5px;">${data.date}</div>
                        </div>
                    </div>

                    <!-- CUSTOMER INFO -->
                    <div style="padding: 40px 60px 0 60px; display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px;">
                        <div>
                            <div style="font-size: 9px; font-weight: 900; color: #855546; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Consignee Profile</div>
                            <div style="font-size: 20px; font-weight: 950; color: #111111; text-transform: uppercase; margin-bottom: 5px;">${data.customerName || 'Pending Identification'}</div>
                            <div style="font-size: 13px; font-weight: 700; color: #444;">${data.mobile || ''}</div>
                            <div style="font-size: 11px; color: #666; margin-top: 10px; font-weight: 500;">${data.siteAddress || ''}</div>
                        </div>
                        <div>
                            <div style="font-size: 9px; font-weight: 900; color: #855546; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Logistic Context</div>
                            <div style="font-size: 14px; font-weight: 900; color: #111111; margin-bottom: 3px;">Issued By: ${data.salesRef || 'System Gen'}</div>
                            <div style="font-size: 11px; color: #855546; font-weight: 800; text-transform: uppercase;">Official Sample Transfer</div>
                        </div>
                    </div>

                    <!-- CONTENT -->
                    <div style="padding: 40px 60px 60px 60px; flex: 1;">
                        ${data.categories.map(cat => `
                            <div style="margin-bottom: 40px;">
                                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
                                    <div style="width: 4px; height: 18px; background: #855546;"></div>
                                    <h3 style="font-size: 14px; font-weight: 900; color: #111111; text-transform: uppercase; letter-spacing: 2px; margin: 0;">${cat.name}</h3>
                                </div>
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead>
                                        <tr style="background: #FAFAFA; border-bottom: 1.5px solid #111;">
                                            <th style="padding: 15px 10px; text-align: center; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; width: 8%;">Sr.</th>
                                            <th style="padding: 15px 10px; text-align: left; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; width: 15%;">Visual</th>
                                            <th style="padding: 15px 10px; text-align: left; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Material Description</th>
                                            <th style="padding: 15px 10px; text-align: center; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; width: 12%;">Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody style="border-bottom: 1px solid #EEE;">
                                        ${cat.items.map((i, idx) => `
                                            <tr style="border-bottom: 1px solid #F1F1F1;">
                                                <td style="padding: 15px 10px; text-align: center; font-size: 11px; font-weight: 900; color: #855546;">${(idx + 1).toString().padStart(2, '0')}</td>
                                                <td style="padding: 10px;">
                                                    <div style="width: 50px; height: 50px; border-radius: 4px; border: 1px solid #EEE; overflow: hidden;">
                                                        ${i.image ? `<img src="${i.image}" style="width: 100%; height: 100%; object-fit: cover;" />` : '<div style="width:100%; height:100%; background:#F9F9F9;"></div>'}
                                                    </div>
                                                </td>
                                                <td style="padding: 15px 10px;">
                                                    <div style="font-size: 13px; font-weight: 950; color: #111; text-transform: uppercase;">${i.design}</div>
                                                    <div style="font-size: 10px; font-weight: 700; color: #855546; margin-top: 3px;">${i.company}</div>
                                                </td>
                                                <td style="padding: 15px 10px; text-align: center; font-size: 16px; font-weight: 900; color: #111;">${i.qty}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `).join('')}
                    </div>

                    <!-- FOOTER -->
                    <div style="padding: 40px 60px; background: #FAFAFA; border-top: 1px solid #EEE;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                            <div style="max-width: 400px;">
                                <div style="font-size: 9px; font-weight: 900; color: #855546; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px;">Notice to Consignee</div>
                                <p style="font-size: 10px; color: #666; line-height: 1.6; margin: 0; font-weight: 500;">Samples issued are the property of Omada Home Studio. Please ensure samples are handled with care. Return within 7 working days if not specified otherwise.</p>
                            </div>
                            <div style="text-align: right;">
                                <div style="width: 180px; height: 1px; background: #EEE; margin-bottom: 10px;"></div>
                                <div style="font-size: 11px; font-weight: 900; color: #111; text-transform: uppercase;">Authorized Signatory</div>
                                <div style="font-size: 9px; color: #855546; font-weight: 800; margin-top: 3px;">Omada Home Studio</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        try {
            const canvas = await renderPageToCanvas(html);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = (canvas.height * pageWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
            pdf.save(`Sample_${data.customerName.replace(/\s+/g, '_')}_${data.id}.pdf`);
            toast.success('Sample PDF Generated');
        } catch (err) {
            console.error('PDF Gen Error:', err);
            toast.error('Failed to generate PDF');
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {view === 'list' ? (
                <>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-4">
                        <div className="flex items-start gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-900 flex items-center justify-center shrink-0 shadow-xl shadow-indigo-100">
                                <LayoutList className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Sample Management</h1>
                                <p className="text-sm text-slate-500 font-bold tracking-tight mt-1.5">Track and manage product samples for clients</p>
                            </div>
                        </div>
                        <Button className="h-12 px-8 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[13px] shadow-xl shadow-indigo-200/50 transition-all" onClick={() => { resetForm(); setView('form'); }}>
                            <Plus className="w-6 h-6 mr-3" /> NEW SAMPLE RECORD
                        </Button>
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="relative flex-1 w-full max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search samples..."
                                className="pl-11 bg-white border-slate-200 h-12 rounded-2xl shadow-xl shadow-slate-200/40 font-bold"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-900/5 text-[13px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200">
                                        <th className="py-4 px-6 text-center w-[80px]">#</th>
                                        <th className="py-4 px-6 text-left">CUSTOMER NAME</th>
                                        <th className="py-4 px-6 text-left">CONTACT NO</th>
                                        <th className="py-4 px-6 text-left">DATE</th>
                                        <th className="py-4 px-6 text-left">SALESMAN</th>
                                        <th className="py-4 px-6 text-center w-[200px]">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedRecords.map((r, index) => (
                                        <tr key={r.id} className="hover:bg-indigo-50/30 transition-all border-b border-slate-50">
                                            <td className="py-4 px-6 text-center text-slate-600 font-black tabular-nums">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="py-4 px-6 text-left font-black text-slate-950 tracking-tight underline decoration-indigo-200 underline-offset-4 cursor-pointer" onClick={() => handleView(r)}>{r.customerName}</td>
                                            <td className="py-4 px-6 text-left text-slate-900 font-black tracking-tighter">{r.mobile}</td>
                                            <td className="py-4 px-6 text-left text-slate-900 font-bold">{r.date && !isNaN(new Date(r.date).getTime()) ? format(new Date(r.date), 'dd/MM/yyyy') : (r.date || '-')}</td>
                                            <td className="py-4 px-6 text-left text-slate-900 font-bold">{r.salesRef}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button variant="ghost" size="icon" className="text-indigo-600 hover:bg-indigo-50" onClick={() => handleView(r)}><Eye className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100" onClick={() => handleGeneratePDF(r)}><FileDown className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-emerald-600 hover:bg-emerald-50" onClick={() => handleEdit(r)}><Pencil className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon" className="text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4" /></Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {paginatedRecords.length === 0 && (
                                        <tr><td colSpan={6} className="text-center py-24 text-slate-500 italic font-black text-lg">No sample records found. Start by creating one.</td></tr>
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
                </>
            ) : (
                <>
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white border border-slate-100 shadow-sm" onClick={() => setView('list')}><ArrowLeft className="w-5 h-5" /></Button>
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
                                {view === 'view' ? 'Review Sample' : (editingId ? 'Updating Record' : 'New Sample Entry')}
                            </h1>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Sample Logistics & Client Selection Tracking</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                            <h3 className="text-[15px] font-black uppercase tracking-[0.15em] text-slate-900 mb-8 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                Client Identification
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[12px] font-black uppercase tracking-widest text-slate-700 ml-1">Customer Name</Label>
                                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={view === 'view'} className="h-12 px-5 rounded-2xl bg-white border-slate-200 font-black text-slate-900 text-base" placeholder="Who is taking samples?" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[12px] font-black uppercase tracking-widest text-slate-700 ml-1">Phone Number</Label>
                                    <Input value={mobile} onChange={e => setMobile(e.target.value)} disabled={view === 'view'} className="h-12 px-5 rounded-2xl bg-white border-slate-200 font-black text-slate-900 text-base" placeholder="+91 XXXXX XXXXX" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                            <h3 className="text-[15px] font-black uppercase tracking-[0.15em] text-slate-900 mb-8 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                Logistic Context
                            </h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-[12px] font-black uppercase tracking-widest text-slate-700 ml-1">Issued By (Salesman)</Label>
                                    <Input value={salesRef} onChange={e => setSalesRef(e.target.value)} disabled={view === 'view'} className="h-12 px-5 rounded-2xl bg-white border-slate-200 font-black text-slate-900 text-base" placeholder="Sales person name..." />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[12px] font-black uppercase tracking-widest text-slate-700 ml-1">Site / Project Info</Label>
                                    <Input value={siteAddress} onChange={e => setSiteAddress(e.target.value)} disabled={view === 'view'} className="h-12 px-5 rounded-2xl bg-white border-slate-200 font-black text-slate-900 text-base" placeholder="Where are samples going?" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-10">
                        {categories.map(cat => (
                            <div key={cat.id} className="bg-white rounded-3xl p-8 border border-slate-100 shadow-lg shadow-slate-200/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-slate-100 pb-4 gap-4">
                                    <div className="flex-1 max-w-md">
                                        <Input
                                            value={cat.name}
                                            onChange={e => setCategories(categories.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                                            disabled={view === 'view'}
                                            className="text-xl font-black uppercase tracking-widest border-0 bg-transparent p-0 focus-visible:ring-0 text-indigo-950"
                                            placeholder="Section Name (e.g. Master Bedroom)"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        {view !== 'view' && (
                                            <>
                                                <Button variant="outline" size="sm" className="h-10 px-6 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-black uppercase tracking-widest text-[11px] shadow-sm" onClick={() => addItem(cat.id)}>
                                                    <Plus className="w-4 h-4 mr-2" /> Add Item
                                                </Button>
                                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => removeCategory(cat.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {cat.items.length > 0 && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="text-slate-600 text-[12px] font-black uppercase tracking-[0.2em] border-b-2 border-slate-100">
                                                    <th className="w-12 text-center pb-4">#</th>
                                                    <th className="w-16 pb-4">Image</th>
                                                    <th className="text-left pb-4">Company Name</th>
                                                    <th className="text-left pb-4 px-4">Design / Product</th>
                                                    <th className="w-32 text-center pb-4">Quantity</th>
                                                    <th className="w-12 pb-4"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {cat.items.map((item, idx) => (
                                                    <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                                                        <td className="py-5 text-center text-[13px] font-black text-slate-500 tabular-nums">{idx + 1}</td>
                                                        <td className="py-4">
                                                            {item.image ? (
                                                                <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                                                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                                    {view !== 'view' && (
                                                                        <button onClick={() => updateItem(cat.id, item.id, 'image', null)} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><X className="w-4 h-4" /></button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <label className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-100 flex items-center justify-center cursor-pointer hover:bg-white hover:border-indigo-200 transition-all">
                                                                    <ImagePlus className="w-4 h-4 text-slate-300" />
                                                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            const reader = new FileReader();
                                                                            reader.onloadend = () => updateItem(cat.id, item.id, 'image', reader.result as string);
                                                                            reader.readAsDataURL(file);
                                                                        }
                                                                    }} disabled={view === 'view'} />
                                                                </label>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-2">
                                                            <Input value={item.company} onChange={e => updateItem(cat.id, item.id, 'company', e.target.value)} disabled={view === 'view'} className="h-11 text-sm font-black text-slate-900 border-slate-200 focus:bg-white transition-all shadow-sm" list="master-companies" />
                                                        </td>
                                                        <td className="py-4 px-2">
                                                            <Input value={item.design} onChange={e => updateItem(cat.id, item.id, 'design', e.target.value)} disabled={view === 'view'} className="h-11 text-sm font-black text-slate-900 border-slate-200 focus:bg-white transition-all uppercase tracking-tight shadow-sm" list="master-products" />
                                                        </td>
                                                        <td className="py-4 px-2">
                                                            <Input type="number" value={item.qty || ''} onChange={e => updateItem(cat.id, item.id, 'qty', +e.target.value)} disabled={view === 'view'} className="h-11 text-center font-black text-indigo-700 text-lg no-spinner border-slate-200 shadow-sm" />
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            {view !== 'view' && (
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50" onClick={() => removeItem(cat.id, item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}

                        {view !== 'view' && (
                            <Button variant="outline" onClick={addCategory} className="w-full border-2 border-dashed border-slate-200 h-16 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/30 hover:border-indigo-200 rounded-[20px] font-black uppercase tracking-widest text-xs transition-all">
                                <Plus className="w-5 h-5 mr-3" /> Initialize New Sample Category
                            </Button>
                        )}

                        <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-slate-900 rounded-[32px] gap-6">
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                {view === 'view' ? (
                                    <Button className="h-12 px-10 rounded-2xl bg-indigo-600 font-black uppercase tracking-widest text-[11px]" onClick={() => setView('form')}><Pencil className="w-4 h-4 mr-2" /> Modify Entry</Button>
                                ) : (
                                    <Button className="h-12 px-10 rounded-2xl bg-indigo-600 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-indigo-900/40" onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Commit to Ledger</Button>
                                )}
                                <Button variant="ghost" className="h-12 px-10 rounded-2xl text-slate-300 hover:text-white font-black uppercase tracking-widest text-[11px]" onClick={() => setView('list')}>Return to List</Button>
                            </div>
                            <Button variant="outline" className="h-12 px-10 rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10 font-black uppercase tracking-widest text-[11px] transition-all" onClick={() => handleGeneratePDF()}>
                                <FileDown className="w-4 h-4 mr-2 text-indigo-400" /> Export Logistics Slip
                            </Button>
                        </div>
                    </div>

                    <datalist id="master-companies">
                        {masterCompanies.map((c, i) => <option key={i} value={c.name} />)}
                    </datalist>
                    <datalist id="master-products">
                        {masterProducts.map((p, i) => <option key={i} value={p.design} />)}
                    </datalist>
                </>
            )}
        </div>
    );
};

export default SampleManagementPage;
