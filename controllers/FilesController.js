import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const { ObjectId } = require('mongodb');
const uuid4 = require('uuid').v4;
const fs = require('fs');

const rootDir = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    // get files collection
    const files = await dbClient.db.collection('files');

    // retrieve user based on token
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const users = await dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    // validate data from requests
    const data = { ...req.body };
    if (!data.name) return res.status(400).send({ error: 'Missing name' });
    if (!data.type) return res.status(400).send({ error: 'Missing type' });
    if (!['folder', 'file', 'image'].includes(data.type)) {
      return res.status(400).send({ error: 'Missing type' });
    }
    if (data.type !== 'folder' && !data.data) {
      return res.status(400).send({ error: 'Missing data' });
    }
    if (data.parentId) {
      const queryResult = await files.findOne({ _id: ObjectId(data.parentId) });
      if (!queryResult) {
        return res.status(400).send({ error: 'Parent not found' });
      }
      if (queryResult.type !== 'folder') {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }

    if (data.type !== 'folder') {
      const fileUuid = uuid4();
      data.localPath = fileUuid;
      const content = Buffer.from(data.data, 'base64');
      fs.mkdir(rootDir, { recursive: true }, (error) => {
        if (error) {
          console.log(error);
        }
        fs.writeFile(`${rootDir}/${fileUuid}`, content, (error) => {
          if (error) {
            console.log(error);
          }
          return true;
        });
        return true;
      });
    }

    // save file
    data.userId = userId;
    data.parentId = data.parentId || 0;
    data.isPublic = data.isPublic || false;
    delete data.data;
    const queryResult = await files.insertOne(data);
    const objFromQuery = { ...queryResult.ops[0] };
    delete objFromQuery.localPath;
    return res
      .status(201)
      .send({ ...objFromQuery, id: queryResult.insertedId });
  }

  static async getShow(req, res) {
    // retrieve user from storage
    const token = req.headers['x-token'];
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const users = await dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    // retrieve document from storage
    const fileId = req.params.id;
    if (!fileId) return res.status(404).send({ error: 'Not found' });
    const files = await dbClient.db.collection('files');
    const file = await files.findOne({ _id: ObjectId(fileId), userId });
    if (!file) return res.status(404).send({ error: 'Not found' });

    delete file.localPath;
    file.id = file._id;
    delete file._id;
    return res.send(file);
  }

  static async getIndex(req, res) {
    // retrieve user from storage
    const token = req.headers['x-token'];
    if (!token) return res.status(401).send({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const users = await dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    // retrieve file from storage
    const parentId = req.query.parentId || 0;
    const page = req.query.page || 0;
    const limit = 20;
    const files = await dbClient.db.collection('files');
    const parentFiles = await files
      .aggregate([
        { $match: { parentId, userId } },
        { $skip: page * limit },
        { $limit: limit },
      ])
      .toArray();

    return res.send(
      parentFiles.map((file) => {
        const obj = { ...file };
        obj.id = obj._id;
        delete obj._id;
        delete obj.localPath;
        return obj;
      }),
    );
  }

  static async putPublish(req, res) {
    // get user
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const users = await dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    // get document
    const fileId = req.params.id;
    const files = await dbClient.db.collection('files');
    const file = await files.findOne({ _id: ObjectId(fileId), userId });
    if (!file) return res.status(404).send({ error: 'Not found' });

    // update document.isPulic attribute
    await files.updateOne(file, {
      $set: { isPublic: true },
    });

    file.id = file._id;
    file.isPublic = true;
    delete file._id;
    delete file.localPath;
    return res.send(file);
  }

  static async putUnpublish(req, res) {
    // get user
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const users = await dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    // get document
    const fileId = req.params.id;
    const files = await dbClient.db.collection('files');
    const file = await files.findOne({ _id: ObjectId(fileId), userId });
    if (!file) return res.status(404).send({ error: 'Not found' });

    // update document.isPulic attribute
    await files.updateOne(file, {
      $set: { isPublic: false },
    });

    file.id = file._id;
    file.isPublic = false;
    delete file._id;
    delete file.localPath;
    return res.send(file);
  }
}

module.exports = FilesController;
