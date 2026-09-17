# Differences: Master Plan vs. Implementation

> **Analiz Tarihi:** 16 Eylül 2026  
> Bu dosya, [Master Development Prompt](./AI%20Employee%20Multi-Tenant%20SaaS%20%E2%80%94%20Antigravity%20Master%20Development%20Prompt.md)'taki her bir gereksinim ile şu anki implementasyonun karşılaştırmalı analizini içermektedir.

---

## 📊 Özet Tablo

| Kategori | Plan Gereksinimler | Uygulanan | Eksik / Kısmi |
|---|---|---|---|
| Monorepo Yapısı | 6 ana dizin | 4 (apps, infrastructure, docs eksik, scripts eksik) | ⚠️ Kısmi |
| Backend Servisleri | FastAPI, Pydantic, SQLAlchemy, asyncpg | ✅ Tamamı | ✅ |
| Veritabanı | PostgreSQL + pgvector | ✅ Tamamı | ✅ |
| Queue | Redis + Celery | ✅ Tamamı | ✅ |
| Object Storage | S3 / MinIO | ✅ Tamamı | ✅ |
| Agent Runtime | OpenClaw adapter | ✅ Iskelet + mock | ⚠️ Gerçek OpenClaw bağlantısı yok |
| LLM Gateway | OpenRouter | ✅ Katalog + stream iskeleti | ⚠️ Tool calling eksik |
| Sandbox | Docker izolasyonu | ⚠️ Yalnızca dizin yönetimi | ❌ Container resource limits yok |
| Frontend Sayfalar | 9 sayfa | 8 sayfa (Logs sayfası yok) | ⚠️ Kısmi |
| Authentication | JWT, register, login, password reset, email verification | JWT + register + login | ❌ Password reset + email verification yok |
| Multi-Tenant Modeller | 19 entity | 17 entity | ❌ Integration, Notification eksik |
| RAG Pipeline | PDF, TXT, DOCX, XLSX, CSV, PPTX | PDF, TXT, DOCX, CSV | ❌ XLSX parser, PPTX parser eksik |
| Streaming | SSE event tipleri: thinking, tool_call, tool_result, artifact | thinking, tool_call, tool_result | ❌ artifact event tipi yok |
| Alembic Migration | Alembic ile versiyon yönetimi | ❌ Yok | ❌ Eksik |
| Browser Automation | Playwright + container | ❌ Yalnızca tool permission kaydı | ❌ Playwright entegrasyonu yok |
| Testing | 9 farklı test kategorisi | Tenant izolasyon + tool permission + model switching | ❌ API test, auth test, file auth test, task queue test eksik |
| Admin Panel | Organizasyonlar, kullanıcılar, sistem sağlığı | ❌ Hiç yok | ❌ Tamamen eksik |
| MCP Entegrasyon | Integration entity + MCP altyapısı | ❌ Yalnızca tools modeli | ❌ Eksik |

---

## 🔴 KRİTİK EKSİKLER (Planın zorunlu gereksinimleri ama implementasyonda bulunmayan)

### ❌ 1. Alembic Migration Sistemi (Plan Bölüm 37)
**Plan gereği:** `alembic upgrade head` komutu ile veritabanı migration'ları çalışabilmeli.  
**Mevcut durum:** `Base.metadata.create_all()` ile otomatik tablo oluşturuluyor ama migration dosyaları yok.  
**Eksik dosyalar:**
```
apps/api/alembic.ini
apps/api/alembic/env.py
apps/api/alembic/versions/
```
**Etki:** Production ortamında şema güncellemesi yapmak imkânsız. Veri kaybı riski yüksek.

---

### ❌ 2. Admin Panel (Plan Bölüm 33)
**Plan gereği:** Platform yöneticisi için organizasyonlar, aktif görevler, kuyruk durumu, token kullanımı, sistem sağlığı ve hatalar görülebilmeli.  
**Mevcut durum:** Hiç oluşturulmadı.  
**Eksik dosyalar:**
```
apps/web/app/admin/page.tsx
apps/web/app/admin/organizations/page.tsx
apps/web/app/admin/tasks/page.tsx
```

---

