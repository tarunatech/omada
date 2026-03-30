import { useNavigate } from 'react-router-dom';
import { useAuth, SalesDept } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, PencilRuler, HardHat, Users } from 'lucide-react';

const departments: { id: SalesDept; name: string; description: string; icon: any; color: string }[] = [
    {
        id: 'builders',
        name: 'Builders Sales Team',
        description: 'Manage entries for builders and construction sites',
        icon: Building2,
        color: 'bg-blue-500'
    },
    {
        id: 'architects',
        name: 'Architects / Interior / Structural Engineers',
        description: 'Collaborate with design and structural professionals',
        icon: PencilRuler,
        color: 'bg-emerald-500'
    },
    {
        id: 'contractors',
        name: 'Contractors Sales Team',
        description: 'Work with renovation and turnkey project contractors',
        icon: HardHat,
        color: 'bg-amber-500'
    },
    {
        id: 'end-to-end',
        name: 'End to End Customer',
        description: 'Direct sales and relationship management with end users',
        icon: Users,
        color: 'bg-rose-500'
    }
];

const DepartmentSelectionPage = () => {
    const { setDepartment } = useAuth();
    const navigate = useNavigate();

    const handleSelect = (dept: SalesDept) => {
        setDepartment(dept);
        navigate('/sales');
    };

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 animate-in fade-in duration-700">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-semibold text-slate-900 tracking-tight mb-3">Select Department</h1>
                <p className="text-slate-600 font-semibold">Choose a department to continue to your dashboard</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
                {departments.map((dept) => (
                    <Card
                        key={dept.id}
                        className="group cursor-pointer hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-2 hover:border-primary/50 overflow-hidden"
                        onClick={() => handleSelect(dept.id)}
                    >
                        <div className={`h-2 ${dept.color}`} />
                        <CardHeader className="pt-8 text-center">
                            <div className={`w-16 h-16 mx-auto rounded-2xl ${dept.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                <dept.icon className="w-8 h-8" />
                            </div>
                            <CardTitle className="text-xl group-hover:text-primary transition-colors">{dept.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center pb-8">
                            <CardDescription className="text-slate-700 text-sm font-medium leading-relaxed">
                                {dept.description}
                            </CardDescription>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default DepartmentSelectionPage;
