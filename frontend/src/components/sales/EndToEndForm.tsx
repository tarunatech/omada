import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FollowUpManager from './FollowUpManager';

interface EndToEndFormProps {
    data: any;
    onChange: (data: any) => void;
    readOnly?: boolean;
}

const EndToEndForm = ({ data, onChange, readOnly }: EndToEndFormProps) => {
    const handleChange = (field: string, value: any) => {
        if (readOnly) return;
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-1.5 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Customer Name</Label>
                    <Input value={data.customerName || ''} onChange={e => handleChange('customerName', e.target.value)} placeholder="Full name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Area</Label>
                    <Input value={data.location || ''} onChange={e => handleChange('location', e.target.value)} placeholder="e.g. Vadodara, Mumbai" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Contact No</Label>
                    <Input value={data.contactNumber || ''} onChange={e => handleChange('contactNumber', e.target.value)} placeholder="Phone" disabled={readOnly} />
                </div>
            </div>

            <div className="space-y-1.5 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Alternate Name</Label>
                    <Input value={data.anotherName || ''} onChange={e => handleChange('anotherName', e.target.value)} placeholder="Reference name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Contact No (Alternate)</Label>
                    <Input value={data.anotherContact || ''} onChange={e => handleChange('anotherContact', e.target.value)} placeholder="Phone" disabled={readOnly} />
                </div>
            </div>

            <div className="space-y-1.5 md:col-span-3">
                <Label className="text-slate-700 font-semibold">Salesman Name</Label>
                <Input value={data.salesmanName || ''} onChange={e => handleChange('salesmanName', e.target.value)} placeholder="Salesperson name" disabled={readOnly} />
            </div>

            <div className="md:col-span-3 space-y-1.5 border-t pt-2">
                <Label className="text-slate-700 font-semibold">Address</Label>
                <Input
                    value={data.address || ''}
                    onChange={e => handleChange('address', e.target.value)}
                    placeholder="Enter complete address"
                    disabled={readOnly}
                />
            </div>
            <div className="md:col-span-3 space-y-1.5">
                <Label className="text-slate-700 font-semibold">Description / Notes</Label>
                <Textarea value={data.notes || ''} onChange={e => handleChange('notes', e.target.value)} placeholder="Additional details" rows={3} disabled={readOnly} />
            </div>
            <div className="md:col-span-3 pt-4">
                <FollowUpManager
                    followUps={data.followUps || []}
                    onChange={(f) => handleChange('followUps', f)}
                    readOnly={readOnly}
                />
            </div>
        </div>
    );
};

export default EndToEndForm;
