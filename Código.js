// ===============================================================
// 1. ⚙️ CONFIGURACIÓN GLOBAL (PEGA ESTO AL PRINCIPIO)
// ===============================================================

// 🚨 REEMPLAZA ESTAS IDs con las de tus planillas originales
const SPREADSHEET_ID_INVENTARIO = '10sIFWNX3UtOHJD_26isE6n_lAH5osU7Y6NWVHxrUUmU';  // ID de tu planilla de INVENTARIO
const SPREADSHEET_ID_REMITOS = '1xCi34du_nIdsVOeToHTJXEh1cJp9-BMjSgx3DIG5q-w'; // ID de tu planilla principal (donde están RESUMEN SM y R1-SM)
const ID_PROVEEDORES = "1-DyX0FvHgUtqTDbxpxkwkyqhYROpn-BZ0_2iwp-kY-c"; // ID de tu planilla de precios de Proveedores

// 💡 ID DE LA CARPETA DONDE SE GUARDAN LOS PDFs
const FOLDER_ID_PDF = '1bZKIKxo3yOpeJAtmzspLLLn1-4eqn6Dw'; 

const HOJA_INVENTARIO = 'INVENTARIO'; 

const COLOR_NORMAL = '#434343'; 
const COLOR_EXCEDENTE = '#ff0000'; // ROJO para errores de stock
const COLOR_ERROR_COMA = '#ff0000'; // ROJO para errores de formato de número


let procesando = false; // Bandera para evitar ejecuciones simultáneas

// Nombre de la hoja de control con los checks (Checkboxs.csv)
const CONTROL_SHEET_NAME = 'Checkboxs'; 

// Hojas de inventario (proveedores)
const HOJAS = [
  'RAMOLAC',
  'ALFONSINA',
  'FRIAR y CODINA',
  'LC/LR y LA LECHERITA',
  'TREMBLAY/DON OTTO',
  'LA VIRGINIA',
  'BAGGIO/MAYONESAS',
  'ILOLAY'
];

// Reemplaza con tu URL real del Webhook de Discord (si aplica)
const WEBHOOK_URL = "https://discord.com/api/webhooks/1437429848523149473/0xJy7UT4Axf4SyuwSQx6A29nhz9mWjybRn8rNrLgmP-yqBaBn4dS9lGCrQ1Atph8XLSa";


// 1. IDs de las planillas de resumen (Tus 3 anteriores + las 3 nuevas)
const TARGET_SHEET_IDS = {
  // --- PLANILLAS ANTERIORES (Se mantienen) ---
  SM: "1xCi34du_nIdsVOeToHTJXEh1cJp9-BMjSgx3DIG5q-w",
  AL: "1_3z0GNPxszXuhQQxNpHI5HnrGH_chZwLkJc5DYbaXqw", 
  SL: "1-rSySeyo3utWuAzO8-pgDhjJ4swggSso3LiPflBSS4Y",

  // --- NUEVAS PLANILLAS (Agregadas) ---
  NUEVA_SM: "1R98VD07SZyzS822aFwoBS101L9511wkcsmS-x2hllUs",
  NUEVA_AL: "1d_jRsVVxTVgnn3gYiOJIv77H_bYwYaTNzAthmy17fek",
  NUEVA_SL: "1yGc5iYGZiIDl6VK7CEyMMFDBPmhd0j7ydNWmrVPe5hs"
};

// 2. CONFIGURACIÓN CRÍTICA: NOMBRES DE LAS PESTAÑAS
const TARGET_SHEET_TAB_NAMES = {
  // --- Pestañas anteriores ---
  SM: "RESUMEN SM", 
  AL: "RESUMEN AL", 
  SL: "RESUMEN SL",

  // --- Pestañas para las nuevas planillas ---
  NUEVA_SM: "RESUMEN SM", 
  NUEVA_AL: "RESUMEN AL", 
  NUEVA_SL: "RESUMEN SL"
};

// Definiciones de Columnas en las hojas de inventario (A=1, B=2, C=3, D=4, E=5, F=6, G=7, H=8, I=9)
const COL_CODIGO = 1;         // A
const COL_PRODUCTO = 2;       // B
const COL_PRECIO_PR = 3;      // C (Precio PR)
const COL_PRECIO_MP = 4;      // D (Precio MP)
const COL_ACTUALIZADO = 5;    // E (Checkbox de actualización)
const COL_IMG_URL = 9;        // I (URL de la imagen)


// ========================================
// 🔥 TRIGGERS Y HANDLERS (SIEMPRE AL INICIO)
// ========================================

/**
 * TRIGGER PRINCIPAL: Se ejecuta al marcar cualquier checkbox en la fila 2 de la hoja de control.
 */
