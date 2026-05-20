# Security Fixes Applied

## 1. Password Hashing with bcrypt
**Vulnerability**: Passwords were stored in plaintext in config.json
**Fix**: 
- Added bcrypt password hashing (cost factor 10)
- Passwords are now stored as bcrypt hashes
- Legacy plaintext passwords are automatically migrated to hashes on first login
- Updated `SetPassword()`, `UpdateSettings()`, and `UpdateBasicSettings()` to hash passwords
- Added `VerifyPassword()` function for secure password comparison

**Files Modified**:
- `config/config.go`: Added bcrypt import, password hashing functions

## 2. CORS Restriction for Admin Endpoints
**Vulnerability**: Admin API endpoints had wildcard CORS (`Access-Control-Allow-Origin: *`), allowing any website to call admin APIs
**Fix**:
- Restricted CORS to localhost origins only
- Only allows: `http://localhost:*`, `http://127.0.0.1:*`, `https://localhost:*`, `https://127.0.0.1:*`
- Added `Access-Control-Allow-Credentials: true` for secure cookie handling
- Prevents CSRF attacks from external websites

**Files Modified**:
- `proxy/handler.go`: Updated `handleAdminAPI()` with localhost-only CORS

## 3. Anti-Brute Force Protection
**Already Implemented**: 2-second delay on failed authentication attempts
**Status**: No additional changes needed - existing protection is adequate

## 4. Audit Logging
**Already Implemented**: Complete audit logging system tracks all admin actions
**Status**: No additional changes needed

## 5. Session Storage (Frontend)
**Already Implemented**: Admin password stored in sessionStorage (cleared on tab close) instead of localStorage
**Status**: No additional changes needed

## 6. Host Binding Restriction
**Already Implemented**: Host is locked to 127.0.0.1 and cannot be changed via API
**Status**: No additional changes needed

## Migration Notes

### For Existing Users
- Existing plaintext passwords will be automatically migrated to bcrypt hashes on first login
- No manual intervention required
- After migration, the config.json will contain bcrypt hashes (starting with `$2a$`)

### Password Format
- **Old**: `"password": "mypassword"`
- **New**: `"password": "$2a$10$abcdef..."`

## Testing Recommendations

1. **Test password authentication**: Verify login still works after upgrade
2. **Test CORS**: Verify admin panel only works from localhost
3. **Test migration**: Check that old plaintext passwords are migrated automatically
4. **Test brute force**: Verify 2-second delay on failed login attempts

## Security Best Practices

1. Use strong passwords (12+ characters, mixed case, numbers, symbols)
2. Only access admin panel from localhost
3. Use HTTPS in production (reverse proxy like nginx)
4. Regularly review audit logs for suspicious activity
5. Keep the software updated
