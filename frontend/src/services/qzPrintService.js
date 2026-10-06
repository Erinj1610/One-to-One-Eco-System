import qz from 'qz-tray';

let isConnecting = false;

/**
 * Initializes and connects to QZ Tray running on the local machine (localhost:8182).
 */
export async function connectQz() {
  if (qz.websocket.isActive()) {
    return true;
  }
  if (isConnecting) {
    // Wait until current attempt completes
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (!isConnecting) {
          clearInterval(interval);
          resolve(qz.websocket.isActive());
        }
      }, 200);
    });
  }

  try {
    isConnecting = true;
    // Set up certificate and signature callbacks for unsigned connections
    try {
      qz.security.setCertificatePromise(() => Promise.resolve());
      qz.security.setSignaturePromise(() => Promise.resolve());
    } catch (_) {}

    // When running from https://, QZ Tray connects via secure wss on port 8181
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    
    await qz.websocket.connect({
      host: 'localhost',
      usingSecure: isHttps,
      retries: 3,
      delay: 1
    });
    return true;
  } catch (err) {
    console.warn("Primary QZ Tray connect failed, attempting fallback:", err);
    try {
      // Fallback: try connecting without forcing secure or with inverted secure
      await qz.websocket.connect({
        retries: 2,
        delay: 1
      });
      return true;
    } catch (fallbackErr) {
      console.warn("QZ Tray fallback connection also failed:", fallbackErr);
      return false;
    }
  } finally {
    isConnecting = false;
  }
}

/**
 * Checks if QZ Tray is currently active.
 */
export function isQzActive() {
  return qz.websocket.isActive();
}

/**
 * Fetches the list of all printers installed on the local Windows OS.
 */
export async function listPrinters() {
  const connected = await connectQz();
  if (!connected) {
    throw new Error("QZ Tray is not running. Please launch QZ Tray on your computer.");
  }
  return await qz.printers.find();
}

/**
 * Sends one or more pre-rasterized 203 DPI label images directly to the selected Windows printer.
 *
 * @param {string} printerName - Exact name of the printer as returned by listPrinters()
 * @param {Array<string>} dataUrls - Array of base64 PNG data URLs
 * @param {Object} options - Print options (width, height, density)
 */
export async function printDirectLabels(printerName, dataUrls, options = {}) {
  const connected = await connectQz();
  if (!connected) {
    throw new Error("QZ Tray is not running on your computer. Please start QZ Tray to print directly.");
  }

  const { widthMm = 50, heightMm = 32 } = options;

  // Build QZ Tray print configuration for thermal label roll
  const config = qz.configs.create(printerName, {
    size: { width: widthMm, height: heightMm },
    units: 'mm',
    colorType: 'grayscale',
    interpolation: 'nearest-neighbor', // Keep barcodes sharp
    margins: 0,
    rasterize: false
  });

  // Prepare each label data object
  const printData = dataUrls.map(url => {
    // Strip header prefix if present (e.g. data:image/png;base64,)
    const base64Data = url.replace(/^data:image\/[a-z]+;base64,/, '');
    return {
      type: 'pixel',
      format: 'image',
      flavor: 'base64',
      data: base64Data,
      options: {
        pageWidth: widthMm,
        pageHeight: heightMm
      }
    };
  });

  await qz.print(config, printData);
  return true;
}
