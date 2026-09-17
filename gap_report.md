# 🔍 Production Gap Audit & Architecture Report (Phase 0)

> **Proje:** YapayZekaÇalışan — Multi-Tenant AI Employee B2B SaaS Platform  
> **Tarih:** 16 Eylül 2026  
> **Kapsam:** Mevcut kod tabanının production-grade gereksinimlerine göre derinlemesine gap ve sahte/mock implementasyon denetimi.

---

## 1. YÜRÜTME ÖZETİ VE GENEL DURUM

Mevcut repository iskelet seviyesinde derli toplu bir monorepo yapısına, doğru veri modellerine ve modern beyaz-mavi Next.js arayüzüne sahip olsa da, **kritik çalışma motorları ve üretim bileşenleri şu anda mock, hardcoded veya simülatiftir**.

### 🚨 Tespit Edilen Mock / Sahte / Placeholder Kodlar:
1. **`apps/api/app/runtime/openclaw.py` (Satır 85–133):**
   - Agent execution tamamen sahtedir. `asyncio.sleep()` ile hardcoded `"thought"`, hardcoded `"file_search"` aracı ve hardcoded `"Görev başarıyla işleme alındı..."` metni stream edilmektedir.
   - `docker-compose.yml` içindeki `openclaw` servisi gerçek bir runtime değil; `python -m http.server 8080` çalıştıran bir python konteyneridir.
2. **`apps/web/app/agents/[id]/page.tsx` (Satır 102–126):**
   - Frontend sohbet ekranı `/api/v1/agents/{id}/chat` endpoint'ine **hiç istek atmamaktadır**. Client tarafında `setTimeout(..., 600)` ile sahte araç aktivitesi ve sabit yanıt üretmektedir.
3. **`apps/api/app/services/ingestion.py` (Satır 30–33, 81–93):**
   - DOCX, XLSX ve PPTX dosyaları gerçek parser'lar yerine `file_bytes.decode('utf-8', errors='ignore')` ile okunmakta, ikili (binary) bozuk veri üretmektedir.
   - `KnowledgeChunk` modelindeki `embedding` sütunu her zaman `NULL` (`None`) olarak kaydedilmektedir; hiçbir embedding üretilmemektedir.
4. **`apps/api/app/services/openrouter.py` (Satır 99–106):**
   - Tool calling parametreleri (`tools`, `tool_choice`) bulunmamaktadır.
   - API anahtarı girilmediğinde model çıktısı yerine `[model] Merhaba! Şirket veritabanı...` şeklinde sabit mock metin dönmektedir.
5. **`apps/api/app/api/v1/health.py` (Satır 19–26):**
   - `/ready` endpoint'i PostgreSQL, Redis, MinIO ve OpenClaw servislerine ping atmadan doğrudan hardcoded `{"postgres": "ready", "redis": "ready", ...}` döndürmektedir.
6. **`apps/api/app/worker/tasks.py`:**
   - Celery worker görevi, mock `OpenClawRuntimeAdapter`'ı çağırdığı için arka planda gerçek bir görev yürütmemektedir.

---

## 2. DETAYLI GAP MATRİSİ

### [CRITICAL 1] Alembic Migration Dosyaları Eksik
- **Mevcut Durum:** `alembic` paketi `requirements.txt`'de var fakat `alembic.ini` veya `alembic/versions/` dizini yok. Veritabanı tabloları `main.py` içinde `Base.metadata.create_all()` ile ayağa kaldırılıyor.
- **İlgili Dosyalar:** `apps/api/app/main.py`, `apps/api/app/core/database.py`
- **Neden Eksik:** Erken prototiplemede `create_all` kolaylık sağladığı için migration sistemi kurulmadı.
- **Gerçek Production Etkisi:** Canlı ortamda tablo şemasında bir sütun değiştiğinde veya yeni tablo eklendiğinde `create_all` mevcut tabloları güncellemez. Canlı veritabanı şema versiyonlaması yapılamaz ve veri kaybı kaçınılmaz olur.
- **Önerilen Çözüm:** `apps/api` altında `alembic init -t async alembic` yapılandırılacak, `env.py` async SQLAlchemy engine ve `Base.metadata` ile bağlanacak, initial migration dosyası oluşturulacak.

