import { customAlphabet } from 'nanoid';

// Avoid ambiguous characters (0/O, 1/I/L) for human-typed room codes
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const nanoid = customAlphabet(ALPHABET, 6);

/**
 * Generates a short, human-friendly, shareable room code e.g. "K7QX9M"
 */
function generateRoomCode() {
  return nanoid();
}

export default generateRoomCode;