function handleEdit(e) {
  try {
    if (!e || !e.range) return;
    const hoja = e.range.getSheet();
    const nombreHoja = hoja.getName();
    const fila = e.range.getRow();
    const col = e.range.getColumn();
    const valor = e.range.getValue();

    // Modificado: Ahora acepta desde columna 1 (A) hasta la 7 (G) [1, 3, 4]
    if (nombreHoja === CONTROL_SHEET_NAME && fila === 2 && col >= 1 && col <= 7 && valor === true) {
      
      // Desmarcamos el checkbox inmediatamente para evitar ejecuciones dobles [1, 3]
      e.range.setValue(false);
      
      Logger.log("▶️ Ejecutando acción para la columna: " + col);
      
      // Llamamos al gestor de acciones [3, 4]
      ejecutarControlSheet(col);
    }
  } catch (err) {
    Logger.log('❌ ERROR en handleEdit: ' + err.message);
  }
}
function ejecutarControlSheet(col) {
  switch (col) {
    case 1: // A2: Activa AMBOS catálogos
      Logger.log("🚀 Iniciando actualización simultánea (PR y MP)...");
      
      // Ejecutamos ambas funciones (asegurate de haber borrado el limpiarChecks de adentro)
      actualizarPreciosEnSlides(); 
      actualizarPreciosMPEnSlides(); 

      // RECIÉN AL FINAL de ambas, limpiamos la planilla para que la 2da función encuentre datos
      limpiarChecksActualizado(); 
      
      break; // 👈 Agregamos el break para que no salte al caso 7 (G2)
       
    case 7: // G2: Crear Nueva Diapositiva
      crearEtiquetasEnNuevaSlide(); 
      break;
    
    case 2: // B2: Sincronización de planillas
      enviarProductosASummarySheets(Object.keys(TARGET_SHEET_IDS));
      break;
      
    case 6: // F2: Enviar reporte a Discord
      recolectarTodasLasHojas();
      break;

    default:
      Logger.log("⚠️ Columna " + col + " sin acción programada.");
      break;
  }
}

/****************************************
 * RECOLECTAR PRODUCTOS PARA SYNC 
 ****************************************/
function recolectarProductosParaSync() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var productos = [];
  
  HOJAS.forEach(function(nombreHoja) {
    try {
      var hoja = spreadsheet.getSheetByName(nombreHoja);
      if (!hoja) return;
      
      var ultimaFila = hoja.getLastRow();
      if (ultimaFila < 2) return;
      
      // Obtener datos desde Col A hasta Col E (5)
      var data = hoja.getRange(2, COL_CODIGO, ultimaFila - 1, COL_ACTUALIZADO).getValues();
      
      data.forEach(function(row) {
        // Col E (índice 4) es el check de actualizado
        var checkActualizado = row[COL_ACTUALIZADO - 1]; 
        
        if (checkActualizado === true) {
          // Agregar datos de A:D (índices 0 a 3) - incluye PR y MP
          productos.push(row.slice(0, COL_PRECIO_MP)); 
        }
      });
      
    } catch (err) {
      Logger.log("Error procesando hoja " + nombreHoja + " para sync: " + err);
    }
  });
  
  return productos;
}

/****************************************
 * ENVIAR/ACTUALIZAR PRODUCTOS EN PLANILLAS EXTERNAS 
 ****************************************/
function enviarProductosASummarySheets(targetKeys) {
  // --- PASO A: Asegurarnos de incluir las 3 nuevas planillas ---
  // Si targetKeys existe (viene del checkbox), le sumamos nuestras nuevas llaves
  var keysAProcesar = targetKeys || [];
  
  // Agregamos manualmente las nuevas para que siempre se actualicen
  var nuevas = ["NUEVA_SM", "NUEVA_AL", "NUEVA_SL"];
  nuevas.forEach(function(n) {
    if (keysAProcesar.indexOf(n) === -1) keysAProcesar.push(n);
  });

  var productos = recolectarProductosParaSync(); 
  
  if (productos.length === 0) {
    Logger.log("No hay productos con el check en Columna E para sincronizar."); 
    return;
  }
  
  var totalProcesado = 0;
  var results = []; 
  
  // Normalización de los datos (Tu lógica original intacta)
  var productosNormalizados = productos.map(function(rowData) {
    rowData[COL_CODIGO - 1] = rowData[COL_CODIGO - 1] ? rowData[COL_CODIGO - 1].toString().trim() : '';
    var precioPR = rowData[COL_PRECIO_PR - 1]; 
    if (typeof precioPR === 'string') precioPR = precioPR.replace(/,/g, '.');
    rowData[COL_PRECIO_PR - 1] = parseFloat(precioPR) || 0; 
    var precioMP = rowData[COL_PRECIO_MP - 1];
    if (typeof precioMP === 'string') precioMP = precioMP.replace(/,/g, '.');
    rowData[COL_PRECIO_MP - 1] = parseFloat(precioMP) || 0;
    return rowData;
  });
  
  // Procesar cada planilla (Las viejas y las nuevas)
  keysAProcesar.forEach(function(key) { 
    var sheetId = TARGET_SHEET_IDS[key];
    var targetTabName = TARGET_SHEET_TAB_NAMES[key];
    
    // Si por alguna razón no existe el ID para esa llave, saltar
    if (!sheetId) return;

    var sheetName = "ID: " + key;
    var updatesCount = 0;
    var newRowCount = 0;
    
    try {
      var targetSS = SpreadsheetApp.openById(sheetId);
      sheetName = targetSS.getName();
      var targetSheet = targetSS.getSheetByName(targetTabName); 
      
      if (!targetSheet) throw new Error('Pestaña "' + targetTabName + '" no encontrada.');
      
      var targetData = targetSheet.getDataRange().getValues();
      var targetCodes = targetData.slice(1).map(function(row) {
        return row[COL_CODIGO - 1] ? row[COL_CODIGO - 1].toString().trim() : '';
      }); 
      
      var updates = [];
      var newRows = [];
      
      productosNormalizados.forEach(function(rowData) {
        var code = rowData[COL_CODIGO - 1];
        var codeIndex = targetCodes.indexOf(code);
        
        if (codeIndex !== -1) {
          updates.push({
            range: targetSheet.getRange(codeIndex + 2, COL_CODIGO, 1, COL_PRECIO_MP), 
            values: [rowData.slice(0, COL_PRECIO_MP)]
          });
          updatesCount++;
        } else {
          newRows.push(rowData.slice(0, COL_PRECIO_MP));
          newRowCount++;
        }
        totalProcesado++;
      });
      
      updates.forEach(function(upd) { upd.range.setValues(upd.values); });
      if (newRows.length > 0) {
        targetSheet.getRange(targetSheet.getLastRow() + 1, COL_CODIGO, newRows.length, COL_PRECIO_MP).setValues(newRows);
      }
      
      results.push('✅ ' + key + ' (' + sheetName + '): ' + updatesCount + ' actualizados, ' + newRowCount + ' nuevos.');
      
    } catch (e) {
      results.push('❌ ERROR en ' + key + ': ' + e.message);
    }
  });
  
  if (totalProcesado > 0) limpiarChecksActualizado();
  
  Logger.log('✔ Sincronización finalizada.\n' + results.join('\n'));
}