### ❌ 3. Şifre Sıfırlama ve E-posta Doğrulama (Plan Bölüm 6)
**Plan gereği:** Sign up, sign in, sign out, **password reset**, **email verification** desteklenmeli.  
**Mevcut durum:** Yalnızca register ve login endpoint'leri var. Sign out endpoint'i de yok.  
**Eksik dosyalar/endpoint'ler:**
```
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/verify-email
apps/web/app/login/page.tsx       # ← Frontend login sayfası da yok
apps/web/app/register/page.tsx    # ← Frontend register sayfası da yok
```
**Not:** Mevcut web arayüzü henüz kimlik doğrulama olmadan açılıyor. Gerçek bir SaaS platformu için authentication duvarı gerekli.

---

### ❌ 4. Browser Automation (Playwright) (Plan Bölüm 20)
**Plan gereği:** Playwright + izole browser/container yaklaşımı. Agent'ın `open_page`, `click`, `type`, `screenshot`, `navigate`, `extract` işlemlerini yapabilmesi.  
**Mevcut durum:** `browser` aracı tool_permissions listesinde tanımlı ama herhangi bir Playwright entegrasyonu veya browser servisi yok.  
**Eksik:**
- Docker Compose'da browser servisi tanımı yok
- `BrowserTool` implementasyonu yok
- `apps/api/app/services/browser.py` dosyası yok

---

### ❌ 5. Docker Sandbox Resource Limits (Plan Bölüm 14)
**Plan gereği:** CPU, RAM, disk, process count, execution timeout gibi resource limitleri configurable olmalı.  
**Mevcut durum:** `OpenClawRuntimeAdapter` içinde resource limits JSON formatında yazılıyor ama gerçek Docker API çağrısı yapılmıyor.  
**Eksik:**
- Docker SDK (`docker-py`) ile gerçek container başlatma
- Resource limit enforcement mekanizması

---

### ❌ 6. MCP Entegrasyon Altyapısı (Plan Bölüm 19)
**Plan gereği:** `Integration` entity üzerinden Google Drive, Slack, Gmail, Outlook, CRM, ERP gibi MCP bağlantıları yönetilebilmeli. Secret'lar plaintext tutulmamalı.  
**Mevcut durum:** `Integration` entity modeli hiç oluşturulmadı. Tool modeli var ama MCP bağlantı noktası yok.  
**Eksik dosyalar:**
```
apps/api/app/models/integration.py
apps/api/app/api/v1/integrations.py
apps/api/app/services/mcp.py
```

---

### ❌ 7. `Notification` Entity (Plan Bölüm 7)
**Plan gereği:** 19 entity arasında `Notification` belirtilmiş.  
**Mevcut durum:** Tanımlı değil.

---

## 🟠 KISMİ UYGULAMALAR (Iskelet var ancak eksik veya gerçek çalışma desteği yok)

### ⚠️ 8. OpenClaw Gerçek Entegrasyonu (Plan Bölüm 13)
**Plan gereği:** OpenClaw'ın multi-agent özelliği kullanılmalı, Docker backend ile sandbox policy oluşturulmalı.  
**Mevcut durum:** `OpenClawRuntimeAdapter` mevcut ama HTTP gateway çağrısı deneme/fallback mekanizmasıyla geçiştiriliyor. `docker-compose.yml`'deki `openclaw` servisi `python -m http.server 8080` ile placeholder olarak çalışıyor — gerçek OpenClaw imajı değil.  
**Aksiyon gerekli:** Gerçek OpenClaw Docker imajı belirlenmeli ve `docker-compose.yml` güncellenmeli.

---

### ⚠️ 9. OpenRouter Tool Calling (Plan Bölüm 11)
**Plan gereği:** OpenRouter üzerinden tool calling desteklenmeli.  
**Mevcut durum:** `OpenRouterService.chat_completion_stream()` yalnızca text streaming yapıyor. OpenRouter'ın `tools` parametresi ile gerçek tool calling akışı yok.  
**Eksik:** `tools` / `tool_choice` parametrelerinin OpenRouter API isteğine eklenmesi.

---

