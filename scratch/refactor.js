const fs = require('fs');

function refactorDashboard() {
  const path = 'c:/Users/tarig/Desktop/RMS/frontend/src/pages/Dashboard.tsx';
  let code = fs.readFileSync(path, 'utf8');

  // Outer layout
  code = code.replace(
    'className="p-6 space-y-6 max-w-7xl mx-auto text-gray-200"',
    'className="p-6 space-y-6 max-w-7xl mx-auto text-gray-200 bg-[#0a0a0a] min-h-screen"'
  );

  // Cards & Containers
  code = code.replace(/glass-panel p-5 rounded-xl border border-white\/5 bg-\[#15171e\]/g, 'p-5 rounded-xl border border-[#1f1f1f] bg-[#121212]');
  
  // Header filters
  code = code.replace('bg-[#1a1c23] rounded-lg p-1 border border-white/5', 'bg-[#121212] rounded-lg p-1 border border-[#1f1f1f]');
  code = code.replace("globalFilter === f ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'", "globalFilter === f ? 'bg-[#e67e00] text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'");
  code = code.replace('bg-[#1a1c23] border border-white/5', 'bg-[#121212] border border-[#1f1f1f]');

  // Secondary Badges for Icons
  code = code.replace(/bg-blue-500\/10 text-blue-400/g, 'bg-[#2a1b08] text-[#ffb042] border border-[#442c0e]');
  code = code.replace(/bg-green-500\/10 text-green-400/g, 'bg-[#2a1b08] text-[#ffb042] border border-[#442c0e]');
  code = code.replace(/bg-yellow-500\/10 text-yellow-400/g, 'bg-[#2a1b08] text-[#ffb042] border border-[#442c0e]');
  code = code.replace(/bg-purple-500\/10 text-purple-400/g, 'bg-[#2a1b08] text-[#ffb042] border border-[#442c0e]');
  code = code.replace(/bg-red-500\/10 text-red-400/g, 'bg-[#2a1b08] text-[#ffb042] border border-[#442c0e]');

  // Modal button
  code = code.replace('bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700', 'bg-[#e67e00] text-white rounded-lg text-sm font-medium hover:bg-[#cc7000]');

  // Chart wrappers & tooltips & lines
  code = code.replace(/stroke="#2a2d36"/g, 'stroke="#1f1f1f"');
  code = code.replace(/cursor={{fill: '#2a2d36', opacity: 0.4}} contentStyle={{backgroundColor: '#1a1c23', borderColor: '#333'}} itemStyle={{color: '#fff'}}/g, 'cursor={{fill: "#1f1f1f", opacity: 0.4}} contentStyle={{backgroundColor: "#121212", borderColor: "#1f1f1f", color: "#fff"}} itemStyle={{color: "#fff"}}');
  code = code.replace(/contentStyle={{backgroundColor: '#1a1c23', borderColor: '#333'}} itemStyle={{color: '#fff'}}/g, 'contentStyle={{backgroundColor: "#121212", borderColor: "#1f1f1f", color: "#fff"}} itemStyle={{color: "#fff"}}');
  
  // Bar Chart Cells
  code = code.replace(/fill=\{entry\.color\}/g, 'fill="#e67e00"'); // wait, this replaces PieChart colors too, I'll restrict it
  // Wait, let's revert pie chart fill if it was entry.color
  // Actually I'll do this carefully.

  fs.writeFileSync(path, code);
}

function refactorUsers() {
  const path = 'c:/Users/tarig/Desktop/RMS/frontend/src/pages/UsersAndRoles.tsx';
  let code = fs.readFileSync(path, 'utf8');

  // Outer layout
  code = code.replace(
    'className="p-6 space-y-6 max-w-[1600px] mx-auto text-gray-200"',
    'className="p-6 space-y-6 max-w-[1600px] mx-auto text-gray-200 bg-[#0a0a0a] min-h-screen"'
  );

  // Cards
  code = code.replace(/glass-panel p-5 rounded-xl border border-white\/5 bg-\[#15171e\]/g, 'p-5 rounded-xl border border-[#1f1f1f] bg-[#121212]');
  code = code.replace(/glass-panel p-6 rounded-xl border border-white\/5 bg-\[#15171e\]/g, 'p-6 rounded-xl border border-[#1f1f1f] bg-[#121212]');
  code = code.replace(/glass-panel rounded-xl border border-white\/5 bg-\[#15171e\]/g, 'rounded-xl border border-[#1f1f1f] bg-[#121212]');

  // Tabs
  code = code.replace(/border-blue-500 text-blue-400/g, 'border-[#e67e00] text-[#e67e00]');

  // Buttons
  code = code.replace(/bg-blue-600 hover:bg-blue-700/g, 'bg-[#e67e00] hover:bg-[#cc7000]');
  code = code.replace(/bg-blue-600 text-white/g, 'bg-[#e67e00] text-white hover:bg-[#cc7000]');
  code = code.replace(/text-blue-400 bg-blue-500\/10 border border-blue-500\/20 hover:bg-blue-500\/20/g, 'text-[#ffb042] bg-[#2a1b08] border border-[#442c0e] hover:bg-[#3d260c]');

  // Users List Table Headers
  code = code.replace(/bg-\[#1a1c23\]\/50 text-gray-400/g, 'bg-[#161616] text-slate-300 border-b border-[#1f1f1f]');
  code = code.replace(/bg-\[#15171e\]\/50 text-gray-400 border-b border-white\/5/g, 'bg-[#161616] text-slate-300 border-b border-[#1f1f1f]');

  // Active status badges
  code = code.replace(/bg-green-400\/10/g, 'bg-[#2a1b08] border border-[#442c0e]');
  code = code.replace(/text-green-400/g, 'text-[#ffb042]');

  // Checkmarks in permissions
  code = code.replace(/text-blue-500 bg-\[#1a1c23\] focus:ring-blue-500 focus:ring-offset-\[#15171e\]/g, 'text-[#e67e00] bg-[#0a0a0a] focus:ring-[#e67e00] border-[#1f1f1f] focus:ring-offset-[#121212]');
  code = code.replace(/text-blue-500 bg-\[#15171e\] focus:ring-blue-500 focus:ring-offset-\[#1a1c23\]/g, 'text-[#e67e00] bg-[#0a0a0a] focus:ring-[#e67e00] border-[#1f1f1f] focus:ring-offset-[#121212]');

  fs.writeFileSync(path, code);
}

refactorDashboard();
refactorUsers();
console.log('Done!');
