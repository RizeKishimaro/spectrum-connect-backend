import bcrypt from 'bcrypt';

const newPassword = 's3cr3tP@ssw0rd';
bcrypt.hash(newPassword, 10).then(hash => {
  console.log('Hashed password:', hash);
});