---

### [CRITICAL 2] Admin Panel Eksik
- **Mevcut Durum:** Admin paneli backend veya frontend tarafında mevcut değil.
- **İlgili Dosyalar:** `apps/web/app/admin/`, `apps/api/app/api/v1/admin.py`
- **Neden Eksik:** MVP kapsamında kullanıcı tenant arayüzüne öncelik verildi.
- **Gerçek Production Etkisi:** Platform yöneticisi aktif tenant'ları, sistem kuyruklarını, başarısız worker görevlerini, LLM kota aşımlarını ve hata loglarını merkezi olarak izleyemez ve müdahale edemez.
- **Önerilen Çözüm:** Superuser yetkisine sahip kullanıcılar için `/api/v1/admin/overview`, `/api/v1/admin/organizations`, `/api/v1/admin/queues` endpoint'leri ve Next.js altında korumalı `/admin` kontrol paneli inşa edilecek.

---

### [CRITICAL 3] Password Reset + Email Verification Eksik
- **Mevcut Durum:** `apps/api/app/api/v1/auth.py` içinde yalnızca `/register` ve `/login` mevcuttur. `/forgot-password`, `/reset-password`, `/verify-email` endpoint'leri yoktur.
- **İlgili Dosyalar:** `apps/api/app/api/v1/auth.py`, `apps/api/app/models/tenant.py`
- **Neden Eksik:** Temel JWT akışı kurulup şifre kurtarma ertelendi.
- **Gerçek Production Etkisi:** Şifresini unutan kurumsal kullanıcılar hesaplarına tekrar erişemez. Sahte e-postalarla kontrolsüz organizasyon açılabilir.
- **Önerilen Çözüm:** Güvenli süreli token üreten şifre sıfırlama ve e-posta doğrulama token mekanizması (SMTP/Resend entegrasyonu hazır adaptörle) eklenecek.

---

### [CRITICAL 4] Frontend Login / Register / Auth Pages Eksik
- **Mevcut Durum:** Next.js tarafında `/login` veya `/register` sayfaları bulunmamaktadır. Dashboard doğrudan herkese açık durumdadır; token kontrolü yapan Next.js middleware yoktur.
- **İlgili Dosyalar:** `apps/web/app/login/page.tsx`, `apps/web/app/register/page.tsx`, `apps/web/middleware.ts`
- **Neden Eksik:** Doğrudan dashboard UI prototipine başlandı.
- **Gerçek Production Etkisi:** Herhangi bir ziyaretçi doğrudan şirketin AI personellerini ve dosyalarını görebilir. SaaS çok kiracılı güvenlik modeli frontend seviyesinde çöker.
- **Önerilen Çözüm:** Kurumsal beyaz-mavi temaya uygun `/login` ve `/register` sayfaları yapılacak; `middleware.ts` ile yetkisiz kullanıcılar login ekranına yönlendirilecek.

---

### [CRITICAL 5] Playwright Browser Automation Eksik
- **Mevcut Durum:** Agent'ın araç izinleri arasında `"browser"` adı geçmektedir ancak backend'de Playwright bağımlılığı, browser oturum yöneticisi veya izole Chromium servisi yoktur.
- **İlgili Dosyalar:** `apps/api/app/runtime/openclaw.py`, `apps/api/requirements.txt`
- **Neden Eksik:** Web tarayıcı otomasyonu için headless container kurulumu gerektirdiğinden iskelette bırakıldı.
- **Gerçek Production Etkisi:** Şirket personeline verilen web araştırma, form doldurma veya sayfa ekran görüntüsü alma görevleri başarısız olur veya hiç çalışmaz.
- **Önerilen Çözüm:** `BrowserService` (Playwright async tabanlı, tenant/agent bazında izole profil ve screenshot/navigation yetenekli) inşa edilecek.

