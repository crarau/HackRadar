const { MongoClient } = require('mongodb');

async function findAndDeleteUser() {
    const uri = 'mongodb+srv://hackradar:3GNdOvtuGRrf0xzW@hackradar.yqqb3un.mongodb.net/hackradar?retryWrites=true&w=majority&appName=Hackradar';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const database = client.db('hackradar');
        const users = database.collection('users');

        // Find the user with first name "Yehor"
        const user = await users.findOne({ name: /^Yehor/i });
        
        if (user) {
            console.log('\n✅ Found user:');
            console.log(JSON.stringify(user, null, 2));
            
            console.log('\n⚠️  Ready to delete this user. Proceeding with deletion...');
            
            // Delete the user
            const result = await users.deleteOne({ _id: user._id });
            
            if (result.deletedCount === 1) {
                console.log('\n🗑️  User successfully deleted from database');
            } else {
                console.log('\n❌ Failed to delete user');
            }
        } else {
            console.log('\n❌ No user found with name "Yehor"');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

findAndDeleteUser();