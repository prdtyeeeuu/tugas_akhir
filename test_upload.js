const fs = require('fs');
const path = require('path');

// Create a dummy image file
const dummyPath = path.join(__dirname, 'dummy.jpg');
fs.writeFileSync(dummyPath, Buffer.from('dummy image content'));

const FormData = require('form-data');
const form = new FormData();
form.append('profileImage', fs.createReadStream(dummyPath));

fetch('http://localhost:3000/profile/upload-image', {
  method: 'POST',
  body: form,
  headers: {
    // Need cookie session. Let's just login first.
  }
});
