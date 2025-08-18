# PowerShell script to fix environment variables
# Run this script in your project directory

Write-Host "Fixing environment variables..." -ForegroundColor Green

# Create the correct .env.local content
$envContent = @"
NEXT_PUBLIC_SUPABASE_URL=https://itdmwpbsnviassgqfhxk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml0ZG13cGJzbnZpYXNzZ3FmaHhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM0ODU5NjUsImV4cCI6MjA2OTA2MTk2NX0.pxAXREQJrXJFZEBB3s7iwfm3rV_C383EbWCwf6ayPQo
"@

# Write the content to .env.local
$envContent | Out-File -FilePath ".env.local" -Encoding UTF8

Write-Host "Environment variables fixed!" -ForegroundColor Green
Write-Host "Please restart your development server for changes to take effect." -ForegroundColor Yellow
