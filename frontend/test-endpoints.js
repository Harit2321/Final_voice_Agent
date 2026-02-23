#!/usr/bin/env node

/**
 * Test script to find correct Cal.com availability endpoint
 */

const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY || 'cal_live_7c8d3d884a150fa1b4af90b23ec83b88';

async function testEndpoints() {
    console.log('🧪 Testing Cal.com API Endpoints...\n');

    const endpoints = [
        { name: 'V1 Schedules GET', url: `https://api.cal.com/v1/schedules?apiKey=${CAL_COM_API_KEY}`, method: 'GET' },
        { name: 'V1 Schedules POST', url: `https://api.cal.com/v1/schedules?apiKey=${CAL_COM_API_KEY}`, method: 'POST', body: { name: 'Test', timeZone: 'Asia/Kolkata' } },
        { name: 'V1 Availability GET', url: `https://api.cal.com/v1/availability?apiKey=${CAL_COM_API_KEY}`, method: 'GET' },
        { name: 'V1 Selected Calendars GET', url: `https://api.cal.com/v1/selected-calendars?apiKey=${CAL_COM_API_KEY}`, method: 'GET' },
    ];

    for (const endpoint of endpoints) {
        console.log(`Testing: ${endpoint.name}`);
        try {
            const options = {
                method: endpoint.method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (endpoint.body) {
                options.body = JSON.stringify(endpoint.body);
            }

            const response = await fetch(endpoint.url, options);
            const text = await response.text();

            console.log(`  Status: ${response.status}`);
            console.log(`  Response: ${text.substring(0, 200)}...\n`);
        } catch (error) {
            console.error(`  Error: ${error.message}\n`);
        }
    }
}

testEndpoints().catch(console.error);
