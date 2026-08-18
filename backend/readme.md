# Backend

## Prisma

Schema / migration / client nằm ở package sibling `../dqpbp-prisma`.
Hướng dẫn CLI đầy đủ: [prisma-cli-guide.md](./prisma-cli-guide.md).

Setup lần đầu:

```bash
cd ../dqpbp-prisma
npm install
npm run build

cd ../backend
cp sample.env .env    # chỉnh DATABASE_URL cho đúng DB local
npm install
npm run dev
```

Migrate / generate từ backend:

```bash
npm run prisma:build
npm run prisma:migrate
```

## Knowledge base (RAG)

1. Chuẩn bị document trong `knowledge-base`
2. Đảm bảo bảng `knowledge_chunks` đã có (Prisma schema / migration)
3. `node etl.mjs`
