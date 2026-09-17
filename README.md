# 🚀 YapayZekaÇalışan — Multi-Tenant AI Employee B2B SaaS Platform

Şirketlerin web sitesi üzerinden kayıt olup kendi organizasyonlarını oluşturduğu, yapay zekâ çalışanları (AI Employees) tanımladığı, şirket dökümanlarını yükleyip RAG ile sorgulattığı ve agent'ların izole sandbox ortamlarında bağımsız görevler yürüttüğü kurumsal multi-tenant B2B SaaS platformu.

---

## 🎨 Tasarım ve Arayüz Dili

Web arayüzü **sade, son derece modern, profesyonel beyaz ve açık mavi temalı** olarak tasarlanmıştır:
- **Renk Paleti:** Saf beyaz zemin (`#FFFFFF`), açık slate panel dokuları (`#F8FAFC`, `#F1F5F9`), gökyüzü / açık mavi kurumsal vurgular (`#0EA5E9`, `#0284C7`, `#E0F2FE`, `#F0F9FF`).
- **Kurumsal Hiyerarşi:** Net tipografi, zarif kart gölgeleri, gerçek zamanlı SSE düşünce/araç akışları ve tenant durum rozetleri.

---

## 🏛️ Mimari (Architecture)

```
Frontend (Next.js 15, React 19, Tailwind CSS - Beyaz & Açık Mavi Tema)
    ↓ (HTTP / SSE / WebSocket)
Caddy Reverse Proxy (:80 / :443)  ←→  Unified Gateway (SSL, Gzip, Header koruması)
    ↓
Platform REST API (FastAPI, Python 3.11, Pydantic v2)
    ↓
Agent Orchestrator & ContextBuilder (Semantic RAG, Memory, Snapshot)
    ↓
AgentRuntime Abstraction Interface
    ↓
OpenClawRuntimeAdapter
    ↓
OpenClaw Gateway (:8080)
    ↓
Tools & Sandboxes (Path Traversal Korumalı Dosya Sistemi, Python, Web)
    ↓
OpenRouter Gateway (Claude 3.7 Sonnet, GPT-4o, Gemini 2.0, DeepSeek R1)
    ↓
Storage & Databases:
  - PostgreSQL 16 + pgvector (Multi-Tenant RLS & 1536-dim embeddings)
  - Redis 7 (Celery Asenkron Görev Kuyruğu & Cache)
  - MinIO (S3 Uyumlu Döküman ve Artifact Depolama)
```

---

## 📋 1. Sistemi Çalıştırmak İçin Gerekenler

- **Docker:** Sürüm 24.0+ (Docker Desktop veya Linux Docker Engine)
- **Docker Compose:** Sürüm 2.20+
- **Donanım:** Minimum 4 GB RAM, 2 CPU çekirdeği, 10 GB boş disk alanı
- **Portlar:** Host makinede şu portların boş olması gerekir:
  - `80`, `443` (Caddy Reverse Proxy)
  - `3000` (Next.js Web Frontend)
  - `8000` (FastAPI Backend API)
  - `5432` (PostgreSQL + pgvector)
  - `6379` (Redis)
  - `8080` (OpenClaw Gateway)
  - `9000`, `9001` (MinIO S3 API & Web Console)

---

## ⚡ 2. Çalıştırma Komutları (Sıfırdan Adım Adım)

### Adım 1: Projeyi GitHub'dan Çekin
```bash
git clone git@github.com:TunaYmc/aiworkgroup.git /opt/yapayzekacalisan
cd /opt/yapayzekacalisan
```
*(veya HTTPS ile: `git clone https://github.com/TunaYmc/aiworkgroup.git /opt/yapayzekacalisan`)*

### Adım 2: Ortam Dosyasını Hazırlayın
Proje ana dizinindeyken `.env.example` dosyasını `.env` olarak kopyalayın:
```bash
cp .env.example .env
```
*(İsteğe bağlı)* `.env` içindeki `OPENROUTER_API_KEY` alanına gerçek OpenRouter anahtarınızı girebilirsiniz. Anahtar girilmezse sistem yerel deterministik test modunda çalışır.

