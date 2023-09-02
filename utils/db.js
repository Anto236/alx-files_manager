import { env } from 'process';
import { MongoClient, ObjectId } from 'mongodb';

export class DBClient {
  constructor() {
    const host = env.DB_HOST ? env.DB_HOST : '127.0.0.1';
    const port = env.DB_PORT ? Number(env.DB_PORT) : 27017; // Ensure port is a number
    const database = env.DB_DATABASE ? env.DB_DATABASE : 'files_manager';
    this.myClient = new MongoClient(`mongodb://${host}:${port}`);
  }

  async connectToMongoDB() {
    try {
      await this.myClient.connect();
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error);
    }
  }

  isAlive() {
    return this.myClient.isConnected();
  }

  async nbUsers() {
    const myDB = this.myClient.db();
    const myCollection = myDB.collection('users');
    return myCollection.countDocuments();
  }

  async nbFiles() {
    const myDB = this.myClient.db();
    const myCollection = myDB.collection('files');
    return myCollection.countDocuments();
  }

  async userExists(email) {
    const myDB = this.myClient.db();
    const myCollection = myDB.collection('users');
    return myCollection.findOne({ email });
  }

  async newUser(email, passwordHash) {
    const myDB = this.myClient.db();
    const myCollection = myDB.collection('users');
    return myCollection.insertOne({ email, passwordHash });
  }

  async filterUser(filters) {
    const myDB = this.myClient.db();
    const myCollection = myDB.collection('users');
    if ('_id' in filters) {
      filters._id = ObjectId(filters._id);
    }
    return myCollection.findOne(filters);
  }

  async filterFiles(filters) {
    const myDB = this.myClient.db();
    const myCollection = myDB.collection('files');
    const idFilters = ['_id', 'userId', 'parentId'].filter(
      (prop) => prop in filters && filters[prop] !== '0'
    );
    idFilters.forEach((i) => {
      filters[i] = ObjectId(filters[i]);
    });
    return myCollection.findOne(filters);
  }

  async close() {
    await this.myClient.close();
    console.log('MongoDB connection closed');
  }
}

const dbClient = new DBClient();

export default dbClient;
