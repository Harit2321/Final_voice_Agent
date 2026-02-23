#!/usr/bin/env node

/**
 * Test script to verify Cal.com API integration
 * 
 * This script tests:
 * 1. Environment variables are loaded
 * 2. Cal.com API is reachable
 * 3. Event type creation works
 * 4. Schedule creation works
 * 
 * Usage: node test-calcom.js
 */

const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY || 'cal_live_7c8d3d884a150fa1b4af90b23ec83b88';
const CAL_COM_API_URL = process.env.CAL_COM_API_URL || 'https://api.cal.com/v2';

async function testCalComConnection() {
    console.log('🧪 Testing Cal.com API Connection...\n');

    // Test 1: Check environment variables
    console.log('1️⃣ Checking environment variables...');
    console.log(`   API Key: ${CAL_COM_API_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   API URL: ${CAL_COM_API_URL}\n`);

    if (!CAL_COM_API_KEY) {
        console.error('❌ CAL_COM_API_KEY is not set!');
        process.exit(1);
    }

    // Test 2: Fetch existing event types
    console.log('2️⃣ Fetching existing event types...');
    try {
        const response = await fetch(`${CAL_COM_API_URL}/event-types`, {
            headers: {
                'Authorization': `Bearer ${CAL_COM_API_KEY}`,
                'cal-api-version': '2024-08-13'
            }
        });

        console.log(`   Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ Successfully connected to Cal.com`);
            console.log(`   Event types found: ${data.data?.eventTypeGroups?.length || 0}\n`);
        } else {
            const text = await response.text();
            console.log(`   ⚠️  Response: ${text}\n`);

            // Try V1 API
            console.log('   Trying V1 API...');
            const v1Response = await fetch(`https://api.cal.com/v1/event-types?apiKey=${CAL_COM_API_KEY}`);
            console.log(`   V1 Status: ${v1Response.status}`);

            if (v1Response.ok) {
                const v1Data = await v1Response.json();
                console.log(`   ✅ V1 API works! Event types: ${v1Data.event_types?.length || 0}\n`);
            }
        }
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
    }

    // Test 3: Create a test schedule
    console.log('3️⃣ Creating test schedule...');
    try {
        // Test different payload formats
        const payloadFormats = [
            {
                name: 'Format 1: availability array',
                payload: {
                    name: `Test Schedule ${Date.now()}`,
                    timeZone: 'Asia/Kolkata',
                    isDefault: false,
                    availability: [
                        {
                            days: [1, 2, 3, 4, 5],
                            startTime: '09:00:00',
                            endTime: '17:00:00'
                        }
                    ]
                }
            },
            {
                name: 'Format 2: schedule array',
                payload: {
                    name: `Test Schedule ${Date.now()}`,
                    timeZone: 'Asia/Kolkata',
                    isDefault: false,
                    schedule: [
                        {
                            days: [1, 2, 3, 4, 5],
                            startTime: '09:00',
                            endTime: '17:00'
                        }
                    ]
                }
            },
            {
                name: 'Format 3: availability without isDefault',
                payload: {
                    name: `Test Schedule ${Date.now()}`,
                    timeZone: 'Asia/Kolkata',
                    availability: [
                        {
                            days: [1, 2, 3, 4, 5],
                            startTime: '09:00:00',
                            endTime: '17:00:00'
                        }
                    ]
                }
            }
        ];

        for (const format of payloadFormats) {
            console.log(`\n   Testing ${format.name}...`);
            console.log(`   Payload: ${JSON.stringify(format.payload, null, 2)}`);

            const response = await fetch(`${CAL_COM_API_URL}/schedules`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${CAL_COM_API_KEY}`,
                    'Content-Type': 'application/json',
                    'cal-api-version': '2024-08-13'
                },
                body: JSON.stringify(format.payload)
            });

            const responseText = await response.text();
            console.log(`   Status: ${response.status}`);
            console.log(`   Response: ${responseText}`);

            if (response.ok) {
                console.log(`   ✅ ${format.name} works!\n`);
                break; // Stop if we found a working format
            } else {
                console.log(`   ❌ ${format.name} failed\n`);
            }
        }
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
    }

    // Test 4: Create a test event type
    console.log('4️⃣ Creating test event type...');
    try {
        const testService = {
            title: 'Test Service - ' + Date.now(),
            slug: 'test-service-' + Date.now(),
            length: 30,
            description: 'Test event type created by integration test'
        };

        console.log(`   Creating: ${testService.title}`);

        const response = await fetch(`${CAL_COM_API_URL}/event-types`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CAL_COM_API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': '2024-08-13'
            },
            body: JSON.stringify(testService)
        });

        const responseText = await response.text();
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${responseText}\n`);

        if (response.ok) {
            console.log('   ✅ Event type created successfully!\n');
        } else {
            console.log('   ⚠️  V2 failed, trying V1...');

            const v1Response = await fetch(`https://api.cal.com/v1/event-types?apiKey=${CAL_COM_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(testService)
            });

            const v1Text = await v1Response.text();
            console.log(`   V1 Status: ${v1Response.status}`);
            console.log(`   V1 Response: ${v1Text}\n`);

            if (v1Response.ok) {
                console.log('   ✅ V1 API event type creation works!\n');
            }
        }
    } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
    }

    console.log('✨ Test complete!\n');
    console.log('Summary:');
    console.log('- If you see ✅ marks above, the integration should work');
    console.log('- Check the API responses to see which version (V1 or V2) works best');
    console.log('- The actual integration in route.ts will use V2 with V1 fallback\n');
}

// Run the test
testCalComConnection().catch(console.error);