### Adım 3: Tüm Docker Servislerini Başlatın
```bash
docker compose up -d
```
Tüm 7 servis (`web`, `api`, `worker`, `postgres`, `redis`, `minio`, `openclaw`, `caddy`) arka planda ayağa kalkacaktır.

### Adım 4: Veritabanı Migration'larını ve Seed Verilerini Yükleyin
Veritabanı tablolarını ve başlangıç verilerini oluşturun:
```bash
docker compose exec api alembic upgrade head
docker compose exec api python -m app.scripts.seed
```

### Adım 5: Servis Sağlığını Doğrulayın
```bash
curl http://localhost:8000/api/v1/ready
```

---

## 🔄 GitHub Üzerinden Tek Komutla Otomatik Güncelleme

Projeye GitHub üzerinden yeni bir güncelleme gönderildiğinde sunucunuzda tek komutla tüm sistemi güncellemek için:

```bash
chmod +x scripts/update.sh
./scripts/update.sh
```

Bu script sırasıyla:
1. `git pull origin main` ile son kodları çeker.
2. Değişen Docker imajlarını yeniden derler (`docker compose build`).
3. Konteynerleri kesintisiz günceller (`docker compose up -d`).
4. Yeni veritabanı migration'larını uygular (`alembic upgrade head`).
5. Eski imajları temizler (`docker image prune -f`).
*(Detaylı Proxmox cron kurulumu için [PROXMOX_SETUP.md](PROXMOX_SETUP.md) dosyasına bakabilirsiniz).*


---

## 🌐 3. Açılması Gereken URL'ler ve Varsayılan Giriş Bilgileri

