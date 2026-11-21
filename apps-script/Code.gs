/**
 * Syam Incubators - Google Apps Script Backend
 * Spreadsheet ID: 1aRUoNQrjJaB280hs_e2Z_kKehYvAe4vY0pj7LrHTDP0
 */

var SPREADSHEET_ID = '1aRUoNQrjJaB280hs_e2Z_kKehYvAe4vY0pj7LrHTDP0';
var ADMIN_USER = 'admin';
var ADMIN_PASS = 'admin123';

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSheetWithHeaders(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
  }
  return sheet;
}

function matchId(cellVal, targetId) {
  if (cellVal === null || cellVal === undefined || targetId === null || targetId === undefined) return false;
  if (Number(cellVal) === Number(targetId)) return true;
  var s1 = String(cellVal).trim().toLowerCase();
  var s2 = String(targetId).trim().toLowerCase();
  if (s1 === s2) return true;
  var n1 = s1.replace(/[^0-9]/g, '');
  var n2 = s2.replace(/[^0-9]/g, '');
  if (n1 && n2 && Number(n1) === Number(n2)) return true;
  return false;
}

function getCustomersSheet(ss) {
  var headers = [
    'id', 'customer_name', 'num_eggs', 'village_city',
    'mobile_number', 'egg_mark', 'date_received', 'incubation_days',
    'price_per_egg', 'amount_paid', 'created_at', 'seal',
    'total_amount', 'balance', 'alt_phone', 'egg_age_days', 'notes',
    'delivery_status', 'chicks_count', 'delivered_at'
  ];
  var sheet = ensureSheetWithHeaders(ss, 'customers', headers);
  var maxCols = sheet.getMaxColumns();
  if (maxCols < headers.length) {
    sheet.insertColumnsAfter(maxCols, headers.length - maxCols);
  }

  var firstRow = sheet.getRange(1, 1, 1, Math.min(sheet.getLastColumn() || 1, sheet.getMaxColumns())).getValues()[0];
  var colMap = {};
  for (var i = 0; i < firstRow.length; i++) {
    var h = String(firstRow[i]).trim().toLowerCase();
    if (h) colMap[h] = i + 1;
  }
  if (!colMap['seal']) {
    sheet.getRange(1, 12).setValue('seal');
  }
  if (!colMap['total_amount']) {
    sheet.getRange(1, 13).setValue('total_amount');
  }
  if (!colMap['balance']) {
    sheet.getRange(1, 14).setValue('balance');
  }
  if (!colMap['alt_phone']) {
    sheet.getRange(1, 15).setValue('alt_phone');
  }
  if (!colMap['egg_age_days']) {
    sheet.getRange(1, 16).setValue('egg_age_days');
  }
  if (!colMap['notes']) {
    sheet.getRange(1, 17).setValue('notes');
  }
  if (!colMap['delivery_status']) {
    sheet.getRange(1, 18).setValue('delivery_status');
  }
  if (!colMap['chicks_count']) {
    sheet.getRange(1, 19).setValue('chicks_count');
  }
  if (!colMap['delivered_at']) {
    sheet.getRange(1, 20).setValue('delivered_at');
  }
  return sheet;
}

function getSettingsSheet(ss) {
  var sheet = ss.getSheetByName('settings');
  if (!sheet) {
    sheet = ss.insertSheet('settings');
    sheet.appendRow(['key', 'value']);
    sheet.appendRow(['default_incubation_days', '21']);
    sheet.appendRow(['hatchery_days_before', '3']);
    sheet.appendRow(['default_price_per_egg', '15']);
  }
  return sheet;
}

