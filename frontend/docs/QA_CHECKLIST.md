# ConversationalCommerce QA Checklist

This document is for anyone (even non-technical users) to help test the platform. For every new build or feature, add a note here and check off each item as you test it.

---

## How to Use This Checklist
- Read each step and follow the instructions.
- If something doesn't work as described, write a note in the 'Tester Notes' section below.
- Check the box `[x]` when a test passes, or leave it `[ ]` if it fails or needs review.
- Add your own notes or new tests as you go!

---

## 1. Signup & Login
- [ ] Can you sign up as a new user with email/phone?
- [ ] Do you receive a confirmation email or code (if required)?
- [ ] Can you log in with your new account?
- [ ] Can you log out and log back in?
- [ ] Are error messages clear if you enter wrong credentials?
- [ ] Can you reset your password?
- [ ] Can you change your password from your profile?

---

## 2. Store Creation & Onboarding
- [ ] Can you create a new store/tenant after signup?
- [ ] Is the onboarding wizard easy to follow (business info, KYC, domain, team invite)?
- [ ] Can you upload KYC documents and see status updates?
- [ ] Can you set a custom domain or subdomain?
- [ ] Can you invite team members by email or phone?
- [ ] Can you resume onboarding if you leave and come back?
- [ ] Are errors shown clearly if you enter invalid info?

---

## 3. Product Management
- [ ] Can you add a new product (with photo, title, price)?
- [ ] Can you edit and delete products?
- [ ] Is the product list easy to browse and search?
- [ ] Is the empty state clear when there are no products?
- [ ] Can you share a product via WhatsApp, Instagram, TikTok, or Copy Link?

---

## 4. Storefront Access & Customization
- [ ] Can you access your store's public page (storefront)?
- [ ] Does the store load on both desktop and mobile?
- [ ] Can you customize the storefront (logo, banner, theme)?
- [ ] Are changes visible immediately after saving?
- [ ] Can you preview the store as a buyer?

---

## 5. Orders & Checkout
- [ ] Can you add products to the cart as a buyer?
- [ ] Can you view and edit the cart?
- [ ] Can you proceed to checkout and enter shipping info?
- [ ] Are all payment options visible and selectable?
- [ ] Can you place an order and see a confirmation?
- [ ] Do you receive order confirmation (email/SMS/notification)?
- [ ] Can you view your order history as a buyer?
- [ ] Can you cancel or return an order (if allowed)?

---

## 6. Payments (Including Test Mode)
- [ ] Can you enable/disable each payment provider in Payment Settings?
- [ ] Can you enable Test Mode for each provider?
- [ ] Is the test mode banner and test card instructions visible at checkout?
- [ ] Can you pay with the test card for each provider (no real charge)?
- [ ] Does a real card fail in test mode?
- [ ] Does a real card work when test mode is off and provider is live?
- [ ] Are payment errors and confirmations clear?

---

## 7. Team Management
- [ ] Can you invite team members (by email/phone)?
- [ ] Can invited members accept and join the team?
- [ ] Can you assign roles/permissions to team members?
- [ ] Can you remove or change a team member's role?
- [ ] Are permissions enforced (e.g., only admins can change settings)?

---

## 8. Analytics & Dashboard
- [ ] Does the dashboard show real-time sales, orders, and analytics?
- [ ] Are charts and stats accurate and up to date?
- [ ] Are loading, error, and empty states clear?
- [ ] Can you filter or drill down into analytics?

---

## 9. Notifications & Communication
- [ ] Do you receive notifications for key events (order placed, payment received, KYC status, etc.)?
- [ ] Are notifications clear and actionable?
- [ ] Can you opt in/out of email/SMS notifications?

---

## 10. Mobile Optimization & Accessibility
- [ ] Is the app easy to use on both desktop and mobile?
- [ ] Are touch targets sufficiently large on mobile (min. 44x44px)?
- [ ] Does the app perform well on low-end Android devices (Android 5-7, 1GB RAM)?
- [ ] Does the app load efficiently over slow connections (2G/3G)?
- [ ] Does the app work properly in offline mode where applicable?
- [ ] Are offline indicators clearly visible when working without connectivity?
- [ ] Are critical analytics and dashboard features usable on mobile screens?
- [ ] Does the app conserve battery by minimizing background processes?
- [ ] Are images and assets properly optimized for low bandwidth?
- [ ] Is font size readable on small screens without zooming?
- [ ] Does the app adjust layout appropriately for different screen sizes?
- [ ] Are error messages helpful and properly displayed on mobile?
- [ ] Is the app accessible (screen reader, keyboard navigation, color contrast)?
- [ ] Can all critical user flows be completed on mobile devices?
- [ ] Does the app perform well in variable network conditions (test with throttling)?

---

## Tester Notes (Add issues, questions, or suggestions here)
-

---

## Add New Tests Here
- [ ]

---

Thank you for helping test ConversationalCommerce! Your feedback makes the platform better for everyone.