### ⚠️ 10. Monorepo Dizin Yapısı (Plan Bölüm 4)
**Plan gereği:**
```
/apps  /services  /packages  /infrastructure  /docs  /scripts  .agent
```
**Mevcut durum:**
```
/apps  /infrastructure  (+ docker-compose.yml, .env.example, README.md)
```
**Eksik dizinler:**
- `/services` → `agent-runtime` ve `worker` servisleri `apps/api` içinde, ayrı servis değil
- `/packages/shared` → Frontend-backend ortak tip tanımları yok
- `/docs` → API ve mimari dökümanı yok
- `/scripts` → Development helper scriptleri yok
- `.agent` dizini yok

---

### ⚠️ 11. XLSX ve PPTX Döküman Ayrıştırıcı (Plan Bölüm 16)
**Plan gereği:** PDF, TXT, DOCX, XLSX, CSV, PPTX desteklenmeli.  
**Mevcut durum:** `ingestion.py` içinde PDF (pypdf), TXT, CSV, DOCX (basit decode) destekli ama:
- XLSX için `openpyxl` dependency var ama `extract_text()` içinde XLSX/PPTX branch yokta basit UTF-8 decode'a düşüyor
- PPTX ayrıştırıcı hiç yok
- DOCX için `python-docx` dependency var ama kullanılmıyor (yalnızca UTF-8 decode)

---

### ⚠️ 12. Pgvector Anlamsal Arama (Plan Bölüm 17)
**Plan gereği:** RAG chunk'ları vector embedding ile saklanmalı ve anlamsal similarity search yapılabilmeli.  
**Mevcut durum:** `KnowledgeChunk` modeli `Vector(1536)` alanına sahip ama:
- Embedding oluşturan servis yok (embedding sütunu hiçbir zaman doldurulmuyor)
- Anlamsal similarity sorgusunu yapan `knowledge_search` endpoint'i yok
- `ContextBuilder.build_context()` içindeki RAG sorgusu semantik değil, sadece ilk 5 chunk'ı getiriyor

---

### ⚠️ 13. Context Compaction (Plan Bölüm 25)
**Plan gereği:** Konuşma büyüdüğünde otomatik context compaction yapılmalı; summary database'e kaydedilmeli, context snapshot oluşturulmalı.  
**Mevcut durum:** `AgentContextSnapshot` modeli var. `ContextBuilder` snapshot'ı okuyor ama **snapshot oluşturma ve compaction tetikleme mekanizması** yok.

---

### ⚠️ 14. Rate Limiting (Plan Bölüm 32)
**Plan gereği:** IP, kullanıcı, organizasyon, agent ve endpoint seviyesinde rate limiting.  
**Mevcut durum:** Hiçbir rate limiting middleware tanımlı değil.

---

### ⚠️ 15. Prometheus Metrics Endpoint'i (Plan Bölüm 34 & 45)
**Plan gereği:** `/metrics` endpoint'i ile Prometheus metrikleri sunulmalı.  
**Mevcut durum:** `/health` ve `/ready` endpoint'leri var ama `/metrics` endpoint'i yok. `prometheus-client` dependency mevcut ama hiç kullanılmıyor.

---

### ⚠️ 16. Streaming Event Tipleri Tam Değil (Plan Bölüm 26)
**Plan gereği:** `thinking`, `tool_call`, `tool_result`, `assistant_text`, **`artifact`** event tipleri ayrıştırılmalı.  
**Mevcut durum:** `openclaw.py`'deki streaming akışı `thought`, `tool_call`, `tool_result`, `assistant_text` event'lerini üretiyor ama `artifact` event tipi eksik.

---

### ⚠️ 17. Güvenli Secret Yönetimi (MCP / Integration) (Plan Bölüm 19)
**Plan gereği:** Integration secret'ları database'de plaintext tutulmamalı.  
**Mevcut durum:** `Integration` entity tanımlanmadı. Ama `APIKey` modeli key_hash ile doğru şekilde oluşturulmuş. Genel JWT/bcrypt güvenliği yerinde.

---

### ⚠️ 18. Seed Data (Plan Bölüm 52)
**Plan gereği:** Örnek seed data ve development scriptleri mevcut olmalı.  
**Mevcut durum:** Seed scripti yok.  
**Eksik:**
```
apps/api/scripts/seed.py
scripts/dev-setup.sh
```

