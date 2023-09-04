import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const { ObjectId } = require('mongodb');

const sha1 = require('sha1');

class UserController {
  static async postNew(req, res) {
    const users = await dbClient.db.collection('users');
    const { email, password } = req.body;

    // if email or password not in request.body
    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    // if user already exists
    let queryResult = await users.findOne({ email });
    if (queryResult) {
      return res.status(400).send({ error: 'Already exist' });
    }

    const sha1Password = sha1(password);
    queryResult = await users.insertOne({ email, password: sha1Password });
    return res.status(201).send({ id: queryResult.insertedId, email });
  }

  static async getMe(req, res) {
    // retreive token from request headers
    const token = req.headers['x-token'];
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    // retreive token from redis
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    // retreive user from database
    const users = await dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    return res.send({ id: user._id, email: user.email });
  }
}

module.exports = UserController;
