const fs = require('fs');

const file = 'frontend/src/pages/GoyalAgroForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// First, remove any existing placeholders just in case
content = content.replace(/ placeholder="Enter M\/C\.\.\."/g, '');

// The input looks like: <input value={formData.hodiKataiMc[1]} onChange={...} className="w-full...
// I will replace ` className=` with ` placeholder="Enter M/C..." className=` ONLY for hodiKataiMc inputs
content = content.replace(/(<input value=\{formData\.hodiKataiMc\[\d+\]\}[^>]*?)( className=")/g, '$1 placeholder="Enter M/C..."$2');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed placeholders using node script');
