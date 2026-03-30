import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import omadaLogo from '@/assets/omada-logo.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowRight } from 'lucide-react';

const roles: UserRole[] = ['Admin', 'Sales', 'Builders Sales', 'Architects / Interior Sales', 'Contractors / End-to-End', 'PMC'];

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Admin');
  const [remember, setRemember] = useState(false);

  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
       const user = await login(email, password);
       if (user) {
          if (user.role === 'Admin') navigate('/dashboard');
          else navigate('/sales');
       }
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Brand */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: 'hsl(224, 71%, 8%)' }}
      >
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
        <div className="relative z-10 flex flex-col items-center">
          <img src={omadaLogo} alt="OMADA" className="w-44 mb-8 brightness-0 invert opacity-90" />
          <div className="w-16 h-px bg-white/10 mb-8" />
          <p className="text-white/40 text-center text-sm max-w-xs leading-relaxed font-medium tracking-wide">
            Integrated Quotation &amp; Sales Management System
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-[360px]">
          <div className="lg:hidden mb-10 text-center">
            <img src={omadaLogo} alt="OMADA" className="w-36 mx-auto mb-4" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight" style={{ letterSpacing: '-0.03em' }}>Welcome back</h2>
            <p className="text-sm text-slate-500 mt-1.5 font-medium">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white text-sm placeholder:text-slate-400 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-500 uppercase tracking-[0.08em]">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="h-11 rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white text-sm placeholder:text-slate-400 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(c) => setRemember(!!c)} />
              <Label htmlFor="remember" className="text-sm font-medium text-slate-600 cursor-pointer">Remember me</Label>
            </div>

            <Button type="submit" className="w-full h-11 rounded-lg font-semibold text-sm gap-2 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
              style={{ backgroundColor: 'hsl(224, 76%, 38%)' }}
            >
              Sign in
              <ArrowRight className="w-4 h-4" />
            </Button>

            <div className="text-center pt-3">
              <p className="text-xs text-slate-400 font-medium">Demo: admin@omada.com / sales@omada.com</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