---

### [CRITICAL 6] MCP (Model Context Protocol) & Integration Mimarisi Eksik
- **Mevcut Durum:** Slack, Google Drive, Gmail, CRM entegrasyonları için herhangi bir veri modeli (`Integration`, `IntegrationCredential`), API endpoint'i veya MCP client adaptörü bulunmamaktadır.
- **İlgili Dosyalar:** `apps/api/app/models/integration.py` (eksik), `apps/api/app/services/mcp.py` (eksik)
- **Neden Eksik:** İç araçlara (dosya ve python) odaklanıldı.
- **Gerçek Production Etkisi:** AI çalışanlar dış kurumsal sistemlere bağlanamaz ve modern MCP standardındaki araç sunucularını kullanamaz.
- **Önerilen Çözüm:** `Integration`, `IntegrationCredential` (AES-256 şifreli secret saklama), `AgentIntegrationPermission` modelleri ve MCP JSON-RPC istemci mimarisi eklenecek.

---

### [PARTIAL 1] OpenClaw Integration Mock/Placeholder Durumunda
- **Mevcut Durum:** `apps/api/app/runtime/openclaw.py` içinde gerçek bir OpenClaw Gateway iletişimi yoktur. `docker-compose.yml`'de python http server çalıştırılmaktadır. Kod içinde `asyncio.sleep` ile sabit metin üretilmektedir.
- **İlgili Dosyalar:** `apps/api/app/runtime/openclaw.py`, `docker-compose.yml`
- **Neden Eksik:** Hızlı demo/geliştirme aşamasında mock yapıldı.
- **Gerçek Production Etkisi:** Agent aslında hiçbir sandbox çalıştırmamakta, bilgisayar kullanmamakta ve kod çalıştırmamaktadır.
- **Önerilen Çözüm:** `AgentRuntime` arayüzü korunarak gerçek OpenClaw Gateway WebSocket / REST RPC protokolü uygulanacak.

---

### [PARTIAL 2] pgvector Embedding Alanı Var Ancak Embedding Üretimi Yok
- **Mevcut Durum:** `KnowledgeChunk.embedding` alanı `Vector(1536)` olarak tanımlı fakat dosya yükleme anında hiçbir embedding üretilmemektedir (`embedding=None`). Arama işlemi anlamsal (cosine similarity) değil, rastgele ilk 5 kaydı çekmektedir.
- **İlgili Dosyalar:** `apps/api/app/services/ingestion.py`, `apps/api/app/services/context_builder.py`
- **Neden Eksik:** Embedding servisi (OpenRouter/OpenAI embedding veya lokal model) bağlanmadı.
- **Gerçek Production Etkisi:** RAG (Retrieval-Augmented Generation) işlevsizdir; şirket dökümanları agent'a doğru şekilde beslenemez.
- **Önerilen Çözüm:** `EmbeddingService` soyutlaması oluşturulacak (OpenRouter/OpenAI `text-embedding-3-small` veya lokal model destekli) ve `KnowledgeChunk.embedding` populate edilerek cosine similarity (`<=>`) sorguları çalıştırılacak.

---

### [PARTIAL 3] XLSX ve PPTX Gerçek Parser Kullanmıyor
- **Mevcut Durum:** `ingestion.py` dosyası PDF için `pypdf` kullanırken; DOCX, XLSX ve PPTX için binary dosyayı doğrudan UTF-8 text gibi okumaya çalışmakta ve bozuk içerik üretmektedir.
- **İlgili Dosyalar:** `apps/api/app/services/ingestion.py`
- **Neden Eksik:** Ayrı dosya ayrıştırma stratejileri yazılmadı.
- **Gerçek Production Etkisi:** Excel tabloları, Word sözleşmeleri ve PowerPoint sunumları okunamaz hale gelir, RAG veritabanına anlamsız karakter dizileri kaydedilir.
- **Önerilen Çözüm:** `python-docx` ile paragraf/tablo çıkarıcı, `openpyxl` ile sheet/row/cell/header formatını koruyan tablo çıkarıcı ve `python-pptx` ile slayt/not çıkarıcı strateji mimarisi uygulanacak.

