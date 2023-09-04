const { MongoClient } = require('mongodb');

const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '27017';
const database = process.env.DB_DATABASE || 'files_manager';
const url = `mongodb://${host}:${port}`;

class DBClient {
  constructor() {
    const client = MongoClient(url);
    client.connect((error) => {
      if (error) {
        console.log('Error:', error);
      } else {
        this.db = client.db(database);
      }
    });
  }

  isAlive() {
    if (this.db) {
      return true;
    }
    return false;
  }

  async nbUsers() {
    const users = this.db.collection('users');
    const resp = await users.find({}).toArray();
    return resp.length;
  }

  async nbFiles() {
    const files = this.db.collection('files');
    const resp = await files.find({}).toArray();
    return resp.length;
  }
}

export default new DBClient();
