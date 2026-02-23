/**
 * Test script for LiveKit Token API
 * 
 * Usage:
 * node test-livekit-token.js <projectId> <authToken>
 * 
 * Example:
 * node test-livekit-token.js f12faba3-c9fd-4955-a694-1fb77556247 your-jwt-token
 */

const projectId = process.argv[2];
const authToken = process.argv[3];

if (!projectId) {
    console.error('❌ Error: projectId is required');
    console.log('\nUsage: node test-livekit-token.js <projectId> <authToken>');
    process.exit(1);
}

if (!authToken) {
    console.error('❌ Error: authToken is required');
    console.log('\nUsage: node test-livekit-token.js <projectId> <authToken>');
    console.log('\nTo get your auth token:');
    console.log('1. Login to http://localhost:3000');
    console.log('2. Open browser DevTools → Application → Cookies');
    console.log('3. Copy the "token" cookie value');
    process.exit(1);
}

async function testLiveKitToken() {
    console.log('🧪 Testing LiveKit Token API\n');
    console.log('Project ID:', projectId);
    console.log('Auth Token:', authToken.substring(0, 20) + '...\n');

    try {
        const response = await fetch('http://localhost:3000/api/livekit/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `token=${authToken}`,
            },
            body: JSON.stringify({ projectId }),
        });

        const data = await response.json();

        console.log('📊 Response Status:', response.status);
        console.log('📦 Response Data:\n');
        console.log(JSON.stringify(data, null, 2));

        if (data.success) {
            console.log('\n✅ Success! LiveKit token generated\n');
            console.log('Token:', data.data.token.substring(0, 50) + '...');
            console.log('Room:', data.data.room);
            console.log('Identity:', data.data.identity);
            console.log('URL:', data.data.url);
            console.log('Agent:', data.data.project.agentName);
        } else {
            console.log('\n❌ Failed to generate token');
        }
    } catch (error) {
        console.error('\n❌ Error:', error.message);
    }
}

testLiveKitToken();
