# AI EMPLOYEE PLATFORM — MASTER DEVELOPMENT PROMPT

## 1. PROJE AMACI

Multi-tenant bir B2B SaaS platformu geliştiriyoruz.

Platformun amacı şirketlerin internet sitesi üzerinden kayıt olup kendi şirketlerini oluşturması, yapay zekâ çalışanları oluşturması, şirket verilerini yüklemesi ve bu AI çalışanlarına doğal dille görev vermesidir.

Kullanıcı bir AI çalışanını normal bir sohbet botu gibi değil, bilgisayar kullanan ve gerçek işler yapabilen dijital çalışan gibi kullanabilmelidir.

Örnek AI çalışanlar:

- Sales Employee
- Accounting Employee
- HR Employee
- Project Management Employee
- Research Employee
- Customer Support Employee
- Operations Employee

Bir şirket aynı anda birden fazla AI çalışanı çalıştırabilmelidir.

Aynı şirket altında birden fazla agent aynı anda bağımsız görevler çalıştırabilmelidir.

Platform tamamen multi-tenant olmalıdır.

Her tenant'ın verileri, dosyaları, agent'ları, memory'leri, çalışma alanları, API anahtarları, tool izinleri ve logları birbirinden izole edilmelidir.

Her şirket için manuel sunucu veya uygulama kurulumu gerekmemelidir.

Kullanıcı:

1. Kayıt olur.
2. Organization/company oluşturur.
3. Agent oluşturur.
4. Agent'ın görevini tanımlar.
5. Dosyalarını yükler.
6. Kullanılacak modeli seçer.
7. Agent'a görev verir.
8. Agent görevi sandbox içinde gerçekleştirir.
9. Sonuçları ve oluşturduğu dosyaları kullanıcıya sunar.

---

# 2. EN ÖNEMLİ MİMARİ PRENSİP

Uygulamayı OpenClaw'ın üzerine tamamen bağımlı şekilde tasarlama.

OpenClaw bir AGENT RUNTIME / HARNESS olarak kullanılacaktır.

Business logic, tenant sistemi, authentication, billing, database, file system, memory sistemi, agent yönetimi, usage tracking, permissions ve frontend bizim uygulamamıza ait olacaktır.

Mimari şu şekilde düşünülmelidir:

Frontend
    ↓
Platform API
    ↓
Agent Orchestrator
    ↓
Agent Runtime Adapter
    ↓
OpenClaw
    ↓
Tools / MCP / Browser / Sandbox
    ↓
OpenRouter
    ↓
External LLM providers

OpenClaw ileride başka bir runtime ile değiştirilebilmelidir.

Bu nedenle bir abstraction/interface oluştur:

AgentRuntime

ve örneğin:

OpenClawRuntimeAdapter

oluştur.

İleride:

HermesRuntimeAdapter
NativeRuntimeAdapter

eklenebilecek şekilde tasarla.

OpenClaw entegrasyonu business logic'e hard-code edilmemelidir.

---

# 3. TECH STACK

Frontend:

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Responsive design
- Dark-first modern SaaS interface

Backend:

- Python
- FastAPI
- Pydantic
- SQLAlchemy
- asyncpg

Database:

- PostgreSQL
- pgvector

Queue:

- Redis
- Celery

Object storage:

- S3-compatible storage
- Development ortamında MinIO kullanılabilir

Agent runtime:

- OpenClaw

LLM gateway:

- OpenRouter

Sandbox:

- Docker

Reverse proxy:

- Caddy veya Traefik

Observability:

- structured logging
- Sentry-ready error handling
- Prometheus metrics
- Grafana-ready metrics

Deployment:

- Docker Compose

Production architecture ileride Kubernetes'e taşınabilecek şekilde containerized tasarlanmalıdır.

---

# 4. MONOREPO

Tek bir monorepo oluştur.

Önerilen yapı:

/apps
    /web
    /api

/services
    /agent-runtime
    /worker

/packages
    /shared

/infrastructure
    /docker
    /proxy

/docs

/scripts

.agent

Root içinde:

docker-compose.yml
.env.example
README.md

oluştur.

---

# 5. FRONTEND

Next.js ile modern bir SaaS dashboard oluştur.

UI çok temiz, teknik ve premium görünmelidir.

Benzer his:

- modern developer SaaS
- Linear
- Vercel
- Cursor
- modern AI platforms

