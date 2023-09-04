import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const sha1 = require('sha1');
const uuid4 = require('uuid').v4;

class AuthController {
  static async getConnect(req, res) {
    // get user credentials
    const [email, password] = Buffer.from(
      req.headers.authorization.split(' ')[1],
      'base64',
    )
      .toString('utf-8')
      .split(':');
    if (!email || !password) return res.status(401).send({ error: 'Unauthorized' });

    // get user if exists with matching credentials
    const users = await dbClient.db.collection('users');
    const user = await users.findOne({ email, password: sha1(password) });

    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    // generate and return access token
    const token = uuid4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 60 * 60 * 24);

    return res.send({ token });
  }

  static async getDisconnect(req, res) {
    // retreive token from request headers
    const token = req.headers['x-token'];
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    // retreive token from redis
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    // delete user auth token from redis
    await redisClient.del(`auth_${token}`);
    return res.status(204).send();
  }
}

module.exports = AuthController;
