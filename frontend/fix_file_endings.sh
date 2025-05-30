#!/bin/bash

# Fix orders page
ORDERS_FILE="/Users/kess/Projects/ConversationalCommerce/frontend/src/app/dashboard/orders/[id]/page.tsx"
# Save the content of the file without the last line (which contains the closing brace)
head -n 622 "$ORDERS_FILE" > orders_temp.txt
# Add the closing brace with exactly one newline
echo "}" >> orders_temp.txt
# Replace the original file
mv orders_temp.txt "$ORDERS_FILE"

# Fix products page
PRODUCTS_FILE="/Users/kess/Projects/ConversationalCommerce/frontend/src/app/dashboard/products/[id]/page.tsx"
# Save the content of the file without the last line (which contains the closing brace)
head -n 328 "$PRODUCTS_FILE" > products_temp.txt
# Add the closing brace with exactly one newline
echo "}" >> products_temp.txt
# Replace the original file
mv products_temp.txt "$PRODUCTS_FILE"

echo "File endings fixed. Run 'npm run typecheck' to verify."