Ancak mevcut markaların UI'ını birebir kopyalama.

Ana navigation:

Dashboard
Agents
Tasks
Files
Knowledge
Models
Usage
Logs
Settings

Üst tarafta organization selector bulunmalı.

---

# 6. AUTHENTICATION

Authentication sistemi oluştur.

Kullanıcı:

- sign up
- sign in
- sign out
- password reset
- email verification

yapabilmeli.

Başlangıçta JWT tabanlı authentication kullanılabilir.

Security best practice uygula.

Password'leri hash'le.

JWT secret env üzerinden gelsin.

Production secret'ları source code içine koyma.

---

# 7. MULTI-TENANT DATA MODEL

Aşağıdaki temel entity'leri oluştur:

User
Organization
OrganizationMember
Agent
AgentRun
AgentMessage
AgentMemory
AgentContextSnapshot
AgentFile
KnowledgeDocument
KnowledgeChunk
Tool
AgentToolPermission
AgentModelConfig
Task
TaskExecution
UsageRecord
AuditLog
APIKey
Integration
Notification

Her tenant-owned entity tenant_id / organization_id üzerinden izole edilmelidir.

Cross-tenant data access kesinlikle mümkün olmamalıdır.

Repository/service layer bu isolation'ı merkezi şekilde uygulamalıdır.

Mümkün olan yerlerde PostgreSQL Row Level Security için mimari uygunluk bırak.

---

# 8. AGENT MODELİ

Agent aşağıdaki bilgileri içerebilmeli:

id
organization_id
name
description
system_instructions
status
model_config
tool_permissions
workspace_path
created_at
updated_at

Bir agent'ın:

- system prompt'u
- tools
- memory
- files
- permissions
- model ayarları
- workspace'i

diğer agentlardan bağımsız olmalıdır.

---

# 9. CONTEXT MANAGEMENT

En kritik gereksinimlerden biridir.

Agent'ın gerçek state'i LLM context window içinde tutulmamalıdır.

Database/source-of-truth yaklaşımı kullanılmalıdır.

Conversation history database'e yazılmalıdır.

Agent state aşağıdaki bileşenlerden oluşturulmalıdır:

SYSTEM INSTRUCTIONS
+
AGENT CONFIGURATION
+
LONG TERM MEMORY
+
RELEVANT KNOWLEDGE
+
CONTEXT SUMMARY
+
RECENT MESSAGES
+
CURRENT TASK
+
TOOL RESULTS
+
ARTIFACTS

Context builder isimli bir servis oluştur:

ContextBuilder

Bu servis her LLM invocation öncesinde model için gerekli context'i oluşturmalıdır.

---

# 10. MODEL SWITCHING

Agent çalışırken model değiştirilebilmelidir.

Örneğin:

Claude
→ GPT
→ Gemini
→ başka model

değişiminde agent state kaybolmamalıdır.

LLM provider hiçbir zaman agent state'in source-of-truth'u olmayacaktır.

Model sadece inference engine olarak kullanılmalıdır.

OpenRouter API üzerinden model seçimi yapılmalıdır.

Agent model config:

primary_model
fallback_models
temperature
max_tokens
reasoning configuration
provider preferences

gibi alanları destekleyebilmelidir.

Model adapter mümkün olduğunca provider-neutral olmalıdır.

---

# 11. OPENROUTER

OpenRouter entegrasyonu oluştur.

API key environment variable:

OPENROUTER_API_KEY

olarak kullanılmalıdır.

Frontend hiçbir zaman OpenRouter secret key'i doğrudan görmemelidir.

Tüm model çağrıları backend tarafından yapılmalıdır.

OpenRouter üzerinden:

- model selection
- fallback
- streaming
- tool calling
- usage tracking

uygulanmalıdır.

OpenRouter fallback mekanizmasını gerektiğinde kullan.

Model ID'lerini database'de tut.

Model listesini hard-code etmekten kaçın.

Gerekirse provider/model catalog abstraction oluştur.

---

# 12. AGENT RUNTIME ABSTRACTION

Aşağıdaki gibi bir interface tasarla:

class AgentRuntime:
    create_agent(...)
    execute(...)
    stream(...)
    stop(...)
    get_status(...)
    destroy(...)
    health_check(...)

OpenClawRuntimeAdapter bu interface'i implement etsin.

Kodun geri kalanı doğrudan OpenClaw API'sine bağlanmasın.

