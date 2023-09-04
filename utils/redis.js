import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();
    this.alive = true;
    this.client.on('error', (error) => {
      console.log(error);
      this.alive = false;
    });
    this.client.get = promisify(this.client.get).bind(this.client);
    this.client.set = promisify(this.client.set).bind(this.client);
    this.client.once('ready', () => {
      this.alive = true;
    });
  }

  isAlive() {
    return this.alive;
  }

  async get(key) {
    return this.client.get(key);
  }

  async set(key, value, duration) {
    this.client.set(key, value, 'EX', duration);
  }

  async del(key) {
    return this.client.del(key);
  }
}

export default new RedisClient();
