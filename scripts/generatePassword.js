import bcrypt from 'bcrypt';

const newPassword = 'admin'; // ← your new password
bcrypt.hash(newPassword, 10).then(hash => {
  console.log('Hashed password:', hash);
});

