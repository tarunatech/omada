import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, FileDown, Share2, Save, Eye, Pencil, ImagePlus, X, ArrowLeft, Search, PackageOpen, LayoutGrid, Users, FileText, User, X as CloseIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import omadaLogo from '@/assets/omada-logo.png';
import { api } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { globalSearch } from '@/lib/utils';
import { CustomPagination } from '@/components/CustomPagination';

interface QuotationItem {
    id: string;
    company: string;
    design: string;
    finish: string;
    size: string;
    multiplier: number;
    qty: number;
    unitPrice: number;
    total: number;
    image: string | null;
    boxes?: number;
}

interface Category {
    id: string;
    name: string;
    items: QuotationItem[];
}

interface QuotationRecord {
    id: string;
    customerName: string;
    mobile: string;
    salesRef: string;
    date: string;
    grandTotal: number;
    categories: Category[];
    siteAddress: string;
    referenceInfo: string;
    customerLogo: string | null;
    status: 'Pending' | 'Final';
    includeGst?: boolean;
    extraTerms?: string;
    companyName?: string;
}

// Helper for size-based multipliers (Sqft/Bx)
const getSizeMultiplierOptions = (size: string): number[] => {
    const s = (size || '').toLowerCase().replace(/\s+/g, '');
    if (s === '1200x2400') return [31, 32];
    if (s === '600x600') return [15.5, 15];
    if (s === '800x2400') return [20.67, 21];
    if (s === '800x3000') return [25.83, 26];
    if (s === '1200x1800') return [46.5, 48];
    if (s === '800x1600') return [27.56, 28];
    if (s === '600x1200') return [15.5, 16];
    if (s === '150x900') return [11.62, 12];
    if (s === '200x1000') return [10.76, 11];
    if (s === '200x1200') return [12.91, 13];
    if (s === '200x1400') return [12.05, 12.5];
    if (s === '600x600(15mm)') return [7.75, 8];
    return [15.5, 16];
};

const syncManufacturer = async (name: string) => {
    if (!name || name === '-') return;
    try {
        const res = await api.get('/master/companies?limit=100');
        const companies = res.data || [];
        const exists = companies.some((c: any) => c.name.toLowerCase().trim() === name.toLowerCase().trim());
        
        if (!exists) {
            await api.post('/master/companies', {
                name: name.trim(),
                type: 'Manufacturer',
                contact: '-',
                status: 'Active'
            });
        }
    } catch (err) {
        console.error('Failed to sync manufacturer:', err);
    }
};

const syncDesigns = async (categories: Category[]) => {
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
                    await api.post('/master/products', {
                        design: item.design.trim(),
                        company: item.company || '-',
                        finish: item.finish || '-',
                        size: item.size || '-',
                        image: item.image || null,
                        status: 'Active'
                    });
                } else if (!match.image && item.image) {
                    await api.patch(`/master/products/${match.id}`, {
                        image: item.image
                    });
                }
                
                if (item.company) {
                    await syncManufacturer(item.company);
                }
            }
        }
    } catch (err) {
        console.error('Failed to sync designs:', err);
    }
};

const QuotationPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const filterUserId = searchParams.get('userId');
    const filterUserName = searchParams.get('userName');
    
    const [view, setView] = useState<'list' | 'form' | 'view'>('list');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<QuotationRecord[]>([]);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 10;

    const fetchQuotations = async () => {
        try {
            setLoading(true);
            const userFilter = filterUserId ? `&createdBy=${filterUserId}` : '';
            const data = await api.get(`/quotations?type=Quotation&page=${currentPage}&limit=${itemsPerPage}&search=${search}${userFilter}`);
            setRecords(data.data || []);
            setTotalPages(data.pagination.totalPages || 1);
        } catch (err) {
            toast.error('Failed to fetch quotations');
        } finally {
            setLoading(false);
        }
    };

    const fetchMasterData = async () => {
        try {
            // Fetch a larger set for autocomplete suggestions (e.g., top 1000)
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
        fetchQuotations();
    }, [currentPage, search]);

    useEffect(() => {
        fetchMasterData();
        const action = searchParams.get('action');
        if (action === 'new') {
            resetForm();
            setView('form');
        }
    }, []);

    const [customerName, setCustomerName] = useState('');
    const [mobile, setMobile] = useState('');
    const [salesRef, setSalesRef] = useState('');
    const [siteAddress, setSiteAddress] = useState('');
    const [referenceInfo, setReferenceInfo] = useState('');
    const [customerLogo, setCustomerLogo] = useState<string | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [includeGst, setIncludeGst] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [orderExportOpen, setOrderExportOpen] = useState(false);
    const [selectedRecordForExport, setSelectedRecordForExport] = useState<QuotationRecord | null>(null);
    const [selectedRecordIndex, setSelectedRecordIndex] = useState<number>(0);
    const [masterProducts, setMasterProducts] = useState<any[]>([]);
    const [masterCompanies, setMasterCompanies] = useState<any[]>([]);
    const [isManualMap, setIsManualMap] = useState<Record<string, boolean>>({});
    const [extraTerms, setExtraTerms] = useState('');
    const [companyName, setCompanyName] = useState('');
    const orderRef = useRef<HTMLDivElement>(null);

    const resetForm = () => {
        setCustomerName('');
        setMobile('');
        setSalesRef('');
        setSiteAddress('');
        setReferenceInfo('');
        setCustomerLogo(null);
        setCategories([]);
        setIncludeGst(false);
        setEditingId(null);
        setExtraTerms('');
        setCompanyName('');
    };

    const addCategory = () => {
        const id = Date.now().toString();
        setCategories([...categories, { id, name: 'New Category', items: [] }]);
    };

    const addItem = (catId: string) => {
        setCategories(categories.map(c =>
            c.id === catId
                ? { ...c, items: [...c.items, { id: `${catId}-${Date.now()}`, company: '', design: '', finish: '', size: '', multiplier: 16, qty: 0, unitPrice: 0, total: 0, image: null, boxes: 0 }] }
                : c
        ));
    };

    const updateItem = (catId: string, itemId: string, field: keyof QuotationItem, value: string | number | null) => {
        setCategories(prev => prev.map(c =>
            c.id === catId
                ? {
                    ...c, items: c.items.map(i => {
                        if (i.id === itemId) {
                            const updated = { ...i, [field]: value };
                            // Auto-calculate total: multiplier * qty * price
                            // Special case: if multiplier is 1 (None), total is qty * unitPrice
                            const m = Number(updated.multiplier) || 0;
                            const q = Number(updated.qty) || 0;
                            const p = Number(updated.unitPrice) || 0;
                            updated.total = m * q * p;
                            return updated;
                        }
                        return i;
                    })
                }
                : c
        ));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomerLogo(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeItem = (catId: string, itemId: string) => {
        setCategories(categories.map(c =>
            c.id === catId ? { ...c, items: c.items.filter(i => i.id !== itemId) } : c
        ));
    };

    const removeCategory = (catId: string) => {
        setCategories(categories.filter(c => c.id !== catId));
    };

    const grandTotalValue = categories.reduce((sum, c) => sum + c.items.reduce((s, i) => s + (Number(i.total) || 0), 0), 0);
    const finalTotalValue = includeGst ? grandTotalValue * 1.18 : grandTotalValue;

    const handleSave = async () => {
        const newRecord: QuotationRecord = {
            id: editingId || `Q-${1000 + records.length + 1}`,
            customerName,
            mobile,
            salesRef,
            date: new Date().toISOString().split('T')[0],
            grandTotal: finalTotalValue,
            categories: categories.map(c => ({
                ...c,
                items: c.items.map(i => ({ ...i, total: Number(i.total) }))
            })),
            siteAddress,
            referenceInfo,
            customerLogo,
            status: editingId ? (records.find(r => r.id === editingId)?.status || 'Pending') : 'Pending',
            includeGst,
            extraTerms,
            companyName
        };

        try {
            if (editingId) {
                await api.put(`/quotations/${editingId}`, newRecord);
                toast.success('Quotation updated');
            } else {
                await api.post('/quotations', newRecord);
                toast.success('Quotation saved');
            }

            fetchQuotations();
            syncDesigns(categories);
            fetchMasterData();
            setView('list');
            resetForm();
        } catch (err) {
            toast.error('Failed to save quotation');
        }
    };

    const handleStatusChange = async (id: string, newStatus: 'Pending' | 'Final') => {
        try {
            await api.patch(`/quotations/${id}/status`, { status: newStatus });
            setRecords(records.map(r => r.id === id ? { ...r, status: newStatus } : r));
            fetchMasterData(); // Refresh best designs usage counts
            toast.success(`Quotation status updated to ${newStatus}`);
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleView = (record: QuotationRecord) => {
        setEditingId(record.id);
        setCustomerName(record.customerName);
        setMobile(record.mobile);
        setSalesRef(record.salesRef);
        setSiteAddress(record.siteAddress);
        setReferenceInfo(record.referenceInfo);
        setCustomerLogo(record.customerLogo);
        setCategories(record.categories);
        setIncludeGst(record.includeGst || false);
        setExtraTerms(record.extraTerms || '');
        setCompanyName(record.companyName || '');
        setView('view');
    };

    const handleEdit = (record: QuotationRecord) => {
        setEditingId(record.id);
        setCustomerName(record.customerName);
        setMobile(record.mobile);
        setSalesRef(record.salesRef);
        setSiteAddress(record.siteAddress);
        setReferenceInfo(record.referenceInfo);
        setCustomerLogo(record.customerLogo);
        setCategories(record.categories);
        setIncludeGst(record.includeGst || false);
        setExtraTerms(record.extraTerms || '');
        setCompanyName(record.companyName || '');
        setView('form');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) return;
        try {
            await api.delete(`/quotations/${id}`);
            setRecords(records.filter(r => r.id !== id));
            toast.success('Quotation deleted successfully');
            fetchMasterData(); // Refresh best designs usage counts if it was Final
        } catch (err) {
            toast.error('Failed to delete quotation');
        }
    };

    // Sorting is now partially handled by server-side newest first, 
    // but the local filtered list still needs to match paginated view.
    const paginatedRecords = [...records].sort((a, b) => {
        if (a.status === 'Final' && b.status !== 'Final') return -1;
        if (a.status !== 'Final' && b.status === 'Final') return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const bankDetails = {
        accountName: 'Omada Home Studio LLP',
        accountNo: '7777976521',
        bankName: 'Kotak Mahindra Bank Ltd.',
        bankAddress: 'Gf-001/A, Krishil Tower, Vadodara 390021',
        ifscCode: 'KKBK0002747'
    };

    const renderPageToCanvas = async (html: string): Promise<HTMLCanvasElement> => {
        // Inject Inter font from Google Fonts
        const fontLinkId = '__inter_font_link__';
        if (!document.getElementById(fontLinkId)) {
            const link = document.createElement('link');
            link.id = fontLinkId;
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600;1,700;1,800&display=swap';
            document.head.appendChild(link);
        }

        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = '-9999px';
        div.style.top = '0';
        div.style.width = '210mm';
        div.style.backgroundColor = '#000000';
        div.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
        div.innerHTML = html;

        document.body.appendChild(div);

        // Wait for Inter font to be ready
        try {
            await document.fonts.ready;
        } catch (e) {
            // Fallback: brief delay if fonts.ready not supported
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const canvas = await html2canvas(div, {
            scale: 3,
            useCORS: true,
            backgroundColor: '#000000',
            logging: false,
            windowWidth: 794,
        });
        document.body.removeChild(div);
        return canvas;
    };

    const handleGeneratePDF = async (record?: QuotationRecord) => {
        const data: any = record || {
            id: editingId || `Q-${1000 + records.length + 1}`,
            customerName,
            companyName,
            mobile,
            salesRef,
            siteAddress,
            referenceInfo,
            categories,
            customerLogo,
            date: new Date().toLocaleDateString('en-GB'),
            includeGst,
            extraTerms: record?.extraTerms || extraTerms
        };

        const quotationNo = data.id;
        const dateFormatted = format(new Date(), 'dd/MM/yyyy');

        const totalBoxes = data.categories.reduce((acc, cat) => acc + cat.items.reduce((s, i) => s + (Number(i.qty) || 0), 0), 0);
        const totalArea = data.categories.reduce((acc, cat) => acc + cat.items.reduce((s, i) => s + (Number(i.multiplier) * Number(i.qty) || 0), 0), 0);

        const subtotal = data.categories.reduce((acc, cat) => acc + cat.items.reduce((s, i) => s + (Number(i.total) || 0), 0), 0);
        const cgst = data.includeGst ? subtotal * 0.09 : 0;
        const sgst = data.includeGst ? subtotal * 0.09 : 0;
        const totalCost = subtotal + cgst + sgst;

        const marbleTextureUrl = window.location.origin + '/marble-texture.png';

        const html = `
      <div style="width: 210mm; height: auto; display: flex; flex-direction: column; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1A1A1A; background: #000000; padding: 0; box-sizing: border-box; position: relative; overflow: hidden;">

        <!-- THE PERFECT FRAME (drawn on top with 1px overbleed) -->
        <div style="position: absolute; top: -1px; left: -1px; right: -1px; height: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>
        <div style="position: absolute; bottom: -1px; left: -1px; right: -1px; height: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>
        <div style="position: absolute; top: -1px; left: -1px; bottom: -1px; width: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>
        <div style="position: absolute; top: -1px; right: -1px; bottom: -1px; width: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>

        <div style="display: flex; flex-direction: column; padding: 2.5mm; position: relative; background: #ffffff;">
          
          <!-- LUXURY HEADER STRIP -->
          <div style="position: absolute; top: 0; left: 0; right: 0; height: 520px; background: #855546; z-index: 0; overflow: hidden;">
              <div style="position: absolute; inset: 0; background: url('${marbleTextureUrl}'); background-size: cover; opacity: 0.08;"></div>
          </div>

          <!-- HEADER SECTION (White Background for rest of page) -->
          <div style="position: absolute; top: 520px; left: 0; right: 0; bottom: 0; background: #ffffff; z-index: 0;"></div>

          <div style="position: relative; z-index: 3; display: flex; flex-direction: column;">
            <!-- HEADER SECTION -->
            <div style="padding: 40px 60px 10px 80px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1; display: flex; align-items: center; gap: 20px;">
              <div style="padding: 5px; display: inline-block;">
                <img src="${omadaLogo}" style="height: 55px; width: auto; max-width: 280px; display: block; filter: brightness(0) invert(1);" />
              </div>
              ${data.customerLogo ? `
                <div style="width: 1px; height: 45px; background: rgba(255,255,255,0.3);"></div>
                <div style="padding: 5px; display: inline-block;">
                  <img src="${data.customerLogo}" style="height: 55px; width: auto; max-width: 180px; object-fit: contain; display: block;" />
                </div>
              ` : ''}
            </div>

            <div style="text-align: right; color: #ffffff; padding-top: 5px;">
              <div style="font-size: 13px; font-weight: 700; opacity: 0.9; margin-top: 5px;">${dateFormatted}</div>
            </div>
          </div>

          <!-- COMPANY & BANK DETAILS -->
          <div style="padding: 0 60px 40px 80px;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 15px 0; margin-left: -15px;">
              <tr>
                <td style="width: 33.33%; vertical-align: top;">
                  <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 18px; color: #ffffff; height: 165px; display: flex; flex-direction: column; box-sizing: border-box;">
                    <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px; opacity: 0.8; min-height: 35px; box-sizing: border-box;">Studio Location</div>
                    <div style="font-size: 11px; font-weight: 950; margin-bottom: 4px;">Omada Home Studio LLP</div>
                    <div style="font-size: 9px; opacity: 0.9; line-height: 1.6; font-weight: 500;">
                      Saiyed Vasna Road, Vadodara, 390015<br/>
                      <span style="font-weight: 700;">PH:</span> +91 7777976521<br/>
                      <span style="font-weight: 700;">WEB:</span> www.omadagroup.in
                    </div>
                  </div>
                </td>
                <td style="width: 33.33%; vertical-align: top;">
                  <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 18px; color: #ffffff; height: 165px; display: flex; flex-direction: column; box-sizing: border-box;">
                    <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px; opacity: 0.8; min-height: 35px; box-sizing: border-box;">Finance & Remittance</div>
                    <table style="width: 100%; font-size: 9px; font-weight: 500; border-collapse: collapse;">
                      <tr><td style="padding: 2px 0; opacity: 0.7; width: 42%;">Bank:</td><td style="padding: 2px 0; font-weight: 700;">KOTAK MAHINDRA BANK</td></tr>
                      <tr><td style="padding: 2px 0; opacity: 0.7;">Account:</td><td style="padding: 2px 0; font-weight: 700;">7777976521</td></tr>
                      <tr><td style="padding: 2px 0; opacity: 0.7;">IFSC:</td><td style="padding: 2px 0; font-weight: 700;">KKBK0002747</td></tr>
                      <tr><td style="padding: 2px 0; opacity: 0.7;">Branch:</td><td style="padding: 2px 0; font-weight: 700;">Vadodara</td></tr>
                    </table>
                  </div>
                </td>
                <td style="width: 33.33%; vertical-align: top;">
                  <div style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 18px; color: #ffffff; height: 165px; display: flex; flex-direction: column; box-sizing: border-box;">
                    <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 10px; opacity: 0.8; min-height: 35px; box-sizing: border-box;">Commercial Terms</div>
                    <div style="font-size: 9px; opacity: 0.9; line-height: 1.7; font-weight: 600;">
                      • 1 to 1.5% Breakage of total boxes should be accepted by customer.<br/>
                      • Quantity will be +/-5% Tolerance<br/>
                      • Price will be up & down if any natural resources price increase.
                      ${data.includeGst ? '<br/>• GST: 18% EXTRA' : ''}
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <div style="padding: 0 60px 40px 80px; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 20px;">
                <div style="height: 1px; background: #ffffff; flex: 1; opacity: 0.4;"></div>
                <div style="font-size: 11px; font-weight: 950; color: #ffffff; letter-spacing: 6px; text-transform: uppercase;">Quotation</div>
                <div style="height: 1px; background: #ffffff; flex: 1; opacity: 0.4;"></div>
            </div>
          </div>

          <!-- CLIENT & PROJECT INFO CARDS -->
          <div style="padding: 0 60px 40px 80px;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 20px 0; margin-left: -20px;">
              <tr>
                <td style="width: 50%; vertical-align: top;">
                  <div style="background: #ffffff; border: 1px solid #E5E5E5; border-radius: 12px; padding: 22px 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); position: relative; overflow: hidden; height: 160px; box-sizing: border-box; display: flex; flex-direction: column;">
                    <div style="position: absolute; top: 0; left: 0; bottom: 0; width: 6px; background: #855546;"></div>
                    <div style="font-size: 9px; font-weight: 900; color: #888888; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 12px; border-bottom: 1px solid #F6F6F6; padding-bottom: 8px;">Prepared For Excellence</div>
                    <div style="font-size: 18px; font-weight: 950; color: #111111; margin-bottom: 2px; line-height: 1.2;">${data.customerName}</div>
                    ${data.companyName ? `<div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">${data.companyName}</div>` : ''}
                    <div style="font-size: 14px; color: #855546; font-weight: 800; margin-bottom: 10px;">+91 ${data.mobile}</div>
                    <div style="font-size: 11px; color: #555555; line-height: 1.5; font-weight: 600; opacity: 0.8; margin-top: auto;">${data.siteAddress || 'Studio Selection — N/A'}</div>
                  </div>
                </td>
                <td style="width: 50%; vertical-align: top;">
                  <div style="background: #ffffff; border: 1px solid #E5E5E5; border-radius: 12px; padding: 22px 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); position: relative; overflow: hidden; height: 160px; box-sizing: border-box; display: flex; flex-direction: column;">
                    <div style="position: absolute; top: 0; left: 0; bottom: 0; width: 6px; background: #1A1A1A;"></div>
                    <div style="font-size: 9px; font-weight: 900; color: #888; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 12px; border-bottom: 1px solid #F6F6F6; padding-bottom: 8px;">Reference Details</div>
                    <div style="margin-bottom: 10px;">
                      <div style="font-size: 8px; font-weight: 700; color: #AAA; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 1px;">Salesman</div>
                      <div style="font-size: 14px; font-weight: 700; color: #000;">${data.salesRef || 'Studio Direct'}</div>
                    </div>
                    <div style="margin-top: auto;">
                      <div style="font-size: 8px; font-weight: 700; color: #AAA; text-transform: uppercase; margin-bottom: 2px; letter-spacing: 1px;">Reference Person</div>
                      <div style="font-size: 14px; font-weight: 700; color: #000;">${data.referenceInfo || 'Omada In-House'}</div>
                    </div>
                  </div>
                </td>
              </tr>
            </table>
          </div>


          <!-- MATERIAL SPECIFICATIONS - LUXURY CARDS -->
          <div style="padding: 0 60px 20px 80px;">
            ${(() => {
                const style = { accent: '#855546', bg: 'rgba(133, 85, 70, 0.03)' };

                return data.categories.map((cat, catIdx) => {
                    if (cat.items.length === 0) return '';
                    return `
                  <div style="margin-bottom: 45px;">
                    <!-- ELEGANT SECTION DIVIDER -->
                     <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 25px;">
                         <div style="height: 1.5px; background: ${style.accent}; flex: 1;"></div>
                         <div style="font-size: 13px; font-weight: 1000; color: ${style.accent}; text-transform: uppercase; letter-spacing: 4px; display: flex; align-items: center; gap: 8px;">
                             <span>◆</span> ${cat.name} <span>◆</span>
                         </div>
                         <div style="height: 1.5px; background: ${style.accent}; flex: 1;"></div>
                     </div>

                    <!-- PRODUCT CARDS GRID -->
                    <div style="display: flex; flex-direction: column; gap: 20px;">
                        ${cat.items.map((item, index) => `
                            <div style="background: #ffffff; border: 1px solid #EFEFEF; border-radius: 12px; padding: 20px; display: flex; box-shadow: 0 5px 15px rgba(0,0,0,0.03); transition: all 0.3s ease;">
                                <!-- PRODUCT IMAGE -->
                                <div style="width: 140px; height: 95px; border-radius: 10px; overflow: hidden; border: 1.5px solid #F5F5F5; background: #FDFDFD; box-shadow: 0 4px 12px rgba(0,0,0,0.07); flex-shrink: 0;">
                                    ${item.image ? `<img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #CCC; font-weight: 800; background: #FAFAFA;">STUDIO PREVIEW</div>`}
                                </div>

                                <!-- PRODUCT INFO -->
                                <div style="flex: 1; padding: 0 25px; display: flex; flex-direction: column; justify-content: center;">
                                    <div style="font-size: 16px; font-weight: 1000; color: #111; text-transform: uppercase; margin-bottom: 5px; letter-spacing: -0.2px;">${item.design}</div>
                                    <div style="font-size: 10px; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: 0.8px;">${item.finish} • ${item.size}</div>
                                </div>

                                <!-- PRICING BREAKDOWN -->
                                <div style="width: 220px; border-left: 1px solid #F2F2F2; padding-left: 25px; display: flex; flex-direction: column; justify-content: center; text-align: right;">
                                    <div style="display: flex; justify-content: flex-end; align-items: baseline; gap: 8px; margin-bottom: 8px;">
                                        <div style="text-align: right;">
                                            <div style="font-size: 8px; font-weight: 900; color: #AAA; text-transform: uppercase; letter-spacing: 1px;">Unit Price</div>
                                            <div style="font-size: 13px; font-weight: 900; color: #333;">₹${item.unitPrice.toLocaleString()}</div>
                                        </div>
                                        <div style="text-align: right; border-left: 1px dotted #DDD; padding-left: 10px;">
                                            <div style="font-size: 8px; font-weight: 900; color: #AAA; text-transform: uppercase; letter-spacing: 1px;">Qty</div>
                                            ${item.multiplier === 1 ? `
                                                <div style="font-size: 13px; font-weight: 900; color: #333;">${item.qty} <span style="font-size: 8px; color: #999;">SQFT</span></div>
                                                ${item.boxes ? `<div style="font-size: 8px; color: #666; font-weight: 700; margin-top: 2px;">${item.boxes} BOXES</div>` : ''}
                                            ` : `
                                                <div style="font-size: 13px; font-weight: 900; color: #333;">${item.qty} <span style="font-size: 8px; color: #999;">BOX</span></div>
                                            `}
                                        </div>
                                    </div>
                                    <div style="height: 1px; background: #F5F5F5; width: 100%; margin: 5px 0 10px 0;"></div>
                                    <div>
                                        <div style="font-size: 8px; font-weight: 950; color: ${style.accent}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 2px;">Total Line Value</div>
                                        <div style="font-size: 19px; font-weight: 1000; color: #000;">₹${Math.round(item.total).toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                  </div>
                `;
                }).join('');
            })()
            }

            <div style="margin-top: 35px; margin-bottom: 40px; display: flex; justify-content: flex-end; align-items: center; gap: 20px;">
              ${data.includeGst ? `
                <div style="display: flex; flex-direction: column; gap: 10px; justify-content: center;">
                    <div style="width: 250px; height: 110px; background: #FAF3F0; border: 1px solid #000000; border-radius: 12px; padding: 0 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center;">
                         <table style="width: 100%; border-collapse: collapse;">
                             <tr>
                                 <td style="font-size: 11px; color: #475569; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 0;">Basis Total</td>
                                 <td style="font-size: 11px; color: #000000; font-weight: 900; text-align: right; padding: 4px 0;">₹${Math.round(subtotal).toLocaleString('en-IN')}</td>
                             </tr>
                             <tr>
                                 <td style="font-size: 11px; color: #475569; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 0;">CGST (9%)</td>
                                 <td style="font-size: 11px; color: #000000; font-weight: 900; text-align: right; padding: 4px 0;">₹${Math.round(cgst).toLocaleString('en-IN')}</td>
                             </tr>
                             <tr>
                                 <td style="font-size: 11px; color: #475569; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 0;">SGST (9%)</td>
                                 <td style="font-size: 11px; color: #000000; font-weight: 900; text-align: right; padding: 4px 0;">₹${Math.round(sgst).toLocaleString('en-IN')}</td>
                             </tr>
                         </table>
                    </div>
                    <div style="padding: 10px 15px; background: #FFF5F5; border: 1px solid #FED7D7; border-radius: 8px; color: #C53030; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                      ⚡ GST 18% Extra as per statutory norms
                    </div>
                </div>
              ` : ''}
              
              <div style="width: 230px; height: 110px; background: #111111; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); border: 1.5px solid #855546; position: relative; display: flex; align-items: center; justify-content: center;">
                   <!-- Floating Header -->
                   <div style="position: absolute; top: 16px; width: 100%; text-align: center;">
                     <div style="font-size: 9px; font-weight: 950; color: #855546; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 3px;">Quotation Total</div>
                     <div style="height: 1px; background: rgba(255,255,255,0.1); width: 25px; margin: 0 auto;"></div>
                   </div>
                   
                   <!-- Center Amount -->
                   <div style="display: flex; align-items: baseline; justify-content: center; margin-top: 10px;">
                      <span style="font-size: 18px; color: #855546; margin-right: 6px; font-weight: 900;">₹</span>
                      <span style="font-size: 36px; font-weight: 1000; letter-spacing: -1px; color: #ffffff;">${Math.round(totalCost).toLocaleString('en-IN')}</span>
                   </div>
              </div>
            </div>

            ${data.extraTerms ? `
              <div style="margin-top: 50px; margin-left: 80px; margin-right: 60px; border-top: 1px solid #E2E8F0; padding-top: 25px;">
                  <div style="font-size: 10px; font-weight: 1000; color: #855546; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 10px;">Terms & Conditions</div>
                  <div style="font-size: 16px; font-weight: 1000; color: #dc2626; line-height: 1.5; text-transform: uppercase;">
                      ${data.extraTerms.replace(/\n/g, '<br/>')}
                  </div>
              </div>
            ` : ''}

          </div>
        </div>
      </div>
    `;

        try {
            const canvas = await renderPageToCanvas(html);
            const imgData = canvas.toDataURL('image/png', 1.0);

            // Calculate dynamic PDF height in mm
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Create a single-page PDF with matching height for a 'continuous scroll' effect
            const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            pdf.save(`Quotation_${data.customerName.replace(/\s+/g, '')}_${quotationNo}.pdf`);
            toast.success('Luxury Quotation Generated Successfully!');
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('Failed to generate PDF. Please try again.');
        }
    };

    const handleWhatsAppShare = (record: QuotationRecord) => {
        const message = `Hello ${record.customerName}, here is your quotation ${record.id} from OMADA HOME STUDIO. Total amount: ₹${(Number(record.grandTotal) || 0).toLocaleString()}.`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${record.mobile.replace(/\D/g, '')}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    };

    const persistOrderToSystem = async (company: string, items: any[], qRecord: QuotationRecord, poNumber: string) => {
        // Sync Manufacturer if new
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
        syncManufacturer(company);

        // Prepare the record for the server
        const poRecord: any = {
            id: poNumber,
            customerName: qRecord.customerName, // Original customer for reference
            companyName: company,               // The vendor/manufacturer
            mobile: qRecord.mobile || '-',
            salesRef: qRecord.id,                // Reference back to quote
            date: new Date().toISOString().split('T')[0],
            grandTotal: 0,                       // POs usually don't track pricing yet
            categories: [
                {
                    id: 'cat-1',
                    name: 'Material Requirements',
                    items: items.map((it, i) => ({
                        ...it,
                        company: company,        // Link each item to this vendor
                        total: 0,
                        unitPrice: 0,
                        multiplier: 1
                    }))
                }
            ],
            siteAddress: qRecord.siteAddress || '-',
            referenceInfo: qRecord.referenceInfo || '-',
            status: 'Final',
            type: 'OrderExport'
        };

        try {
            // If it's a new export, we don't have a specific ID yet, we want AUTO
            const res = await api.post('/quotations', poRecord);
            console.log('Order persisted to server successfully:', res.data.id);
            return res.data.id; // Return the generated ID (e.g., QUOTATION-1001)
        } catch (err) {
            console.error('Failed to persist order to server:', err);
            toast.error('Could not sync order to central ledger');
            return poNumber; // Fallback
        }

        // Keep local storage as a legacy fallback
        const saved = localStorage.getItem('omada_order_records');
        let existingRecords = saved ? JSON.parse(saved) : [];
        const idx = existingRecords.findIndex((r: any) => r.id === poNumber);
        
        const localOrder = { ...poRecord, supplier: company, party: qRecord.customerName, referParty: qRecord.id };
        if (idx > -1) {
            existingRecords[idx] = localOrder;
        } else {
            existingRecords.unshift(localOrder);
        }
        localStorage.setItem('omada_order_records', JSON.stringify(existingRecords));
    };

    const handleGenerateOrderPDF = async (company: string, items: any[], record: QuotationRecord, dummyPoNumber: string) => {
        // Persist to system first to get a real ID if needed
        const finalPoNumber = await persistOrderToSystem(company, items, record, 'AUTO_QUOTATION');

        const dateFormatted = new Date().toLocaleDateString('en-GB');

        const html = `
      <div style="width: 210mm; min-height: 297mm; display: flex; flex-direction: column; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1A1A1A; background: #ffffff; padding: 0; box-sizing: border-box; position: relative; overflow: hidden;">
        
        <!-- BRANDED HEADER -->
        <div style="background: #855546; padding: 45px 60px 35px 60px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
             <div style="margin-bottom: 25px;">
              <img src="${omadaLogo}" style="height: 42px; width: auto; display: block; filter: brightness(0) invert(1);" />
            </div>
            <h1 style="font-size: 38px; font-weight: 900; color: #ffffff; margin: 0; letter-spacing: 2px; text-transform: uppercase; line-height: 1;">Purchase Order</h1>
          </div>

          <div style="text-align: right; color: #ffffff;">
            <div style="font-size: 10px; font-weight: 900; opacity: 0.8; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 6px;">Order Reference</div>
            <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px;">${finalPoNumber}</div>
            <div style="font-size: 12px; opacity: 0.7; font-weight: 700;">${dateFormatted}</div>
          </div>
        </div>

        <!-- VENDOR CARD -->
        <div style="padding: 25px 60px 25px 60px;">
          <div style="background: #FAFAFA; border: 1px solid #EEEEEE; padding: 30px; display: flex; justify-content: space-between; align-items: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; bottom: 0; width: 5px; background: #855546;"></div>
            <div>
              <div style="font-size: 10px; font-weight: 900; color: #888; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 10px;">Manufacturing Partner</div>
              <div style="font-size: 20px; font-weight: 950; color: #111111; text-transform: uppercase; letter-spacing: -0.5px;">${company}</div>
              <div style="font-size: 12px; color: #855546; font-weight: 800; margin-top: 5px;">Authorized Material Supplier</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 900; color: #CCC; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 6px;">Status</div>
              <div style="font-size: 11px; font-weight: 900; color: #000; border: 1.5px solid #DDD; padding: 7px 18px; background: #FFF; letter-spacing: 1px;">CONFIRMED</div>
            </div>
          </div>
        </div>

        <!-- ITEMS TABLE -->
        <div style="padding: 0 60px 40px 60px; flex: 1;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <thead>
              <tr style="background: #855546;">
                <th style="padding: 18px 15px; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: left; width: 50px;">SR.</th>
                <th style="padding: 18px 15px; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: left; width: 160px;">DIMENSIONS / SIZE</th>
                <th style="padding: 18px 15px; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: left;">DESCRIPTION</th>
                <th style="padding: 18px 15px; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: right; width: 100px;">QUANTITY</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => `
                <tr style="border-bottom: 1px solid #EEEEEE;">
                  <td style="padding: 20px 15px; text-align: left; font-size: 12px; color: #999; font-weight: 900; vertical-align: middle;">${(idx + 1).toString().padStart(2, '0')}</td>
                  <td style="padding: 20px 15px; text-align: left; vertical-align: middle;">
                    <div style="font-size: 12px; font-weight: 800; color: #555; line-height: 1.4;">${it.size}</div>
                    <div style="font-size: 10px; color: #855546; font-weight: 800; text-transform: uppercase; margin-top: 4px;">${it.finish || ''}</div>
                  </td>
                  <td style="padding: 20px 15px; text-align: left; vertical-align: middle;">
                    <div style="font-size: 14px; font-weight: 900; color: #111111; text-transform: uppercase; line-height: 1.3; letter-spacing: -0.2px;">${it.design}</div>
                  </td>
                  <td style="padding: 20px 15px; text-align: right; font-weight: 950; font-size: 20px; color: #000; vertical-align: middle;">
                    ${it.qty}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- BRANDED FOOTER -->
        <div style="background: #855546; padding: 50px 60px; color: #ffffff; text-align: center;">
           <div style="font-size: 11px; font-weight: 900; color: #ffffff; opacity: 0.7; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 12px;">Order Summary</div>
           <div style="font-size: 32px; font-weight: 900; margin-bottom: 10px; letter-spacing: -0.5px;">
             Total Material Count: ${items.reduce((sum, it) => sum + Number(it.qty || 0), 0)} Boxes
           </div>
           <div style="font-size: 11px; opacity: 0.5; margin-top: 15px; text-transform: uppercase; letter-spacing: 2.5px; font-weight: 800;">
             Omada Home Studio • Luxury Material Procurement
           </div>
        </div>

      </div>
    `;

        try {
            const canvas = await renderPageToCanvas(html);
            const imgData = canvas.toDataURL('image/png', 1.0);

            // Calculate dynamic PDF height in mm
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            // Create a single-page PDF with matching height for a 'continuous scroll' effect
            const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

            pdf.save(`PO_${company.replace(/\s+/g, '_')}_${poNumber.replace(/\//g, '_')}.pdf`);
            toast.success(`Purchase Order for ${company} exported successfully!`);
        } catch (error) {
            console.error('PO export error:', error);
            toast.error('Failed to generate Purchase Order PDF');
        }
    };

    const handleGenerateOrderImage = async (company: string, items: any[], record: QuotationRecord, dummyPoNumber: string) => {
        // Persist to system first to find/create ID
        const finalPoNumber = await persistOrderToSystem(company, items, record, 'AUTO_QUOTATION');

        const dateFormatted = new Date().toLocaleDateString('en-GB');

        const html = `
      <div style="width: 210mm; min-height: 297mm; display: flex; flex-direction: column; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1A1A1A; background: #ffffff; padding: 0; box-sizing: border-box; position: relative; overflow: hidden;">
        
        <!-- BRANDED HEADER -->
        <div style="background: #855546; padding: 45px 60px 35px 60px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
             <div style="margin-bottom: 25px;">
              <img src="${omadaLogo}" style="height: 42px; width: auto; display: block; filter: brightness(0) invert(1);" />
            </div>
            <h1 style="font-size: 38px; font-weight: 900; color: #ffffff; margin: 0; letter-spacing: 2px; text-transform: uppercase; line-height: 1;">Purchase Order</h1>
          </div>

          <div style="text-align: right; color: #ffffff;">
            <div style="font-size: 10px; font-weight: 900; opacity: 0.8; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 6px;">Order Reference</div>
            <div style="font-size: 24px; font-weight: 900; letter-spacing: -0.5px; margin-bottom: 4px;">${finalPoNumber}</div>
            <div style="font-size: 12px; opacity: 0.7; font-weight: 700;">${dateFormatted}</div>
          </div>
        </div>

        <!-- VENDOR CARD -->
        <div style="padding: 25px 60px 25px 60px;">
          <div style="background: #FAFAFA; border: 1px solid #EEEEEE; padding: 30px; display: flex; justify-content: space-between; align-items: center; position: relative;">
            <div style="position: absolute; top: 0; left: 0; bottom: 0; width: 5px; background: #855546;"></div>
            <div>
              <div style="font-size: 10px; font-weight: 900; color: #888; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 10px;">Manufacturing Partner</div>
              <div style="font-size: 20px; font-weight: 950; color: #111111; text-transform: uppercase; letter-spacing: -0.5px;">${company}</div>
              <div style="font-size: 12px; color: #855546; font-weight: 800; margin-top: 5px;">Authorized Material Supplier</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 10px; font-weight: 900; color: #CCC; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 6px;">Status</div>
              <div style="font-size: 11px; font-weight: 900; color: #000; border: 1.5px solid #DDD; padding: 7px 18px; background: #FFF; letter-spacing: 1px;">CONFIRMED</div>
            </div>
          </div>
        </div>

        <!-- ITEMS TABLE -->
        <div style="padding: 0 60px 40px 60px; flex: 1;">
          <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
            <thead>
              <tr style="background: #855546;">
                <th style="padding: 18px 15px; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: left; width: 50px;">SR.</th>
                <th style="padding: 18px 15px; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: left; width: 160px;">DIMENSIONS / SIZE</th>
                <th style="padding: 18px 15px; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: left;">DESCRIPTION</th>
                <th style="padding: 18px 15px; color: #ffffff; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: right; width: 100px;">QUANTITY</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => `
                <tr style="border-bottom: 1px solid #EEEEEE;">
                  <td style="padding: 20px 15px; text-align: left; font-size: 12px; color: #999; font-weight: 900; vertical-align: middle;">${(idx + 1).toString().padStart(2, '0')}</td>
                  <td style="padding: 20px 15px; text-align: left; vertical-align: middle;">
                    <div style="font-size: 12px; font-weight: 800; color: #555; line-height: 1.4;">${it.size}</div>
                    <div style="font-size: 10px; color: #855546; font-weight: 800; text-transform: uppercase; margin-top: 4px;">${it.finish || ''}</div>
                  </td>
                  <td style="padding: 20px 15px; text-align: left; vertical-align: middle;">
                    <div style="font-size: 14px; font-weight: 900; color: #111111; text-transform: uppercase; line-height: 1.3; letter-spacing: -0.2px;">${it.design}</div>
                  </td>
                  <td style="padding: 20px 15px; text-align: right; font-weight: 950; font-size: 20px; color: #000; vertical-align: middle;">
                    ${it.qty}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- BRANDED FOOTER -->
        <div style="background: #855546; padding: 50px 60px; color: #ffffff; text-align: center;">
           <div style="font-size: 11px; font-weight: 900; color: #ffffff; opacity: 0.7; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 12px;">Order Summary</div>
           <div style="font-size: 32px; font-weight: 900; margin-bottom: 10px; letter-spacing: -0.5px;">
             Total Material Count: ${items.reduce((sum, it) => sum + Number(it.qty || 0), 0)} Boxes
           </div>
           <div style="font-size: 11px; opacity: 0.5; margin-top: 15px; text-transform: uppercase; letter-spacing: 2.5px; font-weight: 800;">
             Omada Home Studio • Luxury Material Procurement
           </div>
        </div>

      </div>
    `;

        try {
            const canvas = await renderPageToCanvas(html);
            const dataUrl = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `PO_${company.replace(/\s+/g, '_')}_${quotationNo}.png`;
            link.href = dataUrl;
            link.click();
            toast.success(`Purchase Order Image for ${company} exported successfully!`);
        } catch (error) {
            console.error('PO image export error:', error);
            toast.error('Failed to generate Purchase Order Image');
        }
    };


    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-20">
            {view === 'list' ? (
                <>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-4">
                        <div className="flex items-start gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 shadow-xl shadow-slate-200">
                                <FileText className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Quotation System</h1>
                                <p className="text-sm text-slate-500 font-bold tracking-tight mt-1.5">Aggregate log of technical estimates and commercial records</p>
                            </div>
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

                        <Button className="h-12 px-8 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[13px] shadow-xl shadow-blue-200/50 transition-all" onClick={() => { resetForm(); setView('form'); }}>
                            <Plus className="w-6 h-6 mr-3" /> NEW QUOTE
                        </Button>
                    </div>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="relative flex-1 w-full max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Search by identity, company, or reference..."
                                className="pl-11 bg-white border-slate-200 h-12 rounded-2xl shadow-xl shadow-slate-200/40 font-bold"
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full table-fixed min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-900/5 text-[13px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200">
                                        <th className="py-4 px-6 text-center whitespace-nowrap" style={{ width: '5%' }}>SR NO.</th>
                                        <th className="py-4 px-6 text-left whitespace-nowrap" style={{ width: '20%' }}>CUSTOMER NAME</th>
                                        <th className="py-4 px-6 text-left whitespace-nowrap hidden md:table-cell" style={{ width: '15%' }}>CONTACT NO</th>
                                        <th className="py-4 px-6 text-left whitespace-nowrap hidden lg:table-cell" style={{ width: '10%' }}>DATE</th>
                                        <th className="py-4 px-6 text-center whitespace-nowrap" style={{ width: '10%' }}>STATUS</th>
                                        <th className="py-4 px-6 text-right whitespace-nowrap" style={{ width: '15%' }}>ESTIMATE TOTAL</th>
                                        <th className="py-4 px-6 text-left whitespace-nowrap hidden xl:table-cell" style={{ width: '10%' }}>SALESMAN</th>
                                        <th className="py-4 px-6 text-center whitespace-nowrap" style={{ width: '15%' }}>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedRecords.map((r, index) => (
                                        <tr key={r.id} className="hover:bg-slate-50/50 transition-all duration-300 group align-middle">
                                            <td className="py-4 px-6 text-center text-slate-400 font-bold tabular-nums">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="py-4 px-6 text-left font-semibold text-slate-900 truncate">{r.customerName}</td>
                                            <td className="py-4 px-6 text-left text-slate-700 font-medium whitespace-nowrap hidden md:table-cell">{r.mobile || '-'}</td>
                                            <td className="py-4 px-6 text-left text-slate-600 font-medium hidden lg:table-cell">{r.date && !isNaN(new Date(r.date).getTime()) ? format(new Date(r.date), 'dd/MM/yyyy') : (r.date || '-')}</td>
                                            <td className="py-4 px-6 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`h-7 px-3 text-[10px] font-bold uppercase tracking-wider rounded-full border transition-all ${r.status === 'Final'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                        }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStatusChange(r.id, r.status === 'Final' ? 'Pending' : 'Final');
                                                    }}
                                                >
                                                    {r.status}
                                                </Button>
                                            </td>
                                            <td className="py-4 px-6 text-right font-bold text-slate-950 tabular-nums">
                                                ₹{(Number(r.grandTotal) || 0).toLocaleString()}
                                            </td>
                                            <td className="py-4 px-6 text-left text-slate-700 font-medium truncate hidden xl:table-cell">{r.salesRef || '-'}</td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center justify-center gap-4 transition-all">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl"
                                                        onClick={() => handleView(r)}
                                                        title="Quick View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
                                                        onClick={() => handleGeneratePDF(r)}
                                                        title="Export PDF"
                                                    >
                                                        <FileDown className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl"
                                                        onClick={() => handleWhatsAppShare(r)}
                                                        title="Broadcast"
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-xl"
                                                        onClick={() => handleEdit(r)}
                                                        title="Modify"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    {r.status === 'Final' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-xl"
                                                            onClick={() => {
                                                                setSelectedRecordForExport(r);
                                                                setSelectedRecordIndex(index + 1);
                                                                setOrderExportOpen(true);
                                                            }}
                                                            title="Asset Export"
                                                        >
                                                            <PackageOpen className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(encodeURIComponent(r.id));
                                                        }}
                                                        title="Remove"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {records.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="text-center py-12 text-[#94a3b8] italic">
                                                No quotation records found.
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
                </>
            ) : (
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" className="h-12 w-12 p-0 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group" onClick={() => setView('list')}>
                                <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-primary transition-colors" />
                            </Button>
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
                                    {view === 'view' ? 'Review Estimation' : (editingId ? 'Updating Record' : 'Generate Quotation')}
                                </h1>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Quotation Workshop & Lifecycle Control</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-[10px] shadow-sm hover:bg-slate-50 transition-all" onClick={() => setShowPreview(!showPreview)}>
                                <Eye className="w-4 h-4 mr-2" /> {showPreview ? 'Deactivate Live Lens' : 'Activate Live Lens'}
                            </Button>
                        </div>
                    </div>

                    <div className={`grid gap-10 ${showPreview ? 'lg:grid-cols-5' : 'grid-cols-1'}`}>
                        <div className={showPreview ? 'lg:col-span-3' : ''}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden h-full">
                                    <h3 className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-700 mb-8 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Client Identity Profile
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[12px] font-black uppercase tracking-widest text-slate-600 ml-1">Customer Name</Label>
                                            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} disabled={view === 'view'} className="h-12 px-5 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-black text-slate-900 uppercase tracking-tight" placeholder="Enter registration name..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[12px] font-black uppercase tracking-widest text-slate-600 ml-1">Phone No.</Label>
                                            <Input value={mobile} onChange={e => setMobile(e.target.value)} disabled={view === 'view'} className="h-12 px-5 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-black text-slate-600 tracking-tighter" placeholder="+91 XXXXX XXXXX" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[12px] font-black uppercase tracking-widest text-slate-600 ml-1">Company Name</Label>
                                            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={view === 'view'} className="h-12 px-5 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-black text-slate-900 uppercase tracking-tight" placeholder="Enter company name..." />
                                        </div>
                                    </div>
                                    <div className="absolute top-0 right-0 p-8 opacity-5">
                                        <Users className="w-16 h-16" />
                                    </div>
                                </div>

                                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden h-full">
                                    <h3 className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-700 mb-8 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Project Strategic Context
                                    </h3>
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-[12px] font-black uppercase tracking-widest text-slate-600 ml-1">Sales Person</Label>
                                            <Input value={salesRef} onChange={e => setSalesRef(e.target.value)} disabled={view === 'view'} className="h-12 px-5 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-bold" placeholder="Designated account manager..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[12px] font-black uppercase tracking-widest text-slate-600 ml-1">Site Address</Label>
                                            <Input value={siteAddress} onChange={e => setSiteAddress(e.target.value)} disabled={view === 'view'} className="h-12 px-5 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-bold" placeholder="Final delivery coordinates..." />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                                    <h3 className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-700 mb-8 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Reference
                                    </h3>
                                    <div className="space-y-2">
                                        <Label className="text-[12px] font-black uppercase tracking-widest text-slate-600 ml-1">Reference Person</Label>
                                        <Input value={referenceInfo} onChange={e => setReferenceInfo(e.target.value)} disabled={view === 'view'} className="h-12 px-5 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-bold" placeholder="Operational comments or constraints..." />
                                    </div>
                                </div>

                                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                                    <h3 className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-700 mb-8 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Terms & Conditions (Optional)
                                    </h3>
                                    <textarea
                                        value={extraTerms}
                                        onChange={e => setExtraTerms(e.target.value)}
                                        disabled={view === 'view'}
                                        className="w-full min-h-[100px] px-5 py-4 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-bold text-sm resize-none"
                                        placeholder="Add special instructions or custom terms for this quotation..."
                                    />
                                </div>

                                <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                                    <h3 className="text-[14px] font-black uppercase tracking-[0.15em] text-slate-700 mb-8 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        Enterprise Branding
                                    </h3>
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-[20px] border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50/50 overflow-hidden shrink-0 group hover:border-primary/20 transition-all">
                                            {customerLogo ? (
                                                <img src={customerLogo} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-[9px] text-slate-400 font-black uppercase tracking-tighter text-center px-1">Identity Pending</div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <Input type="file" accept="image/*" className="h-9 text-xs" onChange={handleLogoUpload} disabled={view === 'view'} />
                                            <p className="text-[10px] text-slate-400 italic">Optional customer logo for the PDF header</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Categories Section */}
                            <div className="space-y-10">

                                {/* Categories */}
                                {categories.map(cat => (
                                    <div key={cat.id} className="enterprise-card p-4 md:p-6 border border-[#e2e8f0] shadow-sm bg-white mb-6">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 border-b pb-2 gap-2">
                                            <Input
                                                value={cat.name}
                                                onChange={e => setCategories(categories.map(c => c.id === cat.id ? { ...c, name: e.target.value } : c))}
                                                disabled={view === 'view'}
                                                className="font-bold text-sm uppercase tracking-wider border-0 bg-transparent p-0 h-auto focus-visible:ring-0 w-full sm:w-auto disabled:opacity-100"
                                            />
                                            {view !== 'view' && (
                                                <div className="flex gap-1 self-end sm:self-auto">
                                                    <Button variant="outline" size="sm" className="h-8 md:h-9" onClick={() => addItem(cat.id)}>
                                                        <Plus className="w-3.5 h-3.5 mr-1" /> Item
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-8 md:h-9 text-muted-foreground hover:text-destructive" onClick={() => removeCategory(cat.id)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {cat.items.length > 0 && (
                                            <div className="overflow-x-auto -mx-4 md:mx-0">
                                                <table className="data-table min-w-full [&_td]:px-2 [&_th]:px-2">
                                                    <thead>
                                                        <tr className="text-slate-900 text-[11px] uppercase font-black tracking-widest border-b-2 border-slate-100">
                                                            <th className="w-[40px] text-center pb-3">#</th>
                                                            <th className="w-[50px] pb-3">Image</th>
                                                            <th className="w-[120px] pb-3 text-left">Company</th>
                                                            <th className="w-[150px] pb-3 text-left">Design</th>
                                                            <th className="w-[110px] pb-3 text-left">Finish</th>
                                                            <th className="w-[120px] pb-3 text-left">Size</th>
                                                            <th className="w-[90px] pb-3 text-left">Sqft/Bx</th>
                                                            <th className="text-center w-[80px] pb-3">Qty</th>
                                                            <th className="text-right w-[100px] pb-3">Price</th>
                                                            <th className="text-right w-[120px] pb-3">Total</th>
                                                            <th className="w-[40px] pb-3"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-[#f1f5f9]">
                                                        {cat.items.map((item, idx) => (
                                                            <tr key={item.id} className="group">
                                                                <td className="py-2 text-center text-[10px] font-bold text-slate-400 tabular-nums">{idx + 1}</td>
                                                                <td className="py-2">
                                                                    {item.image ? (
                                                                        <div className="relative w-10 h-10 group">
                                                                            <img src={item.image} alt="Design" className="w-10 h-10 rounded object-cover border" />
                                                                            <button
                                                                                onClick={() => updateItem(cat.id, item.id, 'image', null)}
                                                                                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full flex items-center justify-center transition-all"
                                                                            >
                                                                                <X className="w-2 h-2" />
                                                                            </button>
                                                                        </div>
                                                                    ) : (
                                                                        <label className="w-10 h-10 rounded border border-dashed flex items-center justify-center cursor-pointer hover:bg-slate-50">
                                                                            <ImagePlus className="w-3.5 h-3.5 text-muted-foreground" />
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                className="hidden"
                                                                                onChange={(e) => {
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
                                                                    )}
                                                                </td>
                                                                <td className="py-2">
                                                                    <Input
                                                                        className="h-10 text-sm font-black text-slate-900 border-slate-200 shadow-sm"
                                                                        value={item.company}
                                                                        onChange={e => updateItem(cat.id, item.id, 'company', e.target.value)}
                                                                        disabled={view === 'view'}
                                                                        list="master-companies"
                                                                    />
                                                                </td>
                                                                <td className="py-2">
                                                                    <Input
                                                                        className="h-10 text-sm font-black text-slate-900 border-slate-200 shadow-sm uppercase tracking-tight"
                                                                        value={item.design}
                                                                        onChange={e => {
                                                                            const val = e.target.value;
                                                                            updateItem(cat.id, item.id, 'design', val);

                                                                            // 1. First, search in current session (existing items in this quotation)
                                                                            const allSessionItems = categories.flatMap(c => c.items);
                                                                            const sessionMatch = allSessionItems.find(i => 
                                                                                i.id !== item.id && // Don't match self
                                                                                i.design.toLowerCase() === val.toLowerCase() && 
                                                                                i.image && // Must have a photo
                                                                                (!item.company || i.company.toLowerCase() === item.company.toLowerCase())
                                                                            );

                                                                            // 2. Second, search in Master Data
                                                                            const masterMatch = masterProducts.find(p =>
                                                                                p.design.toLowerCase() === val.toLowerCase() &&
                                                                                (!item.company || p.company.toLowerCase() === item.company.toLowerCase())
                                                                            );

                                                                            const matched = sessionMatch || masterMatch;

                                                                            if (matched) {
                                                                                setCategories(prev => prev.map(c => c.id === cat.id ? {
                                                                                    ...c, items: c.items.map(i => {
                                                                                        if (i.id === item.id) {
                                                                                            // Map fields from match (Session items use same keys as master items for core fields)
                                                                                            const newSize = matched.size || i.size;
                                                                                            const opts = getSizeMultiplierOptions(newSize);
                                                                                            const updated = {
                                                                                                ...i,
                                                                                                company: matched.company || i.company,
                                                                                                design: matched.design, // Correct casing
                                                                                                finish: (matched as any).finish || i.finish,
                                                                                                size: newSize,
                                                                                                image: matched.image || i.image,
                                                                                            };
                                                                                            if (!opts.includes(updated.multiplier)) {
                                                                                                updated.multiplier = opts[0];
                                                                                            }
                                                                                            // Total calculation
                                                                                            const m = Number(updated.multiplier) || 0;
                                                                                            const q = Number(updated.qty) || 0;
                                                                                            const p = Number(updated.unitPrice) || 0;
                                                                                            updated.total = m * q * p;
                                                                                            return updated;
                                                                                        }
                                                                                        return i;
                                                                                    })
                                                                                } : c));
                                                                            }
                                                                        }}
                                                                        disabled={view === 'view'}
                                                                        list={`designs-${cat.id}-${item.id}`}
                                                                    />
                                                                    <datalist id={`designs-${cat.id}-${item.id}`}>
                                                                        {(masterProducts || [])
                                                                            .filter(p => !item.company || p.company.toLowerCase() === item.company.toLowerCase())
                                                                            .map((p, idx) => (
                                                                                <option key={idx} value={p.design} />
                                                                            ))}
                                                                    </datalist>
                                                                </td>
                                                                <td className="py-2"><Input className="h-10 text-sm font-black text-slate-900 border-slate-200 shadow-sm" value={item.finish} onChange={e => updateItem(cat.id, item.id, 'finish', e.target.value)} disabled={view === 'view'} /></td>
                                                                <td className="py-2"><Input className="h-10 text-sm font-black text-slate-900 border-slate-200 shadow-sm" value={item.size} onChange={e => {
                                                                    const val = e.target.value;
                                                                    updateItem(cat.id, item.id, 'size', val);
                                                                    const options = getSizeMultiplierOptions(val);
                                                                    if (!options.includes(item.multiplier) && item.multiplier !== 1) {
                                                                        updateItem(cat.id, item.id, 'multiplier', options[0]);
                                                                    }
                                                                }} disabled={view === 'view'} /></td>
                                                                <td className="py-2">
                                                                    {isManualMap[item.id] ? (
                                                                        <Input
                                                                            className="h-10 w-full text-sm font-black text-slate-900 border-slate-200 shadow-sm"
                                                                            type="number"
                                                                            value={item.multiplier || ''}
                                                                            onChange={e => updateItem(cat.id, item.id, 'multiplier', Number(e.target.value))}
                                                                            onBlur={() => {
                                                                                if (getSizeMultiplierOptions(item.size).includes(item.multiplier) || item.multiplier === 1) {
                                                                                    setIsManualMap(prev => ({ ...prev, [item.id]: false }));
                                                                                }
                                                                            }}
                                                                            autoFocus
                                                                        />
                                                                    ) : (
                                                                        <select
                                                                            className="h-10 w-full text-sm bg-white border border-slate-200 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 font-black text-slate-900 shadow-sm"
                                                                            value={item.multiplier}
                                                                            onChange={e => {
                                                                                const val = e.target.value;
                                                                                if (val === 'manual') {
                                                                                    setIsManualMap(prev => ({ ...prev, [item.id]: true }));
                                                                                    updateItem(cat.id, item.id, 'multiplier', 0);
                                                                                } else {
                                                                                    updateItem(cat.id, item.id, 'multiplier', Number(val));
                                                                                }
                                                                            }}
                                                                            disabled={view === 'view'}
                                                                        >
                                                                            {getSizeMultiplierOptions(item.size).map(opt => (
                                                                                <option key={opt} value={opt}>{opt}</option>
                                                                            ))}
                                                                            <option value={1}>None</option>
                                                                            <option value="manual">Add Manually</option>
                                                                        </select>
                                                                    )}
                                                                </td>
                                                                <td className="py-2">
                                                                    {item.multiplier === 1 ? (
                                                                        <Input
                                                                            className="h-10 text-sm font-black bg-white text-center no-spinner border-slate-200 shadow-sm"
                                                                            type="number"
                                                                            value={item.qty || ''}
                                                                            onChange={e => updateItem(cat.id, item.id, 'qty', +e.target.value)}
                                                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                                            disabled={view === 'view'}
                                                                            placeholder="BOX"
                                                                        />
                                                                    ) : (
                                                                        <Input className="h-10 text-sm font-black bg-white text-center no-spinner border-slate-200 shadow-sm" type="number" value={item.qty || ''} onChange={e => updateItem(cat.id, item.id, 'qty', +e.target.value)} onWheel={(e) => (e.target as HTMLInputElement).blur()} disabled={view === 'view'} />
                                                                    )}
                                                                </td>
                                                                <td className="py-2"><Input className="h-10 text-sm font-black bg-white text-right no-spinner border-slate-200 shadow-sm" type="number" value={item.unitPrice || ''} onChange={e => updateItem(cat.id, item.id, 'unitPrice', +e.target.value)} onWheel={(e) => (e.target as HTMLInputElement).blur()} disabled={view === 'view'} /></td>
                                                                <td className="py-2"><Input className="h-10 text-sm font-black bg-slate-50 text-right no-spinner border-primary/20 text-primary shadow-sm" type="number" value={item.total || ''} onChange={e => updateItem(cat.id, item.id, 'total', +e.target.value)} onWheel={(e) => (e.target as HTMLInputElement).blur()} disabled={view === 'view'} /></td>
                                                                <td className="py-2">
                                                                    {view !== 'view' && (
                                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-all" onClick={() => removeItem(cat.id, item.id)}>
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </Button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <datalist id="master-companies">
                                            {(masterCompanies || []).map((c, idx) => (
                                                <option key={idx} value={c.name} />
                                            ))}
                                        </datalist>

                                        <div className="text-right mt-4 pt-4 border-t border-[#f1f5f9] text-sm font-extrabold">
                                            <span className="text-[#94a3b8] uppercase text-[10px] tracking-widest mr-2">Category Total:</span>
                                            <span className="text-primary text-base">₹{cat.items.reduce((s, i) => s + (Number(i.total) || 0), 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}

                                {view !== 'view' && (
                                    <Button variant="outline" onClick={addCategory} className="w-full border-dashed h-14 text-[#64748b] hover:bg-[#f8fafc] mb-6 font-semibold">
                                        <Plus className="w-5 h-5 mr-2" /> Add Category Section
                                    </Button>
                                )}

                                {/* Estimate Total and GST */}
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${includeGst ? 'bg-[#855546] text-white' : 'border border-slate-300 bg-white'}`}>
                                                    {includeGst && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                                <span className="text-[12px] font-black uppercase tracking-widest text-[#855546] group-hover:text-[#6a4438] transition-colors">Apply GST (18%)</span>
                                                <input type="checkbox" className="hidden" checked={includeGst} onChange={e => setIncludeGst(e.target.checked)} disabled={view === 'view'} />
                                            </label>
                                        </div>
                                    </div>

                                    {includeGst && (
                                        <div className="flex flex-col gap-2 mb-4 text-[12px] font-bold text-slate-500 uppercase tracking-widest">
                                            <div className="flex justify-between">
                                                <span>Subtotal</span>
                                                <span className="text-slate-700">₹{Math.round(grandTotalValue).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>CGST (9%)</span>
                                                <span className="text-slate-700">₹{Math.round(grandTotalValue * 0.09).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>SGST (9%)</span>
                                                <span className="text-slate-700">₹{Math.round(grandTotalValue * 0.09).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Payable Total</span>
                                            <span className="text-[11px] font-bold text-slate-500 italic">Net Estimate Value</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{Math.round(finalTotalValue).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] gap-4 mt-10">
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        {view === 'view' ? (
                                            <>
                                                <Button className="h-11 px-8 font-bold shadow-md shadow-primary/20" onClick={() => setView('form')}>
                                                    <Pencil className="w-4 h-4 mr-2" /> Edit Quotation
                                                </Button>
                                                <Button variant="outline" className="h-11 px-6 text-[#64748b] font-semibold" onClick={() => setView('list')}>Close</Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button className="h-11 px-8 font-bold shadow-md shadow-primary/20" onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Quotation</Button>
                                                <Button variant="outline" className="h-11 px-6 text-[#64748b] font-semibold" onClick={() => setView('list')}>Cancel</Button>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Button variant="outline" className="h-11 text-[#1e293b] font-bold border-slate-300 bg-white hover:bg-slate-50" onClick={() => handleGeneratePDF()}><FileDown className="w-4 h-4 mr-2 text-primary" /> PDF</Button>
                                        <Button
                                            variant="outline"
                                            className="h-11 text-emerald-700 font-bold border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50"
                                            onClick={() => handleWhatsAppShare({
                                                id: editingId || 'NEW',
                                                customerName,
                                                mobile,
                                                grandTotal: grandTotalValue,
                                                salesRef,
                                                date: new Date().toISOString(),
                                                categories,
                                                siteAddress,
                                                referenceInfo,
                                                customerLogo,
                                                status: 'Pending'
                                            })}
                                        >
                                            <Share2 className="w-4 h-4 mr-2" /> WhatsApp
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="h-11 text-amber-700 font-bold border-amber-200 bg-amber-50/50 hover:bg-amber-50"
                                            onClick={() => {
                                                setSelectedRecordForExport({
                                                    id: editingId || 'NEW',
                                                    customerName,
                                                    mobile,
                                                    grandTotal: grandTotalValue,
                                                    salesRef,
                                                    date: new Date().toISOString(),
                                                    categories,
                                                    siteAddress,
                                                    referenceInfo,
                                                    customerLogo,
                                                    status: editingId ? (records.find(r => r.id === editingId)?.status || 'Pending') : 'Pending'
                                                });
                                                setOrderExportOpen(true);
                                            }}
                                        >
                                            <PackageOpen className="w-4 h-4 mr-2" /> Order Export
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Preview Panel */}
                        {showPreview && (
                            <div className="lg:col-span-2">
                                <div className="enterprise-card sticky top-24 bg-white border border-[#e2e8f0] shadow-xl p-6 md:p-8 rounded-2xl overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />

                                    <div className="relative">
                                        <div className="text-center border-b border-slate-100 pb-6 mb-8 bg-[#855546] rounded-t-2xl pt-8 -mt-8 -mx-8 relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-full bg-black/10 blur-3xl opacity-50 pointer-events-none" />
                                            <img src={omadaLogo} alt="OMADA" className="h-10 mx-auto relative z-10 brightness-0 invert" />
                                            <p className="text-[10px] uppercase font-black text-white tracking-[0.4em] mt-3 relative z-10">Quotation</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6 text-[11px] mb-8">
                                            <div className="space-y-1.5 p-3 bg-slate-50 rounded-lg">
                                                <p className="text-[#94a3b8] uppercase font-extrabold text-[9px] tracking-wider">Customer Details</p>
                                                <p className="font-black text-slate-900 text-[13px]">{customerName || 'N/A'}</p>
                                                <p className="font-bold text-slate-500 tracking-tight">{mobile || '—'}</p>
                                            </div>
                                            <div className="text-right space-y-1.5 p-3 border border-slate-100 rounded-lg">
                                                <p className="text-[#94a3b8] uppercase font-extrabold text-[9px] tracking-wider">Reference Info</p>
                                                <p className="font-black text-slate-800 italic">{salesRef || '—'}</p>
                                                <p className="font-bold text-slate-400">{new Date().toLocaleDateString('en-GB')}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6 mb-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            {categories.map(cat => (
                                                <div key={cat.id} className="space-y-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1.5 h-4 bg-[#855546] rounded-full shadow-[0_0_8px_rgba(133,85,70,0.5)]" />
                                                        <h4 className="text-[13px] font-black uppercase text-[#1e293b] tracking-widest">{cat.name}</h4>
                                                    </div>

                                                    <div className="space-y-2 pl-4">
                                                        {cat.items.map(item => (
                                                            <div key={item.id} className="group flex items-center justify-between gap-4 text-[11px] py-1 border-b border-slate-50 hover:border-slate-100 transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    {item.image && (
                                                                        <div className="w-10 h-10 rounded-md overflow-hidden border border-slate-100 shadow-sm flex-shrink-0">
                                                                            <img src={item.image} alt="" className="w-full h-full object-cover" />
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <p className="font-black text-slate-800 uppercase leading-none mb-1">{item.design || 'Unnamed Item'}</p>
                                                                        <p className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">{item.finish} • {item.size}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right flex flex-col items-end">
                                                                    <span className="font-black text-[12px] text-slate-900 leading-none">₹{(item.total || 0).toLocaleString()}</span>
                                                                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{item.qty} Boxes</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="bg-[#855546] p-4 rounded-xl shadow-lg shadow-slate-200/40 flex flex-col gap-3 text-white mb-4 relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                            <div className="flex justify-between items-center relative z-10 w-full mb-2">
                                                <label className="flex items-center gap-2 cursor-pointer group/label">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${includeGst ? 'bg-white border-white text-[#855546]' : 'border-white/40 bg-transparent'}`}>
                                                        {includeGst && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/90 group-hover/label:text-white transition-colors">Apply GST (18%)</span>
                                                    <input type="checkbox" className="hidden" checked={includeGst} onChange={e => setIncludeGst(e.target.checked)} />
                                                </label>
                                            </div>

                                            {includeGst && (
                                                <div className="relative z-10 w-full flex flex-col gap-1 border border-black rounded-lg p-4 bg-[#FAF3F0] mb-1">
                                                    <div className="flex justify-between text-[11px] text-[#475569] font-black uppercase tracking-widest">
                                                        <span>Subtotal</span>
                                                        <span className="text-black">₹{Math.round(grandTotalValue).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] text-[#475569] font-black uppercase tracking-widest">
                                                        <span>CGST (9%)</span>
                                                        <span className="text-black">₹{Math.round(grandTotalValue * 0.09).toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[11px] text-[#475569] font-black uppercase tracking-widest">
                                                        <span>SGST (9%)</span>
                                                        <span className="text-black">₹{Math.round(grandTotalValue * 0.09).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-end relative z-10 w-full mt-1 border-t border-white/20 pt-3">
                                                <div>
                                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70 block mb-0.5">Payable Total</span>
                                                    <span className="text-[10px] font-bold text-white/50 italic">Verified Selection</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[20px] font-black tracking-tighter">₹{Math.round(finalTotalValue).toLocaleString()}</span>
                                                    <span className="text-[8px] font-bold text-white/50 tracking-widest uppercase block mt-[-2px]">Final Estimate</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-[9px] leading-relaxed relative">
                                            <p className="font-black text-slate-600 uppercase tracking-widest mb-2 border-b border-slate-200 pb-1 flex items-center justify-between">
                                                Official Terms
                                                <span className="text-[8px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">B2B Standard</span>
                                            </p>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-bold uppercase">Valid Thru:</span>
                                                    <span className="text-slate-700 font-black">7 Working Days</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-bold uppercase">Delivery:</span>
                                                    <span className="text-slate-700 font-black">Prompt Dispatch</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-bold uppercase">GST:</span>
                                                    <span className="text-slate-700 font-black">18% Extra</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400 font-bold uppercase">Payment:</span>
                                                    <span className="text-slate-700 font-black">100% Advance</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            <Dialog open={orderExportOpen} onOpenChange={setOrderExportOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-auto">
                    <DialogHeader className="border-b pb-4 mb-4">
                        <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-3 text-slate-900">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                <PackageOpen className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col">
                                <span>Generate Company-wise Orders</span>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Order Export Pipeline</span>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-12 py-8 bg-slate-50/50 -mx-6 px-6 border-b border-slate-100">
                        {selectedRecordForExport && (() => {
                            const groupedByCompany: Record<string, { company: string; items: any[] }> = {};
                            selectedRecordForExport.categories.forEach(cat => {
                                cat.items.forEach(item => {
                                    const compName = item.company?.trim() || 'Unknown Company';
                                    const key = compName.toLowerCase();
                                    if (!groupedByCompany[key]) groupedByCompany[key] = { company: compName, items: [] };
                                    groupedByCompany[key].items.push({ ...item, categoryName: cat.name });
                                });
                            });

                            // Sort companies to ensure consistent numbering
                            const sortedCompanyEntries = Object.entries(groupedByCompany).sort((a, b) => a[1].company.localeCompare(b[1].company));

                            return sortedCompanyEntries.map(([key, { company, items }], index) => {
                                const poSequence = index + 1;
                                // ID will be generated by server: Quotation-1001, Quotation-1002 etc.
                                const poDisplay = `Quotation-#### (${poSequence})`; 

                                return (
                                    <div key={company} className="border-2 border-slate-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl shadow-slate-200/40 bg-white hover:border-primary/20 transition-all duration-500 group/card">
                                        <div className="bg-white px-4 sm:px-8 py-5 sm:py-7 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 relative overflow-hidden gap-4">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 pointer-events-none" />

                                            <div className="relative z-10 flex items-center gap-3 sm:gap-6">
                                                <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center shadow-inner group-hover/card:scale-105 transition-transform duration-500 shrink-0">
                                                    <PackageOpen className="w-5 h-5 sm:w-8 sm:h-8 text-primary" />
                                                </div>
                                                <div className="text-left min-w-0">
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                                        <h4 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 uppercase truncate">
                                                            {company || 'Unknown Company'}
                                                        </h4>
                                                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest shadow-sm">Verified Vendor</span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
                                                        <span className="text-[10px] sm:text-[11px] text-primary font-black uppercase tracking-[0.15em] sm:tracking-[0.2em]">Official Purchase Order</span>
                                                        <span className="hidden sm:block w-1.5 h-1.5 bg-slate-200 rounded-full" />
                                                        <span className="text-xs sm:text-sm text-slate-900 font-black uppercase tracking-wider">PO: {poDisplay}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="relative z-10 flex items-center gap-2 sm:gap-3">
                                                <Button
                                                    size="sm"
                                                    className="h-9 sm:h-11 px-4 sm:px-7 text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] bg-slate-900 text-white hover:bg-primary transition-all shadow-lg hover:shadow-primary/20 rounded-lg sm:rounded-xl"
                                                    onClick={() => handleGenerateOrderPDF(company, items, selectedRecordForExport, 'AUTO')}
                                                >
                                                    <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> PDF
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-9 sm:h-11 px-4 sm:px-7 text-[10px] sm:text-xs font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] border-slate-200 text-slate-600 hover:bg-slate-50 transition-all rounded-lg sm:rounded-xl"
                                                    onClick={() => handleGenerateOrderImage(company, items, selectedRecordForExport, 'AUTO')}
                                                >
                                                    <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Image
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="p-4 sm:p-8">
                                            <div className="flex flex-col md:flex-row gap-6 sm:gap-10 mb-6 sm:mb-10 pb-6 sm:pb-8 border-b border-slate-100">
                                                <div className="flex-1 space-y-3 sm:space-y-4">
                                                    <h5 className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 border-l-2 border-primary pl-3 mb-3 sm:mb-4">Document Metadata</h5>
                                                    <div className="grid grid-cols-2 gap-4 sm:gap-8">
                                                        <div>
                                                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 sm:mb-1.5">Issue Date</p>
                                                            <p className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">{new Date(selectedRecordForExport.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>

                                            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
                                                <table className="w-full text-xs sm:text-[13px] border-collapse min-w-[500px]">
                                                    <thead>
                                                        <tr className="bg-slate-900/5 border-b border-slate-200">
                                                            <th className="text-left py-6 px-8 text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] w-1/2">Line Item & Description</th>
                                                            <th className="text-center py-6 px-8 text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Technical Specs</th>
                                                            <th className="text-right py-6 px-8 text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Declared Quantity</th>
                                                            <th className="w-12"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {items.map((it, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                                                <td className="py-4 sm:py-6 px-4 sm:px-8">
                                                                    <div className="flex items-center gap-3 sm:gap-4">
                                                                        {it.image && (
                                                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border border-slate-200 overflow-hidden shrink-0 shadow-sm transition-all group-hover:border-primary/30">
                                                                                <img src={it.image} alt="" className="w-full h-full object-cover" />
                                                                            </div>
                                                                        )}
                                                                        <div className="text-left min-w-0">
                                                                            <p className="font-black text-slate-800 uppercase tracking-tight text-xs sm:text-sm mb-0.5 truncate">{it.design}</p>
                                                                            <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{it.categoryName}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="text-center py-4 sm:py-6 px-4 sm:px-8">
                                                                    <span className="inline-flex flex-col items-center">
                                                                        <span className="font-bold text-slate-700 text-xs sm:text-sm">{it.size}</span>
                                                                        <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-black tracking-tighter mt-1">{it.finish}</span>
                                                                    </span>
                                                                </td>
                                                                <td className="text-right py-4 sm:py-6 px-4 sm:px-8">
                                                                    <div className="inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-50 rounded-xl group-hover:bg-white border border-transparent group-hover:border-slate-200 transition-all">
                                                                        <span className="font-black text-slate-900 text-xs sm:text-sm">{it.multiplier === 1 ? (it.boxes || 0) : it.qty}</span>
                                                                        <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">Units</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-4 px-4 text-right">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-slate-400 hover:text-destructive"
                                                                        onClick={() => {
                                                                            if (selectedRecordForExport) {
                                                                                const updatedCategories = selectedRecordForExport.categories.map(c => ({
                                                                                    ...c,
                                                                                    items: c.items.filter(item => item.id !== it.id)
                                                                                }));
                                                                                setSelectedRecordForExport({ ...selectedRecordForExport, categories: updatedCategories });
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                                                            <td colSpan={2} className="py-4 sm:py-6 px-4 sm:px-10 text-right font-black uppercase text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.3em] text-slate-400">Total Material Allocation</td>
                                                            <td className="py-4 sm:py-6 px-4 sm:px-10 text-right">
                                                                <div className="flex flex-col items-end">
                                                                    <p className="text-xl sm:text-2xl font-black tracking-tighter leading-none text-slate-900">
                                                                        {items.reduce((sum, it) => sum + Number((it.multiplier === 1 ? it.boxes : it.qty) || 0), 0)}
                                                                    </p>
                                                                    <p className="text-[9px] sm:text-[10px] font-black text-primary uppercase tracking-[0.15em] sm:tracking-[0.25em] mt-1.5 sm:mt-2 flex items-center gap-2">
                                                                        <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                                                                        Consolidated Units
                                                                    </p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                );
                            });
                        })()}
                    </div>

                    <DialogFooter className="border-t pt-6 mt-6">
                        <Button
                            variant="outline"
                            className="px-8 font-black uppercase tracking-widest text-xs h-11 border-slate-200 hover:bg-slate-50 hover:text-slate-900 transition-all rounded-xl"
                            onClick={() => setOrderExportOpen(false)}
                        >
                            Close Record
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default QuotationPage;
