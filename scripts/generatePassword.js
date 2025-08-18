import bcrypt from 'bcrypt';

const newPassword = process.argv[2];

if (!newPassword) {
  console.error('Usage: node generatePassword.js <password>');
  process.exit(1);
}

bcrypt.hash(newPassword, 10).then(hash => {
  console.log('Hashed password:', hash);
});


