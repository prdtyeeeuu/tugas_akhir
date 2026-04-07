const fs = require('fs');
const content = fs.readFileSync('views/pages/profile.ejs', 'utf-8');
const lines = content.split(/\r?\n/);

// Find the line with <script> and the duplicate INJECT UPLOAD HANDLERS
let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// INJECT UPLOAD HANDLERS DIRECTLY')) {
    startIndex = i; // Line 281 (index 280)
  }
  if (startIndex !== -1 && lines[i].includes('})();') && lines[i+1] && lines[i+1].includes('</script>')) {
    endIndex = i + 1; // Line 405 (index 404)
    break;
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  // Remove the block
  lines.splice(startIndex, endIndex - startIndex + 1);
  fs.writeFileSync('views/pages/profile.ejs', lines.join('\n'));
  console.log('Successfully fixed duplicate script block in profile.ejs');
} else {
  console.log('Could not find the target block');
}
