import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getShopFromUrl } from "../services/api";

/**
 * Live support chat widget (Crisp ke Tawk.to) - ek script, bottom-right ma chat bubble.
 *
 * .env ma provider select karo:
 *   VITE_SUPPORT_CHAT_PROVIDER=crisp          # ke  tawk
 *   VITE_CRISP_WEBSITE_ID=xxxxxxxx-xxxx-...   # Crisp > Settings > Website settings > Setup instructions
 *   VITE_TAWK_PROPERTY_ID=xxxxxxxxxxxxxxxx    # Tawk.to > Administration > Channels > Chat Widget (embed code ma)
 *   VITE_TAWK_WIDGET_ID=default               # embed code ni last path (mostly "default" ke 1xxxxxxxx)
 * Provider ke ID khali hoy to kai load nathi thatu.
 *
 * Merchant no shop domain chat ma attach thay chhe, jethi support ne khabar pade kon store chhe.
 */

// Je pages par chat batavvi j nathi
const SKIP_PATHS = ["/login"];

function loadScript(id, src, attrs = {}) {
  if (document.getElementById(id)) return;
  const s = document.createElement("script");
  s.id = id;
  s.src = src;
  s.async = true;
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  document.head.appendChild(s);
}

// Pure function (env param) - test karvu saru. Return: true jo widget start thayu.
export function startSupportChat(env, shop) {
  const provider = String(env.VITE_SUPPORT_CHAT_PROVIDER || "").toLowerCase();

  if (provider === "crisp") {
    const id = env.VITE_CRISP_WEBSITE_ID;
    if (!id) return false;
    window.$crisp = window.$crisp || [];
    window.CRISP_WEBSITE_ID = id;
    if (shop) {
      window.$crisp.push(["set", "user:nickname", [shop]]);
      window.$crisp.push(["set", "session:data", [[["shop", shop]]]]);
    }
    loadScript("support-chat-crisp", "https://client.crisp.chat/l.js");
    return true;
  }

  if (provider === "tawk") {
    const property = env.VITE_TAWK_PROPERTY_ID;
    const widget = env.VITE_TAWK_WIDGET_ID || "default";
    if (!property) return false;
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_API.onLoad = () => {
      if (shop) window.Tawk_API.setAttributes?.({ name: shop }, () => {});
    };
    loadScript("support-chat-tawk", `https://embed.tawk.to/${property}/${widget}`, { crossorigin: "*" });
    return true;
  }

  return false;
}

export default function SupportChat() {
  const { pathname } = useLocation();
  const skip = SKIP_PATHS.includes(pathname);

  useEffect(() => {
    if (skip) return;
    // Script ek j vaar load thay chhe (route badlay to pan chat chalu rahe)
    startSupportChat(import.meta.env, getShopFromUrl());
  }, [skip]);

  return null;
}