/****************************************
 * RECOLECTAR Y GUARDAR PRODUCTOS PENDIENTES (INICIA FLUJO DISCORD)
 ****************************************/
function recolectarTodasLasHojas() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var productos = [];
  var props = PropertiesService.getScriptProperties();

  var COL_FINAL_DATOS = COL_IMG_URL; // Columna I
  
  HOJAS.forEach(function(nombreHoja) {
    try {
      var hoja = spreadsheet.getSheetByName(nombreHoja);
      if (!hoja) return;
      
      var ultimaFila = hoja.getLastRow();
      if (ultimaFila < 2) return;
      
      var data = hoja.getRange(2, COL_CODIGO, ultimaFila - 1, COL_FINAL_DATOS).getValues();
      
      data.forEach(function(row) {
        var checkActualizado = row[COL_ACTUALIZADO - 1]; 
        
        if (checkActualizado === true) {
          
          var precioPR = parseFloat(row[COL_PRECIO_PR - 1]) || 0;
          
          // Crear el objeto del producto usando nombres consistentes
          var productoData = {
            hoja: nombreHoja, // Proveedor
            codigo: row[COL_CODIGO - 1],
            producto: row[COL_PRODUCTO - 1],
            precio: precioPR.toFixed(2), // Usamos precioPR y lo llamamos 'precio' para simplificar
            url: row[COL_IMG_URL - 1] ? row[COL_IMG_URL - 1].toString().trim() : '' // URL de la imagen (Columna I)
          };
          
          productos.push(productoData);
        }
      });
      
    } catch (err) {
      Logger.log("Error procesando hoja " + nombreHoja + " para guardar pendientes: " + err);
    }
  });

  // Guardar los productos pendientes en PropertiesService
  props.setProperty('PENDIENTES', JSON.stringify(productos));
  
  if (productos.length > 0) {
      // Llama a la función principal para procesar y enviar
      enviarProductosAgrupados(); 
  } else {
      Logger.log("No hay nuevos productos marcados para envío.");
  }
}

/****************************************
 *  ENVIAR PRODUCTOS AGRUPADOS (FINAL, robusta)
 ****************************************/
function enviarProductosAgrupados() {
    try {
        var props = PropertiesService.getScriptProperties();
        var pendientes = JSON.parse(props.getProperty('PENDIENTES') || '[]');

        if (pendientes.length === 0) {
            Logger.log("No hay productos pendientes");
            return;
        }
        
        // 1. Crear PDF con todos los productos (Devuelve el BLOB)
        var pdfBlob = crearPDFProductos(pendientes);
        
        // 2. Subir a Google Drive temporalmente
        // Usar la carpeta específica (FOLDER_ID_PDF) o la raíz si no está definida
        var folder;
        try {
          folder = FOLDER_ID_PDF ? DriveApp.getFolderById(FOLDER_ID_PDF) : DriveApp.getRootFolder();
        } catch (e) {
          Logger.log('ERROR al acceder a FOLDER_ID_PDF (' + FOLDER_ID_PDF + '): ' + e.message + '. Usando RootFolder.');
          folder = DriveApp.getRootFolder();
        }
        
        var archivo = folder.createFile(pdfBlob); 
        archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        var urlPDF = archivo.getUrl();
        
        // 3. Crear y enviar el mensaje detallado
        var mensaje = construirMensaje(pendientes);
        enviarMensajeConPDF(mensaje, urlPDF, pendientes.length);

        // 4. Limpiar y eliminar
        limpiarTodosLosChecks();
        props.deleteProperty('PENDIENTES');
        
        // Opcional: eliminar archivo después de 1 hora
        ScriptApp.newTrigger('eliminarPDFTemporal')
            .timeBased()
            .after(3600000) // 1 hora
            .create();
        props.setProperty('PDF_TEMP_ID', archivo.getId());
        
        Logger.log("✅ Enviado: " + pendientes.length + " productos");
        
    } catch (err) {
        Logger.log("❌ Error en enviarProductosAgrupados: " + err);
    }
}

/****************************************
 * CREAR PDF CON PRODUCTOS E IMÁGENES (LAYOUT DE 2 COLUMNAS CORREGIDO)
 ****************************************/
