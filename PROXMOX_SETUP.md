# 🖥️ Proxmox VE Üzerinde Kurulum ve GitHub ile Otomatik Güncelleme Rehberi

Bu rehber, **YapayZekaÇalışan** platformunu Proxmox VE üzerinde çalışan bir KVM VM (Ubuntu Server 24.04 veya Debian 12) üzerinde sıfırdan kurmayı ve **GitHub (`git@github.com:TunaYmc/aiworkgroup.git`)** üzerinden tek komutla veya otomatik cron ile güncellemeyi anlatır.

---

## 📌 Mimari Tercih: VM mi, LXC mi?

- **KVM Sanal Makine (VM - Ubuntu Server 24.04 LTS / Debian 12) 👉 (Tavsiye Edilen):**  
  Docker, PostgreSQL pgvector ve Celery gibi servisler için tam çekirdek izolasyonu, sorunsuz depolama sürücüleri (`overlay2`) ve tek tıkla snapshot alma kolaylığı sunar.
- **LXC Konteyner:**  
  Daha az RAM tüketir ancak Docker'ın çalışabilmesi için Proxmox tarafında *Nesting* ve *Keyctl* (`features: nesting=1,keyctl=1`) yetkilerinin verilmesi gerekir.

---

## Adım 1: Proxmox Web Panelinde Sanal Makineyi (VM) Oluşturun

1. Proxmox web arayüzüne (`https://<PROXMOX_IP>:8006`) giriş yapın.
2. Sağ üstteki **"Create VM"** butonuna tıklayın:
   - **General:** VM ID (örn. `105`), Name: `aiworkgroup`
   - **OS:** Ubuntu Server 24.04 ISO dosyasını seçin.
   - **System:** `Qemu Agent` kutucuğunu işaretleyin.
   - **Disks:** `scsi0`, Boyut: **40 GB - 50 GB** (SSD/NVMe storage), Discard açık.
   - **CPU:** **4 Cores** (Minimum 2 Core, Type: `host`).
   - **Memory:** **8192 MB (8 GB)** (Minimum 4 GB).
   - **Network:** `VirtIO`, Bridge: `vmbr0`.
3. VM'i başlatın ve Ubuntu kurulumunu tamamlayın. VM yerel IP adresini not edin (Örn: `192.168.1.150`).

---

## Adım 2: VM İçinde Docker ve Araçları Kurun

VM'e SSH ile bağlanın (`ssh kullanici@192.168.1.150`):

```bash
# 1. Sistemi güncelleyin
sudo apt update && sudo apt upgrade -y

# 2. Temel araçları yükleyin
sudo apt install -y curl git ufw htop qemu-guest-agent

# 3. Resmi Docker Engine ve Docker Compose eklentisini kurun
curl -fsSL https://get.docker.com | sh

# 4. Kullanıcınızı docker grubuna ekleyin
sudo usermod -aG docker $USER

# 5. Qemu agent'ı başlatın
sudo systemctl enable --now qemu-guest-agent

# 6. Oturumu yenileyin
newgrp docker
```

---

## Adım 3: Projeyi GitHub'dan İndirin ve Otomatik Güncellemeyi Yapılandırın (YENİLENDİ)

Artık dosyaları manuel SCP/rsync ile kopyalamak yerine doğrudan GitHub reponuzdan (`git@github.com:TunaYmc/aiworkgroup.git`) çekiyoruz.

### 3.1. SSH Anahtarını GitHub'a Tanımlayın (veya HTTPS Kullanın)
Eğer SSH ile çekecekseniz:
```bash
ssh-keygen -t ed25519 -C "proxmox-server" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
```
Çıkan genel anahtarı GitHub hesabınıza (**Settings -> SSH and GPG keys**) ekleyin.

*(Alternatif olarak HTTPS ile klonlamak isterseniz: `git clone https://github.com/TunaYmc/aiworkgroup.git /opt/yapayzekacalisan`)*

### 3.2. Projeyi Klonlayın
```bash
sudo mkdir -p /opt/yapayzekacalisan
sudo chown -R $USER:$USER /opt/yapayzekacalisan
git clone git@github.com:TunaYmc/aiworkgroup.git /opt/yapayzekacalisan
cd /opt/yapayzekacalisan
```

### 3.3. GitHub'dan Otomatik Güncelleme Scripti (`update.sh`)
Projeyi GitHub'a her yeni commit attığınızda Proxmox üzerinde tek komutla veya zamanlanmış görevle güncellemek için hazırlanmış betiği çalıştırılabilir yapın:

```bash
chmod +x /opt/yapayzekacalisan/scripts/update.sh
```

Bu script sırasıyla:
1. `git pull origin main` ile son kodları çeker.
2. Değişen Docker imajlarını derler (`docker compose build`).
3. Konteynerleri sıfır kesintiyle yeniden başlatır (`docker compose up -d`).
4. Yeni veritabanı migration'larını uygular (`alembic upgrade head`).
5. Kullanılmayan eski imajları temizler (`docker image prune -f`).

### 3.4. (İsteğe Bağlı) Otomatik Güncelleme Cron Job'ı
Sunucunun her gece saat 04:00'te veya her saat başı GitHub'ı kontrol edip kendini otomatik güncellemesi için:

```bash
crontab -e
```
Dosyanın sonuna ekleyin:
```bash
# Her gece 04:00'te GitHub'dan güncellemeleri çek ve yeniden başlat
0 4 * * * /opt/yapayzekacalisan/scripts/update.sh >> /var/log/aiworkgroup_update.log 2>&1
```

---

## Adım 4: Ortam Değişkenlerini (.env) Yapılandırın

```bash
cd /opt/yapayzekacalisan
cp .env.example .env
nano .env
```

Aşağıdaki satırları Proxmox VM'inizin IP adresine göre güncelleyin:

```bash
PUBLIC_APP_URL=http://192.168.1.150:3000
NEXT_PUBLIC_API_URL=http://192.168.1.150:8000/api/v1
OPENROUTER_API_KEY=your_openrouter_api_key_here
JWT_SECRET=super-secret-jwt-signing-key-replace-in-prod-minimum-32-chars
```

---

## Adım 5: Sistemi Başlatın

```bash
cd /opt/yapayzekacalisan
docker compose up -d --build
```

---

## Adım 6: Migration ve Seed Verilerini Yükleyin

```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m app.scripts.seed
```

Doğrulayın:
```bash
curl http://localhost:8000/api/v1/ready
```

---

## Adım 7: Erişim ve Test

- **Web Dashboard:** `http://192.168.1.150:3000` (veya Caddy üzerinden `http://192.168.1.150`)
- **Giriş:** `demo@acme.com` / `Demo12345!`
- **Admin:** `admin@platform.com` / `Admin12345!`
