import { put } from '@vercel/blob';
import { execSync } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const env = fs.readFileSync('./.env','utf8');
const TOKEN = env.match(/^TELEGRAM_BOT_TOKEN=\"?([^\"\n]+)/m)?.[1];
const BLOB = env.match(/^BLOB_READ_WRITE_TOKEN=\"?([^\"\n]+)/m)?.[1];
const p = new PrismaClient();
const tgUsers = await p.user.findMany({ where: { telegramId: { not: null } }, select: { id:true, name:true, telegramId:true, image:true } });
for (const u of tgUsers) {
  if (u.image) { console.log(' ', u.name, '-> avatar bor'); continue; }
  try {
    const photos = JSON.parse(execSync(`curl -s "https://api.telegram.org/bot${TOKEN}/getUserProfilePhotos?user_id=${u.telegramId}&limit=1"`, {encoding:'utf8'}));
    const fid = photos.result?.photos?.[0]?.[0]?.file_id;
    if (!fid) { console.log(' ', u.name, '-> rasm yoq'); continue; }
    const meta = JSON.parse(execSync(`curl -s "https://api.telegram.org/bot${TOKEN}/getFile?file_id=${fid}"`, {encoding:'utf8'}));
    const fp = meta.result?.file_path;
    if (!fp) { console.log(' ', u.name, '-> file_path yoq'); continue; }
    const fileRes = execSync(`curl -s "https://api.telegram.org/file/bot${TOKEN}/${fp}"`, {encoding:'buffer'});
    const blob = await put(`uzm/telegram/${Date.now()}-avatar.jpg`, Buffer.from(fileRes), {
      access: 'public', token: BLOB, contentType: 'image/jpeg'
    });
    await p.user.update({ where:{ id:u.id }, data:{ image: blob.url } });
    console.log(' ', u.name, '-> avatar:', blob.url.slice(0,60));
  } catch(e) { console.log(' ', u.name, '-> xato:', e.message.slice(0,80)); }
}
await p.$disconnect();