---

### [PARTIAL 4] OpenRouter Tool Calling Loop Eksik
- **Mevcut Durum:** `OpenRouterService` sadece düz mesaj dizisini LLM'e gönderip text chunk'larını almaktadır. Modelin `tool_calls` çıktısı ayrıştırılmamakta, backend izin denetimi sonrası tool çalıştırılıp model tekrar beslenmemektedir.
- **İlgili Dosyalar:** `apps/api/app/services/openrouter.py`, `apps/api/app/runtime/openclaw.py`
- **Neden Eksik:** Döngüsel tool-calling state machine'i kurulmadı.
- **Gerçek Production Etkisi:** Model dosya arama, python kodu çalıştırma veya web araması yapamaz; sadece doğrudan ezberden yanıt üretir.
- **Önerilen Çözüm:** Tam teşekküllü `ToolOrchestrator` ve LLM Tool Loop mimarisi kurulacak.

---

### [PARTIAL 5] Rate Limiting Eksik
- **Mevcut Durum:** API endpoint'lerinde herhangi bir rate limit uygulanmamaktadır.
- **İlgili Dosyalar:** `apps/api/app/main.py`
- **Neden Eksik:** Temel akışlar test edilirken hız kısıtları konulmadı.
- **Gerçek Production Etkisi:** Kötü niyetli kullanıcılar veya sonsuz döngüye giren scriptler API'yi ve OpenRouter bütçesini tüketebilir (DoS riski).
- **Önerilen Çözüm:** Redis tabanlı sliding window rate limiter (`slowapi` veya custom redis token-bucket) entegre edilecek.

---

### [PARTIAL 6] Prometheus /metrics Eksik
- **Mevcut Durum:** `prometheus-client` kütüphanesi yüklü olmasına rağmen `/metrics` endpoint'i ve sayaç/histogram tanımları yoktur.
- **İlgili Dosyalar:** `apps/api/app/api/v1/health.py`, `apps/api/app/main.py`
- **Neden Eksik:** Yalnızca temel `/health` oluşturuldu.
- **Gerçek Production Etkisi:** Grafana veya Prometheus ile request latency, task duration ve hata oranları izlenemez.
- **Önerilen Çözüm:** Prometheus middleware ve `/metrics` endpoint'i aktif edilecek.

---

### [PARTIAL 7] Context Compaction Tetikleyicisi Eksik
- **Mevcut Durum:** `AgentContextSnapshot` modeli mevcuttur ancak sohbet büyüdüğünde token sınırını denetleyip otomatik özet çıkaran ve snapshot oluşturan arka plan mekanizması yoktur.
- **İlgili Dosyalar:** `apps/api/app/services/context_builder.py`
- **Neden Eksik:** Sohbet geçmişi büyüklüğü başlangıçta sınırlı tutuldu.
- **Gerçek Production Etkisi:** Uzun süren görevlerde token bütçesi aşılır, API maliyeti katlanır veya LLM context length hatası verir.
- **Önerilen Çözüm:** Token sayımı yapan ve eşik aşıldığında LLM ile özet çıkarıp eski mesajları sıkıştıran `ContextCompactor` servisi eklenecek.

---

