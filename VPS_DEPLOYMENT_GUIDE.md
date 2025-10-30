# Fleet Management System - VPS Deployment Guide

## Complete Guide for Self-Hosted Supabase Deployment

This guide will walk you through deploying the Fleet Management System on your self-hosted Supabase instance running on a VPS.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Edge Functions Deployment](#edge-functions-deployment)
5. [Secrets Configuration](#secrets-configuration)
6. [Frontend Deployment](#frontend-deployment)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Self-hosted Supabase instance** (with PostgreSQL 14+)
- **Node.js** (v18 or higher)
- **npm** or **bun** (package manager)
- **Supabase CLI** (for edge functions deployment)
- **Git** (for cloning the repository)

### VPS Requirements
- Minimum 4GB RAM
- 20GB storage
- Ubuntu 20.04+ or equivalent
- Public IP address with domain (optional but recommended)

---

## Database Setup

### Step 1: Connect to Your Supabase PostgreSQL Database

```bash
# Connect via psql
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-VPS-IP]:5432/postgres"

# OR use Supabase Studio SQL Editor
```

### Step 2: Run the Complete Migration Script

```bash
# From your local machine, copy the migration file to VPS
scp COMPLETE_MIGRATION.sql user@your-vps-ip:/tmp/

# SSH into your VPS
ssh user@your-vps-ip

# Run the migration
psql "postgresql://postgres:[YOUR-PASSWORD]@localhost:5432/postgres" -f /tmp/COMPLETE_MIGRATION.sql
```

**Expected Output:**
```
CREATE EXTENSION
CREATE TABLE
ALTER TABLE
...
NOTICE: Database migration completed successfully!
```

### Step 3: Verify Database Schema

```sql
-- Check if all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should return 50+ tables including:
-- organizations, vehicles, drivers, trips, telemetry, etc.
```

### Step 4: Create First Admin User

After migration, the first user who signs up will automatically become a super admin. No manual intervention needed!

---

## Environment Configuration

### Step 1: Locate Your Supabase Credentials

From your self-hosted Supabase instance:

1. **Supabase URL**: `http://[YOUR-VPS-IP]:8000` or your custom domain
2. **Anon Key**: Found in Supabase Studio → Settings → API
3. **Service Role Key**: Found in Supabase Studio → Settings → API
4. **Project ID**: Found in Supabase Studio → Settings → General

### Step 2: Create Environment File

On your local development machine or VPS where you'll build the frontend:

```bash
# Create .env file in project root
cat > .env << EOF
VITE_SUPABASE_URL=http://[YOUR-VPS-IP]:8000
VITE_SUPABASE_PUBLISHABLE_KEY=[YOUR-ANON-KEY]
VITE_SUPABASE_PROJECT_ID=[YOUR-PROJECT-ID]
VITE_MAPBOX_TOKEN=[YOUR-MAPBOX-PUBLIC-TOKEN]
EOF
```

**⚠️ Important:** Replace all `[YOUR-*]` placeholders with actual values.

---

## Edge Functions Deployment

### Step 1: Install Supabase CLI

```bash
# Install via npm
npm install -g supabase

# OR via Homebrew (macOS)
brew install supabase/tap/supabase
```

### Step 2: Link to Your Supabase Project

```bash
# Initialize Supabase in your project directory
cd /path/to/fleet-management-project

# Link to your self-hosted instance
supabase link --project-ref [YOUR-PROJECT-ID] --api-url http://[YOUR-VPS-IP]:8000
```

### Step 3: Deploy Edge Functions

```bash
# Deploy all edge functions
supabase functions deploy ai-chat
supabase functions deploy get-mapbox-token
supabase functions deploy erpnext-sync

# Verify deployment
supabase functions list
```

**Expected Output:**
```
┌──────────────────┬─────────┬────────────────────┐
│      NAME        │ STATUS  │   LAST DEPLOYED    │
├──────────────────┼─────────┼────────────────────┤
│ ai-chat          │ ACTIVE  │ 2025-01-15 10:30   │
│ get-mapbox-token │ ACTIVE  │ 2025-01-15 10:31   │
│ erpnext-sync     │ ACTIVE  │ 2025-01-15 10:32   │
└──────────────────┴─────────┴────────────────────┘
```

### Step 4: Configure Edge Function Settings

```bash
# Edit supabase/config.toml to set JWT verification
```

**supabase/config.toml** should contain:

```toml
[functions.ai-chat]
verify_jwt = true

[functions.get-mapbox-token]
verify_jwt = false

[functions.erpnext-sync]
verify_jwt = true
```

---

## Secrets Configuration

### Step 1: Set Required Secrets

```bash
# Set Mapbox token (required for maps)
supabase secrets set MAPBOX_PUBLIC_TOKEN="pk.your_mapbox_token_here"

# Set Lovable AI key (required for AI assistant)
supabase secrets set LOVABLE_API_KEY="your_lovable_api_key_here"

# Set Supabase credentials for edge functions
supabase secrets set SUPABASE_URL="http://[YOUR-VPS-IP]:8000"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="[YOUR-SERVICE-ROLE-KEY]"
supabase secrets set SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
```

### Step 2: Verify Secrets

```bash
supabase secrets list
```

**Expected Output:**
```
┌──────────────────────────────┬──────────────────┐
│         SECRET NAME          │   SET AT         │
├──────────────────────────────┼──────────────────┤
│ MAPBOX_PUBLIC_TOKEN          │ 2025-01-15       │
│ LOVABLE_API_KEY              │ 2025-01-15       │
│ SUPABASE_URL                 │ 2025-01-15       │
│ SUPABASE_SERVICE_ROLE_KEY    │ 2025-01-15       │
│ SUPABASE_ANON_KEY            │ 2025-01-15       │
└──────────────────────────────┴──────────────────┘
```

---

## Frontend Deployment

### Step 1: Install Dependencies

```bash
cd /path/to/fleet-management-project

# Using npm
npm install

# OR using bun (faster)
bun install
```

### Step 2: Build the Application

```bash
# Production build
npm run build

# OR with bun
bun run build
```

**Expected Output:**
```
vite v5.0.0 building for production...
✓ 1234 modules transformed.
dist/index.html                   0.45 kB
dist/assets/index-a1b2c3d4.css    123.45 kB
dist/assets/index-e5f6g7h8.js     456.78 kB
✓ built in 12.34s
```

### Step 3: Deploy to Web Server

#### Option A: Deploy with Nginx

```bash
# Copy build files to web server
scp -r dist/* user@your-vps-ip:/var/www/fleet-management/

# SSH into VPS
ssh user@your-vps-ip

# Configure Nginx
sudo nano /etc/nginx/sites-available/fleet-management
```

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/fleet-management;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Caching for static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

```bash
# Enable site and restart Nginx
sudo ln -s /etc/nginx/sites-available/fleet-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Option B: Deploy with Apache

```bash
# Copy files
scp -r dist/* user@your-vps-ip:/var/www/fleet-management/

# Configure Apache virtual host
sudo nano /etc/apache2/sites-available/fleet-management.conf
```

**Apache Configuration:**

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/fleet-management
    
    <Directory /var/www/fleet-management>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # SPA routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Security headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
</VirtualHost>
```

```bash
# Enable site and modules
sudo a2ensite fleet-management
sudo a2enmod rewrite headers
sudo systemctl restart apache2
```

#### Option C: Deploy with Node.js (Static Server)

```bash
# Install serve globally
npm install -g serve

# Serve the built files
serve -s dist -l 3000

# OR run in background with PM2
npm install -g pm2
pm2 start "serve -s dist -l 3000" --name fleet-management
pm2 save
pm2 startup
```

---

## Post-Deployment Verification

### Step 1: Test Database Connection

```bash
# From your application server
curl -X POST 'http://[YOUR-VPS-IP]:8000/rest/v1/organizations?select=*' \
  -H "apikey: [YOUR-ANON-KEY]" \
  -H "Authorization: Bearer [YOUR-ANON-KEY]"
```

**Expected:** `200 OK` with JSON response

### Step 2: Test Edge Functions

```bash
# Test get-mapbox-token function
curl -X POST 'http://[YOUR-VPS-IP]:8000/functions/v1/get-mapbox-token' \
  -H "Authorization: Bearer [YOUR-ANON-KEY]"

# Expected response:
# {"token": "pk.your_mapbox_token"}
```

### Step 3: Test Frontend Application

1. Open browser and navigate to `http://your-domain.com` or `http://[YOUR-VPS-IP]`
2. You should see the login/signup page
3. Create a new account (first user becomes super admin automatically)
4. After login, verify:
   - Dashboard loads correctly
   - Map view displays (with Mapbox)
   - Navigation works
   - No console errors

### Step 4: Verify RLS Policies

```sql
-- Test RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Should return all tables with RLS enabled
```

### Step 5: Check Edge Function Logs

```bash
# View recent logs
supabase functions logs ai-chat --tail

# Check for errors
supabase functions logs ai-chat --level error
```

---

## Troubleshooting

### Issue: Database Connection Failed

**Symptoms:** Application can't connect to database

**Solutions:**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check firewall allows connections
sudo ufw status
sudo ufw allow 5432/tcp

# Verify pg_hba.conf allows remote connections
sudo nano /etc/postgresql/14/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Issue: Edge Functions Not Working

**Symptoms:** 404 or 500 errors when calling functions

**Solutions:**
```bash
# Check function deployment status
supabase functions list

# Redeploy function
supabase functions deploy [function-name] --force

# Check logs for errors
supabase functions logs [function-name] --level error

# Verify secrets are set
supabase secrets list
```

### Issue: Map Not Loading

**Symptoms:** Map shows error or blank screen

**Solutions:**
1. Verify Mapbox token is valid: https://account.mapbox.com/access-tokens
2. Check token is set in secrets:
   ```bash
   supabase secrets get MAPBOX_PUBLIC_TOKEN
   ```
3. Verify get-mapbox-token function is deployed:
   ```bash
   supabase functions logs get-mapbox-token
   ```
4. Check browser console for errors (F12)

### Issue: Authentication Not Working

**Symptoms:** Can't sign up or login

**Solutions:**
```bash
# Check auth is enabled
supabase projects api-keys --project-id [YOUR-PROJECT-ID]

# Verify auth.users table exists
psql "postgresql://..." -c "SELECT count(*) FROM auth.users;"

# Check RLS policies on profiles table
psql "postgresql://..." -c "\d+ public.profiles"

# Enable email auto-confirm (for testing)
# In Supabase Studio: Authentication → Settings → Email Auth
# Enable "Confirm email" toggle OFF for development
```

### Issue: Realtime Not Working

**Symptoms:** Vehicle tracking doesn't update in real-time

**Solutions:**
```bash
# Check realtime is enabled for tables
psql "postgresql://..." << EOF
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
EOF

# If missing, add tables to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_telemetry;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
```

### Issue: CORS Errors

**Symptoms:** Browser blocks API requests

**Solutions:**
1. Add your domain to Supabase CORS whitelist
2. In Supabase Studio: Settings → API → CORS
3. Add your domain (e.g., `https://your-domain.com`)
4. For development, add `http://localhost:5173`

### Issue: Slow Performance

**Symptoms:** Application loads slowly

**Solutions:**
```sql
-- Check database indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Add missing indexes if needed
CREATE INDEX idx_telemetry_vehicle_time 
ON public.vehicle_telemetry(vehicle_id, recorded_at DESC);

-- Analyze and vacuum database
ANALYZE;
VACUUM;

-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

---

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Configure firewall (ufw or iptables)
- [ ] Enable SSL/TLS for PostgreSQL connections
- [ ] Set up HTTPS for web server (Let's Encrypt)
- [ ] Restrict Supabase API keys by domain
- [ ] Enable RLS on all tables
- [ ] Set up regular database backups
- [ ] Configure log rotation
- [ ] Enable fail2ban for SSH protection
- [ ] Use strong passwords for all accounts
- [ ] Limit user permissions (principle of least privilege)
- [ ] Monitor logs for suspicious activity

---

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# Save as /usr/local/bin/backup-fleet-db.sh

BACKUP_DIR="/var/backups/fleet-management"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="postgres"
DB_USER="postgres"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U $DB_USER -Fc $DB_NAME > $BACKUP_DIR/fleet_db_$DATE.dump

# Keep only last 30 days of backups
find $BACKUP_DIR -name "fleet_db_*.dump" -mtime +30 -delete

echo "Backup completed: fleet_db_$DATE.dump"
```

```bash
# Make executable
chmod +x /usr/local/bin/backup-fleet-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-fleet-db.sh
```

### Restore from Backup

```bash
# Stop application
sudo systemctl stop nginx  # or apache2

# Restore database
pg_restore -U postgres -d postgres -c /var/backups/fleet-management/fleet_db_YYYYMMDD_HHMMSS.dump

# Restart application
sudo systemctl start nginx
```

---

## Monitoring and Maintenance

### Set Up Monitoring

```bash
# Install monitoring tools
sudo apt install postgresql-contrib monitoring-plugins

# Monitor disk space
df -h

# Monitor database size
psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('postgres'));"

# Monitor active connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
```

### Regular Maintenance Tasks

```sql
-- Run weekly (via cron)
VACUUM ANALYZE;

-- Check for bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10;

-- Update statistics
ANALYZE;
```

---

## Performance Tuning

### PostgreSQL Configuration

Edit `/etc/postgresql/14/main/postgresql.conf`:

```conf
# Memory settings (adjust based on your VPS RAM)
shared_buffers = 1GB                    # 25% of RAM
effective_cache_size = 3GB              # 75% of RAM
work_mem = 16MB
maintenance_work_mem = 256MB

# Connection settings
max_connections = 100

# Logging
log_min_duration_statement = 1000       # Log slow queries (>1s)
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

Restart PostgreSQL after changes:
```bash
sudo systemctl restart postgresql
```

---

## Support and Resources

### Official Documentation
- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Mapbox Docs**: https://docs.mapbox.com/

### Community
- **GitHub Issues**: Report bugs or request features
- **Discord**: Join community discussions
- **Stack Overflow**: Tag with `supabase`, `postgresql`

### Professional Support
For enterprise support, contact: support@your-company.com

---

## Conclusion

Your Fleet Management System is now deployed on your self-hosted Supabase VPS! 

**Next Steps:**
1. Create your admin account (first signup)
2. Configure organization settings
3. Add vehicles and drivers
4. Set up integrations (ERPNext, etc.)
5. Configure alert rules
6. Train your team

**Important Reminders:**
- Set up regular backups
- Monitor logs for errors
- Keep system updated
- Review security regularly

For questions or issues, refer to the troubleshooting section or contact support.

---

**Version:** 1.0  
**Last Updated:** January 2025  
**License:** Proprietary
