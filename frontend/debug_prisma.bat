@echo on
if exist "node_modules\.bin\prisma.cmd" (
  call node_modules\.bin\prisma.cmd generate
) else (
  echo Prisma CLI not found in node_modules
)
echo DONE
