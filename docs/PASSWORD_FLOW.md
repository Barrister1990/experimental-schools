# Password Management Flow

This document describes the complete password management flow for the Hohoe Experimental Schools Management System, ready for Supabase integration.

## Overview

The password management system handles:
1. **First-time password setup** (after admin creates account)
2. **Regular password change** (from settings)
3. **Password reset** (forgot password flow)
4. **Email verification** (required before first login)

## Architecture

### Service Layer (`lib/services/password-service.ts`)

The `PasswordService` class provides an abstraction layer that can be easily swapped for Supabase implementation. Currently uses mock services, but includes TODO comments showing exactly where to add Supabase code.

**Methods:**
- `changePassword()` - Change password (first-time or regular)
- `requestPasswordReset()` - Request password reset email
- `resetPassword()` - Reset password with token from email
- `verifyEmail()` - Verify email with token
- `isEmailVerified()` - Check email verification status
- `needsPasswordChange()` - Check if password change is required

### Pages

1. **`/change-password`** - Password change page
   - Supports first-time password setup (`?firstTime=true`)
   - Supports regular password change
   - Includes password strength indicator
   - Shows password requirements checklist

2. **`/reset-password`** - Password reset page
   - Accessed via token from email link
   - Includes password strength indicator
   - Shows password requirements checklist

3. **`/verify-email`** - Email verification page
   - Auto-verifies if token is present
   - Redirects to password change if first-time login
   - Redirects to login if already verified

4. **`/forgot-password`** - Forgot password request page
   - User enters email
   - Sends password reset email
   - Shows success message

## User Flows

### Flow 1: Admin Creates Teacher Account

1. Admin creates teacher account via `/admin/teachers/new`
2. System creates user account with:
   - Email verification: `false` (pending)
   - Password change: `false` (required)
   - Temporary password generated
3. Teacher receives email verification link
4. Teacher clicks link → `/verify-email?token=xxx&email=xxx`
5. Email verified → Redirects to `/change-password?email=xxx&firstTime=true`
6. Teacher sets password → Redirects to login
7. Teacher logs in → Access granted

### Flow 2: Regular Password Change

1. User logged in → Navigate to settings
2. User clicks "Change Password"
3. Redirects to `/change-password?email=xxx`
4. User enters current password + new password
5. Password changed → Redirects to login
6. User logs in with new password

### Flow 3: Forgot Password

1. User clicks "Forgot Password" on login page
2. Redirects to `/forgot-password`
3. User enters email
4. System sends password reset email with token
5. User clicks link in email → `/reset-password?token=xxx`
6. User enters new password
7. Password reset → Redirects to login
8. User logs in with new password

### Flow 4: Email Verification (Standalone)

1. User receives verification email
2. User clicks link → `/verify-email?token=xxx&email=xxx`
3. Email verified → Redirects based on status:
   - If password change needed → `/change-password?email=xxx&firstTime=true`
   - Otherwise → Login page

## Supabase Integration Guide

### Step 1: Update `password-service.ts`

Replace mock implementations with Supabase calls:

```typescript
// Change Password
async changePassword(email: string, request: PasswordChangeRequest, isFirstTime: boolean) {
  if (isFirstTime) {
    // First-time password setup
    const { error } = await supabase.auth.updateUser({
      password: request.newPassword
    });
    if (error) throw error;
  } else {
    // Regular password change - verify current password first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: request.currentPassword
    });
    if (signInError) throw new Error('Current password is incorrect');
    
    const { error } = await supabase.auth.updateUser({
      password: request.newPassword
    });
    if (error) throw error;
  }
}

// Request Password Reset
async requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });
  if (error) throw error;
}

// Reset Password (from email link)
async resetPassword(token: string, newPassword: string) {
  // Supabase handles this automatically via the redirect URL
  // The token is in the URL hash, Supabase extracts it
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });
  if (error) throw error;
}

// Verify Email
async verifyEmail(token: string) {
  const { error } = await supabase.auth.verifyOtp({
    token_hash: token,
    type: 'email',
  });
  if (error) throw error;
}

// Check Email Verification
async isEmailVerified(email: string) {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email_confirmed_at !== null;
}

// Check Password Change Required
async needsPasswordChange(email: string) {
  const { data: { user } } = await supabase.auth.getUser();
  // Check user metadata or a custom field
  return user?.user_metadata?.password_changed === false;
}
```

### Step 2: Update Email Templates

Configure Supabase email templates:
- **Email Verification**: Include link to `/verify-email?token={{ .TokenHash }}&email={{ .Email }}`
- **Password Reset**: Include link to `/reset-password?token={{ .TokenHash }}`

### Step 3: Update User Creation

When admin creates teacher account:

```typescript
// In mock-data-service.ts addTeacher method
const { data, error } = await supabase.auth.admin.createUser({
  email: teacherData.email,
  password: generateTempPassword(), // Temporary password
  email_confirm: false, // Require email verification
  user_metadata: {
    name: teacherData.name,
    phone: teacherData.phone,
    password_changed: false, // Require password change
  },
});
```

### Step 4: Environment Variables

Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Security Considerations

1. **Password Requirements**: Enforced on frontend and backend
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number

2. **Token Expiration**: Supabase handles token expiration automatically

3. **Rate Limiting**: Implement rate limiting for password reset requests

4. **Email Verification**: Required before first login

5. **Password Change**: Required on first login after account creation

## Testing Checklist

- [ ] Admin creates teacher account
- [ ] Teacher receives verification email
- [ ] Teacher verifies email
- [ ] Teacher sets password on first login
- [ ] Teacher logs in successfully
- [ ] User changes password from settings
- [ ] User requests password reset
- [ ] User resets password via email link
- [ ] User logs in with new password
- [ ] Error handling for invalid tokens
- [ ] Error handling for expired tokens
- [ ] Password strength indicator works
- [ ] Password requirements validation works

## Future Enhancements

1. **Password History**: Prevent reusing last N passwords
2. **Two-Factor Authentication**: Add 2FA support
3. **Password Expiration**: Force password change after X days
4. **Account Lockout**: Lock account after failed login attempts
5. **Security Questions**: Alternative password recovery method

