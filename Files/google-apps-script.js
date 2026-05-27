/**
 * ============================================================
 *  Google Apps Script — Backend para Control Gastos App
 * ============================================================
 *
 *  INSTRUCCIONES DE DESPLIEGUE:
 *
 *  1. Abre tu spreadsheet en Google Sheets:
 *     https://docs.google.com/spreadsheets/d/1KLn5Ow_eoclIyx2LB0P89JC7vwmNSRV60iBjNepoJjA/edit
 *
 *  2. Ve a  Extensiones → Apps Script
 *
 *  3. Borra todo el contenido del editor y pega ESTE archivo completo.
 *
 *  4. Guarda el proyecto (Ctrl+S).
 *
 *  5. Haz clic en  Implementar → Nueva implementación
 *       • Tipo:        Aplicación web
 *       • Ejecutar como: Tu cuenta (yo@gmail.com)
 *       • Acceso:      Cualquier persona
 *
 *  6. Haz clic en "Implementar" y copia la URL generada.
 *
 *  7. Pega esa URL en la pantalla de configuración de la app.
 *
 *  IMPORTANTE: Cada vez que modifiques este script debes crear
 *  una NUEVA implementación para que los cambios surtan efecto.
 * ============================================================
 */

/* ---- Punto de entrada GET (lectura + escritura) ---- */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = e.parameter.action;
  var result;

  try {
    if (action === 'getCategories') {
      result = getCategories(ss);
    } else if (action === 'getExpenses') {
      result = getExpenses(ss, e.parameter.month);
    } else if (action === 'getSummary') {
      result = getSummary(ss, e.parameter.month);
    } else if (action === 'addExpense') {
      result = addExpense(
        ss,
        e.parameter.month,
        e.parameter.category,
        parseFloat(e.parameter.amount)
      );
    } else if (action === 'updateExpense') {
      result = updateExpense(
        ss,
        e.parameter.month,
        parseInt(e.parameter.row, 10),
        e.parameter.oldCategory,
        parseFloat(e.parameter.oldAmount),
        e.parameter.newCategory,
        parseFloat(e.parameter.newAmount)
      );
    } else {
      result = { error: 'Acción desconocida: ' + action };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---- Punto de entrada POST (solo escritura) ---- */

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var data = JSON.parse(e.postData.contents);
  var result;

  try {
    if (data.action === 'addExpense') {
      result = addExpense(ss, data.month, data.category, parseFloat(data.amount));
    } else if (data.action === 'updateExpense') {
      result = updateExpense(
        ss,
        data.month,
        parseInt(data.row, 10),
        data.oldCategory,
        parseFloat(data.oldAmount),
        data.newCategory,
        parseFloat(data.newAmount)
      );
    } else {
      result = { error: 'Acción desconocida' };
    }
  } catch (err) {
    result = { error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ================================================================
 *  FUNCIONES AUXILIARES
 * ================================================================ */

/**
 * Devuelve las categorías de gastos variables desde la pestaña (Categorías).
 */
function getCategories(ss) {
  var ws = ss.getSheetByName('(Categorías)');
  var data = ws.getRange('F2:F30').getValues();
  var categories = [];

  for (var i = 0; i < data.length; i++) {
    var val = String(data[i][0]).trim();
    if (val !== '') {
      categories.push(val);
    }
  }

  return { categories: categories };
}

/**
 * Encuentra dinámicamente las columnas de categoría y cantidad
 * de gastos variables en una hoja de mes.
 *
 * La fila 12 contiene los encabezados. "Categoría" aparece 3 veces:
 *   1.ª → Ingresos
 *   2.ª → Gastos Fijos
 *   3.ª → Gastos Variables   ← esta nos interesa
 *
 * La cantidad está siempre 2 columnas a la derecha de la categoría.
 */
function findVariableExpenseCols(ws) {
  var headerRow = ws.getRange(12, 1, 1, 25).getValues()[0];
  var catCount = 0;
  var catCol = -1;

  for (var i = 0; i < headerRow.length; i++) {
    if (String(headerRow[i]).trim() === 'Categoría') {
      catCount++;
      if (catCount === 3) {
        catCol = i + 1;   // 1-indexed para getRange()
        break;
      }
    }
  }

  if (catCol === -1) {
    throw new Error('No se encontraron las columnas de gastos variables');
  }

  return { catCol: catCol, amtCol: catCol + 2 };
}

/**
 * Devuelve la lista de gastos variables de un mes.
 */
function getExpenses(ss, month) {
  var ws = ss.getSheetByName(month);
  if (!ws) return { error: 'Mes no encontrado: ' + month };

  var cols = findVariableExpenseCols(ws);
  var lastRow = ws.getLastRow();
  var expenses = [];

  if (lastRow >= 13) {
    var numRows = lastRow - 12;
    var catData = ws.getRange(13, cols.catCol, numRows, 1).getValues();
    var amtData = ws.getRange(13, cols.amtCol, numRows, 1).getValues();

    for (var i = 0; i < catData.length; i++) {
      var cat = String(catData[i][0]).trim();
      if (cat !== '') {
        expenses.push({
          row: i + 13,
          category: cat,
          amount: parseFloat(amtData[i][0]) || 0
        });
      }
    }
  }

  return { expenses: expenses, month: month };
}

/**
 * Devuelve el resumen económico de un mes
 * (ingresos, gastos fijos, gastos variables, meta ahorro y restante mes).
 */
function getSummary(ss, month) {
  var ws = ss.getSheetByName(month);
  if (!ws) return { error: 'Mes no encontrado: ' + month };

  var row = ws.getRange(10, 1, 1, 25).getValues()[0];
  var income = 0, fixed = 0, variable = 0;

  for (var i = 0; i < row.length; i++) {
    var val = String(row[i]).trim();

    if (val === 'INGRESOS TOTALES') {
      income = parseFloat(row[i + 1]) || 0;
    }

    if (val === 'GASTOS FIJOS TOTALES') {
      for (var j = i + 1; j <= i + 3 && j < row.length; j++) {
        if (typeof row[j] === 'number' && row[j] > 0) {
          fixed = row[j];
          break;
        }
      }
    }

    if (val.indexOf('GASTOS VARIABLES') >= 0) {
      variable = parseFloat(row[i + 1]) || 0;
    }
  }

  // Meta ahorro fijada en la plantilla: columna I, fila 3.
  var desiredSavings = parseFloat(ws.getRange(3, 9).getValue()) || 0;
  var remainingMonth = income - fixed - variable - desiredSavings;

  // Mantiene compatibilidad con clientes previos que lean savings/remainingForExpenses.
  var legacyRemaining = income - fixed - variable;

  return {
    month: month,
    income: income,
    fixedExpenses: fixed,
    variableExpenses: variable,
    totalExpenses: fixed + variable,
    desiredSavings: desiredSavings,
    remainingMonth: remainingMonth,
    remainingForExpenses: legacyRemaining,
    savings: remainingMonth
  };
}

/**
 * Añade un gasto variable al mes indicado.
 * Busca la primera fila vacía en la columna de categorías.
 */
function addExpense(ss, month, category, amount) {
  var ws = ss.getSheetByName(month);
  if (!ws) return { error: 'Mes no encontrado: ' + month };

  var cols = findVariableExpenseCols(ws);
  var lastRow = Math.max(ws.getLastRow(), 12);
  var nextRow = 13;

  if (lastRow >= 13) {
    var numRows = lastRow - 12;
    var catData = ws.getRange(13, cols.catCol, numRows, 1).getValues();

    nextRow = lastRow + 1;          // por defecto: añadir al final
    for (var i = 0; i < catData.length; i++) {
      var cat = String(catData[i][0]).trim();
      if (cat === '') {
        nextRow = i + 13;           // primera fila vacía encontrada
        break;
      }
    }
  }

  ws.getRange(nextRow, cols.catCol).setValue(category);
  ws.getRange(nextRow, cols.amtCol).setValue(amount);

  return {
    success: true,
    row: nextRow,
    category: category,
    amount: amount,
    month: month
  };
}

/**
 * Actualiza la categoría y/o importe de un gasto variable existente.
 *
 * Primero verifica que la fila indicada contenga los valores originales.
 * Si no coinciden (porque se insertaron/borraron filas), busca el gasto
 * por categoría + importe, priorizando la fila más cercana a la original.
 */
function updateExpense(ss, month, row, oldCategory, oldAmount, newCategory, newAmount) {
  var ws = ss.getSheetByName(month);
  if (!ws) return { error: 'Mes no encontrado: ' + month };

  var cols = findVariableExpenseCols(ws);

  // Verificar que la fila indicada tenga los valores esperados
  var currentCat = String(ws.getRange(row, cols.catCol).getValue()).trim();
  var currentAmt = parseFloat(ws.getRange(row, cols.amtCol).getValue()) || 0;

  var targetRow = row;

  if (currentCat !== oldCategory || Math.abs(currentAmt - oldAmount) > 0.01) {
    // No coincide → buscar en todas las filas
    var lastRow = ws.getLastRow();
    targetRow = -1;

    if (lastRow >= 13) {
      var numRows = lastRow - 12;
      var catData = ws.getRange(13, cols.catCol, numRows, 1).getValues();
      var amtData = ws.getRange(13, cols.amtCol, numRows, 1).getValues();
      var bestDist = Infinity;

      for (var i = 0; i < catData.length; i++) {
        var r = i + 13;
        var cat = String(catData[i][0]).trim();
        var amt = parseFloat(amtData[i][0]) || 0;

        if (cat === oldCategory && Math.abs(amt - oldAmount) < 0.01) {
          var dist = Math.abs(r - row);
          if (dist < bestDist) {
            bestDist = dist;
            targetRow = r;
          }
        }
      }
    }

    if (targetRow === -1) {
      return { error: 'No se encontró el gasto a actualizar' };
    }
  }

  ws.getRange(targetRow, cols.catCol).setValue(newCategory);
  ws.getRange(targetRow, cols.amtCol).setValue(newAmount);

  return {
    success: true,
    row: targetRow,
    category: newCategory,
    amount: newAmount,
    month: month
  };
}