function crearPDFProductos(productos) {
  // Descargar imágenes y convertir a base64
  var productosConImagenes = productos.map(function(p) {
    var imagenBase64 = '';
    
    if (p.url && p.url.toString().trim() !== '') { 
      try {
        // Incluimos el token de autorización (OAuth) para acceder a imágenes en Drive
        var response = UrlFetchApp.fetch(p.url, {
          muteHttpExceptions: true, 
          followRedirects: true, 
          headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() }
        });
        
        if (response.getResponseCode() === 200) {
          var blob = response.getBlob();
          if (blob.getContentType().indexOf('image/') === 0) {
              imagenBase64 = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
          }
        }
      } catch (e) {
        Logger.log('Error descargando imagen: ' + p.url + ' Detalle: ' + e);
      }
    }
    return Object.assign({}, p, { imagenBase64: imagenBase64 }); 
  });

  var htmlBody = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body { font-family: Arial, sans-serif; margin: 30px; background: #f5f5f5; }h1 { color: #2c3e50; text-align: center; border-bottom: 3px solid #3498db; padding-bottom: 15px; margin-bottom: 30px; }.productos-grid {display: flex;flex-wrap: wrap;gap: 20px;justify-content: space-between;}.producto { border: 2px solid #ddd; border-radius: 10px; padding: 20px; margin: 10px 0; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 48%; box-sizing: border-box; }.proveedor { background: #3498db; color: white; padding: 8px 15px; border-radius: 5px; display: inline-block; font-weight: bold; margin-bottom: 15px; font-size: 0.95em; }.contenido { display: flex; align-items: flex-start; gap: 20px; }.imagen-container { flex-shrink: 0; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; border: 2px solid #e0e0e0; border-radius: 8px; background: #fafafa; overflow: hidden; }.imagen { max-width: 100%; max-height: 100%; object-fit: contain; }.sin-imagen { color: #bbb; font-size: 0.85em; text-align: center; }.detalles { flex: 1; display: flex; flex-direction: column; gap: 8px; }.codigo { color: #7f8c8d; font-size: 0.9em; font-family: monospace; }.nombre { font-size: 1.15em; font-weight: bold; color: #2c3e50; line-height: 1.4; }.precio { color: #27ae60; font-size: 1.5em; font-weight: bold; margin-top: 10px; }.fecha { text-align: center; color: #95a5a6; margin-top: 30px; font-size: 0.9em; padding-top: 20px; border-top: 1px solid #ddd; }</style></head><body><h1>📦 Actualización de Precios</h1><div class="productos-grid">' + productosConImagenes.map(function(p) {
    return '<div class="producto"><div class="proveedor">' + p.hoja + '</div><div class="contenido"><div class="imagen-container">' + (p.imagenBase64 ? '<img class="imagen" src="' + p.imagenBase64 + '" alt="' + p.producto + '">' : '<div class="sin-imagen">Sin imagen</div>') + '</div><div class="detalles"><div class="codigo">Código: ' + (p.codigo || 'N/A') + '</div><div class="nombre">' + p.producto + '</div><div class="precio">$ ' + p.precio + '</div></div></div></div>';
  }).join('') + '</div><div class="fecha">Generado el ' + new Date().toLocaleString('es-AR', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'}) + '</div></body></html>';
  
  return Utilities.newBlob(htmlBody, 'text/html').getAs('application/pdf')
    .setName('actualizacion_precios_' + new Date().getTime() + '.pdf');
}

/****************************************
 *  CONSTRUIR MENSAJE PARA DISCORD
 ****************************************/
function construirMensaje(productos) {
    var proveedores = productos.map(function(p) { return p.hoja; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
    var total = productos.length;

    var mensaje = '🔔 **ACTUALIZACIÓN DE PRECIOS**\n\n';
    mensaje += 'Se actualizaron **' + total + ' producto' + (total > 1 ? 's' : '') + '** de ';
    mensaje += proveedores.length + ' proveedor' + (proveedores.length > 1 ? 'es' : '') + ':\n\n';

    // Agrupar por proveedor
    proveedores.forEach(function(prov) {
        var prodsProv = productos.filter(function(p) { return p.hoja === prov; });
        mensaje += '__' + prov + '__\n';
        prodsProv.forEach(function(p) {
            mensaje += '  • ' + p.producto + ' - **$' + p.precio + '**\n'; 
        });
        mensaje += '\n';
    });

    mensaje += '📄 **PDF con imágenes y detalles completos:**\n';

    return mensaje;
}

/****************************************
 *  ENVIAR MENSAJE CON PDF A DISCORD
 ****************************************/
function enviarMensajeConPDF(mensaje, urlPDF, cantidad) {
    var embed = {
        title: "📋 Reporte Completo",
        description: "Descarga el PDF para ver las imágenes de los productos",
        color: 3447003,
        fields: [
            {
                name: "📦 Total de productos",
                value: cantidad.toString(),
                inline: true
            },
            {
                name: "📅 Fecha",
                value: new Date().toLocaleDateString('es-AR'),
                inline: true
            }
        ],
        timestamp: new Date().toISOString()
    };

    var payload = {
        content: mensaje + urlPDF,
        embeds: [embed]
    };

    var params = {
        method: "post",
        contentType: "application/json",
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };

    var resp = UrlFetchApp.fetch(WEBHOOK_URL, params);
    Logger.log("📨 Discord: " + resp.getResponseCode());
}


// --- FUNCIONES DE SOPORTE Y LIMPIEZA ---

/****************************************
 * LIMPIEZA DE CHECKS (Solo los marcados como true)
 ****************************************/
function limpiarChecksActualizado() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  HOJAS.forEach(function(nombreHoja) {
    try {
      var hoja = spreadsheet.getSheetByName(nombreHoja);
      if (!hoja) return;
      
      var ultimaFila = hoja.getLastRow();
      if (ultimaFila < 2) return;
      
      var checkRange = hoja.getRange(2, COL_ACTUALIZADO, ultimaFila - 1, 1);
      var checks = checkRange.getValues();
      
      var changed = false;
      var newChecks = checks.map(function(row) {
        if (row[0] === true) {
          changed = true;
          return [false];
        }
        return row;
      });
      
      if (changed) {
        checkRange.setValues(newChecks);
      }
      
    } catch (err) {
      Logger.log("Error limpiando checks en hoja " + nombreHoja + ": " + err);
    }
  });
}

/****************************************
 * LIMPIEZA TOTAL DE CHECKS (para el flujo de Discord)
 ****************************************/
function limpiarTodosLosChecks() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  HOJAS.forEach(function(nombreHoja) {
    try {
      var hoja = spreadsheet.getSheetByName(nombreHoja);
      if (!hoja) return;
      
      var ultimaFila = hoja.getLastRow();
      if (ultimaFila < 2) return;
      
      hoja.getRange(2, COL_ACTUALIZADO, ultimaFila - 1, 1).setValue(false);
      
    } catch (err) {
      Logger.log("Error limpiando checks en hoja " + nombreHoja + ": " + err);
    }
  });
  Logger.log("Checks limpiados en todas las hojas.");
}

