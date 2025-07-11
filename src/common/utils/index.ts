import { LRUCache } from 'lru-cache';
const cache = new LRUCache({
  max: 2,
  ttl: 200 * 1000,
});

export const init = {
  address: false,
};

export default cache;
