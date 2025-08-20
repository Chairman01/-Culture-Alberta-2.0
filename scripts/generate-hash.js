import bcrypt from 'bcryptjs';

async function generateHash() {
  const password = 'Kj8#mN2$pQ9@vX5!rL7&';
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  console.log('🔐 Generating hash for password:', password);
  console.log('📝 Password Hash:', passwordHash);
  console.log('\n🔧 Update your Vercel environment variable:');
  console.log('ADMIN_PASSWORD_HASH=' + passwordHash);
}

generateHash().catch(console.error);
