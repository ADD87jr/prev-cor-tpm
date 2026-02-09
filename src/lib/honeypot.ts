/**
 * Honeypot anti-spam protection
 * 
 * Honeypot fields are hidden form fields that humans don't see/fill,
 * but bots automatically fill them. If filled, we know it's a bot.
 * 
 * Usage in forms:
 * 1. Add a hidden field with name from HONEYPOT_FIELD_NAME
 * 2. Style it with CSS to be invisible (not display:none, bots detect that)
 * 3. Check on server with isHoneypotTriggered()
 */

// The honeypot field name - make it look like a real field
export const HONEYPOT_FIELD_NAME = "website_url";

/**
 * Check if honeypot was triggered (bot detected)
 * Returns true if the honeypot field was filled (bot detected)
 */
export function isHoneypotTriggered(formData: Record<string, any>): boolean {
  const honeypotValue = formData[HONEYPOT_FIELD_NAME];
  
  // If honeypot field has any value, it's a bot
  if (honeypotValue && honeypotValue.trim() !== "") {
    console.log("[HONEYPOT] Bot detected! Field was filled with:", honeypotValue);
    return true;
  }
  
  return false;
}

/**
 * Validate honeypot and return error response if triggered
 * Returns null if OK, NextResponse with error if bot detected
 */
export function checkHoneypot(formData: Record<string, any>): { isBot: boolean } {
  return { isBot: isHoneypotTriggered(formData) };
}

/**
 * CSS to hide honeypot field (use in global styles or component)
 * Using multiple techniques to hide from humans but not from bots
 */
export const HONEYPOT_CSS = `
  .honeypot-field {
    opacity: 0;
    position: absolute;
    top: 0;
    left: 0;
    height: 0;
    width: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
  }
`;