/****************************************
 * ELIMINAR PDF TEMPORAL (OPCIONAL)
 ****************************************/
function eliminarPDFTemporal() {
  try {
    var props = PropertiesService.getScriptProperties();
    var pdfId = props.getProperty('PDF_TEMP_ID');
    
    if (pdfId) {
      var file = DriveApp.getFileById(pdfId);
      file.setTrashed(true);
      props.deleteProperty('PDF_TEMP_ID');
      Logger.log('PDF temporal ' + pdfId + ' eliminado.');
    } else {
      Logger.log('No hay ID de PDF temporal para eliminar.');
    }
    
  } catch (err) {
    Logger.log("Error eliminando PDF: Asegúrese de que el ID del archivo no haya expirado o ya fue eliminado. Detalle: " + err);
  }
}


// --- FUNCIONES DE DIAGNÓSTICO (Auxiliares) ---

function ejecutarPruebaManual() {
  var nombreHojaDePrueba = 'R1-SM'; 
  
  Logger.log('Iniciando prueba manual para la hoja: ' + nombreHojaDePrueba);
  Logger.log('Fin de la prueba manual. (verificarYAlertarHoja debe ser implementada si existe).');
}

function verificarConexionesExternas() {
  try {
    SpreadsheetApp.openById(SPREADSHEET_ID_INVENTARIO).getSheetByName(HOJA_INVENTARIO);
    Logger.log("✅ Conexión a INVENTARIO OK.");
  } catch (e) {
    Logger.log('❌ FALLA en SPREADSHEET_ID_INVENTARIO o HOJA_INVENTARIO: ' + e.message);
  }
  
  try {
    SpreadsheetApp.openById(ID_PROVEEDORES);
    Logger.log("✅ Conexión a PROVEEDORES OK.");
  } catch (e) {
    Logger.log('❌ FALLA en ID_PROVEEDORES: ' + e.message);
  }
}

/****************************************
 * DIAGNÓSTICO DE CONEXIÓN A DISCORD
 ****************************************/
function ejecutarDiagnosticoDiscord() {
  Logger.log('==================================================');
  Logger.log('▶️ INICIANDO DIAGNÓSTICO DE DISCORD');
  Logger.log('==================================================');

  // 1. Verificar existencia de la URL
  if (WEBHOOK_URL.indexOf("api/webhooks") === -1) {
    Logger.log('❌ ERROR CRÍTICO: La constante WEBHOOK_URL no parece contener una URL de Discord válida.');
    return;
  }
  Logger.log('✅ WEBHOOK_URL parece ser una URL de Discord válida.');

  // 2. Simular el envío a Discord
  try {
    enviarMensajeSimpleDiscord("DIAGNÓSTICO AUTOMÁTICO - Prueba de conexión OK.");
    Logger.log('✅ El intento de envío a Discord ha finalizado (revisa tu canal).');

  } catch (e) {
    Logger.log('❌ ERROR DURANTE EL ENVÍO A DISCORD (Checkea los detalles del error a continuación):');
    Logger.log('   Detalle del Error: ' + e.toString());
  }

  Logger.log('==================================================');
  Logger.log('▶️ DIAGNÓSTICO FINALIZADO. REVISA EL LOG COMPLETO.');
  Logger.log('==================================================');
}

/**
 * Función de soporte simple para probar la URL de Discord
 */
function enviarMensajeSimpleDiscord(mensaje) {
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify({
      'content': mensaje
    }),
    'muteHttpExceptions': true 
  };
  
  var response = UrlFetchApp.fetch(WEBHOOK_URL, options); 
  
  if (response.getResponseCode() !== 204) { 
    Logger.log('❌ ERROR HTTP de Discord (NO 204): Código ' + response.getResponseCode());
    Logger.log('   Respuesta del servidor: ' + response.getContentText());
    throw new Error('Fallo de conexión HTTP. Código: ' + response.getResponseCode());
  }
}

// ==========================================
// 🕵️‍♂️ ZONA DE DIAGNÓSTICO PROFUNDO
// ==========================================

