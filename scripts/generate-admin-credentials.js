import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Generate a secure random password
function generateSecurePassword(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Generate a secure JWT secret
function generateJWTSecret() {
  return crypto.randomBytes(64).toString('hex');
}

async function generateCredentials() {
  console.log('🔐 Generating secure admin credentials...\n');
  
  // Generate secure password
  const password = generateSecurePassword(20);
  console.log('📝 Generated Password:', password);
  console.log('⚠️  SAVE THIS PASSWORD - You won\'t see it again!\n');
  
  // Hash the password
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  
  // Generate JWT secret
  const jwtSecret = generateJWTSecret();
  
  // Generate username (you can change this)
  const username = 'admin';
  
  console.log('🔧 Environment Variables to add to your .env.local file:\n');
  console.log('ADMIN_USERNAME=' + username);
  console.log('ADMIN_PASSWORD_HASH=' + passwordHash);
  console.log('JWT_SECRET=' + jwtSecret);
  console.log('\n📋 Copy these lines to your .env.local file');
  console.log('🌐 For production, add these to your hosting platform\'s environment variables');
  
  return {
    username,
    password,
    passwordHash,
    jwtSecret
  };
}

// Run the script
generateCredentials().catch(console.error);
