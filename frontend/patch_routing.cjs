const fs = require('fs');
const file = 'c:/Users/tarig/Desktop/RMS/frontend/src/components/DashboardShell.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix the SUPER_ADMIN bypass and hide Yield Calculator natively in permissions check
const oldSig = 'const hasSubPermission = (parentModuleLabel: string, subModuleLabel: string) => {';
const newSig = 'const hasSubPermission = (parentModuleLabel: string, subModuleLabel: string) => {\n    if (subModuleLabel === \'Yield Calculator\') return false;\n    if (user?.role === \'SUPER_ADMIN\') return true;';

if (!content.includes('if (subModuleLabel === \'Yield Calculator\') return false;')) {
  content = content.replace(oldSig, newSig);
}

// 2. Remove 'Yield Mgmt': 'Production' mapping
content = content.replace(/'Yield Mgmt': 'Production',?\r?\n\s*/g, '');

// 3. Fix navigation tab routing dynamically
const oldNav = 'if (!isActive) {\r\n  navigate(`${item.href}?tab=${item.subItems[0].tab}`);\r\n  }';
const oldNav2 = 'if (!isActive) {\n  navigate(`${item.href}?tab=${item.subItems[0].tab}`);\n  }';
const newNav = 'if (!isActive) {\n    const allowedSubs = item.subItems.filter(sub => hasSubPermission(item.label, sub.label));\n    if (allowedSubs.length > 0) navigate(`${item.href}?tab=${allowedSubs[0].tab}`);\n  }';

if (content.includes(oldNav)) {
  content = content.replace(oldNav, newNav);
} else if (content.includes(oldNav2)) {
  content = content.replace(oldNav2, newNav);
} else {
  // try regex
  content = content.replace(
    /if \(\!isActive\) \{\s+navigate\(\`\$\{item\.href\}\?tab=\$\{item\.subItems\[0\]\.tab\}\`\);\s+\}/g,
    'if (!isActive) {\n    const allowedSubs = item.subItems.filter(sub => hasSubPermission(item.label, sub.label));\n    if (allowedSubs.length > 0) navigate(`${item.href}?tab=${allowedSubs[0].tab}`);\n  }'
  );
}

fs.writeFileSync(file, content);
console.log('Successfully applied all patches via Node.js!');