function DIAGNOSTICO_SISTEMA_CATALOGO() {
  var SLIDES_ID = '1P4I5q7gYEB8KTOC7srfQkEPi0UXX78xm7v57olSK8z4';
  var SHEET_ID = '1-DyX0FvHgUtqTDbxpxkwkyqhYROpn-BZ0_2iwp-kY-c';
  
  Logger.log("🔍 INICIANDO DIAGNÓSTICO DE CATÁLOGO...");

  // PRUEBA 1: Acceso a Google Sheets
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    Logger.log("✅ PASO 1: Conexión con Sheets exitosa. Nombre: " + ss.getName());
  } catch (e) {
    Logger.log("❌ ERROR PASO 1: No se puede acceder a la Planilla. Revisa el ID o permisos. " + e.toString());
    return;
  }

  // PRUEBA 2: Acceso a Google Slides
  try {
    var deck = SlidesApp.openById(SLIDES_ID);
    Logger.log("✅ PASO 2: Conexión con Slides exitosa. Título: " + deck.getName());
  } catch (e) {
    Logger.log("❌ ERROR PASO 2: No se puede acceder al Slide. ¿El ID es correcto? ¿Tienes permiso de edición? " + e.toString());
    return;
  }

  // PRUEBA 3: Verificación de Hojas de Proveedores
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var hojasRequeridas = ['RAMOLAC', 'ALFONSINA', 'FRIAR y CODINA', 'LC/LR y LA LECHERITA', 'TREMBLAY/DON OTTO', 'LA VIRGINIA', 'BAGGIO/MAYONESAS', 'ILOLAY'];
    hojasRequeridas.forEach(function(h) {
      var existe = ss.getSheetByName(h);
      if (existe) Logger.log("   - Hoja '" + h + "' encontrada.");
      else Logger.log("   ⚠️ ADVERTENCIA: Hoja '" + h + "' NO encontrada. Revisa mayúsculas/minúsculas.");
    });
  } catch (e) {
    Logger.log("❌ ERROR PASO 3: Fallo al leer los nombres de las hojas.");
  }

  // PRUEBA 4: Simulación de Búsqueda de Código
  try {
    Logger.log("✅ PASO 4: Probando lógica de reemplazo...");
    var deck = SlidesApp.openById(SLIDES_ID);
    var totalSlides = deck.getSlides().length;
    Logger.log("   - El Slide tiene " + totalSlides + " diapositivas.");
    
    // Verificamos si hay cuadros de texto
    var primerSlide = deck.getSlides()[0];
    var formas = primerSlide.getShapes();
    Logger.log("   - En la primera diapositiva hay " + formas.length + " elementos.");
  } catch (e) {
    Logger.log("❌ ERROR PASO 4: Fallo al leer el contenido del Slide.");
  }

  Logger.log("🏁 DIAGNÓSTICO FINALIZADO.");
}

/**
 * Tu función para recolectar los precios marcados y mostrarlos en un modal.
 */
function generarListaPreciosParaCopiar() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var listaTexto = "LISTA DE PRECIOS PARA EL CATÁLOGO\n";
  listaTexto += "----------------------------------\n";
  var contador = 0;

  HOJAS.forEach(function(nombreHoja) {
    try {
      var hoja = spreadsheet.getSheetByName(nombreHoja);
      if (!hoja) return;

      var ultimaFila = hoja.getLastRow();
      if (ultimaFila < 2) return;

      // Obtenemos datos desde Col A hasta Col E
      var data = hoja.getRange(2, 1, ultimaFila - 1, 5).getValues();

      data.forEach(function(fila) {
        var codigo = fila[COL_CODIGO - 1]; // Columna A
        var precioPR = fila[COL_PRECIO_PR - 1]; // Columna C
        var estaActualizado = fila[COL_ACTUALIZADO - 1]; // Columna E

        if (estaActualizado === true && codigo) {
          var precioFormateado = "$ " + (parseFloat(precioPR) || 0).toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          
          listaTexto += 'COD ' + codigo + ': ' + precioFormateado + '\n';
          contador++;
        }
      });
    } catch (err) {
      Logger.log('Error en hoja ' + nombreHoja + ': ' + err.message);
    }
  });

  if (contador === 0) {
    SpreadsheetApp.getUi().alert("⚠️ No hay productos marcados como 'ACTUALIZADO' en la Columna E.");
    return;
  }

  var htmlOutput = HtmlService
      .createHtmlOutput('<p style="font-family: Arial;">Copiá estos valores para tu Slide:</p>' +
                        '<textarea style="width:100%; height:200px; font-family: monospace;" readonly>' + 
                        listaTexto + '</textarea>')
      .setWidth(450)
      .setHeight(350);
  
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Precios Listos para Copiar");
}

/**
 * PROCESO INVERSO: Busca precios en el Slide y los vuelve a convertir en Códigos.
 */