---

## 🟡 KÜÇÜK FARKLAR (Tasarım kararları veya hedeflenen kapsama yakın ama tam uyumlu değil)

### ⚡ 19. Frontend Dark-First Tasarım Direktifi (Plan Bölüm 5)
**Plan gereği:** `Dark-first modern SaaS interface` belirtilmiş.  
**Uygulanan:** Kullanıcının özel direktifi (`sade modern profesyonel beyaz ve açık mavi temalı`) doğrultusunda **light theme** uygulandı.  
**Not:** Bu bilinçli bir sapma — kullanıcının açık isteği plan dokümanındaki direktifin önüne geçti.

---

### ⚡ 20. shadcn/ui Kullanımı (Plan Bölüm 5)
**Plan gereği:** Tailwind CSS + **shadcn/ui** kullanılmalı.  
**Mevcut durum:** Tailwind CSS ile sıfırdan özel bileşenler yazıldı. `shadcn/ui` kurulu değil.  
**Etki:** Erişilebilirlik (a11y) ve bileşen varyasyonları için shadcn/ui'nın sunduğu hazır Radix UI tabanlı bileşenler eksik.

---

### ⚡ 21. Reverse Proxy / Caddy (Plan Bölüm Dizin & 35)
**Plan gereği:** Caddy veya Traefik reverse proxy.  
**Mevcut durum:** `docker-compose.yml`'de Caddy servisi tanımlı değil. Servisler doğrudan portlarla erişilebilir.

---

### ⚡ 22. Logs Sayfası (Plan Bölüm 44 UX)
**Plan gereği:** Navigation'da `Logs` sayfası belirtilmiş (bölüm 5).  
**Mevcut durum:** Sidebar navigation'da `Logs` bağlantısı yok. `GET /api/v1/logs` backend endpoint'i mevcut ama frontend sayfası eksik.

---

