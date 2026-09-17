#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

echo "========================================================"
echo "🔄 YapayZekaÇalışan GitHub Otomatik Güncelleme Başlatıldı"
echo "Tarih: $(date)"
echo "Dizin: $PROJECT_DIR"
echo "========================================================"

# 1. En güncel kodları GitHub'dan çek
echo "📥 1/5: GitHub'dan son değişiklikler çekiliyor..."
git fetch origin main
LOCAL_HASH=$(git rev-parse HEAD)
REMOTE_HASH=$(git rev-parse origin/main)

if [ "$LOCAL_HASH" = "$REMOTE_HASH" ] && [ "$1" != "--force" ]; then
    echo "✅ Sistem zaten en güncel sürümde ($LOCAL_HASH). Güncellemeye gerek yok."
    exit 0
fi

git pull origin main

# 2. Değişen Docker imajlarını derle
echo "🔨 2/5: Konteynerler yeniden derleniyor..."
docker compose build

# 3. Servisleri sıfır kesintiye yakın yeniden başlat
echo "🚀 3/5: Servisler yeniden başlatılıyor..."
docker compose up -d --remove-orphans

# 4. Veritabanı migration'larını çalıştır
echo "🗄️ 4/5: Veritabanı şema güncellemeleri (Alembic) uygulanıyor..."
docker compose exec -T api alembic upgrade head

# 5. Kullanılmayan eski imajları temizle
echo "🧹 5/5: Eski Docker imajları temizleniyor..."
docker image prune -f

echo "========================================================"
echo "🎉 Güncelleme başarıyla tamamlandı!"
echo "Aktif Sürüm: $(git rev-parse --short HEAD)"
echo "Sağlık Kontrolü:"
docker compose exec -T api curl -s http://localhost:8000/api/v1/ready || echo "API henüz başlatılıyor..."
echo "========================================================"