function revertirPreciosACodigos() {
  var SLIDES_ID = '1P4I5q7gYEB8KTOC7srfQkEPi0UXX78xm7v57olSK8z4';
  var spreadsheet = SpreadsheetApp.openById(ID_PROVEEDORES);
  var mapaInverso = {};
  
  // 1. Mapeamos Precio -> Código recorriendo todas las hojas
  HOJAS.forEach(function(nombreHoja) {
    try {
      var hoja = spreadsheet.getSheetByName(nombreHoja);
      if (!hoja) return;
      
      var ultimaFila = hoja.getLastRow();
      if (ultimaFila < 2) return;
      
      var data = hoja.getRange(2, 1, ultimaFila - 1, 3).getValues();
      
      data.forEach(function(row) {
        var codigo = row[COL_CODIGO - 1] ? row[COL_CODIGO - 1].toString().trim() : '';
        var precioRaw = row[COL_PRECIO_PR - 1];
        
        if (codigo && precioRaw) {
          var precioFormateado = "$ " + parseFloat(precioRaw).toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          mapaInverso[precioFormateado] = codigo;
        }
      });
    } catch (err) {
      Logger.log('Error en hoja ' + nombreHoja + ': ' + err.message);
    }
  });

  // 2. Buscamos y reemplazamos en el Google Slides
  try {
    var presentacion = SlidesApp.openById(SLIDES_ID);
    var diapositivas = presentacion.getSlides();
    var reemplazos = 0;

    diapositivas.forEach(function(slide) {
      slide.getShapes().forEach(function(forma) {
        if (forma.getShapeType() === SlidesApp.ShapeType.TEXT_BOX) {
          var textoShape = forma.getText();
          var contenido = textoShape.asString().trim();
          
          if (mapaInverso.hasOwnProperty(contenido)) {
            textoShape.setText(mapaInverso[contenido]);
            reemplazos++;
          }
        }
      });
    });
    
    SpreadsheetApp.getUi().alert('✅ Proceso Inverso completado. Se restauraron ' + reemplazos + ' códigos en el Slide.');
  } catch (err) {
    SpreadsheetApp.getUi().alert('❌ Error al acceder al Slide: ' + err.message);
  }
}

/*****************************************************************
Coloca Una diapositiva al inicio con codigo y producto
 */
function crearEtiquetasEnNuevaSlide() {
  const SLIDES_ID = '1akyKUYOURQF3AQ7s5-joxsKQzac5XSoO6lyyC-wHbLw'; // ID de tu Catálogo [4, 5]
  const spreadsheet = SpreadsheetApp.openById(ID_PROVEEDORES); // ID de tu planilla de proveedores [5-7]
  let productosParaCrear = [];

  // 1. RECOLECCIÓN: Buscamos productos con el check en Columna E (ACTUALIZADO) [8-10]
  HOJAS.forEach(nombreHoja => {
    try {
      const hoja = spreadsheet.getSheetByName(nombreHoja);
      if (!hoja) return;
      const data = hoja.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        const checkActualizado = data[i][COL_ACTUALIZADO - 1]; // Columna E (Índice 4) [8, 11]

        if (checkActualizado === true) {
          const codigo = data[i][COL_CODIGO - 1] ? data[i][COL_CODIGO - 1].toString().trim() : ''; // Col A [11, 12]
          let precioRaw = data[i][COL_PRECIO_PR - 1] || 0; // Columna C (Precio PR) [11, 12]
          
          // Normalización para asegurar que el precio sea numérico [13, 14]
          if (typeof precioRaw === 'string') precioRaw = parseFloat(precioRaw.replace(/,/g, '.'));

          if (codigo) {
            productosParaCrear.push({ codigo: codigo, precio: precioRaw });
          }
        }
      }
    } catch (err) {
      Logger.log(`Error recolectando en hoja ${nombreHoja}: ${err.message}`);
    }
  });

  if (productosParaCrear.length === 0) {
    Logger.log("⚠️ No hay productos marcados en la Columna E.");
    return;
  }

  // 2. CREACIÓN EN SLIDES: Nueva diapositiva al principio
  try {
    const presentacion = SlidesApp.openById(SLIDES_ID);
    // Inserta la diapositiva en la posición 0 (primera página) [User Request]
    const nuevaSlide = presentacion.insertSlide(0); 
    
    let posX = 30; // Posición inicial X
    let posY = 30; // Posición inicial Y
    const anchoCaja = 300;
    const altoCaja = 60;

    productosParaCrear.forEach((prod, index) => {
      // Formato del precio: "$" seguido del valor (ej: $950) [User Request]
      const precioFmt = "$" + Number(prod.precio).toLocaleString('es-AR', { minimumFractionDigits: 0 });
      const prefijo = "(COD " + prod.codigo + ":) "; // Formato (COD X:) [User Request]
      const textoCompleto = prefijo + precioFmt;

      // Insertamos un cuadro de texto para cada producto
      const shape = nuevaSlide.insertShape(SlidesApp.ShapeType.TEXT_BOX, posX, posY, anchoCaja, altoCaja);
      const textRange = shape.getText();
      textRange.setText(textoCompleto);

      // APLICACIÓN DE ESTILOS DIFERENCIADOS
      const puntoCorte = prefijo.length;

      // Parte 1: (COD X:) -> Arial 18 [User Request]
      textRange.getRange(0, puntoCorte).getTextStyle()
        .setFontFamily("Arial")
        .setFontSize(18);

      // Parte 2: $PRECIO -> Arial 25 [User Request]
      textRange.getRange(puntoCorte, textoCompleto.length).getTextStyle()
        .setFontFamily("Arial")
        .setFontSize(25);

      // Lógica simple para organizar las etiquetas en columnas
      posY += 70;
      if (posY > 350) { 
        posY = 30;
        posX += 320;
      }
    });

    Logger.log(`✅ Se creó una nueva slide con ${productosParaCrear.length} etiquetas.`);
    
    // 3. LIMPIEZA: Reseteamos los checks en la planilla [10, 15, 16]
    limpiarChecksActualizado();

  } catch (err) {
    Logger.log("❌ Error al crear la diapositiva: " + err.message);
  }
}
/**
 * Busca cuadros de texto que contienen el CÓDIGO y los reemplaza 
 * por el formato: COD [Código]: $[Precio]
 */
