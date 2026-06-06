1 run: migration
    - psql $DATABASE_URL -f backend/migrations
 