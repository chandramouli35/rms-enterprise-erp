import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Download, Filter, Plus, FileText, ArrowRightLeft, 
  Building2, Receipt, Search, Eye, TrendingUp, TrendingDown,
  Wallet, BookOpen, Truck
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { financeApi } from '../api/finance';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { usePlantStore } from '../store/plantStore';

export function FinanceManagement() {
  const { activePlant } = usePlantStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTab, setCurrentTab] = useState('purchase');

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab');
    if (tab) {
      setCurrentTab(tab);
    } else {
      navigate('/finance?tab=purchase', { replace: true });
    }
  }, [location.search, navigate]);

  // Live API Queries
  const { data: purchaseLedgerData = [], isLoading: isLoadingPurchase } = useQuery({
    queryKey: ['finance', 'ledger', activePlant?.id, 'PURCHASE'],
    queryFn: () => financeApi.getLedger(activePlant?.id || 'all', 'PURCHASE'),
    enabled: currentTab === 'purchase'
  });

  const { data: salesLedgerData = [], isLoading: isLoadingSales } = useQuery({
    queryKey: ['finance', 'ledger', activePlant?.id, 'SALE'],
    queryFn: () => financeApi.getLedger(activePlant?.id || 'all', 'SALE'),
    enabled: currentTab === 'sales'
  });

  const { data: expenseData = [], isLoading: isLoadingExpense } = useQuery({
    queryKey: ['finance', 'expenses', activePlant?.id],
    queryFn: () => financeApi.getExpenseSummary(activePlant?.id || 'all'),
    enabled: currentTab === 'expense'
  });

  const { data: cashbookData, isLoading: isLoadingCashbook } = useQuery({
    queryKey: ['finance', 'cashbook', activePlant?.id],
    queryFn: () => financeApi.getCashbook(activePlant?.id || 'all'),
    enabled: currentTab === 'cashbook'
  });

  const { data: outstandingParties = [], isLoading: isLoadingOutstanding } = useQuery({
    queryKey: ['finance', 'outstanding', activePlant?.id],
    queryFn: () => financeApi.getOutstanding(activePlant?.id || 'all'),
    enabled: currentTab === 'outstanding' || currentTab === 'purchase' || currentTab === 'sales'
  });

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => `"${value}"`).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const quickActions = [
    { name: 'Add Payment', icon: <Plus size={16} />, color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    { name: 'Add Receipt', icon: <Receipt size={16} />, color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    { name: 'Add Expense', icon: <FileText size={16} />, color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
    { name: 'Journal Entry', icon: <BookOpen size={16} />, color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    { name: 'Contra Entry', icon: <ArrowRightLeft size={16} />, color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { name: 'Bank Transfer', icon: <Building2 size={16} />, color: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' }
  ];





  const renderQuickActions = () => (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-5">
      <h3 className="text-base font-bold text-[var(--text-main)] mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {quickActions.map((action, idx) => (
          <button key={idx} className={`flex items-center gap-2 p-2.5 rounded-lg border ${action.color} hover:opacity-90 transition-opacity bg-opacity-30`}>
            <div className="bg-[var(--bg-base)] p-1 rounded-md shadow-sm">
              {action.icon}
            </div>
            <span className="text-xs font-bold whitespace-nowrap">{action.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderTopOutstanding = () => (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 flex flex-col h-full">
      <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Top Outstanding Parties</h3>
      
      <div className="flex justify-between text-sm font-semibold text-[var(--text-main)] mb-4 border-b border-[var(--border-subtle)] pb-3">
        <span>Party Name</span>
        <span>Outstanding (&#8377;)</span>
      </div>

      <div className="space-y-0 flex-1">
        {isLoadingOutstanding ? (
          <div className="py-8 text-center text-[var(--text-muted)] text-sm">Loading outstanding parties...</div>
        ) : outstandingParties.length === 0 ? (
          <div className="py-8 text-center text-[var(--text-muted)] text-sm">No outstanding balances found.</div>
        ) : (
          outstandingParties.map((party: any, idx: number) => (
            <div key={idx} className="flex justify-between items-center py-4 border-b border-[var(--border-subtle-alt)] last:border-0">
              <span className="text-sm font-semibold text-[var(--text-main)]">{party.name}</span>
              <span className="text-sm font-bold text-red-500">{party.amount?.toLocaleString('en-IN')}</span>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 pt-2">
        <button className="text-blue-600 text-sm font-bold flex items-center justify-between border border-[var(--border-subtle)] rounded-lg px-4 py-2 hover:bg-[var(--bg-base)] transition-colors w-max min-w-[200px]">
          View All Outstanding <span className="text-lg leading-none font-medium ml-4">&gt;</span>
        </button>
      </div>
    </div>
  );

  const renderPurchaseLedger = () => (
    <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-5 flex-1">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-[var(--text-main)]">Purchase Ledger</h2>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search by party name, invoice no..." 
              className="pl-9 pr-4 py-1.5 text-sm bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg w-64 text-[var(--text-main)] focus:outline-none focus:border-blue-500"
            />
          </div>
          <button 
            onClick={() => handleExportCSV(purchaseLedgerData, 'Purchase_Ledger')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-base)] text-[var(--text-main)]"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-[var(--bg-base)] text-[var(--text-muted-alt)] font-semibold border-y border-[var(--border-subtle-alt)]">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Invoice No.</th>
              <th className="py-3 px-4">Party Name</th>
              <th className="py-3 px-4">Particulars</th>
              <th className="py-3 px-4 text-right">Total Amount (?)</th>
              <th className="py-3 px-4 text-right">Paid Amount (?)</th>
              <th className="py-3 px-4 text-right">Balance (?)</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle-alt)]">
            {isLoadingPurchase ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[var(--text-muted)]">Loading ledger data...</td>
              </tr>
            ) : purchaseLedgerData.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-[var(--text-muted)]">No transactions found.</td>
              </tr>
            ) : purchaseLedgerData.map((row: any, idx: number) => {
              const statusDisplay = row.paymentStatus === 'PAID' ? 'Paid' : row.paymentStatus === 'PARTIAL' ? 'Partial' : 'Unpaid';
              return (
              <tr key={idx} className="hover:bg-[var(--bg-base)]/50">
                <td className="py-3 px-4 font-medium text-[var(--text-main)]">{new Date(row.date).toLocaleDateString('en-GB')}</td>
                <td className="py-3 px-4 text-[var(--text-muted)]">{row.invoiceNo}</td>
                <td className="py-3 px-4 text-[var(--text-main)] font-medium">{row.partyName}</td>
                <td className="py-3 px-4 text-[var(--text-muted)]">{row.particulars}</td>
                <td className="py-3 px-4 text-right font-medium text-[var(--text-main)]">{row.totalAmount?.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right text-[var(--text-muted)]">{row.paidAmount?.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-right font-medium text-[var(--text-main)]">{row.balance?.toLocaleString('en-IN')}</td>
                <td className="py-3 px-4 text-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-md 
                    ${statusDisplay === 'Paid' ? 'bg-green-500/20 text-green-500' : 
                      statusDisplay === 'Partial' ? 'bg-yellow-500/20 text-yellow-500' : 
                      'bg-red-500/20 text-red-500'}`}>
                    {statusDisplay}
                  </span>
                </td>
                <td className="py-3 px-4 text-center">
                  <button className="text-blue-500 hover:text-blue-400"><Eye size={16} /></button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-[var(--text-muted)]">Showing 1 to 5 of 25 entries</span>
        <div className="flex gap-1">
          <button className="px-3 py-1 border border-[var(--border-subtle)] rounded text-sm text-[var(--text-muted)] hover:bg-[var(--bg-base)]">&lt;</button>
          <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
          <button className="px-3 py-1 border border-[var(--border-subtle)] rounded text-sm text-[var(--text-muted)] hover:bg-[var(--bg-base)]">2</button>
          <button className="px-3 py-1 border border-[var(--border-subtle)] rounded text-sm text-[var(--text-muted)] hover:bg-[var(--bg-base)]">3</button>
          <button className="px-3 py-1 border-t border-b border-[var(--border-subtle)] text-sm text-[var(--text-muted-alt)]">...</button>
          <button className="px-3 py-1 border border-[var(--border-subtle)] rounded text-sm text-[var(--text-muted)] hover:bg-[var(--bg-base)]">5</button>
          <button className="px-3 py-1 border border-[var(--border-subtle)] rounded text-sm text-[var(--text-muted)] hover:bg-[var(--bg-base)]">&gt;</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans h-full overflow-y-auto">
      
      {/* HEADER SECTION */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Finance Management</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-[var(--border-subtle)] bg-[var(--bg-panel)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] shadow-sm cursor-pointer">
            <span className="mr-2">22 May, 2025 - 22 May, 2025</span>
            <Filter size={14} className="text-[var(--text-muted)]" />
          </div>
          <button className="flex items-center border border-[var(--border-subtle)] bg-[var(--bg-panel)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] shadow-sm hover:bg-[var(--bg-base)]">
            <Filter size={14} className="mr-1 text-[var(--text-muted)]"/> Filter
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        
        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-blue-500/20 p-1.5 rounded-lg text-blue-500 shrink-0">
              <Download size={18} />
            </div>
            <p className="text-xs font-medium text-[var(--text-muted)] leading-tight">Today's Collection</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)] leading-none mb-1">&#8377; 5,20,000</h3>
            <p className="text-[11px] text-green-500 flex items-center font-medium">
              <TrendingUp size={12} className="mr-1 shrink-0" /> 12.5% vs yesterday
            </p>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-green-500/20 p-1.5 rounded-lg text-green-500 shrink-0">
              <Receipt size={18} />
            </div>
            <p className="text-xs font-medium text-[var(--text-muted)] leading-tight">Today's Purchase</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)] leading-none mb-1">&#8377; 8,45,230</h3>
            <p className="text-[11px] text-green-500 flex items-center font-medium">
              <TrendingUp size={12} className="mr-1 shrink-0" /> 8.3% vs yesterday
            </p>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-orange-500/20 p-1.5 rounded-lg text-orange-500 shrink-0">
              <FileText size={18} />
            </div>
            <p className="text-xs font-medium text-[var(--text-muted)] leading-tight">Today's Expense</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)] leading-none mb-1">&#8377; 1,45,600</h3>
            <p className="text-[11px] text-red-500 flex items-center font-medium">
              <TrendingDown size={12} className="mr-1 shrink-0" /> 3.6% vs yesterday
            </p>
          </div>
        </div>

        <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl p-3 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-purple-500/20 p-1.5 rounded-lg text-purple-500 shrink-0">
              <Wallet size={18} />
            </div>
            <p className="text-xs font-medium text-[var(--text-muted)] leading-tight">Cash in Hand</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)] leading-none mb-1">&#8377; 2,85,000</h3>
            <p className="text-[11px] text-[var(--text-muted-alt)] font-medium">Updated just now</p>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-red-500/20 p-1.5 rounded-lg text-red-500 shrink-0">
              <Building2 size={18} />
            </div>
            <p className="text-xs font-medium text-[var(--text-muted)] leading-tight">Outstanding Amount</p>
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-500 leading-none mb-1">&#8377; 3,25,000</h3>
            <p className="text-[11px] text-[var(--text-muted-alt)] font-medium">From 18 Parties</p>
          </div>
        </div>

      </div>

      {/* DYNAMIC CONTENT BASED ON TAB */}
      
      {currentTab === 'purchase' && (
        <div className="flex flex-col h-[calc(100vh-280px)]">
          {renderPurchaseLedger()}
        </div>
      )}

      {currentTab === 'sales' && (
        <div className="flex flex-col h-[calc(100vh-280px)] max-w-2xl mx-auto w-full">
          {renderQuickActions()}
        </div>
      )}

      {currentTab === 'expense' && (
        <div className="flex flex-col h-[calc(100vh-280px)] max-w-3xl mx-auto w-full">
            {/* Expense Summary Pie Chart */}
            <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 flex flex-col h-full">
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-8">Expense Summary</h3>
              {isLoadingExpense ? (
                <div className="flex flex-col items-center justify-center flex-1 h-full text-[var(--text-muted)]">
                  Loading expense data...
                </div>
              ) : expenseData.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 h-full text-[var(--text-muted)]">
                  No expenses recorded yet.
                </div>
              ) : (
              <div className="flex items-center gap-12 flex-1 mb-8">
                <div className="relative w-48 h-48 ml-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseData}
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {expenseData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[11px] text-[var(--text-muted)] font-semibold mb-1">Total Expense</span>
                    <span className="text-lg font-bold text-[var(--text-main)]">&#8377; {expenseData.reduce((acc: number, curr: any) => acc + curr.value, 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  {expenseData.map((item: any, idx: number) => {
                    const totalExpense = expenseData.reduce((acc: number, curr: any) => acc + curr.value, 0);
                    const percentage = totalExpense > 0 ? ((item.value / totalExpense) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-3.5 h-3.5 rounded-sm" style={{backgroundColor: item.color}}></div>
                          <span className="text-[var(--text-main)] font-semibold">{item.name}</span>
                        </div>
                        <span className="text-[var(--text-main)] font-bold">
                          &#8377; {item.value.toLocaleString('en-IN')} <span className="text-[var(--text-muted)] font-medium">({percentage}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}
              <div className="mt-auto border-t border-[var(--border-subtle)] pt-4">
                <button className="text-blue-500 text-sm font-semibold flex items-center w-full justify-between hover:text-blue-600 transition-colors">
                  View Expense Details <span className="text-lg leading-none">&gt;</span>
                </button>
              </div>
            </div>
        </div>
      )}

      {currentTab === 'cashbook' && (
        <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto w-full h-[calc(100vh-280px)]">
          {/* Cash Book Overview */}
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-8">Cash Book Overview</h3>
            {isLoadingCashbook ? (
              <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">Loading...</div>
            ) : (
            <div className="space-y-6 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--text-main)]">Opening Balance</span>
                <span className="text-base font-bold text-[var(--text-main)]">&#8377; {cashbookData?.overview?.openingBalance?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--text-main)]">Total Receipt</span>
                <span className="text-base font-bold text-green-500">&#8377; {cashbookData?.overview?.totalReceipt?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[var(--text-main)]">Total Payment</span>
                <span className="text-base font-bold text-red-500">&#8377; {cashbookData?.overview?.totalPayment?.toLocaleString('en-IN') || 0}</span>
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-[var(--border-subtle)] mt-2">
                <span className="text-sm font-bold text-[var(--text-main)]">Closing Balance</span>
                <span className="text-base font-bold text-blue-500">&#8377; {cashbookData?.overview?.closingBalance?.toLocaleString('en-IN') || 0}</span>
              </div>
            </div>
            )}
            <div className="mt-auto border-t border-[var(--border-subtle)] pt-4">
              <button className="text-blue-500 text-sm font-semibold flex items-center w-full justify-between hover:text-blue-600 transition-colors">
                View Cash Book <span className="text-lg leading-none">&gt;</span>
              </button>
            </div>
          </div>

          {/* Daily Collection vs Expense Bar Chart */}
          <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-sm p-6 flex flex-col h-full">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">Daily Collection vs Expense</h3>
            <div className="flex justify-center gap-6 mb-6">
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
                <div className="w-3 h-3 bg-blue-500 rounded-sm opacity-80"></div> Collection
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-medium">
                <div className="w-3 h-3 bg-red-400 rounded-sm opacity-80"></div> Expense
              </div>
            </div>
            <div className="flex-1 w-full min-h-[200px]">
              {isLoadingCashbook ? (
                <div className="flex items-center justify-center h-full text-[var(--text-muted)]">Loading...</div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashbookData?.barChartData || []} barSize={14} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 11, fill: 'var(--text-muted)'}} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 11, fill: 'var(--text-muted)'}} 
                    tickFormatter={(value: number) => value === 0 ? '₹ 0' : `₹ ${value}L`} 
                  />
                  <Tooltip 
                    cursor={{fill: 'var(--bg-base)'}}
                    contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }}
                  />
                  <Bar dataKey="collection" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              )}
            </div>
            <div className="mt-auto border-t border-[var(--border-subtle)] pt-4 mt-2">
              <button className="text-blue-500 text-sm font-semibold flex items-center w-full justify-between hover:text-blue-600 transition-colors">
                View Detailed Report <span className="text-lg leading-none">&gt;</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {currentTab === 'outstanding' && (
        <div className="flex flex-col h-[calc(100vh-280px)] max-w-lg mx-auto w-full">
          {renderTopOutstanding()}
        </div>
      )}

    </div>
  );
}