function computeVirtualFields(c) {
  var id = Number(c.id);
  var custId = id ? 'INC_' + String(id).padStart(4, '0') : null;

  var dateRecStr = '';
  if (c.date_received instanceof Date) {
    dateRecStr = Utilities.formatDate(c.date_received, 'GMT+05:30', 'yyyy-MM-dd');
  } else if (c.date_received) {
    var rawStr = String(c.date_received).trim();
    if (rawStr.indexOf('T') !== -1) {
      dateRecStr = rawStr.split('T')[0];
    } else {
      var dCheck = new Date(rawStr);
      if (!isNaN(dCheck.getTime())) {
        dateRecStr = Utilities.formatDate(dCheck, 'GMT+05:30', 'yyyy-MM-dd');
      } else {
        dateRecStr = rawStr;
      }
    }
  }

  var deliveryDate = null;
  if (dateRecStr && c.incubation_days) {
    var d = new Date(dateRecStr + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + Number(c.incubation_days));
      deliveryDate = Utilities.formatDate(d, 'GMT+05:30', 'yyyy-MM-dd');
    }
  }

  var numEggs = Number(c.num_eggs || 0);
  var pricePerEgg = Number(c.price_per_egg || 0);
  var amountPaid = Number(c.amount_paid || 0);
  var totalAmount = (c.total_amount !== undefined && c.total_amount !== '' && !isNaN(Number(c.total_amount))) ? Number(c.total_amount) : (numEggs * pricePerEgg);
  var balance = (c.balance !== undefined && c.balance !== '' && !isNaN(Number(c.balance))) ? Number(c.balance) : (totalAmount - amountPaid);

  c.id = id;
  c.customerId = custId;
  c.date_received = dateRecStr || c.date_received;
  c.deliveryDate = deliveryDate;
  c.total_amount = totalAmount;
  c.balance = balance;
  c.num_eggs = numEggs;
  c.price_per_egg = pricePerEgg;
  c.amount_paid = amountPaid;
  c.incubation_days = Number(c.incubation_days || 21);
  c.createdAt = c.created_at || c.date_received;
  c.seal = (c.seal && String(c.seal).trim().toLowerCase() === 'yes') ? 'Yes' : 'No';
  c.alt_phone = (c.alt_phone !== undefined && c.alt_phone !== null) ? String(c.alt_phone).trim() : '';
  c.egg_age_days = (c.egg_age_days !== undefined && c.egg_age_days !== null && c.egg_age_days !== '') ? Number(c.egg_age_days) : '';
  c.notes = (c.notes !== undefined && c.notes !== null) ? String(c.notes).trim() : '';
  c.delivery_status = (c.delivery_status !== undefined && c.delivery_status !== null) ? String(c.delivery_status).trim() : '';
  c.chicks_count = (c.chicks_count !== undefined && c.chicks_count !== null && c.chicks_count !== '') ? Number(c.chicks_count) : '';
  c.delivered_at = (c.delivered_at !== undefined && c.delivered_at !== null) ? String(c.delivered_at).trim() : '';

  return c;
}

function readAllSettings(ss) {
  var sheet = getSettingsSheet(ss);
  var data = sheet.getDataRange().getValues();
  var settings = {
    default_incubation_days: 21,
    hatchery_days_before: 3,
    default_price_per_egg: 15
  };
  for (var i = 1; i < data.length; i++) {
    var k = String(data[i][0]).trim();
    var v = data[i][1];
    if (k) settings[k] = v;
  }
  return settings;
}

