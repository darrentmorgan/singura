# Test Credentials for SaaS X-Ray

**INTERNAL USE ONLY - DO NOT COMMIT TO PUBLIC REPO**

## Clerk Test Account

**Email**: `admin+clerk_test@example.com`  
**Password**: `Xk9mQ#7pL2wN$vR8zJ4hT`

**Purpose**: Automated testing with Chrome DevTools MCP and QA workflows

**Organization**: Test Organization (auto-created by Clerk)

**Permissions**: Full admin access

---

## Usage with Chrome DevTools MCP

```typescript
// Navigate to login
await browser.navigate('http://localhost:4200/login');

// Fill form
await browser.fill_form({
  fields: [
    { name: 'Email', type: 'textbox', ref: 'email-ref', value: 'admin+clerk_test@example.com' },
    { name: 'Password', type: 'textbox', ref: 'password-ref', value: 'Xk9mQ#7pL2wN$vR8zJ4hT' }
  ]
});

// Submit
await browser.click({element: 'Continue button', ref: 'button-ref'});
```

---

## Security Notes

- **Development only** - Not for production
- **Clerk development instance** - Uses test keys
- **No real data** - Safe for testing
- **Rotate password** if compromised

---

**Last Updated**: October 7, 2025  
**Created By**: Claude Code (automated testing setup)
