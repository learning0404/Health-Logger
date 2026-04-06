export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.NOTION_TOKEN;
  if (!token) return res.status(500).json({ error: 'NOTION_TOKEN not configured' });

  const daysBack = parseInt(req.query.days) || 30;
  const DATABASE_ID = '8a0752eb807143e2bcc610ac4b952ac7';

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - daysBack);
  const startStr = startDate.toISOString().split('T')[0];

  try {
    let allResults = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const body = {
        filter: {
          property: 'Date',
          date: { on_or_after: startStr }
        },
        sorts: [{ property: 'Date', direction: 'ascending' }],
        page_size: 100
      };
      if (startCursor) body.start_cursor = startCursor;

      const response = await fetch(
        `https://api.notion.com/v1/databases/${DATABASE_ID}/query`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
          },
          body: JSON.stringify(body)
        }
      );

      if (!response.ok) {
        const err = await response.json();
        return res.status(response.status).json({ error: err.message || 'Notion query failed' });
      }

      const data = await response.json();
      allResults = allResults.concat(data.results);
      hasMore = data.has_more;
      startCursor = data.next_cursor;
    }

    // Transform Notion pages to flat JSON
    const entries = allResults.map(page => {
      const p = page.properties;
      return {
        date:           getDate(p['Date']),
        entryType:      getSelect(p['Entry Type']),
        sleepQuality:   getNumber(p['Sleep Quality']),
        energyLevel:    getNumber(p['Energy Level']),
        stressLevel:    getNumber(p['Stress Level']),
        studyHours:     getNumber(p['Study Hours']),
        workHours:      getNumber(p['Work Hours']),
        screenTime:     getNumber(p['Screen Time']),
        socialMediaHrs: getNumber(p['Social Media Hrs']),
        sportDuration:  getNumber(p['Sport Duration']),
        sportType:      getMultiSelect(p['Sport Type']),
        caffeine:       getNumber(p['Caffeine']),
        calories:       getNumber(p['Calories']),
        hydrationL:     getNumber(p['Hydration L']),
        socialContact:  getSelect(p['Social Contact']),
        restingHR:      getNumber(p['Resting HR']),
        hrv:            getNumber(p['HRV']),
        sleepDuration:  getNumber(p['Sleep Duration']),
        steps:          getNumber(p['Steps']),
        activeCal:      getNumber(p['Active Calories']),
        spo2:           getNumber(p['SpO2']),
      };
    });

    res.status(200).json({ entries, count: entries.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getNumber(prop) {
  if (!prop || prop.type !== 'number') return null;
  return prop.number;
}

function getSelect(prop) {
  if (!prop || prop.type !== 'select' || !prop.select) return null;
  return prop.select.name;
}

function getMultiSelect(prop) {
  if (!prop || prop.type !== 'multi_select') return [];
  return prop.multi_select.map(o => o.name);
}

function getDate(prop) {
  if (!prop || prop.type !== 'date' || !prop.date) return null;
  return prop.date.start;
}
