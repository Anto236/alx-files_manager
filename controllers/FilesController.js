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

  static async getShow(request, response) {
    const usrId = request.user._id;
    const { id } = request.params;
    const file = await dbClient.filterFiles({ _id: id });
    if (!file) {
      response.status(404).json({ error: 'Not found' }).end();
    } else if (String(file.userId) !== String(usrId)) {
      response.status(404).json({ error: 'Not found' }).end();
    } else {
      response.status(200).json(file).end();
    }
  }

  static async getIndex(request, response) {
    const usrId = request.user._id;
    const _parentId = request.query.parentId ? request.query.parentId : '0';
    const page = request.query.page ? request.query.page : 0;
    const cursor = await dbClient.findFiles(
      { parentId: _parentId, userId: usrId },
      { limit: 20, skip: 20 * page },
    );
    const res = await cursor.toArray();
    res.map((i) => {
      // eslint-disable-next-line no-param-reassign
      i.id = i._id;
      // eslint-disable-next-line no-param-reassign
      delete i._id;
      return i;
    });
    response.status(200).json(res).end();
  }

  static async putPublish(request, response) {
    const userId = request.usr._id;
    const file = await dbClient.filterFiles({ _id: request.params.id });
    if (!file || String(file.userId) !== String(userId)) {
      response.status(404).json({ error: 'Not found' }).end();
    } else {
      const newFile = await dbClient.updatefiles({ _id: file._id }, { isPublic: true });
      response.status(200).json(newFile).end();
    }
  }

  static async putUnpublish(request, response) {
    const userId = request.usr._id;
    const file = await dbClient.filterFiles({ _id: request.params.id });
    if (!file || String(file.userId) !== String(userId)) {
      response.status(404).json({ error: 'Not found' }).end();
    } else {
      const newFile = await dbClient.updatefiles({ _id: file._id }, { isPublic: false });
      response.status(200).json(newFile).end();
    }
  }

  static async getFile(request, response) {
    const usrId = request.usr._id;
    const file = await dbClient.filterFiles({ _id: request.params.id });
    if (!file) {
      response.status(404).json({ error: 'Not found' }).end();
    } else if (file.type === 'folder') {
      response.status(400).json({ error: "A folder doesn't have content" }).end();
    } else if ((String(file.userId) === String(usrId)) || file.isPublic) {
      try {
        const content = await UtilController.readFile(file.localPath);
        const header = { 'Content-Type': contentType(file.name) };
        response.set(header).status(200).send(content).end();
      } catch (err) {
        response.status(404).json({ error: 'Not found' }).end();
      }
    } else {
      response.status(404).json({ error: 'Not found' }).end();
    }
  }
}
module.exports = FilesController;
