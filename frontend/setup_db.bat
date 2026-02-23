@echo off
echo Starting DB setup... > setup.log
call npx prisma generate >> setup.log 2>&1
call npx prisma db push --accept-data-loss >> setup.log 2>&1
call npx prisma db seed >> setup.log 2>&1
echo DB setup finished. >> setup.log
