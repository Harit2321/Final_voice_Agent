#!/usr/bin/env node

/**
 * Test script to verify Cal.com V1 API availability integration
 */

const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY || 'cal_live_7c8d3d884a150fa1b4af90b23ec83b88';

async function testAvailability() {
    console.log('🧪 Testing Cal.com V1 Availability API...\n');

    // Test creating availability
    const availabilityBlocks = [
        {
            days: [1, 2, 3, 4, 5], // Mon-Fri
            startTime: '09:00',
            endTime: '17:00'
        }
    ];

    const payload = {
        schedule: availabilityBlocks,
        timeZone: 'Asia/Kolkata'
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`https://api.cal.com/v1/availability?apiKey=${CAL_COM_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log(`\nStatus: ${response.status}`);
        console.log(`Response: ${responseText}\n`);

        if (response.ok) {
            console.log('✅ Availability created successfully!');
        } else {
            console.log('❌ Failed to create availability');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testAvailability().catch(console.error);
