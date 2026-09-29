import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileDown, Printer, Phone, CheckCircle, AlertCircle, Loader2, Share2, Building2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import omadaLogo from '@/assets/omada-logo.png';
import { format } from 'date-fns';

interface QuotationItem {
    id: string;
    company: string;
    design: string;
    finish: string;
    size: string;
    weight?: string;
    multiplier: number;
    qty: number;
    unitPrice: number;
    unit_price?: number;
    total: number;
    image: string | null;
    boxes?: number;
}

interface Category {
    id: string;
    name: string;
    items: QuotationItem[];
}

interface QuotationData {
    id: string;
    customerName: string;
    companyName?: string;
    mobile: string;
    salesRef?: string;
    date: string;
    grandTotal: number;
    categories: Category[];
    siteAddress?: string;
    referenceInfo?: string;
    customerLogo?: string | null;
    status: string;
    includeGst?: boolean;
    extraTerms?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const PublicQuotationViewPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<QuotationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuotation = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE_URL}/quotations/public/${id}`);
                if (!res.ok) {
                    throw new Error('Quotation not found or expired');
                }
                const result = await res.json();
                setData(result);
            } catch (err: any) {
                console.error('Failed to load public quotation:', err);
                setError(err.message || 'Failed to load quotation');
            } finally {
                setLoading(false);
            }
        };

        fetchQuotation();
    }, [id]);

    const renderPageToCanvas = async (html: string) => {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = '-9999px';
        div.style.top = '0';
        div.style.width = '210mm';
        div.style.backgroundColor = '#000000';
        div.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
        div.innerHTML = html;

        document.body.appendChild(div);

        try {
            try {
                await document.fonts.ready;
            } catch (e) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            const images = Array.from(div.getElementsByTagName('img'));
            await Promise.all(images.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve; // Continue even if one image fails
                });
            }));

            const canvas = await html2canvas(div, {
                scale: 2.5,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#000000',
                logging: false,
                windowWidth: 794,
            });
            return canvas;
        } finally {
            if (div.parentNode) {
                document.body.removeChild(div);
            }
        }
    };

    const handleDownloadPDF = async () => {
        if (!data) return;
        setDownloading(true);
        const toastId = toast.loading('Generating high-resolution official PDF...');

        try {
            const quotationNo = data.id || 'QUOTATION';
            const dateFormatted = data.date ? format(new Date(data.date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy');

            const categories = data.categories || [];
            const subtotal = categories.reduce((acc, cat) => acc + (cat.items || []).reduce((s, i) => s + (Number(i.total) || 0), 0), 0);
            const cgst = data.includeGst ? subtotal * 0.09 : 0;
            const sgst = data.includeGst ? subtotal * 0.09 : 0;
            const rawTotal = data.includeGst ? (subtotal + cgst + sgst) : subtotal;
            const totalCost = Math.round(rawTotal);
            const roundOff = Number((totalCost - rawTotal).toFixed(2));

            const marbleTextureUrl = window.location.origin + '/marble-texture.png';

            const html = `
              <div style="width: 210mm; height: auto; display: flex; flex-direction: column; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #1A1A1A; background: #000000; padding: 0; box-sizing: border-box; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -1px; left: -1px; right: -1px; height: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>
                <div style="position: absolute; bottom: -1px; left: -1px; right: -1px; height: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>
                <div style="position: absolute; top: -1px; left: -1px; bottom: -1px; width: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>
                <div style="position: absolute; top: -1px; right: -1px; bottom: -1px; width: calc(2.5mm + 1px); background: #000000; z-index: 10000;"></div>

                <div style="display: flex; flex-direction: column; padding: 2.5mm; position: relative; background: #ffffff;">
                  <div style="position: absolute; top: 0; left: 0; right: 0; height: 520px; background: #855546; z-index: 0; overflow: hidden;">
                      <div style="position: absolute; inset: 0; background: url('${marbleTextureUrl}'); background-size: cover; opacity: 0.08;"></div>
                  </div>
                  <div style="position: absolute; top: 520px; left: 0; right: 0; bottom: 0; background: #ffffff; z-index: 0;"></div>

                  <div style="position: relative; z-index: 3; display: flex; flex-direction: column;">
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

                  <div style="padding: 0 60px 40px 80px;">
                    <table style="width: 100%; border-collapse: separate; border-spacing: 20px 0; margin-left: -20px;">
                      <tr>
                        <td style="width: 50%; vertical-align: top;">
                          <div style="background: #ffffff; border: 1px solid #E5E5E5; border-radius: 12px; padding: 22px 25px; box-shadow: 0 10px 40px rgba(0,0,0,0.06); position: relative; overflow: hidden; height: 160px; box-sizing: border-box; display: flex; flex-direction: column;">
                            <div style="position: absolute; top: 0; left: 0; bottom: 0; width: 6px; background: #855546;"></div>
                            <div style="font-size: 9px; font-weight: 900; color: #888888; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 12px; border-bottom: 1px solid #F6F6F6; padding-bottom: 8px;">Prepared For Excellence</div>
                            <div style="font-size: 18px; font-weight: 950; color: #111111; margin-bottom: 2px; line-height: 1.2;">${data.customerName || 'Valued Customer'}</div>
                            ${data.companyName ? `<div style="font-size: 11px; font-weight: 800; color: #666; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">${data.companyName}</div>` : ''}
                            <div style="font-size: 14px; color: #855546; font-weight: 800; margin-bottom: 10px;">+91 ${data.mobile || ''}</div>
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

                  <div style="padding: 0 60px 20px 80px;">
                    ${(() => {
                        const style = { accent: '#855546', bg: 'rgba(133, 85, 70, 0.03)' };
                        return categories.map((cat) => {
                            const items = cat.items || [];
                            if (items.length === 0) return '';
                            return `
                          <div style="margin-bottom: 45px;">
                             <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 25px;">
                                 <div style="height: 1.5px; background: ${style.accent}; flex: 1;"></div>
                                 <div style="font-size: 13px; font-weight: 1000; color: ${style.accent}; text-transform: uppercase; letter-spacing: 4px; display: flex; align-items: center; gap: 8px;">
                                     <span>◆</span> ${cat.name || 'Category'} <span>◆</span>
                                 </div>
                                 <div style="height: 1.5px; background: ${style.accent}; flex: 1;"></div>
                             </div>

                            <div style="display: flex; flex-direction: column; gap: 20px;">
                                ${items.map((item) => {
                                    const uPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
                                    const qty = Number(item.qty || 0);
                                    const total = Number(item.total || 0);
                                    const multiplier = Number(item.multiplier || 16);
                                    const boxes = Number(item.boxes || 0);

                                    return `
                                    <div style="background: #ffffff; border: 1px solid #EFEFEF; border-radius: 12px; padding: 20px; display: flex; box-shadow: 0 5px 15px rgba(0,0,0,0.03);">
                                        <div style="width: 140px; height: 95px; border-radius: 10px; overflow: hidden; border: 1.5px solid #F5F5F5; background: #FDFDFD; box-shadow: 0 4px 12px rgba(0,0,0,0.07); flex-shrink: 0;">
                                            ${item.image ? `<img src="${item.image}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #CCC; font-weight: 800; background: #FAFAFA;">STUDIO PREVIEW</div>`}
                                        </div>

                                        <div style="flex: 1; padding: 0 25px; display: flex; flex-direction: column; justify-content: center;">
                                            <div style="font-size: 16px; font-weight: 1000; color: #111; text-transform: uppercase; margin-bottom: 5px; letter-spacing: -0.2px;">${item.design || 'Product'}</div>
                                            <div style="font-size: 10px; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: 0.8px;">${item.finish || ''} • ${item.size || ''}${item.weight ? ` • ${item.weight}` : ''}</div>
                                        </div>

                                        <div style="width: 220px; border-left: 1px solid #F2F2F2; padding-left: 25px; display: flex; flex-direction: column; justify-content: center; text-align: right;">
                                            <div style="display: flex; justify-content: flex-end; align-items: baseline; gap: 8px; margin-bottom: 8px;">
                                                <div style="text-align: right;">
                                                    <div style="font-size: 8px; font-weight: 900; color: #AAA; text-transform: uppercase; letter-spacing: 1px;">Unit Price</div>
                                                    <div style="font-size: 13px; font-weight: 900; color: #333;">₹${uPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </div>
                                                <div style="text-align: right; border-left: 1px dotted #DDD; padding-left: 10px;">
                                                    <div style="font-size: 8px; font-weight: 900; color: #AAA; text-transform: uppercase; letter-spacing: 1px;">Qty</div>
                                                    ${multiplier === 1 ? `
                                                        <div style="font-size: 13px; font-weight: 900; color: #333;">${qty} <span style="font-size: 8px; color: #999;">SQFT</span></div>
                                                        ${boxes ? `<div style="font-size: 8px; color: #666; font-weight: 700; margin-top: 2px;">${boxes} BOXES</div>` : ''}
                                                    ` : `
                                                        <div style="font-size: 13px; font-weight: 900; color: #333;">${qty} <span style="font-size: 8px; color: #999;">BOX</span></div>
                                                    `}
                                                </div>
                                            </div>
                                            <div style="height: 1px; background: #F5F5F5; width: 100%; margin: 5px 0 10px 0;"></div>
                                            <div>
                                                <div style="font-size: 8px; font-weight: 950; color: ${style.accent}; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 2px;">Total Line Value</div>
                                                <div style="font-size: 19px; font-weight: 1000; color: #000;">₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                                }).join('')}
                            </div>
                          </div>
                        `;
                        }).join('');
                    })()}

                    <div style="margin-top: 35px; margin-bottom: 40px; display: flex; justify-content: flex-end; align-items: center; gap: 20px;">
                      ${data.includeGst ? `
                        <div style="display: flex; flex-direction: column; gap: 10px; justify-content: center;">
                            <div style="width: 250px; ${roundOff !== 0 ? 'height: 125px;' : 'height: 110px;'} background: #FAF3F0; border: 1px solid #000000; border-radius: 12px; padding: 0 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center;">
                                 <table style="width: 100%; border-collapse: collapse;">
                                     <tr>
                                         <td style="font-size: 11px; color: #475569; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; padding: 3px 0;">Basis Total</td>
                                         <td style="font-size: 11px; color: #000000; font-weight: 900; text-align: right; padding: 3px 0;">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                     </tr>
                                     <tr>
                                         <td style="font-size: 11px; color: #475569; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; padding: 3px 0;">CGST (9%)</td>
                                         <td style="font-size: 11px; color: #000000; font-weight: 900; text-align: right; padding: 3px 0;">₹${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                     </tr>
                                     <tr>
                                         <td style="font-size: 11px; color: #475569; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; padding: 3px 0;">SGST (9%)</td>
                                         <td style="font-size: 11px; color: #000000; font-weight: 900; text-align: right; padding: 3px 0;">₹${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                     </tr>
                                     ${roundOff !== 0 ? `
                                     <tr>
                                         <td style="font-size: 11px; color: #475569; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; padding: 3px 0;">Round Off</td>
                                         <td style="font-size: 11px; color: #000000; font-weight: 900; text-align: right; padding: 3px 0;">${roundOff > 0 ? '+' : ''}₹${roundOff.toFixed(2)}</td>
                                     </tr>
                                     ` : ''}
                                 </table>
                            </div>
                            <div style="padding: 10px 15px; background: #FFF5F5; border: 1px solid #FED7D7; border-radius: 8px; color: #C53030; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                              ⚡ GST 18% Extra as per statutory norms
                            </div>
                        </div>
                      ` : (roundOff !== 0 ? `
                        <div style="display: flex; flex-direction: column; gap: 10px; justify-content: center;">
                            <div style="width: 250px; height: 75px; background: #FAF3F0; border: 1px solid #000000; border-radius: 12px; padding: 0 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; align-items: center;">
                                 <table style="width: 100%; border-collapse: collapse;">
                                     <tr>
                                         <td style="font-size: 11px; color: #475569; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; padding: 3px 0;">Items Total</td>
                                         <td style="font-size: 11px; color: #000000; font-weight: 900; text-align: right; padding: 3px 0;">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                     </tr>
                                     <tr>
                                         <td style="font-size: 11px; color: #475569; font-weight: 900; text-transform: uppercase; letter-spacing: 1.5px; padding: 3px 0;">Round Off</td>
                                         <td style="font-size: 11px; color: #000000; font-weight: 900; text-align: right; padding: 3px 0;">${roundOff > 0 ? '+' : ''}₹${roundOff.toFixed(2)}</td>
                                     </tr>
                                 </table>
                            </div>
                        </div>
                      ` : '')}
                      
                      <div style="width: 230px; height: 110px; background: #111111; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); border: 1.5px solid #855546; position: relative; display: flex; align-items: center; justify-content: center;">
                           <div style="position: absolute; top: 16px; width: 100%; text-align: center;">
                             <div style="font-size: 9px; font-weight: 950; color: #855546; text-transform: uppercase; letter-spacing: 2.5px; margin-bottom: 3px;">Quotation Total</div>
                             <div style="height: 1px; background: rgba(255,255,255,0.1); width: 25px; margin: 0 auto;"></div>
                           </div>
                           
                           <div style="display: flex; align-items: baseline; justify-content: center; margin-top: 10px;">
                              <span style="font-size: 18px; color: #855546; margin-right: 6px; font-weight: 900;">₹</span>
                              <span style="font-size: 36px; font-weight: 1000; letter-spacing: -1px; color: #ffffff;">${totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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

            const canvas = await renderPageToCanvas(html);
            const imgData = canvas.toDataURL('image/png', 1.0);
            const pdfWidth = 210;
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Quotation_${(data.customerName || 'Customer').replace(/\s+/g, '')}_${quotationNo}.pdf`);

            toast.dismiss(toastId);
            toast.success('Official PDF Downloaded Successfully!');
        } catch (err: any) {
            console.error('Download error:', err);
            toast.dismiss(toastId);
            toast.error(err?.message || 'Failed to download PDF. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
                <Loader2 className="w-10 h-10 animate-spin text-[#855546] mb-4" />
                <h2 className="text-xl font-bold tracking-wide">OMADA HOME STUDIO</h2>
                <p className="text-slate-400 text-sm mt-2">Loading official quotation...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Quotation Unavailable</h2>
                    <p className="text-slate-400 text-sm mb-6">{error || 'This quotation could not be found or has expired.'}</p>
                    <a href="tel:+917777976521" className="inline-flex items-center justify-center w-full px-4 py-3 bg-[#855546] hover:bg-[#6e463a] text-white font-bold rounded-xl transition">
                        <Phone className="w-4 h-4 mr-2" /> Contact Omada Studio
                    </a>
                </div>
            </div>
        );
    }

    const subtotal = data.categories.reduce((acc, cat) => acc + cat.items.reduce((s, i) => s + (Number(i.total) || 0), 0), 0);
    const cgst = data.includeGst ? subtotal * 0.09 : 0;
    const sgst = data.includeGst ? subtotal * 0.09 : 0;
    const rawTotal = data.includeGst ? (subtotal + cgst + sgst) : subtotal;
    const totalCost = Math.round(rawTotal);

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-4 sm:py-8 px-2 sm:px-4">
            {/* Top Fixed / Sticky Action Header */}
            <div className="sticky top-2 z-50 max-w-4xl w-full bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 sm:p-4 mb-6 shadow-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <img src={omadaLogo} alt="OMADA" className="h-7 sm:h-9 w-auto brightness-0 invert" />
                    <div className="border-l border-slate-700 pl-3">
                        <div className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Official Quotation</div>
                        <div className="text-sm sm:text-base font-extrabold text-white">{data.id}</div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        className="bg-[#855546] hover:bg-[#6e463a] text-white font-bold px-4 sm:px-6 shadow-lg shadow-[#855546]/30 rounded-xl transition"
                    >
                        {downloading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating PDF...</>
                        ) : (
                            <><FileDown className="w-4 h-4 mr-2" /> Download PDF</>
                        )}
                    </Button>
                    <a
                        href="tel:+917777976521"
                        className="inline-flex items-center justify-center h-10 px-3 sm:px-4 border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm rounded-xl transition"
                    >
                        <Phone className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> Studio
                    </a>
                </div>
            </div>

            {/* Quotation Preview Card */}
            <div className="max-w-4xl w-full bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
                {/* Header Strip */}
                <div className="bg-[#855546] p-6 sm:p-10 text-white relative overflow-hidden">
                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-200/80 bg-black/20 px-2.5 py-1 rounded-full">Omada Home Studio</span>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{data.customerName}</h1>
                            {data.companyName && <p className="text-xs uppercase font-bold tracking-wider text-amber-100/90">{data.companyName}</p>}
                            <p className="text-sm font-semibold text-amber-200">+91 {data.mobile}</p>
                        </div>
                        <div className="text-left sm:text-right">
                            <div className="text-xs uppercase font-bold tracking-widest opacity-75">Quotation No</div>
                            <div className="text-xl sm:text-2xl font-black text-white">{data.id}</div>
                            <div className="text-xs font-semibold opacity-90 mt-1">Date: {data.date ? format(new Date(data.date), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}</div>
                        </div>
                    </div>
                </div>

                {/* Studio & Project Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6 sm:p-8 bg-slate-50 border-b border-slate-200">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#855546] mb-2">Project & Site Info</div>
                        <div className="text-sm font-bold text-slate-900">{data.siteAddress || 'Studio Selection'}</div>
                        <div className="text-xs text-slate-500 mt-1">Sales Ref: <span className="font-semibold text-slate-700">{data.salesRef || 'Direct'}</span></div>
                        <div className="text-xs text-slate-500">Ref Person: <span className="font-semibold text-slate-700">{data.referenceInfo || 'Omada In-House'}</span></div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-[10px] font-black uppercase tracking-wider text-[#855546] mb-2">Bank & Remittance</div>
                        <div className="text-xs space-y-0.5 text-slate-700">
                            <div><span className="text-slate-400">Bank:</span> <strong>KOTAK MAHINDRA BANK</strong></div>
                            <div><span className="text-slate-400">A/C:</span> <strong>7777976521</strong></div>
                            <div><span className="text-slate-400">IFSC:</span> <strong>KKBK0002747</strong> (Vadodara)</div>
                        </div>
                    </div>
                </div>

                {/* Product Categories */}
                <div className="p-4 sm:p-8 space-y-8">
                    {data.categories.map((cat, idx) => {
                        if (!cat.items || cat.items.length === 0) return null;
                        return (
                            <div key={idx} className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-0.5 bg-[#855546] flex-1"></div>
                                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-[#855546]">{cat.name}</h3>
                                    <div className="h-0.5 bg-[#855546] flex-1"></div>
                                </div>

                                <div className="space-y-3">
                                    {cat.items.map((item, itemIdx) => (
                                        <div key={itemIdx} className="border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white hover:border-[#855546]/40 transition">
                                            <div className="flex items-center gap-4">
                                                <div className="w-20 h-16 sm:w-24 sm:h-18 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 flex items-center justify-center">
                                                    {item.image ? (
                                                        <img src={item.image} alt={item.design} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Omada</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm sm:text-base font-black text-slate-900 uppercase">{item.design}</h4>
                                                    <p className="text-xs text-slate-600 font-semibold">{item.finish} • {item.size}{item.weight ? ` • ${item.weight}` : ''}</p>
                                                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Rate: ₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })} • Qty: {item.qty} {item.multiplier === 1 ? 'SQFT' : 'BOX'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                                                <div className="text-[9px] uppercase font-bold text-slate-400">Line Total</div>
                                                <div className="text-base sm:text-lg font-black text-slate-900">₹{Number(item.total).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Totals Section */}
                <div className="p-6 sm:p-8 bg-slate-900 text-white flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div className="text-xs space-y-1 text-slate-400 text-center sm:text-left">
                        <div className="flex items-center gap-2 justify-center sm:justify-start text-emerald-400 font-bold">
                            <CheckCircle className="w-4 h-4" /> Official Studio Verified Quotation
                        </div>
                        <p>Prices quoted are subject to terms & standard breakage tolerances.</p>
                        {data.includeGst && <p className="text-amber-300 font-bold">⚡ Includes 18% GST Breakdown (CGST 9% + SGST 9%)</p>}
                    </div>

                    <div className="bg-slate-800 border border-[#855546] rounded-xl p-4 sm:p-6 text-center sm:text-right min-w-[240px]">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#855546]">Grand Total</div>
                        <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                            ₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* Extra Terms if any */}
                {data.extraTerms && (
                    <div className="p-6 bg-red-50 border-t border-red-100 text-xs">
                        <div className="font-bold text-red-800 uppercase tracking-wider mb-1">Special Terms</div>
                        <div className="text-red-700 font-medium whitespace-pre-line">{data.extraTerms}</div>
                    </div>
                )}
            </div>

            {/* Bottom Footer */}
            <div className="max-w-4xl w-full text-center py-6 text-slate-500 text-xs space-y-2">
                <p>© {new Date().getFullYear()} Omada Home Studio LLP. All Rights Reserved.</p>
                <p>Saiyed Vasna Road, Vadodara, Gujarat 390015 • PH: +91 7777976521 • www.omadagroup.in</p>
            </div>
        </div>
    );
};

export default PublicQuotationViewPage;