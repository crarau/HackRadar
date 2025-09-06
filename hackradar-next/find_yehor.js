const { MongoClient } = require('mongodb');

async function findYehor() {
    const uri = 'mongodb+srv://hackradar:3GNdOvtuGRrf0xzW@hackradar.yqqb3un.mongodb.net/hackradar?retryWrites=true&w=majority&appName=Hackradar';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const database = client.db('hackradar');
        const projects = database.collection('projects');

        // Search for Yehor in various fields
        console.log('🔍 Searching for "Yehor" in projects collection...\n');
        
        const searchQueries = [
            { teamName: /yehor/i },
            { email: /yehor/i },
            { memberNames: /yehor/i },
            { members: /yehor/i },
            { description: /yehor/i },
            { 'teamMembers.name': /yehor/i },
            { 'teamMembers.firstName': /yehor/i }
        ];
        
        let foundProject = null;
        
        for (const query of searchQueries) {
            const project = await projects.findOne(query);
            if (project) {
                foundProject = project;
                console.log(`✅ Found project with query ${JSON.stringify(query)}:`);
                break;
            }
        }
        
        // If not found with specific queries, do a broader search
        if (!foundProject) {
            console.log('Trying broader search by converting documents to string...\n');
            const allProjects = await projects.find({}).toArray();
            
            for (const project of allProjects) {
                const projectString = JSON.stringify(project).toLowerCase();
                if (projectString.includes('yehor')) {
                    foundProject = project;
                    console.log('✅ Found project containing "Yehor":');
                    break;
                }
            }
        }
        
        if (foundProject) {
            console.log('\n📋 Project details:');
            console.log(JSON.stringify(foundProject, null, 2));
            
            console.log('\n⚠️  Ready to delete this project. Proceeding with deletion...\n');
            
            // Delete the project
            const result = await projects.deleteOne({ _id: foundProject._id });
            
            if (result.deletedCount === 1) {
                console.log('🗑️  Project successfully deleted from database');
                
                // Also delete related timeline entries
                const timeline = database.collection('timeline');
                const timelineResult = await timeline.deleteMany({ projectId: foundProject._id });
                console.log(`🗑️  Deleted ${timelineResult.deletedCount} related timeline entries`);
                
                // Delete related assessments
                const assessments = database.collection('assessments');
                const assessmentResult = await assessments.deleteMany({ projectId: foundProject._id });
                console.log(`🗑️  Deleted ${assessmentResult.deletedCount} related assessments`);
            } else {
                console.log('❌ Failed to delete project');
            }
        } else {
            console.log('❌ No project found containing "Yehor"');
            
            // Show all projects to help identify
            console.log('\n📋 All projects in database:');
            const allProjects = await projects.find({}).toArray();
            allProjects.forEach((project, index) => {
                console.log(`\n${index + 1}. Team: ${project.teamName}`);
                console.log(`   Email: ${project.email}`);
                if (project.memberNames) console.log(`   Members: ${project.memberNames}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDisconnected from MongoDB');
    }
}

findYehor();