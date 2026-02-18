const https = require('https');
const url = 'https://raw.githubusercontent.com/lennycolton/vatglasses-data/main/data/eg.json';
https.get(url, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const data = JSON.parse(body);
    const airspace = Array.isArray(data.airspace) ? data.airspace : Object.values(data.airspace);

    const groupAltitudes = {};
    for (const entry of airspace) {
      if (!entry.group || !entry.sectors) continue;
      const groups = Array.isArray(entry.group) ? entry.group : [entry.group];
      for (const g of groups) {
        if (!groupAltitudes[g]) groupAltitudes[g] = { mins: [], maxes: [] };
        for (const s of entry.sectors) {
          if (s.min != null) groupAltitudes[g].mins.push(s.min);
          if (s.max != null) groupAltitudes[g].maxes.push(s.max);
        }
      }
    }

    console.log('=== Group altitude ranges ===');
    for (const [g, vals] of Object.entries(groupAltitudes)) {
      const min = vals.mins.length ? Math.min(...vals.mins) : '?';
      const max = vals.maxes.length ? Math.max(...vals.maxes) : 'UNL';
      const groupInfo = data.groups[g] || {};
      console.log(`${g} (${groupInfo.name || '?'}) FL${min}-${max === 'UNL' ? 'UNL' : 'FL' + max}`);
    }
  });
});