### ⚡ 23. Knowledge Sayfası (Plan Bölüm 5)
**Plan gereği:** Navigation'da `Knowledge` sayfası.  
**Mevcut durum:** `Files` sayfası var ve RAG açıklaması içeriyor ama ayrı bir `Knowledge` sayfası yok (bölüm 17'deki RAG arama ve chunk yönetimi için).

---

### ⚡ 24. `packages/shared` Ortak Tipler (Plan Bölüm 4)
**Plan gereği:** Frontend ve backend arasında ortak tipler için `/packages/shared`.  
**Mevcut durum:** API client tipleri frontend'deki `lib/api.ts`'de tanımlı. Backend Pydantic şemaları ile manuel senkronizasyon gerekiyor.

---

### ⚡ 25. Sentry Entegrasyonu (Plan Bölüm 45, .env.example)
**Plan gereği:** `SENTRY_DSN` environment variable'ı var ve Sentry-ready error handling belirtilmiş.  
**Mevcut durum:** `.env.example`'da `SENTRY_DSN=` mevcut ama Sentry SDK kurulu değil, `main.py`'ye Sentry init eklenmedi.

---

## ✅ TAMAMEN UYGULANANLAR

| Plan Bölümü | Gereksinim | Durum |
|---|---|---|
| §3 | FastAPI + Pydantic v2 + SQLAlchemy async + asyncpg | ✅ |
| §3 | Redis + Celery kuyruk sistemi | ✅ |
| §3 | PostgreSQL + pgvector | ✅ |
| §3 | MinIO / S3-uyumlu object storage | ✅ |
| §3 | Docker Compose | ✅ |
| §6 | JWT kimlik doğrulama (register + login) | ✅ |
| §7 | User, Organization, OrganizationMember, Agent, AgentRun, AgentMessage, AgentMemory, AgentContextSnapshot, AgentFile, KnowledgeDocument, KnowledgeChunk, Tool, AgentModelConfig (model_config_data), Task, TaskExecution, UsageRecord, AuditLog, APIKey | ✅ (17/19) |
| §8 | Agent modeli (id, org_id, name, desc, system_instructions, status, model_config, tool_permissions, workspace_path) | ✅ |
| §9 | ContextBuilder servisi | ✅ |
| §10 | Model switching altyapısı (config değişiminde state korunuyor) | ✅ |
| §11 | OpenRouter service + model katalog + streaming iskelet | ✅ Kısmi |
| §12 | `AgentRuntime` abstract interface | ✅ |
| §12 | `OpenClawRuntimeAdapter` | ✅ (mock) |
| §15 | S3/MinIO dosya storage, metadata DB'de, key formatı doğru | ✅ |
| §16 | PDF ve TXT ingestion pipeline | ✅ |
| §17 | pgvector modeli (chunk, embedding alanı) | ✅ Kısmi |
| §18 | Tool permission sistemi (allowed/denied) | ✅ |
| §21 | Task sistemi (queued, running, completed, failed, cancelled) | ✅ |
| §22 | Celery async task queue | ✅ |
| §24 | AgentMemory (short_term / long_term) modeli | ✅ |
| §25 | AgentContextSnapshot modeli | ✅ |
| §27 | AuditLog (login, agent_created, tool_called) | ✅ |
| §28 | UsageRecord (model, input_tokens, output_tokens, cost) | ✅ |
| §29 | monthly_token_limit, monthly_budget_usd alanları Organization'da | ✅ |
| §30 | REST API `/api/v1/...` (auth, organizations, agents, tasks, files, models, usage, logs) | ✅ |
| §31 | Security prensipler (JWT secret env'den, bcrypt hash, org izolasyon filter) | ✅ |
| §34 | `/health` ve `/ready` endpoint'leri | ✅ |
| §35 | Docker Compose (web, api, worker, postgres, redis, minio, openclaw) | ✅ |
| §36 | `.env.example` | ✅ |
| §39 | Create Agent 5 adımlı Wizard (Modal) | ✅ |
| §40 | Agent chat 3 panel layout (sol: info, orta: conversation, sağ: tasks/artifacts) | ✅ |
| §41 | File UI (upload, delete, processing status) | ✅ |
| §43 | Model dropdown (provider, context, fiyat metadata) | ✅ |
| §45 | Structured logging, request_id middleware | ✅ |
| §46 | MVP scope: user registration, org creation, agent creation, file upload, knowledge search iskelet, OpenRouter calling, OpenClaw runtime iskelet, agent chat, tool execution mock, async tasks, model switching, memory modeli, usage tracking, audit logging | ✅ |
| §47 | Phase 1 (repo + docker + postgres + redis + frontend/backend skeleton) | ✅ |
| §48 | Mevcut mimari analiz edildi, var olan kod incelendi | ✅ |
| §51 | Type safety (Pydantic v2), validation, error handling, tenant isolation, JWT security | ✅ |

---

## 📋 Öncelik Sırası — Sonraki Adımlar

Aşağıdaki eksikler **kritiklik ve MVP etkisi** sırasına göre giderilmelidir:

1. **[KRİTİK]** Alembic migration kurulumu → production ortamında şema yönetimi
2. **[KRİTİK]** Frontend auth sayfaları (login/register) → gerçek kullanıcı akışı
3. **[YÜKSEK]** pgvector embedding servisi (OpenRouter embedding API veya SentenceTransformers)
4. **[YÜKSEK]** XLSX ve PPTX döküman ayrıştırıcı (`openpyxl`, `python-pptx`)
5. **[YÜKSEK]** OpenRouter gerçek tool calling akışı
6. **[YÜKSEK]** Rate limiting middleware (`slowapi`)
7. **[ORTA]** Prometheus `/metrics` endpoint'i
8. **[ORTA]** Context compaction tetikleyici
9. **[ORTA]** Admin panel (organizasyon ve görev yönetimi)
10. **[ORTA]** shadcn/ui bileşen kütüphanesi entegrasyonu
11. **[DÜŞÜK]** Browser automation (Playwright container)
12. **[DÜŞÜK]** MCP Integration entity
13. **[DÜŞÜK]** Caddy reverse proxy servisi
14. **[DÜŞÜK]** Seed data scriptleri
15. **[DÜŞÜK]** `/packages/shared` ortak tip paketi