### [PARTIAL 8] Artifact Streaming Event Eksik
- **Mevcut Durum:** Görev çalışırken üretilen dosyalar için SSE (Server-Sent Events) akışında `"artifact"` event tipi backend ve frontend'de eksiktir.
- **İlgili Dosyalar:** `apps/api/app/runtime/openclaw.py`, `apps/web/app/agents/[id]/page.tsx`
- **Neden Eksik:** Yalnızca text chunk'ları aktarıldı.
- **Gerçek Production Etkisi:** Agent bir PDF veya Excel oluşturduğunda kullanıcı bunu anlık bildirim olarak göremez, yalnızca görev bittikten sonra fark edebilir.
- **Önerilen Çözüm:** Runtime ve chat endpoint'ine `"artifact"` event'i eklenecek; frontend'de anlık indirme kartı render edilecek.

---

### [PARTIAL 9] Seed Data ve Dev Scriptleri Eksik
- **Mevcut Durum:** İlk kurulumda test amaçlı varsayılan organizasyon, kullanıcı, örnek agent ve dökümanlar oluşturan bir seed betiği yoktur.
- **İlgili Dosyalar:** `apps/api/scripts/seed.py` (eksik)
- **Neden Eksik:** Manuel UI üzerinden oluşturulması hedeflendi.
- **Gerçek Production Etkisi:** Yeni geliştirici veya test ortamı kurulduğunda manuel form doldurma zorunluluğu doğar, CI/CD otomasyonu zorlaşır.
- **Önerilen Çözüm:** `python -m app.scripts.seed` komutu ile çalışan zengin örnek veri scripti eklenecek.

---

### [PARTIAL 10] Caddy Reverse Proxy Compose'a Eklenmemiş
- **Mevcut Durum:** `docker-compose.yml` içinde Caddy veya Traefik servisi yoktur. Frontend (3000) ve backend (8000) doğrudan host portlarına bind edilmiştir.
- **İlgili Dosyalar:** `docker-compose.yml`, `infrastructure/docker/Caddyfile`
- **Neden Eksik:** Geliştirme ortamında port çakışmalarını önlemek için sade tutuldu.
- **Gerçek Production Etkisi:** Otomatik SSL/TLS sonlandırma, gzip sıkıştırma ve tek domain altında routing (`/` -> web, `/api` -> api) sağlanamaz.
- **Önerilen Çözüm:** HTTPS destekli Caddy servisi ve `Caddyfile` docker-compose'a entegre edilecek.

---

## 3. UYGULAMA YOL HARİTASI (P0 -> P1 -> P2)

```
[FAZ 0] Codebase Audit & Gap Raporu (Tamamlandı)
   ↓
[FAZ 1 - P0] Gerçek OpenClaw Runtime Adapter & Gateway Entegrasyonu
   ↓
[FAZ 2 - P0] Sıkı Multi-Tenant İzolasyonu & Sandbox Güvenlik Testleri
   ↓
[FAZ 3 - P0] Gerçek Tool Execution Loop (file, python, web, sandbox)
   ↓
[FAZ 4 - P0] Gerçek RAG & pgvector Cosine Similarity Pipeline
   ↓
[FAZ 5 - P0] Çoklu Format Dosya Ayrıştırma (PDF, DOCX, XLSX, PPTX, CSV)
   ↓
[FAZ 6 - P1] Context Compaction & Token Budget Yönetimi
   ↓
[FAZ 7 - P1] Playwright İzole Browser Servisi
   ↓
[FAZ 8 - P1] Tam SaaS Kimlik Doğrulama (Auth Sayfaları, Şifre Sıfırlama)
   ↓
[FAZ 9 - P1] Alembic Migration Sistemi (Initial Migration & Upgrade)
   ↓
[FAZ 10 - P1] Redis Tabanlı Rate Limiting
   ↓
[FAZ 11 - P1] Prometheus /metrics & Structured Correlation Logging
   ↓
[FAZ 12 - P2] Platform Admin Paneli
   ↓
[FAZ 13 - P2] MCP (Model Context Protocol) & Entegrasyon Katmanı
   ↓
[FAZ 14 - P2] Caddy Reverse Proxy & Production Docker Compose
   ↓
[FAZ 15 - P2] Kapsamlı Otomatik Test Paketi & Doğrulama
```
