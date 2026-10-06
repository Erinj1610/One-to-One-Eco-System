/**
 * Label Generator & Thermal Printing Utilities
 * Tailored for Argox O4-250 and standard 203 DPI continuous thermal printers.
 */

// Generate pure SVG Code 128 (Subset B) vector barcode for sharp thermal printing
export function generateCode128Svg(text, height = 40, barWidth = 2, showText = true) {
  if (!text) return '';
  const clean = String(text).trim();
  if (!clean) return '';

  // Code 128B patterns
  const CODE128_PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", // 0-9
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", // 10-19
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", // 20-29
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", // 30-39
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", // 40-49
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", // 50-59
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", // 60-69
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", // 70-79
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", // 80-89
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", // 90-99
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112" // 100-106 (104=StartB, 106=Stop)
  ];

  const START_B = 104;
  const STOP = 106;

  const codes = [START_B];
  let checksum = START_B;

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const code = charCode - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checksum += code * (i + 1);
    }
  }

  const checkDigit = checksum % 103;
  codes.push(checkDigit);
  codes.push(STOP);

  // Convert pattern codes to bars
  let modules = [];
  codes.forEach(c => {
    const pattern = CODE128_PATTERNS[c] || "";
    let isBar = true;
    for (let char of pattern) {
      const width = parseInt(char, 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar ? 1 : 0);
      }
      isBar = !isBar;
    }
  });

  const totalWidth = modules.length * barWidth;
  const rects = [];
  let currentX = 0;

  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === 1) {
      let run = 1;
      while (i + 1 < modules.length && modules[i + 1] === 1) {
        run++;
        i++;
      }
      rects.push(`<rect x="${currentX}" y="0" width="${run * barWidth}" height="${height}" fill="#000" />`);
      currentX += run * barWidth;
    } else {
      currentX += barWidth;
    }
  }

  const textSvg = showText 
    ? `<text x="${totalWidth / 2}" y="${height + 11}" text-anchor="middle" font-family="monospace, monospace" font-size="9" font-weight="700" fill="#000">${escapeXml(clean)}</text>`
    : '';

  const svgHeight = showText ? height + 14 : height;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${svgHeight}" width="100%" height="${svgHeight}" style="display:block;margin:0 auto;max-width:${totalWidth}px;">
    ${rects.join('')}
    ${textSvg}
  </svg>`;
}

// Low-level Code 128 module bit extractor for direct canvas rendering
export function getCode128Modules(text) {
  if (!text) return [];
  const clean = String(text).trim();
  if (!clean) return [];

  const CODE128_PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
  ];

  const START_B = 104;
  const STOP = 106;

  const codes = [START_B];
  let checksum = START_B;

  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    const code = charCode - 32;
    if (code >= 0 && code <= 95) {
      codes.push(code);
      checksum += code * (i + 1);
    }
  }

  const checkDigit = checksum % 103;
  codes.push(checkDigit);
  codes.push(STOP);

  const modules = [];
  codes.forEach(c => {
    const pattern = CODE128_PATTERNS[c] || "";
    let isBar = true;
    for (let char of pattern) {
      const width = parseInt(char, 10);
      for (let w = 0; w < width; w++) {
        modules.push(isBar ? 1 : 0);
      }
      isBar = !isBar;
    }
  });

  return modules;
}

// Draw barcode directly onto an HTML5 Canvas context for crystal sharp 203 DPI printing
export function drawCode128OnCanvas(ctx, text, x, y, maxWidth, height, showText = true) {
  if (!text) return 0;
  const clean = String(text).trim();
  if (!clean) return 0;

  const modules = getCode128Modules(clean);
  if (!modules.length) return 0;

  // Determine bar width (e.g. 1px, 2px, or 3px depending on available width)
  let barWidth = Math.floor(maxWidth / modules.length);
  if (barWidth < 1) barWidth = 1;
  if (barWidth > 3) barWidth = 3;

  const totalBarcodeWidth = modules.length * barWidth;
  const startX = Math.round(x + (maxWidth - totalBarcodeWidth) / 2);

  ctx.fillStyle = '#000000';
  let curX = startX;
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === 1) {
      let run = 1;
      while (i + 1 < modules.length && modules[i + 1] === 1) {
        run++;
        i++;
      }
      ctx.fillRect(curX, y, run * barWidth, height);
      curX += run * barWidth;
    } else {
      curX += barWidth;
    }
  }

  if (showText) {
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(clean, x + maxWidth / 2, y + height + 3);
    return height + 24;
  }

  return height;
}

// Render a complete label template onto an offscreen canvas at native 203 DPI (8 dots/mm)
// Render a complete label template onto an offscreen canvas at native 203 DPI (8 dots/mm)
// and return a PNG data URL.
export function renderLabelToDataUrl(template, context, rotationDeg = 0) {
  // Physical Carrier Web (total paper roll passing through printer throat, e.g. 54mm x 33mm)
  // If carrierWebMm is defined, use it as the physical printer feed size. Otherwise fallback to widthMm.
  const carrierW = Number(template.carrierWebMm?.width ?? template.widthMm ?? 50);
  const carrierH = Number(template.carrierWebMm?.height ?? template.heightMm ?? 32);

  // Sticker Die-Cut Dimensions (actual peel-off label sticker, e.g. 50mm x 32mm)
  const stickerW = Number(template.labelMm?.width ?? template.widthMm ?? 50);
  const stickerH = Number(template.labelMm?.height ?? template.heightMm ?? 32);

  // Carrier Liner Border / Gaps (distance from backing paper edge to sticker edge)
  const linerLeft = Number(template.carrierLinerMm?.left ?? 0);
  const linerTop = Number(template.carrierLinerMm?.top ?? 0);

  // Thermal printers operate at ~8 dots per mm (203.2 DPI)
  const DOTS_PER_MM = 8;
  const nominalW = Math.round(carrierW * DOTS_PER_MM);
  const nominalH = Math.round(carrierH * DOTS_PER_MM);

  const rot = ((Number(rotationDeg) || 0) % 360 + 360) % 360;
  const isSwap = rot === 90 || rot === 270;

  // The final media canvas dimensions that matches the physical printer feed (@page width & height)
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = nominalW;
  outputCanvas.height = nominalH;

  const outCtx = outputCanvas.getContext('2d');
  if (!outCtx) return '';

  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

  const layoutW = isSwap ? nominalH : nominalW;
  const layoutH = isSwap ? nominalW : nominalH;

  const contentCanvas = document.createElement('canvas');
  contentCanvas.width = layoutW;
  contentCanvas.height = layoutH;
  const ctx = contentCanvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, layoutW, layoutH);

  // Sticker offset within the carrier web
  const stickerOffsetX = Math.round(linerLeft * DOTS_PER_MM);
  const stickerOffsetY = Math.round(linerTop * DOTS_PER_MM);

  // Internal safe margins inside the sticker
  const marginMm = template.marginMm || { top: 1.5, bottom: 1.5, left: 2.0, right: 2.0 };
  const padLeft = Math.round((Number(marginMm.left) || 2) * DOTS_PER_MM);
  const padRight = Math.round((Number(marginMm.right) || 2) * DOTS_PER_MM);
  const padTop = Math.round((Number(marginMm.top) || 1.5) * DOTS_PER_MM);
  const padBottom = Math.round((Number(marginMm.bottom) || 1.5) * DOTS_PER_MM);

  const stickerPixelW = Math.round(stickerW * DOTS_PER_MM);
  const contentWidth = Math.max(10, stickerPixelW - padLeft - padRight);
  let flowY = stickerOffsetY + padTop;

  (template.fields || []).forEach(field => {
    // Coordinate origin is the top-left of the peel-off sticker
    const isExplicit = field.xMm !== undefined && field.yMm !== undefined;
    const elemX = isExplicit 
      ? stickerOffsetX + Math.round(Number(field.xMm) * DOTS_PER_MM) 
      : (stickerOffsetX + padLeft);
    const elemW = (field.wMm !== undefined && Number(field.wMm) > 0)
      ? Math.round(Number(field.wMm) * DOTS_PER_MM)
      : contentWidth;

    const marginTop = Math.round((field.marginTop || 0) * DOTS_PER_MM * 0.35);
    const curY = isExplicit 
      ? stickerOffsetY + Math.round(Number(field.yMm) * DOTS_PER_MM) 
      : (flowY + marginTop);

    if (field.type === 'text') {
      const text = evaluateTokens(field.content, context);
      const isBold = field.fontWeight ? (field.fontWeight >= 700 || field.fontWeight === 'bold') : false;
      const isItalic = !!field.italic;
      const isUnderline = !!field.underline;
      const fontStyleStr = `${isItalic ? 'italic ' : ''}${isBold ? 'bold ' : 'normal '}`;

      // Font scaling: 1 pt in design studio = (pt * 1.3 display px / 6.5 BASE_PIXELS_PER_MM) * 8 DOTS_PER_MM = pt * 1.6
      // Standard 72 DPI to 203 DPI point conversion: 1 pt = 203 / 72 = 2.82 dots
      // In the designer studio, text renders with font-size = fontSize * 1.3 px.
      // At 6.5 display px/mm, that ratio is (fontSize * 1.3) / 6.5 mm = fontSize * 0.2 mm.
      // On the 8 dots/mm thermal canvas, fontSize * 0.2 mm * 8 dots/mm = fontSize * 1.6 dots!
      // Previously fontSize was multiplied by 2.8, which made the printed text 75% larger than the designer!
      let baseFontSize = (field.fontSize || 8) * 1.6;
      ctx.font = `${fontStyleStr}${Math.round(baseFontSize)}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';

      // Auto Shrink-to-Fit: If text overflows the box width, iteratively decrease font size
      if (field.shrinkToFit && !field.wrap) {
        let measuredW = ctx.measureText(text).width;
        while (measuredW > elemW && baseFontSize > 8) {
          baseFontSize -= 1;
          ctx.font = `${fontStyleStr}${Math.round(baseFontSize)}px Arial, Helvetica, sans-serif`;
          measuredW = ctx.measureText(text).width;
        }
      }

      const fontSizePx = Math.round(baseFontSize);
      const boxH = field.hMm ? Math.round(field.hMm * DOTS_PER_MM) : (fontSizePx + 6);

      // Save context and clip strictly to bounding box [elemX, curY, elemW, boxH]
      // This guarantees text NEVER overflows into adjacent columns, lines, or boundaries!
      ctx.save();
      ctx.beginPath();
      ctx.rect(elemX, curY, elemW, boxH);
      ctx.clip();

      // Text padding matching DOM visual designer (1px 2px DOM => ~2 dots at 203 DPI)
      const padX = 2;
      const usableW = Math.max(2, elemW - (padX * 2));

      if (field.wrap) {
        // Multi-line word wrap within usableW and boxH
        const words = text.split(' ');
        let lines = [];
        let curLine = '';

        for (let w = 0; w < words.length; w++) {
          const testLine = curLine ? `${curLine} ${words[w]}` : words[w];
          const testW = ctx.measureText(testLine).width;
          if (testW > usableW && curLine) {
            lines.push(curLine);
            curLine = words[w];
          } else {
            curLine = testLine;
          }
        }
        if (curLine) lines.push(curLine);

        const lineHeight = fontSizePx * 1.2;
        const totalTextH = lines.length * lineHeight;

        // Vertical Alignment
        let startY = curY;
        if (field.vAlign === 'middle') {
          startY = curY + Math.max(0, (boxH - totalTextH) / 2);
        } else if (field.vAlign === 'bottom') {
          startY = curY + Math.max(0, boxH - totalTextH);
        }

        lines.forEach((lineText, lIdx) => {
          const lineY = startY + lIdx * lineHeight;
          let drawX = elemX + padX;
          if (field.align === 'center') {
            ctx.textAlign = 'center';
            drawX = elemX + elemW / 2;
          } else if (field.align === 'right') {
            ctx.textAlign = 'right';
            drawX = elemX + elemW - padX;
          } else {
            ctx.textAlign = 'left';
            drawX = elemX + padX;
          }

          ctx.fillText(lineText, drawX, lineY);

          if (isUnderline) {
            const lineMetrics = ctx.measureText(lineText);
            const lineTextW = lineMetrics.width;
            let uX = elemX + padX;
            if (field.align === 'center') uX = elemX + (elemW - lineTextW) / 2;
            else if (field.align === 'right') uX = elemX + elemW - padX - lineTextW;

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = Math.max(1, fontSizePx * 0.08);
            ctx.beginPath();
            ctx.moveTo(uX, lineY + fontSizePx + 1);
            ctx.lineTo(uX + lineTextW, lineY + fontSizePx + 1);
            ctx.stroke();
          }
        });

        if (!isExplicit) flowY = curY + boxH + 4;
      } else {
        // Single Line text
        let startY = curY;
        if (field.vAlign === 'middle') {
          startY = curY + Math.max(0, (boxH - fontSizePx) / 2);
        } else if (field.vAlign === 'bottom') {
          startY = curY + Math.max(0, boxH - fontSizePx - 2);
        }

        let drawX = elemX + padX;
        if (field.align === 'center') {
          ctx.textAlign = 'center';
          drawX = elemX + elemW / 2;
        } else if (field.align === 'right') {
          ctx.textAlign = 'right';
          drawX = elemX + elemW - padX;
        } else {
          ctx.textAlign = 'left';
          drawX = elemX + padX;
        }

        ctx.fillText(text, drawX, startY);

        if (isUnderline) {
          const textW = Math.min(usableW, ctx.measureText(text).width);
          let uX = elemX + padX;
          if (field.align === 'center') uX = elemX + (elemW - textW) / 2;
          else if (field.align === 'right') uX = elemX + elemW - padX - textW;

          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(1, fontSizePx * 0.08);
          ctx.beginPath();
          ctx.moveTo(uX, startY + fontSizePx + 1);
          ctx.lineTo(uX + textW, startY + fontSizePx + 1);
          ctx.stroke();
        }

        if (field.borderTop) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(elemX, curY);
          ctx.lineTo(elemX + elemW, curY);
          ctx.stroke();
        }

        if (field.borderBottom) {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(elemX, curY + fontSizePx + 3);
          ctx.lineTo(elemX + elemW, curY + fontSizePx + 3);
          ctx.stroke();
        }

        if (!isExplicit) flowY = curY + fontSizePx + 4 + (field.borderBottom ? 3 : 0);
      }

      ctx.restore(); // Restore clipping region
    } else if (field.type === 'line') {
      // Vector Divider Line (Horizontal or Vertical)
      const thickness = Math.max(1, Math.round((field.thicknessMm || 0.5) * DOTS_PER_MM));
      const isSolid = !field.lineStyle || field.lineStyle === 'solid';

      if (isSolid) {
        // Crisp pixel-perfect solid rectangle rendering (no stroke expansion or subpixel fuzziness)
        ctx.fillStyle = '#000000';
        if (field.orientation === 'vertical') {
          const lineH = Math.round((field.hMm || 10) * DOTS_PER_MM);
          ctx.fillRect(elemX, curY, thickness, lineH);
        } else {
          ctx.fillRect(elemX, curY, elemW, thickness);
        }
      } else {
        // Dashed / Dotted lines using vector stroke
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = thickness;
        if (field.lineStyle === 'dashed') {
          ctx.setLineDash([8, 6]);
        } else if (field.lineStyle === 'dotted') {
          ctx.setLineDash([3, 3]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        if (field.orientation === 'vertical') {
          const lineH = Math.round((field.hMm || 10) * DOTS_PER_MM);
          ctx.moveTo(elemX + thickness / 2, curY);
          ctx.lineTo(elemX + thickness / 2, curY + lineH);
        } else {
          ctx.moveTo(elemX, curY + thickness / 2);
          ctx.lineTo(elemX + elemW, curY + thickness / 2);
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash
      }

      if (!isExplicit) {
        flowY = curY + thickness + 3;
      }
    } else if (field.type === 'box_frame') {
      // Outline Box or Inverted Badge
      const boxH = Math.round((field.hMm || 10) * DOTS_PER_MM);
      const borderWidth = Math.max(1, Math.round((field.borderThicknessMm || 1) * DOTS_PER_MM * 0.5));

      if (field.filled) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(elemX, curY, elemW, boxH);
      } else {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(elemX, curY, elemW, boxH);
      }

      if (!isExplicit) {
        flowY = curY + boxH + 4;
      }
    } else if (field.type === 'image' && field.imageData) {
      // High-contrast custom image / logo
      try {
        const img = new Image();
        img.src = field.imageData;
        if (img.complete && img.naturalWidth > 0) {
          const imgH = Math.round((field.hMm || 10) * DOTS_PER_MM);
          ctx.drawImage(img, elemX, curY, elemW, imgH);
        }
      } catch (err) {
        console.error("Failed to render custom label image:", err);
      }
    } else if (field.type === 'barcode') {
      const barVal = evaluateTokens(field.barcodeValue || '{{item.code}}', context);
      const barHeight = Math.round((field.barcodeHeight || 20) * DOTS_PER_MM * 0.35);
      const drawnH = drawCode128OnCanvas(
        ctx,
        barVal,
        elemX,
        curY,
        elemW,
        barHeight,
        field.showBarcodeText !== false
      );
      if (!isExplicit) {
        flowY = curY + drawnH + 4;
      }
    } else if (field.type === 'box_manifest') {
      const items = context.box?.manifestItems || [];
      const fontSizePx = Math.round((field.fontSize || 7.5) * 2.5);
      ctx.font = `600 ${fontSizePx}px Arial, Helvetica, sans-serif`;
      ctx.fillStyle = '#000000';

      const boxStartY = curY;
      const rowH = fontSizePx + 6;
      const maxRows = field.maxLines || 6;
      const displayItems = items.slice(0, maxRows);

      displayItems.forEach((it, idx) => {
        const itemY = boxStartY + idx * rowH + 4;
        const leftTxt = `${it.qtyDelivered || it.qty || 1}x ${it.code || it.oneOneCode || 'Item'}`;
        const rightTxt = `${it.area || it.floor || ''}`;

        ctx.textAlign = 'left';
        ctx.fillText(leftTxt, elemX + 6, itemY);

        ctx.textAlign = 'right';
        ctx.fillText(rightTxt, elemX + elemW - 6, itemY);
      });

      const totalBoxH = Math.max(displayItems.length * rowH + 8, 30);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(elemX, boxStartY, elemW, totalBoxH);

      if (!isExplicit) {
        flowY = curY + totalBoxH + 4;
      }
    }
  });

  // Stamp contentCanvas onto outputCanvas rotated by `rot`
  outCtx.save();
  outCtx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
  outCtx.rotate((rot * Math.PI) / 180);
  outCtx.drawImage(contentCanvas, -layoutW / 2, -layoutH / 2);
  outCtx.restore();

  // Bilevel Monochrome Post-Processing Pass:
  // Convert any anti-aliased gray pixels into strictly pure black (#000000) or pure white (#ffffff)
  // This eliminates the halftone dithering "dots" produced by thermal printheads when receiving gray pixels!
  try {
    const imgData = outCtx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
    const data = imgData.data;
    const threshold = 180; // Pixels darker than 180 brightness become solid 100% black
    for (let i = 0; i < data.length; i += 4) {
      // Perceived luminance: 0.299R + 0.587G + 0.114B
      const brightness = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      if (brightness < threshold) {
        data[i] = 0;       // R
        data[i + 1] = 0;   // G
        data[i + 2] = 0;   // B
      } else {
        data[i] = 255;     // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
      }
      data[i + 3] = 255; // Full opacity
    }
    outCtx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn("Monochrome threshold filter skipped:", err);
  }

  return outputCanvas.toDataURL('image/png');
}

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

