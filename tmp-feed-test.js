import Parser from 'rss-parser';
const parser = new Parser();
const url = 'http://feeds.reuters.com/Reuters/worldNews';
parser.parseURL(url)
  .then(feed => {
    console.log('OK', feed.title, 'items', feed.items.length);
    console.log(feed.items.slice(0,5).map(i => ({ title: i.title, link: i.link, snippet: i.contentSnippet || i.summary || '' })));
  })
  .catch(err => {
    console.error('ERR', err.message);
    process.exit(1);
  });
