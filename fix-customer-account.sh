#!/bin/bash
# Quick fix script to disable customer account GraphQL imports

echo "🔧 Fixing customer account imports..."

# Files that need customer account imports disabled
files=(
  "app/routes/account.orders._index.jsx"
  "app/routes/(\$locale).account.orders._index.jsx"
  "app/routes/account.orders.\$id.jsx"
  "app/routes/(\$locale).account.orders.\$id.jsx"
  "app/routes/account.profile.jsx"
  "app/routes/(\$locale).account.profile.jsx"
  "app/routes/account.addresses.jsx"
  "app/routes/(\$locale).account.addresses.jsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Processing $file..."
    
    # Comment out customer account imports
    sed -i 's|import.*~/graphql/customer-account/.*|// TODO: Fix customer account GraphQL - &|g' "$file"
    
    # Add TODO comment at the top
    sed -i '1i// TODO: Customer account functionality temporarily disabled due to GraphQL schema issues' "$file"
    
    echo "✅ Fixed $file"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 Customer account import fixes complete!"
echo "📖 See docs/BUILD_FIXES_APPLIED.md for details"