function readAllCustomers(ss) {
  var sheet = getCustomersSheet(ss);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0].map(function(h) { return String(h).trim(); });
  var customers = [];

  for (var r = 1; r < data.length; r++) {
    var row = data[r];
    if (!row[0]) continue;
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      var val = row[c];
      if (val instanceof Date) {
        if (headers[c] === 'created_at') {
          val = Utilities.formatDate(val, 'GMT+05:30', "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
        } else {
          val = Utilities.formatDate(val, 'GMT+05:30', 'yyyy-MM-dd');
        }
      }
      obj[headers[c]] = val;
    }
    customers.push(computeVirtualFields(obj));
  }

  return customers;
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Syam Incubators Google Apps Script backend is running',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {
        postData = e.parameter || {};
      }
    } else if (e && e.parameter) {
      postData = e.parameter;
    }

    var action = postData.action || '';
    var password = postData.password || postData.token || '';
    var ss = getSpreadsheet();

    // 1. Login action
    if (action === 'login') {
      var user = postData.username || '';
      var pass = postData.password || '';
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        return createJsonResponse({ token: ADMIN_PASS, username: ADMIN_USER });
      }
      return createErrorResponse('Invalid credentials', 401);
    }

    // 2. Authentication check
    if (password !== ADMIN_PASS) {
      return createErrorResponse('Unauthorized: Invalid or missing password', 401);
    }

    // 3. Customer actions
    if (action === 'getCustomers') {
      var customers = readAllCustomers(ss);
      var search = (postData.search || '').trim().toLowerCase();
      if (search) {
        customers = customers.filter(function(c) {
          return (
            (c.customer_name && String(c.customer_name).toLowerCase().indexOf(search) !== -1) ||
            (c.village_city && String(c.village_city).toLowerCase().indexOf(search) !== -1) ||
            (c.mobile_number && String(c.mobile_number).indexOf(search) !== -1)
          );
        });
      }
      customers.sort(function(a, b) {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });
      return createJsonResponse(customers);
    }

    if (action === 'getCustomer') {
      var allCusts = readAllCustomers(ss);
      for (var i = 0; i < allCusts.length; i++) {
        if (matchId(allCusts[i].id, postData.id)) {
          return createJsonResponse(allCusts[i]);
        }
      }
      return createErrorResponse('Customer not found (ID: ' + postData.id + ')', 404);
    }

    if (action === 'createCustomer') {
      var cSheet = getCustomersSheet(ss);
      var existing = readAllCustomers(ss);
      var maxId = 0;
      for (var j = 0; j < existing.length; j++) {
        var existingNumId = Number(existing[j].id);
        if (!isNaN(existingNumId) && existingNumId > maxId) maxId = existingNumId;
      }
      var newId = maxId + 1;
      var nowIso = Utilities.formatDate(new Date(), 'GMT+05:30', "yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
      var dateRec = postData.date_received || Utilities.formatDate(new Date(), 'GMT+05:30', 'yyyy-MM-dd');
      var sealVal = (postData.seal && String(postData.seal).trim().toLowerCase() === 'yes') ? 'Yes' : 'No';

      var eggsVal = Number(postData.num_eggs || 0);
      var priceVal = Number(postData.price_per_egg || 15);
      var paidVal = Number(postData.amount_paid || 0);
      var totalVal = eggsVal * priceVal;
      var balanceVal = totalVal - paidVal;
      var altPhoneVal = postData.alt_phone ? String(postData.alt_phone).trim() : '';
      var eggAgeVal = (postData.egg_age_days !== undefined && postData.egg_age_days !== null && postData.egg_age_days !== '') ? Number(postData.egg_age_days) : '';
      var notesVal = postData.notes ? String(postData.notes).trim() : '';

      var newRow = [
        newId,
        postData.customer_name || '',
        eggsVal,
        postData.village_city || '',
        postData.mobile_number || '',
        postData.egg_mark || '',
        dateRec,
        Number(postData.incubation_days || 21),
        priceVal,
        paidVal,
        nowIso,
        sealVal,
        totalVal,
        balanceVal,
        altPhoneVal,
        eggAgeVal,
        notesVal
      ];

      var curMaxCols = cSheet.getMaxColumns();
      if (curMaxCols < newRow.length) {
        cSheet.insertColumnsAfter(curMaxCols, newRow.length - curMaxCols);
      }

      cSheet.appendRow(newRow);

      var createdObj = {
        id: newId,
        customer_name: postData.customer_name || '',
        num_eggs: eggsVal,
        village_city: postData.village_city || '',
        mobile_number: postData.mobile_number || '',
        egg_mark: postData.egg_mark || '',
        date_received: dateRec,
        incubation_days: Number(postData.incubation_days || 21),
        price_per_egg: priceVal,
        amount_paid: paidVal,
        created_at: nowIso,
        seal: sealVal,
        total_amount: totalVal,
        balance: balanceVal,
        alt_phone: altPhoneVal,
        egg_age_days: eggAgeVal,
        notes: notesVal
      };

      return createJsonResponse(computeVirtualFields(createdObj));
    }

    if (action === 'updateCustomer') {
      var cSheetUpdate = getCustomersSheet(ss);
      var cValues = cSheetUpdate.getDataRange().getValues();
      var targetRowIndex = -1;

      for (var r = 1; r < cValues.length; r++) {
        if (matchId(cValues[r][0], postData.id)) {
          targetRowIndex = r + 1;
          break;
        }
      }

      if (targetRowIndex === -1) {
        return createErrorResponse('Customer not found (ID: ' + postData.id + ')', 404);
      }

      var existingRow = cValues[targetRowIndex - 1];
      var editId = existingRow[0];
      var existingCreatedAt = existingRow[10] || new Date().toISOString();
      var rawDateRec = existingRow[6];
      var formattedExistingDate = (rawDateRec instanceof Date)
        ? Utilities.formatDate(rawDateRec, 'GMT+05:30', 'yyyy-MM-dd')
        : (rawDateRec ? String(rawDateRec).split('T')[0] : '');
      var updatedDateReceived = postData.date_received || formattedExistingDate;
      var existingSeal = existingRow[11] ? String(existingRow[11]).trim() : 'No';
      var updatedSeal = postData.seal !== undefined ? (String(postData.seal).trim().toLowerCase() === 'yes' ? 'Yes' : 'No') : existingSeal;

      var updatedEggs = postData.num_eggs !== undefined ? Number(postData.num_eggs) : Number(existingRow[2] || 0);
      var updatedPrice = postData.price_per_egg !== undefined ? Number(postData.price_per_egg) : Number(existingRow[8] || 0);
      var updatedPaid = postData.amount_paid !== undefined ? Number(postData.amount_paid) : Number(existingRow[9] || 0);
      var updatedTotal = updatedEggs * updatedPrice;
      var updatedBalance = updatedTotal - updatedPaid;

      var updatedAltPhone = postData.alt_phone !== undefined ? String(postData.alt_phone).trim() : (existingRow[14] !== undefined ? String(existingRow[14]).trim() : '');
      var updatedEggAge = postData.egg_age_days !== undefined ? (postData.egg_age_days !== '' && postData.egg_age_days !== null ? Number(postData.egg_age_days) : '') : (existingRow[15] !== undefined && existingRow[15] !== '' ? Number(existingRow[15]) : '');
      var updatedNotes = postData.notes !== undefined ? String(postData.notes).trim() : (existingRow[16] !== undefined ? String(existingRow[16]).trim() : '');
      var updatedDeliveryStatus = postData.delivery_status !== undefined ? String(postData.delivery_status).trim() : (existingRow[17] !== undefined ? String(existingRow[17]).trim() : '');
      var updatedChicksCount = postData.chicks_count !== undefined ? (postData.chicks_count !== '' && postData.chicks_count !== null ? Number(postData.chicks_count) : '') : (existingRow[18] !== undefined && existingRow[18] !== '' ? Number(existingRow[18]) : '');
      var updatedDeliveredAt = postData.delivered_at !== undefined ? String(postData.delivered_at).trim() : (existingRow[19] !== undefined ? String(existingRow[19]).trim() : '');

      var updatedRow = [
        editId,
        postData.customer_name !== undefined ? postData.customer_name : existingRow[1],
        updatedEggs,
        postData.village_city !== undefined ? postData.village_city : existingRow[3],
        postData.mobile_number !== undefined ? postData.mobile_number : existingRow[4],
        postData.egg_mark !== undefined ? postData.egg_mark : existingRow[5],
        updatedDateReceived,
        postData.incubation_days !== undefined ? Number(postData.incubation_days) : existingRow[7],
        updatedPrice,
        updatedPaid,
        existingCreatedAt,
        updatedSeal,
        updatedTotal,
        updatedBalance,
        updatedAltPhone,
        updatedEggAge,
        updatedNotes,
        updatedDeliveryStatus,
        updatedChicksCount,
        updatedDeliveredAt
      ];

      var updateMaxCols = cSheetUpdate.getMaxColumns();
      if (updateMaxCols < updatedRow.length) {
        cSheetUpdate.insertColumnsAfter(updateMaxCols, updatedRow.length - updateMaxCols);
      }

      cSheetUpdate.getRange(targetRowIndex, 1, 1, updatedRow.length).setValues([updatedRow]);

      var updatedObj = {
        id: editId,
        customer_name: updatedRow[1],
        num_eggs: updatedRow[2],
        village_city: updatedRow[3],
        mobile_number: updatedRow[4],
        egg_mark: updatedRow[5],
        date_received: updatedRow[6],
        incubation_days: updatedRow[7],
        price_per_egg: updatedRow[8],
        amount_paid: updatedRow[9],
        created_at: existingCreatedAt,
        seal: updatedSeal,
        total_amount: updatedTotal,
        balance: updatedBalance,
        alt_phone: updatedAltPhone,
        egg_age_days: updatedEggAge,
        notes: updatedNotes,
        delivery_status: updatedDeliveryStatus,
        chicks_count: updatedChicksCount,
        delivered_at: updatedDeliveredAt
      };

      return createJsonResponse(computeVirtualFields(updatedObj));
    }

    if (action === 'deleteCustomer') {
      var cSheetDel = getCustomersSheet(ss);
      var delValues = cSheetDel.getDataRange().getValues();
      for (var dr = 1; dr < delValues.length; dr++) {
        if (matchId(delValues[dr][0], postData.id)) {
          cSheetDel.deleteRow(dr + 1);
          return createJsonResponse({ message: 'Deleted' });
        }
      }
      return createErrorResponse('Customer not found (ID: ' + postData.id + ')', 404);
    }

    if (action === 'getHatchery') {
      var settingsMap = readAllSettings(ss);
      var daysBefore = Number(settingsMap.hatchery_days_before || 3);
      var allC = readAllCustomers(ss);

      var withHatchery = allC.map(function(c) {
        var d = new Date(c.date_received + 'T00:00:00');
        d.setDate(d.getDate() + (c.incubation_days - daysBefore));
        c.hatcheryDate = Utilities.formatDate(d, 'GMT+05:30', 'yyyy-MM-dd');
        c.daysBefore = daysBefore;
        return c;
      });

      withHatchery.sort(function(a, b) {
        return (a.date_received || '').localeCompare(b.date_received || '');
      });

      return createJsonResponse(withHatchery);
    }

    if (action === 'getSettings') {
      var currentSettings = readAllSettings(ss);
      return createJsonResponse(currentSettings);
    }

    if (action === 'updateSettings') {
      var sSheet = getSettingsSheet(ss);
      var sValues = sSheet.getDataRange().getValues();
      var key = postData.key;
      var value = String(postData.value);
      var updated = false;

      for (var si = 1; si < sValues.length; si++) {
        if (String(sValues[si][0]).trim() === key) {
          sSheet.getRange(si + 1, 2).setValue(value);
          updated = true;
          break;
        }
      }

      if (!updated) {
        sSheet.appendRow([key, value]);
      }

      return createJsonResponse({ key: key, value: value });
    }

    if (action === 'transliterate') {
      var texts = postData.texts || [];
      var results = {};
      for (var tIdx = 0; tIdx < texts.length; tIdx++) {
        var text = texts[tIdx];
        if (!text || !text.trim()) {
          results[text] = text;
          continue;
        }
        try {
          var url = 'https://inputtools.google.com/request?text=' + encodeURIComponent(text) +
                    '&itc=te-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8';
          var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
          var data = JSON.parse(response.getContentText());
          if (data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1] && data[1][0][1][0]) {
            results[text] = data[1][0][1][0];
          } else {
            results[text] = text;
          }
        } catch (tErr) {
          results[text] = text;
        }
      }
      return createJsonResponse({ results: results });
    }

    return createErrorResponse('Unknown action: ' + action, 400);

  } catch (error) {
    return createErrorResponse(error.message || 'Server error', 500);
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function createErrorResponse(message, code) {
  return ContentService.createTextOutput(JSON.stringify({ error: message, code: code }))
    .setMimeType(ContentService.MimeType.JSON);
}
