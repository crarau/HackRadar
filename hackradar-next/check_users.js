const { MongoClient } = require('mongodb');

async function checkUsers() {
    const uri = 'mongodb+srv://hackradar:3GNdOvtuGRrf0xzW@hackradar.yqqb3un.mongodb.net/hackradar?retryWrites=true&w=majority&appName=Hackradar';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const database = client.db('hackradar');
        const users = database.collection('users');

        // Get all users to see the structure
        const allUsers = await users.find({}).limit(5).toArray();
        
        console.log('\n📋 Sample users in database:');
        console.log(JSON.stringify(allUsers, null, 2));
        
        // Try different search patterns for Yehor
        console.log('\n🔍 Searching for "Yehor" in different fields...');
        
        const searchPatterns = [
            { firstName: /yehor/i },
            { lastName: /yehor/i },
            { email: /yehor/i },
            { 'profile.firstName': /yehor/i },
            { 'profile.lastName': /yehor/i },
            { 'profile.name': /yehor/i }
        ];
        
        for (const pattern of searchPatterns) {
            const found = await users.findOne(pattern);
            if (found) {
                console.log(`\n✅ Found user with pattern ${JSON.stringify(pattern)}:`);
                console.log(JSON.stringify(found, null, 2));
                break;
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

checkUsers();