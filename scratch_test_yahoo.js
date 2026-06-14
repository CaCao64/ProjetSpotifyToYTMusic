const axios = require('axios');

async function testYahooSearch(query) {
    const searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query + ' site:open.spotify.com/track')}`;
    try {
        console.log(`Searching Yahoo: ${searchUrl}`);
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        const html = response.data;
        
        // Find all track URLs in the HTML
        const regex = /open\.spotify\.com\/track\/([a-zA-Z0-9]{22})/g;
        const matches = [];
        let match;
        while ((match = regex.exec(html)) !== null) {
            matches.push(match[1]);
        }
        
        console.log('Matches found:', matches);
        if (matches.length > 0) {
            console.log('Best match Spotify ID:', matches[0]);
        } else {
            console.log('No matches found in Yahoo HTML.');
            // Save a snippet to check the output
            console.log(html.substring(0, 1000));
        }
    } catch (e) {
        console.error('Error during search:', e.message);
    }
}

testYahooSearch('Singapour Kevin Tran');