---

# 13. OPENCLAW

OpenClaw'ı agent execution engine olarak entegre et.

Her agent'ın ayrı logical identity'si olmalı.

Agent workspace'leri kesinlikle birbirine karıştırılmamalı.

OpenClaw'ın multi-agent özelliğini kullan.

Her agent için uygun sandbox policy oluştur.

Tenant'ın güvenilmeyen input'u nedeniyle host sistemine erişim oluşmaması kritik gereksinimdir.

OpenClaw sandbox Docker backend kullanılmalıdır.

Host filesystem'i agent'a gereksiz yere mount etme.

Host Docker socket'ini agent sandbox'larına vermekten kaçın.

Agent'a sadece ihtiyaç duyduğu workspace'i expose et.

Network egress varsayılan olarak kapalı veya çok kısıtlı olmalıdır.

Tool permission sistemi oluştur.

Örneğin agent seviyesinde:

ALLOW
read_file
search_files

DENY
arbitrary_host_exec

şeklinde policy uygulanabilmelidir.

---

# 14. SANDBOX

Her agent için izole çalışma alanı oluştur.

Örnek:

/data/tenants/{tenant_id}/agents/{agent_id}/workspace

Agent:

- kendi workspace'ini görebilmeli
- kendi temporary files alanına erişebilmeli
- diğer tenantların dosyalarını görememeli
- diğer agent workspace'lerini görememeli

Sandbox resource limits desteklenmelidir:

CPU
RAM
disk
process count
execution timeout

configurable olmalıdır.

---

# 15. FILE SYSTEM / OBJECT STORAGE

Kullanıcı dosyaları database içine binary olarak yazılmamalıdır.

Dosyalar S3/MinIO'ya konulmalıdır.

Object key örneği:

tenants/{tenant_id}/agents/{agent_id}/files/{file_id}

Database yalnızca metadata tutmalıdır.

File metadata:

id
tenant_id
agent_id
filename
mime_type
size
storage_key
checksum
status
created_at

Dosya upload/download işlemlerinde authorization mutlaka kontrol edilmelidir.

---

# 16. DOCUMENT INGESTION

Upload edilen dosya otomatik olarak ingestion pipeline'a girmelidir.

Pipeline:

UPLOAD
↓
VALIDATE
↓
STORE
↓
PARSE
↓
EXTRACT TEXT
↓
CHUNK
↓
EMBED
↓
STORE IN PGVECTOR
↓
READY

Başlangıçta destekle:

PDF
TXT
DOCX
XLSX
CSV
PPTX

Architecture ileride image OCR eklenmesine uygun olsun.

---

# 17. KNOWLEDGE SYSTEM

RAG sistemi oluştur.

PostgreSQL + pgvector kullan.

KnowledgeChunk:

id
tenant_id
document_id
agent_id
content
embedding
metadata

metadata:

page
section
filename
document_id

gibi alanları içerebilir.

Search:

semantic similarity

ile çalışsın.

Agent sadece yetkili olduğu tenant/agent knowledge alanında arama yapabilsin.

---

# 18. TOOLS

Tool abstraction oluştur.

Minimum tool'lar:

file_search
file_read
file_write
list_files
python
shell
browser
web_search

Ancak shell ve browser tehlikeli capability'ler olduğu için permission sistemi zorunludur.

Tool çağrıları audit log'a yazılmalıdır.

Tool execution sonucu:

success
failure
timeout
permission_denied

olarak ayrıştırılmalıdır.

---

# 19. MCP

MCP entegrasyonuna uygun architecture kur.

MCP integration'ları:

Integration

entity üzerinden yönet.

Örneğin ileride:

Google Drive
Slack
Gmail
Outlook
CRM
ERP
PostgreSQL

gibi sistemler eklenebilmeli.

Bir integration yalnızca ilgili organization ve izin verilen agent'lar tarafından kullanılabilmelidir.

Secret'ları database'de plaintext tutma.

---

# 20. BROWSER AUTOMATION

Browser tool architecture kur.

Playwright + isolated browser/container yaklaşımı kullan.

Agent browser ile:

- open page
- click
- type
- screenshot
- navigate
- extract

gibi işlemler yapabilmeli.

Browser session'ları tenant isolation'a tabi olmalı.

Login/session credential'ları diğer tenantlara kesinlikle açılamamalıdır.

---

# 21. TASK SYSTEM

