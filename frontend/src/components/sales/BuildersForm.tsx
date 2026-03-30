import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import LocationPicker from './LocationPicker';
import FollowUpManager, { FollowUp } from './FollowUpManager';

interface BuildersFormProps {
    data: any;
    onChange: (data: any) => void;
    readOnly?: boolean;
}

const BuildersForm = ({ data, onChange, readOnly }: BuildersFormProps) => {
    const handleChange = (field: string, value: any) => {
        if (readOnly) return;
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">


            <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold">Site Name</Label>
                <Input value={data.siteName || ''} onChange={e => handleChange('siteName', e.target.value)} placeholder="Entry site name" disabled={readOnly} />
            </div>
            <div className="space-y-1.5">
                <Label className="text-slate-700 font-semibold">Area</Label>
                <Input value={data.location || ''} onChange={e => handleChange('location', e.target.value)} placeholder="e.g. Vadodara, Mumbai" disabled={readOnly} />
            </div>
            <div className="space-y-1.5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Authorized Person</Label>
                    <Input value={data.authorizedPersonName || ''} onChange={e => handleChange('authorizedPersonName', e.target.value)} placeholder="Name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Contact No.</Label>
                    <Input value={data.contactNumber || ''} onChange={e => handleChange('contactNumber', e.target.value)} placeholder="Phone" disabled={readOnly} />
                </div>
            </div>

            <div className="space-y-1.5 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-2">
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Site Supervisor Name</Label>
                    <Input value={data.supervisorName || ''} onChange={e => handleChange('supervisorName', e.target.value)} placeholder="Entry name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">Site Supervisor Contact</Label>
                    <Input value={data.supervisorContact || ''} onChange={e => handleChange('supervisorContact', e.target.value)} placeholder="Phone" disabled={readOnly} />
                </div>
            </div>

            <div className="space-y-1.5 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">PMC Company Name</Label>
                    <Input value={data.pmcName || ''} onChange={e => handleChange('pmcName', e.target.value)} placeholder="Entry company name" disabled={readOnly} />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-700 font-semibold">PMC Contact</Label>
                    <Input value={data.pmcContact || ''} onChange={e => handleChange('pmcContact', e.target.value)} placeholder="Phone" disabled={readOnly} />
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

export default BuildersForm;
