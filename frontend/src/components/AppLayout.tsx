import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import omadaLogo from '@/assets/omada-logo.png';
import { format } from 'date-fns';
import {
  LayoutDashboard,
  FileText,
  PackageOpen,
  BarChart3,
  Database,
  LayoutList,
  LogOut,
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Shield,
  Menu,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useFollowUpNotifications } from '@/hooks/useFollowUpNotifications';
import { AlertCircle, CalendarRange } from 'lucide-react';

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Admin'] },
  { label: 'Quotation System', path: '/quotation', icon: FileText, roles: ['Admin', 'Sales', 'User', 'Builders Sales', 'Architects / Interior Sales', 'Contractors / End-to-End', 'PMC'] },
  { label: 'Sample Management', path: '/samples', icon: LayoutList, roles: ['Admin', 'Sales', 'User', 'Builders Sales', 'Architects / Interior Sales', 'Contractors / End-to-End', 'PMC'] },
  { label: 'Purchase Orders', path: '/order-export', icon: PackageOpen, roles: ['Admin'] },
  { label: 'Sales Records', path: '/sales', icon: BarChart3, roles: ['Admin', 'Sales', 'User', 'Builders Sales', 'Architects / Interior Sales', 'Contractors / End-to-End', 'PMC'] },
  { label: 'Master Data', path: '/master-data', icon: Database, roles: ['Admin'] },
  { label: 'Employees', path: '/users', icon: Users, roles: ['Admin'] },
];

const AppLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(window.innerWidth < 1100);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Collapse sidebar on small screens (iPad portrait / iPad Pro portrait)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1100) {
        setCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const { dueToday } = useFollowUpNotifications();

  const filteredMenu = menuItems.filter(item => user && item.roles.includes(user.role));
  const currentPage = filteredMenu.find(m => location.pathname.startsWith(m.path))?.label || 'Dashboard';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // ── Dark sidebar nav (shared between desktop & mobile) ──
  const NavContent = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {/* Brand */}
      <div className={`flex items-center gap-3 px-5 ${mobile ? 'py-6 border-b border-white/10' : 'py-5'} ${collapsed && !mobile ? 'justify-center px-0' : ''}`}>
        <img src={omadaLogo} alt="OMADA" className="h-7 brightness-0 invert opacity-90" />
      </div>

      {/* Menu label */}
      {(!collapsed || mobile) && (
        <div className="px-6 mt-3 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">Navigation</span>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-2 space-y-0.5 overflow-y-auto custom-scrollbar px-3">
        {filteredMenu.map(item => {
          const active = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (mobile) setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative ${active
                ? 'bg-white/10 text-white font-semibold'
                : 'text-white/55 hover:bg-white/[0.06] hover:text-white/90 font-medium'
                }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-full" />}
              <item.icon className={`w-[18px] h-[18px] shrink-0 ${active ? 'text-white' : 'text-white/45 group-hover:text-white/80'}`} />
              {(!collapsed || mobile) && <span className="tracking-tight">{item.label}</span>}
              {item.label === 'Sales Records' && dueToday.length > 0 && (
                <span className={`ml-auto flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full bg-emerald-500 text-white px-1`}>
                  {dueToday.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Persistent Follow-up Panel */}
      {dueToday.length > 0 && (!collapsed || mobile) && (
        <div className="px-3 py-4 bg-emerald-500/10 border-t border-b border-white/10 space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <CalendarRange className="w-3.5 h-3.5 text-emerald-400" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400">Today's Follow-ups</span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-full shadow-lg shadow-emerald-500/20">{dueToday.length}</span>
          </div>

          <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar px-1">
            {dueToday.map((alert) => (
              <div
                key={alert.id}
                className="group bg-white/10 border border-white/10 rounded-xl p-3 hover:bg-white/15 hover:border-emerald-400/50 transition-all duration-300 cursor-pointer relative overflow-hidden active:scale-[0.98] shadow-sm"
                onClick={() => navigate('/sales')}
              >
                <div className="flex items-center justify-between mb-1.5 relative z-10">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{alert.dept}</span>
                  <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                    <Bell className="w-3 h-3 text-emerald-400" />
                  </div>
                </div>
                <h4 className="text-[14px] font-extrabold text-white leading-tight mb-1 truncate drop-shadow-sm">{alert.clientName}</h4>
                <p className="text-[14px] text-white font-semibold leading-relaxed italic line-clamp-3">
                  <span className="text-emerald-400 font-bold mr-1">"</span>
                  {alert.notes}
                  <span className="text-emerald-400 font-bold ml-1">"</span>
                </p>
                {/* Subtle highlight effect */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 blur-3xl -mr-12 -mt-12 pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-white/8 p-3 space-y-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-all duration-200 ${collapsed && !mobile ? 'justify-center px-0' : ''}`}>
              <div className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center text-xs font-bold shrink-0 border border-white/5">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              {(!collapsed || mobile) && (
                <div className="flex flex-col items-start overflow-hidden text-left">
                  <span className="text-sm font-semibold text-white/90 truncate w-full leading-tight">{user?.name}</span>
                  <span className="text-[10px] text-white/40 font-medium truncate w-full">{user?.role}</span>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={mobile ? "center" : (collapsed ? "start" : "end")}
            side={mobile ? "bottom" : "right"}
            sideOffset={collapsed ? 20 : 10}
            className="w-56 p-1.5 rounded-xl shadow-2xl border border-white/10 bg-[#0d121f] text-white z-[100]"
          >
            <div className="px-3 py-2.5 mb-1">
              <p className="text-[10px] font-semibold uppercase text-white/40 tracking-[0.15em] mb-1">Signed in as</p>
              <p className="text-sm font-semibold text-white/90">{user?.name}</p>
              <p className="text-xs text-white/40 mt-0.5">{user?.role}</p>
            </div>
            <div className="h-px bg-white/10 my-1" />
            {user?.role === 'Sales' && (
              <DropdownMenuItem onClick={() => navigate('/select-department')} className="cursor-pointer rounded-lg py-2 focus:bg-white/10 focus:text-white">
                <LayoutDashboard className="w-4 h-4 mr-2 text-white/30" /> <span className="font-medium">Change Department</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:bg-red-400/10 focus:text-red-400 cursor-pointer rounded-lg py-2">
              <LogOut className="w-4 h-4 mr-2" /> <span className="font-medium">Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {!mobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex w-full items-center justify-center py-1.5 text-white/15 hover:text-white/40 transition-all rounded-lg hover:bg-white/[0.04]"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-[#f0f2f5]">
      {/* Mobile Header (Floating Trigger) */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 bg-white shadow-md border-slate-200 rounded-full">
              <Menu className="w-5 h-5 text-slate-600" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 flex flex-col w-72 bg-[hsl(224,71%,8%)] border-0">
            <NavContent mobile />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`${collapsed ? 'w-[72px]' : 'w-[260px]'} hidden md:flex flex-col shrink-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-30 sticky top-0 h-screen overflow-hidden`}
        style={{ backgroundColor: 'hsl(224, 71%, 8%)' }}
      >
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#f0f2f5]">
        <div className="max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