Agent'a verilen her görev ayrı bir Task olarak modellenmelidir.

Task:

id
organization_id
agent_id
user_id
status
priority
input
output
error
created_at
started_at
completed_at

status:

queued
running
waiting
completed
failed
cancelled

olabilir.

---

# 22. ASYNC EXECUTION

Agent görevleri HTTP request içinde uzun süre çalıştırma.

Architecture:

API
↓
Queue
↓
Worker
↓
Agent Runtime
↓
Task

Redis + Celery kullan.

Bir şirketin birden fazla agent'ı aynı anda çalışabilir.

Örneğin:

company A
  agent 1 → task 1
  agent 2 → task 2
  agent 3 → task 3

aynı anda queue'ya girebilmelidir.

Worker concurrency configurable olmalıdır.

---

# 23. FUTURE DURABLE WORKFLOW

Architecture'ı ileride Temporal eklenmesine uygun tasarla.

Şu an Celery ile başla.

Ancak uzun süren:

- multi-step agent task
- scheduled tasks
- human approval
- retry
- wait state
- days-long workflows

için ileride Temporal adapter eklenebilecek abstraction oluştur.

---

# 24. MEMORY

Agent memory sistemi oluştur.

İki temel memory:

SHORT TERM
conversation/context

LONG TERM
facts/preferences/project knowledge

Memory retrieval semantic search ile desteklenebilir.

Memory'lerin tenant isolation'ı zorunludur.

Memory oluşturma policy'si açıkça kontrol edilebilir olsun.

---

# 25. CONTEXT COMPACTION

Conversation büyüdüğünde otomatik context compaction yap.

Örneğin:

recent messages
+
summary
+
important facts
+
current task

şeklinde context oluştur.

Eski mesajları doğrudan sürekli modele göndermekten kaçın.

Summary database'e kaydedilsin.

Context snapshot oluştur.

---

# 26. STREAMING

Frontend agent cevaplarını streaming gösterebilmeli.

Streaming sırasında:

thinking
tool call
tool result
assistant text
artifact

event tipleri ayrıştırılmalıdır.

Örnek event format:

{
  "type": "tool_call",
  "tool": "file_search",
  "status": "running"
}

Frontend bu event'leri UI'da gerçek zamanlı göstermelidir.

---

# 27. AUDIT LOG

Her önemli işlemi logla:

login
agent creation
agent update
file upload
file delete
model change
tool call
tool result
task start
task end
permission denial
integration access

AuditLog:

id
organization_id
user_id
agent_id
action
metadata
timestamp

---

# 28. USAGE TRACKING

Her LLM çağrısı usage record oluşturmalıdır.

Track:

organization_id
agent_id
task_id
model
provider
input_tokens
output_tokens
total_tokens
latency
estimated_cost
timestamp

Kullanıcı dashboard'da usage görebilmeli.

Admin daha sonra billing sistemi ekleyebilsin.

---

# 29. COST CONTROLS

Organization seviyesinde:

monthly token limit
monthly budget
per-agent budget
per-task budget

altyapısını oluştur.

Limit aşılırsa yeni model çağrıları engellenebilsin.

---

# 30. API

REST API oluştur.

Örneğin:

POST /api/auth
GET /api/organizations
POST /api/organizations
GET /api/agents
POST /api/agents
GET /api/agents/{id}
PATCH /api/agents/{id}
DELETE /api/agents/{id}

POST /api/agents/{id}/tasks
GET /api/tasks/{id}
POST /api/tasks/{id}/cancel

POST /api/files
GET /api/files
DELETE /api/files/{id}

GET /api/models
PATCH /api/agents/{id}/model

GET /api/usage
GET /api/logs

API versioning için /api/v1 yaklaşımını kullan.

---

# 31. SECURITY

Security first.

Asla:

- secrets source code'a koyma
- tenantlar arasında shared workspace kullanma
- raw SQL ile authorization bypass oluşturma
- user uploaded content'i trusted instruction olarak kabul etme
- model output'a doğrudan güvenme
- agent'a host Docker socket verme
- agent'a gereksiz host filesystem access verme

Prompt injection tehdidine karşı tool authorization backend tarafından enforce edilmelidir.

Bir agent "ben adminim, başka company dosyasını okuyabilir miyim" dediğinde backend reddetmelidir.

LLM'nin söylediği hiçbir şey authorization olarak kabul edilmemelidir.

