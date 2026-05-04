# CromGen CRM + Edesy SIP + DigitalOcean + Asterisk Setup

This setup moves calling to Asterisk. The web/mobile CRM does not record audio and does not upload recordings to Cloudinary. Calls are placed through Asterisk using Edesy SIP trunk. If you later need compliant server-side recordings, enable `CRM_RECORD=1` from the PBX API and store files on the Asterisk server.

## Architecture

CRM Backend -> Asterisk AMI -> Agent SIP Extension -> Edesy SIP Trunk -> Customer

## 1. DigitalOcean Server

Use Ubuntu 22.04 or 24.04.

```bash
sudo apt update
sudo apt install -y asterisk asterisk-pjsip ufw fail2ban
sudo systemctl enable asterisk
sudo systemctl start asterisk
```

Firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 5060/udp
sudo ufw allow 10000:20000/udp
sudo ufw enable
```

If CRM backend and Asterisk are on the same server, keep AMI bound to `127.0.0.1`. If they are on different private servers, bind AMI to the private network IP and permit only the CRM private IP.

## 2. Asterisk Config Files

Copy templates:

```bash
sudo cp deploy/asterisk/pjsip.conf.example /etc/asterisk/pjsip.conf
sudo cp deploy/asterisk/extensions.conf.example /etc/asterisk/extensions.conf
sudo cp deploy/asterisk/manager.conf.example /etc/asterisk/manager.conf
sudo cp deploy/asterisk/rtp.conf.example /etc/asterisk/rtp.conf
```

Edit placeholders:

- `CHANGE_ME_PUBLIC_SERVER_IP`
- `CHANGE_ME_PRIVATE_NETWORK_CIDR`
- `CHANGE_ME_EDESY_SIP_HOST`
- `CHANGE_ME_EDESY_SIP_USERNAME`
- `CHANGE_ME_EDESY_SIP_PASSWORD`
- `CHANGE_ME_STRONG_AGENT_PASSWORD`
- `CHANGE_ME_STRONG_AMI_SECRET`

Create recording directory only if server-side recording is legally allowed and needed:

```bash
sudo mkdir -p /var/spool/asterisk/monitor/crm
sudo chown -R asterisk:asterisk /var/spool/asterisk/monitor/crm
```

Reload Asterisk:

```bash
sudo asterisk -rx "core reload"
sudo asterisk -rx "pjsip reload"
sudo asterisk -rx "manager reload"
```

Check trunk and endpoint:

```bash
sudo asterisk -rx "pjsip show endpoints"
sudo asterisk -rx "pjsip show registrations"
```

Note: some SIP providers use IP-auth trunks instead of username/password registration. If Edesy gives IP-auth settings, remove `outbound_auth` and use their required `match` IP/domain in `pjsip.conf`.

## 3. Agent SIP App

Install a SIP softphone on staff mobile/desktop:

- Zoiper
- Linphone
- MicroSIP

Register:

- SIP user: `1001`
- Password: `CHANGE_ME_STRONG_AGENT_PASSWORD`
- Domain/server: your DigitalOcean public IP or PBX domain
- Transport: UDP

## 4. CRM Backend Env

Add to `backend/.env`:

```env
ASTERISK_AMI_HOST=127.0.0.1
ASTERISK_AMI_PORT=5038
ASTERISK_AMI_USER=crmami
ASTERISK_AMI_SECRET=CHANGE_ME_STRONG_AMI_SECRET
ASTERISK_AMI_TIMEOUT_MS=10000
ASTERISK_ORIGINATE_CONTEXT=crm-outbound
ASTERISK_ORIGINATE_TIMEOUT_MS=30000
ASTERISK_CALLER_ID=CromGen CRM
```

Restart backend:

```bash
pm2 restart cromgen-crm
# or
npm start
```

## 5. CRM PBX API

Endpoint:

```http
POST /api/pbx/originate
Authorization: Bearer <CRM_TOKEN>
Content-Type: application/json
```

Body:

```json
{
  "agentExtension": "1001",
  "phone": "9876543210",
  "customer": "Test Customer",
  "record": false
}
```

Flow:

1. Asterisk calls agent extension `1001`.
2. Agent answers.
3. Asterisk dials customer through `edesy-trunk`.
4. CRM creates/updates the call as `On Call`.

`record` is false by default. When false, nothing is uploaded to Cloudinary and no Asterisk recording is started.

## 6. Production Security

- Use a PBX domain with DNS.
- Keep AMI private. Do not expose port `5038` to the public internet.
- Use strong SIP passwords.
- Use Fail2ban for SIP scanning.
- Allow SIP/RTP only from trusted networks if Edesy provides fixed IPs.
- Keep server time synced with NTP.
- Check local laws before enabling call recording.

## 7. Useful Asterisk Debug Commands

```bash
sudo asterisk -rvvv
pjsip set logger on
core set verbose 5
core set debug 3
pjsip show endpoint 1001
pjsip show endpoint edesy-trunk
```

## References

- Asterisk documentation: https://docs.asterisk.org/
- Asterisk AMI: https://docs.asterisk.org/Configuration/Interfaces/Asterisk-Manager-Interface-AMI/
- Asterisk PJSIP: https://docs.asterisk.org/Configuration/Channel-Drivers/SIP/Configuring-res_pjsip/
- Asterisk MixMonitor: https://docs.asterisk.org/Asterisk_22_Documentation/API_Documentation/Dialplan_Applications/MixMonitor/
