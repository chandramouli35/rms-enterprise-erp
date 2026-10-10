import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ArrowRight, TrendingUp, ShieldCheck, Zap, Server, FileText, Settings, Users, Droplets } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] flex flex-col font-sans">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-4 bg-[var(--bg-panel)] shadow-sm sticky top-0 z-50 border-b border-[var(--border-subtle)]">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="RMS Logo" className="w-10 h-10 rounded-full border border-amber-500/30" />
          <span className="text-xl font-bold tracking-widest text-amber-500">
            RICE MILL <span className="text-[var(--text-main)] font-light text-sm block tracking-widest leading-none mt-1">MANAGEMENT SYSTEM</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="w-auto py-2 px-6 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Users className="w-4 h-4" />
          <span>Login</span>
        </button>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section id="home" className="relative overflow-hidden py-20 lg:py-32" style={{ backgroundImage: `url('/login-bg.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30"></div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <p className="text-amber-500 font-semibold tracking-wider text-sm uppercase">Digital Solution for Modern Rice Mills</p>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight font-serif text-[var(--text-main)]">
                Manage Smarter.<br />Produce Better.
              </h1>
              <p className="text-lg text-[var(--text-muted)] max-w-lg leading-relaxed">
                Streamline Procurement, Production, Inventory, Dispatch and Finance — All in One Platform.
              </p>
              
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-[var(--text-main)]">Higher Efficiency</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-[var(--text-main)]">Real-time Visibility</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-medium text-[var(--text-main)]">Better Control</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-6">
                <button 
                  onClick={() => navigate('/login')}
                  className="py-3 px-8 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold rounded-lg shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button className="bg-[var(--glass-bg)] hover:bg-[var(--bg-panel-hover)] text-[var(--text-main)] border border-[var(--border-subtle)] px-6 py-3 rounded-lg font-semibold transition flex items-center space-x-2 backdrop-blur-sm">
                  <span>Watch Video</span>
                </button>
              </div>
            </div>

            {/* Dashboard Mockup - Detailed Laptop Design */}
            <div className="hidden lg:block relative w-full mt-8 lg:mt-0 max-w-2xl mx-auto">
              {/* Laptop Screen Frame */}
              <div className="bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] rounded-t-2xl p-2 pb-4 border-t-2 border-x-2 border-gray-700 shadow-2xl relative z-10 w-full flex flex-col">
                <div className="bg-[var(--bg-base)] rounded-sm overflow-hidden h-[380px] relative flex border border-[var(--border-subtle)]">
                  {/* Sidebar Mock */}
                  <div className="w-48 bg-[var(--bg-panel)] border-r border-[var(--border-subtle)] p-4 flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-2 text-amber-500 mb-4 pl-1">
                      <Leaf className="w-5 h-5" />
                      <span className="font-bold text-sm text-[var(--text-main)]">RiceMill ERP</span>
                    </div>
                    {['Dashboard', 'Procurement', 'Weighbridge', 'Production', 'Inventory', 'Dispatch', 'Finance', 'Reports', 'Settings'].map((item, i) => (
                      <div key={i} className={`h-8 rounded-md flex items-center px-3 text-xs font-medium cursor-default ${i === 0 ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20' : 'text-[var(--text-muted-alt)] hover:bg-[var(--bg-base)]'}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                  
                  {/* Main Content Mock */}
                  <div className="flex-1 p-5 flex flex-col gap-4 overflow-hidden">
                    <div className="flex justify-between items-end">
                      <div>
                        <h3 className="text-base font-bold text-[var(--text-main)] leading-none">Good Morning,</h3>
                        <p className="text-xs text-[var(--text-muted)] mt-1">Plant 1</p>
                      </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { title: 'Paddy Inward', val: '128.45', unit: 'MT', bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-500' },
                        { title: 'Production', val: '92.30', unit: 'MT', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-500' },
                        { title: 'Dispatch', val: '85.20', unit: 'MT', bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500' },
                        { title: 'Inventory', val: '1,245', unit: 'MT', bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-500' },
                      ].map((stat, i) => (
                        <div key={i} className={`bg-[var(--bg-panel)] border ${stat.border} p-3 rounded-lg shadow-sm flex flex-col`}>
                          <div className="text-[10px] text-[var(--text-muted-alt)] mb-1">{stat.title}</div>
                          <div className="flex items-baseline gap-1 mt-auto">
                            <span className={`text-sm font-bold ${stat.text}`}>{stat.val}</span>
                            <span className={`text-[9px] ${stat.text} opacity-70`}>{stat.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Charts Area */}
                    <div className="grid grid-cols-5 gap-4 flex-1 mt-2">
                      <div className="col-span-3 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)] p-4 flex flex-col">
                        <div className="text-[11px] font-semibold text-[var(--text-main)] mb-4">Paddy Inward vs Production</div>
                        {/* Line Chart Mock */}
                        <div className="flex-1 flex items-end justify-between relative border-b border-l border-[var(--border-subtle)]">
                          <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                             <polyline points="0,80 20,50 40,70 60,30 80,40 100,20" fill="none" stroke="#eab308" strokeWidth="2"/>
                             <polyline points="0,90 20,80 40,85 60,50 80,60 100,40" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="4"/>
                          </svg>
                          <div className="absolute -bottom-4 left-0 w-full flex justify-between text-[8px] text-[var(--text-muted-alt)]">
                            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-6 text-[9px] text-[var(--text-muted)]">
                          <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-yellow-500"></div> Paddy Inward</div>
                          <div className="flex items-center gap-1"><div className="w-3 h-0.5 bg-blue-500 border-t border-dashed border-blue-500"></div> Production</div>
                        </div>
                      </div>
                      
                      <div className="col-span-2 bg-[var(--bg-panel)] rounded-lg border border-[var(--border-subtle)] p-4 flex flex-col items-center justify-center relative">
                        <div className="absolute top-4 left-4 text-[11px] font-semibold text-[var(--text-main)]">Plant-wise Inward</div>
                        {/* Donut Chart Mock */}
                        <div className="mt-4 flex flex-col items-center justify-center w-full">
                          <div className="w-24 h-24 rounded-full border-[4px] border-[var(--bg-base)] flex items-center justify-center relative shrink-0">
                             {/* Segments using conic-gradient (Tailwind standard support) */}
                             <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(#22c55e 0% 40%, #eab308 40% 70%, #3b82f6 70% 90%, #a855f7 90% 100%)', padding: '5px' }}>
                                <div className="w-full h-full bg-[var(--bg-panel)] rounded-full flex flex-col items-center justify-center">
                                  <span className="text-xs font-bold text-[var(--text-main)] leading-none">128.45</span>
                                  <span className="text-[10px] text-[var(--text-muted)] mt-1">MT</span>
                                </div>
                             </div>
                          </div>
                          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-4 text-[9px] text-[var(--text-muted)]">
                             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>Plant 1 <span className="text-[var(--text-muted-alt)] ml-0.5">40%</span></div>
                             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>Plant 2 <span className="text-[var(--text-muted-alt)] ml-0.5">30%</span></div>
                             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>Plant 3 <span className="text-[var(--text-muted-alt)] ml-0.5">20%</span></div>
                             <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>Plant 4 <span className="text-[var(--text-muted-alt)] ml-0.5">10%</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Screen Chin */}
                <div className="w-full text-center mt-1.5 text-[8px] tracking-[0.3em] text-gray-400 font-bold uppercase">RiceMill</div>
              </div>
              
              {/* Laptop Base/Keyboard */}
              <div className="relative z-20 -mt-0.5 w-full">
                {/* Hinge */}
                <div className="w-[110%] -ml-[5%] h-3 bg-gradient-to-b from-[#2a2a2a] to-[#111] rounded-t-sm mx-auto shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border-b border-black"></div>
                {/* Base Lip */}
                <div className="w-[115%] -ml-[7.5%] h-5 bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a] rounded-b-2xl rounded-t-sm shadow-2xl flex items-start justify-center border-t border-[#333]">
                  {/* Trackpad Indentation */}
                  <div className="w-24 h-1.5 bg-black/50 rounded-b-md shadow-inner mt-px border-b border-white/5"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modules Section */}
        <section id="modules" className="py-20 bg-[var(--bg-panel)]">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-[var(--text-main)] mb-2 font-serif">Comprehensive ERP for<br/><span className="text-amber-500">Every Stage of Your Rice Mill</span></h2>
              <p className="text-[var(--text-muted)] max-w-xl mx-auto">From paddy procurement to final dispatch, manage your entire operation with real-time data, automation and complete control.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[
                { title: 'Paddy Procurement', icon: Leaf },
                { title: 'Weighbridge Integration', icon: Server },
                { title: 'Production & Yield', icon: Settings },
                { title: 'Inventory Management', icon: Droplets },
                { title: 'Dispatch & Logistics', icon: TrendingUp },
                { title: 'Finance & Reports', icon: FileText },
              ].map((mod, i) => (
                <div key={i} className="bg-[var(--bg-base)] p-6 rounded-xl flex flex-col items-center text-center hover:-translate-y-1 transition duration-300 shadow-sm border border-[var(--border-subtle)]">
                  <div className="p-4 bg-amber-500/10 rounded-full shadow-sm mb-4 text-amber-500 border border-amber-500/20">
                    <mod.icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-semibold text-[var(--text-main)] text-sm">{mod.title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow Section */}
        <section className="py-20 bg-[var(--bg-base)] border-t border-[var(--border-subtle)]">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold text-[var(--text-main)] mb-4 font-serif">From Farm to Final Dispatch<br/><span className="text-amber-500">A Connected Workflow</span></h2>
            <div className="mt-16 flex flex-col md:flex-row items-center justify-center space-y-8 md:space-y-0 md:space-x-4 lg:space-x-8">
              {['Farmer Registration', 'Procurement', 'Weighbridge', 'Processing', 'Inventory', 'Dispatch'].map((step, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-full bg-[var(--bg-panel)] border-2 border-amber-500 text-amber-500 flex items-center justify-center font-bold text-xl shadow-lg shadow-amber-500/20 z-10">
                      {i + 1}
                    </div>
                    <span className="mt-3 text-sm font-medium text-[var(--text-main)] w-24">{step}</span>
                  </div>
                  {i < 5 && <div className="hidden md:block w-12 border-t-2 border-dashed border-amber-500/50"></div>}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-black text-[var(--text-main)] text-center relative border-t border-[var(--border-subtle)]">
          <div className="absolute inset-0 bg-amber-500/5"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-4 font-serif">Ready to Transform Your Rice Mill Operations?</h2>
            <p className="text-[var(--text-muted)] mb-8 max-w-2xl mx-auto">Get a personalized demo and see how Rice Mill ERP can help your business grow.</p>
            <div className="flex items-center justify-center space-x-4">
              <button className="py-3 px-8 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold rounded-lg shadow-lg shadow-amber-500/20 transition-all">
                Request a Demo
              </button>
              <button className="bg-[var(--glass-bg)] hover:bg-[var(--bg-panel-hover)] border border-[var(--border-subtle)] text-[var(--text-main)] px-8 py-3 rounded-lg font-semibold transition">
                Contact Us
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--bg-panel)] border-t border-[var(--border-subtle)] py-8 text-center text-sm text-[var(--text-muted-alt)]">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <img src="/logo.png" alt="Logo" className="w-6 h-6 rounded-full border border-amber-500/30 grayscale contrast-150" />
          <span className="font-bold text-[var(--text-muted)] tracking-wider">RICE MILL MANAGEMENT SYSTEM</span>
        </div>
        <p>© {new Date().getFullYear()} Rice Mill ERP. All rights reserved.</p>
      </footer>
    </div>
  );
}
