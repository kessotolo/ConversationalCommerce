# Chat NLP Flow Documentation

## Overview

This document details the Natural Language Processing (NLP) flow for chat-based interactions, including recognized intents, entities, and fallback mechanisms.

## Recognized Intents

### Core Shopping Intents

1. **Browse Products**

   - Examples:
     - "Show me shoes"
     - "What jackets do you have?"
   - Entities:
     - `product_type`: shoes, jackets, etc.
     - `attributes`: color, size, brand

2. **Add to Cart**

   - Examples:
     - "Add 2 red shirts to cart"
     - "I'll take the blue one"
   - Entities:
     - `quantity`: number
     - `product_reference`: this, the blue one, etc.
     - `size`: S, M, L, etc.

3. **Checkout**
   - Examples:
     - "I'm ready to checkout"
     - "Let's complete my purchase"
   - Triggers:
     - Order confirmation flow
     - Payment collection

### Support Intents

1. **Order Status**

   - Examples:
     - "Where's my order?"
     - "Status of order #123"

2. **Returns/Refunds**
   - Examples:
     - "I want to return my order"
     - "How do I get a refund?"

## Fallback Flows

### Unclear Intent

1. **Clarification**

   - Response: "I'm not sure I understand. Did you want to:
     1. Browse products
     2. Check order status
     3. Get help with returns"

2. **Contextual Suggestions**
   - If previous message was about products: "Would you like to see more details about this product?"
   - If in checkout: "Would you like to complete your purchase or keep shopping?"

### Error Recovery

1. **Payment Failures**

   - Automatic retry with different payment method
   - Fallback to cash on delivery if available

2. **Out of Stock**
   - Suggest similar products
   - Offer to notify when back in stock

## Sample Conversations

### Successful Purchase

```
User: Show me running shoes
Bot: Here are our top running shoes:
1. Nike Air Zoom - $120
2. Adidas Ultraboost - $160

User: I'll take the Nike in size 10
Bot: Added Nike Air Zoom (Size 10) to your cart. Would you like to checkout?

User: Yes
Bot: Great! Could you please confirm your shipping address?
```

### Fallback Example

```
User: I want something for my phone
Bot: I'm not sure what you're looking for. Did you want to:
1. Browse phone cases
2. Look at mobile accessories
3. See our latest phones

User: 3
Bot: Here are our latest smartphones...
```

## NLP Configuration

### Training Data

```yaml
intents:
  - name: browse_products
    examples:
      - 'Show me {product_type}'
      - 'What {product_type} do you have'
    responses:
      - 'Here are our {product_type}...'

entities:
  - name: product_type
    examples:
      - 'shoes'
      - 'jackets'
      - 'phones'
```

### Confidence Thresholds

- High: >0.8 - Direct match
- Medium: 0.5-0.8 - Ask for confirmation
- Low: <0.5 - Request clarification

## Integration Points

### Webhook Payload

```json
{
  "message": "Show me red shoes",
  "intent": {
    "name": "browse_products",
    "confidence": 0.92
  },
  "entities": [
    {
      "entity": "color",
      "value": "red",
      "confidence": 0.95
    },
    {
      "entity": "product_type",
      "value": "shoes",
      "confidence": 0.98
    }
  ],
  "context": {
    "session_id": "abc123",
    "previous_intent": "greeting"
  }
}
```

## Testing

### Test Cases

1. **Basic Intent Recognition**

   - Input: "Show me shoes"
   - Expected: `browse_products` intent with `product_type: shoes`

2. **Entity Extraction**

   - Input: "I want a large blue t-shirt"
   - Expected:
     - `size: large`
     - `color: blue`
     - `product_type: t-shirt`

3. **Fallback Handling**
   - Input: "asdfghjkl"
   - Expected: Clarification prompt

## Best Practices

### Message Design

- Keep responses concise
- Use buttons for common options
- Include typing indicators for longer responses

### Error Handling

- Always provide next steps
- Include human handoff option
- Log all failures for improvement

## Performance Metrics

- Intent recognition accuracy
- Fallback rate
- User satisfaction (thumbs up/down)
- Resolution rate

## Maintenance

- Weekly review of failed interactions
- Monthly model retraining
- Quarterly intent/entity updates based on trends

## Support

For issues with the NLP system:

1. Check the error logs
2. Verify training data
3. Test with the NLU debugger
4. Contact support if issue persists
