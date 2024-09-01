import * as crypto from 'crypto';

const CIPER_ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = 'a1d513f8606ce4f73465c237ec3ec20e'; // Replace with a secure key
const IV_LENGTH = 16; // For AES, this is always 16

export function encryptStarter(data: string | object | number): string {
  let stringToEncrypt: string;

  if (typeof data === 'object') {
    stringToEncrypt = JSON.stringify(data);
  } else if (typeof data === 'number') {
    stringToEncrypt = data.toString();
  } else {
    stringToEncrypt = data;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(CIPER_ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(stringToEncrypt);
  encrypted = Buffer.concat([new Uint8Array(encrypted), new Uint8Array(cipher.final())]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptStarter(text: string): string | object | number {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(CIPER_ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted: Buffer = Buffer.from(decipher.update(new Uint8Array(encryptedText)));
  decrypted = Buffer.concat([new Uint8Array(decrypted), new Uint8Array(decipher.final())]);
  const decryptedString = decrypted.toString();

  // Try to parse as JSON (for objects)
  try {
    return JSON.parse(decryptedString);
  } catch (_e) {
    // If it's not a valid JSON, check if it's a number
    if (!isNaN(Number(decryptedString))) {
      return Number(decryptedString);
    }
    // If it's not a number, return as string
    return decryptedString;
  }
}

export const encryptRoom = (email1: string, email2: string): string => {
  // const sortedEmails = [email1, email2].sort().join('_');
  // return crypto.createHash('sha256').update(sortedEmails).digest('hex');
  const sortedEmails = [email1, email2].sort().join('_');
  const hasher = new Bun.CryptoHasher('sha3-256');
  hasher.update(sortedEmails);
  const hashedEmails = hasher.digest('hex');
  return hashedEmails;
};
