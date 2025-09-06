const { MongoClient } = require('mongodb');

async function checkCollections() {
    const uri = 'mongodb+srv://hackradar:3GNdOvtuGRrf0xzW@hackradar.yqqb3un.mongodb.net/hackradar?retryWrites=true&w=majority&appName=Hackradar';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const database = client.db('hackradar');
        
        // List all collections
        const collections = await database.listCollections().toArray();
        console.log('\n📁 All collections in database:');
        collections.forEach(col => console.log(`  - ${col.name}`));
        
        // Check each collection for Yehor
        console.log('\n🔍 Searching for "Yehor" in all collections...');
        
        for (const col of collections) {
            const collection = database.collection(col.name);
            const count = await collection.countDocuments();
            
            if (count > 0) {
                console.log(`\n📊 Collection "${col.name}" has ${count} documents`);
                
                // Get sample document to see structure
                const sample = await collection.findOne({});
                console.log(`Sample document structure:`);
                console.log(JSON.stringify(sample, null, 2).substring(0, 500) + '...');
                
                // Search for Yehor in any text field
                const searchQuery = {
                    $or: [
                        { $text: { $search: "Yehor" } },
                        { name: /yehor/i },
                        { firstName: /yehor/i },
                        { lastName: /yehor/i },
                        { username: /yehor/i },
                        { email: /yehor/i },
                        { 'profile.name': /yehor/i },
                        { 'profile.firstName': /yehor/i }
                    ]
                };
                
                try {
                    const found = await collection.findOne(searchQuery);
                    if (found) {
                        console.log(`\n✅ FOUND "Yehor" in collection "${col.name}":`);
                        console.log(JSON.stringify(found, null, 2));
                    }
                } catch (e) {
                    // Try simpler search if text search fails
                    const simpleSearch = await collection.findOne({
                        $or: [
                            { name: /yehor/i },
                            { firstName: /yehor/i },
                            { lastName: /yehor/i }
                        ]
                    });
                    if (simpleSearch) {
                        console.log(`\n✅ FOUND "Yehor" in collection "${col.name}":`);
                        console.log(JSON.stringify(simpleSearch, null, 2));
                    }
                }
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\n\nDisconnected from MongoDB');
    }
}

checkCollections();