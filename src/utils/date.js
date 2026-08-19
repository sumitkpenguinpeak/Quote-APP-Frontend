export const formatDate = (date) => {
  if (!date) return '-';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '-';
  }

  return parsedDate.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

export function toDateInputValue(isoString) {
  if (!isoString) return '';
  return String(isoString).slice(0, 10);
}

// export function formatMoney(value) {
//   const num = Number(value) || 0;
//   return `$${num.toFixed(2)}`;
// }

export const formatMoney = function(cents, format) {
  if (typeof cents == 'string') { cents = cents.replace('.',''); }
  var value = '';
  var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
  var formatString = (format || this.money_format);
 
  function defaultOption(opt, def) {
     return (typeof opt == 'undefined' ? def : opt);
  }
 
    function formatWithDelimiters(number, precision, thousands, decimal) {
    precision = defaultOption(precision, 2);
    thousands = defaultOption(thousands, ',');
    decimal   = defaultOption(decimal, '.');
 
    if (isNaN(number) || number == null) { return 0; }
 
    number = (number/100.0).toFixed(precision);
 
    var parts   = number.split('.'),
        dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands),
        cents   = parts[1] ? (decimal + parts[1]) : '';
 
    return dollars + cents;
  }
 
  switch(formatString.match(placeholderRegex)[1]) {
    case 'amount':
      value = formatWithDelimiters(cents, 2);
      break;
    case 'amount_no_decimals':
      value = formatWithDelimiters(cents, 0);
      break;
    case 'amount_with_comma_separator':
      value = formatWithDelimiters(cents, 2, '.', ',');
      break;
    case 'amount_no_decimals_with_comma_separator':
      value = formatWithDelimiters(cents, 0, '.', ',');
      break;
  }
 
  return formatString.replace(placeholderRegex, value);
};


// Small color helpers — convert a hex color + opacity(0-100) into an rgba() string
// so it can be applied directly as inline style on the preview button.
export function hexToRgba(hex, opacityPercent = 100) {
  if (!hex) return `rgba(0, 0, 0, ${opacityPercent / 100})`;

  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }

  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;

  return `rgba(${r}, ${g}, ${b}, ${opacityPercent / 100})`;
}