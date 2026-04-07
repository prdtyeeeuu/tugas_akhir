const User = require('./models/User');

async function checkDB() {
  try {
    const user = await User.findByEmail('pradityadwi017@gmail.com');
    if (user) {
      console.log('User found:', user.name);
      console.log('Current profile image:', user.profile_image);
      console.log('Current banner image:', user.banner_image);
    } else {
      console.log('User not found!');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
checkDB();
