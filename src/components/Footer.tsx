import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface SocialLink {
  platform: string
  profile_url: string
  platform_username: string
}

export function Footer() {
  const currentYear = new Date().getFullYear()
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])

  useEffect(() => {
    loadSocialLinks()
  }, [])

  const loadSocialLinks = async () => {
    const { data } = await supabase
      .from('social_media_connections')
      .select('platform, profile_url, platform_username')
      .eq('is_company_link', true)
      .eq('is_active', true)

    if (data) {
      setSocialLinks(data)
    }
  }

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        return '𝕏'
      case 'telegram':
        return '✈'
      case 'discord':
        return '♦'
      case 'instagram':
        return '📷'
      case 'youtube':
        return '▶'
      case 'tiktok':
        return '♪'
      case 'facebook':
        return 'f'
      case 'linkedin':
        return 'in'
      default:
        return '🔗'
    }
  }

  const getSocialColor = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        return '#1da1f2'
      case 'telegram':
        return '#0088cc'
      case 'discord':
        return '#5865f2'
      case 'instagram':
        return '#E4405F'
      case 'youtube':
        return '#FF0000'
      case 'tiktok':
        return '#000000'
      case 'facebook':
        return '#1877F2'
      case 'linkedin':
        return '#0A66C2'
      default:
        return '#3b82f6'
    }
  }

  return (
    <footer style={{
      marginTop: 'auto',
      padding: '2rem',
      borderTop: '1px solid rgba(148, 163, 184, 0.2)',
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <img
            src="/daylight-logo.jpg"
            alt="Daylight ES365"
            style={{
              height: '40px',
              width: 'auto',
              objectFit: 'contain'
            }}
          />
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Daylight ES365
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '2rem',
          fontSize: '0.875rem',
          color: '#94a3b8',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <a
            href="/terms"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            Terms of Service
          </a>
          <a
            href="/privacy"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            Privacy Policy
          </a>
          <a
            href="/support"
            style={{
              color: '#94a3b8',
              textDecoration: 'none',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            Support
          </a>
        </div>

        <div style={{
          fontSize: '0.875rem',
          color: '#64748b',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0.25rem 0' }}>
            © {currentYear} Daylight ES365. All rights reserved.
          </p>
          <p style={{ margin: '0.25rem 0', fontSize: '0.75rem' }}>
            DL365 Token • BSC Network • Decentralized Gaming & Computing Platform
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '1rem',
          fontSize: '1.5rem'
        }}>
          {socialLinks.map((link) => (
            <a
              key={link.platform}
              href={link.profile_url}
              target="_blank"
              rel="noopener noreferrer"
              title={`${link.platform}: @${link.platform_username}`}
              style={{
                color: '#94a3b8',
                transition: 'all 0.2s',
                textDecoration: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = getSocialColor(link.platform)
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#94a3b8'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              {getSocialIcon(link.platform)}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
