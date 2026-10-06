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

    // Connect using default QZ discovery (checks wss://localhost:8181 and falls back to ws://localhost:8182)
    // Note: Do not set empty certificate promises unless certificates are actually present,
    // as returning empty string or resolving empty can fail QZ validation.
    await qz.websocket.connect({
      retries: 2,
      delay: 1
    });
    return true;
  } catch (err) {
    console.warn("QZ Tray connect attempt failed:", err);
    return false;
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

  const { widthMm = 50, heightMm = 30 } = options;

  // Build QZ Tray print configuration for thermal label roll
  const config = qz.configs.create(printerName, {
    size: { width: widthMm, height: heightMm },
    units: 'mm',
    colorType: 'color',
    interpolation: 'bicubic',
    margins: 0,
    scaleContent: false,
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
