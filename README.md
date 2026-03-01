# PM2 Discord Monitoring Bot

Este é um bot do Discord feito em TypeScript para monitorar aplicações rodando no PM2 em sua VPS.

## Requisitos

- Node.js e npm
- PM2 instalado globalmente (`npm install -g pm2`)

## Como instalar e configurar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Crie e configure o arquivo `.env`:
   ```bash
   cp .env.example .env
   ```
   Edite o `.env` e adicione seu `DISCORD_TOKEN`, seu `ADMIN_ID` (ID do seu usuário no Discord) e `LOG_CHANNEL_ID` (ID do canal que receberá os alertas).

3. Compile o código TypeScript para JavaScript:
   ```bash
   npm run build
   ```

## Como rodar o bot no PM2 para que fique sempre online

Para iniciar o bot e garantir que ele ficará ativo na VPS (gerenciado pelo próprio PM2), você pode utilizar o arquivo de configuração `ecosystem.config.js` gerado:

1. Inicie o bot pelo PM2:
   ```bash
   pm2 start ecosystem.config.js
   ```

2. Salve a lista de processos para que o bot inicie automaticamente quando a VPS for reiniciada:
   ```bash
   pm2 save
   ```

3. Configure o script de startup caso a máquina reinicie (caso ainda não tenha feito na sua VPS):
   ```bash
   pm2 startup
   ```

## Comandos Disponíveis no Discord

- `!status`: Mostra a lista de processos do PM2 com Status, CPU e RAM.
- `!restart <nome_do_processo>`: Reinicia um processo específico do PM2.
- `!logs <nome_do_processo>`: Exibe as últimas 15 linhas de log de um processo do PM2.

**Atenção:** Estes comandos estão protegidos e apenas o usuário com o ID igual ao `ADMIN_ID` (definido no `.env`) poderá utilizá-los. O bot também avisa automaticamente em seu canal sempre que algum processo disparar o evento `process:exception`.
