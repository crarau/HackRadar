import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  console.log('🏆 [Leaderboard API] GET request received');
  
  try {
    const db = await getDatabase();
    
    console.log('📊 [Leaderboard API] Fetching all projects...');
    
    // Get all projects
    const projects = await db.collection('projects').find({}).toArray();
    console.log(`   Found ${projects.length} total projects`);
    
    const leaderboard = [];
    
    for (const project of projects) {
      console.log(`\n📋 Processing project: ${project.teamName} (${project._id})`);
      
      // Get the latest timeline entry with evaluation for this project
      // First try to sort by createdAt, but if all entries have invalid dates (1970), sort by _id (which is always sequential)
      const latestEntry = await db.collection('timeline')
        .findOne(
          { 
            projectId: project._id.toString(),
            'evaluation.scores.final_score': { $exists: true, $ne: null }
          },
          { sort: { _id: -1 } } // Sort by _id to get truly latest entry (ObjectId is sequential)
        );
      
      if (latestEntry && latestEntry.evaluation?.scores) {
        const scores = latestEntry.evaluation.scores;
        
        console.log(`   ✅ Latest entry found: ${latestEntry._id}`);
        console.log(`   📅 Created: ${latestEntry.createdAt}`);
        console.log(`   🎯 Final Score: ${scores.final_score}/100`);
        console.log(`   📊 Breakdown: Clarity(${scores.clarity}) + Problem(${scores.problem_value}) + Feasibility(${scores.feasibility_signal}) + Originality(${scores.originality}) + Impact(${scores.impact_convert}) + Readiness(${scores.submission_readiness})`);
        
        leaderboard.push({
          _id: project._id.toString(),
          teamName: project.teamName,
          email: project.email,
          combinedScore: scores.final_score,
          // Break down the scores for the chart display
          scores: {
            clarity: scores.clarity,
            problem_value: scores.problem_value,
            feasibility: scores.feasibility_signal,
            originality: scores.originality,
            impact: scores.impact_convert,
            submission_readiness: scores.submission_readiness,
            final_score: scores.final_score
          },
          lastUpdated: latestEntry.createdAt,
          entryId: latestEntry._id.toString()
        });
      } else {
        console.log(`   ❌ No timeline entries with scores found for ${project.teamName}`);
        
        // Still include projects without scores (they'll show 0)
        leaderboard.push({
          _id: project._id.toString(),
          teamName: project.teamName,
          email: project.email,
          combinedScore: 0,
          scores: {
            clarity: 0,
            problem_value: 0,
            feasibility: 0,
            originality: 0,
            impact: 0,
            submission_readiness: 0,
            final_score: 0
          },
          lastUpdated: project.updatedAt || project.createdAt,
          entryId: null
        });
      }
    }
    
    // Sort by combinedScore descending (highest first)
    leaderboard.sort((a, b) => b.combinedScore - a.combinedScore);
    
    console.log(`\n🏆 [Leaderboard API] Final leaderboard:`);
    leaderboard.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.teamName}: ${team.combinedScore}/100 (${team.entryId ? 'has entry' : 'no entries'})`);
    });
    
    console.log(`\n📤 [Leaderboard API] Returning ${leaderboard.length} teams`);
    
    return NextResponse.json({
      success: true,
      teams: leaderboard,
      totalTeams: leaderboard.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [Leaderboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}