function actualizarPreciosEnSlides() {
  const SLIDES_ID = '1akyKUYOURQF3AQ7s5-joxsKQzac5XSoO6lyyC-wHbLw'; // ID correcto según diagnóstico [2, 3]
  const spreadsheet = SpreadsheetApp.openById(ID_PROVEEDORES);
  const baseDatos = {};

  // 1. Recolección de datos de la planilla (Columnas A y C) [4, 5]
  HOJAS.forEach(nombre => {
    const sheet = spreadsheet.getSheetByName(nombre);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][COL_ACTUALIZADO - 1] === true) { // Solo si Columna E es TRUE [5]
        let cod = data[i][COL_CODIGO - 1] ? data[i][COL_CODIGO - 1].toString().trim() : "";
        let precio = data[i][COL_PRECIO_PR - 1];
        if (cod) baseDatos[cod] = precio;
      }
    }
  });

  // 2. Procesamiento del Slide con búsqueda parcial (indexOf)
  try {
    const deck = SlidesApp.openById(SLIDES_ID);
    let cambios = 0;

    deck.getSlides().forEach(slide => {
      slide.getShapes().forEach(shape => {
        if (shape.getShapeType() === SlidesApp.ShapeType.TEXT_BOX) {
          const textRange = shape.getText();
          const textoActual = textRange.asString().trim();

          // REGLA CLAVE: Buscamos si el código está "dentro" del texto
          for (let codigo in baseDatos) {
            // Buscamos el patrón que ya tenés en el Slide: "(COD X:)" [6]
            const buscador = "COD " + codigo + ":";
            
            if (textoActual.indexOf(buscador) !== -1) {
              const precioVal = baseDatos[codigo];
              const precioFmt = "$" + Number(precioVal).toLocaleString('es-AR', {minimumFractionDigits: 0});
              const prefijo = "(COD " + codigo + ":) ";
              const nuevoTexto = prefijo + precioFmt;

              textRange.setText(nuevoTexto);

              // 3. Aplicamos Formatos: Arial 18 para Código y Arial 25 para Precio [7]
              const puntoCorte = prefijo.length;
              
              // Código -> Arial 18
              textRange.getRange(0, puntoCorte).getTextStyle()
                .setFontFamily("Arial")
                .setFontSize(18);
              
              // Precio -> Arial 25
              textRange.getRange(puntoCorte, nuevoTexto.length).getTextStyle()
                .setFontFamily("Arial")
                .setFontSize(25);
              
              cambios++;
              break; // Pasa al siguiente cuadro de texto
            }
          }
        }
      });
    });
    Logger.log("✅ Proceso terminado. Se actualizaron " + cambios + " cuadros.");
  } catch (err) {
    Logger.log("❌ Error en Slides: " + err.message);
  }
}
/**
 * Actualiza el Catálogo de MP usando la Columna D.
 * ID Nuevo: 1QKrfMYG-CVCh0hrO2ECWc9Y9GO2pAG5H4Uy49MVuL7k
 */
function actualizarPreciosMPEnSlides() {
  const SLIDES_ID_MP = '1QKrfMYG-CVCh0hrO2ECWc9Y9GO2pAG5H4Uy49MVuL7k'; // Tu nuevo ID
  const spreadsheet = SpreadsheetApp.openById(ID_PROVEEDORES);
  const baseDatos = {};

  // 1. Recolección de datos: Código (A) y Precio MP (D)
  HOJAS.forEach(nombre => {
    const sheet = spreadsheet.getSheetByName(nombre);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      // Verifica si el check de la Columna E (ACT) está en TRUE [4], [5]
      if (data[i][COL_ACTUALIZADO - 1] === true) {
        let cod = data[i][COL_CODIGO - 1] ? data[i][COL_CODIGO - 1].toString().trim() : "";
        let precioMP = data[i][COL_PRECIO_MP - 1]; // Columna D [1], [3]
        if (cod) baseDatos[cod] = precioMP;
      }
    }
  });

  // 2. Actualización en el nuevo Slide
  try {
    const deck = SlidesApp.openById(SLIDES_ID_MP);
    let cambios = 0;

    deck.getSlides().forEach(slide => {
      slide.getShapes().forEach(shape => {
        if (shape.getShapeType() === SlidesApp.ShapeType.TEXT_BOX) {
          const textRange = shape.getText();
          const textoActual = textRange.asString().trim();

          for (let codigo in baseDatos) {
            const buscador = "COD " + codigo + ":";
            
            // Lógica de búsqueda parcial para no ignorar el cuadro [Conversación Previa]
            if (textoActual.indexOf(buscador) !== -1) {
              const precioFmt = "$" + Number(baseDatos[codigo]).toLocaleString('es-AR', {minimumFractionDigits: 0});
              const prefijo = "(COD " + codigo + ":) ";
              const nuevoTexto = prefijo + precioFmt;

              textRange.setText(nuevoTexto);

              // 3. Estilos duales: Arial 18 para Código y Arial 25 para Precio [6, 7]
              const puntoCorte = prefijo.length;
              textRange.getRange(0, puntoCorte).getTextStyle()
                .setFontFamily("Arial").setFontSize(18);
              
              textRange.getRange(puntoCorte, nuevoTexto.length).getTextStyle()
                .setFontFamily("Arial").setFontSize(25);
              
              cambios++;
            }
          }
        }
      });
    });
    Logger.log("✅ Catálogo MP actualizado. Cambios: " + cambios);
    limpiarChecksActualizado(); // Limpia los checks en la planilla [8], [9]
  } catch (err) {
    Logger.log("❌ Error en Slides MP: " + err.message);
  }
}
