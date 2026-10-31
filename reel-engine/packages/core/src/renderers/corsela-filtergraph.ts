import { SceneItem } from "../contracts/scene-ir.schema.js";

function sanitize(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "")
    .replace(/:/g, "\\:")
    .replace(/,/g, "\\,")
    .replace(/%/g, "%%");
}

function hexToFfmpegColor(hex: string): string {
  if (!hex) return "0x141413";
  const clean = hex.replace("#", "");
  return `0x${clean}`;
}

export function buildCorselaFiltergraph(
  scene: SceneItem,
  fps: number,
  durationSec: number,
  width: number = 1080,
  height: number = 1920
): string {
  const isDarkScene =
    scene.type === "beat" ||
    scene.layout === "dark_impact" ||
    scene.id.includes("urgency");

  const bgColor = isDarkScene ? "0x282726" : "0xF4F0EA";
  const cardBg = "0xFFFFFF";
  const accent = "0xC84B22";
  const cardBorder = "0xE6E0D5";
  const textColor = isDarkScene ? "0xF4F0EA" : "0x141413";

  const filters: string[] = [];

  // 1. Base canvas background
  filters.push(`color=c=${bgColor}:s=${width}x${height}:d=${durationSec}:r=${fps}`);

  // 2. Animated top & bottom kinetic sweep bars for continuous motion
  filters.push(
    `drawtext=text='━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━':fontsize=48:fontcolor=${accent}:x='-400+t*250':y=24`,
    `drawtext=text='REEL ENGINE 9\\:16 EDITORIAL':fontsize=22:fontcolor=${isDarkScene ? "0x6E6962" : "0x9E978E"}:x=65:y=60`,
    `drawtext=text='━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━':fontsize=36:fontcolor=${accent}:x='1080-t*250':y=1880`
  );

  // 3. Staggered events extraction
  const events: any[] = scene.events || [];
  let textEvents = events.filter((e) => (e.kind === "text_event" || e.text) && (e.text || e.description));

  // If scene has no granular text events, provide rich editorial defaults
  if (textEvents.length === 0) {
    if (scene.type === "hook") {
      textEvents = [
        { text: "What If $100/mo", y_px: 460, frame: scene.start_frame + Math.round(0.1 * fps), color: "#141413" },
        { text: "Became $1,000,000?", y_px: 560, frame: scene.start_frame + Math.round(0.4 * fps), color: "#C84B22", style: "hero" },
        { text: "The silent math of wealth.", y_px: 680, frame: scene.start_frame + Math.round(1.0 * fps), color: "#141413" },
      ];
    } else if (scene.type === "setup") {
      textEvents = [
        { text: "01  Save $100 every month", y_px: 460, frame: scene.start_frame + Math.round(0.2 * fps), color: "#141413" },
        { text: "02  Invest into index funds", y_px: 570, frame: scene.start_frame + Math.round(1.2 * fps), color: "#141413" },
        { text: "03  Reinvest all dividends", y_px: 680, frame: scene.start_frame + Math.round(2.2 * fps), color: "#C84B22", style: "hero" },
      ];
    } else if (scene.type === "proof") {
      textEvents = [
        { text: "Interest Earning Interest", y_px: 440, frame: scene.start_frame + Math.round(0.1 * fps), color: "#141413" },
        { text: "Year 10: $18,294 (Principal)", y_px: 530, frame: scene.start_frame + Math.round(0.5 * fps), color: "#141413" },
        { text: "Year 30: $149,036 (Compound)", y_px: 610, frame: scene.start_frame + Math.round(1.5 * fps), color: "#C84B22", style: "hero" },
        { text: "Year 40: $349,100+ (Exponential)", y_px: 690, frame: scene.start_frame + Math.round(2.5 * fps), color: "#C84B22", style: "hero" },
      ];
    } else if (scene.type === "beat") {
      textEvents = [
        { text: "Wait 10 Years to Start?", y_px: 460, frame: scene.start_frame + Math.round(0.1 * fps), color: "#F4F0EA" },
        { text: "Start at age 20 -> $1,200,000", y_px: 560, frame: scene.start_frame + Math.round(0.6 * fps), color: "#F4F0EA" },
        { text: "Start at age 30 -> $520,000", y_px: 640, frame: scene.start_frame + Math.round(1.6 * fps), color: "#C84B22", style: "hero" },
        { text: "Cost of delay: $680,000.", y_px: 730, frame: scene.start_frame + Math.round(2.6 * fps), color: "#C84B22", style: "hero" },
      ];
    } else {
      textEvents = [
        { text: "Start Small. Start Today.", y_px: 460, frame: scene.start_frame + Math.round(0.1 * fps), color: "#141413" },
        { text: "Time in market beats timing.", y_px: 560, frame: scene.start_frame + Math.round(0.8 * fps), color: "#141413" },
        { text: "Save this reel for later.", y_px: 840, frame: scene.start_frame + Math.round(2.0 * fps), color: "#6E6962" },
      ];
    }
  }

  if (isDarkScene) {
    // Dark Urgency / Impact Layout
    filters.push(
      `drawbox=x=65:y=300:w=950:h=10:color=${accent}:t=fill`,
      `drawtext=text='URGENCY / THE COST OF WAITING':fontsize=28:fontcolor=${accent}:x=65:y=340`
    );

    // Render text events
    let defaultY = 480;
    for (let i = 0; i < textEvents.length; i++) {
      const ev = textEvents[i];
      const relFrame = Math.max(0, ev.frame - scene.start_frame);
      const relTime = (relFrame / fps).toFixed(2);
      const y = ev.y_px || defaultY;
      defaultY = y + 100;
      const col = ev.color ? hexToFfmpegColor(ev.color) : (i === 1 ? accent : textColor);
      const size = i === 1 ? 64 : 46;
      const txt = sanitize(ev.text);

      filters.push(
        `drawtext=text='${txt}':fontsize=${size}:fontcolor=${col}:x=(w-text_w)/2:y=${y}:enable='gte(t,${relTime})'`
      );
    }

    // Dynamic delay comparison visual bars
    filters.push(
      `drawbox=x=120:y=800:w=700:h=20:color=${accent}:t=fill:enable='gte(t,0.6)'`,
      `drawbox=x=120:y=840:w=300:h=20:color=0x6E6962:t=fill:enable='gte(t,1.6)'`
    );
  } else {
    // Standard Warm Ivory & Floating White Editorial Card Layout
    const cardX = 65;
    const cardY = 320;
    const cardW = 950;
    const cardH = 960;

    // White floating card
    filters.push(
      `drawbox=x=${cardX}:y=${cardY}:w=${cardW}:h=${cardH}:color=${cardBg}:t=fill`,
      // Subtle card border
      `drawbox=x=${cardX}:y=${cardY}:w=${cardW}:h=${cardH}:color=${cardBorder}:t=2`,
      // Terracotta top accent line on card
      `drawbox=x=${cardX}:y=${cardY}:w=${cardW}:h=8:color=${accent}:t=fill`,
      // Step / Scene Category Tag
      `drawtext=text='${scene.type.toUpperCase()} / SCENE ${scene.id.toUpperCase()}':fontsize=28:fontcolor=${accent}:x=${cardX + 50}:y=${cardY + 40}`
    );

    // Staggered text events inside the card
    let defaultY = cardY + 110;
    for (let i = 0; i < textEvents.length; i++) {
      const ev = textEvents[i];
      const relFrame = Math.max(0, ev.frame - scene.start_frame);
      const relTime = (relFrame / fps).toFixed(2);
      const txt = sanitize(ev.text);
      const y = ev.y_px ? Math.max(cardY + 80, ev.y_px - 80) : defaultY;
      defaultY = y + 85;

      const isHighlight =
        ev.color?.toUpperCase() === "#C84B22" ||
        ev.style?.includes("hero") ||
        ev.style?.includes("accent") ||
        txt.includes("$1,000,000") ||
        txt.includes("Repeat") ||
        txt.includes("dividends");

      const col = isHighlight ? accent : textColor;
      const size = isHighlight ? 56 : (i === 0 ? 52 : 38);

      // Check if it's a numbered step (e.g. "01  ...")
      const stepMatch = txt.match(/^(0[1-9])\s*(.*)/);
      if (stepMatch) {
        const stepNum = stepMatch[1];
        const stepBody = stepMatch[2];
        // Pill badge for number
        filters.push(
          `drawbox=x=${cardX + 50}:y=${y}:w=60:h=40:color=${accent}:t=fill:enable='gte(t,${relTime})'`,
          `drawtext=text='${stepNum}':fontsize=26:fontcolor=white:x=${cardX + 66}:y=${y + 6}:enable='gte(t,${relTime})'`,
          `drawtext=text='${stepBody}':fontsize=38:fontcolor=${textColor}:x=${cardX + 130}:y=${y + 4}:enable='gte(t,${relTime})'`
        );
      } else {
        filters.push(
          `drawtext=text='${txt}':fontsize=${size}:fontcolor=${col}:x=(w-text_w)/2:y=${y}:enable='gte(t,${relTime})'`
        );
      }
    }

    // Special scene enhancements
    if (scene.type === "proof" || scene.id.includes("proof")) {
      // Dynamic mathematical / financial growth curve
      filters.push(
        `drawbox=x=${cardX + 50}:y=${cardY + 490}:w=${cardW - 100}:h=2:color=0x141413:t=fill`,
        // Kinetic curve tracker
        `drawtext=text='▲':fontsize=28:fontcolor=${accent}:x='${cardX + 60}+(t/${durationSec})*700':y='${cardY + 470}-pow(t/${durationSec},2)*150'`
      );
    } else if (scene.type === "cta_loop" || scene.id.includes("cta") || scene.type === "payoff") {
      // CTA Button
      const btnY = cardY + 620;
      filters.push(
        `drawbox=x=${cardX + 80}:y=${btnY}:w=${cardW - 160}:h=90:color=${accent}:t=fill:enable='gte(t,1.0)'`,
        `drawtext=text='Start Investing Now ->':fontsize=38:fontcolor=white:x=(w-text_w)/2:y=${btnY + 24}:enable='gte(t,1.0)'`
      );
    }
  }

  // Ensure standard pixel format
  filters.push("format=yuv420p");

  return filters.join(",");
}
