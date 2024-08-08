// import crypto from 'crypto';

export const encryptRoom = (email1: string, email2: string): string => {
  // const sortedEmails = [email1, email2].sort().join('_');
  // return crypto.createHash('sha256').update(sortedEmails).digest('hex');
  const sortedEmails = [email1, email2].sort().join('_');
  const hasher = new Bun.CryptoHasher('sha3-256');
  hasher.update(sortedEmails);
  const hashedEmails = hasher.digest('hex');
  return hashedEmails;
};