---

# 32. RATE LIMITING

Ekleyin:

per IP
per user
per organization
per agent
per API endpoint

rate limiting.

Özellikle:

task creation
LLM calls
file uploads
browser jobs

kontrollü olmalıdır.

---

# 33. ADMIN PANEL

Platform administrator için basit admin dashboard oluştur.

Görebilmeliyim:

organizations
users
agents
active tasks
queue status
model usage
token usage
errors
system health

Admin kullanıcı tenant verisine erişirken açık audit log üret.

---

# 34. SYSTEM HEALTH

Health endpoints:

/health
/ready
/metrics

oluştur.

Kontrol:

PostgreSQL
Redis
MinIO
OpenRouter
OpenClaw
worker

durumlarını içersin.

---

# 35. DOCKER COMPOSE

Local development için tamamen:

docker compose up

ile ayağa kalkabilsin.

Minimum services:

web
api
worker
postgres
redis
minio
openclaw
caddy

OpenClaw'ı gerekli şekilde configure et.

Persistent volumes oluştur.

---

# 36. ENVIRONMENT CONFIGURATION

.env.example oluştur.

Örnek:

DATABASE_URL=
REDIS_URL=
S3_ENDPOINT=
S3_ACCESS_KEY=
S3_SECRET_KEY=
OPENROUTER_API_KEY=
JWT_SECRET=
SENTRY_DSN=
PUBLIC_APP_URL=

Gerçek credentials hiçbir şekilde repository'ye yazılmayacak.

---

# 37. DEVELOPMENT EXPERIENCE

README yaz.

Kurulum:

git clone
cp .env.example .env
docker compose up -d

şeklinde basit olmalıdır.

Migration:

alembic upgrade head

Test:

pytest

Frontend:

npm run lint
npm run test
npm run build

gibi standart komutlar ekle.

---

# 38. TESTING

En az:

unit tests
API tests
tenant isolation tests
auth tests
agent tests
file authorization tests
tool permission tests
model switching tests
task queue tests

oluştur.

Özellikle aşağıdaki test zorunlu:

Tenant A kullanıcısı Tenant B dosyasını isteyememeli.

Agent A Agent B workspace'ini okuyamamalı.

Unauthorized tool execution backend tarafından reddedilmeli.

Model değiştirilince conversation history korunmalı.

Task restart olduğunda duplicate side effect mümkün olduğunca engellenmeli.

---

# 39. UX — CREATE AGENT

Create Agent wizard oluştur:

Step 1
Name

Step 2
Role / Instructions

Step 3
Knowledge

Step 4
Tools

Step 5
Model

Step 6
Permissions

Step 7
Review

Step 8
Create

---

# 40. AGENT CHAT

Agent ekranı:

left:
agent information

center:
conversation

right:
task/tool/activity panel

Mesaj gönderen kullanıcı agent'ı gerçek zamanlı izleyebilmeli.

Tool kullanıldığında:

"Searching company documents..."

"Opening spreadsheet..."

"Running calculation..."

gibi activity event göster.

---

# 41. FILE UI

Dosya yönetimi:

upload
delete
search
preview
processing status

durumları:

processing
ready
failed

olarak göster.

---

# 42. ARTIFACTS

Agent'ın oluşturduğu:

PDF
Excel
CSV
DOCX
images
other files

artifact olarak göster.

Artifact:

id
task_id
agent_id
filename
storage_key
mime_type

ile tutulmalı.

Kullanıcı task sonucunda oluşturulan dosyaları dashboard'dan indirebilmeli.

---

# 43. MODEL UI

Agent settings içerisinde model dropdown oluştur.

Model katalog backend tarafından sağlanmalı.

Örneğin:

Model
Provider
Context
Input price
Output price

gibi metadata göster.

Model listesi provider'a bağımlı olmayacak şekilde tasarlanmalı.

---

# 44. FAILURE HANDLING

LLM timeout
provider error
rate limit
tool error
browser crash
worker crash
container crash

durumlarında sistemi kontrollü şekilde recover et.

Task state kaybolmamalıdır.

Transient errors retry edilebilmelidir.

Permanent errors user'a açık bir hata mesajıyla gösterilmelidir.

---

# 45. OBSERVABILITY

Structured JSON logs.

Her request'e request_id ver.

Her task'a task_id ver.

Her agent execution'a run_id ver.

Log ilişkisi:

