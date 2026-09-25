import {existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(!existsSync('.env.local')){
 const secret=randomBytes(48).toString('hex'),key=randomBytes(32).toString('hex');
 const content=`BETTER_AUTH_SECRET=${secret}\nBETTER_AUTH_URL=http://localhost:5173\nSETUP_KEY=${key}\n`;
 writeFileSync('.env.local',content);writeFileSync('.dev.vars',content);
 mkdirSync('.sites-runtime',{recursive:true});
 writeFileSync('.sites-runtime/PRIMEIRO_ACESSO.md',`# Primeiro acesso da Galeteria\n\n1. Abra a loja e cadastre sua conta com e-mail e senha.\n2. Acesse /configurar e cole a chave abaixo para tornar essa conta a administradora.\n3. A chave só funciona antes da primeira configuração. Guarde este arquivo em particular.\n\nChave: ${key}\n\nA mesma chave será configurada na prévia privada hospedada, cujo banco é separado do banco local.\n`);
 console.log('Configuração local criada. Chave em .sites-runtime/PRIMEIRO_ACESSO.md');
}else console.log('Configuração existente preservada.');
