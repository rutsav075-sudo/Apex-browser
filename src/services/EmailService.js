/**
 * Email Service — Bug Report / Issue Reporting
 * Uses Web3Forms API (free tier: 250 emails/month, no SDK needed)
 * 
 * Setup:
 * 1. Go to https://web3forms.com/
 * 2. Enter your email (apex.org.91@gmail.com) and click "Create Access Key"
 * 3. Check your inbox for the access key and paste it in .env as VITE_WEB3FORMS_KEY
 * 
 * Fallback: If Web3Forms is not configured, it also checks for EmailJS config,
 * and finally falls back to opening the user's mail client (mailto:).
 */

const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY;
const RECIPIENT_EMAIL = 'apex.org.91@gmail.com';

// Legacy EmailJS fallback keys (kept for backward compatibility)
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * Check if any email service is configured
 */
export const isEmailConfigured = () => {
  // Web3Forms check
  if (WEB3FORMS_KEY && WEB3FORMS_KEY !== 'your_web3forms_key') {
    return true;
  }
  // Legacy EmailJS check
  if (EMAILJS_SERVICE_ID && EMAILJS_SERVICE_ID !== 'your_service_id' &&
      EMAILJS_TEMPLATE_ID && EMAILJS_TEMPLATE_ID !== 'your_template_id' &&
      EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'your_public_key') {
    return true;
  }
  return false;
};

/**
 * Collect system information automatically
 */
const getSystemInfo = () => {
  const nav = navigator;
  return [
    `Apex Browser v1.0.0`,
    `Platform: ${nav.platform || 'Unknown'}`,
    `User Agent: ${nav.userAgent}`,
    `Language: ${nav.language}`,
    `Screen: ${screen.width}x${screen.height} (${window.devicePixelRatio}x)`,
    `Window: ${window.innerWidth}x${window.innerHeight}`,
    `Online: ${nav.onLine}`,
    `Memory: ${nav.deviceMemory ? nav.deviceMemory + ' GB' : 'N/A'}`,
    `Cores: ${nav.hardwareConcurrency || 'N/A'}`,
  ].join('\n');
};

/**
 * Send a bug report
 * Priority: Web3Forms → EmailJS → mailto fallback
 * @param {Object} report
 * @param {string} report.category - Bug, Feature Request, Performance, UI/UX, Other
 * @param {string} report.description - User's description
 * @param {string} report.userEmail - Optional email for follow-up
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const sendBugReport = async ({ category, description, userEmail }) => {
  const systemInfo = getSystemInfo();

  // ── Method 1: Web3Forms (preferred) ──────────────────────────────────
  if (WEB3FORMS_KEY && WEB3FORMS_KEY !== 'your_web3forms_key') {
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          subject: `[Apex Browser] ${category} Report`,
          from_name: 'Apex Bug Reporter',
          name: userEmail || 'Anonymous User',
          email: userEmail || 'noreply@apex-browser.local',
          replyto: userEmail || RECIPIENT_EMAIL,
          message: `Category: ${category}\n\nDescription:\n${description}\n\n---\nReporter Email: ${userEmail || 'Not provided'}\n\nSystem Info:\n${systemInfo}\n\nTimestamp: ${new Date().toISOString()}`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[Web3Forms] Report sent successfully');
        return { success: true, message: 'Report sent successfully via Web3Forms!' };
      } else {
        console.error('[Web3Forms] Failed:', data);
        throw new Error(data.message || 'Web3Forms submission failed');
      }
    } catch (error) {
      console.error('[Web3Forms] Error:', error.message);
      // Fall through to EmailJS or mailto
    }
  }

  // ── Method 2: EmailJS (legacy fallback) ──────────────────────────────
  if (EMAILJS_SERVICE_ID && EMAILJS_SERVICE_ID !== 'your_service_id' &&
      EMAILJS_TEMPLATE_ID && EMAILJS_TEMPLATE_ID !== 'your_template_id' &&
      EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== 'your_public_key') {
    try {
      const emailjs = (await import('@emailjs/browser')).default;
      const templateParams = {
        category,
        description,
        user_email: userEmail || 'Not provided',
        system_info: systemInfo,
        timestamp: new Date().toISOString(),
        to_email: RECIPIENT_EMAIL,
      };

      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
      return { success: true, message: 'Report sent successfully via EmailJS!' };
    } catch (error) {
      console.error('[EmailJS] Send failed:', error);
      // Fall through to mailto
    }
  }

  // ── Method 3: mailto fallback (always works) ─────────────────────────
  try {
    const subject = encodeURIComponent(`[Apex Bug] ${category}`);
    const body = encodeURIComponent(
      `Category: ${category}\n\nDescription:\n${description}\n\nReporter: ${userEmail || 'Not provided'}\n\n---\nSystem Info:\n${systemInfo}`
    );
    const mailtoUrl = `mailto:${RECIPIENT_EMAIL}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_self');
    return {
      success: true,
      message: 'Opening email client to send report',
    };
  } catch (e) {
    console.error('[Mailto] Failed:', e);
    return {
      success: false,
      message: 'Failed to open email client. Please email apex.org.91@gmail.com manually.',
    };
  }
};

