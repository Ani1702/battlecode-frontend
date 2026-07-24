export interface ShareCanvasOptions {
  variant: "win" | "loss";
  cyclesToWin?: number;
  playerLivesRemaining?: number;
  shareEventDate: string;
}

const WIDTH = 1080;
const HEIGHT = 1920;
const LOGO_PATH = "/simulation/battlecode-logo.webp";
const QR_PATH = "/battlecode_qr_black.webp";
const QR_FALLBACK_PATH = "/battlecode_qr.webp";

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export async function renderShareCanvas(
  options: ShareCanvasOptions,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create canvas context");
  }

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#111111");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "rgba(249, 115, 22, 0.35)";
  ctx.lineWidth = 8;
  drawRoundedRect(ctx, 60, 60, WIDTH - 120, HEIGHT - 120, 32);
  ctx.stroke();

  const logo = await loadImage(LOGO_PATH);
  if (logo) {
    const logoWidth = 420;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    ctx.drawImage(logo, (WIDTH - logoWidth) / 2, 120, logoWidth, logoHeight);
  } else {
    ctx.fillStyle = "#F97316";
    ctx.font = "bold 72px Orbitron, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BATTLECODE", WIDTH / 2, 220);
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 56px Orbitron, sans-serif";
  ctx.textAlign = "center";

  if (options.variant === "win") {
    ctx.fillText(
      `I beat the robot in ${options.cyclesToWin ?? 0} moves`,
      WIDTH / 2,
      760,
    );
    ctx.font = "48px Oxanium, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(
      `${options.playerLivesRemaining ?? 0} lives remaining`,
      WIDTH / 2,
      860,
    );
  } else {
    ctx.fillText("I battled the BattleCode bot", WIDTH / 2, 760);
    ctx.font = "48px Oxanium, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText("Think you can do better?", WIDTH / 2, 860);
  }

  ctx.fillStyle = "#FDBA74";
  ctx.font = "40px Oxanium, sans-serif";
  ctx.fillText(`BattleCode on ${options.shareEventDate}`, WIDTH / 2, 1580);

  const qr = (await loadImage(QR_PATH)) ?? (await loadImage(QR_FALLBACK_PATH));
  if (qr) {
    const qrSize = 220;
    const qrX = (WIDTH - qrSize) / 2;
    const qrY = 1180;

    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "32px Oxanium, sans-serif";
    ctx.fillText("Scan to play", WIDTH / 2, qrY + qrSize + 56);
    ctx.fillText("@ieeecs_vit", WIDTH / 2, qrY + qrSize + 104);
  }

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to create image blob"));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function nativeShare(blob: Blob, title: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }

  const file = new File([blob], "battlecode-simulation.png", {
    type: "image/png",
  });
  const payload = { files: [file], title };

  if (navigator.canShare && !navigator.canShare(payload)) {
    return false;
  }

  try {
    await navigator.share(payload);
    return true;
  } catch {
    return false;
  }
}