// Available Variable Dictionary for Template Designer
export const VARIABLE_DICTIONARY = [
  { group: 'Item Details', token: '{{item.code}}', label: 'Item Code', example: 'DL-2223/31' },
  { group: 'Item Details', token: '{{item.one_one_code}}', label: '1-to-1 SKU / System Code', example: '2223/31' },
  { group: 'Item Details', token: '{{item.plan_code}}', label: 'Plan Code / Fitting Mark', example: 'GS1a' },
  { group: 'Item Details', token: '{{item.description}}', label: 'Item Description', example: 'Downlight 2223 Anti-Glare GU10 White' },
  { group: 'Item Details', token: '{{item.brand}}', label: 'Brand / Material', example: 'Spazio' },
  { group: 'Item Details', token: '{{item.floor}}', label: 'Floor', example: 'First Floor' },
  { group: 'Item Details', token: '{{item.area}}', label: 'Area / Room', example: 'Kitchen' },
  { group: 'Item Details', token: '{{item.type}}', label: 'Category / Type', example: 'Downlight' },
  { group: 'Item Details', token: '{{item.dimming}}', label: 'Dimming Protocol', example: 'Phase-Dim' },
  { group: 'Item Details', token: '{{item.boxNumber}}', label: 'Assigned Box', example: 'Box 1' },
  { group: 'Item Details', token: '{{item.qty}}', label: 'Item Quantity (Packed)', example: '14' },
  { group: 'Item Details', token: '{{item.serial}}', label: 'Item Index in Batch (e.g. 1 of 14)', example: '1 of 14' },

  { group: 'Project & Client', token: '{{project.name}}', label: 'Project Name', example: 'Reid Stanford Villa' },
  { group: 'Project & Client', token: '{{project.client}}', label: 'Client Name', example: 'Stanford Holdings' },
  { group: 'Project & Client', token: '{{project.deliveryAddress}}', label: 'Delivery Address', example: '14 Mountain View Road, Camps Bay' },
  { group: 'Project & Client', token: '{{project.pm}}', label: 'Project Manager', example: 'Dani' },

  { group: 'Order & Document', token: '{{order.id}}', label: 'Order / Quote ID', example: 'Q-2026-0576' },
  { group: 'Order & Document', token: '{{order.quote_name}}', label: 'Quotation Name', example: 'General Lighting Option 2' },
  { group: 'Order & Document', token: '{{packing_list.id}}', label: 'Packing List ID', example: 'PL-000000001' },
  { group: 'Order & Document', token: '{{delivery_note.id}}', label: 'Delivery Note ID', example: 'DN-000000001' },
  { group: 'Order & Document', token: '{{date.today}}', label: 'Today\'s Date', example: '05/10/2026' },

  { group: 'Box Manifest', token: '{{box.number}}', label: 'Current Box Number', example: 'Box 1' },
  { group: 'Box Manifest', token: '{{box.index}}', label: 'Box Index Number', example: '1' },
  { group: 'Box Manifest', token: '{{box.total}}', label: 'Total Boxes in PL', example: '3' },
  { group: 'Box Manifest', token: '{{box.items_count}}', label: 'Total Units in Box', example: '26' },
  { group: 'Box Manifest', token: '{{box.manifest_summary}}', label: 'Box Manifest List (Multi-line)', example: '5x DL-01, 10x LA.4205, 1x Power Supply' },

  { group: 'Barcodes', token: '{{barcode.item_code}}', label: 'Barcode: Item Code', example: '[BARCODE: DL-2223/31]' },
  { group: 'Barcodes', token: '{{barcode.pl_order}}', label: 'Barcode: PL & Order ID', example: '[BARCODE: PL-00001]' },
  { group: 'Barcodes', token: '{{barcode.box_id}}', label: 'Barcode: Box ID', example: '[BARCODE: PL-001-B1]' }
];

