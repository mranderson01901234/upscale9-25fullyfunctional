#!/bin/bash

# Revert Display Dimensions Fix Script
# This script restores the original image-presentation-manager.js file

echo "🔄 Reverting Display Dimensions Fix..."

# Find the most recent backup
BACKUP_FILE=$(ls -t /home/mranderson/desktophybrid/pro-upscaler/client/js/image-presentation-manager.js.backup-* 2>/dev/null | head -n1)

if [ -z "$BACKUP_FILE" ]; then
    echo "❌ No backup file found!"
    echo "Available backups:"
    ls -la /home/mranderson/desktophybrid/pro-upscaler/client/js/image-presentation-manager.js.backup-* 2>/dev/null || echo "  None found"
    exit 1
fi

echo "📁 Found backup: $BACKUP_FILE"
echo "📁 Restoring to: /home/mranderson/desktophybrid/pro-upscaler/client/js/image-presentation-manager.js"

# Create a backup of the current (fixed) version
cp /home/mranderson/desktophybrid/pro-upscaler/client/js/image-presentation-manager.js /home/mranderson/desktophybrid/pro-upscaler/client/js/image-presentation-manager.js.fixed-version-backup

# Restore the original
cp "$BACKUP_FILE" /home/mranderson/desktophybrid/pro-upscaler/client/js/image-presentation-manager.js

echo "✅ Revert completed!"
echo "📄 Original file restored"
echo "💾 Fixed version backed up as: image-presentation-manager.js.fixed-version-backup"
echo ""
echo "🚀 Restart your application to see the changes take effect" 