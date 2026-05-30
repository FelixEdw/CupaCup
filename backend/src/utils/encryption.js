const aesjs = require('aes-js');

// AES-256 requires a 32-byte key
const getKey = () => {
  const raw = (process.env.AES_SECRET_KEY || 'matchup_aes_key_32chars_here!!').padEnd(32, '0').slice(0, 32);
  return aesjs.utils.utf8.toBytes(raw);
};

/**
 * Encrypt a plaintext string using AES-CTR
 * @param {string} plaintext
 * @returns {string} hex-encoded ciphertext
 */
const encrypt = (plaintext) => {
  if (!plaintext) return null;
  const key       = getKey();
  const textBytes = aesjs.utils.utf8.toBytes(plaintext);
  const aesCtr    = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
  const encrypted = aesCtr.encrypt(textBytes);
  return aesjs.utils.hex.fromBytes(encrypted);
};

/**
 * Decrypt a hex-encoded AES-CTR ciphertext
 * @param {string} ciphertext - hex string
 * @returns {string} decrypted plaintext
 */
const decrypt = (ciphertext) => {
  if (!ciphertext) return null;
  try {
    const key            = getKey();
    const encryptedBytes = aesjs.utils.hex.toBytes(ciphertext);
    const aesCtr         = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
    const decrypted      = aesCtr.decrypt(encryptedBytes);
    return aesjs.utils.utf8.fromBytes(decrypted);
  } catch {
    return '[encrypted]';
  }
};

module.exports = { encrypt, decrypt };