// Pre-configured Industry Standard Thermal Templates
export const DEFAULT_LABEL_TEMPLATES = [
  {
    id: 'argox_item_50x32',
    name: 'Argox Roll Fitting Label (50mm × 32mm)',
    description: 'Exact match for Argox O4-250: 54mm carrier roll backing web with 50mm × 32mm peel-off sticker.',
    widthMm: 50,
    heightMm: 32,
    carrierWebMm: { width: 54, height: 33 },
    labelMm: { width: 50, height: 32 },
    carrierLinerMm: { left: 2.0, top: 0.5 },
    orientation: 'landscape',
    rotation: 0,
    marginMm: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
    type: 'item',
    fields: [
      { id: 'f_brand', type: 'text', content: 'ONE TO ONE • {{project.name}}', fontSize: 7.5, fontWeight: 800, align: 'center', xMm: 1.5, yMm: 1.5, wMm: 47 },
      { id: 'f_div1', type: 'line', thicknessMm: 0.5, lineStyle: 'solid', orientation: 'horizontal', xMm: 1.5, yMm: 5.5, wMm: 47 },
      { id: 'f_code', type: 'text', content: '{{item.code}}', fontSize: 11, fontWeight: 900, align: 'center', xMm: 1.5, yMm: 7, wMm: 47 },
      { id: 'f_desc', type: 'text', content: '{{item.description}}', fontSize: 7, fontWeight: 500, align: 'center', xMm: 1.5, yMm: 12, wMm: 47 },
      { id: 'f_barcode', type: 'barcode', barcodeValue: '{{item.code}}', barcodeHeight: 18, showBarcodeText: true, xMm: 1.5, yMm: 15.5, wMm: 47 },
      { id: 'f_div2', type: 'line', thicknessMm: 0.5, lineStyle: 'solid', orientation: 'horizontal', xMm: 1.5, yMm: 26, wMm: 47 },
      { id: 'f_meta', type: 'text', content: '{{item.floor}} • {{item.area}} ({{item.boxNumber}})', fontSize: 7, fontWeight: 700, align: 'center', xMm: 1.5, yMm: 27.5, wMm: 47 }
    ]
  },
  {
    id: 'hardware_item_50x25',
    name: 'Standard Hardware Label (50mm × 25mm)',
    description: 'Compact fitting label for individual downlights, lamps, and drivers. Fits continuous rolls on Argox O4-250.',
    widthMm: 50,
    heightMm: 25,
    orientation: 'landscape',
    rotation: 0,
    type: 'item', // 'item' | 'box'
    fields: [
      { id: 'f_brand', type: 'text', content: 'ONE TO ONE LIGHTING • {{project.name}}', fontSize: 7, fontWeight: 700, align: 'center', borderBottom: true },
      { id: 'f_code', type: 'text', content: '{{item.code}}', fontSize: 11, fontWeight: 800, align: 'center', marginTop: 1 },
      { id: 'f_desc', type: 'text', content: '{{item.description}}', fontSize: 7, fontWeight: 500, align: 'center', maxLines: 1 },
      { id: 'f_barcode', type: 'barcode', barcodeValue: '{{item.code}}', barcodeHeight: 18, showBarcodeText: false, marginTop: 1 },
      { id: 'f_meta', type: 'text', content: 'Area: {{item.floor}} - {{item.area}} ({{item.boxNumber}})', fontSize: 6.5, fontWeight: 600, align: 'center', marginTop: 1 }
    ]
  },
  {
    id: 'hardware_item_70x35',
    name: 'Detailed Spec Fitting Label (70mm × 35mm)',
    description: 'Medium thermal label with prominent barcode, area/floor placement, and full hardware description.',
    widthMm: 70,
    heightMm: 35,
    orientation: 'landscape',
    type: 'item',
    fields: [
      { id: 'f_header', type: 'text', content: 'ONE TO ONE • {{project.name}}', fontSize: 8, fontWeight: 800, align: 'left', borderBottom: true },
      { id: 'f_code_type', type: 'text', content: 'CODE: {{item.code}} [{{item.type}}]', fontSize: 12, fontWeight: 800, align: 'left', marginTop: 2 },
      { id: 'f_desc', type: 'text', content: '{{item.description}}', fontSize: 8, fontWeight: 500, align: 'left', maxLines: 2, marginTop: 1 },
      { id: 'f_barcode', type: 'barcode', barcodeValue: '{{item.code}}', barcodeHeight: 24, showBarcodeText: true, marginTop: 2 },
      { id: 'f_footer', type: 'text', content: 'Floor: {{item.floor}} | Area: {{item.area}} | {{item.boxNumber}}', fontSize: 7.5, fontWeight: 700, align: 'left', borderTop: true, marginTop: 2 }
    ]
  },
  {
    id: 'box_manifest_100x100',
    name: 'Outer Box Manifest Sticker (100mm × 100mm)',
    description: 'Large square thermal label for shipping cartons, showing project address, Box X of Y, and box contents table.',
    widthMm: 100,
    heightMm: 100,
    orientation: 'portrait',
    type: 'box',
    fields: [
      { id: 'f_title', type: 'text', content: 'ONE TO ONE LOGISTICS & DISPATCH', fontSize: 11, fontWeight: 900, align: 'center', borderBottom: true },
      { id: 'f_box_num', type: 'text', content: '{{box.number}} OF {{box.total}}', fontSize: 18, fontWeight: 900, align: 'center', marginTop: 3 },
      { id: 'f_proj', type: 'text', content: 'PROJECT: {{project.name}} (Client: {{project.client}})', fontSize: 9, fontWeight: 700, align: 'left', marginTop: 2 },
      { id: 'f_order', type: 'text', content: 'DOC: {{packing_list.id}} | ORDER: {{order.id}}', fontSize: 8, fontWeight: 600, align: 'left' },
      { id: 'f_addr', type: 'text', content: 'DELIVER TO: {{project.deliveryAddress}}', fontSize: 8, fontWeight: 500, align: 'left', maxLines: 2, borderBottom: true, marginTop: 1, paddingBottom: 2 },
      { id: 'f_manifest_hdr', type: 'text', content: 'BOX CONTENTS ({{box.items_count}} Total Items Packed):', fontSize: 8.5, fontWeight: 800, align: 'left', marginTop: 2 },
      { id: 'f_manifest', type: 'box_manifest', fontSize: 8, marginTop: 2, maxLines: 8 },
      { id: 'f_barcode', type: 'barcode', barcodeValue: '{{packing_list.id}}-{{box.index}}', barcodeHeight: 28, showBarcodeText: true, marginTop: 3 }
    ]
  },
  {
    id: 'pallet_crate_100x150',
    name: 'Pallet / Master Crate Label (100mm × 150mm / 4" × 6")',
    description: 'Industrial 4x6 inch label for master pallets, project staging crates, and site delivery drops.',
    widthMm: 100,
    heightMm: 150,
    orientation: 'portrait',
    type: 'box',
    fields: [
      { id: 'f_title', type: 'text', content: 'ONE TO ONE ARCHITECTURAL LIGHTING', fontSize: 12, fontWeight: 900, align: 'center', borderBottom: true },
      { id: 'f_box_num', type: 'text', content: '{{box.number}} OF {{box.total}}', fontSize: 24, fontWeight: 900, align: 'center', marginTop: 4 },
      { id: 'f_proj', type: 'text', content: 'PROJECT: {{project.name}}', fontSize: 12, fontWeight: 800, align: 'center', marginTop: 2 },
      { id: 'f_client', type: 'text', content: 'CLIENT: {{project.client}} | PM: {{project.pm}}', fontSize: 9, fontWeight: 600, align: 'center' },
      { id: 'f_addr', type: 'text', content: 'SITE ADDRESS: {{project.deliveryAddress}}', fontSize: 9, fontWeight: 600, align: 'left', borderBottom: true, marginTop: 2, paddingBottom: 3 },
      { id: 'f_doc_meta', type: 'text', content: 'PACKING LIST: {{packing_list.id}} | DATE: {{date.today}}', fontSize: 9, fontWeight: 700, align: 'left', marginTop: 3 },
      { id: 'f_manifest_hdr', type: 'text', content: 'PACKED ITEMS IN THIS CONTAINER:', fontSize: 9, fontWeight: 800, align: 'left', marginTop: 2 },
      { id: 'f_manifest', type: 'box_manifest', fontSize: 8.5, marginTop: 2, maxLines: 12 },
      { id: 'f_barcode', type: 'barcode', barcodeValue: '{{packing_list.id}}-{{box.index}}', barcodeHeight: 36, showBarcodeText: true, marginTop: 4 }
    ]
  }
];

