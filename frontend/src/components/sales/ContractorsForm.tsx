import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import LocationPicker from './LocationPicker';
import FollowUpManager from './FollowUpManager';

interface ContractorsFormProps {
    data: any;
    onChange: (data: any) => void;
    readOnly?: boolean;
}

const ContractorsForm = ({ data, onChange, readOnly }: ContractorsFormProps) => {
    const handleChange = (field: string, value: any) => {
        if (readOnly) return;
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">

            <div className="space-y-1.5 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Contractor / Owner Name</Label>
                    <Input value={data.contractorOwnerName || ''} onChange={e => handleChange('contractorOwnerName', e.target.value)} placeholder="Entry name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Area</Label>
                    <Input value={data.location || ''} onChange={e => handleChange('location', e.target.value)} placeholder="e.g. Vadodara, Mumbai" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Contractor / Owner Contact</Label>
                    <Input value={data.contractorOwnerContact || ''} onChange={e => handleChange('contractorOwnerContact', e.target.value)} placeholder="Phone" disabled={readOnly} />
                </div>
            </div>

            <div className="space-y-1.5 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Customer Name</Label>
                    <Input value={data.customerName || ''} onChange={e => handleChange('customerName', e.target.value)} placeholder="Entry name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Customer Contact</Label>
                    <Input value={data.customerContact || ''} onChange={e => handleChange('customerContact', e.target.value)} placeholder="Phone" disabled={readOnly} />
                </div>
            </div>

            <div className="space-y-1.5 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-2">
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Architect Company</Label>
                    <Input value={data.architectCompany || ''} onChange={e => handleChange('architectCompany', e.target.value)} placeholder="Company name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Architect Name</Label>
                    <Input value={data.architectName || ''} onChange={e => handleChange('architectName', e.target.value)} placeholder="Entry name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Architect Contact</Label>
                    <Input value={data.architectContact || ''} onChange={e => handleChange('architectContact', e.target.value)} placeholder="Phone" disabled={readOnly} />
                </div>
            </div>

            <div className="space-y-1.5 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Interior Company</Label>
                    <Input value={data.interiorCompany || ''} onChange={e => handleChange('interiorCompany', e.target.value)} placeholder="Company name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Interior Designer Name</Label>
                    <Input value={data.interiorDesignerName || ''} onChange={e => handleChange('interiorDesignerName', e.target.value)} placeholder="Entry name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Interior Designer Contact</Label>
                    <Input value={data.interiorDesignerContact || ''} onChange={e => handleChange('interiorDesignerContact', e.target.value)} placeholder="Phone" disabled={readOnly} />
                </div>
            </div>

            <div className="space-y-1.5 md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Structure Engineering Company</Label>
                    <Input value={data.structuralEngineerCompany || ''} onChange={e => handleChange('structuralEngineerCompany', e.target.value)} placeholder="Company name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Structural Engineer Name</Label>
                    <Input value={data.structuralEngineerName || ''} onChange={e => handleChange('structuralEngineerName', e.target.value)} placeholder="Entry name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Structural Engineer Contact</Label>
                    <Input value={data.structuralEngineerContact || ''} onChange={e => handleChange('structuralEngineerContact', e.target.value)} placeholder="Phone" disabled={readOnly} />
                </div>
            </div>

            <div className="md:col-span-3 space-y-1.5 border-t pt-2">
                <Label className="text-slate-700 font-semibold">Address (with Google Maps integration)</Label>
                <LocationPicker
                    value={data.address || ''}
                    lat={data.lat}
                    lng={data.lng}
                    onChange={(address, lat, lng) => onChange({ ...data, address, lat, lng })}
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

export default ContractorsForm;
