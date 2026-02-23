import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Starting database seed...');

    // Create default services
    console.log('📦 Creating services...');
    const serviceData = [
        {
            name: 'Haircut',
            description: 'Professional haircut service',
            duration: 30,
            price: 25.0,
            isActive: true,
        },
        {
            name: 'Hair Coloring',
            description: 'Full hair coloring service',
            duration: 90,
            price: 80.0,
            isActive: true,
        },
        {
            name: 'Consultation',
            description: '30-minute consultation session',
            duration: 30,
            price: 0,
            isActive: true,
        },
        {
            name: 'Meeting',
            description: 'General meeting booking',
            duration: 60,
            price: null,
            isActive: true,
        },
    ];

    const services = await Promise.all(
        serviceData.map(async (data) => {
            const existing = await prisma.service.findFirst({
                where: { name: data.name, projectId: null },
            });
            if (existing) {
                return prisma.service.update({
                    where: { id: existing.id },
                    data,
                });
            }
            return prisma.service.create({ data });
        })
    );

    console.log(`✅ Created ${services.length} services`);

    // Create test users
    console.log('👤 Creating test users...');
    const hashedPassword = await bcrypt.hash('password123', 12);

    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            passwordHash: hashedPassword,
            name: 'Admin User',
            phone: '+1234567890',
            role: 'ADMIN',
        },
    });

    const testUser = await prisma.user.upsert({
        where: { email: 'user@example.com' },
        update: {},
        create: {
            email: 'user@example.com',
            passwordHash: hashedPassword,
            name: 'Test User',
            phone: '+0987654321',
            role: 'USER',
        },
    });

    console.log('✅ Created 2 test users');
    console.log('   📧 Admin: admin@example.com / password123');
    console.log('   📧 User: user@example.com / password123');

    // Create sample bookings
    console.log('📅 Creating sample bookings...');
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(14, 0, 0, 0);

    await prisma.booking.create({
        data: {
            userId: testUser.id,
            serviceId: services[0].id, // Haircut
            scheduledAt: tomorrow,
            duration: 30,
            status: 'CONFIRMED',
            notes: 'Please bring reference photos',
        },
    });

    await prisma.booking.create({
        data: {
            userId: testUser.id,
            serviceId: services[2].id, // Consultation
            scheduledAt: nextWeek,
            duration: 30,
            status: 'PENDING',
        },
    });

    console.log('✅ Created 2 sample bookings');

    console.log('\n🎉 Database seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
