/**
 * Database connection and utilities
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class Database {
  constructor() {
    this.client = null;
    this.db = null;
    this.uri = process.env.MONGODB_URI;
    
    if (!this.uri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
  }
  
  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      if (!this.client) {
        this.client = new MongoClient(this.uri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });
        
        await this.client.connect();
        this.db = this.client.db('evaldb');
        
        console.log('Connected to MongoDB successfully');
        
        // Create indexes for better performance
        await this.createIndexes();
      }
      
      return this.db;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }
  
  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
        this.db = null;
        console.log('Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
  
  /**
   * Get database instance
   */
  async getDb() {
    if (!this.db) {
      await this.connect();
    }
    return this.db;
  }
  
  /**
   * Test database connection
   */
  async testConnection() {
    try {
      const db = await this.getDb();
      await db.command({ ping: 1 });
      console.log('Database connection test successful');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
  
  /**
   * Create necessary indexes for better performance
   */
  async createIndexes() {
    try {
      const db = await this.getDb();
      
      // ProgressState indexes
      await db.collection('progressStates').createIndex({ startupId: 1 }, { unique: true });
      await db.collection('progressStates').createIndex({ email: 1 });
      await db.collection('progressStates').createIndex({ updatedAt: -1 });
      await db.collection('progressStates').createIndex({ currentScore: -1 });
      
      // Snapshot indexes
      await db.collection('snapshots').createIndex({ startupId: 1, timestamp: -1 });
      await db.collection('snapshots').createIndex({ timestamp: -1 });
      await db.collection('snapshots').createIndex({ triggerEvent: 1 });
      
      // Submission indexes
      await db.collection('submissions').createIndex({ startupId: 1, submittedAt: -1 });
      await db.collection('submissions').createIndex({ type: 1 });
      await db.collection('submissions').createIndex({ processingStatus: 1 });
      await db.collection('submissions').createIndex({ evaluationStatus: 1 });
      
      // Evaluation indexes
      await db.collection('evaluations').createIndex({ submissionId: 1 });
      await db.collection('evaluations').createIndex({ startupId: 1, evaluatedAt: -1 });
      await db.collection('evaluations').createIndex({ agent: 1 });
      await db.collection('evaluations').createIndex({ overallScore: -1 });
      await db.collection('evaluations').createIndex({ reviewStatus: 1 });
      
      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Failed to create indexes:', error);
      // Don't throw - indexes are optimization, not critical
    }
  }
  
  /**
   * Get collection statistics
   */
  async getStats() {
    try {
      const db = await this.getDb();
      const collections = ['progressStates', 'snapshots', 'submissions', 'evaluations'];
      const stats = {};
      
      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        stats[collectionName] = { count };
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }
  
  /**
   * Clean up test data (useful for testing)
   */
  async cleanupTestData() {
    try {
      const db = await this.getDb();
      const collections = ['progressStates', 'snapshots', 'submissions', 'evaluations'];
      
      for (const collectionName of collections) {
        // Only delete documents that are clearly test data
        await db.collection(collectionName).deleteMany({
          $or: [
            { startupId: { $regex: /^test-/ } },
            { teamName: { $regex: /test/i } },
            { email: { $regex: /test@/ } }
          ]
        });
      }
      
      console.log('Test data cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
    }
  }
  
  /**
   * Backup a startup's data
   */
  async backupStartup(startupId) {
    try {
      const db = await this.getDb();
      const backup = {
        startupId,
        timestamp: new Date(),
        progressState: await db.collection('progressStates').findOne({ startupId }),
        snapshots: await db.collection('snapshots').find({ startupId }).toArray(),
        submissions: await db.collection('submissions').find({ startupId }).toArray(),
        evaluations: await db.collection('evaluations').find({ startupId }).toArray()
      };
      
      return backup;
    } catch (error) {
      console.error('Failed to backup startup data:', error);
      throw error;
    }
  }
  
  /**
   * Health check for monitoring
   */
  async healthCheck() {
    try {
      const db = await this.getDb();
      const start = Date.now();
      await db.command({ ping: 1 });
      const responseTime = Date.now() - start;
      
      const stats = await this.getStats();
      
      return {
        status: 'healthy',
        responseTime,
        timestamp: new Date(),
        collections: stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Singleton instance
const database = new Database();

export default database;

// Convenience functions
export const connectDB = () => database.connect();
export const disconnectDB = () => database.disconnect();
export const getDB = () => database.getDb();
export const testConnection = () => database.testConnection();
export const getStats = () => database.getStats();
export const cleanupTestData = () => database.cleanupTestData();
export const healthCheck = () => database.healthCheck();