request_id
organization_id
agent_id
task_id
run_id

üzerinden takip edilebilir olmalı.

---

# 46. INITIAL MVP SCOPE

Önce aşağıdaki MVP'nin tamamen çalışır halini oluştur:

1. User registration
2. Organization creation
3. Agent creation
4. File upload
5. File ingestion
6. Knowledge search
7. OpenRouter model calling
8. OpenClaw runtime
9. Docker sandbox
10. Agent chat
11. Tool execution
12. Async tasks
13. Model switching
14. Memory
15. Usage tracking
16. Audit logging

Bunlar çalışmadan advanced integrations ekleme.

---

# 47. IMPLEMENTATION STRATEGY

Projeyi tek seferde devasa şekilde oluşturmaya çalışma.

Aşamalı geliştir:

PHASE 1
Repository + Docker + PostgreSQL + Redis + frontend/backend skeleton

PHASE 2
Authentication + organization + users

PHASE 3
Agent CRUD + database

PHASE 4
OpenRouter integration

PHASE 5
OpenClaw integration

PHASE 6
Sandbox

PHASE 7
Files + MinIO

PHASE 8
RAG + pgvector

PHASE 9
Task queue + workers

PHASE 10
Memory + context management

PHASE 11
Streaming + agent UI

PHASE 12
Usage + audit logs

PHASE 13
security hardening

PHASE 14
tests

PHASE 15
production deployment

Her phase sonunda çalışan sistemi test et.

---

# 48. IMPORTANT DEVELOPMENT RULE

Herhangi bir requirement belirsizse önce mevcut repository'deki architecture ve code'u incele.

Var olan çalışan kodu gereksiz yere yeniden yazma.

Her değişiklikte:

1. Understand
2. Implement
3. Test
4. Fix
5. Document

döngüsünü uygula.

---

# 49. DO NOT OVERENGINEER

MVP'de Kubernetes kullanma.

MVP'de microservice sayısını gereksiz yere artırma.

MVP'de ayrı vector database kullanma.

MVP'de ayrı workflow engine kullanma.

MVP'de billing provider entegrasyonunu zorunlu kılma.

İlk mimaride:

FastAPI
Next.js
PostgreSQL
pgvector
Redis
Celery
MinIO
OpenClaw
Docker
OpenRouter

yeterlidir.

---

# 50. FUTURE EXTENSION POINTS

Architecture ileride şunları destekleyebilecek:

Temporal
Kubernetes
Firecracker/gVisor/Kata
multiple worker nodes
multiple regions
custom models
self-hosted models
multiple LLM gateways
Stripe
OAuth
Google Workspace
Microsoft 365
Slack
CRM
ERP
scheduled agents
human approval
agent-to-agent communication

---

# 51. PRODUCTION MINDSET

Bu bir demo değil.

Kod production'a yakın quality'de olmalı.

Type safety
validation
error handling
logging
security
tenant isolation
tests
migration
configuration management

konularını ciddiye al.

Ama gereksiz complexity ekleme.

---

# 52. FINAL DELIVERABLE

Çalışan bir repository teslim et.

Şunlar mutlaka mevcut olsun:

- source code
- Docker Compose
- database migrations
- .env.example
- README
- setup instructions
- tests
- API documentation
- architecture documentation
- security notes
- sample seed data
- development scripts

README içinde özellikle:

Architecture
Installation
Environment Variables
Running Locally
Database Migration
OpenRouter setup
OpenClaw setup
Creating first organization
Creating first agent
Running first task
Troubleshooting

bölümleri olsun.

---

# 53. FIRST ACTION

Kodlamaya başlamadan önce mevcut repository'yi analiz et.

Ardından:

1. Mevcut dosya yapısını açıkla.
2. Eksik parçaları belirle.
3. Önerdiğin architecture'ı kısa şekilde göster.
4. Implementation phases oluştur.
5. Ardından Phase 1'den başlayarak gerçekten kodla.

Her phase tamamlandığında testleri çalıştır.

Kendi kendine mock edilmiş başarı mesajları verme.

Kod gerçekten çalışmıyorsa bunu açıkça belirt ve düzelt.

Ana hedef:
Kullanıcının herhangi bir manuel tenant deployment yapmadan web sitesinden kayıt olup birkaç dakika içinde AI employee oluşturabildiği gerçek bir multi-tenant SaaS platformu üretmek.