// Evaluate tokens into real values
export function evaluateTokens(templateString, context) {
  if (!templateString) return '';
  let res = String(templateString);

  const { item = {}, project = {}, order = {}, packingList = {}, box = {} } = context;
  const todayStr = new Date().toLocaleDateString('en-GB');

  const planCodeVal = item.planCode || item.plan_code || item.fittingCode || item.code || 'GS1a';

  const replacements = {
    '{{item.code}}': item.code || item.oneOneCode || 'N/A',
    '{{item.one_one_code}}': item.oneOneCode || item.one_one_code || item.sku || item.code || 'N/A',
    '{{item.plan_code}}': planCodeVal,
    '{{item.planCode}}': planCodeVal,
    '{{item.description}}': item.description || item.name || 'Hardware Fitting',
    '{{item.brand}}': item.brand || item.supplier || '—',
    '{{item.floor}}': item.floor || 'General',
    '{{item.area}}': item.area || 'All Areas',
    '{{item.type}}': item.type || item.itemType || 'Hardware',
    '{{item.dimming}}': item.dimming || 'Standard',
    '{{item.boxNumber}}': item.boxNumber || box.number || 'Box 1',
    '{{item.qty}}': item.qtyDelivered ?? item.qty ?? '1',
    '{{item.serial}}': item.serial || '1 of 1',

    '{{project.name}}': project.name || project.projectName || 'One to One Project',
    '{{project.client}}': project.client || project.clientName || 'Valued Client',
    '{{project.deliveryAddress}}': project.deliveryAddress || project.address || 'Standard Delivery Site',
    '{{project.pm}}': project.pm || project.pmName || 'Logistics',

    '{{order.id}}': order.id || order.po_number || 'ORD',
    '{{order.quote_name}}': order.quote_name || 'Lighting Spec',
    '{{packing_list.id}}': packingList.id || 'PL-000000001',
    '{{delivery_note.id}}': packingList.deliveryNoteId || 'DN-PENDING',
    '{{date.today}}': todayStr,

    '{{box.number}}': box.number || item.boxNumber || 'Box 1',
    '{{box.index}}': String(box.index || '1'),
    '{{box.total}}': String(box.total || '1'),
    '{{box.items_count}}': String(box.itemsCount || '0'),
    '{{box.manifest_summary}}': box.manifestSummary || '—'
  };

  Object.entries(replacements).forEach(([token, val]) => {
    res = res.split(token).join(val);
  });

  return res;
}
