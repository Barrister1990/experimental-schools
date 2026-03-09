# Test Credentials

This document contains test credentials for the Hohoe Experimental Schools Management System.

## Available Test Accounts

### 1. Administrator Account
- **Email:** `admin@hohoe.edu.gh`
- **Password:** `admin123`
- **Role:** Admin
- **Access:** Full system access

### 2. Class Teacher Account
- **Email:** `teacher@hohoe.edu.gh`
- **Password:** `teacher123`
- **Role:** Class Teacher
- **Access:** 
  - My Class management
  - Student attendance (term summary)
  - Conduct & Interest evaluations
  - Grade entry
  - Student viewing

### 3. Subject Teacher Account
- **Email:** `subjectteacher@hohoe.edu.gh`
- **Password:** `teacher123`
- **Role:** Subject Teacher
- **Access:**
  - Grade entry for assigned subjects
  - Assessment creation
  - Student viewing
  - Analytics

## Login Instructions

1. Navigate to the login page (home page: `/`)
2. Enter one of the email addresses above
3. Enter the corresponding password
4. Click "Sign in"

## First-Time Login Flow (For New Accounts)

When an admin creates a new teacher account, the teacher will need to:

1. **Verify Email:**
   - Teacher receives email verification link
   - Click link or navigate to `/verify-email?token=xxx&email=xxx`
   - Email is verified

2. **Change Password:**
   - After email verification, teacher is redirected to password change page
   - Or navigate to `/change-password?email=xxx&firstTime=true`
   - Set a new password (min 8 characters, must include uppercase, lowercase, and number)

3. **Login:**
   - After password change, teacher can login with new password

## Testing Different Roles

### To Test as Admin:
```
Email: admin@hohoe.edu.gh
Password: admin123
```

### To Test as Class Teacher:
```
Email: teacher@hohoe.edu.gh
Password: teacher123
```

### To Test as Subject Teacher:
```
Email: subjectteacher@hohoe.edu.gh
Password: teacher123
```

## Creating New Teacher Accounts

Admins can create new teacher accounts via:
- `/admin/teachers/new`

The new teacher will:
1. Receive email verification link
2. Need to verify email
3. Need to change password on first login

## Notes

- All test accounts are pre-verified and have passwords set for easy testing
- In production, new accounts will require email verification and password change
- Passwords are stored in plain text in mock service (for testing only)
- In production with Supabase, passwords will be hashed

## Resetting Test Data

If you need to reset the mock data:
- Clear browser localStorage/sessionStorage
- Restart the development server
- Mock data will reset to initial state

