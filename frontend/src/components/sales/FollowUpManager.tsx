import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, MessageSquare, History, Plus, Edit2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export interface FollowUp {
    id: string;
    date: string;
    notes: string;
    createdAt: string;
}

interface FollowUpManagerProps {
    followUps: FollowUp[];
    onChange: (followUps: FollowUp[]) => void;
    readOnly?: boolean;
}

const FollowUpManager = ({ followUps, onChange, readOnly }: FollowUpManagerProps) => {
    const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [newNotes, setNewNotes] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const safeFormat = (dateStr: string | undefined | null, formatStr: string, fallback: string = 'N/A') => {
        if (!dateStr) return fallback;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return fallback;
        try {
            return format(d, formatStr);
        } catch (e) {
            return fallback;
        }
    };

    const handleSave = () => {
        if (!newDate || !newNotes) return;

        if (editingId) {
            const updated = followUps.map(f =>
                f.id === editingId ? { ...f, date: newDate, notes: newNotes } : f
            );
            onChange(updated);
        } else {
            const newEntry: FollowUp = {
                id: Math.random().toString(36).substr(2, 9),
                date: newDate,
                notes: newNotes,
                createdAt: new Date().toISOString()
            };
            onChange([...followUps, newEntry]);
        }

        resetForm();
    };

    const resetForm = () => {
        setNewNotes('');
        setNewDate(format(new Date(), 'yyyy-MM-dd'));
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (item: FollowUp) => {
        setNewDate(item.date);
        setNewNotes(item.notes);
        setEditingId(item.id);
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this follow-up?')) {
            onChange(followUps.filter(f => f.id !== id));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-800" />
                    <h3 className="text-sm font-semibold text-slate-900">Follow-up History</h3>
                </div>
                {!showForm && !readOnly && (
                    <Button type="button" variant="outline" size="sm" onClick={() => { resetForm(); setShowForm(true); }} className="h-8">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Follow-up
                    </Button>
                )}
            </div>

            {showForm && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                            {editingId ? 'Edit Follow-up' : 'New Follow-up'}
                        </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-700">Follow-up Date</Label>
                            <Input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="h-9"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">Meeting / Follow-up Notes</Label>
                        <Textarea
                            value={newNotes}
                            onChange={(e) => setNewNotes(e.target.value)}
                            placeholder="What was discussed?"
                            className="min-h-[80px]"
                        />
                    </div>
                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                        <Button type="button" size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                            {editingId ? 'Update Follow-up' : 'Save Follow-up'}
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {followUps.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500 font-medium italic">No follow-ups recorded yet</p>
                    </div>
                ) : (
                    [...followUps].sort((a, b) => {
                        const dateA = new Date(a.date).getTime();
                        const dateB = new Date(b.date).getTime();
                        return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
                    }).map((item, idx) => (
                        <div key={item.id} className="relative pl-8 border-l-2 border-slate-100 pb-6 last:pb-2">
                            {/* Modern Timeline Node */}
                            <div className="absolute left-[-9.5px] top-0.5 w-4.5 h-4.5 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            </div>

                            <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden group">
                                <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                                            <Calendar className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="text-base font-bold text-slate-900 tracking-tight">
                                            {safeFormat(item.date, 'dd MMM yyyy')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col items-end border-r border-slate-200 pr-3">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Created</span>
                                            <span className="text-xs font-bold text-slate-600">
                                                {safeFormat(item.createdAt, 'dd MMM, HH:mm')}
                                            </span>
                                        </div>
                                        {!readOnly && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                                                    onClick={() => handleEdit(item)}
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <p className="text-[15px] text-slate-700 font-medium leading-[1.6] whitespace-pre-wrap">
                                        {item.notes}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FollowUpManager;
