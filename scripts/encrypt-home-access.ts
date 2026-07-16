import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { encryptSensitiveValue, isEncryptedSensitiveValue } from "../src/lib/sensitive-data";

async function main() {
  const homes = await prisma.home.findMany({ select: { id: true, gateCode: true, wifiPassword: true } });
  let updated = 0;
  for (const home of homes) {
    const encryptGate = home.gateCode && !isEncryptedSensitiveValue(home.gateCode);
    const encryptWifi = home.wifiPassword && !isEncryptedSensitiveValue(home.wifiPassword);
    if (!encryptGate && !encryptWifi) continue;
    await prisma.home.update({
      where: { id: home.id },
      data: {
        gateCode: encryptGate ? encryptSensitiveValue(home.gateCode) : home.gateCode,
        wifiPassword: encryptWifi ? encryptSensitiveValue(home.wifiPassword) : home.wifiPassword,
      },
    });
    updated += 1;
  }
  console.log(`Encrypted access data for ${updated} home(s).`);
}

main().finally(() => prisma.$disconnect());
