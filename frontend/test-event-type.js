#!/usr/bin/env node

/**
 * Test event type creation with updated booking fields
 */

const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY || 'cal_live_7c8d3d884a150fa1b4af90b23ec83b88';

async function testEventTypeWithBookingFields() {
    console.log('🧪 Testing Event Type Creation with Booking Fields...\n');

    const payload = {
        title: `Test Service ${Date.now()}`,
        slug: `test-service-${Date.now()}`,
        length: 30,
        description: 'Price: $50',
        locations: [
            {
                type: 'phone',
                phone: ''
            }
        ],
        hidden: false,
        bookingFields: [
            {
                name: 'name',
                type: 'name',
                label: 'Full Name',
                placeholder: 'Enter your name',
                required: true
            },
            {
                name: 'attendeePhoneNumber',
                type: 'phone',
                label: 'Phone Number',
                placeholder: '+1 (555) 123-4567',
                required: true
            },
            {
                name: 'email',
                type: 'email',
                label: 'Email Address',
                placeholder: 'you@example.com',
                required: false
            }
        ]
    };

    console.log('Payload:', JSON.stringify(payload, null, 2), '\n');

    try {
        const response = await fetch(`https://api.cal.com/v1/event-types?apiKey=${CAL_COM_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, responseText.substring(0, 800), '...\n');

        if (response.ok) {
            const data = JSON.parse(responseText);
            console.log('✅ Event type created successfully!');
            console.log('Event Type ID:', data.event_type?.id);

            // Check if booking fields are properly set
            const bookingFields = data.event_type?.bookingFields;
            if (bookingFields) {
                console.log('\n📋 Booking Fields:');
                bookingFields.forEach((field, index) => {
                    console.log(`  ${index + 1}. ${field.label || field.type}: ${field.required ? 'REQUIRED ✓' : 'OPTIONAL'}`);
                });
            }
        } else {
            console.log('❌ Failed to create event type');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testEventTypeWithBookingFields().catch(console.error);
