import { LRUCache } from 'lru-cache';
import * as fs from 'node:fs';
const cache = new LRUCache({
  max: 2,
  ttl: 200 * 1000,
});

export const init = {
  address: false,
};

const getBaseBlockNumber = () => {
  try {
    return fs.readFileSync('blockHeight', 'utf-8') || '0';
  } catch {
    return '0';
  }
};

// 这个 map 会记录 height
export const globalConfig: {
  baseBlockNumber: number | string;
  number: number;
} = {
  baseBlockNumber: getBaseBlockNumber(), //高度差
  number: 100,
};
export default cache;
