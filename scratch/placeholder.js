const fs = require('fs');

const file = 'frontend/src/pages/GoyalAgroForm.tsx';
let content = fs.readFileSync(file, 'utf8');

// First, safely remove existing placeholder if any
content = content.replace(/ placeholder="Enter M\/C\.\.\."/g, '');

// Now use regex to find inputs for hodiKataiMc and add the placeholder before className
// The inputs look like: <input value={formData.hodiKataiMc[0]} onChange={...} className="..." />
content = content.replace(/(<input value=\{formData\.hodiKataiMc\[\d+\]\}[^>]*)( className=")/g, '$1 placeholder="Enter M/C..."$2');

fs.writeFileSync(file, content, 'utf8');
console.log("Done adding placeholders");
