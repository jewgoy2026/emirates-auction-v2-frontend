import PublicSite from './ui/public-site';

const structuredData = {
  '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', name: 'Emirates Auction', url: 'https://www.emiratesauction.com/', logo: 'https://www.emiratesauction.com/emirates-auction-logo.svg', contactPoint: { '@type': 'ContactPoint', telephone: '+971-600-545454', contactType: 'customer service', areaServed: 'AE' } },
    { '@type': 'WebSite', name: 'Emirates Auction', url: 'https://www.emiratesauction.com/', potentialAction: { '@type': 'SearchAction', target: 'https://www.emiratesauction.com/?q={search_term_string}', 'query-input': 'required name=search_term_string' } },
  ],
};

export default function Home() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}/><PublicSite/></>;
}
