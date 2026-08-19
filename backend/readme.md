1 run: migration
    - psql $DATABASE_URL -f backend/migrations
 

 step to build AI doc
    1. prepare document
    2.migrate  015_create_knowledge_chunks
    3. node etl.mjs