| Servis | URL | Açıklama |
|---|---|---|
| **Ana Web Uygulaması (Caddy)** | [http://localhost](http://localhost) | Caddy üzerinden birleşik frontend & API erişimi |
| **Doğrudan Web Arayüzü** | [http://localhost:3000](http://localhost:3000) | Next.js 15 Web Dashboard |
| **Giriş / Login Sayfası** | [http://localhost:3000/login](http://localhost:3000/login) | Kullanıcı kimlik doğrulama |
| **Şirket Kayıt Sayfası** | [http://localhost:3000/register](http://localhost:3000/register) | Yeni tenant açılışı |
| **Süper Yönetici Paneli** | [http://localhost:3000/admin](http://localhost:3000/admin) | Platform geneli izleme ve yönetim |
| **Backend API & Swagger** | [http://localhost:8000/docs](http://localhost:8000/docs) | OpenAPI interaktif dokümantasyon |
| **Prometheus Metrikleri** | [http://localhost:8000/metrics](http://localhost:8000/metrics) | Prometheus formatında metrikler |
| **MinIO S3 Konsolu** | [http://localhost:9001](http://localhost:9001) | S3 dosya depolama yönetimi |
| **OpenClaw Gateway API** | [http://localhost:8080/health](http://localhost:8080/health) | Agent runtime harness sağlık kontrolü |

### 🔑 Varsayılan Giriş Hesapları (Seed Sonrası):
1. **Platform Süper Yönetici (Admin):**
   - E-posta: `admin@platform.com`
   - Şifre: `Admin12345!`
2. **Demo Kurumsal Kullanıcı:**
   - E-posta: `demo@acme.com`
   - Şifre: `Demo12345!`
   - Şirket: `Tuna Dijital A.Ş.`
3. **MinIO S3 Konsolu:**
   - Kullanıcı: `minioadmin`
   - Şifre: `minioadmin`

---

## 🔧 4. Gerekli `.env` Değişkenleri

| Değişken | Varsayılan Değer | Açıklama |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@postgres:5432/yapayzekacalisan` | PostgreSQL async bağlantı adresi |
| `REDIS_URL` | `redis://redis:6379/0` | Celery ve kuyruk Redis bağlantısı |
| `S3_ENDPOINT` | `http://minio:9000` | S3 / MinIO depolama adresi |
| `S3_ACCESS_KEY` | `minioadmin` | S3 erişim anahtarı |
| `S3_SECRET_KEY` | `minioadmin` | S3 gizli anahtarı |
| `S3_BUCKET_NAME` | `tenants` | Döküman ve artifact bucket adı |
| `OPENROUTER_API_KEY` | `your_openrouter_api_key_here` | Gerçek LLM çağrıları için OpenRouter anahtarı |
| `DEFAULT_LLM_MODEL` | `anthropic/claude-3.7-sonnet` | Varsayılan inference modeli |
| `OPENCLAW_GATEWAY_URL`| `http://openclaw:8080` | OpenClaw runtime harness bağlantı adresi |
| `JWT_SECRET` | `super-secret-jwt-signing-key-...` | JWT imzalama anahtarı (32+ karakter) |
| `NEXT_PUBLIC_API_URL`| `http://localhost:8000/api/v1` | Frontend'in API ile konuşma adresi |

---

## 👤 5. Manuel Olarak Sizin Yapmanız Gerekenler

1. **Docker Servislerini Başlatmak:** Yukarıdaki Adım 2 komutunu (`docker compose up -d`) terminalinizde çalıştırmak.
2. **Migration ve Seed Çalıştırmak:** Adım 3 ve 4'teki `alembic upgrade head` ve `seed.py` komutlarını çalıştırmak.
3. **OpenRouter API Anahtarınızı Girmek:** Gerçek Claude 3.7 veya GPT-4o ile konuşmak istiyorsanız `.env` dosyasındaki `OPENROUTER_API_KEY` alanına kendi anahtarınızı ekleyip backend'i yeniden başlatmak (`docker compose restart api worker openclaw`).
4. **Tarayıcıda Açmak:** [http://localhost:3000/login](http://localhost:3000/login) adresine gidip `demo@acme.com` / `Demo12345!` ile giriş yapmak.

---

## ⚠️ 6. Şu Anda Çalışmayan, Eksik Olan veya Harici Kurulum Gerektiren Şeyler

Mevcut aşamada dürüstçe raporlanan teknik sınırlar ve henüz entegre edilmemiş alanlar:

1. **Resmi OpenClaw Daemonic Kurulumu:**  
   Projede şu anda OpenClaw Gateway API standartlarına (`/v1/agents`, `/v1/sessions`, `/v1/sessions/{id}/stream`, `/v1/sessions/{id}/cancel`) tam uyumlu bağımsız Python microservice çalışmaktadır. Ancak resmi OpenClaw Node.js/Rust daemon'ının kendisi özel bir binary gerektirdiği takdirde harici bir makineye kurulup `.env` içindeki `OPENCLAW_GATEWAY_URL` adresi o sunucuya yönlendirilmelidir.
2. **Playwright Headless Tarayıcı Konteyneri:**  
   `browser` aracı şema ve izin kontrolünde tanımlıdır ancak Docker Compose içinde ayrı bir Playwright Chromium container servisi henüz eklenmemiştir. Web araştırmaları şu an `web_search` aracı ile yapılmaktadır.
3. **Gerçek E-posta Gönderimi (SMTP/Resend):**  
   Şifre sıfırlama ve e-posta doğrulama için hazır token modelleri bulunmakla birlikte, giden e-postalar için harici SMTP/Resend API anahtarı girilmediği sürece e-postalar gerçek gelen kutusuna gitmez.
4. **Harici MCP (Model Context Protocol) Sunucuları:**  
   Google Drive, Slack veya CRM gibi dış MCP sunucularına bağlanmak için her bir üçüncü parti sağlayıcının OAuth kimlik doğrulaması manuel API bağlantısı gerektirir.
