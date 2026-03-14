# Domain Setup Guide for www.dles365.com

This guide will help you set up the custom domain www.dles365.com for your DaylightES365 application hosted on Netlify.

## Prerequisites

1. Domain `dles365.com` registered with a domain registrar
2. Access to your DNS settings
3. Application deployed on Netlify

## DNS Configuration for Netlify

Your site is hosted on Netlify:

1. Go to your Netlify site dashboard
2. Navigate to "Domain settings" or "Domain management"
3. Click "Add custom domain"
4. Add both `www.dles365.com` and `dles365.com`
5. Configure the following DNS records at your domain registrar:

**For www subdomain (recommended primary):**
```
Type: CNAME
Name: www
Value: [your-site-name].netlify.app
```

**For apex domain (dles365.com):**
```
Type: A
Name: @
Value: 75.2.60.5
```

Alternatively, if your DNS provider supports ALIAS or ANAME records for the apex domain:
```
Type: ALIAS or ANAME
Name: @
Value: [your-site-name].netlify.app
```

Netlify will automatically provision an SSL certificate and handle redirects.

## SSL Certificate

Netlify automatically provisions SSL certificates for all custom domains via Let's Encrypt. No action needed.

## Environment Variables

No changes needed to environment variables. The application will work with any domain.

## Desktop App Downloads

The desktop applications (Gamer and Miner apps) should be uploaded to:

```
https://www.dles365.com/downloads/
```

Required files:
- DaylightES365-Gamer-Setup.exe (Windows)
- DaylightES365-Gamer.dmg (macOS)
- DaylightES365-Gamer.AppImage (Linux)
- DaylightES365-Miner-Setup.exe (Windows)
- DaylightES365-Miner.dmg (macOS)
- DaylightES365-Miner.AppImage (Linux)

Build these files using:
```bash
npm run electron:build:all
```

Then upload the built installers from `dist-electron/gamer/` and `dist-electron/miner/` to your hosting provider's downloads folder.

## Verification

After DNS propagation (can take 24-48 hours):

1. Visit https://www.dles365.com
2. Verify SSL certificate is active (lock icon in browser)
3. Test all features:
   - User registration/login
   - Streaming functionality
   - Marketplace
   - Wallet operations
   - Desktop app downloads at /downloads

## Troubleshooting

### DNS Not Resolving
- Wait 24-48 hours for DNS propagation
- Use `nslookup www.dles365.com` to check DNS status
- Use `dig www.dles365.com` for detailed DNS info
- Verify DNS records are correct at your registrar
- Clear your DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

### SSL Certificate Issues
- Ensure HTTPS redirect is enabled on your host
- Check that SSL certificate has been provisioned
- Wait a few minutes after adding domain for certificate generation

### Application Not Loading
- Clear browser cache
- Check that the build deployed successfully
- Verify redirect rules are working (check _redirects file)

### Desktop App Downloads Not Working
- Ensure files are uploaded to the correct location
- Check file permissions on hosting provider
- Verify download links are publicly accessible

## Support

For Netlify domain setup issues, see: https://docs.netlify.com/domains-https/custom-domains/
