#!/usr/bin/env node

/**
 * Test the exact payload we're using in the app
 */

const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY || 'cal_live_7c8d3d884a150fa1b4af90b23ec83b88';

async function testScheduleCreation() {
    console.log('🧪 Testing Schedule Creation...\n');

    // This matches the exact format in calcom.ts
    const availabilityBlocks = [];
    const schedule = [
        { day: 'Monday', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Tuesday', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Wednesday', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Tuesday', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Friday', enabled: true, start: '09:00', end: '17:00' },
        { day: 'Saturday', enabled: false, start: '09:00', end: '17:00' },
        { day: 'Sunday', enabled: false, start: '09:00', end: '17:00' },
    ];

    function getDayNumber(dayName) {
        const dayMap = {
            'Sunday': 0,
            'Monday': 1,
            'Tuesday': 2,
            'Wednesday': 3,
            'Thursday': 4,
            'Friday': 5,
            'Saturday': 6
        };
        return dayMap[dayName] ?? -1;
    }

    for (const day of schedule) {
        if (!day.enabled) continue;

        const dayNum = getDayNumber(day.day);
        if (dayNum === -1) continue;

        const startTime = `${day.start}:00`;
        const endTime = `${day.end}:00`;

        availabilityBlocks.push({
            days: [dayNum],
            startTime: startTime,
            endTime: endTime
        });
    }

    const payload = {
        name: `Business Hours ${Date.now()}`,
        timeZone: 'Asia/Kolkata',
        availability: availabilityBlocks
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(`https://api.cal.com/v1/schedules?apiKey=${CAL_COM_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log(`\nStatus: ${response.status}`);
        console.log(`Response:`, responseText.substring(0, 500), '...\n');

        if (response.ok) {
            const data = JSON.parse(responseText);
            console.log('✅ Schedule created successfully!');
            console.log('Schedule ID:', data.schedule?.id || data.id);
        } else {
            console.log('❌ Failed to create schedule');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testScheduleCreation().catch(console.error);
